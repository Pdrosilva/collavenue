-- Este comando adiciona as tabelas necessárias à publicação do Supabase Realtime
-- Isso faz com que o banco de dados envie um evento para o site sempre que houver Inserção/Edição/Deleção.

begin;
  -- Verifica e tenta adicionar a tabela comments
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'comments'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE comments;
    END IF;
  END
  $$;

  -- Verifica e tenta adicionar a tabela notifications
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
  END
  $$;
commit;
