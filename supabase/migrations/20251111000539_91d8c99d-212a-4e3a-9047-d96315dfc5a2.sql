-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'category-images',
  'category-images',
  true,
  5242880, -- 5MB limit per image
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Create storage policies for category images
CREATE POLICY "Public can view category images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Service role can upload category images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Service role can update category images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'category-images')
WITH CHECK (bucket_id = 'category-images');

CREATE POLICY "Service role can delete category images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'category-images');