CREATE TABLE public.flow_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_id text NOT NULL,
  plan jsonb NOT NULL,
  policy_approved boolean NOT NULL DEFAULT false,
  policy_version integer,
  examples_run integer NOT NULL DEFAULT 0,
  live_run_done boolean NOT NULL DEFAULT false,
  is_current boolean NOT NULL DEFAULT true,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.flow_sessions TO authenticated;
GRANT ALL ON public.flow_sessions TO service_role;

ALTER TABLE public.flow_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY flow_sessions_own ON public.flow_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER flow_sessions_touch BEFORE UPDATE ON public.flow_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;