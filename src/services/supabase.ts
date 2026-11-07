import { createClient } from '@supabase/supabase-js';
import type {
  Property, Unit, Tenant, Lease, Payment, Vendor,
  MaintenanceRequest, Bill, Notice, Communication,
  AutomationRule, AutomationRun, AutomationLog, Task, TenantApplicant, Expense, ShortletBooking,
  CurrencyCode, Landlord, UserProfile, UserPermissions
} from '../types/database';

import {
  INITIAL_PROPERTIES, INITIAL_UNITS, INITIAL_TENANTS, INITIAL_LEASES,
  INITIAL_PAYMENTS, INITIAL_VENDORS, INITIAL_MAINTENANCE, INITIAL_BILLS,
  INITIAL_EXPENSES, INITIAL_NOTICES, INITIAL_COMMUNICATIONS, INITIAL_AUTOMATION_RULES,
  INITIAL_AUTOMATION_LOGS, INITIAL_TASKS, INITIAL_APPLICANTS
} from './mockData';

// Direct import of versioned JSON database stored in repository
import databaseJson from '../data/database.json';

// Supabase client instance (configured with Vite / Next environment variables)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL || 'https://gewcuxamglbbysddmfgu.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_6cPcqdQIbERtMcLQlMNpYw_Eqw6vs1G';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// LOCAL PERSISTENT STATE ENGINE SYNCHRONIZED WITH JSON DATABASE
const STORAGE_KEY = 'propertyflow_db_v5';

export interface DatabaseState {
  landlords: Landlord[];
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  payments: Payment[];
  vendors: Vendor[];
  maintenance_requests: MaintenanceRequest[];
  bills: Bill[];
  expenses: Expense[];
  notices: Notice[];
  communications: Communication[];
  automation_rules: AutomationRule[];
  automation_runs: AutomationRun[];
  automation_logs: AutomationLog[];
  tasks: Task[];
  applicants: TenantApplicant[];
  shortlet_bookings: ShortletBooking[];
  currency?: CurrencyCode;
}

const INITIAL_LANDLORDS: Landlord[] = [
  {
    id: 'landlord-1',
    first_name: 'David',
    last_name: 'Adeyemi',
    email: 'david.adeyemi@northstarholding.com',
    phone: '+234 803 111 2233',
    company_name: 'Adeyemi Asset Holdings Ltd',
    bank_name: 'First Bank Nigeria',
    bank_account_number: '3029182390',
    management_fee_percentage: 10.0,
    remittance_frequency: 'Monthly',
    notes: 'Primary owner for commercial boutique & Ikoyi residential portfolio.',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  },
  {
    id: 'landlord-2',
    first_name: 'Elena',
    last_name: 'Vasiliev',
    email: 'elena.vasiliev@torontocrest.ca',
    phone: '+1 416 555 0192',
    company_name: 'Crestwood Real Estate Trust',
    bank_name: 'TD Canada Trust',
    bank_account_number: '004-1829102',
    management_fee_percentage: 8.5,
    remittance_frequency: 'Monthly',
    notes: 'Master landlord for Maple Heights and Harbourview multi-family assets.',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z'
  }
];

function loadInitialState(): DatabaseState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.expenses && parsed.properties) {
        return {
          ...parsed,
          landlords: parsed.landlords || INITIAL_LANDLORDS
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
  }

  // Fallback to git-committed JSON database
  if (databaseJson && (databaseJson as any).properties) {
    const db = databaseJson as any;
    return {
      landlords: INITIAL_LANDLORDS,
      properties: db.properties || INITIAL_PROPERTIES,
      units: db.units || INITIAL_UNITS,
      tenants: db.tenants || INITIAL_TENANTS,
      leases: db.leases || INITIAL_LEASES,
      payments: db.payments || INITIAL_PAYMENTS,
      vendors: db.vendors || INITIAL_VENDORS,
      maintenance_requests: db.maintenance_requests || INITIAL_MAINTENANCE,
      bills: db.bills || INITIAL_BILLS,
      expenses: db.expenses || INITIAL_EXPENSES,
      notices: db.notices || INITIAL_NOTICES,
      communications: db.communications || INITIAL_COMMUNICATIONS,
      automation_rules: db.automation_rules || INITIAL_AUTOMATION_RULES,
      automation_runs: db.automation_runs || [],
      automation_logs: db.automation_logs || INITIAL_AUTOMATION_LOGS,
      tasks: db.tasks || INITIAL_TASKS,
      applicants: db.applicants || INITIAL_APPLICANTS,
      shortlet_bookings: db.shortlet_bookings || [],
      currency: db.currency || 'CAD'
    };
  }

  return {
    landlords: INITIAL_LANDLORDS,
    properties: INITIAL_PROPERTIES,
    units: INITIAL_UNITS,
    tenants: INITIAL_TENANTS,
    leases: INITIAL_LEASES,
    payments: INITIAL_PAYMENTS,
    vendors: INITIAL_VENDORS,
    maintenance_requests: INITIAL_MAINTENANCE,
    bills: INITIAL_BILLS,
    expenses: INITIAL_EXPENSES,
    notices: INITIAL_NOTICES,
    communications: INITIAL_COMMUNICATIONS,
    automation_rules: INITIAL_AUTOMATION_RULES,
    automation_runs: [],
    automation_logs: INITIAL_AUTOMATION_LOGS,
    tasks: INITIAL_TASKS,
    applicants: INITIAL_APPLICANTS,
    shortlet_bookings: [],
    currency: 'CAD'
  };
}

