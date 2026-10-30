# Validación pendiente de la migración PostgreSQL

La aplicación consulta PostgreSQL mediante `pg` y usa `DATABASE_URL` exclusivamente en el servidor. Las rutas de API de `src/app/api` ya no deben importar Prisma.

## Antes de fusionar PR #4

1. Actualizar el archivo de bloqueo con Node.js 22 y npm: `npm install --package-lock-only`. Confirmar que `pg`, `server-only` y `@types/pg` estén presentes en `package-lock.json` y guardar ese cambio en el PR.
2. Una vez actualizado el bloqueo, eliminar `prisma` y `@prisma/client` del `package.json`, y la configuración de seed antigua. Regenerar el bloqueo con `npm install --package-lock-only`. No ejecutar `prisma/seed.ts`: borra registros.
3. Ejecutar `npm ci`, `npx tsc --noEmit`, `npm run lint` y `npm run build`.
4. Probar contra una base Supabase de desarrollo: login, administración de usuarios, perfiles, permisos, PDF de vacaciones, bonos y horas extra diarias y mensuales.
5. Revisar la política RLS y el rol PostgreSQL usado por `DATABASE_URL` antes de habilitar usuarios reales.
6. No volver a subir archivos Excel con datos personales al repositorio. Rotar cualquier contraseña de demostración que se haya reutilizado en un entorno real.

## Variables privadas

Configurar `DATABASE_URL` (conexión PostgreSQL desde el backend) y `JWT_SECRET` en el entorno de ejecución. No publicar estos valores ni usar la clave `service_role` de Supabase en el navegador.

**Nota:** el flujo de GitHub Actions instalado en este PR utiliza temporalmente `npm install` porque el bloqueo existente todavía no incorpora las dependencias nuevas. Cambiarlo a `npm ci` después de actualizar `package-lock.json`.
