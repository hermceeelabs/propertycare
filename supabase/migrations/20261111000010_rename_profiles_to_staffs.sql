-- Migration: 20261111000010_rename_profiles_to_staffs.sql
-- Description: Renames public.profiles to public.staffs and updates the user onboarding sync trigger.

-- 1. Rename table from profiles to staffs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles RENAME TO staffs;
  END IF;
END $$;

-- 2. Update trigger to sync staff directly to public.staffs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := LOWER(TRIM(NEW.email));

  -- 1. Master Platform Owner Sync (Strictly only hermceeelabs@gmail.com)
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

  -- 2. Landlord Sync (Link auth_user_id without touching staffs)
  IF EXISTS (SELECT 1 FROM public.landlords WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.landlords 
    SET auth_user_id = NEW.id, updated_at = NOW() 
    WHERE LOWER(TRIM(email)) = v_email;
    RETURN NEW;
  END IF;

  -- 3. Tenant Sync (Link auth_user_id without touching staffs)
  IF EXISTS (SELECT 1 FROM public.tenants WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.tenants 
    SET auth_user_id = NEW.id, updated_at = NOW() 
    WHERE LOWER(TRIM(email)) = v_email;
    RETURN NEW;
  END IF;

  -- 4. Trade Vendor Sync (Link auth_user_id without touching staffs)
  IF EXISTS (SELECT 1 FROM public.vendors WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.vendors 
    SET auth_user_id = NEW.id, updated_at = NOW() 
    WHERE LOWER(TRIM(email)) = v_email;
    RETURN NEW;
  END IF;

  -- 5. Staff Pre-Onboarded Sync (ONLY update existing staff records in staffs)
  IF EXISTS (SELECT 1 FROM public.staffs WHERE LOWER(TRIM(email)) = v_email) THEN
    UPDATE public.staffs
    SET 
      full_name = COALESCE(full_name, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
      avatar_url = COALESCE(avatar_url, NEW.raw_user_meta_data->>'avatar_url'),
      updated_at = NOW()
    WHERE LOWER(TRIM(email)) = v_email;
    RETURN NEW;
  END IF;

  -- 6. External / Unrecognized Account: DO NOT INSERT INTO STAFFS!
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
