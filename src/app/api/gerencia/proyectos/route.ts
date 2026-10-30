export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { withTimeout } from "@/lib/timeout";

function getSecret() {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return new TextEncoder().encode(secret);
}

export async function GET() {
  const token = (await cookies()).get("session")?.value;
  if (!token) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());

    const role = String(payload.role ?? "").toUpperCase();
    if (role !== "GERENCIA" && role !== "PM" && role !== "ADMIN") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const projects = await withTimeout(
      prisma.project.findMany({
        where: { code: { not: "GENERAL" } },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    );

    const proyectos = await withTimeout(
      Promise.all(
        projects.map(async (project) => {
          const whereProject = { projectId: project.id };
          const [personalTotal, activos, operadores, coordinadores, rh, pm] =
            await Promise.all([
              prisma.employee.count({ where: whereProject }),
              prisma.employee.count({ where: { ...whereProject, user: { active: true } } }),
              prisma.employee.count({
                where: { ...whereProject, user: { active: true, role: "OPERADOR" } },
              }),
              prisma.employee.count({
                where: { ...whereProject, user: { active: true, role: "COORDINACION" } },
              }),
              prisma.employee.count({
                where: { ...whereProject, user: { active: true, role: "RH" } },
              }),
              prisma.employee.count({
                where: { ...whereProject, user: { active: true, role: "PM" } },
              }),
            ]);

          return {
            nombre: project.name,
            personal_total: personalTotal,
            activos,
            operadores,
            coordinadores,
            rh,
            pm,
          };
        })
      )
    );

    return NextResponse.json({ proyectos });
  } catch (err: unknown) {
    return NextResponse.json(
      { message: "Token invalido", error: String(err) },
      { status: 401 }
    );
  }
}
