/* Local field work. No background POSTs or automatic cloud validation. */
(() => {
  const scriptURL = document.currentScript.src;
  const start = () => {
  const root = new URL('../', scriptURL);
  const cacheName = `sst-vision:${root.href}:v24`;
  const database = new Promise((resolve,reject) => {
    const request=indexedDB.open('sst-vision-field',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('drafts',{keyPath:'id'});
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  async function store(mode,action){
    const db=await database;
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts',mode),request=action(tx.objectStore('drafts'));
      tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Gravação interrompida'));
    });
  }
  const read=id=>store('readonly',db=>db.get(id));
  const write=data=>store('readwrite',db=>db.put(data));
  const all=()=>store('readonly',db=>db.getAll());
  let timer,restoring=false,draftId=new URLSearchParams(location.search).get('rascunho')||crypto.randomUUID();
  let chain=Promise.resolve();
  const isAnalysis=Boolean(document.getElementById('cameraInput'));
  const isMap=Boolean(window.SSTMapDraft);
  const panel=document.createElement('section');panel.className='field-offline';
  const heading=document.createElement('strong');heading.textContent=isAnalysis?'Rascunho de campo':isMap?'Trabalho neste aparelho':'Uso sem internet';
  const status=document.createElement('p');status.setAttribute('role','status');
  const hint=document.createElement('p');hint.className='field-hint';hint.textContent=isAnalysis?'Fotos, dados e achados podem ser guardados neste aparelho. A IA e o envio ao sistema precisam de internet.':isMap?'O PDF e os ambientes ficam neste aparelho. Carregue os recursos online antes de sair a campo.':'Checklist: abra a vistoria antes de desconectar. Análise: rascunhos locais. Mapa de Risco: leitura de PDF e ambientes. IA e envios precisam de internet.';
  panel.append(heading,status,hint);
  (document.querySelector('main')||document.body).prepend(panel);
  let ready=false;
  function network(){status.textContent=(navigator.onLine?'Com conexão. ':'Sem internet. ')+(ready?'Recursos offline preparados neste aparelho.':'Preparando recursos offline: mantenha a conexão até concluir.');}
  async function verify(){
    ready=await caches.has(cacheName);
    if(ready){const cache=await caches.open(cacheName);ready=Boolean(await cache.match(new URL('vendor/pdfjs/pdf.worker.min.js',root).href));}
    network();
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register(new URL('service-worker.js',root).href).then(async reg=>{
      const watch=worker=>worker?.addEventListener('statechange',()=>{if(worker.state==='activated')verify().catch(()=>{})});
      watch(reg.installing);watch(reg.waiting);reg.addEventListener('updatefound',()=>watch(reg.installing));await verify();
    }).catch(()=>{status.textContent='Não foi possível preparar o offline. Reconecte e abra novamente esta página.'});
    navigator.serviceWorker.addEventListener('controllerchange',()=>verify().catch(()=>{}));
  }else status.textContent='Este navegador não oferece preparação offline.';
  window.addEventListener('online',network);window.addEventListener('offline',network);
  const saveStatus=document.createElement('p');saveStatus.className='field-save-status';saveStatus.setAttribute('role','status');
  const saveButton=document.createElement('button');saveButton.type='button';saveButton.className='field-button';saveButton.textContent='Salvar neste aparelho';
  if(isAnalysis||isMap)panel.append(saveButton,saveStatus);
  function error(error){saveStatus.textContent='Não foi possível guardar neste aparelho: '+(error?.message||'armazenamento indisponível')+'. Mantenha a página aberta e tente novamente.';}
  async function snapshot(){
    const updated=new Date().toISOString();
    if(isMap)return {id:'mapa-atual',type:'mapa',updated,...window.SSTMapDraft.snapshot()};
    const fields=Object.fromEntries(['empresa','setor','equipamento','observacao'].map(id=>[id,document.getElementById(id).value]));
    const input=document.getElementById('cameraInput');
    const photo=document.getElementById('fotoPreview').getAttribute('src')?input.files[0]||null:null;
    return {id:draftId,type:'analise',updated,fields,photo,photoName:photo?.name,tipo:document.querySelector('[name="tipoInspecao"]:checked')?.value,analise:window.sstAnaliseAtual||window.SSTOfflineEditor?.snapshot()||null,manuais:window.sstManualAchados||[],validation:window.SSTValidationDraft?.snapshot()||null,cloud:window.sstAnaliseValidada||null};
  }
  function save(){
    if(restoring)return Promise.resolve();
    chain=chain.catch(()=>{}).then(async()=>{
      const data=await snapshot();
      if(isAnalysis&&!data.photo&&!Object.values(data.fields).some(Boolean))return;
      if(isMap&&!data.file&&!data.ambientes.length)return;
      await write(data);saveStatus.textContent='Guardado neste aparelho às '+new Date(data.updated).toLocaleTimeString('pt-BR')+'.';
    });return chain;
  }
  function schedule(){if(restoring)return;clearTimeout(timer);timer=setTimeout(()=>save().catch(error),700)}
  saveButton.onclick=()=>save().catch(error);
  if(isAnalysis||isMap){
    document.addEventListener('input',schedule);document.addEventListener('change',schedule);
    document.addEventListener('click',schedule);window.addEventListener('sst:mapa-change',schedule);
  }
  if(isAnalysis){
    const preview=document.getElementById('previewContainer');
    new MutationObserver(schedule).observe(preview,{childList:true,subtree:true,attributes:true});
    document.addEventListener('click',event=>{
      if(navigator.onLine||!event.target.closest('#btnUsarFoto,#btnValidarAnalise'))return;
      event.preventDefault();event.stopImmediatePropagation();
      save().then(()=>{saveStatus.textContent='Rascunho guardado neste aparelho. Inclua achados manualmente na foto; execute a IA e envie ao sistema quando houver conexão.';}).catch(error);
    },true);
    window.addEventListener('sstvision:nova-foto',()=>{draftId=crypto.randomUUID()});
  }
  async function restore(){
    restoring=true;
    try{
      if(isMap){const data=await read('mapa-atual');if(data){window.SSTMapDraft.restore(data);saveStatus.textContent='PDF e ambientes recuperados deste aparelho.';}}
      if(isAnalysis&&new URLSearchParams(location.search).has('rascunho')){
        const data=await read(draftId);
        if(data){await window.SSTOfflineEditor.restore(data);saveStatus.textContent='Rascunho recuperado. Revise antes de enviar.';}
        else saveStatus.textContent='Este rascunho não foi encontrado neste aparelho.';
      }
    }catch(e){error(e)}finally{restoring=false;}
  }
  window.addEventListener('sstvision:analise',schedule);
  if(isAnalysis||isMap)restore();
  if(isAnalysis||location.pathname.endsWith('/analises.html')){
    const details=document.createElement('details');details.className='field-drafts';const summary=document.createElement('summary');summary.textContent='Rascunhos de análise neste aparelho';details.append(summary);
    const list=document.createElement('div');details.append(list);panel.append(details);
    details.addEventListener('toggle',async()=>{
      if(!details.open)return;list.replaceChildren();
      try{
        const drafts=(await all()).filter(data=>data.type==='analise').sort((a,b)=>b.updated.localeCompare(a.updated));
        if(!drafts.length)list.textContent='Nenhum rascunho guardado neste aparelho.';
        for(const data of drafts){const a=document.createElement('a');a.href=new URL('analise.html?rascunho='+encodeURIComponent(data.id),root).href;a.textContent=[data.fields.empresa||'Empresa não informada',data.fields.setor||'Sem setor',new Date(data.updated).toLocaleString('pt-BR'),data.cloud?.salva?'Enviado ao sistema':'Rascunho local'].join(' · ');list.append(a);}
      }catch(e){list.textContent='Não foi possível abrir os rascunhos: '+e.message;}
    });
  }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
