/*
  # Create Off-Plan Items Bucket

  This migration creates sample off-plan data showing items with velocity adjustments.
  
  1. Data Structure
    - Bucket name: `off_plan_items`
    - Contains items with velocity downlifts and stock warnings
    
  2. Sample Data (SKU 76813 - TEKKEN 8)
    - Critical status: 25% velocity downlift
    - Current velocity: 193.8 units/day (last 30 days)
    - Baseline velocity: 258.4 units/day (historical average)
    - Free stock: 884 units
    - Days of stock: 4.6 days at current velocity
    
  3. Traffic Light System
    - Red (critical): >20% velocity downlift
    - Orange (warning): 10-20% velocity downlift
    - Green (ok): <10% velocity downlift
*/

-- Insert sample off-plan bucket with TEKKEN 8 data
INSERT INTO buckets (name, version, json, run_id)
VALUES (
  'off_plan_items',
  1,
  '{
    "items": [
      {
        "sku": "76813",
        "title": "TEKKEN 8 Steam ROW",
        "publisher": "Bandai Namco Entertainment Inc.",
        "velocity_downlift": 0.25,
        "current_velocity": 193.8,
        "baseline_velocity": 258.4,
        "free_stock": 884,
        "days_of_stock": 4.56,
        "status": "critical"
      }
    ]
  }'::jsonb,
  NULL
);