-- Aplicar depois de checklist_extintores_rondas.sql.
begin;
alter table public.checklist_itens_mestre
  add column if not exists extintor_ordem smallint check (extintor_ordem > 0),
  add column if not exists extintor_legado smallint unique check (extintor_legado >= 0);

do $$
declare
  padrao record;
  existente public.checklist_itens_mestre.id%type;
begin
  for padrao in select * from (values
  (0, 'Extintor instalado no local previsto?', 'Instalar ou reposicionar o extintor no local definido no projeto de segurança contra incêndio, garantindo sua identificação e acesso.'),
  (1, 'Acesso livre e desobstruído?', 'Desobstruir imediatamente o acesso ao extintor e manter a área livre de materiais e equipamentos.'),
  (2, 'Sinalização visível e adequada?', 'Instalar ou substituir a sinalização de identificação do extintor, garantindo visibilidade conforme projeto e normas aplicáveis.'),
  (3, 'Altura e instalação adequadas?', 'Corrigir a fixação e a altura de instalação do extintor conforme as exigências técnicas aplicáveis.'),
  (4, 'Adequado à classe de incêndio?', 'Conferir a classe de risco do ambiente e substituir ou adequar o agente extintor à classe de incêndio prevista no projeto.'),
  (5, 'Lacre e dispositivo de segurança íntegros?', 'Retirar o extintor de uso e encaminhar para inspeção/manutenção por empresa habilitada; substituir provisoriamente por unidade adequada.'),
  (6, 'Manômetro na faixa de operação (quando existente)?', 'Encaminhar o extintor para avaliação técnica da pressão e manutenção, substituindo-o por unidade apta enquanto estiver indisponível.'),
  (7, 'Mangueira, bico e componentes íntegros?', 'Providenciar inspeção e substituição ou reparo dos componentes danificados por empresa de manutenção habilitada.'),
  (8, 'Cilindro sem corrosão, danos ou vazamento aparente?', 'Retirar o extintor de uso e encaminhar para avaliação técnica de corrosão, danos ou vazamentos; providenciar substituição quando necessário.'),
  (9, 'Rótulo e instruções legíveis?', 'Substituir ou regularizar o rótulo e as instruções de operação para assegurar leitura e identificação adequadas.'),
  (10, 'Etiqueta de manutenção legível?', 'Regularizar a etiqueta de manutenção e a identificação do serviço realizado junto à empresa responsável.'),
  (11, 'Manutenção dentro do prazo aplicável?', 'Encaminhar o extintor para inspeção/manutenção conforme o prazo e as condições aplicáveis, disponibilizando unidade substituta durante o serviço.'),
  (12, 'Identificação e rastreabilidade disponíveis?', 'Regularizar o número de identificação e os registros de rastreabilidade do extintor, conferindo os dados com o controle de manutenção.'),
  (13, 'Condições gerais adequadas?', 'Corrigir as irregularidades identificadas, solicitar avaliação técnica quando necessária e manter extintor adequado disponível no local.')
  ) as itens(posicao, descricao, medida)
  loop
    if exists (select 1 from public.checklist_itens_mestre where extintor_legado = padrao.posicao) then
      continue;
    end if;
    select id into existente from public.checklist_itens_mestre
      where extintor_legado is null and lower(trim(descricao)) = lower(trim(padrao.descricao))
      order by ativo desc, id limit 1;
    if found then
      update public.checklist_itens_mestre set
        extintor_legado = padrao.posicao,
        extintor_ordem = coalesce(extintor_ordem, padrao.posicao + 1),
        medida_corretiva_recomendada = coalesce(medida_corretiva_recomendada, padrao.medida)
      where id = existente;
    else
      insert into public.checklist_itens_mestre
        (descricao, medida_corretiva_recomendada, ativo, extintor_legado, extintor_ordem)
      values (padrao.descricao, padrao.medida, true, padrao.posicao, padrao.posicao + 1);
    end if;
  end loop;
end;
$$;

create table if not exists public.checklist_extintores_foto_sequencias (
  item text not null,
  empresa text not null,
  periodo text not null,
  ultimo bigint not null,
  primary key (item, empresa, periodo)
);
alter table public.checklist_extintores_foto_sequencias enable row level security;
revoke all on public.checklist_extintores_foto_sequencias from public, anon, authenticated;

create or replace function public.checklist_extintores_numerar_fotos()
returns trigger language plpgsql security definer set search_path = pg_catalog
as $$
declare
  equipamento record;
  ocorrencia record;
  foto record;
  anterior jsonb;
  detalhe_anterior jsonb;
  detalhe jsonb;
  item_id text;
  foto_id text;
  codigo text;
  periodo text := to_char(new.data_inspecao at time zone 'UTC', 'MM-YYYY');
  ids jsonb;
  codigos jsonb;
  ids_antigos jsonb;
  posicao_antiga integer;
  numero bigint;
