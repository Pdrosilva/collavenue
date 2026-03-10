begin;
  -- Verifica e tenta adicionar a tabela workspaces ao realtime
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'workspaces'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE workspaces;
    END IF;
  END
  $$;
commit;
