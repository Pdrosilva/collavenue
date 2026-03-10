-- 1. Cria o bucket de storage "images" (se não existir) e o define como público (Public)
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do update set public = true;

-- NOTA: Removemos o comando "alter table" porque o Supabase já deixa o RLS 
-- do storage ativado por padrão, e tentar alterar a tabela gera erro de permissões.

-- 2. Política: Permite que qualquer pessoa (pública) possa visualizar/ler as imagens
create policy "Permitir leitura publica de imagens"
on storage.objects for select
to public
using ( bucket_id = 'images' );

-- 3. Política: Permite que usuários autenticados façam upload de imagens
create policy "Permitir upload para usuarios autenticados"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'images' );

-- 4. Política: Permite que os usuários deletem as imagens que eles mesmos enviaram
create policy "Permitir delecao da propria imagem"
on storage.objects for delete
to authenticated
using ( bucket_id = 'images' and auth.uid() = owner );
