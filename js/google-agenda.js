(() => {
const $=id=>document.getElementById(id),CORE=globalThis.SSTGoogleAgenda;
const CONFIG='sstVision.googleClientId.v1';
let token='',expires=0,events=[],calendar=null,busy=false,generation=0;
function mensagem(texto){$('googleMensagem').textContent=texto;}
function limpar(){events=[];calendar=null;$('googleEventos').replaceChildren();$('googleImportar').disabled=true;$('googleTodos').checked=false;generation++;}
function conectado(valor){$('googleBuscar').disabled=!valor;$('googleDesconectar').hidden=!valor;$('googleConectar').textContent=valor?'Trocar conta Google':'Conectar com Google';}
function desconectar(){token='';expires=0;conectado(false);limpar();$('googleCalendario').replaceChildren();mensagem('Conta desconectada deste módulo.');}
function ocupado(valor){busy=valor;for(const id of ['googleConectar','googleDesconectar','googleCalendario','googleInicio','googleFim','googleBuscar','googleTodos','googleFiltro','googleClientId'])$(id).disabled=valor||(!token&&id==='googleBuscar');$('googleImportar').disabled=valor||!events.length;}
async function api(path,params={}){
 if(!token||Date.now()>=expires){desconectar();throw Error('Conecte novamente sua conta Google.');}
 const resposta=await fetch('https://www.googleapis.com/calendar/v3/'+path+'?'+new URLSearchParams(params),{headers:{Authorization:'Bearer '+token}});
 if(resposta.status===401){desconectar();throw Error('Sua sessão expirou. Conecte novamente.');}
 if(!resposta.ok){if(resposta.status===403)throw Error('Acesso negado. Confira se a API Google Calendar está ativada e se sua conta pode ler os detalhes desta agenda.');throw Error('Não foi possível consultar o Google Agenda. Tente novamente.');}
 return resposta.json();
}
async function paginas(path,params){const lista=[];let pageToken;do{const data=await api(path,{...params,...(pageToken?{pageToken}:{})});lista.push(...(data.items||[]));pageToken=data.nextPageToken;}while(pageToken);return lista;}
$('btnImportarGoogle').onclick=()=>{$('googlePainel').hidden=false;$('googlePainel').scrollIntoView({behavior:'smooth'});};
$('googleFechar').onclick=()=>{$('googlePainel').hidden=true;};
$('googleClientId').value=localStorage.getItem(CONFIG)||'';
const hoje=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
$('googleInicio').value=hoje;
const fim=new Date(hoje+'T12:00:00-03:00');fim.setDate(fim.getDate()+30);$('googleFim').value=fim.toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
$('googleOrigem').textContent=location.origin;
$('googleConectar').onclick=()=>{
 const clientId=$('googleClientId').value.trim();
 if(!/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)){mensagem('Preencha o ID do cliente OAuth do Google na configuração abaixo.');$('googleConfig').open=true;return;}
 if(!globalThis.google?.accounts?.oauth2){mensagem('A conexão do Google ainda não carregou. Confira sua internet e tente novamente.');return;}
 localStorage.setItem(CONFIG,clientId);
 desconectar();
 const client=google.accounts.oauth2.initTokenClient({client_id:clientId,scope:'https://www.googleapis.com/auth/calendar.readonly',error_callback:()=>{ocupado(false);mensagem('A janela de conexão foi fechada ou bloqueada. Clique em Conectar com Google para tentar novamente.');},callback:async response=>{
  if(response.error){ocupado(false);mensagem('O Google não autorizou a leitura. Tente conectar novamente.');return;}
  limpar();token=response.access_token;expires=Date.now()+Math.max(0,Number(response.expires_in)-60)*1000;
  try{
   const calendars=await paginas('users/me/calendarList',{minAccessRole:'reader',maxResults:'250',showHidden:'true'});
   $('googleCalendario').replaceChildren(...calendars.map(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.summaryOverride||c.summary||c.id;return o;}));
   conectado(true);mensagem(calendars.length?'Conta conectada. Escolha a agenda e o período.':'Nenhuma agenda com permissão para ler os detalhes foi encontrada.');
  }catch(e){mensagem(e.message);}finally{ocupado(false);}
 }});
 ocupado(true);mensagem('Aguardando autorização do Google…');
 try{client.requestAccessToken({prompt:'select_account'});}catch{ocupado(false);mensagem('Não foi possível abrir a conexão com o Google.');}
};
$('googleDesconectar').onclick=desconectar;
for(const id of ['googleCalendario','googleInicio','googleFim'])$(id).onchange=limpar;
$('googleBuscar').onclick=async()=>{
 if(busy)return;limpar();const run=generation;
 const inicio=$('googleInicio').value,fim=$('googleFim').value,id=$('googleCalendario').value;
 if(!id||!inicio||!fim||inicio>fim){mensagem('Escolha uma agenda e um período válido.');return;}
 const fimExclusivo=new Date(fim+'T00:00:00-03:00');fimExclusivo.setUTCDate(fimExclusivo.getUTCDate()+1);
 ocupado(true);mensagem('Buscando eventos…');
 try{
  const lista=await paginas('calendars/'+encodeURIComponent(id)+'/events',{timeMin:inicio+'T00:00:00-03:00',timeMax:fimExclusivo.toISOString(),singleEvents:'true',orderBy:'startTime',showDeleted:'false',maxResults:'250',timeZone:'America/Sao_Paulo'});
  if(run!==generation)return;
  calendar={id,nome:$('googleCalendario').selectedOptions[0].textContent};events=lista.filter(e=>e.status!=='cancelled'&&(e.start?.date||e.start?.dateTime)&&e.eventType!=='workingLocation');desenhar();mensagem(events.length?events.length+' evento(s). Selecione as visitas e confira a empresa antes de importar.':'Nenhum evento encontrado neste período.');
 }catch(e){mensagem(e.message);}finally{ocupado(false);}
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
