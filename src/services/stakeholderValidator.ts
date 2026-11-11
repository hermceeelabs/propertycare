import { supabase, store } from './supabase';

export interface EmailConflictResult {
  hasConflict: boolean;
  roleName?: string;
  entityName?: string;
  errorMessage?: string;
}

/**
 * Checks if an email is already registered anywhere in the system:
 * - profiles (Company Staff / Owner)
 * - landlords (Property Owners & Delegates)
 * - tenants (Residents)
 * - vendors (Contractors)
 *
 * @param email - The email to check
 * @param ignoreId - Optional entity ID to ignore (for updates/edits)
 */
export async function checkEmailConflict(email: string, ignoreId?: string): Promise<EmailConflictResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { hasConflict: false };

  // 1. Check Owners Table (Master Platform Owner)
  try {
    const { data: owner } = await supabase
      .from('owners')
      .select('id, email, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (owner && owner.id !== ignoreId) {
      return {
        hasConflict: true,
        roleName: 'Master Platform Owner',
        entityName: owner.full_name || owner.email,
        errorMessage: `This email is registered to ${owner.full_name || owner.email} as Master Platform Owner. A single email cannot hold multiple stakeholder roles.`
      };
    }
  } catch (e) {
    // Fallback or continue
  }

  // 2. Check Profiles (Company Staff strictly)
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, user_type')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profile && profile.id !== ignoreId) {
      const role = 'Company Staff';
      return {
        hasConflict: true,
        roleName: role,
        entityName: profile.full_name || profile.email,
        errorMessage: `This email is already registered to ${profile.full_name || profile.email} as ${role}. A single email cannot hold multiple stakeholder roles.`
      };
    }
  } catch (e) {
    // Fallback or continue
  }

  // 2. Check Landlords & Authorized Delegates
  let allLandlords: any[] = store.getState().landlords || [];
  try {
    const { data: dbLandlords } = await supabase
      .from('landlords')
      .select('id, first_name, last_name, email, company_name, authorized_representatives');
    if (dbLandlords && dbLandlords.length > 0) {
      allLandlords = dbLandlords;
    }
  } catch (e) {
    // local fallback
  }

  const matchedLandlord = allLandlords.find((l: any) => {
    if (l.id === ignoreId) return false;
    if (l.email?.toLowerCase().trim() === normalizedEmail) return true;
    const reps = l.authorized_representatives || [];
    return reps.some((r: any) => r.email?.toLowerCase().trim() === normalizedEmail);
  });

  if (matchedLandlord) {
    const isDirect = matchedLandlord.email?.toLowerCase().trim() === normalizedEmail;
    const name = matchedLandlord.company_name || `${matchedLandlord.first_name} ${matchedLandlord.last_name}`;
    const role = isDirect ? 'Landlord / Property Owner' : 'Landlord Legal Representative';
    return {
      hasConflict: true,
      roleName: role,
      entityName: name,
      errorMessage: `This email is already assigned to ${name} as ${role}. An email cannot be duplicated across roles.`
    };
  }

  // 3. Check Tenants
  let allTenants: any[] = store.getState().tenants || [];
  try {
    const { data: dbTenants } = await supabase
      .from('tenants')
      .select('id, first_name, last_name, email');
    if (dbTenants && dbTenants.length > 0) {
      allTenants = dbTenants;
    }
  } catch (e) {
    // local fallback
  }

  const matchedTenant = allTenants.find((t: any) => t.id !== ignoreId && t.email?.toLowerCase().trim() === normalizedEmail);
  if (matchedTenant) {
    const name = `${matchedTenant.first_name} ${matchedTenant.last_name}`;
    return {
      hasConflict: true,
      roleName: 'Tenant / Resident',
      entityName: name,
      errorMessage: `This email is already registered to ${name} as a Tenant. Please use a unique email for each stakeholder.`
    };
  }

  // 4. Check Vendors / Contractors
  let allVendors: any[] = store.getState().vendors || [];
  try {
    const { data: dbVendors } = await supabase
      .from('vendors')
      .select('id, name, email');
    if (dbVendors && dbVendors.length > 0) {
      allVendors = dbVendors;
    }
  } catch (e) {
    // local fallback
  }

  const matchedVendor = allVendors.find((v: any) => v.id !== ignoreId && v.email?.toLowerCase().trim() === normalizedEmail);
  if (matchedVendor) {
    return {
      hasConflict: true,
      roleName: 'Trade Contractor / Vendor',
      entityName: matchedVendor.name,
      errorMessage: `This email is already assigned to ${matchedVendor.name} as a Trade Contractor.`
    };
  }

  return { hasConflict: false };
}
