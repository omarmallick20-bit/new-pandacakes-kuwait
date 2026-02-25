-- Remove profile pictures storage bucket and policies
-- This removes the custom upload functionality while keeping OAuth profile pictures

-- Remove all policies on the profile-pictures bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own avatar" ON storage.objects;

-- Delete the profile-pictures bucket
DELETE FROM storage.buckets WHERE id = 'profile-pictures';

-- Note: We keep the profile_picture_url column in Customers table
-- This allows OAuth providers (Google, Apple) to still provide profile pictures