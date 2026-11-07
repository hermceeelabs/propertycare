-- Add role_templates table and update profiles
CREATE TABLE IF NOT EXISTS role_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_template_id TEXT;

-- Seed default reusable role templates
INSERT INTO role_templates (id, name, description, permissions, is_system)
VALUES 
(
  'role-ops-manager',
  'Operations Manager',
  'Full operational access: manage leases, dispatch maintenance, issue legal notices, edit properties and trigger automations.',
  '{"can_view_financials": true, "can_manage_leases": true, "can_dispatch_maintenance": true, "can_issue_notices": true, "can_edit_properties": true, "can_trigger_automations": true}'::jsonb,
  true
),
(
  'role-leasing-agent',
  'Leasing & Tenant Relations Agent',
  'Tenant onboarding, lease agreement administration, applicant screening, communications and Ontario legal notice generation.',
  '{"can_view_financials": false, "can_manage_leases": true, "can_dispatch_maintenance": false, "can_issue_notices": true, "can_edit_properties": false, "can_trigger_automations": false}'::jsonb,
  true
),
(
  'role-maintenance-coordinator',
  'Maintenance & Field Coordinator',
  'Triage resident repair tickets, coordinate trade contractors, dispatch work orders and inspect property units.',
  '{"can_view_financials": false, "can_manage_leases": false, "can_dispatch_maintenance": true, "can_issue_notices": false, "can_edit_properties": true, "can_trigger_automations": false}'::jsonb,
  true
),
(
  'role-financial-auditor',
  'Financial Auditor & Bookkeeper',
  'Access rent collection records, operating expenses, financial statements and break-even yield analytics.',
  '{"can_view_financials": true, "can_manage_leases": false, "can_dispatch_maintenance": false, "can_issue_notices": false, "can_edit_properties": false, "can_trigger_automations": false}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;
