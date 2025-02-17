/*
  # Add media support to social media posts

  1. Changes
    - Add `media_url` column to store the URL of uploaded media
    - Add `media_type` column to distinguish between image and video content

  2. Security
    - Maintain existing RLS policies
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'media_url'
  ) THEN
    ALTER TABLE social_media_posts 
    ADD COLUMN media_url text,
    ADD COLUMN media_type text CHECK (media_type IN ('image', 'video'));
  END IF;
END $$;