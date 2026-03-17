/*
  # PCE Buckets Schema

  1. New Tables
    - `library_items`
      - `sku` (text, primary key) - Unique SKU identifier
      - `title` (text, indexed) - Optional title field for search
      - `json` (jsonb) - Raw JSON data for the SKU
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `buckets`
      - `id` (uuid, primary key) - Unique bucket version ID
      - `name` (text) - Bucket name (e.g., velocity_promo_monitor)
      - `version` (integer) - Version number for this bucket name
      - `json` (jsonb) - Generated bucket JSON data
      - `generated_at` (timestamptz) - When this version was created
      - `run_id` (uuid, foreign key) - Link to the run that generated this
    
    - `script_definitions`
      - `id` (uuid, primary key) - Unique script ID
      - `name` (text, unique) - Script name
      - `description` (text) - Script description
      - `ts_code` (text) - TypeScript code
      - `read_library` (boolean) - Whether script reads from library
      - `input_bucket_names` (jsonb) - Array of input bucket names
      - `output_bucket_name` (text) - Name of output bucket
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `runs`
      - `id` (uuid, primary key) - Unique run ID
      - `script_name` (text) - Name of script that was run
      - `started_at` (timestamptz) - Run start time
      - `finished_at` (timestamptz) - Run finish time
      - `status` (text) - Status: success or failed
      - `logs` (text) - Execution logs
      - `input_bucket_versions` (jsonb) - JSON map of bucket names to versions used
      - `output_bucket_name` (text) - Output bucket name
      - `output_bucket_version` (integer) - Output bucket version created

  2. Indexes
    - Index on library_items.title for search
    - Index on buckets (name, version) for quick lookups
    - Index on runs.script_name for filtering
    - Index on buckets.generated_at for sorting

  3. Security
    - Enable RLS on all tables
    - For MVP, allow all authenticated operations (single admin user)
*/

-- Create library_items table
CREATE TABLE IF NOT EXISTS library_items (
  sku text PRIMARY KEY,
  title text,
  json jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Create index for title search
CREATE INDEX IF NOT EXISTS idx_library_items_title ON library_items(title);

-- Create buckets table
CREATE TABLE IF NOT EXISTS buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  version integer NOT NULL,
  json jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz DEFAULT now(),
  run_id uuid,
  UNIQUE(name, version)
);

-- Create indexes for buckets
CREATE INDEX IF NOT EXISTS idx_buckets_name_version ON buckets(name, version DESC);
CREATE INDEX IF NOT EXISTS idx_buckets_generated_at ON buckets(generated_at DESC);

-- Create script_definitions table
CREATE TABLE IF NOT EXISTS script_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text DEFAULT '',
  ts_code text NOT NULL,
  read_library boolean DEFAULT false,
  input_bucket_names jsonb DEFAULT '[]'::jsonb,
  output_bucket_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create runs table
CREATE TABLE IF NOT EXISTS runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_name text NOT NULL,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  logs text DEFAULT '',
  input_bucket_versions jsonb DEFAULT '{}'::jsonb,
  output_bucket_name text,
  output_bucket_version integer
);

-- Create index for runs
CREATE INDEX IF NOT EXISTS idx_runs_script_name ON runs(script_name);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON runs(started_at DESC);

-- Add foreign key from buckets to runs
ALTER TABLE buckets
  DROP CONSTRAINT IF EXISTS fk_buckets_run_id;

ALTER TABLE buckets
  ADD CONSTRAINT fk_buckets_run_id
  FOREIGN KEY (run_id) REFERENCES runs(id)
  ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE library_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;

-- Create policies (MVP: allow all operations for authenticated users)
CREATE POLICY "Allow all operations on library_items"
  ON library_items FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on buckets"
  ON buckets FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on script_definitions"
  ON script_definitions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on runs"
  ON runs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);