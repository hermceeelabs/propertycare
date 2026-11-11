import { createClient } from '@supabase/supabase-js';
import type {
  Property, Unit, Tenant, Lease, Payment, Vendor,
  MaintenanceRequest, Bill, Notice, Communication,
  AutomationRule, AutomationRun, AutomationLog, Task, TenantApplicant, Expense, ShortletBooking,
  CurrencyCode, Landlord, UserProfile, UserPermissions, PropertyInspection
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
const STORAGE_KEY = 'propertyflow_db_v10';

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
  inspections?: PropertyInspection[];
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
  // Always initialize from the canonical versioned database first (Database is Single Source of Truth)
  const canonicalDb = (databaseJson as any)?.properties ? (databaseJson as any) : null;
  const baseState: DatabaseState = {
    landlords: canonicalDb?.landlords || INITIAL_LANDLORDS,
    properties: canonicalDb?.properties || INITIAL_PROPERTIES,
    units: canonicalDb?.units || INITIAL_UNITS,
    tenants: canonicalDb?.tenants || INITIAL_TENANTS,
    leases: canonicalDb?.leases || INITIAL_LEASES,
    payments: canonicalDb?.payments || INITIAL_PAYMENTS,
    vendors: canonicalDb?.vendors || INITIAL_VENDORS,
    maintenance_requests: canonicalDb?.maintenance_requests || INITIAL_MAINTENANCE,
    bills: canonicalDb?.bills || INITIAL_BILLS,
    expenses: canonicalDb?.expenses || INITIAL_EXPENSES,
    notices: canonicalDb?.notices || INITIAL_NOTICES,
    communications: canonicalDb?.communications || INITIAL_COMMUNICATIONS,
    automation_rules: canonicalDb?.automation_rules || INITIAL_AUTOMATION_RULES,
    automation_runs: canonicalDb?.automation_runs || [],
    automation_logs: canonicalDb?.automation_logs || INITIAL_AUTOMATION_LOGS,
    tasks: canonicalDb?.tasks || INITIAL_TASKS,
    applicants: canonicalDb?.applicants || INITIAL_APPLICANTS,
    shortlet_bookings: canonicalDb?.shortlet_bookings || [],
    inspections: canonicalDb?.inspections || [],
    currency: canonicalDb?.currency || 'CAD'
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Only overlay user runtime modifications if they align with the canonical property registry
      if (parsed && Array.isArray(parsed.properties) && parsed.properties.length >= baseState.properties.length) {
        return {
          ...baseState,
          ...parsed,
          properties: parsed.properties.map((pp: Property) => {
            const baseProp = baseState.properties.find(bp => bp.id === pp.id);
            return {
              ...(baseProp || pp),
              ...pp,
              landlord_id: pp.landlord_id ?? baseProp?.landlord_id,
              landlord_contract: pp.landlord_contract || baseProp?.landlord_contract
            };
          }),
          landlords: parsed.landlords || baseState.landlords
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
  }

  return baseState;
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

      // Merge properties: preserve local landlord_contract & acquisition fields
      const jsonProps: Property[] = (databaseJson as any)?.properties || [];
      if (props && props.length > 0) {
        this.state.properties = (props as any[]).map(remoteProp => {
          const match = jsonProps.find(jp => jp.id === remoteProp.id);
          return {
            ...remoteProp,
            landlord_contract: remoteProp.landlord_contract || match?.landlord_contract,
            acquisition: remoteProp.acquisition || match?.acquisition,
            ownership_type: remoteProp.ownership_type || match?.ownership_type,
            business_model: remoteProp.business_model || match?.business_model
          };
        });
      } else {
        this.state.properties = jsonProps;
      }

      // Merge units: preserve local management_fee_percentage & rental_model
      const jsonUnits: Unit[] = (databaseJson as any)?.units || [];
      if (units && units.length > 0) {
        this.state.units = (units as any[]).map(remoteUnit => {
          const match = jsonUnits.find(ju => ju.id === remoteUnit.id);
          return {
            ...remoteUnit,
            management_fee_percentage: remoteUnit.management_fee_percentage ?? match?.management_fee_percentage,
            rental_model: remoteUnit.rental_model || match?.rental_model || 'Long-Term',
            nightly_rate: remoteUnit.nightly_rate ?? match?.nightly_rate,
            cleaning_fee: remoteUnit.cleaning_fee ?? match?.cleaning_fee
          };
        });
      } else {
        this.state.units = jsonUnits;
      }

      // Merge tenants: preserve local tenants
      const jsonTenants: Tenant[] = (databaseJson as any)?.tenants || [];
      if (tenants && tenants.length > 0) {
        const remoteIds = new Set((tenants as any[]).map(t => t.id));
        const missingTenants = jsonTenants.filter(t => !remoteIds.has(t.id));
        this.state.tenants = [...(tenants as any[]), ...missingTenants];
      } else {
        this.state.tenants = jsonTenants;
      }
      
      // Merge leases: preserve versioned local leases (e.g. shortlet & updated leases)
      const jsonLeases: Lease[] = (databaseJson as any)?.leases || [];
      if (leases && leases.length > 0) {
        const remoteIds = new Set((leases as any[]).map(l => l.id));
        const missingJsonLeases = jsonLeases.filter(l => !remoteIds.has(l.id));
        this.state.leases = [...(leases as any[]), ...missingJsonLeases];
      } else {
        this.state.leases = jsonLeases;
      }

      // Merge payments: preserve canonical October & November 2026 records
      const jsonPayments: Payment[] = (databaseJson as any)?.payments || [];
      if (payments && payments.length > 0) {
        const remoteIds = new Set((payments as any[]).map(p => p.id));
        const missingJsonPayments = jsonPayments.filter(p => !remoteIds.has(p.id));
        this.state.payments = [...(payments as any[]), ...missingJsonPayments];
      } else {
        this.state.payments = jsonPayments;
      }

      if (vendors && vendors.length > 0) this.state.vendors = vendors as any;
      
      // Merge maintenance requests: preserve canonical local requests and attachments
      const jsonMaint: MaintenanceRequest[] = (databaseJson as any)?.maintenance_requests || [];
      if (maint && maint.length > 0) {
        const remoteIds = new Set((maint as any[]).map(m => m.id));
        const enrichedRemoteMaint = (maint as any[]).map(remoteM => {
          const match = jsonMaint.find(jm => jm.id === remoteM.id);
          return {
            ...remoteM,
            property_id: remoteM.property_id || match?.property_id,
            title: remoteM.title || match?.title,
            vendor_id: remoteM.vendor_id || match?.vendor_id,
            estimated_cost: remoteM.estimated_cost ?? match?.estimated_cost,
            actual_cost: remoteM.actual_cost ?? match?.actual_cost,
            resolution_notes: remoteM.resolution_notes || match?.resolution_notes,
            attachments: (Array.isArray(remoteM.attachments) && remoteM.attachments.length > 0)
              ? remoteM.attachments
              : (match?.attachments || [])
          };
        });
        const missingJsonMaint = jsonMaint.filter(m => !remoteIds.has(m.id));
        this.state.maintenance_requests = [...enrichedRemoteMaint, ...missingJsonMaint];
      } else {
        this.state.maintenance_requests = jsonMaint;
      }

      if (bills && bills.length > 0) this.state.bills = bills as any;
      
      // Merge expenses: remote rows + local JSON expenses (e.g. Oct/Nov records)
      const jsonExpenses: any[] = (databaseJson as any)?.expenses || [];
      if (expenses && expenses.length > 0) {
        const remoteIds = new Set((expenses as any[]).map(e => e.id));
        const enrichedRemote = (expenses as any[]).map(remoteExp => {
          const match = jsonExpenses.find(j => j.id === remoteExp.id);
          return {
            ...remoteExp,
            proofs: match?.proofs || remoteExp.proofs || [],
            invoice_number: match?.invoice_number || remoteExp.invoice_number,
            receipt_url: match?.receipt_url || remoteExp.receipt_url,
            share_with_landlord: match?.share_with_landlord ?? true
          };
        });
        const missingJsonExpenses = jsonExpenses.filter(e => !remoteIds.has(e.id));
        this.state.expenses = [...enrichedRemote, ...missingJsonExpenses];
      } else {
        this.state.expenses = jsonExpenses;
      }

      if (landlords && landlords.length > 0) this.state.landlords = landlords as any;

      // Ensure inspections are populated from versioned dataset if remote table is not configured
      const jsonInspections: PropertyInspection[] = (databaseJson as any)?.inspections || [];
      if (!this.state.inspections || this.state.inspections.length === 0) {
        this.state.inspections = jsonInspections;
      } else {
        const currentIds = new Set(this.state.inspections.map(i => i.id));
        const missingJsonInsp = jsonInspections.filter(i => !currentIds.has(i.id));
        this.state.inspections = [...this.state.inspections, ...missingJsonInsp];
      }

      // Ensure shortlet bookings are populated and preserved
      const jsonShortlets: ShortletBooking[] = (databaseJson as any)?.shortlet_bookings || [];
      if (!this.state.shortlet_bookings || this.state.shortlet_bookings.length === 0) {
        this.state.shortlet_bookings = jsonShortlets;
      } else {
        const currentIds = new Set(this.state.shortlet_bookings.map(b => b.id));
        const missingShortlets = jsonShortlets.filter(b => !currentIds.has(b.id));
        this.state.shortlet_bookings = [...this.state.shortlet_bookings, ...missingShortlets];
      }

      // Ensure notices and communications are populated and preserved
      const jsonNotices: Notice[] = (databaseJson as any)?.notices || [];
      if (!this.state.notices || this.state.notices.length === 0) {
        this.state.notices = jsonNotices;
      } else {
        const currentIds = new Set(this.state.notices.map(n => n.id));
        const missingNotices = jsonNotices.filter(n => !currentIds.has(n.id));
        this.state.notices = [...this.state.notices, ...missingNotices];
      }

      const jsonComms: Communication[] = (databaseJson as any)?.communications || [];
      if (!this.state.communications || this.state.communications.length === 0) {
        this.state.communications = jsonComms;
      } else {
        const currentIds = new Set(this.state.communications.map(c => c.id));
        const missingComms = jsonComms.filter(c => !currentIds.has(c.id));
        this.state.communications = [...this.state.communications, ...missingComms];
      }

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

  addInspection(inspection: PropertyInspection) {
    if (!this.state.inspections) this.state.inspections = [];
    this.state.inspections.unshift(inspection);
    this.saveState();
  }

  updateInspection(id: string, updates: Partial<PropertyInspection>) {
    if (!this.state.inspections) this.state.inspections = [];
    this.state.inspections = this.state.inspections.map(i => i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i);
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

  async updateTenant(id: string, updates: Partial<Tenant>) {
    const updated_at = new Date().toISOString();
    this.state.tenants = this.state.tenants.map(t =>
      t.id === id ? { ...t, ...updates, updated_at } : t
    );
    this.saveState();

    // Async push to Supabase PostgreSQL database
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          ...updates,
          updated_at
        })
        .eq('id', id);

      if (error) {
        console.error('Failed to sync tenant update to Supabase:', error);
      }
    } catch (err) {
      console.error('Error persisting tenant to Supabase:', err);
    }
  }

  async updateUnit(unitId: string, updates: Partial<Unit>, reason?: string, changedBy?: string) {
    const updated_at = new Date().toISOString();
    let updatedPriceHistory: any[] = [];

    this.state.units = this.state.units.map(u => {
      if (u.id !== unitId) return u;

      const priceHistory = [...(u.price_history || [])];

      // Track monthly_rent price change
      if (updates.monthly_rent !== undefined && updates.monthly_rent !== u.monthly_rent) {
        priceHistory.unshift({
          id: `ph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          unit_id: unitId,
          field_changed: 'monthly_rent',
          old_price: u.monthly_rent,
          new_price: updates.monthly_rent,
          reason: reason || 'Standard rent rate adjustment',
          changed_by: changedBy || 'Admin Management',
          effective_date: new Date().toISOString().split('T')[0],
          created_at: updated_at
        });
      }

      // Track nightly_rate price change for Shortlet
      if (updates.nightly_rate !== undefined && updates.nightly_rate !== u.nightly_rate) {
        priceHistory.unshift({
          id: `ph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          unit_id: unitId,
          field_changed: 'nightly_rate',
          old_price: u.nightly_rate || 0,
          new_price: updates.nightly_rate,
          reason: reason || 'Shortlet seasonal rate adjustment',
          changed_by: changedBy || 'Admin Management',
          effective_date: new Date().toISOString().split('T')[0],
          created_at: updated_at
        });
      }

      updatedPriceHistory = priceHistory;

      return {
        ...u,
        ...updates,
        price_history: priceHistory,
        updated_at
      };
    });
    this.saveState();

    // Async push to Supabase PostgreSQL database
    try {
      await supabase
        .from('units')
        .update({
          ...updates,
          updated_at
        })
        .eq('id', unitId);
    } catch (err) {
      console.error('Error persisting unit to Supabase:', err);
    }
  }

  updatePropertyAcquisition(propertyId: string, acquisition: any, managementFeePercentage?: number, applyCommissionToAllUnits?: boolean) {
    const updated_at = new Date().toISOString();
    this.state.properties = this.state.properties.map(p => {
      if (p.id !== propertyId) return p;
      const updatedContract = {
        ...(p.landlord_contract || {
          lease_type: p.business_model || 'Direct Management',
          payment_structure: 'Monthly' as const,
          duration_months: 12,
          start_date: '2026-01-01',
          end_date: '2026-12-31'
        }),
        ...(managementFeePercentage !== undefined ? { management_fee_percentage: managementFeePercentage } : {})
      };
      return {
        ...p,
        acquisition,
        landlord_contract: updatedContract as any,
        updated_at
      };
    });

    if (applyCommissionToAllUnits && managementFeePercentage !== undefined) {
      this.state.units = this.state.units.map(u =>
        u.property_id === propertyId
          ? { ...u, management_fee_percentage: managementFeePercentage, updated_at }
          : u
      );
    }

    this.saveState();
  }

  updateRule(id: string, updates: Partial<AutomationRule>) {
    this.state.automation_rules = this.state.automation_rules.map(r => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r);
    this.saveState();
  }

  async addLandlord(landlord: Landlord) {
    if (!this.state.landlords) this.state.landlords = [];
    this.state.landlords.unshift(landlord);
    this.saveState();

    try {
      await supabase.from('landlords').insert(landlord);
    } catch (err) {
      console.error('Error persisting landlord insert to Supabase:', err);
    }
  }

  async updateLandlord(id: string, updates: Partial<Landlord>) {
    const updated_at = new Date().toISOString();
    if (!this.state.landlords) this.state.landlords = [];
    this.state.landlords = this.state.landlords.map(l => 
      l.id === id ? { ...l, ...updates, updated_at } : l
    );
    this.saveState();

    try {
      await supabase
        .from('landlords')
        .update({
          ...updates,
          updated_at
        })
        .eq('id', id);
    } catch (err) {
      console.error('Error persisting landlord update to Supabase:', err);
    }
  }

  setCurrency(currency: CurrencyCode) {
    this.state.currency = currency;
    this.saveState();
  }
}

export const store = new StoreManager();
