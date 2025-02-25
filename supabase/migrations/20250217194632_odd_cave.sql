/*
  # Update policies for client access

  1. Changes
    - Drop and recreate policies for proper access control
    - Ensure Stagelink has full access
    - Allow clients to view and update their assigned posts
*/

-- First, drop all existing policies
DO $$ 
BEGIN
  -- Drop policies if they exist
  DROP POLICY IF EXISTS "Users can read their assigned posts" ON social_media_posts;
  DROP POLICY IF EXISTS "Users can update their assigned posts" ON social_media_posts;
  DROP POLICY IF EXISTS "Stagelink can manage all posts" ON social_media_posts;
  DROP POLICY IF EXISTS "Clients can view their assigned posts" ON social_media_posts;
  DROP POLICY IF EXISTS "Clients can update their assigned posts" ON social_media_posts;
END $$;

-- Create new policies with proper access control
DO $$ 
BEGIN
  -- Create policy for Stagelink to manage all posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'social_media_posts' 
    AND policyname = 'Stagelink can manage all posts'
  ) THEN
    CREATE POLICY "Stagelink can manage all posts"
    ON social_media_posts
    FOR ALL
    TO authenticated
    USING (auth.email() = 'geral@stagelink.pt')
    WITH CHECK (auth.email() = 'geral@stagelink.pt');
  END IF;

  -- Create policy for clients to view their assigned posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'social_media_posts' 
    AND policyname = 'Client access policy'
  ) THEN
    CREATE POLICY "Client access policy"
    ON social_media_posts
    FOR SELECT
    TO authenticated
    USING (
      auth.email() = client_email OR 
      auth.email() = 'geral@stagelink.pt'
    );
  END IF;

  -- Create policy for clients to update their assigned posts
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'social_media_posts' 
    AND policyname = 'Client update policy'
  ) THEN
    CREATE POLICY "Client update policy"
    ON social_media_posts
    FOR UPDATE
    TO authenticated
    USING (auth.email() = client_email)
    WITH CHECK (auth.email() = client_email AND status IN ('approved', 'rejected'));
  END IF;
END $$;