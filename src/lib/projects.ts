type ProjectCode = "COLOMBIA" | "PERU" | "ITALIA" | "GENERAL";

const PROJECT_CODES = new Set<string>(["COLOMBIA", "PERU", "ITALIA", "GENERAL"]);

export function parseProjectCode(value: string): ProjectCode | null {
  const code = value.toUpperCase();
  return PROJECT_CODES.has(code) ? (code as ProjectCode) : null;
}
