-- ============================================================
-- FIX: Create the missing admin profile row for current user
-- Run this in Supabase SQL Editor (after fix-rls-properly.sql)
-- This fixes the "null value in column full_name violates not-null constraint"
-- ============================================================

-- 1. Make full_name nullable (recommended - original design in setup.sql
--    allows it, and the trigger can produce NULL if Google metadata has no name.
--    This prevents future signup failures too.)
ALTER TABLE public.profiles 
ALTER COLUMN full_name DROP NOT NULL;

-- 2. Create or fix the profile row for this specific admin user.
--    Uses the id from your DEBUG output.
INSERT INTO public.profiles (id, email, full_name, role, approved, last_seen_at)
VALUES 
  ('3a48d7e6-f405-4408-9e38-fe91af44ad31', 'calidadampasa25@gmail.com', 'Admin', 'admin', true, now())
ON CONFLICT (id) DO UPDATE 
SET 
  role = 'admin',
  approved = true,
  email = 'calidadampasa25@gmail.com',
  full_name = COALESCE(excluded.full_name, 'Admin'),
  last_seen_at = now();

-- 3. Verify the row now exists with correct values
SELECT id, email, full_name, role, approved, last_seen_at 
FROM public.profiles 
WHERE id = '3a48d7e6-f405-4408-9e38-fe91af44ad31';

-- After this succeeds:
-- - Go back to the app at localhost:3000
-- - Click "Cerrar Sesión" on the pending page
-- - Open a brand new incognito window
-- - Login with Google choosing exactly calidadampasa25@gmail.com
-- - You should now reach the dashboard (because role=admin)
-- - Or the DEBUG will show the profile row with role="admin" and approved=true, profileError: none
