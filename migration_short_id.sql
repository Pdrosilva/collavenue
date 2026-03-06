/*
 * Migration Script: Add Short ID (alias_id) to Workspaces
 * Run this in the Supabase SQL Editor.
 */

-- 1. Add the new alias_id column
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS alias_id TEXT UNIQUE;

-- 2. (Optional but recommended) Retroactively assign a pseudo-random alias_id
-- to any existing workspaces so their URLs won't break if accessed via shortlink 
-- in the future. We can substring the UUID just to have something there.
UPDATE public.workspaces
SET alias_id = SUBSTRING(REPLACE(id::text, '-', ''), 1, 8)
WHERE alias_id IS NULL;

-- 3. Ensure we have an index on alias_id since we will query by it
CREATE INDEX IF NOT EXISTS idx_workspaces_alias_id ON public.workspaces(alias_id);
