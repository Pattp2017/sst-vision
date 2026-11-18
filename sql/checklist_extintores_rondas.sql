-- Execute no SQL Editor do Supabase antes de ativar a sincronização.
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

-- Compartilha as rondas entre contas identificadas, inclusive as antigas.
-- Sessões anônimas antigas continuam limitadas às próprias rondas.
drop policy if exists extintores_select_equipe on public.checklist_extintores_rondas;
drop policy if exists extintores_update_equipe on public.checklist_extintores_rondas;

create policy extintores_select_equipe on public.checklist_extintores_rondas
  for select to authenticated
  using ((select auth.jwt() ->> 'is_anonymous') = 'false');

create policy extintores_update_equipe on public.checklist_extintores_rondas
  for update to authenticated
  using ((select auth.jwt() ->> 'is_anonymous') = 'false')
  with check ((select auth.jwt() ->> 'is_anonymous') = 'false');
