-- 1. Create comment_likes table
create table public.comment_likes (
  user_id uuid references auth.users(id) on delete cascade not null,
  comment_id uuid references public.comments(id) on delete cascade not null,
  primary key (user_id, comment_id)
);

-- 2. Enable RLS
alter table public.comment_likes enable row level security;
create policy "Allow all authenticated to read comment_likes" on public.comment_likes for select to authenticated using (true);
create policy "Allow owner to insert" on public.comment_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "Allow owner to delete" on public.comment_likes for delete to authenticated using (auth.uid() = user_id);

-- 3. Create a trigger to automatically update the stars count on comments
create or replace function public.update_comment_stars()
returns trigger
language plpgsql
security definer
as $$
begin
  if (TG_OP = 'INSERT') then
    update public.comments set stars = stars + 1 where id = new.comment_id;
  elsif (TG_OP = 'DELETE') then
    update public.comments set stars = stars - 1 where id = old.comment_id;
  end if;
  return null;
end;
$$;

create trigger on_comment_like_toggle
after insert or delete on public.comment_likes
for each row execute function public.update_comment_stars();
