/* 
 * RUN THIS SCRIPT IN YOUR SUPABASE SQL EDITOR 
 * This script fixes the RLS policies blocking live dragging persistence and mention notifications.
 */

-- 1. Enable UPDATE on workspaces for authenticated users
-- Without this, when you drag an image and drop it, the database rejects the update.
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.workspaces;
CREATE POLICY "Enable update for users based on user_id" 
ON public.workspaces 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = created_by);

-- If you want ANY authenticated user to be able to move ANY image on the board (multiplayer editing):
DROP POLICY IF EXISTS "Enable update for all authenticated users" ON public.workspaces;
CREATE POLICY "Enable update for all authenticated users" 
ON public.workspaces 
FOR UPDATE 
TO authenticated 
USING (true);


-- 2. Fix notifications insert RLS policy
-- Previously, it was too strict or throwing errors matching exact UUID formats for actor_id.
-- Let's ensure any authenticated user can insert a mention notification.
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert notifications" 
ON public.notifications 
FOR INSERT 
TO authenticated 
WITH CHECK (true); -- Allow any authenticated user to trigger a notification (e.g. mentioning someone else)
