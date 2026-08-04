ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS approval_state text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS review_recommendation text,
  ADD COLUMN IF NOT EXISTS review_reasoning text,
  ADD COLUMN IF NOT EXISTS review_conditions text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_note text;

ALTER TABLE public.decisions DROP CONSTRAINT IF EXISTS decisions_approval_state_check;
ALTER TABLE public.decisions ADD CONSTRAINT decisions_approval_state_check
  CHECK (approval_state IN ('none','pending','approved','rejected'));

UPDATE public.decisions SET approval_state = 'pending'
  WHERE verdict = 'needs_approval' AND approval_state = 'none';

CREATE INDEX IF NOT EXISTS decisions_approval_state_idx
  ON public.decisions (user_id, approval_state, created_at DESC);