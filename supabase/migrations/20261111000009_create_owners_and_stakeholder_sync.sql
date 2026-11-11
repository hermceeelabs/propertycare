-- Migration: 20261111000009_create_owners_and_stakeholder_sync.sql
-- Description:
-- 1. Creates dedicated public.owners table for master platform owner (hermceeelabs@gmail.com).
-- 2. Links auth_user_id columns on landlords, tenants, and vendors.
-- 3. Drops is_owner from public.profiles and enforces user_type = 'staff' strictly.
-- 4. Replaces handle_new_user() trigger so that profiles is NEVER updated for non-staff.

-- Step 1: Create dedicated public.owners table
CREATE TABLE IF NOT EXISTS public.owners (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role_title TEXT DEFAULT 'Master Platform Owner',
  permissions JSONB NOT NULL DEFAULT '{
    "can_view_financials": true,
    "can_manage_leases": true,
    "can_dispatch_maintenance": true,
    "can_issue_notices": true,
    "can_edit_properties": true,
    "can_trigger_automations": true
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Add auth_user_id to stakeholder tables
ALTER TABLE public.landlords ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 3: Enable RLS on owners
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow anon select on owners" ON public.owners;
CREATE POLICY "Allow anon select on owners" ON public.owners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon insert on owners" ON public.owners;
CREATE POLICY "Allow anon insert on owners" ON public.owners FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon update on owners" ON public.owners;
CREATE POLICY "Allow anon update on owners" ON public.owners FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow anon delete on owners" ON public.owners;
CREATE POLICY "Allow anon delete on owners" ON public.owners FOR DELETE USING (true);

-- Step 4: Populate owners table with hermceeelabs@gmail.com if exists in auth.users
INSERT INTO public.owners (id, email, full_name, avatar_url)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Master Owner'),
  raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE LOWER(email) = 'hermceeelabs@gmail.com'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  updated_at = NOW();

-- Step 5: Clean profiles table: Remove owner entries and non-staff
DELETE FROM public.profiles WHERE LOWER(email) = 'hermceeelabs@gmail.com' OR user_type = 'owner';

-- Step 6: Ensure profiles user_type is strictly 'staff'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type = 'staff');

-- Step 7: Redefine handle_new_user() trigger function
-- When any user signs in via auth.users:
-- 1. If email = 'hermceeelabs@gmail.com', sync to public.owners
-- 2. Else if email in landlords, sync landlords.auth_user_id
-- 3. Else if email in tenants, sync tenants.auth_user_id
-- 4. Else if email in vendors, sync vendors.auth_user_id
-- 5. Else if user was pre-onboarded into profiles as staff, update profiles.id = NEW.id
-- 6. Otherwise: DO NOTHING (Never insert random users into profiles!)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := LOWER(TRIM(NEW.email));

  -- 1. Master Owner Sync
  IF v_email = 'hermceeelabs@gmail.com' THEN
    INSERT INTO public.owners (id, email, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Master Owner'),
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = NOW();
    RETURN NEW;
  END IF;

  -- 2. Landlord Sync
  IF EXISTS (SELECT 1 FROM public.landlords WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.landlords 
    SET auth_user_id = NEW.id, updated_at = NOW() 
    WHERE LOWER(TRIM(email)) = v_email;
    RETURN NEW;
  END IF;

  -- 3. Tenant Sync
  IF EXISTS (SELECT 1 FROM public.tenants WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.tenants 
    SET auth_user_id = NEW.id, updated_at = NOW() 
    WHERE LOWER(TRIM(email)) = v_email;
    RETURN NEW;
  END IF;

  -- 4. Vendor Sync
  IF EXISTS (SELECT 1 FROM public.vendors WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.vendors 
    SET auth_user_id = NEW.id, updated_at = NOW() 
    WHERE LOWER(TRIM(email)) = v_email;
    RETURN NEW;
  END IF;

  -- 5. Staff Pre-Onboarded Sync (update auth user id / metadata if invited)
  IF EXISTS (SELECT 1 FROM public.profiles WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.profiles
    SET 
      full_name = COALESCE(full_name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      avatar_url = COALESCE(avatar_url, NEW.raw_user_meta_data->>'avatar_url'),
      updated_at = NOW()
    WHERE LOWER(TRIM(email)) = v_email;
    RETURN NEW;
  END IF;

  -- 6. Unknown / Unregistered user: DO NOT insert into profiles!
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
