/*
  # Add Performance Indexes for Library Items

  1. Indexes Added
    - `idx_library_items_updated_at` - Speeds up sorting by updated_at
    - `idx_library_items_sku_lower` - Speeds up case-insensitive SKU searches
    - `idx_library_items_title_lower` - Speeds up case-insensitive title searches
    - `idx_library_items_publisher` - Speeds up filtering by publisher using GIN index on jsonb

  2. Notes
    - These indexes will significantly improve query performance for:
      - Pagination queries ordered by updated_at
      - Search queries on SKU and title
      - Publisher filtering
    - With 5000+ items, these indexes are critical for performance
*/

CREATE INDEX IF NOT EXISTS idx_library_items_updated_at 
  ON library_items(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_library_items_sku_lower 
  ON library_items(LOWER(sku));

CREATE INDEX IF NOT EXISTS idx_library_items_title_lower 
  ON library_items(LOWER(title));

CREATE INDEX IF NOT EXISTS idx_library_items_publisher 
  ON library_items USING GIN ((json->'publisher'));

CREATE INDEX IF NOT EXISTS idx_library_items_publisher_name 
  ON library_items USING GIN ((json->'publisher_name'));