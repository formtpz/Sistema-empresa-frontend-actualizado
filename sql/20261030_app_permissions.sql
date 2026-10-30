-- Migration v1: centralized application permissions (Supabase PostgreSQL / AWS RDS).
-- Apply after sql/supabase_schema.sql. Does not change existing users/passwords.
-- Run with a migration/owner role; never with browser credentials.
BEGIN;

CREATE TABLE IF NOT EXISTS public.app_permissions (
  code text PRIMARY KEY,
  description text NOT NULL
);
CREATE TABLE IF NOT EXISTS public.app_role_permissions (
  role public."Role" NOT NULL,
  permission_code text NOT NULL REFERENCES public.app_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role, permission_code)
);

INSERT INTO public.app_permissions(code,description) VALUES
 ('permissions.read_own','Read own requests'),
 ('permissions.create_own','Create own requests'),
 ('permissions.read_team','Read requests within authorized team'),
 ('permissions.decide_team','Approve or reject requests within authorized team'),
 ('users.manage','Manage application users'),
 ('reports.read_all','Read project-level reports and employee financial data'),
 ('reports.read_own','Read own bonus and overtime reports'),
 ('projects.read','Read project summaries')
ON CONFLICT(code) DO NOTHING;

INSERT INTO public.app_role_permissions(role,permission_code) VALUES
 ('ADMIN','permissions.read_own'),('ADMIN','permissions.create_own'),
 ('ADMIN','permissions.read_team'),('ADMIN','permissions.decide_team'),('ADMIN','users.manage'),
 ('RH','permissions.read_team'),('RH','permissions.decide_team'),
 ('COORDINACION','permissions.read_own'),('COORDINACION','permissions.create_own'),
 ('COORDINACION','permissions.read_team'),('COORDINACION','permissions.decide_team'),
 ('OPERADOR','permissions.read_own'),('OPERADOR','permissions.create_own'),
 ('PM','permissions.read_own'),('PM','permissions.create_own'),
 ('GERENCIA','permissions.read_team'),
 ('ADMIN','reports.read_all'),('PM','reports.read_all'),('GERENCIA','reports.read_all'),
 ('ADMIN','reports.read_own'),('PM','reports.read_own'),('OPERADOR','reports.read_own'),('COORDINACION','reports.read_own'),
 ('ADMIN','projects.read'),('PM','projects.read'),('GERENCIA','projects.read')
ON CONFLICT DO NOTHING;

-- SECURITY INVOKER: no privilege escalation; requires backend role with SELECT.
CREATE OR REPLACE FUNCTION public.app_has_permission(
  actor_username text, requested_permission text
) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
 SELECT EXISTS (
  SELECT 1 FROM public.users u
  JOIN public.app_role_permissions rp ON rp.role=u.role
  WHERE u.username=actor_username AND u.active AND rp.permission_code=requested_permission
 );
$$;

-- Authorization scope: ADMIN/RH global, COORDINACION only their own team.
-- Existing employee.supervisor is free text; compare exact normalized name/username,
-- not substring matches. Longer-term replace with supervisor_username FK.
CREATE OR REPLACE FUNCTION public.app_can_access_request(
 actor_username text, target_username text, action_code text
) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
 SELECT
   public.app_has_permission(actor_username,action_code)
   AND EXISTS (
     SELECT 1 FROM public.users actor
     JOIN public.users target ON target.username=target_username AND target.active
     WHERE actor.username=actor_username AND actor.active
       AND (
         actor.role IN ('ADMIN','RH','GERENCIA')
         OR (actor.role='COORDINACION' AND target.username<>actor.username
             AND EXISTS (
               SELECT 1 FROM public.employees e
               WHERE e.username=target.username
                 AND NULLIF(btrim(e.supervisor),'') IS NOT NULL
                 AND (lower(btrim(e.supervisor))=lower(btrim(actor.name))
                   OR lower(btrim(e.supervisor))=lower(btrim(actor.username)))
             ))
       )
       AND (action_code <> 'permissions.decide_team' OR target.username<>actor_username)
   );
$$;

-- On create, inherit project from the employee record; do not trust client projectId.
CREATE OR REPLACE FUNCTION public.app_set_permission_project()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  SELECT e."projectId" INTO NEW."projectId"
  FROM public.employees e WHERE e.username=NEW.username;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS app_permiso_project_on_insert ON public.permisos;
CREATE TRIGGER app_permiso_project_on_insert
BEFORE INSERT ON public.permisos FOR EACH ROW
EXECUTE FUNCTION public.app_set_permission_project();

CREATE INDEX IF NOT EXISTS employees_supervisor_lower_idx
 ON public.employees (lower(btrim(supervisor)));

-- No browser/API grants: functions are intended for authenticated server use only.
REVOKE ALL ON FUNCTION public.app_has_permission(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_access_request(text,text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_set_permission_project() FROM PUBLIC;
REVOKE ALL ON public.app_permissions,public.app_role_permissions FROM PUBLIC;
COMMIT;

-- Deployment: grant SELECT on app_permissions/app_role_permissions and EXECUTE
-- on app_has_permission/app_can_access_request to your dedicated backend DB role.
-- Backend role must also have appropriate existing table privileges/RLS policies.
-- Never use a public anon key or an untrusted username to call these functions.
