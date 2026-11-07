export interface UserPermissions {
  can_view_financials: boolean;
  can_manage_leases: boolean;
  can_dispatch_maintenance: boolean;
  can_issue_notices: boolean;
  can_edit_properties: boolean;
  can_trigger_automations: boolean;
}

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  permissions: UserPermissions;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type UserType = 'owner' | 'staff' | 'landlord' | 'tenant';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  is_owner: boolean;
  user_type: UserType;
  role_title?: string;
  role_template_id?: string;
  status?: 'Active' | 'Suspended';
  permissions: UserPermissions;
  assigned_properties: string[];
  created_at: string;
  updated_at: string;
}

export interface LandlordDelegate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  relationship: 'Legal Counsel / Lawyer' | 'Asset Manager' | 'Family Representative' | 'Accountant / Auditor' | 'Other';
  can_view_statements: boolean;
  can_approve_maintenance: boolean;
  can_modify_banking: boolean;
  status: 'Active' | 'Suspended';
  created_at: string;
}

export interface Landlord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  company_name?: string;
  bank_name?: string;
  bank_account_number?: string;
  management_fee_percentage: number;
  remittance_frequency: 'Monthly' | 'Quarterly' | 'Bi-Weekly';
  notes?: string;
  authorized_representatives?: LandlordDelegate[];
  created_at: string;
  updated_at: string;
}

export type PropertyType = 'Multi-Family' | 'Condominium' | 'Commercial' | 'Townhome' | 'Single-Family';
export type PropertyStatus = 'Active' | 'Under Maintenance' | 'Inactive';
export type AcquisitionType = 'Outright Purchase' | 'Long-Term Lease' | 'Financed / Mortgage';

export interface PropertyAcquisition {
  acquisition_type: AcquisitionType;
  acquisition_date: string;
  total_acquisition_cost: number;
  down_payment_or_deposit: number;
  lease_term_years?: number;
  monthly_lease_cost?: number;
  amortization_period_years: number;
  annual_depreciation_or_amort: number;
  interest_rate_percent?: number;
  notes?: string;
}

export type CurrencyCode = 'CAD' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'AED';

export interface Property {
  id: string;
  landlord_id?: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  property_type: PropertyType;
  units_count: number;
  status: PropertyStatus;
  acquisition?: PropertyAcquisition;
  created_at: string;
  updated_at: string;
}

export type UnitStatus = 'Occupied' | 'Vacant' | 'Notice Given' | 'Maintenance' | 'Reserved';

export type RentalModel = 'Long-Term' | 'Shortlet / STR' | 'Hybrid';

export interface ShortletBooking {
  id: string;
  unit_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in: string;
  check_out: string;
  nights_count: number;
  nightly_rate: number;
  cleaning_fee: number;
  platform_source: 'Direct' | 'Airbnb' | 'VRBO' | 'Booking.com';
  total_payout: number;
  booking_status: 'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled';
  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: string;
  bedrooms: number;
  bathrooms: number;
  monthly_rent: number;
  status: UnitStatus;
  rental_model?: RentalModel;
  nightly_rate?: number;
  cleaning_fee?: number;
  minimum_stay_nights?: number;
  current_occupancy_rate?: number;
  created_at: string;
  updated_at: string;
}

export type TenantStatus = 'Applicant' | 'Active' | 'Notice Given' | 'Former';

export interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: TenantStatus;
  created_at: string;
  updated_at: string;
}

export type LeaseStatus = 'Active' | 'Expiring Soon' | 'Renewal Pending' | 'Renewed' | 'Ended';
export type RenewalStatus = 'Pending Review' | 'Renewal Offered' | 'Tenant Accepted' | 'Tenant Declined' | 'Notice Sent';

export interface Lease {
  id: string;
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit: number;
  status: LeaseStatus;
  renewal_status: RenewalStatus;
  created_at: string;
  updated_at: string;
}

export type PaymentStatus = 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue';

