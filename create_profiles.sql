-- 1. Cria a tabela public.profiles para guardar informações públicas do usuário
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Habilita o RLS (Segurança a nível de linha)
alter table public.profiles enable row level security;

-- 3. Cria a política que permite a TODOS os usuários LEREM os perfis
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

-- 4. Cria a política que permite ao usuário atualizar seu próprio perfil
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 5. Função que copia os dados de todo novo usuário que se cadastrar para a tabela profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$;

-- 6. Cria um "Gatilho" (Trigger) que roda a função acima toda vez que alguém cria conta na auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. IMPORTANTE: Popula a tabela 'profiles' com as contas que JÁ EXISTEM no seu banco de dados
insert into public.profiles (id, name, avatar_url)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  coalesce(raw_user_meta_data->>'avatar_url', '')
from auth.users
on conflict (id) do nothing;
