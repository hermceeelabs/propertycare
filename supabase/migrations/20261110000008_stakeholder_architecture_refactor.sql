-- Migration: 20261110000008_stakeholder_architecture_refactor.sql
-- Description: Establishes single-source-of-truth domain tables (landlords, tenants, vendors)
-- and reserves profiles strictly for internal company staff & executives.

-- 1. Add optional auth_user_id link to landlords
ALTER TABLE public.landlords 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Add optional auth_user_id link to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Add optional auth_user_id link to vendors
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Clean profiles: Remove any non-staff records from profiles table
DELETE FROM public.profiles WHERE user_type NOT IN ('owner', 'staff');

-- 5. Tighten profiles check constraint
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_type_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_user_type_check CHECK (user_type IN ('owner', 'staff'));
