import type {
  Expense,
  Property, Unit, Tenant, Lease, Payment, Vendor,
  MaintenanceRequest, Bill, Notice, Communication,
  AutomationRule, AutomationLog, Task, TenantApplicant
} from '../types/database';

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    name: 'Maple Heights Apartments',
    address: '145 Maplewood Ave',
    city: 'Toronto',
    province: 'Ontario',
    postal_code: 'M6C 1J2',
    property_type: 'Multi-Family',
    units_count: 48,
    status: 'Active',
    acquisition: {
      "acquisition_type": "Outright Purchase",
      "acquisition_date": "2023-01-15",
      "total_acquisition_cost": 5400000,
      "down_payment_or_deposit": 1080000,
      "amortization_period_years": 25,
      "annual_depreciation_or_amort": 216000,
      "interest_rate_percent": 4.85,
      "notes": "Freehold outright commercial acquisition in Toronto core. Initial equity investment $1.08M CAD with 25-year structural depreciation schedule."
},
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'prop-2',
    name: 'Harbourview Residences',
    address: '300 City Centre Dr',
    city: 'Mississauga',
    province: 'Ontario',
    postal_code: 'L5B 3C1',
    property_type: 'Condominium',
    units_count: 64,
    status: 'Active',
    acquisition: {
      "acquisition_type": "Long-Term Lease",
      "acquisition_date": "2023-03-20",
      "total_acquisition_cost": 3330000,
      "down_payment_or_deposit": 250000,
      "lease_term_years": 15,
      "monthly_lease_cost": 18500,
      "amortization_period_years": 15,
      "annual_depreciation_or_amort": 222000,
      "notes": "15-Year Institutional Master Lease with option to renew. Monthly master lease disbursement of $18,500 CAD to asset owner."
},
    created_at: '2023-03-20T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'prop-3',
    name: 'King Street Lofts',
    address: '188 King St E',
    city: 'Hamilton',
    province: 'Ontario',
    postal_code: 'L8N 1B4',
    property_type: 'Multi-Family',
    units_count: 34,
    status: 'Active',
    acquisition: {
      "acquisition_type": "Outright Purchase",
      "acquisition_date": "2023-06-10",
      "total_acquisition_cost": 3200000,
      "down_payment_or_deposit": 640000,
      "amortization_period_years": 25,
      "annual_depreciation_or_amort": 128000,
      "interest_rate_percent": 4.65,
      "notes": "Heritage brick-and-beam loft multi-family asset purchased outright. Initial cash equity of $640k CAD."
},
    created_at: '2023-06-10T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'prop-4',
    name: 'Capital View Residences',
    address: '450 Laurier Ave W',
    city: 'Ottawa',
    province: 'Ontario',
    postal_code: 'K1R 7R3',
    property_type: 'Multi-Family',
    units_count: 40,
    status: 'Active',
    acquisition: {
      "acquisition_type": "Long-Term Lease",
      "acquisition_date": "2023-09-01",
      "total_acquisition_cost": 1500000,
      "down_payment_or_deposit": 140000,
      "lease_term_years": 10,
      "monthly_lease_cost": 12500,
      "amortization_period_years": 10,
      "annual_depreciation_or_amort": 150000,
      "notes": "10-Year Master Lease agreement for Ottawa executive suites. $12,500 CAD monthly ground lease obligations."
},
    created_at: '2023-09-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  }
];

