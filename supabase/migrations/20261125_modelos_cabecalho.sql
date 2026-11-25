alter table public.empresa_configuracao
  add column if not exists cabecalho_config jsonb;
