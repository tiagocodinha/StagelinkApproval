/*
  # Add caption column to social_media_posts table

  1. Changes
    - Add `caption` column to store post captions
    - Migrate content to caption for existing posts
    - Drop content column

  2. Notes
    - Uses safe migration pattern to preserve existing data
*/

DO $$ 
BEGIN
  -- Add caption column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'caption'
  ) THEN
    ALTER TABLE social_media_posts 
    ADD COLUMN caption text;
  END IF;

  -- Migrate data from content to caption if content exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'content'
  ) THEN
    -- Copy data from content to caption
    UPDATE social_media_posts
    SET caption = content
    WHERE caption IS NULL AND content IS NOT NULL;

    -- Drop content column
    ALTER TABLE social_media_posts
    DROP COLUMN content;
  END IF;

  -- Make caption required
  ALTER TABLE social_media_posts
  ALTER COLUMN caption SET NOT NULL;
END $$;