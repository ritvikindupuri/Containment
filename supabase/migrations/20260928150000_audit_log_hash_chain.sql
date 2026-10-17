-- Add hash chain to decisions table for tamper-evident audit trail
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS prev_hash TEXT;
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS row_hash TEXT;

-- Create index on row_hash for verification
CREATE INDEX IF NOT EXISTS decisions_hash_idx ON public.decisions (row_hash);

-- Function to compute row hash (SHA256 of previous hash + current row data)
CREATE OR REPLACE FUNCTION public.compute_decision_hash(
  p_prev_hash TEXT,
  p_id UUID,
  p_user_id UUID,
  p_policy_id UUID,
  p_action_type TEXT,
  p_verdict TEXT,
  p_risk_score INTEGER,
  p_created_at TIMESTAMPTZ
) RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    digest(
      COALESCE(p_prev_hash, '') || 
      p_id::TEXT || 
      p_user_id::TEXT || 
      COALESCE(p_policy_id::TEXT, '') || 
      p_action_type || 
      p_verdict || 
      p_risk_score::TEXT || 
      extract(epoch from p_created_at)::TEXT,
      'sha256'
    ),
    'hex'
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to automatically set hash chain on insert
CREATE OR REPLACE FUNCTION public.set_decision_hash()
RETURNS TRIGGER AS $$
DECLARE
  v_prev_hash TEXT;
BEGIN
  -- Get the most recent decision hash for this user
  SELECT row_hash INTO v_prev_hash
  FROM public.decisions
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;
  
  NEW.prev_hash := v_prev_hash;
  NEW.row_hash := public.compute_decision_hash(
    v_prev_hash,
    NEW.id,
    NEW.user_id,
    NEW.policy_id,
    NEW.action_type::TEXT,
    NEW.verdict::TEXT,
    NEW.risk_score,
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS decisions_hash_chain ON public.decisions;
CREATE TRIGGER decisions_hash_chain
  BEFORE INSERT ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_decision_hash();

-- Prevent updates and deletes to decisions table (append-only)
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that allow UPDATE/DELETE
DROP POLICY IF EXISTS "decisions_own" ON public.decisions;

-- Create new policies: SELECT and INSERT only
CREATE POLICY "decisions_select_own" ON public.decisions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "decisions_insert_own" ON public.decisions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role still has full access for maintenance
GRANT SELECT, INSERT ON public.decisions TO authenticated;
GRANT ALL ON public.decisions TO service_role;

-- Add rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(key, window_start)
);

GRANT SELECT, INSERT, UPDATE ON public.rate_limits TO authenticated;
GRANT ALL ON public.rate_limits TO service_role;

-- No RLS needed on rate_limits - it's keyed by opaque identifiers

-- Cleanup old rate limit records (older than 1 hour)
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON public.rate_limits (window_start);

COMMENT ON TABLE public.decisions IS 'Append-only audit trail with SHA256 hash chain for tamper detection';
COMMENT ON COLUMN public.decisions.prev_hash IS 'Hash of previous decision in chain for this user';
COMMENT ON COLUMN public.decisions.row_hash IS 'SHA256 hash of this decision including prev_hash';
