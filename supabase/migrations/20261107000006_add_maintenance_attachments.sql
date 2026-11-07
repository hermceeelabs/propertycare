-- Add attachments, approval notes, and contractor assignment metadata to maintenance_requests
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC;
ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS scheduled_date DATE;
