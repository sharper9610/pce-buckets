/*
  # Create saved orders table

  1. New Tables
    - `saved_orders`
      - `id` (uuid, primary key) - Unique identifier for the saved order
      - `sku` (bigint) - Product SKU from buy plan
      - `currency` (text) - Currency code (USD, EUR, etc)
      - `quantity` (integer) - Number of units to order
      - `bucket_name` (text) - Buy plan bucket name (e.g., buy_plan_v4)
      - `created_at` (timestamptz) - When the order was saved
      - `updated_at` (timestamptz) - When the order was last updated

  2. Security
    - Enable RLS on `saved_orders` table
    - Add policy for public read access (since app has no auth)
    - Add policy for public insert/update/delete access

  3. Indexes
    - Add composite index on (sku, currency, bucket_name) for fast lookups
    - Add index on bucket_name for filtering

  4. Constraints
    - Unique constraint on (sku, currency, bucket_name) to prevent duplicates
*/

CREATE TABLE IF NOT EXISTS saved_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku bigint NOT NULL,
  currency text NOT NULL,
  quantity integer NOT NULL DEFAULT 0,
  bucket_name text NOT NULL DEFAULT 'buy_plan_v4',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE saved_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read saved orders"
  ON saved_orders
  FOR SELECT
  USING (true);

CREATE POLICY "Public can insert saved orders"
  ON saved_orders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update saved orders"
  ON saved_orders
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can delete saved orders"
  ON saved_orders
  FOR DELETE
  USING (true);

CREATE UNIQUE INDEX IF NOT EXISTS saved_orders_sku_currency_bucket_idx 
  ON saved_orders(sku, currency, bucket_name);

CREATE INDEX IF NOT EXISTS saved_orders_bucket_name_idx 
  ON saved_orders(bucket_name);