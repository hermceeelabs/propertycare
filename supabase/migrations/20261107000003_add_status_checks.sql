-- Add account_status to profiles and landlords for unified status checking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending', 'Inactive'));

ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended', 'Pending', 'Inactive'));
