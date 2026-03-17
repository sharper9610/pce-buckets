/*
  # Remove Adaptive Buy Plan Script
  
  1. Changes
    - Deletes adaptive-buy-plan script definition
    - Removes buy_plan bucket data
    - Removes adaptive-buy-plan bucket data
*/

DELETE FROM script_definitions WHERE name = 'adaptive-buy-plan';

DELETE FROM buckets WHERE name IN ('buy_plan', 'adaptive-buy-plan');