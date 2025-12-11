-- Update created_by and updated_by fields to UUID type for user tracking

-- Update tbl_collection
ALTER TABLE public.tbl_collection
ALTER COLUMN created_by TYPE UUID USING created_by::uuid,
ALTER COLUMN updated_by TYPE UUID USING updated_by::uuid;

-- Update tbl_collection_detail  
ALTER TABLE public.tbl_collection_detail
ALTER COLUMN created_by TYPE UUID USING created_by::uuid,
ALTER COLUMN updated_by TYPE UUID USING updated_by::uuid;

-- Update tbl_purchase
ALTER TABLE public.tbl_purchase
ALTER COLUMN created_by TYPE UUID USING created_by::uuid,
ALTER COLUMN updated_by TYPE UUID USING updated_by::uuid;

-- Add foreign key constraints to auth.users
ALTER TABLE public.tbl_collection
ADD CONSTRAINT fk_collection_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_collection_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tbl_collection_detail
ADD CONSTRAINT fk_detail_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_detail_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tbl_purchase
ADD CONSTRAINT fk_purchase_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_purchase_updated_by FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

