-- Fix and Align Schema with existing database.json models

-- Drop old tables cleanly
DROP TABLE IF EXISTS public.shortlet_bookings CASCADE;
DROP TABLE IF EXISTS public.applicants CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.automation_logs CASCADE;
DROP TABLE IF EXISTS public.automation_rules CASCADE;
DROP TABLE IF EXISTS public.communications CASCADE;
DROP TABLE IF EXISTS public.notices CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
DROP TABLE IF EXISTS public.bills CASCADE;
DROP TABLE IF EXISTS public.maintenance_requests CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.leases CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
DROP TABLE IF EXISTS public.units CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.landlords CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. Profiles & Team Members
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_owner BOOLEAN DEFAULT FALSE,
  user_type TEXT NOT NULL DEFAULT 'staff' CHECK (user_type IN ('owner', 'staff', 'landlord', 'tenant')),
  permissions JSONB DEFAULT '{
    "can_view_financials": true,
    "can_manage_leases": true,
    "can_dispatch_maintenance": true,
    "can_issue_notices": true,
    "can_edit_properties": true,
    "can_trigger_automations": true
  }'::jsonb,
  assigned_properties TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Landlords
CREATE TABLE public.landlords (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  management_fee_percentage NUMERIC DEFAULT 10.0,
  remittance_frequency TEXT DEFAULT 'Monthly',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Properties
CREATE TABLE public.properties (
  id TEXT PRIMARY KEY,
  landlord_id TEXT REFERENCES public.landlords(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  province TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  property_type TEXT NOT NULL,
  units_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active',
  acquisition JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Units
CREATE TABLE public.units (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms NUMERIC NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'Vacant',
  rental_model TEXT DEFAULT 'Long-Term',
  cleaning_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tenants
CREATE TABLE public.tenants (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Leases
CREATE TABLE public.leases (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES public.units(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  deposit NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  renewal_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payments
CREATE TABLE public.payments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id TEXT REFERENCES public.leases(id) ON DELETE SET NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  due_date DATE NOT NULL,
  payment_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Vendors
CREATE TABLE public.vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT NOT NULL,
  service_area TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Maintenance Requests
CREATE TABLE public.maintenance_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
  unit_id TEXT REFERENCES public.units(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'New',
  vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bills
CREATE TABLE public.bills (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE,
  vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
  bill_number TEXT,
  description TEXT,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Expenses
CREATE TABLE public.expenses (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES public.units(id) ON DELETE SET NULL,
  scope TEXT,
  vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Paid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Notices
CREATE TABLE public.notices (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id TEXT REFERENCES public.leases(id) ON DELETE SET NULL,
  notice_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  effective_date DATE,
  amount NUMERIC,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Communications
CREATE TABLE public.communications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  communication_type TEXT NOT NULL DEFAULT 'Email',
  template TEXT,
  content_html TEXT NOT NULL,
  content_text TEXT,
  status TEXT NOT NULL DEFAULT 'Sent',
  related_entity_type TEXT,
  related_entity_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Automation Rules & Logs
CREATE TABLE public.automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,
  schedule_cron TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  action_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.automation_logs (
  id TEXT PRIMARY KEY,
  automation_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Success',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Tasks & Applicants
CREATE TABLE public.tasks (
  id TEXT PRIMARY KEY,
  assigned_to TEXT,
  task_type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Pending',
  due_date DATE,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.applicants (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  employment TEXT,
  income NUMERIC,
  current_address TEXT,
  desired_property_id TEXT REFERENCES public.properties(id) ON DELETE SET NULL,
  desired_unit_id TEXT REFERENCES public.units(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'Under Review',
  credit_score INTEGER,
  background_check TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Shortlet Bookings
CREATE TABLE public.shortlet_bookings (
  id TEXT PRIMARY KEY,
  unit_id TEXT REFERENCES public.units(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights_count INTEGER NOT NULL,
  nightly_rate NUMERIC NOT NULL,
  cleaning_fee NUMERIC DEFAULT 0,
  platform_source TEXT NOT NULL,
  total_payout NUMERIC NOT NULL,
  booking_status TEXT NOT NULL DEFAULT 'Confirmed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public / Authenticated Access Policies for Full Application Functionality
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlet_bookings ENABLE ROW LEVEL SECURITY;

-- Allow anon & authenticated access to read/write operational data
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('CREATE POLICY "Allow anon select on %I" ON public.%I FOR SELECT USING (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow anon insert on %I" ON public.%I FOR INSERT WITH CHECK (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow anon update on %I" ON public.%I FOR UPDATE USING (true);', tbl, tbl);
    EXECUTE format('CREATE POLICY "Allow anon delete on %I" ON public.%I FOR DELETE USING (true);', tbl, tbl);
  END LOOP;
END $$;
