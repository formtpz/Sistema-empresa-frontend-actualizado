-- Coordinator team visibility is project-based, not supervisor-name-based.
-- Run once in Supabase SQL Editor after 20261030_employee_assignments.sql.
-- Does not grant project memberships automatically or change existing assignments.
BEGIN;
CREATE OR REPLACE FUNCTION public.app_can_view_employee(
 actor_username text, target_username text
) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
 SELECT public.app_has_permission(actor_username,'permissions.read_team')
 AND EXISTS(
   SELECT 1 FROM public.users actor
   JOIN public.employees e ON e.username=target_username
   JOIN public.users target ON target.username=e.username
   WHERE actor.username=actor_username AND actor.active
     AND (
       actor.role IN ('ADMIN','RH','GERENCIA')
       OR (
         actor.role='COORDINACION'
         AND e."projectId" IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM public.project_memberships pm
           WHERE pm.username=actor.username AND pm.project_id=e."projectId"
             AND pm.valid_from<=CURRENT_DATE
             AND (pm.valid_to IS NULL OR pm.valid_to>=CURRENT_DATE)
         )
       )
     )
 );
$$;
REVOKE ALL ON FUNCTION public.app_can_view_employee(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_can_view_employee(text,text) TO empresa_backend;
COMMIT;
-- Project membership assignments must be made by an authorized administrator.
-- This function only grants read visibility, never edit or report ownership.