export const INITIAL_UNITS: Unit[] = [
  // Maple Heights (Toronto)
  { id: 'unit-101', property_id: 'prop-1', unit_number: '101', unit_type: '1-Bedroom', bedrooms: 1, bathrooms: 1, monthly_rent: 2150, status: 'Occupied', created_at: '2023-01-15Z', updated_at: '2026-08-01Z' },
  { id: 'unit-102', property_id: 'prop-1', unit_number: '102', unit_type: '2-Bedroom', bedrooms: 2, bathrooms: 2, monthly_rent: 2850, status: 'Occupied', created_at: '2023-01-15Z', updated_at: '2026-08-01Z' },
  { id: 'unit-103', property_id: 'prop-1', unit_number: '103', unit_type: 'Studio', bedrooms: 0, bathrooms: 1, monthly_rent: 1800, status: 'Notice Given', created_at: '2023-01-15Z', updated_at: '2026-08-01Z' },
  { id: 'unit-104', property_id: 'prop-1', unit_number: '104', unit_type: '2-Bedroom', bedrooms: 2, bathrooms: 1.5, monthly_rent: 2750, status: 'Occupied', created_at: '2023-01-15Z', updated_at: '2026-08-01Z' },
  { id: 'unit-105', property_id: 'prop-1', unit_number: '105', unit_type: '1-Bedroom', bedrooms: 1, bathrooms: 1, monthly_rent: 2200, status: 'Vacant', created_at: '2023-01-15Z', updated_at: '2026-08-01Z' },
  { id: 'unit-201', property_id: 'prop-1', unit_number: '201', unit_type: '1-Bedroom Penthouse', bedrooms: 1, bathrooms: 1, monthly_rent: 2400, status: 'Occupied', created_at: '2023-01-15Z', updated_at: '2026-08-01Z' },
  { id: 'unit-204', property_id: 'prop-1', unit_number: '204', unit_type: '2-Bedroom', bedrooms: 2, bathrooms: 2, monthly_rent: 2900, status: 'Occupied', created_at: '2023-01-15Z', updated_at: '2026-08-01Z' },

  // Harbourview (Mississauga)
  { id: 'unit-301', property_id: 'prop-2', unit_number: '301', unit_type: '1-Bedroom+Den', bedrooms: 1, bathrooms: 1.5, monthly_rent: 2450, status: 'Occupied', created_at: '2023-03-20Z', updated_at: '2026-08-01Z' },
  { id: 'unit-302', property_id: 'prop-2', unit_number: '302', unit_type: '2-Bedroom', bedrooms: 2, bathrooms: 2, monthly_rent: 2950, status: 'Occupied', created_at: '2023-03-20Z', updated_at: '2026-08-01Z' },
  { id: 'unit-303', property_id: 'prop-2', unit_number: '303', unit_type: '3-Bedroom', bedrooms: 3, bathrooms: 2.5, monthly_rent: 3600, status: 'Maintenance', created_at: '2023-03-20Z', updated_at: '2026-08-01Z' },

  // King Street Lofts (Hamilton)
  { id: 'unit-401', property_id: 'prop-3', unit_number: '1A', unit_type: 'Loft Studio', bedrooms: 1, bathrooms: 1, monthly_rent: 1950, status: 'Occupied', created_at: '2023-06-10Z', updated_at: '2026-08-01Z' },
  { id: 'unit-402', property_id: 'prop-3', unit_number: '2B', unit_type: '2-Bedroom Loft', bedrooms: 2, bathrooms: 2, monthly_rent: 2500, status: 'Occupied', created_at: '2023-06-10Z', updated_at: '2026-08-01Z' },

  // Capital View (Ottawa)
  { id: 'unit-501', property_id: 'prop-4', unit_number: '501', unit_type: '2-Bedroom Executive', bedrooms: 2, bathrooms: 2, monthly_rent: 2650, status: 'Occupied', created_at: '2023-09-01Z', updated_at: '2026-08-01Z' },
  { id: 'unit-502', property_id: 'prop-4', unit_number: '502', unit_type: '1-Bedroom Suite', bedrooms: 1, bathrooms: 1, monthly_rent: 2100, status: 'Occupied', created_at: '2023-09-01Z', updated_at: '2026-08-01Z' }
];

