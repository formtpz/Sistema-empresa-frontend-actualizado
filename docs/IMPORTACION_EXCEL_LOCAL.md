# Importación local de Excel a PostgreSQL / Supabase

El importador lee los cuatro archivos **desde tu computadora**, no desde GitHub:
`usuarios_login.xlsx`, `COL.xlsx`, `Horas_extra_febrero.xlsx` y `Bonos_febrero.xlsx`.

1. Ejecutar `sql/supabase_schema.sql` en una base vacía de pruebas y comprobar las tablas.
2. Instalar dependencias con `npm install` (la actualización del lockfile aún está pendiente).
3. Configurar `DATABASE_URL` localmente en `.env.local` o en el entorno del proceso. **No publicar la URL ni su contraseña.** El script carga `.env` mediante dotenv, no `.env.local` automáticamente.
4. Colocar los cuatro Excel en una carpeta privada fuera del repositorio.
5. Desde la raíz del proyecto, ejecutar `node --env-file=.env.local scripts/import-excel-postgres.mjs "C:\\ruta\\a\\carpeta"` (Node 20.9+). Por defecto es una **simulación**: se hace ROLLBACK.
6. Revisar los conteos. Para confirmar, establecer `CONFIRM_IMPORT=YES` en el entorno y ejecutar de nuevo. En PowerShell: `$env:CONFIRM_IMPORT="YES"; node --env-file=.env.local scripts/import-excel-postgres.mjs "C:\\ruta\\a\\carpeta"`.
7. Verificar conteos en Supabase y que los usuarios puedan iniciar sesión **solo después** de implementar restablecimiento de contraseñas.

## Seguridad y limitaciones
- No elimina registros ni reemplaza contraseñas existentes; usa `ON CONFLICT DO NOTHING`. Las cuentas nuevas reciben contraseñas aleatorias desconocidas: necesitan un proceso de restablecimiento antes de iniciar sesión.
- La importación ocurre dentro de una transacción; si falta un empleado para un registro de horas/bonos, se revierte.
- La importación está fijada al periodo febrero 2026 para horas y bonos, como el seed original.
- La eliminación de los Excel del árbol Git **no los elimina del historial público**. Limpiar historial y rotar cualquier contraseña que estuviera en esos archivos sigue siendo prioritario.
- Este script aún no se ha ejecutado contra Supabase ni validado con los Excel locales.
