/*
  # Restrict write operations to admins only
  - Allow public read on magazine_issues and sister_magazines (already present in earlier migration)
  - Limit INSERT/UPDATE/DELETE on both tables to users for whom public.is_admin(auth.uid()) is true
*/

-- Ensure the helper exists
CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.user_profiles p WHERE p.id = uid AND p.is_admin = true
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- Drop previous broad authenticated policies if they exist
DROP POLICY IF EXISTS "Authenticated users can insert magazine issues" ON public.magazine_issues;
DROP POLICY IF EXISTS "Authenticated users can update magazine issues" ON public.magazine_issues;
DROP POLICY IF EXISTS "Authenticated users can delete magazine issues" ON public.magazine_issues;

DROP POLICY IF EXISTS "Authenticated users can insert sister magazines" ON public.sister_magazines;
DROP POLICY IF EXISTS "Authenticated users can update sister magazines" ON public.sister_magazines;
DROP POLICY IF EXISTS "Authenticated users can delete sister magazines" ON public.sister_magazines;

-- Admin-only write policies
CREATE POLICY "Admins can insert magazine issues"
  ON public.magazine_issues
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update magazine issues"
  ON public.magazine_issues
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete magazine issues"
  ON public.magazine_issues
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert sister magazines"
  ON public.sister_magazines
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update sister magazines"
  ON public.sister_magazines
  FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete sister magazines"
  ON public.sister_magazines
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
