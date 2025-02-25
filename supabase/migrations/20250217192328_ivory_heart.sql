/*
  # Initial Schema Setup for Social Media Approval System

  1. New Tables
    - `social_media_posts`
      - `id` (uuid, primary key)
      - `content` (text) - The social media post content
      - `platform` (text) - The social media platform
      - `status` (text) - Current approval status
      - `created_at` (timestamp)
      - `approved_at` (timestamp)
      - `user_id` (uuid) - Reference to auth.users

  2. Security
    - Enable RLS on `social_media_posts` table
    - Add policies for authenticated users to read and update their assigned posts
*/

CREATE TABLE social_media_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  user_id uuid REFERENCES auth.users NOT NULL
);

ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their assigned posts"
  ON social_media_posts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their assigned posts"
  ON social_media_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);