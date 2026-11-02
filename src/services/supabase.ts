import { createClient } from '@supabase/supabase-js';
import type {
  Property, Unit, Tenant, Lease, Payment, Vendor,
  MaintenanceRequest, Bill, Notice, Communication,
  AutomationRule, AutomationRun, AutomationLog, Task, TenantApplicant
} from '../types/database';

import {
  INITIAL_PROPERTIES, INITIAL_UNITS, INITIAL_TENANTS, INITIAL_LEASES,
  INITIAL_PAYMENTS, INITIAL_VENDORS, INITIAL_MAINTENANCE, INITIAL_BILLS,
  INITIAL_NOTICES, INITIAL_COMMUNICATIONS, INITIAL_AUTOMATION_RULES,
  INITIAL_AUTOMATION_LOGS, INITIAL_TASKS, INITIAL_APPLICANTS
} from './mockData';

// Supabase client instance (with public demo fallback keys)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://northstar-demo.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// LOCAL PERSISTENT STATE ENGINE FOR STANDALONE DEMO EXECUTION
const STORAGE_KEY = 'propertyflow_db_v1';

export interface DatabaseState {
  properties: Property[];
  units: Unit[];
  tenants: Tenant[];
  leases: Lease[];
  payments: Payment[];
  vendors: Vendor[];
  maintenance_requests: MaintenanceRequest[];
  bills: Bill[];
  notices: Notice[];
  communications: Communication[];
  automation_rules: AutomationRule[];
  automation_runs: AutomationRun[];
  automation_logs: AutomationLog[];
  tasks: Task[];
  applicants: TenantApplicant[];
}

function loadInitialState(): DatabaseState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
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
    notices: INITIAL_NOTICES,
    communications: INITIAL_COMMUNICATIONS,
    automation_rules: INITIAL_AUTOMATION_RULES,
    automation_runs: [],
    automation_logs: INITIAL_AUTOMATION_LOGS,
    tasks: INITIAL_TASKS,
    applicants: INITIAL_APPLICANTS
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
      notices: INITIAL_NOTICES,
      communications: INITIAL_COMMUNICATIONS,
      automation_rules: INITIAL_AUTOMATION_RULES,
      automation_runs: [],
      automation_logs: INITIAL_AUTOMATION_LOGS,
      tasks: INITIAL_TASKS,
      applicants: INITIAL_APPLICANTS
    };
    this.saveState();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  // --- ENTITY MUTATORS ---
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

  updateRule(id: string, updates: Partial<AutomationRule>) {
    this.state.automation_rules = this.state.automation_rules.map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r);
    this.saveState();
  }
}

export const store = new StoreManager();
