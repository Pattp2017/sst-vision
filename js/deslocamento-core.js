(function(root){
 function ativo(visitas){for(const visita of visitas){const trecho=(visita.deslocamentos||[]).find(t=>!t.fim);if(trecho)return {visita,trecho};}return null;}
 function registrar(visitas,visitaId,acao,tipo,agora=new Date().toISOString(),id=globalThis.crypto.randomUUID()){
  const instante=new Date(agora).getTime();if(!Number.isFinite(instante))throw Error('Horário inválido.');
  const visita=visitas.find(v=>v.id===visitaId);if(!visita)throw Error('Visita não encontrada.');
  const emCurso=ativo(visitas);
  let trechos=(visita.deslocamentos||[]).map(t=>({...t}));
  if(acao==='inicio'){
   if(emCurso)throw Error('Finalize o deslocamento em andamento antes de iniciar outro.');
   if(visita.status==='Cancelada')throw Error('Não é possível iniciar deslocamento para uma visita cancelada.');
   if(!['ida','volta'].includes(tipo))throw Error('Escolha ida ou volta.');
   trechos.push({id,tipo,inicio:agora,fim:null});
  }else if(acao==='fim'){
   if(!emCurso||emCurso.visita.id!==visitaId)throw Error('Esta visita não tem deslocamento em andamento.');
   if(instante<new Date(emCurso.trecho.inicio).getTime())throw Error('O horário de chegada não pode ser anterior à saída. Verifique o relógio do dispositivo.');
   trechos=trechos.map(t=>t.id===emCurso.trecho.id?{...t,fim:agora}:t);
  }else throw Error('Ação inválida.');
  return visitas.map(v=>v.id===visitaId?{...v,deslocamentos:trechos}:v);
 }
 function duracao(trecho,agora=Date.now()){return Math.max(0,new Date(trecho.fim||agora).getTime()-new Date(trecho.inicio).getTime());}
 function hh(ms){const m=Math.floor(ms/60000);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');}
 root.SSTDeslocamento={ativo,registrar,duracao,hh};
})(globalThis);
