/*
  # Add Off-Plan Forecast Script

  This migration creates a script that generates purchase forecasts for items with zero stock.
  
  1. Script Details
    - Name: `off_plan_forecast`
    - Reads from: library data
    - Outputs to: `off_plan_forecast` bucket
    
  2. Calculation Logic
    - Identifies items with zero free stock
    - Calculates average daily velocity from historical sales
    - Determines optimal purchase quantity (30 days of stock)
    - Projects spend, revenue, and profit based on purchase quantities
    - Considers supplier costs and market pricing
    
  3. Output Format
    - `total_predicted_spend`: Total investment needed
    - `total_predicted_revenue`: Expected revenue from sales
    - `total_predicted_profit`: Net profit projection
    - `items`: Array of SKUs with detailed forecasts including velocity, optimal units, costs, and margins
*/

-- Insert the off-plan forecast script
INSERT INTO script_definitions (
  name,
  description,
  ts_code,
  read_library,
  input_bucket_names,
  output_bucket_name
) VALUES (
  'off_plan_forecast',
  'Generate purchase forecast for out-of-stock items',
  'export default function run({ LIBRARY = {}, BUCKETS = {} }) {
  const items = [];
  let totalSpend = 0;
  let totalRevenue = 0;
  let totalProfit = 0;

  for (const [sku, item] of Object.entries(LIBRARY)) {
    const freeStock = item.stock?.free || 0;
    
    // Only process items with zero stock
    if (freeStock > 0) continue;

    // Calculate velocity
    const allTimeSales = item.sales?.all_time || 0;
    const velocityPerDay = allTimeSales > 0 ? allTimeSales / 365 : 0;
    
    // Skip items with no sales history
    if (velocityPerDay === 0) continue;

    // Calculate optimal purchase quantity (30 days of stock)
    const optimalUnits = Math.ceil(velocityPerDay * 30);
    
    // Get costs
    const supplierCost = item.costs?.supplier_cost_eur || 0;
    const avgCost = item.costs?.avg_cost_eur || supplierCost;
    
    // Get pricing - prefer eneba_iwtr, fallback to RRP
    const enebaPrice = item.eneba?.iwtr || 0;
    const rrpPrice = item.rrp?.EUR || 0;
    const sellingPrice = enebaPrice > 0 ? enebaPrice : rrpPrice;
    
    // Skip if no valid pricing
    if (sellingPrice === 0 || avgCost === 0) continue;

    // Calculate financials
    const predictedSpend = optimalUnits * avgCost;
    const predictedRevenue = optimalUnits * sellingPrice;
    const predictedProfit = predictedRevenue - predictedSpend;
    const predictedMargin = predictedRevenue > 0 ? predictedProfit / predictedRevenue : 0;

    totalSpend += predictedSpend;
    totalRevenue += predictedRevenue;
    totalProfit += predictedProfit;

    items.push({
      sku,
      title: item.title || "",
      publisher: item.publisher || "",
      velocity_per_day: velocityPerDay,
      optimal_units: optimalUnits,
      avg_cost_eur: avgCost,
      selling_price_eur: sellingPrice,
      predicted_spend: predictedSpend,
      predicted_revenue: predictedRevenue,
      predicted_profit: predictedProfit,
      predicted_margin: predictedMargin,
      eneba_iwtr: enebaPrice || null,
      supplier_cost: supplierCost || null
    });
  }

  // Sort by predicted profit descending
  items.sort((a, b) => b.predicted_profit - a.predicted_profit);

  return {
    total_predicted_spend: totalSpend,
    total_predicted_revenue: totalRevenue,
    total_predicted_profit: totalProfit,
    items
  };
}',
  true,
  '[]'::jsonb,
  'off_plan_forecast'
) ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  ts_code = EXCLUDED.ts_code,
  read_library = EXCLUDED.read_library,
  input_bucket_names = EXCLUDED.input_bucket_names,
  output_bucket_name = EXCLUDED.output_bucket_name,
  updated_at = now();