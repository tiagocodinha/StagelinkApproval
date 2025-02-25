/*
  # Add scheduled date to social media posts

  1. Changes
    - Add scheduled_date column to social_media_posts table
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'scheduled_date'
  ) THEN
    ALTER TABLE social_media_posts 
    ADD COLUMN scheduled_date timestamptz;
  END IF;
END $$;