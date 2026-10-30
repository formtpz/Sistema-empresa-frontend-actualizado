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
