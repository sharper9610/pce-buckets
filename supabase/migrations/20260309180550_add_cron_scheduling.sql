/*
  # Add Cron Scheduling Support

  1. New Tables
    - `script_schedules`
      - `id` (uuid, primary key) - Unique identifier
      - `script_definition_id` (uuid, foreign key) - References script_definitions table
      - `interval_hours` (integer) - How often to run (in hours)
      - `enabled` (boolean) - Whether schedule is active
      - `last_run_at` (timestamptz) - Last execution time
      - `next_run_at` (timestamptz) - Next scheduled execution
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `script_schedules` table
    - Add policies for authenticated users to manage schedules
    
  3. Indexes
    - Index on next_run_at for efficient cron queries
    - Index on script_definition_id for lookups
*/

-- Create script_schedules table
CREATE TABLE IF NOT EXISTS script_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_definition_id uuid NOT NULL REFERENCES script_definitions(id) ON DELETE CASCADE,
  interval_hours integer NOT NULL CHECK (interval_hours > 0),
  enabled boolean DEFAULT true,
  last_run_at timestamptz,
  next_run_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(script_definition_id)
);

-- Enable RLS
ALTER TABLE script_schedules ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Users can view all schedules"
  ON script_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create schedules"
  ON script_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update schedules"
  ON script_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete schedules"
  ON script_schedules FOR DELETE
  TO authenticated
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_script_schedules_next_run 
  ON script_schedules(next_run_at) 
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_script_schedules_script_definition_id 
  ON script_schedules(script_definition_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_script_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS script_schedules_updated_at ON script_schedules;
CREATE TRIGGER script_schedules_updated_at
  BEFORE UPDATE ON script_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_script_schedules_updated_at();