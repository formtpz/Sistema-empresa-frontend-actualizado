export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";

function daysInclusive(startDate: Date, endDate: Date) {
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  const ms = end.getTime() - start.getTime();
  const diff = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("es-CR");
}

function formatFileDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDays(value: number) {
  return value.toLocaleString("es-CR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 });
  }

  const allowed = ["COORDINACION", "RH", "ADMIN"];
  if (!allowed.includes(session.role)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";

  const [row] = await query<{id:string;username:string;tipo:string;estado:string;fecha_inicio:Date;fecha_fin:Date;motivo:string;user_name:string;puesto:string|null;vacaciones_saldo:string|null;project_name:string|null}>(
    'SELECT p.id,p.username,p.tipo,p.estado,p.fecha_inicio,p.fecha_fin,p.motivo,u.name AS user_name,e.puesto,e.vacaciones_saldo,pr.name AS project_name FROM public.permisos p JOIN public.users u ON u.username=p.username LEFT JOIN public.employees e ON e.username=p.username LEFT JOIN public.projects pr ON pr.id=e."projectId" WHERE p.id=$1',[id]);
  const permiso = row ? {...row,fecha_inicio:new Date(row.fecha_inicio),fecha_fin:new Date(row.fecha_fin),user:{name:row.user_name,employee:{puesto:row.puesto,vacaciones_saldo:row.vacaciones_saldo,project:{name:row.project_name}}}} : null;

  if (!permiso) return NextResponse.json({ message: "Permiso no encontrado." }, { status: 404 });
  if (permiso.tipo !== "VACACIONES") {
    return NextResponse.json({ message: "Este documento aplica solo a Vacaciones." }, { status: 400 });
  }
  if (permiso.estado !== "APROBADO") {
    return NextResponse.json({ message: "Solo se genera documento para solicitudes aprobadas." }, { status: 409 });
  }

  const employee = permiso.user.employee;
  const dias = daysInclusive(permiso.fecha_inicio, permiso.fecha_fin);
  const saldoDisponible = Number(employee?.vacaciones_saldo ?? 0);
  const saldoRestante = saldoDisponible - dias;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const margin = 50;
  let y = 800;

  page.drawText("NOTIFICACION DE LICENCIAS. L1", { x: margin, y, size: 14, font: bold });
  y -= 25;
  page.drawText("San Jose, Costa Rica", { x: margin, y, size: 10, font });
  page.drawText(formatDate(new Date()), { x: 420, y, size: 10, font });
  y -= 35;

  page.drawText(`Colaborador: ${permiso.user.name || permiso.username}`, {
    x: margin,
    y,
    size: 12,
    font: bold,
  });
  y -= 18;
  page.drawText(`Usuario: ${permiso.username}`, { x: margin, y, size: 11, font });
  y -= 18;
  page.drawText(`Area: ${employee?.project?.name ?? "General"}    Puesto: ${employee?.puesto ?? "-"}`, {
    x: margin,
    y,
    size: 11,
    font,
  });
  y -= 28;

  page.drawText("Por medio solicita las siguientes licencias:", { x: margin, y, size: 11, font: bold });
  y -= 18;

  page.drawText(`Dias: ${dias}`, { x: margin, y, size: 11, font });
  page.drawText("Concepto: VACACIONES GANADAS", { x: margin + 120, y, size: 11, font });
  page.drawText(`Desde: ${formatDate(permiso.fecha_inicio)}`, { x: margin + 340, y, size: 11, font });
  y -= 18;
  page.drawText(`Hasta: ${formatDate(permiso.fecha_fin)}`, { x: margin + 340, y, size: 11, font });
  y -= 26;

  page.drawText(`Vacaciones disponibles: ${formatDays(saldoRestante)} dias`, {
    x: margin,
    y,
    size: 11,
    font: bold,
  });
  y -= 18;
  page.drawText(`Saldo anterior a esta solicitud: ${formatDays(saldoDisponible)} dias`, {
    x: margin,
    y,
    size: 10,
    font,
  });
  y -= 30;

  page.drawText("Motivo:", { x: margin, y, size: 10, font: bold });
  y -= 14;
  page.drawText(permiso.motivo.slice(0, 90), { x: margin, y, size: 10, font });
  y -= 70;

  page.drawText("EMPLEADO", { x: margin, y, size: 10, font: bold });
  page.drawText("Responsable Funcion (PM)", { x: 250, y, size: 10, font: bold });
  page.drawText("Coordinacion de Produccion", { x: 420, y, size: 10, font: bold });

  y -= 40;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 140, y }, thickness: 1 });
  page.drawLine({ start: { x: 250, y }, end: { x: 390, y }, thickness: 1 });
  page.drawLine({ start: { x: 420, y }, end: { x: 570, y }, thickness: 1 });

  y -= 18;
  page.drawText("Firma y Aclaracion", { x: margin, y, size: 9, font });
  page.drawText("Firma y Aclaracion / Autoriza", { x: 250, y, size: 9, font });
  page.drawText("Firma y Aclaracion", { x: 420, y, size: 9, font });

  page.drawText(`ID Solicitud: ${permiso.id}`, { x: margin, y: 40, size: 9, font });

  const pdfBytes = await pdfDoc.save();
  const pdfBody = Uint8Array.from(pdfBytes).buffer;

  return new NextResponse(pdfBody, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Licencia_${permiso.username}_${formatFileDate(permiso.fecha_inicio)}_con_saldo.pdf"`,
    },
  });
}