begin
  if tg_op = 'INSERT' then
    -- Serializa tentativas de inserir a mesma ronda, inclusive após falha de rede.
    perform pg_advisory_xact_lock(hashtextextended('extintores:' || new.id::text, 0));
    if exists (select 1 from public.checklist_extintores_rondas where id = new.id) then
      return new;
    end if;
  end if;
  if jsonb_typeof(new.dados -> 'extintores') is distinct from 'array' then
    return new;
  end if;
  for equipamento in
    select valor, (ordem - 1)::integer as posicao
    from jsonb_array_elements(new.dados -> 'extintores') with ordinality as e(valor, ordem)
  loop
    if jsonb_typeof(equipamento.valor -> 'detalhes') is distinct from 'object' then continue; end if;
    anterior := null;
    if tg_op = 'UPDATE' then
      select e.valor into anterior
      from jsonb_array_elements(
        case when jsonb_typeof(old.dados -> 'extintores') = 'array'
             then old.dados -> 'extintores' else '[]'::jsonb end
      ) as e(valor)
      where e.valor ->> 'id' = equipamento.valor ->> 'id'
      limit 1;
    end if;
    for ocorrencia in select key, value from jsonb_each(equipamento.valor -> 'detalhes')
    loop
      detalhe := ocorrencia.value;
      if ocorrencia.key !~ '^[0-9]{1,5}$' or
         jsonb_typeof(detalhe -> 'fotos') is distinct from 'array' then continue; end if;
      item_id := new.dados -> 'itens_extintores' -> ocorrencia.key::integer ->> 'id';
      if item_id is null and not (new.dados ? 'itens_extintores') then
        select id::text into item_id from public.checklist_itens_mestre
          where extintor_legado = ocorrencia.key::integer;
      end if;
      if item_id is null or not exists (
        select 1 from public.checklist_itens_mestre where id::text = item_id
      ) then continue; end if;

      detalhe_anterior := anterior -> 'detalhes' -> ocorrencia.key;
      ids_antigos := detalhe_anterior -> 'foto_ids';
      ids := '[]'::jsonb;
      codigos := '[]'::jsonb;
      for foto in
        select valor, (ordem - 1)::integer as posicao
        from jsonb_array_elements(detalhe -> 'fotos') with ordinality as f(valor, ordem)
      loop
        foto_id := detalhe -> 'foto_ids' ->> foto.posicao;
        posicao_antiga := null;
        if foto_id is not null and jsonb_typeof(ids_antigos) = 'array' then
          select (ordem - 1)::integer into posicao_antiga
          from jsonb_array_elements_text(ids_antigos) with ordinality as f(id, ordem)
          where f.id = foto_id limit 1;
        elsif foto_id is null and detalhe_anterior -> 'fotos' -> foto.posicao = foto.valor then
          posicao_antiga := foto.posicao;
          foto_id := ids_antigos ->> posicao_antiga;
        end if;
        foto_id := coalesce(foto_id, gen_random_uuid()::text);
        codigo := null;
        if posicao_antiga is not null
           and detalhe_anterior -> 'fotos' -> posicao_antiga = foto.valor then
          codigo := detalhe_anterior -> 'foto_codigos' ->> posicao_antiga;
        end if;
        if codigo is null then
          insert into public.checklist_extintores_foto_sequencias as s (item, empresa, periodo, ultimo)
          values (item_id, new.empresa_id::text, periodo, 1)
          on conflict on constraint checklist_extintores_foto_sequencias_pkey
          do update set ultimo = s.ultimo + 1
          returning ultimo into numero;
          codigo := concat_ws('-', item_id, new.empresa_id, periodo,
            lpad(numero::text, greatest(2, length(numero::text)), '0'));
        end if;
        ids := ids || jsonb_build_array(foto_id);
        codigos := codigos || jsonb_build_array(codigo);
      end loop;
      new.dados := jsonb_set(new.dados,
        array['extintores', equipamento.posicao::text, 'detalhes', ocorrencia.key],
        detalhe || jsonb_build_object('foto_ids', ids, 'foto_codigos', codigos));
    end loop;
  end loop;
  return new;
end;
$$;

revoke all on function public.checklist_extintores_numerar_fotos() from public, anon, authenticated;
drop trigger if exists checklist_extintores_numerar_fotos on public.checklist_extintores_rondas;
create trigger checklist_extintores_numerar_fotos
before insert or update of dados on public.checklist_extintores_rondas
for each row execute function public.checklist_extintores_numerar_fotos();

notify pgrst, 'reload schema';
commit;