export interface Payment {
  id: string;
  tenant_id: string;
  lease_id: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  payment_date?: string;
  status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export type VendorCategory = 'Plumbing' | 'Electrical' | 'HVAC' | 'General Maintenance' | 'Cleaning' | 'Landscaping' | 'Pest Control';
export type VendorStatus = 'Active' | 'Inactive' | 'Pending';

export interface Vendor {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  category: VendorCategory;
  service_area: string;
  status: VendorStatus;
  created_at: string;
  updated_at: string;
}

export type MaintenanceCategory = 'Plumbing' | 'Electrical' | 'HVAC' | 'Appliance' | 'Structural' | 'Pest' | 'General' | 'Other';
export type MaintenancePriority = 'Low' | 'Normal' | 'High' | 'Emergency';
export type MaintenanceStatus = 'New' | 'Assigned' | 'Vendor Accepted' | 'In Progress' | 'Awaiting Parts' | 'Completed' | 'Cancelled';

export interface MaintenanceRequest {
  id: string;
  tenant_id: string;
  unit_id: string;
  category: MaintenanceCategory;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  vendor_id?: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

export type BillStatus = 'Pending' | 'Due Soon' | 'Paid' | 'Overdue';

export interface Bill {
  id: string;
  property_id: string;
  unit_id?: string;
  vendor_id: string;
  bill_number: string;
  description: string;
  amount: number;
  due_date: string;
  payment_date?: string;
  status: BillStatus;
  category?: string;
  created_at: string;
  updated_at: string;
}

export type ExpenseCategory = 'Repairs & Maintenance' | 'Utilities' | 'Insurance' | 'Property Taxes' | 'Management' | 'Cleaning' | 'Appliances' | 'Other';
export type ExpenseScope = 'Unit' | 'Property';

export interface Expense {
  id: string;
  property_id: string;
  unit_id?: string;
  scope: ExpenseScope;
  vendor_id?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  payment_status: 'Paid' | 'Pending';
  created_at: string;
  updated_at: string;
}

export type NoticeType = 'Rent Increase (N1)' | 'Notice of Non-Payment (N4)' | 'Lease Renewal' | 'Lease End' | 'General Tenant Notice';
export type NoticeStatus = 'Draft' | 'Awaiting Review' | 'Approved' | 'Sent' | 'Archived';

export interface Notice {
  id: string;
  tenant_id: string;
  lease_id: string;
  notice_type: NoticeType;
  status: NoticeStatus;
  effective_date: string;
  amount?: number;
  content: string;
  approved_at?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export type CommunicationType = 'Email' | 'SMS' | 'System Alert' | 'Campaign';
export type CommunicationStatus = 'Queued' | 'Demo Sent' | 'Simulated' | 'Failed' | 'Draft';

export interface Communication {
  id: string;
  tenant_id?: string;
  recipient: string;
  subject: string;
  communication_type: CommunicationType;
  template: string;
  content_html: string;
  content_text: string;
  status: CommunicationStatus;
  related_entity_type?: string;
  related_entity_id?: string;
  sent_at?: string;
  created_at: string;
}

export type TriggerType = 'Scheduled Daily' | 'Scheduled Hourly' | 'Event Driven';

export interface AutomationRule {
  id: string;
  name: string;
  automation_type: string;
  description: string;
  enabled: boolean;
  trigger_type: TriggerType;
  trigger_config: Record<string, any>;
  action_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type RunStatus = 'Success' | 'Failed' | 'Partial Success' | 'Running';

export interface AutomationRun {
  id: string;
  automation_rule_id: string;
  status: RunStatus;
  started_at: string;
  completed_at?: string;
  records_processed: number;
  notifications_generated: number;
  errors: any[];
  created_at: string;
}

export type LogStatus = 'Success' | 'Failed' | 'Skipped' | 'Pending';

export interface AutomationLog {
  id: string;
  automation_run_id?: string;
  automation_type: string;
  entity_type: string;
  entity_id?: string;
  action: string;
  status: LogStatus;
  error?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export type TaskPriority = 'Low' | 'Normal' | 'High' | 'Urgent';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Dismissed';

export interface Task {
  id: string;
  assigned_to: string;
  task_type: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  created_at: string;
  updated_at: string;
}

export interface TenantApplicant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  employment: string;
  income: number;
  current_address: string;
  desired_property_id: string;
  desired_unit_id: string;
  status: 'Pending' | 'Submitted' | 'In Review' | 'Approved' | 'Declined';
  credit_score?: number;
  background_check?: 'Passed' | 'Pending' | 'Flagged';
  created_at: string;
}
