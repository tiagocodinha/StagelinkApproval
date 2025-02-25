/*
  # Update platform options and add scheduled date

  1. Changes
    - Add scheduled_date column if it doesn't exist
    - Update existing platform values to match new options
    - Add platform check constraint
    
  2. Notes
    - Updates existing data to conform to new platform options
    - Handles constraint addition safely
*/

DO $$ 
BEGIN
  -- Add scheduled_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE social_media_posts 
    ADD COLUMN scheduled_date timestamptz;
  END IF;

  -- Update existing platform values to match new options
  UPDATE social_media_posts
  SET platform = CASE
    WHEN platform = 'instagram' THEN 'post'
    WHEN platform = 'facebook' THEN 'post'
    WHEN platform = 'twitter' THEN 'post'
    WHEN platform = 'linkedin' THEN 'post'
    ELSE platform
  END
  WHERE platform NOT IN ('storie', 'post', 'reels', 'tiktok');

  -- Drop existing constraint if it exists
  ALTER TABLE social_media_posts 
  DROP CONSTRAINT IF EXISTS social_media_posts_platform_check;

  -- Add new constraint after data is updated
  ALTER TABLE social_media_posts
  ADD CONSTRAINT social_media_posts_platform_check 
  CHECK (platform IN ('storie', 'post', 'reels', 'tiktok'));
END $$;