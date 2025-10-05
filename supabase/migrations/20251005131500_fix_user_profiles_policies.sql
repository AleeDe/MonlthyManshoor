/*
  # Fix user_profiles RLS recursion and harden admin checks

  This migration:
  - Adds a SECURITY DEFINER helper function `public.is_admin(uuid)` to check admin status without RLS recursion
  - Replaces the recursive SELECT policies with function-based checks
*/

-- Helper function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM public.user_profiles p
    WHERE p.id = uid AND p.is_admin = true
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;

-- Ensure privileges are limited
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Replace recursive policies on user_profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Users can view own profile
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON user_profiles
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;

-- Admins can view all profiles (safe via function)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Users can update own profile, but cannot toggle admin flag
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = public.is_admin(auth.uid())
  );
