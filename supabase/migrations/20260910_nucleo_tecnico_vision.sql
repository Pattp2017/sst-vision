-- SST Vision - Núcleo técnico de inspeção assistida
-- Fase 1: preservação de evidência, raciocínio técnico e validação profissional.
-- Compatível com registros existentes: somente adiciona colunas.

alter table if exists public.vision_achados
  add column if not exists categoria text,
  add column if not exists contexto_visual text,
  add column if not exists perigo text,
  add column if not exists evento_possivel text,
  add column if not exists possivel_consequencia text,
  add column if not exists estado_evidencia text,
  add column if not exists hierarquia_controle text,
  add column if not exists medida_sugerida text,
  add column if not exists status_validacao text default 'confirmado',
  add column if not exists decisao_profissional text,
  add column if not exists dados_tecnicos jsonb default '{}'::jsonb;

comment on column public.vision_achados.estado_evidencia is
  'Estado visual da evidência: observado, parcialmente_visivel ou nao_confirmavel.';

comment on column public.vision_achados.status_validacao is
  'Estado da validação humana do achado: pendente, confirmado ou rejeitado.';

comment on column public.vision_achados.decisao_profissional is
  'Decisão registrada pelo profissional responsável; a IA nunca encerra o achado sozinha.';

comment on column public.vision_achados.dados_tecnicos is
  'Snapshot estruturado do raciocínio assistido: contexto, perigo, evento, consequência, medida e demais metadados.';

create index if not exists vision_achados_status_validacao_idx
  on public.vision_achados (status_validacao);
