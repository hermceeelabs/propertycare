-- Add authorized_representatives column to landlords table
ALTER TABLE public.landlords
  ADD COLUMN IF NOT EXISTS authorized_representatives JSONB DEFAULT '[]'::jsonb;
