/*
  # Add Publisher to Off-Plan Items Script

  Updates the off_plan_items_analysis script to properly include publisher data from the library items.
  
  Changes:
  - Ensures publisher field is populated from library data
*/

UPDATE script_definitions 
SET ts_code = 'export default function run({ LIBRARY = {} }) {
  const items = [];

  for (const [sku, item] of Object.entries(LIBRARY)) {
    const freeStock = item.stock?.free || 0;
    
    // Only process items with stock
    if (freeStock <= 0) continue;

    // Projected velocity: 30-day average (baseline)
    const sales30dTotal = item.sales_last_30d?.total || 0;
    const projectedVelocity = sales30dTotal / 30;
    
    // Current velocity: 7-day average (recent trend)
    const sales7dTotal = item.sales_last_7d?.total || 0;
    const currentVelocity = sales7dTotal / 7;
    
    // Skip items with no 30-day baseline
    if (projectedVelocity === 0) continue;

    // Calculate days of stock at current velocity
    const daysOfStock = currentVelocity > 0 ? freeStock / currentVelocity : 999;
    
    // Calculate velocity ratio (current vs projected)
    const velocityRatio = currentVelocity / projectedVelocity;
    
    // Determine status
    let status = "ok";
    if (velocityRatio < 0.5) {
      // Current velocity less than 50% of projected
      status = "critical";
    } else if (velocityRatio < 0.8) {
      // Current velocity 50-80% of projected
      status = "warning";
    }
    
    // Only include off-plan items (not "ok")
    if (status === "ok") continue;

    items.push({
      sku: String(sku),
      title: item.title || "",
      publisher: item.publisher || "Unknown Publisher",
      projected_velocity: Math.round(projectedVelocity * 10) / 10,
      current_velocity: Math.round(currentVelocity * 10) / 10,
      free_stock: freeStock,
      days_of_stock: Math.round(daysOfStock * 10) / 10,
      status,
      reason: "Not cheapest on eneba"
    });
  }

  // Sort by status priority, then days of stock
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