export const INITIAL_TENANTS: Tenant[] = [
  { id: 'ten-1', first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah.mitchell@example.ca', phone: '(416) 555-0192', status: 'Active', created_at: '2023-02-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
  { id: 'ten-2', first_name: 'David', last_name: 'Chen', email: 'david.chen@example.ca', phone: '(416) 555-0341', status: 'Active', created_at: '2023-02-15T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
  { id: 'ten-3', first_name: 'Jean-Luc', last_name: 'Roy', email: 'jeanluc.roy@example.ca', phone: '(613) 555-0812', status: 'Active', created_at: '2023-09-05T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
  { id: 'ten-4', first_name: 'Amina', last_name: 'Al-Mansoor', email: 'amina.almansoor@example.ca', phone: '(905) 555-0477', status: 'Active', created_at: '2023-04-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
  { id: 'ten-5', first_name: 'Marcus', last_name: 'Vance', email: 'marcus.vance@example.ca', phone: '(905) 555-0922', status: 'Active', created_at: '2023-07-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
  { id: 'ten-6', first_name: 'Elena', last_name: 'Rostova', email: 'elena.rostova@example.ca', phone: '(416) 555-0611', status: 'Active', created_at: '2024-01-10T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
  { id: 'ten-7', first_name: 'Liam', last_name: 'O\'Connor', email: 'liam.oconnor@example.ca', phone: '(613) 555-0133', status: 'Active', created_at: '2024-03-01T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' },
  { id: 'ten-8', first_name: 'Priya', last_name: 'Patel', email: 'priya.patel@example.ca', phone: '(416) 555-0789', status: 'Active', created_at: '2024-05-15T00:00:00Z', updated_at: '2026-08-01T00:00:00Z' }
];

export const INITIAL_LEASES: Lease[] = [
  { id: 'lease-1', tenant_id: 'ten-1', unit_id: 'unit-101', start_date: '2025-09-01', end_date: '2026-08-31', monthly_rent: 2150, deposit: 2150, status: 'Expiring Soon', renewal_status: 'Pending Review', created_at: '2025-08-15Z', updated_at: '2026-08-01Z' },
  { id: 'lease-2', tenant_id: 'ten-2', unit_id: 'unit-102', start_date: '2025-10-01', end_date: '2026-09-30', monthly_rent: 2850, deposit: 2850, status: 'Expiring Soon', renewal_status: 'Renewal Offered', created_at: '2025-09-15Z', updated_at: '2026-08-01Z' },
  { id: 'lease-3', tenant_id: 'ten-3', unit_id: 'unit-501', start_date: '2025-11-01', end_date: '2026-10-31', monthly_rent: 2650, deposit: 2650, status: 'Active', renewal_status: 'Pending Review', created_at: '2025-10-20Z', updated_at: '2026-08-01Z' },
  { id: 'lease-4', tenant_id: 'ten-4', unit_id: 'unit-301', start_date: '2025-09-15', end_date: '2026-09-14', monthly_rent: 2450, deposit: 2450, status: 'Expiring Soon', renewal_status: 'Pending Review', created_at: '2025-09-01Z', updated_at: '2026-08-01Z' },
  { id: 'lease-5', tenant_id: 'ten-5', unit_id: 'unit-401', start_date: '2025-07-01', end_date: '2026-06-30', monthly_rent: 1950, deposit: 1950, status: 'Active', renewal_status: 'Pending Review', created_at: '2025-06-15Z', updated_at: '2026-08-01Z' },
  { id: 'lease-6', tenant_id: 'ten-6', unit_id: 'unit-204', start_date: '2026-01-01', end_date: '2026-12-31', monthly_rent: 2900, deposit: 2900, status: 'Active', renewal_status: 'Pending Review', created_at: '2025-12-15Z', updated_at: '2026-08-01Z' },
  { id: 'lease-7', tenant_id: 'ten-7', unit_id: 'unit-502', start_date: '2025-09-01', end_date: '2026-08-31', monthly_rent: 2100, deposit: 2100, status: 'Expiring Soon', renewal_status: 'Renewal Offered', created_at: '2025-08-15Z', updated_at: '2026-08-01Z' },
  { id: 'lease-8', tenant_id: 'ten-8', unit_id: 'unit-104', start_date: '2025-06-01', end_date: '2026-05-31', monthly_rent: 2750, deposit: 2750, status: 'Active', renewal_status: 'Pending Review', created_at: '2025-05-15Z', updated_at: '2026-08-01Z' }
];

export const INITIAL_PAYMENTS: Payment[] = [
  // Current month (August 2026)
  { id: 'pay-1', tenant_id: 'ten-1', lease_id: 'lease-1', amount_due: 2150, amount_paid: 2150, due_date: '2026-08-01', payment_date: '2026-08-01', status: 'Paid', created_at: '2026-08-01Z', updated_at: '2026-08-01Z' },
  { id: 'pay-2', tenant_id: 'ten-2', lease_id: 'lease-2', amount_due: 2850, amount_paid: 0, due_date: '2026-08-01', status: 'Overdue', created_at: '2026-08-01Z', updated_at: '2026-08-20Z' },
  { id: 'pay-3', tenant_id: 'ten-3', lease_id: 'lease-3', amount_due: 2650, amount_paid: 2650, due_date: '2026-08-01', payment_date: '2026-07-30', status: 'Paid', created_at: '2026-08-01Z', updated_at: '2026-08-01Z' },
  { id: 'pay-4', tenant_id: 'ten-4', lease_id: 'lease-4', amount_due: 2450, amount_paid: 1200, due_date: '2026-08-01', payment_date: '2026-08-05', status: 'Partially Paid', created_at: '2026-08-01Z', updated_at: '2026-08-05Z' },
  { id: 'pay-5', tenant_id: 'ten-5', lease_id: 'lease-5', amount_due: 1950, amount_paid: 0, due_date: '2026-08-01', status: 'Overdue', created_at: '2026-08-01Z', updated_at: '2026-08-20Z' },
  { id: 'pay-6', tenant_id: 'ten-6', lease_id: 'lease-6', amount_due: 2900, amount_paid: 2900, due_date: '2026-08-01', payment_date: '2026-08-01', status: 'Paid', created_at: '2026-08-01Z', updated_at: '2026-08-01Z' },
  { id: 'pay-7', tenant_id: 'ten-7', lease_id: 'lease-7', amount_due: 2100, amount_paid: 2100, due_date: '2026-08-01', payment_date: '2026-08-02', status: 'Paid', created_at: '2026-08-01Z', updated_at: '2026-08-02Z' },
  { id: 'pay-8', tenant_id: 'ten-8', lease_id: 'lease-8', amount_due: 2750, amount_paid: 0, due_date: '2026-08-01', status: 'Overdue', created_at: '2026-08-01Z', updated_at: '2026-08-20Z' },

  // Previous month (July 2026)
  { id: 'pay-101', tenant_id: 'ten-1', lease_id: 'lease-1', amount_due: 2150, amount_paid: 2150, due_date: '2026-07-01', payment_date: '2026-07-01', status: 'Paid', created_at: '2026-07-01Z', updated_at: '2026-07-01Z' },
  { id: 'pay-102', tenant_id: 'ten-2', lease_id: 'lease-2', amount_due: 2850, amount_paid: 2850, due_date: '2026-07-01', payment_date: '2026-07-03', status: 'Paid', created_at: '2026-07-01Z', updated_at: '2026-07-03Z' },
  { id: 'pay-103', tenant_id: 'ten-5', lease_id: 'lease-5', amount_due: 1950, amount_paid: 1950, due_date: '2026-07-01', payment_date: '2026-07-02', status: 'Paid', created_at: '2026-07-01Z', updated_at: '2026-07-02Z' }
];

export const INITIAL_VENDORS: Vendor[] = [
  { id: 'ven-1', name: 'Maple Leaf Plumbing', company: 'Maple Leaf Plumbing & Drain Services', email: 'dispatch@mapleleafplumbing.ca', phone: '(416) 555-7822', category: 'Plumbing', service_area: 'Toronto', status: 'Active', created_at: '2023-01-01Z', updated_at: '2026-08-01Z' },
  { id: 'ven-2', name: 'Great Lakes HVAC Solutions', company: 'Great Lakes Heating & Cooling Inc', email: 'service@greatlakeshvac.ca', phone: '(905) 555-3411', category: 'HVAC', service_area: 'Mississauga', status: 'Active', created_at: '2023-02-15Z', updated_at: '2026-08-01Z' },
  { id: 'ven-3', name: 'GTA Electrical Services', company: 'GTA Electrical Contractors Ltd', email: 'support@gtaelectric.ca', phone: '(416) 555-9011', category: 'Electrical', service_area: 'Toronto', status: 'Active', created_at: '2023-03-01Z', updated_at: '2026-08-01Z' },
  { id: 'ven-4', name: 'Capital City Maintenance', company: 'Capital Maintenance Group', email: 'jobs@capitalmaintenanceservices.ca', phone: '(613) 555-4420', category: 'General Maintenance', service_area: 'Ottawa', status: 'Active', created_at: '2023-04-10Z', updated_at: '2026-08-01Z' },
  { id: 'ven-5', name: 'Hamilton Steel Pest Control', company: 'Hamilton Steel Pest Specialists', email: 'contact@hamiltonpest.ca', phone: '(905) 555-8821', category: 'Pest Control', service_area: 'Hamilton', status: 'Active', created_at: '2023-05-01Z', updated_at: '2026-08-01Z' },
  { id: 'ven-6', name: 'Trillium Cleaning Services', company: 'Trillium Property Cleaning Inc', email: 'admin@trilliumclean.ca', phone: '(416) 555-1100', category: 'Cleaning', service_area: 'Toronto', status: 'Active', created_at: '2023-06-01Z', updated_at: '2026-08-01Z' }
];

export const INITIAL_MAINTENANCE: MaintenanceRequest[] = [
  { id: 'maint-1', tenant_id: 'ten-2', unit_id: 'unit-102', category: 'Plumbing', description: 'Kitchen sink pipe leaking onto cabinet floor. Water valve turned off temporarily.', priority: 'Emergency', status: 'Assigned', vendor_id: 'ven-1', created_at: '2026-08-20T14:30:00Z', updated_at: '2026-08-20T15:00:00Z' },
  { id: 'maint-2', tenant_id: 'ten-4', unit_id: 'unit-301', category: 'HVAC', description: 'Air conditioner unit emitting loud buzzing noise and not blowing cold air.', priority: 'High', status: 'Vendor Accepted', vendor_id: 'ven-2', created_at: '2026-08-19T09:15:00Z', updated_at: '2026-08-19T10:30:00Z' },
  { id: 'maint-3', tenant_id: 'ten-3', unit_id: 'unit-501', category: 'Electrical', description: 'Master bedroom ceiling fixture outlets lost power after breaker switch tripped.', priority: 'Normal', status: 'In Progress', vendor_id: 'ven-4', created_at: '2026-08-18T11:00:00Z', updated_at: '2026-08-18T16:00:00Z' },
  { id: 'maint-4', tenant_id: 'ten-5', unit_id: 'unit-401', category: 'Pest', description: 'Small hornets nest forming near balcony glass railing.', priority: 'Low', status: 'Assigned', vendor_id: 'ven-5', created_at: '2026-08-21T08:45:00Z', updated_at: '2026-08-21T09:00:00Z' },
  { id: 'maint-5', tenant_id: 'ten-1', unit_id: 'unit-101', category: 'Appliance', description: 'Dishwasher cycle stops midway with error code E-24.', priority: 'Normal', status: 'New', created_at: '2026-08-21T10:00:00Z', updated_at: '2026-08-21T10:00:00Z' }
];

export const INITIAL_BILLS: Bill[] = [
  { id: 'bill-1', property_id: 'prop-1', vendor_id: 'ven-1', bill_number: 'INV-2026-0891', description: 'Emergency plumbing repairs - Unit 102 kitchen main drain line clearing', amount: 485.50, due_date: '2026-08-28', status: 'Due Soon', created_at: '2026-08-15Z', updated_at: '2026-08-15Z' },
  { id: 'bill-2', property_id: 'prop-2', vendor_id: 'ven-2', bill_number: 'INV-2026-0733', description: 'Quarterly HVAC filter replacement & seasonal chiller checkup', amount: 1450.00, due_date: '2026-08-15', status: 'Overdue', created_at: '2026-08-01Z', updated_at: '2026-08-16Z' },
  { id: 'bill-3', property_id: 'prop-3', vendor_id: 'ven-5', bill_number: 'INV-2026-0412', description: 'Monthly exterior pest prevention barrier treatment', amount: 320.00, due_date: '2026-09-05', status: 'Pending', created_at: '2026-08-20Z', updated_at: '2026-08-20Z' },
  { id: 'bill-4', property_id: 'prop-1', vendor_id: 'ven-6', bill_number: 'INV-2026-0610', description: 'Bi-weekly common area corridor carpet deep cleaning & sanitization', amount: 890.00, due_date: '2026-08-10', payment_date: '2026-08-08', status: 'Paid', created_at: '2026-08-01Z', updated_at: '2026-08-08Z' }
];

export const INITIAL_NOTICES: Notice[] = [
  {
    id: 'notif-1',
    tenant_id: 'ten-1',
    lease_id: 'lease-1',
    notice_type: 'Rent Increase (N1)',
    status: 'Awaiting Review',
    effective_date: '2026-12-01',
    amount: 2203.75,
    content: 'Notice of Rent Increase (Form N1) for Unit 101. Current Rent: $2,150.00. Guideline Increase: 2.5% ($53.75). New Monthly Rent: $2,203.75 starting December 1, 2026.',
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'notif-2',
    tenant_id: 'ten-2',
    lease_id: 'lease-2',
    notice_type: 'Notice of Non-Payment (N4)',
    status: 'Draft',
    effective_date: '2026-08-31',
    amount: 2850.00,
    content: 'DRAFT Notice to End a Tenancy Early for Non-payment of Rent (Form N4). Total arrears: $2,850.00 due August 1, 2026. Termination date if unpaid: August 31, 2026.',
    created_at: '2026-08-21T08:00:00Z',
    updated_at: '2026-08-21T08:00:00Z'
  }
];

export const INITIAL_COMMUNICATIONS: Communication[] = [
  {
    id: 'comm-1',
    tenant_id: 'ten-2',
    recipient: 'david.chen@example.ca',
    subject: 'RENT REMINDER: Overdue Rent Account for Unit 102',
    communication_type: 'Email',
    template: 'Rent Overdue Reminder (3 Days)',
    content_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e3a8a;">Northstar Property Management</h2>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
        <p>Dear David Chen,</p>
        <p>Our records indicate that your rent payment of <strong>$2,850.00</strong> for <strong>Maple Heights Apartments, Unit 102</strong> due on <strong>August 1, 2026</strong> is currently overdue.</p>
        <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 12px; margin: 15px 0;">
          <p style="margin: 0; font-weight: bold;">Amount Overdue: $2,850.00 CAD</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Due Date: August 1, 2026</p>
        </div>
        <p>Please log in to your tenant portal or initiate Interac e-Transfer to <strong>payments@northstarpm.ca</strong> immediately to avoid administrative non-payment procedures.</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 25px;">Northstar Property Management Inc. | Operations Center Toronto</p>
      </div>
    `,
    content_text: 'Dear David Chen, Your rent payment of $2,850.00 for Unit 102 due Aug 1, 2026 is overdue. Please submit payment immediately.',
    status: 'Demo Sent',
    related_entity_type: 'Payment',
    related_entity_id: 'pay-2',
    sent_at: '2026-08-20T09:00:00Z',
    created_at: '2026-08-20T09:00:00Z'
  },
  {
    id: 'comm-2',
    tenant_id: 'ten-4',
    recipient: 'dispatch@greatlakeshvac.ca',
    subject: 'VENDOR ASSIGNMENT: Maintenance Request #maint-2 (Mississauga)',
    communication_type: 'Email',
    template: 'Vendor Maintenance Dispatch',
    content_html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; color: #1e293b; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e3a8a;">Northstar Property Operations Dispatch</h2>
        <p>Hello Great Lakes HVAC Team,</p>
        <p>You have been assigned a new HIGH PRIORITY maintenance work order:</p>
        <ul>
          <li><strong>Property:</strong> Harbourview Residences (300 City Centre Dr, Mississauga)</li>
          <li><strong>Unit:</strong> 301</li>
          <li><strong>Issue:</strong> Air conditioner unit emitting loud noise and not cooling.</li>
          <li><strong>Tenant Contact:</strong> Amina Al-Mansoor ((905) 555-0477)</li>
        </ul>
        <p>Please confirm receipt and coordinate entry time with tenant.</p>
      </div>
    `,
    content_text: 'Vendor Dispatch: High priority HVAC request for Harbourview Residences Unit 301.',
    status: 'Demo Sent',
    related_entity_type: 'MaintenanceRequest',
    related_entity_id: 'maint-2',
    sent_at: '2026-08-19T10:30:00Z',
    created_at: '2026-08-19T10:30:00Z'
  }
];

export const INITIAL_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule-1',
    name: 'Rent Reminder & Late Payment Escalation',
    automation_type: 'rent_reminder',
    description: 'Sends friendly payment reminders 3 days before due date, payment date reminders, and escalates overdue accounts at 1, 3, and 7 days.',
    enabled: true,
    trigger_type: 'Scheduled Daily',
    trigger_config: { run_time: '09:00 EST' },
    action_config: { pre_due_days: 3, post_due_days: [1, 3, 7], generate_email: true, escalate_task_days: 7 },
    created_at: '2024-01-01Z',
    updated_at: '2026-08-01Z'
  },
  {
    id: 'rule-2',
    name: 'Lease Expiration & Renewal Workflow',
    automation_type: 'lease_expiration',
    description: 'Scans upcoming lease end dates at 90 days (create renewal task), 60 days (generate renewal offer email), 30 days (manager alert), and 14 days (escalate).',
    enabled: true,
    trigger_type: 'Scheduled Daily',
    trigger_config: { run_time: '08:00 EST' },
    action_config: { thresholds: [90, 60, 30, 14] },
    created_at: '2024-01-01Z',
    updated_at: '2026-08-01Z'
  },
  {
    id: 'rule-3',
    name: 'Automatic Vendor Maintenance Assignment',
    automation_type: 'maintenance_vendor_assignment',
    description: 'Instantly matches incoming maintenance requests to active vendors by trade category and regional service area, dispatching notification emails.',
    enabled: true,
    trigger_type: 'Event Driven',
    trigger_config: { event: 'maintenance_request.created' },
    action_config: { auto_assign: true, match_trade: true, match_region: true },
    created_at: '2024-01-01Z',
    updated_at: '2026-08-01Z'
  },
  {
    id: 'rule-4',
    name: 'Vendor Bill Due Date Reminders',
    automation_type: 'bill_reminder',
    description: 'Checks upcoming vendor invoice due dates at 7 days before and on due date to prevent late fee penalties.',
    enabled: true,
    trigger_type: 'Scheduled Daily',
    trigger_config: { run_time: '09:30 EST' },
    action_config: { reminder_days: 7 },
    created_at: '2024-01-01Z',
    updated_at: '2026-08-01Z'
  },
  {
    id: 'rule-5',
    name: 'Ontario N4 Non-Payment Draft Workflow',
    automation_type: 'n4_nonpayment_workflow',
    description: 'Prepares administrative Form N4 draft notice when rent accounts exceed 14 days overdue for property manager review.',
    enabled: true,
    trigger_type: 'Scheduled Daily',
    trigger_config: { overdue_days_threshold: 14 },
    action_config: { prepare_draft: true, require_approval: true },
    created_at: '2024-01-01Z',
    updated_at: '2026-08-01Z'
  }
];

export const INITIAL_AUTOMATION_LOGS: AutomationLog[] = [
  {
    id: 'log-1',
    automation_type: 'rent_reminder',
    entity_type: 'Payment',
    entity_id: 'pay-2',
    action: 'Generated 3-day overdue payment email for Sarah Mitchell (Unit 101)',
    status: 'Success',
    metadata: { recipient: 'sarah.mitchell@example.ca', amount: 2150 },
    created_at: '2026-08-20T09:00:00Z'
  },
  {
    id: 'log-2',
    automation_type: 'maintenance_vendor_assignment',
    entity_type: 'MaintenanceRequest',
    entity_id: 'maint-2',
    action: 'Auto-assigned HVAC request to Great Lakes HVAC Solutions',
    status: 'Success',
    metadata: { vendor: 'Great Lakes HVAC Solutions', trade: 'HVAC' },
    created_at: '2026-08-19T10:30:00Z'
  },
  {
    id: 'log-3',
    automation_type: 'lease_expiration',
    entity_type: 'Lease',
    entity_id: 'lease-1',
    action: 'Generated 30-day lease renewal alert for Sarah Mitchell',
    status: 'Success',
    metadata: { lease_end: '2026-08-31', days_remaining: 30 },
    created_at: '2026-08-15T08:00:00Z'
  }
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    assigned_to: 'Property Manager',
    task_type: 'Notice Approval',
    title: 'Review & Approve Form N1 Rent Increase for Sarah Mitchell',
    description: 'Prepared N1 notice for Unit 101 proposing 2.5% increase ($53.75) effective Dec 1, 2026.',
    priority: 'High',
    status: 'Pending',
    due_date: '2026-08-25',
    related_entity_type: 'Notice',
    related_entity_id: 'notif-1',
    created_at: '2026-08-20T10:00:00Z',
    updated_at: '2026-08-20T10:00:00Z'
  },
  {
    id: 'task-2',
    assigned_to: 'Property Manager',
    task_type: 'Rent Overdue Escalation',
    title: 'Follow up on 20-day overdue rent balance for David Chen (Unit 102)',
    description: 'Overdue rent of $2,850.00. 3 automated email reminders delivered. Manager call required.',
    priority: 'Urgent',
    status: 'Pending',
    due_date: '2026-08-21',
    related_entity_type: 'Payment',
    related_entity_id: 'pay-2',
    created_at: '2026-08-20T09:00:00Z',
    updated_at: '2026-08-20T09:00:00Z'
  }
];

export const INITIAL_APPLICANTS: TenantApplicant[] = [
  {
    id: 'app-1',
    full_name: 'Alexandre Tremblay',
    email: 'alex.tremblay@example.ca',
    phone: '(416) 555-8833',
    employment: 'Senior Software Engineer at Shopify',
    income: 142000,
    current_address: '88 Bloor St W, Toronto, ON',
    desired_property_id: 'prop-1',
    desired_unit_id: 'unit-105',
    status: 'In Review',
    credit_score: 765,
    background_check: 'Passed',
    created_at: '2026-08-19T11:00:00Z'
  },
  {
    id: 'app-2',
    full_name: 'Meghan Koster',
    email: 'meghan.koster@example.ca',
    phone: '(905) 555-4122',
    employment: 'Marketing Director at RBC',
    income: 115000,
    current_address: '120 Burnhamthorpe Rd, Mississauga, ON',
    desired_property_id: 'prop-2',
    desired_unit_id: 'unit-303',
    status: 'Pending',
    credit_score: 720,
    background_check: 'Pending',
    created_at: '2026-08-21T09:30:00Z'
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    "id": "exp-1",
    "property_id": "prop-1",
    "unit_id": "unit-102",
    "scope": "Unit",
    "vendor_id": "ven-1",
    "category": "Repairs & Maintenance",
    "description": "Unit 102 kitchen sink drain pipe clearing & P-trap replacement",
    "amount": 485.5,
    "date": "2026-08-15",
    "payment_status": "Paid",
    "created_at": "2026-08-15T14:00:00Z",
    "updated_at": "2026-08-15T14:00:00Z"
  },
  {
    "id": "exp-2",
    "property_id": "prop-1",
    "unit_id": "unit-101",
    "scope": "Unit",
    "vendor_id": "ven-4",
    "category": "Appliances",
    "description": "Unit 101 dishwasher diagnostic & intake valve replacement",
    "amount": 220,
    "date": "2026-08-10",
    "payment_status": "Paid",
    "created_at": "2026-08-10T11:00:00Z",
    "updated_at": "2026-08-10T11:00:00Z"
  },
  {
    "id": "exp-3",
    "property_id": "prop-1",
    "scope": "Property",
    "vendor_id": "ven-6",
    "category": "Cleaning",
    "description": "Maple Heights common corridors carpet steam cleaning & sanitization",
    "amount": 890,
    "date": "2026-08-08",
    "payment_status": "Paid",
    "created_at": "2026-08-08T09:00:00Z",
    "updated_at": "2026-08-08T09:00:00Z"
  },
  {
    "id": "exp-4",
    "property_id": "prop-1",
    "scope": "Property",
    "category": "Insurance",
    "description": "Commercial property liability, equipment breakdown & fire insurance monthly premium",
    "amount": 1150,
    "date": "2026-08-01",
    "payment_status": "Paid",
    "created_at": "2026-08-01T08:00:00Z",
    "updated_at": "2026-08-01T08:00:00Z"
  },
  {
    "id": "exp-5",
    "property_id": "prop-2",
    "unit_id": "unit-201",
    "scope": "Unit",
    "vendor_id": "ven-2",
    "category": "Repairs & Maintenance",
    "description": "Unit 201 heat pump seasonal inspection & blower motor capacitor tune-up",
    "amount": 350,
    "date": "2026-08-18",
    "payment_status": "Paid",
    "created_at": "2026-08-18T10:00:00Z",
    "updated_at": "2026-08-18T10:00:00Z"
  },
  {
    "id": "exp-6",
    "property_id": "prop-2",
    "scope": "Property",
    "vendor_id": "ven-2",
    "category": "Utilities",
    "description": "Harbourview building HVAC central chiller cooling tower seasonal overhaul",
    "amount": 1450,
    "date": "2026-08-01",
    "payment_status": "Paid",
    "created_at": "2026-08-01T09:00:00Z",
    "updated_at": "2026-08-01T09:00:00Z"
  },
  {
    "id": "exp-7",
    "property_id": "prop-3",
    "unit_id": "unit-301",
    "scope": "Unit",
    "vendor_id": "ven-5",
    "category": "Repairs & Maintenance",
    "description": "Unit 301 balcony pest prevention barrier & insect nest removal",
    "amount": 180,
    "date": "2026-08-12",
    "payment_status": "Paid",
    "created_at": "2026-08-12T13:00:00Z",
    "updated_at": "2026-08-12T13:00:00Z"
  },
  {
    "id": "exp-8",
    "property_id": "prop-4",
    "unit_id": "unit-401",
    "scope": "Unit",
    "vendor_id": "ven-4",
    "category": "Repairs & Maintenance",
    "description": "Unit 401 electrical outlet replacement and breaker panel check",
    "amount": 275,
    "date": "2026-08-19",
    "payment_status": "Paid",
    "created_at": "2026-08-19T14:00:00Z",
    "updated_at": "2026-08-19T14:00:00Z"
  },
  {
    "id": "exp-9",
    "property_id": "prop-3",
    "scope": "Property",
    "category": "Property Taxes",
    "description": "City of Hamilton municipal property tax monthly installment",
    "amount": 1620,
    "date": "2026-08-01",
    "payment_status": "Paid",
    "created_at": "2026-08-01T00:00:00Z",
    "updated_at": "2026-08-01T00:00:00Z"
  }
];
