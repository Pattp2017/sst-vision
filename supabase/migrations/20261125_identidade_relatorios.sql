alter table public.empresa_configuracao
  add column if not exists cabecalho_url text,
  add column if not exists marca_dagua_url text,
  add column if not exists marca_dagua_opacidade numeric default 0.12,
  add column if not exists marca_dagua_posicao text default 'laterais';
