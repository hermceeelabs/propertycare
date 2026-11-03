import { createClient } from '@supabase/supabase-js';
import type {
  Property, Unit, Tenant, Lease, Payment, Vendor,
  MaintenanceRequest, Bill, Notice, Communication,
  AutomationRule, AutomationRun, AutomationLog, Task, TenantApplicant, Expense, ShortletBooking
} from '../types/database';

import {
  INITIAL_PROPERTIES, INITIAL_UNITS, INITIAL_TENANTS, INITIAL_LEASES,
  INITIAL_PAYMENTS, INITIAL_VENDORS, INITIAL_MAINTENANCE, INITIAL_BILLS,
  INITIAL_EXPENSES, INITIAL_NOTICES, INITIAL_COMMUNICATIONS, INITIAL_AUTOMATION_RULES,
  INITIAL_AUTOMATION_LOGS, INITIAL_TASKS, INITIAL_APPLICANTS
} from './mockData';

// Direct import of versioned JSON database stored in repository
import databaseJson from '../data/database.json';

// Supabase client instance (with public demo fallback keys)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://demo.propertyflow.app';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// LOCAL PERSISTENT STATE ENGINE SYNCHRONIZED WITH JSON DATABASE
const STORAGE_KEY = 'propertyflow_db_v4';

export interface DatabaseState {
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
}

function loadInitialState(): DatabaseState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.expenses && parsed.properties) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
  }

  // Fallback to git-committed JSON database
  if (databaseJson && (databaseJson as any).properties) {
    const db = databaseJson as any;
    return {
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
      shortlet_bookings: db.shortlet_bookings || []
    };
  }

  return {
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
}

class StoreManager {
  private state: DatabaseState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = loadInitialState();
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
}

export const store = new StoreManager();
