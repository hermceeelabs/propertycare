-- PropertyFlow OS Core Database Schema Migration
-- Designed for PostgreSQL 15+ on Supabase

-- 1. Profiles & Team Members with Flexible Granular Permissions
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  is_owner BOOLEAN DEFAULT FALSE,
  user_type TEXT NOT NULL DEFAULT 'staff' CHECK (user_type IN ('owner', 'staff', 'landlord', 'tenant')),
  -- Granular Flexible Permission Matrix
  permissions JSONB DEFAULT '{
    "can_view_financials": false,
    "can_manage_leases": false,
    "can_dispatch_maintenance": false,
    "can_issue_notices": false,
    "can_edit_properties": false,
    "can_trigger_automations": false
  }'::jsonb,
  assigned_properties TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Landlords / Property Asset Owners
CREATE TABLE IF NOT EXISTS public.landlords (
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
CREATE TABLE IF NOT EXISTS public.properties (
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
CREATE TABLE IF NOT EXISTS public.units (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  unit_type TEXT NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms NUMERIC NOT NULL,
  square_feet INTEGER,
  market_rent NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'Vacant',
  current_lease_id TEXT,
  rental_model TEXT DEFAULT 'Long-Term',
  str_config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tenants
CREATE TABLE IF NOT EXISTS public.tenants (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  screening_status TEXT,
  screening_score INTEGER,
  current_unit_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Leases
CREATE TABLE IF NOT EXISTS public.leases (
  id TEXT PRIMARY KEY,
  unit_id TEXT REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  rent_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  payment_day INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Active',
  renewal_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  lease_id TEXT REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES public.units(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  amount_paid NUMERIC DEFAULT 0,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  payment_method TEXT,
  transaction_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Trade Vendors / Contractors
CREATE TABLE IF NOT EXISTS public.vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  trade_category TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL DEFAULT 0,
  rating NUMERIC DEFAULT 5.0,
  active_jobs INTEGER DEFAULT 0,
  insured BOOLEAN DEFAULT TRUE,
  service_areas TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Maintenance Requests
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id TEXT PRIMARY KEY,
  unit_id TEXT REFERENCES public.units(id) ON DELETE CASCADE,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE SET NULL,
  assigned_vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'New',
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  photos TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Bills & Operating Expenses
CREATE TABLE IF NOT EXISTS public.bills (
  id TEXT PRIMARY KEY,
  vendor_id TEXT REFERENCES public.vendors(id) ON DELETE SET NULL,
  property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES public.units(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status TEXT NOT NULL DEFAULT 'Pending',
  description TEXT,
  invoice_number TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  property_id TEXT REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES public.units(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Notices (Ontario N1, N4, etc.)
CREATE TABLE IF NOT EXISTS public.notices (
  id TEXT PRIMARY KEY,
  notice_type TEXT NOT NULL,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id TEXT REFERENCES public.units(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Draft',
  details JSONB,
  due_date DATE,
  served_date DATE,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Communications Feed
CREATE TABLE IF NOT EXISTS public.communications (
  id TEXT PRIMARY KEY,
  recipient_id TEXT,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_phone TEXT,
  channel TEXT NOT NULL DEFAULT 'Email',
  subject TEXT NOT NULL,
  content_html TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  automation_rule_id TEXT,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Automation Rules & Audit Logs
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  conditions JSONB,
  actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_logs (
  id TEXT PRIMARY KEY,
  automation_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Success',
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Tasks & Applicants
CREATE TABLE IF NOT EXISTS public.tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Pending',
  category TEXT,
  due_date DATE,
  related_entity_type TEXT,
  related_entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.applicants (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  desired_move_in DATE,
  annual_income NUMERIC,
  credit_score INTEGER,
  status TEXT NOT NULL DEFAULT 'Under Review',
  applied_unit_id TEXT REFERENCES public.units(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.shortlet_bookings (
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

-- Enable Row Level Security (RLS) on all core operational tables
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

-- Permissive authenticated policies for application users (can be tightened per tenant/landlord)
CREATE POLICY "Allow authenticated read on properties" ON public.properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on properties" ON public.properties FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on units" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on units" ON public.units FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on tenants" ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on tenants" ON public.tenants FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on leases" ON public.leases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on leases" ON public.leases FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on payments" ON public.payments FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on maintenance" ON public.maintenance_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on maintenance" ON public.maintenance_requests FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on bills" ON public.bills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on bills" ON public.bills FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on expenses" ON public.expenses FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on vendors" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on vendors" ON public.vendors FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on landlords" ON public.landlords FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on landlords" ON public.landlords FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on notices" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on notices" ON public.notices FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on communications" ON public.communications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on communications" ON public.communications FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on automations" ON public.automation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on automations" ON public.automation_logs FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on tasks" ON public.tasks FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on applicants" ON public.applicants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on applicants" ON public.applicants FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on shortlet" ON public.shortlet_bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated all on shortlet" ON public.shortlet_bookings FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow user read profile" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow user manage profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id);
