alter table profiles
  add column if not exists preferencias jsonb default '{}'::jsonb,
  add column if not exists localizacao jsonb default '{}'::jsonb;

notify pgrst, 'reload schema';
