/*
  # Update RLS Policies for Public Access

  1. Changes
    - Drop existing restrictive policies
    - Add new policies that allow public access for MVP
    - This allows the app to work without authentication

  2. Security Note
    - For MVP/demo purposes only
    - In production, implement proper authentication
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on library_items" ON library_items;
DROP POLICY IF EXISTS "Allow all operations on buckets" ON buckets;
DROP POLICY IF EXISTS "Allow all operations on script_definitions" ON script_definitions;
DROP POLICY IF EXISTS "Allow all operations on runs" ON runs;

-- Create new public policies for library_items
CREATE POLICY "Public access to library_items"
  ON library_items FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create new public policies for buckets
CREATE POLICY "Public access to buckets"
  ON buckets FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create new public policies for script_definitions
CREATE POLICY "Public access to script_definitions"
  ON script_definitions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create new public policies for runs
CREATE POLICY "Public access to runs"
  ON runs FOR ALL
  USING (true)
  WITH CHECK (true);