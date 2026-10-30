-- Run in Supabase SQL Editor as database owner, AFTER BOOTSTRAP_NEW_DATABASE.sql.
-- Dedicated server-side PostgreSQL role. This is a database role, NOT an app user.
-- SECURITY: The role is created NOLOGIN until a unique password is set explicitly.
-- NEVER put credentials in Git, a browser bundle, or a SQL file committed to Git.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'empresa_backend') THEN
   CREATE ROLE empresa_backend NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
 END IF;
END $$;
GRANT CONNECT ON DATABASE postgres TO empresa_backend;
GRANT USAGE ON SCHEMA public TO empresa_backend;

-- App data: restrict table permissions by use case. Never grant TRUNCATE,
-- REFERENCES, TRIGGER, schema CREATE, or BYPASSRLS.
GRANT SELECT ON public.projects, public.users, public.employees,
 public.permisos, public.horas_extra_mes, public.horas_extra_dia,
 public.bonos_mes, public.app_permissions, public.app_role_permissions,
 public.app_sessions, public.employee_assignments, public.project_memberships,
 public.app_user_permission_overrides, public.report_responsibilities,
 public.report_audit_log TO empresa_backend;

GRANT INSERT, UPDATE ON public.users, public.employees, public.permisos,
 public.horas_extra_mes, public.horas_extra_dia, public.bonos_mes,
 public.app_sessions, public.employee_assignments, public.project_memberships,
 public.app_user_permission_overrides, public.report_responsibilities,
 public.report_audit_log TO empresa_backend;
GRANT DELETE ON public.app_sessions TO empresa_backend;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO empresa_backend;

GRANT EXECUTE ON FUNCTION public.app_has_permission(text,text),
 public.app_can_access_request(text,text,text),
 public.app_can_access_project(text,integer,text),
 public.app_can_work_report(text,text,text,text),
 public.app_set_permission_project() TO empresa_backend;

-- RLS isolates the server-side role from public/anon access.
-- These policies do NOT implement per-employee/per-project authorization:
-- all user/project authorization MUST be enforced by server routes.
-- Never expose this role's connection string to the browser.
DO $$
DECLARE tbl text;
BEGIN
 FOREACH tbl IN ARRAY ARRAY[
  'projects','users','employees','permisos','horas_extra_mes',
  'horas_extra_dia','bonos_mes','app_permissions','app_role_permissions',
  'app_sessions','employee_assignments','project_memberships',
  'app_user_permission_overrides','report_responsibilities','report_audit_log'
 ] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('DROP POLICY IF EXISTS empresa_backend_server_access ON public.%I',tbl);
  EXECUTE format('CREATE POLICY empresa_backend_server_access ON public.%I FOR ALL TO empresa_backend USING (true) WITH CHECK (true)',tbl);
 END LOOP;
END $$;
COMMIT;

-- SECOND, MANUAL STEP (DO NOT COMMIT A REAL PASSWORD):
-- In SQL Editor run the following with a unique strong password:
-- ALTER ROLE empresa_backend WITH LOGIN PASSWORD 'YOUR_UNIQUE_STRONG_PASSWORD';
-- Update DATABASE_URL in local .env.local to use empresa_backend and the
-- Supabase-provided connection host/port. Restart Next.js after changing it.
-- NOTE: The session pooler may have role/connection constraints; use the
-- exact connection string recommended by Supabase for this database role.
-- If connecting fails, revert local DATABASE_URL temporarily and diagnose;
-- do not disable RLS or grant SUPERUSER/BYPASSRLS.
