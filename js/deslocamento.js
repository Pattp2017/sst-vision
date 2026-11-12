(() => {
 const C=globalThis.SSTDeslocamento;
 const FORMULARIO='https://forms.gle/6GjD1MRkkQsag5k98';
 function formatar(iso){return new Date(iso).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});}
 function avisar(texto){document.getElementById('deslocamentoMensagem').textContent=texto;}
 function botao(texto,acao,id,tipo){const b=document.createElement('button');b.type='button';b.textContent=texto;b.dataset.deslocamento=acao;b.dataset.visita=id;if(tipo)b.dataset.tipo=tipo;return b;}
 function desenhar(){
  const visitas=ler(),emCurso=C.ativo(visitas),banner=document.getElementById('deslocamentoAtivo');banner.replaceChildren();banner.hidden=!emCurso;
  if(emCurso){
   const texto=document.createElement('p');texto.textContent='Em deslocamento ('+emCurso.trecho.tipo+') para '+emCurso.visita.empresa+' · Saída: '+formatar(emCurso.trecho.inicio)+' · Tempo: '+C.hh(C.duracao(emCurso.trecho));
   banner.append(texto,botao(emCurso.trecho.tipo==='ida'?'Finalizar ida':'Finalizar volta','fim',emCurso.visita.id,emCurso.trecho.tipo));
  }
  for(const article of document.querySelectorAll('#lista .visita')){
   article.querySelector('.deslocamento')?.remove();
   const visita=visitas.find(v=>v.id===article.dataset.visitaId);if(!visita)continue;
   const area=document.createElement('section');area.className='deslocamento';
   const titulo=document.createElement('strong');titulo.textContent='Deslocamentos';area.append(titulo);
   const lista=visita.deslocamentos||[],ativoDaVisita=lista.find(t=>!t.fim);
   if(lista.length){
    const ul=document.createElement('ul');ul.className='meta';
    for(const t of lista){const li=document.createElement('li');li.textContent=(t.tipo==='volta'?'Volta':'Ida')+' · Saída: '+formatar(t.inicio)+' · '+(t.fim?'Chegada: '+formatar(t.fim):'Em andamento')+' · Duração: '+C.hh(C.duracao(t));ul.append(li);}
    const total=document.createElement('p');total.className='meta';total.textContent='Tempo total em deslocamento: '+C.hh(lista.reduce((s,t)=>s+C.duracao(t),0));area.append(ul,total);
   }else{const p=document.createElement('p');p.className='meta';p.textContent='Nenhum deslocamento registrado.';area.append(p);}
   const acoes=document.createElement('div');acoes.className='visita-acoes';
   const ida=lista.find(t=>t.tipo==='ida'),volta=lista.find(t=>t.tipo==='volta');
   const etapas=[
    ['Iniciar ida','inicio','ida',!ida&&!emCurso&&visita.status!=='Cancelada'],
    ['Finalizar ida','fim','ida',!!ida&&!ida.fim&&ativoDaVisita?.tipo==='ida'],
    ['Iniciar volta','inicio','volta',!!ida?.fim&&!volta&&!emCurso&&visita.status!=='Cancelada'],
    ['Finalizar volta','fim','volta',!!volta&&!volta.fim&&ativoDaVisita?.tipo==='volta']
   ];
   for(const [nome,acao,tipo,habilitado] of etapas){const b=botao(nome,acao,visita.id,tipo);b.disabled=!habilitado;acoes.append(b);}
   area.append(acoes);article.append(area);
  }
 }
 function mudar(id,acao,tipo){
  try{
   const visitas=ler();const atualizadas=C.registrar(visitas,id,acao,tipo);
   salvar(atualizadas);render();avisar((acao==='inicio'?'Início':'Fim')+' do deslocamento registrado.');
   if(acao==='inicio'&&tipo==='ida'){
    const link=document.createElement('a');link.href=FORMULARIO;link.target='_blank';link.rel='noopener noreferrer';document.body.append(link);link.click();link.remove();
   }
  }catch(e){avisar('Não foi possível registrar: '+e.message);}
 }
 document.addEventListener('click',event=>{
  const b=event.target.closest('[data-deslocamento]');if(!b)return;
  const tipo=b.dataset.tipo;
  // O bloqueio de estado também impede cliques repetidos após atualizar a tela.
  if(b.disabled||!b.isConnected)return;b.disabled=true;
  mudar(b.dataset.visita,b.dataset.deslocamento,tipo);desenhar();
 });
 const renderOriginal=window.render;window.render=function(...args){renderOriginal(...args);desenhar();};
 const removerOriginal=window.remover;window.remover=function(id){const v=ler().find(v=>v.id===id);if(v?.deslocamentos?.length){avisar('Esta visita tem histórico de deslocamentos. Preserve o registro; para cancelá-la, altere o status em Editar.');return;}removerOriginal(id);};
 window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null)render();});
 setInterval(desenhar,60000);desenhar();
})();
