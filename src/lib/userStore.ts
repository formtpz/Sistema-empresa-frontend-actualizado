export type Role = "ADMIN" | "RH" | "COORDINACION" | "OPERADOR" | "PM" | "GERENCIA";

export type AppUser = {
  username: string;
  password: string; // piloto (luego hash)
  name: string;
  email?: string;
  role: Role;
  active: boolean;
  created_at: string;
};

export const USERS: Record<string, AppUser> = {
  admin: {
    username: "admin",
    password: "admin123",
    name: "Administrador",
    email: "admin@telespazio.com",
    role: "ADMIN",
    active: true,
    created_at: new Date().toISOString(),
  },
operador1: {
  username: "operador1",
  password: "op123",
  name: "Operador Producción",
  email: "operador1@telespazio.com",
  role: "OPERADOR",
  active: true,
  created_at: new Date().toISOString(),
},
  mfernandez: {
    username: "mfernandez",
    password: "1234",
    name: "Melissa Fernández",
    email: "melissa.fernandez@tpzco.com",
    role: "COORDINACION",
    active: true,
    created_at: new Date().toISOString(),
  },
  rh: {
    username: "rh",
    password: "1234",
    name: "Recursos Humanos",
    email: "rh@telespazio.com",
    role: "RH",
    active: true,
    created_at: new Date().toISOString(),
  },
};

export function listUsers() {
  return Object.values(USERS).sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function getUser(username: string) {
  return USERS[username] ?? null;
}

export function upsertUser(user: AppUser) {
  USERS[user.username] = user;
  return USERS[user.username];
}

export function deactivateUser(username: string) {
  const u = USERS[username];
  if (!u) return null;
  u.active = false;
  return u;
}
