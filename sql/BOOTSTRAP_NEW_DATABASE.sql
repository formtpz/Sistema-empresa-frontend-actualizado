-- DATABASE BOOTSTRAP for NEW EMPTY Supabase project ONLY.
-- Run once in Supabase SQL Editor as database owner. No demo users are inserted.
-- Schema only: backend DB role/RLS integration still required before app deployment.

-- ===== sql/supabase_schema.sql =====
-- Sistema-empresa: PostgreSQL compatible con Supabase y AWS RDS.
-- Ejecutar en una base nueva. No elimina tablas existentes.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN CREATE TYPE public."Role" AS ENUM ('ADMIN','RH','COORDINACION','OPERADOR','PM','GERENCIA'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public."PermisoTipo" AS ENUM ('VACACIONES','PERSONAL','MEDICO','TRAMITE','OTRO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public."PermisoEstado" AS ENUM ('ENVIADO','APROBADO','RECHAZADO'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public."ProjectCode" AS ENUM ('COLOMBIA','PERU','ITALIA','GENERAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.projects (
 id SERIAL PRIMARY KEY,
 code public."ProjectCode" NOT NULL UNIQUE,
 name TEXT NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public.users (
 id SERIAL PRIMARY KEY,
 username TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL,
 email TEXT,
 role public."Role" NOT NULL,
 active BOOLEAN NOT NULL DEFAULT TRUE,
 password TEXT NOT NULL,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS public.employees (
 id SERIAL PRIMARY KEY,
 username TEXT NOT NULL UNIQUE REFERENCES public.users(username) ON DELETE CASCADE ON UPDATE CASCADE,
 cedula TEXT UNIQUE,
 email TEXT,
 puesto TEXT,
 supervisor TEXT,
 start_date TIMESTAMP(3),
 vacaciones_saldo DECIMAL(65,30) NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "projectId" INTEGER REFERENCES public.projects(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS employees_project_id_idx ON public.employees("projectId");

CREATE TABLE IF NOT EXISTS public.permisos (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 username TEXT NOT NULL REFERENCES public.users(username) ON DELETE CASCADE ON UPDATE CASCADE,
 tipo public."PermisoTipo" NOT NULL,
 fecha_inicio TIMESTAMP(3) NOT NULL,
 fecha_fin TIMESTAMP(3) NOT NULL,
 motivo TEXT NOT NULL,
 estado public."PermisoEstado" NOT NULL DEFAULT 'ENVIADO',
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "projectId" INTEGER REFERENCES public.projects(id) ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS permisos_username_idx ON public.permisos(username);
CREATE INDEX IF NOT EXISTS permisos_project_id_idx ON public.permisos("projectId");

CREATE TABLE IF NOT EXISTS public.horas_extra_mes (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 "employeeId" INTEGER NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE ON UPDATE CASCADE,
 year INTEGER NOT NULL,
 month INTEGER NOT NULL,
 total DECIMAL(65,30) NOT NULL DEFAULT 0,
 ordinarias DECIMAL(65,30) NOT NULL DEFAULT 0,
 feriados DECIMAL(65,30) NOT NULL DEFAULT 0,
 diurnas DECIMAL(65,30) NOT NULL DEFAULT 0,
 nocturnas DECIMAL(65,30) NOT NULL DEFAULT 0,
 diurnas_feriado DECIMAL(65,30) NOT NULL DEFAULT 0,
 nocturnas_feriado DECIMAL(65,30) NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT horas_extra_mes_unique UNIQUE ("employeeId",year,month)
);
CREATE INDEX IF NOT EXISTS horas_extra_mes_year_month_idx ON public.horas_extra_mes(year,month);

CREATE TABLE IF NOT EXISTS public.horas_extra_dia (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 "employeeId" INTEGER NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE ON UPDATE CASCADE,
 date TIMESTAMP(3) NOT NULL,
 year INTEGER NOT NULL,
 month INTEGER NOT NULL,
 day INTEGER NOT NULL,
 total DECIMAL(65,30) NOT NULL DEFAULT 0,
 ordinarias DECIMAL(65,30) NOT NULL DEFAULT 0,
 feriados DECIMAL(65,30) NOT NULL DEFAULT 0,
 diurnas DECIMAL(65,30) NOT NULL DEFAULT 0,
 nocturnas DECIMAL(65,30) NOT NULL DEFAULT 0,
 diurnas_feriado DECIMAL(65,30) NOT NULL DEFAULT 0,
 nocturnas_feriado DECIMAL(65,30) NOT NULL DEFAULT 0,
 justificacion TEXT,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT horas_extra_dia_unique UNIQUE ("employeeId",date)
);
CREATE INDEX IF NOT EXISTS horas_extra_dia_year_month_idx ON public.horas_extra_dia(year,month);

CREATE TABLE IF NOT EXISTS public.bonos_mes (
 id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
 "employeeId" INTEGER NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE ON UPDATE CASCADE,
 year INTEGER NOT NULL,
 month INTEGER NOT NULL,
 total DECIMAL(65,30) NOT NULL DEFAULT 0,
 productividad DECIMAL(65,30) NOT NULL DEFAULT 0,
 calidad DECIMAL(65,30) NOT NULL DEFAULT 0,
 qc DECIMAL(65,30) NOT NULL DEFAULT 0,
 validacion DECIMAL(65,30) NOT NULL DEFAULT 0,
 supervision DECIMAL(65,30) NOT NULL DEFAULT 0,
 calidad_sup DECIMAL(65,30) NOT NULL DEFAULT 0,
 supervision_sig DECIMAL(65,30) NOT NULL DEFAULT 0,
 calidad_sig DECIMAL(65,30) NOT NULL DEFAULT 0,
 bono_fijo DECIMAL(65,30) NOT NULL DEFAULT 0,
 created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT bonos_mes_unique UNIQUE ("employeeId",year,month)
);
CREATE INDEX IF NOT EXISTS bonos_mes_year_month_idx ON public.bonos_mes(year,month);

-- Estas tablas se consultan exclusivamente desde el backend con un rol PostgreSQL
-- de privilegios mínimos. No exponer la cadena DATABASE_URL al navegador.
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_extra_mes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horas_extra_dia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonos_mes ENABLE ROW LEVEL SECURITY;
-- No se crean políticas de acceso público. Configurar permisos del rol backend
-- y políticas RLS antes de habilitar acceso a usuarios reales.


-- ===== sql/20261030_app_permissions.sql =====
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


-- ===== sql/20261030_app_sessions.sql =====
-- Independent sessions: multiple devices, absolute lifetime 8 hours.
BEGIN;
CREATE TABLE IF NOT EXISTS public.app_sessions (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 username text NOT NULL REFERENCES public.users(username) ON DELETE CASCADE ON UPDATE CASCADE,
 token_hash text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 CONSTRAINT app_sessions_expiry_check CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS app_sessions_username_idx ON public.app_sessions(username);
CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx ON public.app_sessions(expires_at);
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_sessions FROM PUBLIC;
COMMIT;
-- Give the trusted backend DB role SELECT/INSERT/UPDATE/DELETE on app_sessions
-- and USAGE on its identity sequence. Configure RLS for this role or use a
-- dedicated SECURITY DEFINER API; do not expose table access to browser roles.
-- Scheduled cleanup (optional): DELETE FROM public.app_sessions
-- WHERE expires_at < now() - interval '7 days' OR revoked_at < now() - interval '7 days';


-- ===== sql/20261030_employee_assignments.sql =====
-- Non-destructive organizational history and report responsibility foundation.
-- Apply after supabase_schema.sql; no existing employee.supervisor data is overwritten.
BEGIN;
CREATE TABLE IF NOT EXISTS public.employee_assignments (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 employee_username text NOT NULL REFERENCES public.users(username),
 supervisor_username text REFERENCES public.users(username),
 project_id integer NOT NULL REFERENCES public.projects(id),
 valid_from date NOT NULL,
 valid_to date,
 created_by text REFERENCES public.users(username),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (valid_to IS NULL OR valid_to >= valid_from),
 CHECK (supervisor_username IS NULL OR employee_username <> supervisor_username)
);
CREATE INDEX IF NOT EXISTS employee_assignments_employee_dates_idx
 ON public.employee_assignments(employee_username,valid_from DESC);
CREATE INDEX IF NOT EXISTS employee_assignments_supervisor_dates_idx
 ON public.employee_assignments(supervisor_username,valid_from DESC);
CREATE INDEX IF NOT EXISTS employee_assignments_project_dates_idx
 ON public.employee_assignments(project_id,valid_from DESC);
-- Prevent overlapping assignments, including open-ended ones.
CREATE EXTENSION IF NOT EXISTS btree_gist;
DO $$ BEGIN
 ALTER TABLE public.employee_assignments ADD CONSTRAINT employee_assignments_no_overlap
 EXCLUDE USING gist (employee_username WITH =, daterange(valid_from,COALESCE(valid_to + 1,'infinity'::date),'[)') WITH &&);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.project_memberships (
 username text NOT NULL REFERENCES public.users(username),
 project_id integer NOT NULL REFERENCES public.projects(id),
 valid_from date NOT NULL DEFAULT CURRENT_DATE,
 valid_to date,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(username,project_id,valid_from),
 CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS project_memberships_current_idx ON public.project_memberships(username,project_id,valid_to);

CREATE TABLE IF NOT EXISTS public.app_user_permission_overrides (
 username text NOT NULL REFERENCES public.users(username),
 permission_code text NOT NULL REFERENCES public.app_permissions(code),
 allowed boolean NOT NULL,
 reason text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(username,permission_code)
);

-- Generic responsibility mapping; report type + id resolve to the existing module's record.
-- Only the backend may create/change these records after checking report existence.
CREATE TABLE IF NOT EXISTS public.report_responsibilities (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 report_type text NOT NULL CHECK(report_type IN ('PERMISO','HORAS_EXTRA_DIA','HORAS_EXTRA_MES','BONO_MES')),
 report_id text NOT NULL,
 employee_username text NOT NULL REFERENCES public.users(username),
 project_id integer NOT NULL REFERENCES public.projects(id),
 responsible_username text NOT NULL REFERENCES public.users(username),
 assigned_at timestamptz NOT NULL DEFAULT now(),
 assigned_by text REFERENCES public.users(username),
 released_at timestamptz,
 release_reason text,
 CHECK(released_at IS NULL OR released_at >= assigned_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS report_responsibilities_one_open_idx
 ON public.report_responsibilities(report_type,report_id) WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS report_responsibilities_pending_idx
 ON public.report_responsibilities(responsible_username,report_type) WHERE released_at IS NULL;

CREATE TABLE IF NOT EXISTS public.report_audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 report_type text NOT NULL,
 report_id text NOT NULL,
 actor_username text REFERENCES public.users(username),
 event_type text NOT NULL,
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS report_audit_log_report_idx ON public.report_audit_log(report_type,report_id,created_at DESC);

-- An explicit denial always wins; otherwise inherit role permission or explicit grant.
CREATE OR REPLACE FUNCTION public.app_has_permission(actor_username text,requested_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT EXISTS (
 SELECT 1 FROM public.users u
 LEFT JOIN public.app_user_permission_overrides o
   ON o.username=u.username AND o.permission_code=requested_permission
 WHERE u.username=actor_username AND u.active
   AND COALESCE(o.allowed,EXISTS(
     SELECT 1 FROM public.app_role_permissions rp
     WHERE rp.role=u.role AND rp.permission_code=requested_permission
   ))
 );
$$;

-- Scope by project; ADMIN and GERENCIA can view globally when permission allows.
CREATE OR REPLACE FUNCTION public.app_can_access_project(actor_username text,target_project_id integer,action_code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT public.app_has_permission(actor_username,action_code) AND EXISTS(
 SELECT 1 FROM public.users u WHERE u.username=actor_username AND u.active AND
 (u.role IN ('ADMIN','GERENCIA','RH') OR EXISTS(
 SELECT 1 FROM public.project_memberships pm
 WHERE pm.username=u.username AND pm.project_id=target_project_id
 AND pm.valid_from<=CURRENT_DATE AND (pm.valid_to IS NULL OR pm.valid_to>=CURRENT_DATE)
 )));
$$;

-- Prior supervisor retains access ONLY to an assigned, still-open report,
-- and only while their functional permission and account remain active.
CREATE OR REPLACE FUNCTION public.app_can_work_report(actor_username text,requested_permission text,
 requested_report_type text,requested_report_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT public.app_has_permission(actor_username,requested_permission) AND EXISTS(
 SELECT 1 FROM public.report_responsibilities rr
 WHERE rr.report_type=requested_report_type AND rr.report_id=requested_report_id
 AND rr.responsible_username=actor_username AND rr.released_at IS NULL
 );
$$;
ALTER TABLE public.employee_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_permission_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.employee_assignments,public.project_memberships,public.app_user_permission_overrides,public.report_responsibilities,public.report_audit_log FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_access_project(text,integer,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_can_work_report(text,text,text,text) FROM PUBLIC;
COMMIT;
-- IMPORTANT: these tables are not yet wired into existing API routes.
-- RLS policies and backend grants must be established before deployment.
-- Do not automatically backfill from free-text supervisor names.


-- Seed known project identifiers, without adding user accounts.
INSERT INTO public.projects(code,name) VALUES ('COLOMBIA','Colombia'),('PERU','Perú'),('ITALIA','Italia'),('GENERAL','General') ON CONFLICT(code) DO NOTHING;
