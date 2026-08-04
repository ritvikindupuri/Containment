ALTER TABLE public.policies ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS policy_version integer;

CREATE TABLE public.policy_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version integer NOT NULL,
  note text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version)
);

GRANT SELECT, INSERT ON public.policy_versions TO authenticated;
GRANT ALL ON public.policy_versions TO service_role;

ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_versions_select_own" ON public.policy_versions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "policy_versions_insert_own" ON public.policy_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX policy_versions_policy_idx ON public.policy_versions (policy_id, version DESC);