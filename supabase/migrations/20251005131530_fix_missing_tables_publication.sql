/*
  # Fix 404 on RPC/REST for tables

  404 from REST often means the table isn't in the exposed PostgREST schema or publication.
  Ensure tables are in the default publication and schema is correct.
*/

-- Ensure public schema exists in postgrest and tables are part of publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.magazine_issues;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.sister_magazines;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.user_profiles;

-- No-op grants to ensure visibility (Supabase usually manages these)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.magazine_issues TO anon, authenticated;
GRANT SELECT ON public.sister_magazines TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
