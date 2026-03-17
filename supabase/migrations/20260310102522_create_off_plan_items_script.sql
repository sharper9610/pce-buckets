/*
  # Create Off-Plan Items Analysis Script

  This migration creates a script that identifies items with declining velocity patterns.
  
  1. Script Details
    - Name: `off_plan_items_analysis`
    - Reads from: library data
    - Outputs to: `off_plan_items` bucket
    
  2. Calculation Logic
    - Projected velocity: Uses sales_last_30d data (recent 30-day average)
    - Current velocity: Uses sales_last_7d data (recent 7-day trend)
    - Compares current vs projected to identify slowdowns
    - Only includes items with positive stock
    
  3. Status Classification
    - Critical (red): Current velocity < 50% of projected
    - Warning (orange): Current velocity 50-80% of projected
    - OK (green): Current velocity > 80% of projected
    
  4. Output Fields
    - sku, title, publisher
    - projected_velocity (30-day average)
    - current_velocity (7-day average)
    - free_stock
    - days_of_stock (at current velocity)
    - status (critical/warning/ok)
*/

-- Create or replace the off-plan items analysis script
INSERT INTO script_definitions (
  name,
  description,
  ts_code,
  read_library,
  input_bucket_names,
  output_bucket_name
) VALUES (
  'off_plan_items_analysis',
  'Identify items with declining velocity trends',
  'export default function run({ LIBRARY = {} }) {
  const items = [];

  for (const [sku, item] of Object.entries(LIBRARY)) {
    const freeStock = item.stock?.free || 0;
    
    // Only process items with stock
    if (freeStock <= 0) continue;

    // Calculate projected velocity (30-day average)
    const sales30d = item.sales_last_30d?.total || 0;
    const projectedVelocity = sales30d / 30;
    
    // Calculate current velocity (7-day average)
    const sales7d = item.sales_last_7d?.total || 0;
    const currentVelocity = sales7d / 7;
    
    // Skip items with no recent sales
    if (projectedVelocity === 0) continue;

    // Calculate days of stock
    const daysOfStock = currentVelocity > 0 ? freeStock / currentVelocity : 999;
    
    // Calculate velocity ratio
    const velocityRatio = currentVelocity / projectedVelocity;
    
    // Determine status
    let status = "ok";
    if (velocityRatio < 0.5) {
      status = "critical";
    } else if (velocityRatio < 0.8) {
      status = "warning";
    }
    
    // Only include items that are off-plan (not "ok")
    if (status === "ok") continue;

    items.push({
      sku,
      title: item.title || "",
      publisher: item.publisher || "",
      projected_velocity: Math.round(projectedVelocity * 10) / 10,
      current_velocity: Math.round(currentVelocity * 10) / 10,
      free_stock: freeStock,
      days_of_stock: Math.round(daysOfStock * 10) / 10,
      status
    });
  }

  // Sort by status priority (critical first), then by days of stock
  const statusPriority = { critical: 0, warning: 1, ok: 2 };
  items.sort((a, b) => {
    if (a.status !== b.status) {
      return statusPriority[a.status] - statusPriority[b.status];
    }
    return a.days_of_stock - b.days_of_stock;
  });

  return { items };
}',
  true,
  '[]'::jsonb,
  'off_plan_items'
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  ts_code = EXCLUDED.ts_code,
  read_library = EXCLUDED.read_library,
  input_bucket_names = EXCLUDED.input_bucket_names,
  output_bucket_name = EXCLUDED.output_bucket_name,
  updated_at = now();