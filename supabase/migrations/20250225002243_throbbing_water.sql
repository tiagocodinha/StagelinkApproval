/*
  # Add scheduled date and update platform options

  1. Changes
    - Add scheduled_date column if it doesn't exist
    - Update platform enum values
    - Add check constraint for valid platforms

  2. Security
    - Maintain existing RLS policies
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

  -- Update platform check constraint
  ALTER TABLE social_media_posts 
  DROP CONSTRAINT IF EXISTS social_media_posts_platform_check;

  ALTER TABLE social_media_posts
  ADD CONSTRAINT social_media_posts_platform_check 
  CHECK (platform IN ('storie', 'post', 'reels', 'tiktok'));
END $$;