-- =============================================
-- FIX: Recreate the trigger that auto-creates profile on new auth user
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. (Re)create the function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, last_seen_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email, 'Usuario'),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- 2. Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create the trigger (fires after every new user in auth.users)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Optional: verify it exists
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
-- SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
