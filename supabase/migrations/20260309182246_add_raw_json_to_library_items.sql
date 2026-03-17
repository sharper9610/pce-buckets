/*
  # Add raw_json column to library_items

  1. Changes
    - Add `raw_json` column to `library_items` table to store original JSON formatting
    - This preserves the exact formatting of uploaded JSON files
  
  2. Notes
    - Existing items will have NULL raw_json and fall back to formatted JSON
    - New uploads will preserve original formatting
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'library_items' AND column_name = 'raw_json'
  ) THEN
    ALTER TABLE library_items ADD COLUMN raw_json text;
  END IF;
END $$;