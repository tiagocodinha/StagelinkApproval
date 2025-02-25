/*
  # Add action column for post captions

  1. Changes
    - Add `action` column to `social_media_posts` table for storing post captions
    - Column is nullable to maintain compatibility with existing posts
    - Add text type to store caption content

  2. Notes
    - Safe migration that won't affect existing data
    - Maintains all existing RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'action'
  ) THEN
    ALTER TABLE social_media_posts 
    ADD COLUMN action text;
  END IF;
END $$;