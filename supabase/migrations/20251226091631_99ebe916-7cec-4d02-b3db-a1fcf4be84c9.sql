-- Create storage bucket for promo images
INSERT INTO storage.buckets (id, name, public)
VALUES ('promo-images', 'promo-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for promo images bucket
CREATE POLICY "Anyone can view promo images"
ON storage.objects FOR SELECT
USING (bucket_id = 'promo-images');

CREATE POLICY "Authenticated users can upload promo images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promo-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own promo images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'promo-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own promo images"
ON storage.objects FOR DELETE
USING (bucket_id = 'promo-images' AND auth.role() = 'authenticated');