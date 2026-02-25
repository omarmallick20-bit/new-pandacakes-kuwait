-- Drop the duplicate trigger that's causing BakePoints to be awarded twice
-- Keep award_loyalty_points_trigger which handles INSERT OR UPDATE with proper guards
DROP TRIGGER IF EXISTS trigger_award_loyalty_points ON orders;