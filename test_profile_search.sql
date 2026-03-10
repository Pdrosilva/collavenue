-- Rode isso no SQL Editor do Supabase de Produção para testar se a busca
-- de usuários encontra alguém quando o "@nome" é todo minúsculo:
select id, name from profiles where name ilike '%amanda%';
