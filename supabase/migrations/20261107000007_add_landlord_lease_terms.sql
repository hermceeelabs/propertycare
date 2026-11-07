-- Add flexible lease terms & payment structures to landlords table
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS lease_agreement_type TEXT DEFAULT 'Direct Management';
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS payment_structure TEXT DEFAULT 'Monthly';
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS lease_duration_months NUMERIC DEFAULT 12;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS agreed_payout_amount NUMERIC;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS lease_start_date DATE;
ALTER TABLE landlords ADD COLUMN IF NOT EXISTS lease_end_date DATE;
