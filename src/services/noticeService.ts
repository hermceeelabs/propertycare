import type { Notice, Tenant, Lease, Payment, Property, Unit } from '../types/database';

export const ONTARIO_RENT_INCREASE_GUIDELINE_2026 = 0.025; // 2.5% standard guideline

export interface CalculateN1Params {
  currentRent: number;
  customPercentage?: number;
  effectiveDate: string;
}

export interface N1CalculationResult {
  currentRent: number;
  percentageChange: number;
  increaseAmount: number;
  newRent: number;
  effectiveDate: string;
}

export function calculateN1Increase(params: CalculateN1Params): N1CalculationResult {
  const percentageChange = params.customPercentage !== undefined ? params.customPercentage : ONTARIO_RENT_INCREASE_GUIDELINE_2026 * 100;
  const increaseAmount = Math.round((params.currentRent * (percentageChange / 100)) * 100) / 100;
  const newRent = Math.round((params.currentRent + increaseAmount) * 100) / 100;

  return {
    currentRent: params.currentRent,
    percentageChange,
    increaseAmount,
    newRent,
    effectiveDate: params.effectiveDate
  };
}

export function createN1NoticeDraft(
  tenant: Tenant,
  lease: Lease,
  property: Property,
  unit: Unit,
  calculation: N1CalculationResult
): Notice {
  const content = `
FORM N1: NOTICE OF RENT INCREASE (ONTARIO)
=====================================================
Tenant Name: ${tenant.first_name} ${tenant.last_name}
Rental Property: ${property.name}, Unit ${unit.unit_number} (${property.address}, ${property.city}, ${property.province})

NOTICE DETAILS:
- Current Monthly Rent: $${calculation.currentRent.toFixed(2)} CAD
- Guideline Rent Increase (${calculation.percentageChange.toFixed(1)}%): $${calculation.increaseAmount.toFixed(2)} CAD
- New Total Monthly Rent: $${calculation.newRent.toFixed(2)} CAD
- Effective Date of Rent Increase: ${calculation.effectiveDate}

ADMINISTRATIVE WORKFLOW STATUS: DRAFT (MANAGER APPROVAL REQUIRED)
This notice is a system-generated draft. Prior to delivery, the Property Manager must verify statutory notice period requirements (minimum 90 days in Ontario) and confirm unit guideline exemption status.
  `.trim();

  return {
    id: 'notice-n1-' + Date.now(),
    tenant_id: tenant.id,
    lease_id: lease.id,
    notice_type: 'Rent Increase (N1)',
    status: 'Draft',
    effective_date: calculation.effectiveDate,
    amount: calculation.newRent,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function createN4NoticeDraft(
  tenant: Tenant,
  lease: Lease,
  property: Property,
  unit: Unit,
  overduePayment: Payment,
  daysOverdue: number
): Notice {
  const arrearsAmount = overduePayment.amount_due - overduePayment.amount_paid;
  // Standard Ontario N4 termination date is 14 days after notice delivery
  const terminationDate = new Date();
  terminationDate.setDate(terminationDate.getDate() + 14);
  const formattedTermDate = terminationDate.toISOString().split('T')[0];

  const content = `
FORM N4: NOTICE TO END A TENANCY EARLY FOR NON-PAYMENT OF RENT (DRAFT)
=====================================================
Tenant Name: ${tenant.first_name} ${tenant.last_name}
Rental Property: ${property.name}, Unit ${unit.unit_number} (${property.address}, ${property.city}, ${property.province})

RENT ARREARS SUMMARY:
- Total Overdue Balance: $${arrearsAmount.toFixed(2)} CAD
- Rent Due Date: ${overduePayment.due_date}
- Days Overdue: ${daysOverdue} days
- Proposed Termination Date if Unpaid: ${formattedTermDate}

ADMINISTRATIVE WORKFLOW STATUS: DRAFT (MANAGER APPROVAL REQUIRED)
NOTICE: This document is an internal draft prepared for management review. It does NOT constitute legal advice or formal service of notice. Legal compliance and notice requirements should be reviewed by the property manager or appropriate legal professional prior to authorization.
  `.trim();

  return {
    id: 'notice-n4-' + Date.now(),
    tenant_id: tenant.id,
    lease_id: lease.id,
    notice_type: 'Notice of Non-Payment (N4)',
    status: 'Draft',
    effective_date: formattedTermDate,
    amount: arrearsAmount,
    content,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}
