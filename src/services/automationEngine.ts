import { store } from './supabase';
import { emailProvider } from './emailService';
import { createN4NoticeDraft } from './noticeService';
import type { AutomationLog, Task } from '../types/database';

export interface ExecutionResult {
  automationName: string;
  recordsProcessed: number;
  notificationsGenerated: number;
  emailsCreated: number;
  skipped: number;
  errors: number;
  details: string[];
}

export class AutomationEngine {
  /**
   * Executable Rent Reminder Automation
   */
  static async runRentReminderAutomation(): Promise<ExecutionResult> {
    const state = store.getState();
    const payments = state.payments;
    const tenantsMap = new Map(state.tenants.map(t => [t.id, t]));
    const unitsMap = new Map(state.units.map(u => [u.id, u]));
    const propertiesMap = new Map(state.properties.map(p => [p.id, p]));
    const leasesMap = new Map(state.leases.map(l => [l.id, l]));

    let recordsProcessed = 0;
    let notificationsGenerated = 0;
    let emailsCreated = 0;
    let skipped = 0;
    let errors = 0;
    const details: string[] = [];

    const today = new Date();

    for (const payment of payments) {
      recordsProcessed++;
      const tenant = tenantsMap.get(payment.tenant_id);
      const lease = leasesMap.get(payment.lease_id);
      const unit = lease ? unitsMap.get(lease.unit_id) : undefined;
      const property = unit ? propertiesMap.get(unit.property_id) : undefined;

      if (!tenant || !unit || !property) {
        skipped++;
        continue;
      }

      const dueDate = new Date(payment.due_date);
      const diffTime = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

      // CASE 1: Overdue Payment
      if (payment.status === 'Overdue' || (payment.status === 'Pending' && diffDays > 0)) {
        const balance = payment.amount_due - payment.amount_paid;
        
        const subject = `OVERDUE RENT REMINDER: Unit ${unit.unit_number} (${property.name})`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e3a8a;">PropertyFlow Management</h2>
            <p>Dear ${tenant.first_name} ${tenant.last_name},</p>
            <p>Our records indicate an outstanding rent balance of <strong>$${balance.toFixed(2)} CAD</strong> for <strong>Unit ${unit.unit_number} at ${property.name}</strong> (Due Date: ${payment.due_date}).</p>
            <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0;">
              <strong>Balance Due: $${balance.toFixed(2)} CAD</strong><br/>
              <span style="font-size: 13px; color: #991b1b;">Account is currently ${diffDays} days past due.</span>
            </div>
            <p>Please send an Interac e-Transfer to <strong>payments@propertyflow.app</strong> or contact your property manager immediately.</p>
            <p style="font-size: 12px; color: #64748b;">PropertyFlow Operations Center | Demo Email Abstraction</p>
          </div>
        `;

        const comm = await emailProvider.sendEmail({
          to: tenant.email,
          subject,
          html,
          text: `Overdue rent reminder for Unit ${unit.unit_number}. Outstanding balance: $${balance}.`,
          template: 'Rent Overdue Reminder',
          tenant_id: tenant.id,
          related_entity_type: 'Payment',
          related_entity_id: payment.id
        });

        store.addCommunication(comm);
        notificationsGenerated++;
        emailsCreated++;

        const log: AutomationLog = {
          id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          automation_type: 'rent_reminder',
          entity_type: 'Payment',
          entity_id: payment.id,
          action: `Delivered overdue rent reminder to ${tenant.first_name} ${tenant.last_name} ($${balance.toFixed(2)} CAD)`,
          status: 'Success',
          metadata: { days_overdue: diffDays, recipient: tenant.email },
          created_at: new Date().toISOString()
        };
        store.addAutomationLog(log);
        details.push(`Sent overdue reminder to ${tenant.first_name} ${tenant.last_name} (${diffDays} days overdue)`);

        // Escalation task at 7 days overdue
        if (diffDays >= 7) {
          const newTask: Task = {
            id: 'task-' + Date.now(),
            assigned_to: 'Property Manager',
            task_type: 'Overdue Rent Escalation',
            title: `Escalation: Overdue Rent for ${tenant.first_name} ${tenant.last_name}`,
            description: `Account for Unit ${unit.unit_number} at ${property.name} is ${diffDays} days overdue ($${balance.toFixed(2)} CAD). Automated emails delivered. Manager call required.`,
            priority: 'High',
            status: 'Pending',
            due_date: new Date().toISOString().split('T')[0],
            related_entity_type: 'Payment',
            related_entity_id: payment.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          store.addTask(newTask);
          details.push(`Created manager escalation task for ${tenant.first_name} ${tenant.last_name}`);
        }
      } else {
        skipped++;
      }
    }

    return {
      automationName: 'Rent Reminder & Escalation Automation',
      recordsProcessed,
      notificationsGenerated,
      emailsCreated,
      skipped,
      errors,
      details
    };
  }

  /**
   * Executable Lease Expiration Automation
   */
  static async runLeaseExpirationAutomation(): Promise<ExecutionResult> {
    const state = store.getState();
    const leases = state.leases;
    const tenantsMap = new Map(state.tenants.map(t => [t.id, t]));
    const unitsMap = new Map(state.units.map(u => [u.id, u]));
    const propertiesMap = new Map(state.properties.map(p => [p.id, p]));

    let recordsProcessed = 0;
    let notificationsGenerated = 0;
    let emailsCreated = 0;
    let skipped = 0;
    let errors = 0;
    const details: string[] = [];

    const today = new Date();

    for (const lease of leases) {
      recordsProcessed++;
      if (lease.status === 'Ended' || lease.status === 'Renewed') {
        skipped++;
        continue;
      }

      const tenant = tenantsMap.get(lease.tenant_id);
      const unit = unitsMap.get(lease.unit_id);
      const property = unit ? propertiesMap.get(unit.property_id) : undefined;

      if (!tenant || !unit || !property) {
        skipped++;
        continue;
      }

      const endDate = new Date(lease.end_date);
      const diffTime = endDate.getTime() - today.getTime();
      const daysRemaining = Math.ceil(diffTime / (1000 * 3600 * 24));

      if (daysRemaining <= 90 && daysRemaining > 0) {
        const subject = `LEASE RENEWAL NOTICE: Unit ${unit.unit_number} (${property.name})`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e3a8a;">PropertyFlow Management</h2>
            <p>Dear ${tenant.first_name} ${tenant.last_name},</p>
            <p>Your current lease for <strong>Unit ${unit.unit_number} at ${property.name}</strong> will expire on <strong>${lease.end_date}</strong> (${daysRemaining} days remaining).</p>
            <p>We invite you to review lease renewal terms for the upcoming year.</p>
            <p style="font-size: 12px; color: #64748b;">PropertyFlow Lease Operations Division</p>
          </div>
        `;

        const comm = await emailProvider.sendEmail({
          to: tenant.email,
          subject,
          html,
          text: `Lease renewal reminder for Unit ${unit.unit_number}. Lease expires on ${lease.end_date}.`,
          template: 'Lease Renewal Reminder',
          tenant_id: tenant.id,
          related_entity_type: 'Lease',
          related_entity_id: lease.id
        });

        store.addCommunication(comm);
        notificationsGenerated++;
        emailsCreated++;

        const log: AutomationLog = {
          id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          automation_type: 'lease_expiration',
          entity_type: 'Lease',
          entity_id: lease.id,
          action: `Generated ${daysRemaining}-day lease renewal alert for ${tenant.first_name} ${tenant.last_name}`,
          status: 'Success',
          metadata: { days_remaining: daysRemaining, lease_end: lease.end_date },
          created_at: new Date().toISOString()
        };
        store.addAutomationLog(log);
        details.push(`Processed ${daysRemaining}-day lease alert for ${tenant.first_name} ${tenant.last_name}`);
      } else {
        skipped++;
      }
    }

    return {
      automationName: 'Lease Expiration Automation',
      recordsProcessed,
      notificationsGenerated,
      emailsCreated,
      skipped,
      errors,
      details
    };
  }

