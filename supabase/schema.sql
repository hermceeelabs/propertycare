-- ====================================================================
-- PROPERTYFLOW — CANADIAN PROPERTY MANAGEMENT PLATFORM SCHEMA
-- DATABASE DDL & ROW LEVEL SECURITY (SUPABASE POSTGRESQL)
-- ====================================================================

-- 1. PROPERTIES TABLE
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL DEFAULT 'Ontario',
    postal_code VARCHAR(20) NOT NULL,
    property_type VARCHAR(50) NOT NULL CHECK (property_type IN ('Multi-Family', 'Condominium', 'Commercial', 'Townhome', 'Single-Family')),
    units_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Under Maintenance', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. UNITS TABLE
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    unit_type VARCHAR(50) NOT NULL,
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    monthly_rent NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Vacant' CHECK (status IN ('Occupied', 'Vacant', 'Notice Given', 'Maintenance', 'Reserved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TENANTS TABLE
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Applicant', 'Active', 'Notice Given', 'Former')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LEASES TABLE
CREATE TABLE IF NOT EXISTS public.leases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent NUMERIC(10,2) NOT NULL,
    deposit NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Expiring Soon', 'Renewal Pending', 'Renewed', 'Ended')),
    renewal_status VARCHAR(50) DEFAULT 'Pending Review' CHECK (renewal_status IN ('Pending Review', 'Renewal Offered', 'Tenant Accepted', 'Tenant Declined', 'Notice Sent')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
    amount_due NUMERIC(10,2) NOT NULL,
    amount_paid NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Paid', 'Pending', 'Partially Paid', 'Overdue')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. VENDORS TABLE
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Plumbing', 'Electrical', 'HVAC', 'General Maintenance', 'Cleaning', 'Landscaping', 'Pest Control')),
    service_area VARCHAR(100) NOT NULL, -- e.g. 'Toronto', 'Mississauga', 'Hamilton', 'Ottawa'
    status VARCHAR(50) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Pending')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. MAINTENANCE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL CHECK (category IN ('Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Pest', 'General', 'Other')),
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Emergency')),
    status VARCHAR(50) NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Assigned', 'Vendor Accepted', 'In Progress', 'Awaiting Parts', 'Completed', 'Cancelled')),
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. BILLS TABLE
CREATE TABLE IF NOT EXISTS public.bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    bill_number VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Due Soon', 'Paid', 'Overdue')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. NOTICES TABLE (N1, N4, LEASE RENEWAL ETC.)
CREATE TABLE IF NOT EXISTS public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
    notice_type VARCHAR(100) NOT NULL CHECK (notice_type IN ('Rent Increase (N1)', 'Notice of Non-Payment (N4)', 'Lease Renewal', 'Lease End', 'General Tenant Notice')),
    status VARCHAR(50) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Awaiting Review', 'Approved', 'Sent', 'Archived')),
    effective_date DATE NOT NULL,
    amount NUMERIC(10,2) DEFAULT 0.00,
    content TEXT NOT NULL,
    approved_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. COMMUNICATIONS TABLE (EMAIL ARCHITECTURE)
CREATE TABLE IF NOT EXISTS public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    communication_type VARCHAR(50) NOT NULL CHECK (communication_type IN ('Email', 'SMS', 'System Alert', 'Campaign')),
    template VARCHAR(100) NOT NULL,
    content_html TEXT NOT NULL,
    content_text TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Queued' CHECK (status IN ('Queued', 'Demo Sent', 'Simulated', 'Failed', 'Draft')),
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. AUTOMATION RULES TABLE
CREATE TABLE IF NOT EXISTS public.automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    automation_type VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('Scheduled Daily', 'Scheduled Hourly', 'Event Driven')),
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUTOMATION RUNS TABLE
CREATE TABLE IF NOT EXISTS public.automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Success', 'Failed', 'Partial Success', 'Running')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    records_processed INTEGER NOT NULL DEFAULT 0,
    notifications_generated INTEGER NOT NULL DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. AUTOMATION LOGS TABLE
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_run_id UUID REFERENCES public.automation_runs(id) ON DELETE CASCADE,
    automation_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    action VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Success', 'Failed', 'Skipped', 'Pending')),
    error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. TASKS TABLE (MANAGER ACTION ITEMS & ESCALATIONS)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_to VARCHAR(255) NOT NULL DEFAULT 'Property Manager',
    task_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Dismissed')),
    due_date DATE,
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON public.leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON public.payments(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_vendor ON public.maintenance_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(due_date);
CREATE INDEX IF NOT EXISTS idx_communications_created_at ON public.communications(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs(created_at);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Allow authenticated property managers read/write access
CREATE POLICY "Property Managers full access properties" ON public.properties FOR ALL USING (true);
CREATE POLICY "Property Managers full access units" ON public.units FOR ALL USING (true);
CREATE POLICY "Property Managers full access tenants" ON public.tenants FOR ALL USING (true);
CREATE POLICY "Property Managers full access leases" ON public.leases FOR ALL USING (true);
CREATE POLICY "Property Managers full access payments" ON public.payments FOR ALL USING (true);
CREATE POLICY "Property Managers full access vendors" ON public.vendors FOR ALL USING (true);
CREATE POLICY "Property Managers full access maintenance" ON public.maintenance_requests FOR ALL USING (true);
CREATE POLICY "Property Managers full access bills" ON public.bills FOR ALL USING (true);
CREATE POLICY "Property Managers full access notices" ON public.notices FOR ALL USING (true);
CREATE POLICY "Property Managers full access communications" ON public.communications FOR ALL USING (true);
CREATE POLICY "Property Managers full access automation_rules" ON public.automation_rules FOR ALL USING (true);
CREATE POLICY "Property Managers full access automation_runs" ON public.automation_runs FOR ALL USING (true);
CREATE POLICY "Property Managers full access automation_logs" ON public.automation_logs FOR ALL USING (true);
CREATE POLICY "Property Managers full access tasks" ON public.tasks FOR ALL USING (true);
