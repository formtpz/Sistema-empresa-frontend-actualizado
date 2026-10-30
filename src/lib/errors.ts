export function getErrorMessage(error: unknown, fallback = "Error desconocido") {
  return error instanceof Error ? error.message : fallback;
}
