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
  isVerifying: boolean;
  switchStakeholderRole: (role: 'owner' | 'landlord' | 'tenant' | 'contractor', email?: string) => void;
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

// Master Platform Owners (Strictly hermceeelabs@gmail.com is the sole Master Platform Owner)
const MASTER_OWNER_EMAILS = [
  'hermceeelabs@gmail.com'
];

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authResult, setAuthResult] = useState<StakeholderAuthResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const verifiedUserIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        verifyStakeholder(session.user);
      } else {
        setIsVerifying(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore background TOKEN_REFRESHED events to prevent full dashboard unmount/refresh when switching tabs
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      if (session?.user) {
        // Only run full stakeholder verification if user has changed or not yet verified
        if (verifiedUserIdRef.current !== session.user.id) {
          verifyStakeholder(session.user);
        }
      } else {
        verifiedUserIdRef.current = null;
        setProfile(null);
        setAuthResult(null);
        setIsVerifying(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  /**
   * VERIFIES USER AGAINST SYSTEM DIRECTORIES:
   * STRICT HIERARCHY:
   * 0. Master Platform Owners / Executives (Emergency SuperAdmin Whitelist) -> Operations Admin Workspace
   * 1. Profiles Table (Company Staff & Executives) -> Operations Admin Workspace
   * 2. Landlords (Property Owners & Authorized Representatives) -> Direct to Landlord Portal
   * 3. Tenants (Active Residents) -> Direct to Tenant Portal
   * 4. Vendors (Trade Contractors) -> Direct to Contractor Portal
   * 5. Unregistered Identity -> Access Denied
   */
  const verifyStakeholder = async (user: any) => {
    setIsVerifying(true);
    const email = (user.email || '').toLowerCase().trim();

    try {
      // 0. MASTER PLATFORM OWNER CHECK FIRST (Dedicated public.owners table & hermceeelabs@gmail.com whitelist)
      if (MASTER_OWNER_EMAILS.includes(email)) {
        let ownerData = null;
        try {
          const { data: dbOwner } = await supabase
            .from('owners')
            .select('*')
            .eq('email', email)
            .maybeSingle();
          ownerData = dbOwner;
        } catch (e) {
          // fallback
        }

        const masterProfile: UserProfile = {
          id: ownerData?.id || user.id || 'master-owner',
          email: email,
          full_name: ownerData?.full_name || user.user_metadata?.full_name || 'Master Platform Owner',
          avatar_url: ownerData?.avatar_url || user.user_metadata?.avatar_url,
          is_owner: true,
          user_type: 'owner',
          role_title: ownerData?.role_title || 'Master Platform Owner',
          permissions: DEFAULT_OWNER_PERMISSIONS,
          assigned_properties: [],
          created_at: ownerData?.created_at || new Date().toISOString(),
          updated_at: ownerData?.updated_at || new Date().toISOString()
        };

        verifiedUserIdRef.current = user.id;
        setProfile(masterProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: 'owner',
          status: 'Active',
          profileData: masterProfile
        });
        setIsVerifying(false);
        return;
      }

      // 1. CHECK STAFFS TABLE FIRST (Company Staff & Operations Specialists strictly)
      const { data: profileMatch } = await supabase
        .from('staffs')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (profileMatch) {
        const isStatusActive = (profileMatch as any).status !== 'Suspended' && (profileMatch as any).status !== 'Inactive';
        if (!isStatusActive) {
          setAuthResult({
            authorized: false,
            stakeholderType: 'staff',
            status: (profileMatch as any).status,
            profileData: profileMatch,
            rejectionReason: 'Your staff account has been suspended or deactivated by the PropertyFlow administrator.'
          });
          setIsVerifying(false);
          return;
        }

        const userProfile: UserProfile = {
          id: profileMatch.id,
          email: profileMatch.email,
          full_name: profileMatch.full_name || user.user_metadata?.full_name,
          avatar_url: profileMatch.avatar_url || user.user_metadata?.avatar_url,
          phone: profileMatch.phone,
          is_owner: false,
          user_type: 'staff',
          role_title: profileMatch.role_title || 'Operations Specialist',
          role_template_id: profileMatch.role_template_id,
          permissions: profileMatch.permissions || DEFAULT_STAFF_PERMISSIONS,
          assigned_properties: profileMatch.assigned_properties || [],
          created_at: profileMatch.created_at,
          updated_at: profileMatch.updated_at
        };

        verifiedUserIdRef.current = user.id;
        setProfile(userProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: 'staff',
          status: 'Active',
          profileData: userProfile
        });
        setIsVerifying(false);
        return;
      }

      // 2. CHECK LANDLORDS TABLE (Property Owners & Authorized Representatives)
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
          setIsVerifying(false);
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

        verifiedUserIdRef.current = user.id;
        setProfile(landlordProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: 'landlord',
          status: 'Active',
          profileData: matchedLandlord
        });
        setIsVerifying(false);
        return;
      }

      // 2. CHECK TENANTS TABLE
      let tenantMatch = null;
      try {
        const { data: dbTenant } = await supabase
          .from('tenants')
          .select('*')
          .ilike('email', email)
          .maybeSingle();
        tenantMatch = dbTenant;
      } catch (e) {
        // fallback to store
      }
      if (!tenantMatch) {
        tenantMatch = (store.getState().tenants || []).find(t => t.email?.toLowerCase().trim() === email);
      }

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
          setIsVerifying(false);
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

        verifiedUserIdRef.current = user.id;
        setProfile(tenantProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: 'tenant',
          status: 'Active',
          profileData: tenantMatch
        });
        setIsVerifying(false);
        return;
      }

      // 3. CHECK VENDORS TABLE (Trade Contractors)
      let vendorMatch = null;
      try {
        const { data: dbVendor } = await supabase
          .from('vendors')
          .select('*')
          .ilike('email', email)
          .maybeSingle();
        vendorMatch = dbVendor;
      } catch (e) {
        // fallback
      }
      if (!vendorMatch) {
        vendorMatch = (store.getState().vendors || []).find(v => v.email?.toLowerCase().trim() === email);
      }

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
          setIsVerifying(false);
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

        verifiedUserIdRef.current = user.id;
        setProfile(vendorProfile);
        setAuthResult({
          authorized: true,
          stakeholderType: 'contractor',
          status: 'Active',
          profileData: vendorMatch
        });
        setIsVerifying(false);
        return;
      }

      // 4. Account Not Found in ANY System Directory -> Deny Access
      verifiedUserIdRef.current = user.id;
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
      verifiedUserIdRef.current = null;
      setAuthResult({
        authorized: false,
        stakeholderType: null,
        status: null,
        profileData: null,
        rejectionReason: 'An error occurred while verifying your corporate account credentials.'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Fast In-App Stakeholder Switcher (For local testing & client demonstrations)
   */
  const switchStakeholderRole = (role: 'owner' | 'landlord' | 'tenant' | 'contractor', targetEmail?: string) => {
    setIsVerifying(true);
    if (role === 'owner') {
      const ownerProfile: UserProfile = {
        id: 'mock-owner',
        email: targetEmail || 'admin@propertyflow.com',
        full_name: 'Executive Portfolio Admin',
        is_owner: true,
        user_type: 'owner',
        permissions: DEFAULT_OWNER_PERMISSIONS,
        assigned_properties: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(ownerProfile);
      setAuthResult({
        authorized: true,
        stakeholderType: 'owner',
        status: 'Active',
        profileData: ownerProfile
      });
    } else if (role === 'landlord') {
      const landlords = store.getState().landlords || [];
      const target = landlords.find(l => targetEmail && l.email?.toLowerCase() === targetEmail.toLowerCase()) || landlords[0];
      const landlordProfile: UserProfile = {
        id: target?.id || 'landlord-1',
        email: target?.email || 'david.adeyemi@northstarholding.com',
        full_name: target ? `${target.first_name} ${target.last_name}` : 'David Adeyemi',
        is_owner: false,
        user_type: 'landlord',
        permissions: {
          can_view_financials: true,
          can_manage_leases: false,
          can_dispatch_maintenance: false,
          can_issue_notices: false,
          can_edit_properties: false,
          can_trigger_automations: false
        },
        assigned_properties: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(landlordProfile);
      setAuthResult({
        authorized: true,
        stakeholderType: 'landlord',
        status: 'Active',
        profileData: target || landlordProfile
      });
    } else if (role === 'tenant') {
      const tenants = store.getState().tenants || [];
      const target = tenants[0];
      const tenantProfile: UserProfile = {
        id: target?.id || 'tenant-1',
        email: target?.email || 'sarah.jenkins@gmail.com',
        full_name: target ? `${target.first_name} ${target.last_name}` : 'Sarah Jenkins',
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(tenantProfile);
      setAuthResult({
        authorized: true,
        stakeholderType: 'tenant',
        status: 'Active',
        profileData: target || tenantProfile
      });
    } else if (role === 'contractor') {
      const vendors = store.getState().vendors || [];
      const target = vendors[0];
      const vendorProfile: UserProfile = {
        id: target?.id || 'vendor-1',
        email: target?.email || 'service@apexplumbing.com',
        full_name: target?.name || 'Apex Mechanical & Plumbing Ltd',
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setProfile(vendorProfile);
      setAuthResult({
        authorized: true,
        stakeholderType: 'contractor',
        status: 'Active',
        profileData: target || vendorProfile
      });
    }
    setIsVerifying(false);
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
        authResult,
        isVerifying,
        switchStakeholderRole
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