  /**
   * Executable Vendor Auto-Assignment
   */
  static async runMaintenanceVendorAssignment(targetRequestId?: string): Promise<ExecutionResult> {
    const state = store.getState();
    const requests = targetRequestId
      ? state.maintenance_requests.filter(m => m.id === targetRequestId)
      : state.maintenance_requests.filter(m => m.status === 'New' || !m.vendor_id);

    const tenantsMap = new Map(state.tenants.map(t => [t.id, t]));
    const unitsMap = new Map(state.units.map(u => [u.id, u]));
    const propertiesMap = new Map(state.properties.map(p => [p.id, p]));
    const vendors = state.vendors.filter(v => v.status === 'Active');

    let recordsProcessed = 0;
    let notificationsGenerated = 0;
    let emailsCreated = 0;
    let skipped = 0;
    let errors = 0;
    const details: string[] = [];

    for (const req of requests) {
      recordsProcessed++;
      const tenant = tenantsMap.get(req.tenant_id);
      const unit = unitsMap.get(req.unit_id);
      const property = unit ? propertiesMap.get(unit.property_id) : undefined;

      if (!tenant || !unit || !property) {
        skipped++;
        continue;
      }

      // Find matching vendor by category & service area city
      let matchedVendor = vendors.find(
        v => v.category.toLowerCase() === req.category.toLowerCase() &&
             v.service_area.toLowerCase() === property.city.toLowerCase()
      );

      // Fallback matching vendor by category only if city match not found
      if (!matchedVendor) {
        matchedVendor = vendors.find(v => v.category.toLowerCase() === req.category.toLowerCase());
      }

      if (matchedVendor) {
        // Assign vendor to maintenance request
        store.updateMaintenanceRequest(req.id, {
          vendor_id: matchedVendor.id,
          status: 'Assigned'
        });

        // Send Vendor Dispatch Email
        const vendorSubject = `WORK ORDER DISPATCH: Unit ${unit.unit_number} (${property.name}) [${req.priority.toUpperCase()}]`;
        const vendorHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #1e3a8a;">PropertyFlow Vendor Maintenance Dispatch</h2>
            <p>Hello ${matchedVendor.name},</p>
            <p>You have been dispatched to a work order at <strong>${property.name}</strong>:</p>
            <ul>
              <li><strong>Unit:</strong> ${unit.unit_number} (${property.address}, ${property.city})</li>
              <li><strong>Category:</strong> ${req.category}</li>
              <li><strong>Priority:</strong> ${req.priority}</li>
              <li><strong>Description:</strong> ${req.description}</li>
              <li><strong>Tenant Contact:</strong> ${tenant.first_name} ${tenant.last_name} (${tenant.phone})</li>
            </ul>
            <p>Please confirm job acceptance within 2 hours.</p>
          </div>
        `;

        const comm = await emailProvider.sendEmail({
          to: matchedVendor.email,
          subject: vendorSubject,
          html: vendorHtml,
          text: `Vendor Dispatch: ${req.category} request at ${property.name} Unit ${unit.unit_number}.`,
          template: 'Vendor Maintenance Dispatch',
          related_entity_type: 'MaintenanceRequest',
          related_entity_id: req.id
        });

        store.addCommunication(comm);
        notificationsGenerated++;
        emailsCreated++;

        const log: AutomationLog = {
          id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          automation_type: 'maintenance_vendor_assignment',
          entity_type: 'MaintenanceRequest',
          entity_id: req.id,
          action: `Auto-assigned ${req.category} request to ${matchedVendor.name} (${matchedVendor.company})`,
          status: 'Success',
          metadata: { vendor: matchedVendor.name, priority: req.priority },
          created_at: new Date().toISOString()
        };
        store.addAutomationLog(log);
        details.push(`Assigned ${req.category} work order to ${matchedVendor.name}`);
      } else {
        // No vendor match found -> Create manager alert task
        const alertTask: Task = {
          id: 'task-' + Date.now(),
          assigned_to: 'Property Manager',
          task_type: 'Vendor Search Required',
          title: `No Vendor Found for ${req.category} Request (${property.city})`,
          description: `Maintenance request #${req.id.slice(0, 8)} for Unit ${unit.unit_number} at ${property.name} requires manual vendor assignment.`,
          priority: req.priority === 'Emergency' ? 'Urgent' : 'High',
          status: 'Pending',
          due_date: new Date().toISOString().split('T')[0],
          related_entity_type: 'MaintenanceRequest',
          related_entity_id: req.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.addTask(alertTask);

        const log: AutomationLog = {
          id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          automation_type: 'maintenance_vendor_assignment',
          entity_type: 'MaintenanceRequest',
          entity_id: req.id,
          action: `No suitable vendor found for ${req.category} in ${property.city}. Created manager escalation task.`,
          status: 'Failed',
          error: 'No active matching vendor',
          created_at: new Date().toISOString()
        };
        store.addAutomationLog(log);
        errors++;
        details.push(`Alert: No active vendor matching ${req.category} in ${property.city}`);
      }
    }

    return {
      automationName: 'Vendor Auto-Assignment Automation',
      recordsProcessed,
      notificationsGenerated,
      emailsCreated,
      skipped,
      errors,
      details
    };
  }

