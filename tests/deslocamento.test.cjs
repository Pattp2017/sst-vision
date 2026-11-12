const test=require('node:test'),assert=require('node:assert/strict');
require('../js/deslocamento-core.js');const C=globalThis.SSTDeslocamento;
const base=[{id:'a',empresa:'Fazenda',google:{eventId:'e'},status:'Agendada',objetivo:'Visita'},{id:'b',empresa:'Outra',status:'Agendada'}];
const iniciar=(vs=base,tipo='ida')=>C.registrar(vs,'a','inicio',tipo,'2026-11-12T10:00:00Z','t1');
test('registra saída e chegada sem alterar vínculo e campos da visita',()=>{
 const saida=iniciar();assert.equal(base[0].deslocamentos,undefined);
 const chegada=C.registrar(saida,'a','fim',null,'2026-11-12T10:45:00Z','unused');
 assert.equal(chegada[0].deslocamentos[0].fim,'2026-11-12T10:45:00Z');assert.equal(C.hh(C.duracao(chegada[0].deslocamentos[0])),'00:45');
 assert.deepEqual(chegada[0].google,base[0].google);assert.equal(chegada[0].status,'Agendada');assert.equal(C.ativo(chegada),null);
});
test('bloqueia início repetido ou simultâneo em outra visita',()=>{
 const vs=iniciar();assert.throws(()=>iniciar(vs),/andamento/);
 assert.throws(()=>C.registrar(vs,'b','inicio','ida','2026-11-12T10:01:00Z','t2'),/andamento/);
});
test('impede finalização sem saída, na visita errada ou repetida',()=>{
 assert.throws(()=>C.registrar(base,'a','fim',null,'2026-11-12T11:00:00Z','t'),/andamento/);
 assert.throws(()=>C.registrar(iniciar(),'b','fim',null,'2026-11-12T11:00:00Z','t'),/andamento/);
 const fim=C.registrar(iniciar(),'a','fim',null,'2026-11-12T11:00:00Z','t');assert.throws(()=>C.registrar(fim,'a','fim',null,'2026-11-12T12:00:00Z','t'),/andamento/);
});
test('permite retorno depois de encerrar a ida e preserva ambos os trechos',()=>{
 const ida=C.registrar(iniciar(),'a','fim',null,'2026-11-12T11:00:00Z','t');
 const volta=C.registrar(ida,'a','inicio','volta','2026-11-12T14:00:00Z','t2');
 assert.equal(volta[0].deslocamentos.length,2);assert.equal(C.ativo(volta).trecho.tipo,'volta');
});
test('mantém deslocamento aberto depois de recarregar os registros',()=>assert.equal(C.ativo(JSON.parse(JSON.stringify(iniciar()))).trecho.id,'t1'));
test('recusa relógio anterior à saída e visita cancelada',()=>{
 assert.throws(()=>C.registrar(iniciar(),'a','fim',null,'2026-11-12T09:00:00Z','t'),/anterior/);
 assert.throws(()=>iniciar([{...base[0],status:'Cancelada'}]),/cancelada/);
});
test('calcula corretamente travessia de meia-noite',()=>assert.equal(C.hh(C.duracao({inicio:'2026-11-13T02:45:00Z',fim:'2026-11-13T03:30:00Z'})),'00:45'));
test('botões persistem antes de anunciar sucesso e falha de armazenamento mantém os registros',()=>{
 const vm=require('node:vm'),fs=require('node:fs');let visitas=JSON.parse(JSON.stringify(base)),click,fail=false;
 function element(){return {children:[],hidden:true,textContent:'',dataset:{},append(...nodes){this.children.push(...nodes)},replaceChildren(){this.children=[]}};}
 const elements={deslocamentoMensagem:element(),deslocamentoAtivo:element()};
 const context={SSTDeslocamento:C,document:{getElementById:id=>elements[id],querySelectorAll:()=>[],createElement:element,addEventListener:(name,fn)=>{click=fn}},window:{render(){},remover(){},addEventListener(){}},ler:()=>visitas,salvar:v=>{if(fail)throw Error('Sem espaço');visitas=v},render:()=>{},setInterval(){},KEY:'visitas'};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../js/deslocamento.js'),'utf8'),context);
 function press(acao){const b={dataset:{visita:'a',deslocamento:acao},disabled:false,isConnected:true,closest:()=>({querySelector:()=>({value:'ida'})})};click({target:{closest:()=>b}});}
 fail=true;press('inicio');assert.equal(C.ativo(visitas),null);assert.match(elements.deslocamentoMensagem.textContent,/Sem espaço/);
 fail=false;press('inicio');assert.equal(C.ativo(visitas).visita.id,'a');assert.equal(elements.deslocamentoAtivo.hidden,false);
 press('fim');assert.equal(C.ativo(visitas),null);assert.equal(elements.deslocamentoAtivo.hidden,true);
});
