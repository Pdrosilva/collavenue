-- 1. Create notifications table
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null, -- Who receives the notification
  actor_id uuid references auth.users(id) on delete cascade not null, -- Who performed the action
  actor_name text not null,
  actor_avatar text not null,
  type text not null check (type in ('like', 'mention')),
  comment_id uuid references public.comments(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable RLS
alter table public.notifications enable row level security;

-- Users can only see their own notifications
create policy "Users can view their own notifications"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can only insert notifications (like mentioning a user or liking their comment)
create policy "Users can insert notifications"
  on public.notifications for insert
  to authenticated
  with check (auth.uid() = actor_id);

-- Users can only update their own notifications (to mark as read)
create policy "Users can update their own notifications"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

-- Users can delete their own notifications
create policy "Users can delete their own notifications"
  on public.notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- 3. Create RPC to search users for mentions
-- We need SECURITY DEFINER so we can query auth.users from the public API
create or replace function public.search_users(search_term text default '')
returns table(id uuid, email varchar, full_name text, avatar_url text)
language plpgsql
security definer
as $$
begin
  return query
  select 
    au.id, 
    au.email,
    -- Extract full_name from raw_user_meta_data or fallback to email local part
    coalesce((au.raw_user_meta_data->>'full_name')::text, split_part(au.email, '@', 1)) as full_name,
    -- Extract avatar_url or return null
    (au.raw_user_meta_data->>'avatar_url')::text as avatar_url
  from auth.users au
  where
    search_term = '' or 
    (au.raw_user_meta_data->>'full_name') ilike '%' || search_term || '%' or
    au.email ilike '%' || search_term || '%'
  order by full_name
  limit 20;
end;
$$;
