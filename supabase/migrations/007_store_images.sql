-- 가게/상품 이미지 저장 테이블
CREATE TABLE IF NOT EXISTS store_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('store', 'product')),
  target_id TEXT,  -- product ID (null for store image)
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_images_store_id ON store_images(store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_images_unique ON store_images(store_id, target_type, COALESCE(target_id, ''));

-- Supabase Storage bucket for store images
INSERT INTO storage.buckets (id, name, public) VALUES ('store-images', 'store-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read store images" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-images');

-- Allow authenticated uploads (owner/admin)
CREATE POLICY "Authenticated upload store images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'store-images');

CREATE POLICY "Authenticated update store images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'store-images');
