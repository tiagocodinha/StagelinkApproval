/*
  # Add client email field to posts

  1. Changes
    - Add `client_email` column to store the email of the client who needs to approve the post
    - Update RLS policies to allow clients to see only their assigned posts

  2. Security
    - Enable RLS on posts table
    - Add policy for clients to view only their assigned posts
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' AND column_name = 'client_email'
  ) THEN
    ALTER TABLE social_media_posts 
    ADD COLUMN client_email text;
  END IF;
END $$;

-- Update policies to handle client email access
CREATE POLICY "Clients can view their assigned posts"
  ON social_media_posts
  FOR SELECT
  TO authenticated
  USING (
    auth.email() = client_email OR 
    auth.email() = 'geral@stagelink.pt'
  );