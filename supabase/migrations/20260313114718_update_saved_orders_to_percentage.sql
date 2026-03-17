/*
  # Update saved orders to use percentage ratios

  1. Changes
    - Rename `quantity` column to `percentage` 
    - Change data type from integer to numeric (to support decimal percentages)
    - Update column to store percentage of demand (0-100)
    - Add comment explaining the percentage represents allocation of forecasted demand

  2. Notes
    - This allows saved allocation strategies to adapt dynamically to changing velocity
    - When demand forecast changes, the actual quantity orders will recalculate automatically
    - Percentages should sum to 100 or less for each SKU across all currencies
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_orders' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE saved_orders RENAME COLUMN quantity TO percentage;
    ALTER TABLE saved_orders ALTER COLUMN percentage TYPE numeric(5,2);
    COMMENT ON COLUMN saved_orders.percentage IS 'Percentage (0-100) of forecasted demand to allocate to this currency';
  END IF;
END $$;