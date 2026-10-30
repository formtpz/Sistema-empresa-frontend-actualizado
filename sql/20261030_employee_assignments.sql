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
