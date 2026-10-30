import { ProjectCode } from "@prisma/client";

const PROJECT_CODES = new Set<string>(Object.values(ProjectCode));

export function parseProjectCode(value: string): ProjectCode | null {
  const code = value.toUpperCase();
  return PROJECT_CODES.has(code) ? (code as ProjectCode) : null;
}
