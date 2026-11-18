-- Execute no SQL Editor do Supabase para ativar o histórico compartilhado sem login.
begin;
create table if not exists public.checklist_extintores_rondas (
 id uuid primary key default gen_random_uuid(),
 usuario_id uuid not null references auth.users(id) on delete cascade,
 empresa_id uuid not null,
 empresa_nome text not null default '',
 dados jsonb not null default '{}'::jsonb,
 data_inspecao timestamptz not null default now(),
 atualizado_em timestamptz not null default now()
);
create index if not exists checklist_extintores_rondas_usuario_data_idx on public.checklist_extintores_rondas(usuario_id, data_inspecao desc);
create index if not exists checklist_extintores_rondas_empresa_idx on public.checklist_extintores_rondas(empresa_id);
alter table public.checklist_extintores_rondas enable row level security;
drop policy if exists "extintores_select_own" on public.checklist_extintores_rondas;
drop policy if exists "extintores_insert_own" on public.checklist_extintores_rondas;
drop policy if exists "extintores_update_own" on public.checklist_extintores_rondas;
create policy "extintores_select_own" on public.checklist_extintores_rondas for select to authenticated using (usuario_id=auth.uid());
create policy "extintores_insert_own" on public.checklist_extintores_rondas for insert to authenticated with check (usuario_id=auth.uid());
create policy "extintores_update_own" on public.checklist_extintores_rondas for update to authenticated using (usuario_id=auth.uid()) with check (usuario_id=auth.uid());
grant select,insert,update on public.checklist_extintores_rondas to authenticated;

-- O módulo usa o mesmo acesso anônimo do Checklist geral.
-- As fotos e rondas são acessíveis com a chave pública do projeto.
alter table public.checklist_extintores_rondas alter column usuario_id drop not null;
alter table public.checklist_extintores_rondas drop constraint if exists checklist_extintores_rondas_usuario_id_fkey;
alter table public.checklist_extintores_rondas add constraint checklist_extintores_rondas_usuario_id_fkey
  foreign key (usuario_id) references auth.users(id) on delete set null;

revoke all on public.checklist_extintores_rondas from public, anon;
grant select (id, empresa_id, empresa_nome, dados, data_inspecao, atualizado_em),
      insert (id, empresa_id, empresa_nome, dados, data_inspecao, atualizado_em),
      update (empresa_id, empresa_nome, dados, data_inspecao, atualizado_em)
on public.checklist_extintores_rondas to anon;

drop policy if exists extintores_select_compartilhado on public.checklist_extintores_rondas;
drop policy if exists extintores_insert_compartilhado on public.checklist_extintores_rondas;
drop policy if exists extintores_update_compartilhado on public.checklist_extintores_rondas;
create policy extintores_select_compartilhado on public.checklist_extintores_rondas
  for select to anon using (true);
create policy extintores_insert_compartilhado on public.checklist_extintores_rondas
  for insert to anon with check (usuario_id is null);
create policy extintores_update_compartilhado on public.checklist_extintores_rondas
  for update to anon using (true) with check (true);

notify pgrst, 'reload schema';
commit;
