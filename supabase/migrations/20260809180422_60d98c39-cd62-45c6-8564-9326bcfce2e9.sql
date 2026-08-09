ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS advisor_score integer,
  ADD COLUMN IF NOT EXISTS advisor_level text,
  ADD COLUMN IF NOT EXISTS advisor_headline text,
  ADD COLUMN IF NOT EXISTS advisor_concerns jsonb,
  ADD COLUMN IF NOT EXISTS advisor_agrees boolean,
  ADD COLUMN IF NOT EXISTS advisor_at timestamptz;