  /**
   * Executable Vendor Bill Due Date Reminder
   */
  static async runBillReminderAutomation(): Promise<ExecutionResult> {
    const state = store.getState();
    const bills = state.bills;
    const vendorsMap = new Map(state.vendors.map(v => [v.id, v]));
    const propertiesMap = new Map(state.properties.map(p => [p.id, p]));

    let recordsProcessed = 0;
    let notificationsGenerated = 0;
    let emailsCreated = 0;
    let skipped = 0;
    let errors = 0;
    const details: string[] = [];

    const today = new Date();

    for (const bill of bills) {
      recordsProcessed++;
      if (bill.status === 'Paid') {
        skipped++;
        continue;
      }

      const vendor = vendorsMap.get(bill.vendor_id);
      const property = propertiesMap.get(bill.property_id);

      if (!vendor || !property) {
        skipped++;
        continue;
      }

      const dueDate = new Date(bill.due_date);
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 3600 * 24));

      if (daysUntilDue <= 7) {
        const log: AutomationLog = {
          id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          automation_type: 'bill_reminder',
          entity_type: 'Bill',
          entity_id: bill.id,
          action: `Generated bill payment alert for Invoice #${bill.bill_number} ($${bill.amount.toFixed(2)} CAD - ${vendor.company})`,
          status: 'Success',
          metadata: { due_date: bill.due_date, amount: bill.amount, days_left: daysUntilDue },
          created_at: new Date().toISOString()
        };
        store.addAutomationLog(log);
        notificationsGenerated++;
        details.push(`Processed bill reminder for Invoice #${bill.bill_number} ($${bill.amount.toFixed(2)})`);
      } else {
        skipped++;
      }
    }

    return {
      automationName: 'Vendor Bill Due Date Reminder',
      recordsProcessed,
      notificationsGenerated,
      emailsCreated,
      skipped,
      errors,
      details
    };
  }

  /**
   * Executable Overdue Payment & Form N4 Non-Payment Notice Preparation
   */
  static async runOverduePaymentCheck(): Promise<ExecutionResult> {
    const state = store.getState();
    const payments = state.payments;
    const tenantsMap = new Map(state.tenants.map(t => [t.id, t]));
    const unitsMap = new Map(state.units.map(u => [u.id, u]));
    const propertiesMap = new Map(state.properties.map(p => [p.id, p]));
    const leasesMap = new Map(state.leases.map(l => [l.id, l]));

    let recordsProcessed = 0;
    let notificationsGenerated = 0;
    let emailsCreated = 0;
    let skipped = 0;
    let errors = 0;
    const details: string[] = [];

    const today = new Date();

    for (const payment of payments) {
      recordsProcessed++;
      if (payment.status === 'Paid') {
        skipped++;
        continue;
      }

      const tenant = tenantsMap.get(payment.tenant_id);
      const lease = leasesMap.get(payment.lease_id);
      const unit = lease ? unitsMap.get(lease.unit_id) : undefined;
      const property = unit ? propertiesMap.get(unit.property_id) : undefined;

      if (!tenant || !lease || !unit || !property) {
        skipped++;
        continue;
      }

      const dueDate = new Date(payment.due_date);
      const diffTime = today.getTime() - dueDate.getTime();
      const daysOverdue = Math.floor(diffTime / (1000 * 3600 * 24));

      if (daysOverdue >= 14) {
        // Create N4 draft notice requiring manager approval
        const n4Notice = createN4NoticeDraft(tenant, lease, property, unit, payment, daysOverdue);
        store.addNotice(n4Notice);

        const log: AutomationLog = {
          id: 'log-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          automation_type: 'n4_nonpayment_workflow',
          entity_type: 'Notice',
          entity_id: n4Notice.id,
          action: `Prepared DRAFT Form N4 Non-Payment Notice for ${tenant.first_name} ${tenant.last_name} (Overdue ${daysOverdue} days)`,
          status: 'Success',
          metadata: { arrears: payment.amount_due - payment.amount_paid, days_overdue: daysOverdue },
          created_at: new Date().toISOString()
        };
        store.addAutomationLog(log);
        notificationsGenerated++;
        details.push(`Prepared Form N4 Draft for ${tenant.first_name} ${tenant.last_name} (Awaiting Manager Review)`);
      } else {
        skipped++;
      }
    }

    return {
      automationName: 'Ontario N4 Non-Payment Draft Workflow',
      recordsProcessed,
      notificationsGenerated,
      emailsCreated,
      skipped,
      errors,
      details
    };
  }
}
