import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPermissions, UserProfile, UserType } from '../types/database';
import { supabase, store } from '../services/supabase';

export interface StakeholderAuthResult {
  authorized: boolean;
  stakeholderType: 'owner' | 'staff' | 'landlord' | 'tenant' | 'vendor' | 'contractor' | null;
  status: 'Active' | 'Suspended' | 'Inactive' | 'Pending' | null;
  profileData: any;
  rejectionReason?: string;
}

interface PermissionsContextType {
  profile: UserProfile | null;
  isOwner: boolean;
  can: (permission: keyof UserPermissions) => boolean;
  hasPropertyScope: (propertyId: string) => boolean;
  updatePermissions: (newPermissions: Partial<UserPermissions>) => void;
  setUserType: (type: UserType) => void;
  authResult: StakeholderAuthResult | null;
}

const DEFAULT_OWNER_PERMISSIONS: UserPermissions = {
  can_view_financials: true,
  can_manage_leases: true,
  can_dispatch_maintenance: true,
  can_issue_notices: true,
  can_edit_properties: true,
  can_trigger_automations: true,
};

const DEFAULT_STAFF_PERMISSIONS: UserPermissions = {
  can_view_financials: false,
  can_manage_leases: true,
  can_dispatch_maintenance: true,
  can_issue_notices: false,
  can_edit_properties: false,
  can_trigger_automations: false,
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authResult, setAuthResult] = useState<StakeholderAuthResult | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        verifyStakeholder(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        verifyStakeholder(session.user);
      } else {
        setProfile(null);
        setAuthResult(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * VERIFIES USER AGAINST ALL SYSTEM TABLES:
   * 1. Staff / Profiles (Admin, Owner, Manager)
   * 2. Landlords (Property Owners)
   * 3. Tenants (Active Residents)
   * 4. Vendors (Trade Contractors)
   */
  const verifyStakeholder = async (user: any) => {
    const email = (user.email || '').toLowerCase().trim();

    try {
      // 1. Check Profiles table (Staff & Owner)
      const { data: profileMatch } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (profileMatch) {
        const isStatusActive = (profileMatch as any).status !== 'Suspended' && (profileMatch as any).status !== 'Inactive';
        if (!isStatusActive) {
          setAuthResult({
            authorized: false,
            stakeholderType: profileMatch.user_type as any,
            status: (profileMatch as any).status,
            profileData: profileMatch,
            rejectionReason: 'Your staff account has been suspended or deactivated by the PropertyFlow administrator.'
          });
          return;
        }

        const userProfile: UserProfile = {
          id: profileMatch.id,
          email: profileMatch.email,
          full_name: profileMatch.full_name || user.user_metadata?.full_name,
          avatar_url: profileMatch.avatar_url || user.user_metadata?.avatar_url,
          phone: profileMatch.phone,
          is_owner: !!profileMatch.is_owner,
          user_type: profileMatch.user_type as UserType,
          permissions: profileMatch.is_owner ? DEFAULT_OWNER_PERMISSIONS : (profileMatch.permissions || DEFAULT_STAFF_PERMISSIONS),
          assigned_properties: profileMatch.assigned_properties || [],
          created_at: profileMatch.created_at,
          updated_at: profileMatch.updated_at
        };

        setProfile(userProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: profileMatch.is_owner ? 'owner' : 'staff',
          status: 'Active',
          profileData: userProfile
        });
        return;
      }

      // 2. Check Landlords table (Primary Landlord OR Authorized Legal Representative)
      let allLandlords = store.getState().landlords || [];
      try {
        const { data: dbLandlords } = await supabase
          .from('landlords')
          .select('*');
        if (dbLandlords && dbLandlords.length > 0) {
          allLandlords = dbLandlords;
        }
      } catch (e) {
        // Fallback to local store
      }

      const matchedLandlord = (allLandlords || []).find(l => {
        if (l.email?.toLowerCase().trim() === email) return true;
        const reps = l.authorized_representatives || [];
        return reps.some((r: any) => r.email?.toLowerCase().trim() === email && r.status === 'Active');
      });

      if (matchedLandlord) {
        const isPrimary = matchedLandlord.email?.toLowerCase().trim() === email;
        const matchedRep = !isPrimary
          ? (matchedLandlord.authorized_representatives || []).find((r: any) => r.email?.toLowerCase().trim() === email)
          : null;

        const isStatusActive = (matchedLandlord as any).status !== 'Suspended' && (matchedLandlord as any).status !== 'Inactive';
        if (!isStatusActive) {
          setAuthResult({
            authorized: false,
            stakeholderType: 'landlord',
            status: (matchedLandlord as any).status,
            profileData: matchedLandlord,
            rejectionReason: 'Your landlord investor profile is currently deactivated. Please contact management.'
          });
          return;
        }

        const landlordProfile: UserProfile = {
          id: matchedLandlord.id,
          email: email,
          full_name: isPrimary
            ? `${matchedLandlord.first_name} ${matchedLandlord.last_name}`
            : `${matchedRep?.name || 'Representative'} (${matchedRep?.relationship || 'Legal Counsel'})`,
          avatar_url: user.user_metadata?.avatar_url,
          is_owner: false,
          user_type: 'landlord',
          permissions: {
            can_view_financials: matchedRep ? !!matchedRep.can_view_statements : true,
            can_manage_leases: false,
            can_dispatch_maintenance: matchedRep ? !!matchedRep.can_approve_maintenance : false,
            can_issue_notices: false,
            can_edit_properties: false,
            can_trigger_automations: false
          },
          assigned_properties: [],
          created_at: matchedLandlord.created_at,
          updated_at: matchedLandlord.updated_at
        };

        setProfile(landlordProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: 'landlord',
          status: 'Active',
          profileData: matchedLandlord
        });
        return;
      }

      // 3. Check Tenants table
      const { data: tenantMatch } = await supabase
        .from('tenants')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (tenantMatch) {
        const isStatusActive = tenantMatch.status === 'Active';
        if (!isStatusActive) {
          setAuthResult({
            authorized: false,
            stakeholderType: 'tenant',
            status: tenantMatch.status as any,
            profileData: tenantMatch,
            rejectionReason: `Your tenant residency account is currently marked as "${tenantMatch.status}". Please contact the leasing office.`
          });
          return;
        }

        const tenantProfile: UserProfile = {
          id: tenantMatch.id,
          email: tenantMatch.email,
          full_name: `${tenantMatch.first_name} ${tenantMatch.last_name}`,
          avatar_url: user.user_metadata?.avatar_url,
          is_owner: false,
          user_type: 'tenant',
          permissions: {
            can_view_financials: false,
            can_manage_leases: false,
            can_dispatch_maintenance: true,
            can_issue_notices: false,
            can_edit_properties: false,
            can_trigger_automations: false
          },
          assigned_properties: [],
          created_at: tenantMatch.created_at,
          updated_at: tenantMatch.updated_at
        };

        setProfile(tenantProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: 'tenant',
          status: 'Active',
          profileData: tenantMatch
        });
        return;
      }

      // 4. Check Vendors table
      const { data: vendorMatch } = await supabase
        .from('vendors')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (vendorMatch) {
        const isStatusActive = vendorMatch.status === 'Active';
        if (!isStatusActive) {
          setAuthResult({
            authorized: false,
            stakeholderType: 'vendor',
            status: vendorMatch.status as any,
            profileData: vendorMatch,
            rejectionReason: 'Your trade contractor account is currently suspended.'
          });
          return;
        }

        const vendorProfile: UserProfile = {
          id: vendorMatch.id,
          email: vendorMatch.email,
          full_name: vendorMatch.name,
          avatar_url: user.user_metadata?.avatar_url,
          is_owner: false,
          user_type: 'staff',
          permissions: {
            can_view_financials: false,
            can_manage_leases: false,
            can_dispatch_maintenance: true,
            can_issue_notices: false,
            can_edit_properties: false,
            can_trigger_automations: false
          },
          assigned_properties: [],
          created_at: vendorMatch.created_at,
          updated_at: vendorMatch.updated_at
        };

        setProfile(vendorProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: 'contractor',
          status: 'Active',
          profileData: vendorMatch
        });
        return;
      }

      // 5. Account Not Found in ANY System Directory -> Deny Access
      setAuthResult({
        authorized: false,
        stakeholderType: null,
        status: null,
        profileData: null,
        rejectionReason: `No active staff, landlord, tenant, or contractor record was found for ${email}. You must be registered in the company system before you can sign in.`
      });
      setProfile(null);
    } catch (err: any) {
      console.error('Stakeholder verification failed:', err);
      setAuthResult({
        authorized: false,
        stakeholderType: null,
        status: null,
        profileData: null,
        rejectionReason: 'An error occurred while verifying your corporate account credentials.'
      });
    }
  };

  const isOwner = profile?.is_owner ?? false;

  const can = (permission: keyof UserPermissions): boolean => {
    if (isOwner) return true;
    if (!profile) return false;
    return !!profile.permissions[permission];
  };

  const hasPropertyScope = (propertyId: string): boolean => {
    if (isOwner) return true;
    if (!profile || !profile.assigned_properties || profile.assigned_properties.length === 0) return true;
    return profile.assigned_properties.includes(propertyId);
  };

  const updatePermissions = (newPermissions: Partial<UserPermissions>) => {
    if (!profile) return;
    setProfile(prev => prev ? {
      ...prev,
      permissions: {
        ...prev.permissions,
        ...newPermissions
      }
    } : null);
  };

  const setUserType = (type: UserType) => {
    if (!profile) return;
    const isNowOwner = type === 'owner';
    setProfile(prev => prev ? {
      ...prev,
      user_type: type,
      is_owner: isNowOwner,
      permissions: isNowOwner ? DEFAULT_OWNER_PERMISSIONS : DEFAULT_STAFF_PERMISSIONS
    } : null);
  };

  return (
    <PermissionsContext.Provider
      value={{
        profile,
        isOwner,
        can,
        hasPropertyScope,
        updatePermissions,
        setUserType,
        authResult
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
