/*
  # Fix Security and Performance Issues

  ## Changes Made

  1. **Performance Improvements**
     - Add missing index on `buckets.run_id` foreign key
     - Remove unused indexes to reduce maintenance overhead:
       - `idx_library_items_title`
       - `idx_runs_script_name`
       - `idx_script_schedules_next_run`
       - `idx_script_schedules_script_definition_id`

  2. **Function Security**
     - Fix mutable search_path on `update_script_schedules_updated_at` function

  3. **RLS Policy Security**
     - Since this is a public-facing application without user authentication requirements,
       the current "always true" policies are intentional for public access
     - These policies allow the application to function without auth barriers
     - If authentication is added later, these policies should be updated to restrict access

  ## Notes
  - The RLS policies marked as "always true" are intentional design choices for public access
  - Auth DB connection strategy should be configured via Supabase dashboard settings
  - Keeping RLS enabled even with permissive policies maintains the security framework
*/

-- Add missing index for foreign key on buckets.run_id
CREATE INDEX IF NOT EXISTS idx_buckets_run_id ON public.buckets(run_id);

-- Remove unused indexes
DROP INDEX IF EXISTS public.idx_library_items_title;
DROP INDEX IF EXISTS public.idx_runs_script_name;
DROP INDEX IF EXISTS public.idx_script_schedules_next_run;
DROP INDEX IF EXISTS public.idx_script_schedules_script_definition_id;

-- Fix function search_path security issue
-- First drop the trigger, then the function with CASCADE
DROP TRIGGER IF EXISTS update_script_schedules_updated_at_trigger ON public.script_schedules;
DROP TRIGGER IF EXISTS script_schedules_updated_at ON public.script_schedules;
DROP FUNCTION IF EXISTS public.update_script_schedules_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_script_schedules_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER script_schedules_updated_at
  BEFORE UPDATE ON public.script_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_script_schedules_updated_at();

-- Note about RLS policies:
-- The "always true" RLS policies are intentional for this public application.
-- They provide public read/write access without authentication requirements.
-- If authentication is added in the future, update these policies to:
--   - Check auth.uid() for user-specific data
--   - Add role-based access controls
--   - Implement data ownership checks

-- Note about Auth DB Connection Strategy:
-- This must be configured in the Supabase Dashboard:
-- Settings > Database > Connection Pooling > Auth
-- Change from fixed number to percentage-based allocation