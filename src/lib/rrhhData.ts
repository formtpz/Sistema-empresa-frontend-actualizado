export type RRHHUser = {
  username: string;
  vacaciones_total: number;
  vacaciones_usadas: number;
  puesto: string;
  area: string;
};

export const RRHH_USERS: Record<string, RRHHUser> = {
  mfernandez: {
    username: "mfernandez",
    vacaciones_total: 15,
    vacaciones_usadas: 3,
    puesto: "Coordinación Producción",
    area: "Operaciones",
  },
  operador1: {
  username: "operador1",
  vacaciones_total: 15,
  vacaciones_usadas: 0,
  puesto: "Operador Catastral",
  area: "Producción",
},

  admin: {
    username: "admin",
    vacaciones_total: 15,
    vacaciones_usadas: 0,
    puesto: "Administrador",
    area: "TI",
  },
};

export function ensureUser(username: string): RRHHUser {
  if (!RRHH_USERS[username]) {
    RRHH_USERS[username] = {
      username,
      vacaciones_total: 15,
      vacaciones_usadas: 0,
      puesto: "Colaborador",
      area: "General",
    };
  }
  return RRHH_USERS[username];
}
