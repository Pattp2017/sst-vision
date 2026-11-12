(() => {
const $=id=>document.getElementById(id),CORE=globalThis.SSTGoogleAgenda;
const CONFIG='sstVision.googleClientId.v1';
const DEFAULT_CLIENT_ID='293321064147-ike097nmcs3kj9dubuv928d507hv0i3s.apps.googleusercontent.com';
let token='',expires=0,events=[],calendar=null,busy=false,generation=0,authAttempt=0,authTimer=null;
function mensagem(texto){$('googleMensagem').textContent=texto;}
function limpar(){events=[];calendar=null;$('googleEventos').replaceChildren();$('googleImportar').disabled=true;$('googleTodos').checked=false;generation++;}
function conectado(valor){$('googleBuscar').disabled=!valor;$('googleDesconectar').hidden=!valor;$('googleConectar').textContent=valor?'Trocar conta Google':'Conectar com Google';}
function desconectar(){authAttempt++;clearTimeout(authTimer);token='';expires=0;ocupado(false);conectado(false);limpar();$('googleCalendario').replaceChildren();mensagem('Conta desconectada deste módulo.');}
function ocupado(valor){busy=valor;for(const id of ['googleCalendario','googleInicio','googleFim','googleBuscar','googleTodos','googleFiltro','googleClientId'])$(id).disabled=valor||(!token&&id==='googleBuscar');$('googleImportar').disabled=valor||!events.length;}
async function api(path,params={}){
 const attempt=authAttempt,accessToken=token;
 if(!accessToken||Date.now()>=expires){desconectar();throw Error('Conecte novamente sua conta Google.');}
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const resposta=await fetch('https://www.googleapis.com/calendar/v3/'+path+'?'+new URLSearchParams(params),{headers:{Authorization:'Bearer '+accessToken},signal:controller.signal});
  if(attempt!==authAttempt)throw Error('Conexão substituída.');
  if(resposta.status===401){desconectar();throw Error('Sua sessão expirou. Conecte novamente.');}
  if(!resposta.ok){
   const detalhe=await resposta.json().catch(()=>({}));
   const codigo=detalhe.error?.errors?.[0]?.reason||detalhe.error?.status||resposta.status;
   throw Error('Google Agenda: '+codigo+'. '+(resposta.status===403?'Confira a autorização de leitura da agenda e a ativação da API.':'Não foi possível carregar. Tente conectar novamente.'));
  }
  return await resposta.json();
 }catch(e){if(e.name==='AbortError')throw Error('O Google demorou para responder. Clique em Conectar com Google para tentar novamente.');throw e;}finally{clearTimeout(timeout);}
}
async function paginas(path,params){const lista=[];let pageToken;do{const data=await api(path,{...params,...(pageToken?{pageToken}:{})});lista.push(...(data.items||[]));pageToken=data.nextPageToken;}while(pageToken);return lista;}
$('btnImportarGoogle').onclick=()=>{$('googlePainel').hidden=false;$('googlePainel').scrollIntoView({behavior:'smooth'});};
$('googleFechar').onclick=()=>{$('googlePainel').hidden=true;};
$('googleClientId').value=localStorage.getItem(CONFIG)||DEFAULT_CLIENT_ID;
const hoje=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
$('googleInicio').value=hoje;
const fim=new Date(hoje+'T12:00:00-03:00');fim.setDate(fim.getDate()+30);$('googleFim').value=fim.toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
$('googleOrigem').textContent=location.origin;
$('googleConectar').onclick=()=>{
 const clientId=$('googleClientId').value.trim();
 if(!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)){mensagem('Preencha o ID do cliente OAuth do Google na configuração abaixo.');$('googleConfig').open=true;return;}
 if(!globalThis.google?.accounts?.oauth2){mensagem('O serviço de login Google não carregou. Confira a internet e bloqueadores de conteúdo; atualize a página.');return;}
 localStorage.setItem(CONFIG,clientId);
 desconectar();const attempt=authAttempt;
 $('googleDesconectar').hidden=false;$('googleDesconectar').textContent='Cancelar / desconectar';
 function falhar(texto){if(attempt!==authAttempt)return;clearTimeout(authTimer);ocupado(false);mensagem(texto);}
 try{
 const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/calendar.readonly',error_callback:error=>{
  falhar(error.type==='popup_failed_to_open'?'O navegador bloqueou a janela. Permita pop-ups para este site e clique em Conectar com Google novamente.':'A conexão não terminou ('+(error.type||'erro')+'). Feche a janela anterior e clique em Conectar com Google para escolher outra conta.');
 },callback:async response=>{
  if(attempt!==authAttempt)return;
  clearTimeout(authTimer);
  if(response.error){falhar('Google: '+response.error+(response.error_description?' — '+response.error_description:'')+'. Confira se o e-mail escolhido está salvo nos usuários de teste.');return;}
  if(!google.accounts.oauth2.hasGrantedAllScopes(response,'https://www.googleapis.com/auth/calendar.readonly')){falhar('A leitura das agendas não foi autorizada. Conecte novamente e marque a permissão de acesso ao Google Agenda.');return;}
  limpar();token=response.access_token;expires=Date.now()+Math.max(0,Number(response.expires_in)-60)*1000;
  ocupado(true);mensagem('Autorização recebida. Carregando agendas…');
  try{
   const calendars=await paginas('users/me/calendarList',{minAccessRole:'reader',maxResults:'250',showHidden:'true'});
   if(attempt!==authAttempt)return;
   $('googleCalendario').replaceChildren(...calendars.map(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.summaryOverride||c.summary||c.id;return o;}));
   conectado(true);mensagem(calendars.length?'Conta conectada. Escolha a agenda e o período.':'Conta autorizada, mas nenhuma agenda com acesso aos detalhes foi encontrada. Compartilhe a agenda com esta conta ou escolha outra conta.');
  }catch(e){if(attempt===authAttempt)mensagem(e.message);}finally{if(attempt===authAttempt)ocupado(false);}
 }});
 ocupado(true);mensagem('Escolha sua conta na janela do Google. Para usar outro e-mail, escolha Usar outra conta. Você pode cancelar ou tentar novamente aqui.');
 authTimer=setTimeout(()=>{if(attempt!==authAttempt)return;desconectar();mensagem('O Google não concluiu a conexão. Feche a janela anterior, permita pop-ups e clique em Conectar com Google para tentar novamente.');},120000);
 client.requestAccessToken({prompt:'select_account consent'});
 }catch(e){falhar('Não foi possível iniciar o login Google: '+e.message);}
};
$('googleDesconectar').onclick=desconectar;
for(const id of ['googleCalendario','googleInicio','googleFim'])$(id).onchange=limpar;
$('googleBuscar').onclick=async()=>{
 if(busy)return;limpar();const run=generation,attempt=authAttempt;
 const inicio=$('googleInicio').value,fim=$('googleFim').value,id=$('googleCalendario').value;
 if(!id||!inicio||!fim||inicio>fim){mensagem('Escolha uma agenda e um período válido.');return;}
 const fimExclusivo=new Date(fim+'T00:00:00-03:00');fimExclusivo.setUTCDate(fimExclusivo.getUTCDate()+1);
 ocupado(true);mensagem('Buscando eventos…');
 try{
  const lista=await paginas('calendars/'+encodeURIComponent(id)+'/events',{timeMin:inicio+'T00:00:00-03:00',timeMax:fimExclusivo.toISOString(),singleEvents:'true',orderBy:'startTime',showDeleted:'false',maxResults:'250',timeZone:'America/Sao_Paulo'});
  if(run!==generation)return;
  calendar={id,nome:$('googleCalendario').selectedOptions[0].textContent};events=lista.filter(e=>e.status!=='cancelled'&&(e.start?.date||e.start?.dateTime)&&e.eventType!=='workingLocation');desenhar();mensagem(events.length?events.length+' evento(s). Selecione as visitas e confira a empresa antes de importar.':'Nenhum evento encontrado neste período.');
 }catch(e){if(attempt===authAttempt)mensagem(e.message);}finally{if(attempt===authAttempt)ocupado(false);}
};
function desenhar(){
 const visitas=ler();$('googleEventos').replaceChildren();
 events.forEach((event,index)=>{
  const h=CORE.horario(event),existente=visitas.find(v=>v.google?.chave===CORE.chave(calendar.id,event.id));
  const row=document.createElement('article');row.className='visita';row.dataset.index=index;
  row.innerHTML='<label><input type="checkbox" class="googleSelecionado"> <strong class="googleTitulo"></strong></label><div class="meta googleDetalhes"></div><div class="form-grid" style="margin-top:10px"><div class="campo"><label>Empresa / Fazenda</label><input class="googleEmpresa" aria-label="Empresa ou fazenda do evento"></div>'+(h.diaInteiro?'<div class="campo"><label>Horário da visita (evento de dia inteiro)</label><input type="time" class="googleHora" aria-label="Horário da visita"></div>':'')+'</div>';
  row.querySelector('.googleTitulo').textContent=event.summary||'Sem título';
  row.querySelector('.googleDetalhes').textContent=dataBR(h.data)+(h.diaInteiro?' · Dia inteiro':' às '+h.hora)+(event.location?' · '+event.location:'')+(existente?' · Já importada: atualizar apenas data, horário e duração':'');
  row.querySelector('.googleEmpresa').value=existente?.empresa||(event.summary||'').replace(/^Visita\s+SST\s*[-–:]\s*/i,'');
  if(h.diaInteiro)row.querySelector('.googleHora').value=existente?.hora||'';
  $('googleEventos').append(row);
 });filtrar();
}
function filtrar(){const q=$('googleFiltro').value.trim().toLocaleLowerCase('pt-BR');for(const row of $('googleEventos').children){const e=events[Number(row.dataset.index)];row.hidden=![e.summary,e.location,e.description,(e.attendees||[]).map(a=>a.displayName||a.email).join(' ')].join(' ').toLocaleLowerCase('pt-BR').includes(q);}$('googleTodos').checked=false;}
$('googleFiltro').oninput=filtrar;
$('googleTodos').onchange=()=>{for(const row of $('googleEventos').children)if(!row.hidden)row.querySelector('.googleSelecionado').checked=$('googleTodos').checked;};
$('googleImportar').onclick=()=>{
 if(busy||!calendar)return;
 const selecionados=[...$('googleEventos').children].filter(row=>!row.hidden&&row.querySelector('.googleSelecionado').checked).map(row=>({event:events[Number(row.dataset.index)],empresa:row.querySelector('.googleEmpresa').value,hora:row.querySelector('.googleHora')?.value}));
 if(!selecionados.length){mensagem('Selecione pelo menos um evento visível.');return;}
 try{const resultado=CORE.mesclar(ler(),selecionados,calendar.id,calendar.nome);salvar(resultado.visitas);render();desenhar();mensagem(resultado.novas+' visita(s) importada(s) e '+resultado.atualizadas+' atualizada(s). Os registros estão salvos neste navegador.');}catch(e){mensagem(e.message);}
};
})();

