# Etapa 1: autorización centralizada en PostgreSQL

## Aplicación
1. Respaldar la base de datos. Ejecutar `sql/supabase_schema.sql` solo si la base es nueva.
2. Aplicar `sql/20261030_app_permissions.sql` con una cuenta administradora de migraciones, **antes** de desplegar el backend de este PR. No aplicarlo desde el navegador.
3. Crear un rol PostgreSQL dedicado al backend, con credenciales distintas de las de migraciones. Darle únicamente los privilegios de tablas necesarios, `SELECT` sobre `app_role_permissions` y `app_permissions`, y `EXECUTE` sobre las funciones `app_has_permission` y `app_can_access_request`. La configuración de RLS debe permitirle el acceso requerido a las tablas, o las funciones devolverán falso. No conceder `BYPASSRLS` por defecto.
4. Configurar `DATABASE_URL` y `JWT_SECRET` como secretos del servidor, no como `NEXT_PUBLIC_*`. No publicar credenciales ni hojas Excel.
5. Probar en una base de pruebas con usuarios de cada rol y solicitudes de diferentes equipos. No desplegar a producción sin estas pruebas.

## Comportamiento
- Los permisos de aplicación se definen en `app_permissions` y se asignan a roles en `app_role_permissions`.
- `app_has_permission` valida usuario activo y permiso concedido.
- `app_can_access_request` verifica además el alcance: ADMIN/RH global, COORDINACION solo equipo; GERENCIA lectura global. No se permite autoaprobar.
- El proyecto de un permiso nuevo se copia del empleado mediante trigger, sin confiar en un valor del cliente.
- Las rutas de listado y aprobación de permisos de equipo llaman funciones de autorización dentro de sus propias consultas SQL.

## Limitaciones y siguientes etapas
- **Esto NO constituye todavía una implementación de RLS por empleado**: el backend verifica la sesión y transmite el usuario verificado como parámetro. Un rol SQL compartido con acceso directo a las tablas podría eludir estas comprobaciones si otro endpoint está mal escrito. No dar acceso directo a usuarios finales ni al navegador.
- Los demás endpoints aún tienen controles de roles en TypeScript; migrarlos gradualmente antes de afirmar que todos los permisos están centralizados.
- El campo `employees.supervisor` es texto libre. La comparación actual es exacta (nombre o username) para evitar coincidencias parciales inseguras, pero puede dejar empleados fuera si los nombres no coinciden. Migrar a `supervisor_username` con FK es la siguiente mejora.
- No se migran ni reemplazan contraseñas, login bcrypt o JWT en esta etapa.
- La autorización de cambios de datos críticos debe mantenerse en SQL, idealmente mediante funciones de acceso restringido o RLS ligado a identidad verificada; nunca confiar en un username suministrado por el navegador.
- No hay pruebas de integración contra Supabase/AWS porque no hay credenciales de base de pruebas configuradas.

## Pruebas mínimas
1. COORDINACION solo ve solicitudes de su equipo; no puede ver ni aprobar solicitudes de otros equipos.
2. COORDINACION no puede aprobar una solicitud propia.
3. RH y ADMIN pueden consultar y decidir solicitudes de distintos equipos, excepto las propias.
4. OPERADOR no puede consultar ni decidir solicitudes del equipo.
5. GERENCIA tiene acceso de lectura, no de aprobación.
6. Un usuario desactivado no puede acceder a solicitudes.
7. Un permiso nuevo hereda `projectId` del empleado.
8. Sin aplicar la migración, el backend debe fallar cerrado (500), no devolver solicitudes sin filtro.
