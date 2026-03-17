/*
  # Fix Off-Plan Velocity Calculation

  Updates the off_plan_items_analysis script to correctly calculate velocity from sales data.
  
  Changes:
  - Projected velocity: sales_last_30d.total / 30 (30-day actual sales rate)
  - Current velocity: sales_last_7d.total / 7 (7-day actual sales rate)
  - Handles nested sales data structure correctly
*/

UPDATE script_definitions 
SET ts_code = 'export default function run({ LIBRARY = {} }) {
  const items = [];

  for (const [sku, item] of Object.entries(LIBRARY)) {
    const freeStock = item.stock?.free || 0;
    
    // Only process items with stock
    if (freeStock <= 0) continue;

    // Calculate projected velocity from 30-day sales
    const sales30dTotal = item.sales_last_30d?.total || 0;
    const projectedVelocity = sales30dTotal / 30;
    
    // Calculate current velocity from 7-day sales
    const sales7dTotal = item.sales_last_7d?.total || 0;
    const currentVelocity = sales7dTotal / 7;
    
    // Skip items with no recent sales data
    if (projectedVelocity === 0) continue;

    // Calculate days of stock at current velocity
    const daysOfStock = currentVelocity > 0 ? freeStock / currentVelocity : 999;
    
    // Calculate velocity ratio
    const velocityRatio = currentVelocity / projectedVelocity;
    
    // Determine status based on velocity ratio
    let status = "ok";
    if (velocityRatio < 0.5) {
      status = "critical";
    } else if (velocityRatio < 0.8) {
      status = "warning";
    }
    
    // Only include items that are off-plan (not "ok")
    if (status === "ok") continue;

    items.push({
      sku: String(sku),
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
updated_at = now()
WHERE name = 'off_plan_items_analysis';