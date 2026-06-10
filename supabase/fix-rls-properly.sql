-- =============================================
-- FIX RLS PROPERLY - Run this entire script
-- =============================================

-- 1. Make sure last_seen_at exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop all old policies (cleanup)
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "self_read" ON public.profiles;
DROP POLICY IF EXISTS "self_update" ON public.profiles;
DROP POLICY IF EXISTS "admin_read" ON public.profiles;
DROP POLICY IF EXISTS "admin_update" ON public.profiles;

-- 4. Create a SECURITY DEFINER function to check if user is admin
-- This avoids RLS recursion problems
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role = 'admin'
  );
$$;

-- 5. Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 6. Simple, reliable policies

-- Every authenticated user can read their OWN profile
CREATE POLICY "self_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Every authenticated user can update their OWN profile
CREATE POLICY "self_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Admins can read ALL profiles
CREATE POLICY "admin_read"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admins can update ALL profiles
CREATE POLICY "admin_update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin());
