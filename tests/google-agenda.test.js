import test from 'node:test';
import assert from 'node:assert/strict';
import '../js/google-agenda-core.js';
const {horario,chave,mesclar}=globalThis.SSTGoogleAgenda;
const event={id:'ev1',summary:'Visita SST - MakReis',description:'Inspecionar extintores',location:'Unidade 1',start:{dateTime:'2026-11-13T11:00:00Z'},end:{dateTime:'2026-11-13T13:00:00Z'},attendees:[{displayName:'Responsável'},{email:'eu@exemplo.com',self:true},{email:'nao@exemplo.com',responseStatus:'declined'}]};
const item={event,empresa:'MakReis'};
test('converte UTC para Brasília e calcula a duração',()=>assert.deepEqual(horario(event),{data:'2026-11-13',hora:'08:00',duracao:120,diaInteiro:false}));
test('importa, vincula e preserva o acompanhamento ao reimportar',()=>{
 const primeira=mesclar([], [item], 'equipe','Equipe');
 assert.equal(primeira.novas,1);assert.equal(primeira.visitas[0].acompanhante,'Responsável');
 const editada={...primeira.visitas[0],status:'Realizada',objetivo:'Revisado',observacoes:'Campo',empresa:'Nome confirmado'};
 const segunda=mesclar([editada],[{...item,event:{...event,start:{dateTime:'2026-11-14T12:00:00Z'},end:{dateTime:'2026-11-14T13:00:00Z'}}}],'equipe','Equipe');
 assert.equal(segunda.visitas.length,1);assert.equal(segunda.atualizadas,1);
 assert.equal(segunda.visitas[0].hora,'09:00');assert.equal(segunda.visitas[0].data,'2026-11-14');
 for(const campo of ['status','objetivo','observacoes','empresa'])assert.equal(segunda.visitas[0][campo],editada[campo]);
});
test('distingue agendas e ocorrências de eventos recorrentes',()=>{
 const r=mesclar([], [item,{...item,event:{...event,id:'ev1_20261114'}}], 'a','A');
 assert.equal(r.visitas.length,2);
 assert.equal(mesclar(r.visitas,[item],'b','B').visitas.length,3);
 assert.notEqual(chave('ab','c'),chave('a','bc'));
});
test('exige horário para evento de dia inteiro e não altera a entrada em caso de erro',()=>{
 const dia={...item,event:{...event,start:{date:'2026-11-13'},end:{date:'2026-11-14'}}};const visitas=[];
 assert.throws(()=>mesclar(visitas,[item,dia],'a','A'),/horário/);assert.equal(visitas.length,0);
 assert.equal(mesclar([], [{...dia,hora:'08:30'}], 'a','A').visitas[0].hora,'08:30');
});
test('recusa evento cancelado e empresa vazia',()=>{
 assert.throws(()=>mesclar([],[{...item,event:{...event,status:'cancelled'}}],'a','A'),/cancelado/);
 assert.throws(()=>mesclar([],[{...item,empresa:' '}],'a','A'),/empresa/);
});
