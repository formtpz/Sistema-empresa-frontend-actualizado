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

## Sesiones por dispositivo (incluidas en este PR)
- Ejecutar también `sql/20261030_app_sessions.sql` **antes** de desplegar el código de autenticación.
- Cada login crea una sesión independiente con vencimiento absoluto de 8 horas.
- Refrescar o reabrir el navegador no prolonga la sesión; una segunda PC no revoca la primera.
- Logout revoca únicamente la sesión del dispositivo actual; desactivar el usuario invalida todas las sesiones en las verificaciones.
- El servidor conserva el hash SHA-256 del token aleatorio de 256 bits; la cookie HttpOnly contiene el token original.
- Contraseñas existentes continúan con bcrypt; JWT deja de usarse para sesiones nuevas. `JWT_SECRET` ya no es requerido por las rutas migradas.
- Aplicar y comprobar privilegios/RLS de `app_sessions` para el rol backend; si no puede leer o escribir, login y validación fallarán.
- Validar en pruebas: dos navegadores independientes, expiración a las 8 horas, logout de uno sin afectar al otro, revocación de usuario desactivado, cookie persistente.
- El cierre de sesión no depende de mantener conexiones SQL abiertas. `pg.Pool` sigue administrando las conexiones.
- En el despliegue, los JWT antiguos no serán aceptados: los usuarios tendrán que volver a iniciar sesión una vez.

## Avance de autorización en rutas
- Migradas a comprobación actual en PostgreSQL: `api/permisos`, `api/rrhh/permisos`, `api/users`, `api/users/deactivate`, `api/admin/bd`, `api/coordinador`, y las dos rutas `api/rrhh/permisos-equipo`.
- **No considerar completada la autorización**: siguen pendientes rutas de bonos, horas extra, PM, gerencia, perfiles y otros endpoints; auditar todas las rutas antes del merge.
- La autorización actual utiliza funciones SQL invocadas desde backend con el username de sesión verificado. No equivale a RLS extremo a extremo; no exponer el usuario DB backend ni permitir consultas directas desde navegador.
- Requerido antes de producción: revisar alcance de equipos y proyectos, permisos de funciones, privilegios y políticas RLS del rol backend, concurrencia y revocación, rate limiting de login, pruebas de integración y CI.

## Segunda revisión de rutas (2026-10-30)
- Añadidos permisos `reports.read_all`, `reports.read_own`, `projects.read` en la migración SQL. Ejecutar el SQL actualizado desde cero en base de pruebas; si se ejecutó una versión anterior, aplicar los INSERT nuevos antes de desplegar.
- Migradas rutas `api/pm/*` (panel, bonos, horas extra, personal), `api/gerencia`, `api/gerencia/proyectos` y `api/bonos-extras`.
- Pendiente revisar específicamente operaciones de escritura de horas extra, perfiles, documentos, endpoints de debug, privilegios por proyecto y la totalidad de rutas.
- IMPORTANTE: autorización por funciones SQL llamada desde Next.js no equivale todavía a políticas RLS por fila. Se requiere auditoría de todas las rutas y pruebas negativas antes de producción.
