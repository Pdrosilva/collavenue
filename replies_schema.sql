-- Run this against your Supabase database to enable threaded comment replies

ALTER TABLE public.comments 
ADD COLUMN parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- Optional but recommended for faster descendant lookups
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
