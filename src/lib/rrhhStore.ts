export type Permiso = {
  id: string;
  username: string;
  tipo: "Vacaciones" | "Personal" | "Médico" | "Trámite" | "Otro";
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
  estado: "Enviado" | "Aprobado" | "Rechazado";
  created_at: string;
  documento_generado?: boolean; // ✅ PDF generado
};

export const STORE: Permiso[] = [];
