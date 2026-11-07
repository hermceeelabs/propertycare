import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPermissions, UserProfile, UserType } from '../types/database';
import { supabase } from '../services/supabase';

interface PermissionsContextType {
  profile: UserProfile | null;
  isOwner: boolean;
  can: (permission: keyof UserPermissions) => boolean;
  hasPropertyScope: (propertyId: string) => boolean;
  updatePermissions: (newPermissions: Partial<UserPermissions>) => void;
  setUserType: (type: UserType) => void;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        initProfile(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        initProfile(session.user);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const initProfile = (user: any) => {
    // Default logged-in account acts as the primary Owner
    const isOwner = true;
    const initialProfile: UserProfile = {
      id: user.id,
      email: user.email || '',
      full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Administrator',
      avatar_url: user.user_metadata?.avatar_url,
      is_owner: isOwner,
      user_type: isOwner ? 'owner' : 'staff',
      permissions: DEFAULT_OWNER_PERMISSIONS,
      assigned_properties: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    setProfile(initialProfile);
  };

  const isOwner = profile?.is_owner ?? true;

  const can = (permission: keyof UserPermissions): boolean => {
    // Owner always has 100% full authorization
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
        setUserType
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
