const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
 const nodes=new Map(),clients=[],requests=[];const el=id=>{if(!nodes.has(id))nodes.set(id,{value:'',disabled:false,hidden:false,textContent:'',children:[],replaceChildren(...x){this.children=x;},scrollIntoView(){}});return nodes.get(id);};
 const ctx={document:{getElementById:el,createElement:()=>({})},localStorage:{getItem:()=>null,setItem(){}},location:{origin:'https://pattp2017.github.io'},SSTGoogleAgenda:{},URLSearchParams,AbortController,setTimeout:()=>1,clearTimeout(){},fetch:async(url,args)=>{requests.push({url,args});return {ok:true,json:async()=>({items:[{id:'agenda',summary:'Equipe'}]})};},google:{accounts:{oauth2:{hasGrantedAllScopes:r=>r.scope==='ok',initTokenClient:config=>{clients.push(config);return {requestAccessToken:options=>requests.push(options)}}}}}};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../js/google-agenda.js'),'utf8'),ctx);return {el,clients,requests};
}
test('conexão não bloqueia trocar ou cancelar conta; pede escolha e consentimento',()=>{
 const s=setup();s.el('googleConectar').onclick();assert.equal(s.el('googleConectar').disabled,false);assert.equal(s.el('googleDesconectar').disabled,false);assert.equal(s.requests[0].prompt,'select_account consent');s.el('googleDesconectar').onclick();assert.match(s.el('googleMensagem').textContent,/desconectada/);
});
test('ignora resposta antiga depois de escolher outra conta',async()=>{
 const s=setup();s.el('googleConectar').onclick();s.el('googleConectar').onclick();await s.clients[0].callback({access_token:'old',scope:'ok',expires_in:3600});assert.equal(s.requests.filter(r=>r.url).length,0);
 await s.clients[1].callback({access_token:'new',scope:'ok',expires_in:3600});assert.equal(s.requests.find(r=>r.url).args.headers.Authorization,'Bearer new');assert.equal(s.el('googleCalendario').children[0].textContent,'Equipe');
});
test('informa falta de permissão sem buscar agendas',async()=>{
 const s=setup();s.el('googleConectar').onclick();await s.clients[0].callback({access_token:'x',scope:'no',expires_in:3600});assert.match(s.el('googleMensagem').textContent,/não foi autorizada/);assert.equal(s.requests.filter(r=>r.url).length,0);
});
test('expõe erro de popup e permite nova tentativa',()=>{
 const s=setup();s.el('googleConectar').onclick();s.clients[0].error_callback({type:'popup_failed_to_open'});assert.match(s.el('googleMensagem').textContent,/Permita pop-ups/);assert.equal(s.el('googleConectar').disabled,false);
});
