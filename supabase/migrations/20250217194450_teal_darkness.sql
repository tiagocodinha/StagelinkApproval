/*
  # Fix storage configuration

  1. Changes
    - Create media storage bucket
    - Set up storage policies for authenticated users
*/

-- Create the media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('media', 'media')
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload media
CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

-- Allow authenticated users to read media
CREATE POLICY "Anyone can view media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'media');

-- Allow users to delete their own media
CREATE POLICY "Users can delete own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);