CREATE TYPE public.guard_mode AS ENUM ('enforce', 'monitor');
CREATE TYPE public.guard_verdict AS ENUM ('allow', 'deny', 'needs_approval');
CREATE TYPE public.guard_action_type AS ENUM ('shell', 'file_read', 'file_write', 'network', 'tool_call');

CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(COALESCE(NEW.email, 'agent'), '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode public.guard_mode NOT NULL DEFAULT 'enforce',
  block_shell BOOLEAN NOT NULL DEFAULT true,
  block_filesystem BOOLEAN NOT NULL DEFAULT true,
  block_network BOOLEAN NOT NULL DEFAULT true,
  block_injection BOOLEAN NOT NULL DEFAULT true,
  allowed_hosts TEXT[] NOT NULL DEFAULT ARRAY['api.openai.com','registry.npmjs.org','pypi.org']::text[],
  allowed_write_paths TEXT[] NOT NULL DEFAULT ARRAY['/workspace','/tmp']::text[],
  approval_required_tools TEXT[] NOT NULL DEFAULT ARRAY['send_email','transfer_funds','delete_records']::text[],
  deny_threshold INTEGER NOT NULL DEFAULT 60,
  approval_threshold INTEGER NOT NULL DEFAULT 35,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.policies TO authenticated;
GRANT ALL ON public.policies TO service_role;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "policies_own" ON public.policies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX policies_user_idx ON public.policies (user_id);

CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies ON DELETE SET NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_own" ON public.api_keys FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX api_keys_hash_idx ON public.api_keys (key_hash);

CREATE TABLE public.decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  policy_id UUID REFERENCES public.policies ON DELETE SET NULL,
  api_key_id UUID REFERENCES public.api_keys ON DELETE SET NULL,
  agent_id TEXT,
  source TEXT NOT NULL DEFAULT 'api',
  action_type public.guard_action_type NOT NULL,
  verdict public.guard_verdict NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  enforced BOOLEAN NOT NULL DEFAULT true,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  action JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decisions TO authenticated;
GRANT ALL ON public.decisions TO service_role;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions_own" ON public.decisions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX decisions_user_created_idx ON public.decisions (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER policies_touch BEFORE UPDATE ON public.policies
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();