class StoreManager {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = loadInitialState();
    this.syncFromSupabase();
  }

  async syncFromSupabase() {
    try {
      const [
        { data: props },
        { data: units },
        { data: tenants },
        { data: leases },
        { data: payments },
        { data: vendors },
        { data: maint },
        { data: bills },
        { data: expenses },
        { data: landlords }
      ] = await Promise.all([
        supabase.from('properties').select('*'),
        supabase.from('units').select('*'),
        supabase.from('tenants').select('*'),
        supabase.from('leases').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('vendors').select('*'),
        supabase.from('maintenance_requests').select('*'),
        supabase.from('bills').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('landlords').select('*')
      ]);

      if (props && props.length > 0) this.state.properties = props as any;
      if (units && units.length > 0) this.state.units = units as any;
      if (tenants && tenants.length > 0) this.state.tenants = tenants as any;
      if (leases && leases.length > 0) this.state.leases = leases as any;
      if (payments && payments.length > 0) this.state.payments = payments as any;
      if (vendors && vendors.length > 0) this.state.vendors = vendors as any;
      if (maint && maint.length > 0) this.state.maintenance_requests = maint as any;
      if (bills && bills.length > 0) this.state.bills = bills as any;
      if (expenses && expenses.length > 0) this.state.expenses = expenses as any;
      if (landlords && landlords.length > 0) this.state.landlords = landlords as any;

      this.saveState();
    } catch (e) {
      console.warn('Supabase remote sync fallback to local storage:', e);
    }
  }

  getState(): DatabaseState {
    return this.state;
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to persist state', e);
    }
    this.notify();
  }

  resetDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    this.state = {
      landlords: INITIAL_LANDLORDS,
      properties: INITIAL_PROPERTIES,
      units: INITIAL_UNITS,
      tenants: INITIAL_TENANTS,
      leases: INITIAL_LEASES,
      payments: INITIAL_PAYMENTS,
      vendors: INITIAL_VENDORS,
      maintenance_requests: INITIAL_MAINTENANCE,
      bills: INITIAL_BILLS,
      expenses: INITIAL_EXPENSES,
      notices: INITIAL_NOTICES,
      communications: INITIAL_COMMUNICATIONS,
      automation_rules: INITIAL_AUTOMATION_RULES,
      automation_runs: [],
      automation_logs: INITIAL_AUTOMATION_LOGS,
      tasks: INITIAL_TASKS,
      applicants: INITIAL_APPLICANTS,
      shortlet_bookings: []
    };
    this.saveState();
  }

  exportJsonDatabase(): string {
    return JSON.stringify({
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      ...this.state
    }, null, 2);
  }

  importJsonDatabase(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.properties && Array.isArray(parsed.properties)) {
        this.state = {
          landlords: parsed.landlords || INITIAL_LANDLORDS,
          properties: parsed.properties,
          units: parsed.units || [],
          tenants: parsed.tenants || [],
          leases: parsed.leases || [],
          payments: parsed.payments || [],
          vendors: parsed.vendors || [],
          maintenance_requests: parsed.maintenance_requests || [],
          bills: parsed.bills || [],
          expenses: parsed.expenses || [],
          notices: parsed.notices || [],
          communications: parsed.communications || [],
          automation_rules: parsed.automation_rules || [],
          automation_runs: parsed.automation_runs || [],
          automation_logs: parsed.automation_logs || [],
          tasks: parsed.tasks || [],
          applicants: parsed.applicants || [],
          shortlet_bookings: parsed.shortlet_bookings || []
        };
        this.saveState();
        return true;
      }
    } catch (err) {
      console.error('Failed to import JSON database', err);
    }
    return false;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- ENTITY MUTATORS ---
  addExpense(expense: Expense) {
    this.state.expenses.unshift(expense);
    this.saveState();
  }

  deleteExpense(expenseId: string) {
    this.state.expenses = this.state.expenses.filter(e => e.id !== expenseId);
    this.saveState();
  }

  addBill(bill: Bill) {
    this.state.bills.unshift(bill);
    // Also auto-record as an expense for immediate financial accounting
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      property_id: bill.property_id,
      unit_id: bill.unit_id,
      scope: bill.unit_id ? 'Unit' : 'Property',
      vendor_id: bill.vendor_id,
      category: (bill.category as any) || 'Repairs & Maintenance',
      description: bill.description,
      amount: bill.amount,
      date: bill.created_at.split('T')[0] || new Date().toISOString().split('T')[0],
      payment_status: bill.status === 'Paid' ? 'Paid' : 'Pending',
      created_at: bill.created_at,
      updated_at: bill.updated_at
    };
    this.state.expenses.unshift(newExpense);
    this.saveState();
  }

  addCommunication(comm: Communication) {
    this.state.communications.unshift(comm);
    this.saveState();
  }

  addAutomationLog(log: AutomationLog) {
    this.state.automation_logs.unshift(log);
    this.saveState();
  }

  addTask(task: Task) {
    this.state.tasks.unshift(task);
    this.saveState();
  }

  updateTask(taskId: string, updates: Partial<Task>) {
    this.state.tasks = this.state.tasks.map(t => t.id === taskId ? { ...t, ...updates, updated_at: new Date().toISOString() } : t);
    this.saveState();
  }

  addMaintenanceRequest(maint: MaintenanceRequest) {
    this.state.maintenance_requests.unshift(maint);
    this.saveState();
  }

  updateMaintenanceRequest(id: string, updates: Partial<MaintenanceRequest>) {
    this.state.maintenance_requests = this.state.maintenance_requests.map(m => m.id === id ? { ...m, ...updates, updated_at: new Date().toISOString() } : m);
    this.saveState();
  }

  addNotice(notice: Notice) {
    this.state.notices.unshift(notice);
    this.saveState();
  }

  updateNotice(id: string, updates: Partial<Notice>) {
    this.state.notices = this.state.notices.map(n => n.id === id ? { ...n, ...updates, updated_at: new Date().toISOString() } : n);
    this.saveState();
  }

  updatePayment(id: string, updates: Partial<Payment>) {
    this.state.payments = this.state.payments.map(p => p.id === id ? { ...p, ...updates, updated_at: new Date().toISOString() } : p);
    this.saveState();
  }

  updateApplicant(id: string, updates: Partial<TenantApplicant>) {
    this.state.applicants = this.state.applicants.map(a => a.id === id ? { ...a, ...updates } : a);
    this.saveState();
  }

  addApplicant(applicant: TenantApplicant) {
    this.state.applicants.unshift(applicant);
    this.saveState();
  }

  addShortletBooking(booking: ShortletBooking) {
    if (!this.state.shortlet_bookings) this.state.shortlet_bookings = [];
    this.state.shortlet_bookings.unshift(booking);
    this.saveState();
  }

  addProperty(property: Property) {
    this.state.properties.unshift(property);
    this.saveState();
  }

  addUnit(unit: Unit) {
    this.state.units.unshift(unit);
    // Also update parent property units_count if present
    const property = this.state.properties.find(p => p.id === unit.property_id);
    if (property) {
      property.units_count = (property.units_count || 0) + 1;
      property.updated_at = new Date().toISOString();
    }
    this.saveState();
  }

  updateUnit(unitId: string, updates: Partial<Unit>) {
    this.state.units = this.state.units.map(u => u.id === unitId ? { ...u, ...updates, updated_at: new Date().toISOString() } : u);
    this.saveState();
  }

  updatePropertyAcquisition(propertyId: string, acquisition: any) {
    this.state.properties = this.state.properties.map(p => 
      p.id === propertyId ? { ...p, acquisition, updated_at: new Date().toISOString() } : p
    );
    this.saveState();
  }

  updateRule(id: string, updates: Partial<AutomationRule>) {
    this.state.automation_rules = this.state.automation_rules.map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r);
    this.saveState();
  }

  setCurrency(currency: CurrencyCode) {
    this.state.currency = currency;
    this.saveState();
  }
}

export const store = new StoreManager();
