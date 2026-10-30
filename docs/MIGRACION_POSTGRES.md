# Migración gradual de Prisma a PostgreSQL directo

Esta rama contiene el esquema SQL y el inicio de la sustitución de Prisma por `pg`.
**No está lista para producción ni se debe fusionar aún.** Otras rutas API y scripts
todavía dependen de Prisma; no se ha eliminado `@prisma/client` ni Docker.

## Preparación
1. Crear proyecto Supabase y ejecutar `sql/supabase_schema.sql` en una base nueva.
2. Copiar `.env.example` a `.env.local` y configurar `DATABASE_URL` y `JWT_SECRET`.
3. Ejecutar `npm install` y `npm run dev` en una máquina autorizada.
4. Crear cuentas de prueba con hashes bcrypt; no importar contraseñas de Excel.
5. Migrar y probar las demás rutas antes de retirar Prisma.

## Seguridad
- El repositorio contiene hojas Excel de usuarios y empleados; restringir su visibilidad,
  revisar historial de Git y rotar credenciales expuestas.
- Nunca exponer `DATABASE_URL` en variables `NEXT_PUBLIC_*`.
- La autenticación se verifica contra la base de datos; no hay fallback local.
- El esquema activa RLS sin políticas públicas. Verificar los privilegios del rol
  PostgreSQL utilizado por el backend antes de conectar usuarios reales.
- Requiere HTTPS para cookies seguras en producción.
