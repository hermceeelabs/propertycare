-- Add remaining flexible fields to units, bills, automation_rules
ALTER TABLE public.units 
  ADD COLUMN IF NOT EXISTS nightly_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS minimum_stay_nights INTEGER,
  ADD COLUMN IF NOT EXISTS current_occupancy_rate NUMERIC;

ALTER TABLE public.bills
  ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS automation_type TEXT,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS trigger_config JSONB;
