(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  async function buscar(path){
    const cfg=window.SUPABASE_CONFIG||{};
    if(!cfg.url||!cfg.anonKey)throw new Error('Configuração do sistema indisponível.');
    const response=await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/'+path,{headers:{apikey:cfg.anonKey,Authorization:'Bearer '+cfg.anonKey,Accept:'application/json'}});
    if(!response.ok)throw new Error('Não foi possível carregar os cadastros.');
    return response.json();
  }
  window.renderDocumentosAvulsosGithub=async()=>{
    const area=document.getElementById('conteudoPrincipal');
    area.innerHTML=`<div class="card"><span class="status">Documentos avulsos</span><h2 style="margin-top:14px">Lista de presença sem participantes</h2><p style="color:#64748b;line-height:1.6">Gere uma lista com linhas em branco para preencher nomes, CPFs e assinaturas durante o treinamento. Não é necessário criar turma ou agendamento.</p>
    <form id="avForm"><div class="grid-form">
    <label>Empresa / Fazenda <small>(opcional)</small><input id="avEmpresa" list="avEmpresas" placeholder="Selecione ou digite"><datalist id="avEmpresas"></datalist></label>
    <label>Treinamento <small>(opcional)</small><input id="avTreinamento" list="avCursos" placeholder="Selecione ou digite"><datalist id="avCursos"></datalist></label>
    <label>Instrutor(es) <small>(opcional)</small><input id="avInstrutor"></label>
    <label>Habilitação <small>(opcional)</small><input id="avHabilitacao"></label>
    <label>Registro profissional <small>(opcional)</small><input id="avRegistro"></label>
    <label>Carga horária em horas <small>(opcional)</small><input id="avCarga" type="number" min="0.5" step="0.5" placeholder="Ex.: 8"></label>
    <label>Data inicial <small>(opcional)</small><input id="avInicio" type="date"></label>
    <label>Data final <small>(opcional)</small><input id="avFim" type="date"></label>
    <label>Quantidade de linhas em branco<input id="avLinhas" type="number" min="1" max="100" step="1" value="15" required><small style="display:block;font-weight:normal;color:#64748b;margin-top:6px">De 1 a 100 linhas. A impressão distribui as linhas entre as páginas.</small></label>
    <label class="full">Conteúdo programático <small>(opcional)</small><textarea id="avConteudo" rows="6"></textarea></label>
    <label class="full">Forma de desenvolvimento <small>(opcional)</small><textarea id="avForma" rows="2"></textarea></label>
    <label class="full">Comentários gerais <small>(opcional)</small><textarea id="avComentarios" rows="2"></textarea></label>
    </div><p id="avAviso" class="aviso" role="status"></p><div class="acoes"><button type="submit" class="btn primario" id="avGerar">Visualizar lista em branco</button><button type="button" class="btn" id="avImprimir" disabled>Imprimir / Salvar PDF</button></div></form></div>
    <div id="avPreviewBox" class="card" hidden><h3>Prévia da lista</h3><iframe id="avPreview" title="Lista de presença sem participantes" style="width:100%;height:75vh;min-height:500px;border:1px solid #dde6e3;border-radius:8px;background:white"></iframe></div>`;
    const $=id=>area.querySelector('#'+id);
    const form=$('avForm');
    let cursos=[];
    $('avForm').addEventListener('input',()=>{$('avPreviewBox').hidden=true;$('avImprimir').disabled=true;});
    $('avTreinamento').addEventListener('change',()=>{
      const curso=cursos.find(item=>String(item.nome).trim().toLocaleLowerCase() === $('avTreinamento').value.trim().toLocaleLowerCase());
      if(curso){$('avCarga').value=curso.carga_horaria_padrao??'';$('avConteudo').value=curso.topicos_padrao||'';}
    });
    $('avForm').onsubmit=async event=>{
      event.preventDefault();
      const linhas=Number($('avLinhas').value),inicio=$('avInicio').value,fim=$('avFim').value;
      if(!Number.isInteger(linhas)||linhas<1||linhas>100){$('avAviso').textContent='Informe de 1 a 100 linhas em branco.';return;}
      if(inicio&&fim&&fim<inicio){$('avAviso').textContent='A data final não pode ser anterior à data inicial.';return;}
      const button=$('avGerar');button.disabled=true;$('avAviso').textContent='Preparando lista…';
      try{
        const identidade=window.TREINAMENTO_IDENTIDADE_EMPRESA||await window.carregarIdentidadeEmpresaGithub?.();
        if(!identidade)throw new Error('Não foi possível carregar a empresa emissora. Confira as configurações gerais.');
        if($('avForm')!==form)return;
        const turma={empresa:$('avEmpresa').value.trim(),treinamento:$('avTreinamento').value.trim(),instrutor:$('avInstrutor').value.trim(),habilitacao_instrutor:$('avHabilitacao').value.trim(),registro_instrutor:$('avRegistro').value.trim(),carga_horaria:$('avCarga').value,data_inicio:inicio,data_fim:fim,conteudo_programatico:$('avConteudo').value.trim(),forma_desenvolvimento:$('avForma').value.trim(),comentarios:$('avComentarios').value.trim()};
        $('avPreview').srcdoc=window.montarListaPresencaAvulsaGithub(turma,identidade,linhas);
        $('avPreviewBox').hidden=false;
        $('avAviso').textContent='Lista preparada com '+linhas+' linhas em branco, sem nomes ou CPFs preenchidos.';
      }catch(error){if($('avAviso'))$('avAviso').textContent=error.message;}
      finally{if(button.isConnected)button.disabled=false;}
    };
    $('avPreview').addEventListener('load',()=>{if($('avPreview')?.srcdoc)$('avImprimir').disabled=false;});
    $('avImprimir').onclick=()=>{$('avPreview').contentWindow.focus();$('avPreview').contentWindow.print();};
    const results=await Promise.allSettled([
      buscar('empresas?ativo=eq.true&select=nome&order=nome.asc'),
      buscar('treinamento_treinamentos?ativo=eq.true&select=id,nome,carga_horaria_padrao,topicos_padrao&order=nome.asc')
    ]);
    if($('avForm')!==form)return;
    if(results[0].status==='fulfilled')$('avEmpresas').innerHTML=results[0].value.map(item=>'<option value="'+esc(item.nome)+'"></option>').join('');
    if(results[1].status==='fulfilled'){cursos=results[1].value;$('avCursos').innerHTML=cursos.map(item=>'<option value="'+esc(item.nome)+'"></option>').join('');}
    if(results.some(result=>result.status==='rejected'))$('avAviso').textContent='Algumas sugestões não foram carregadas. Você pode preencher os campos manualmente.';
  };
})();
