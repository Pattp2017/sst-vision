(function(root){
  const ZONE='America/Sao_Paulo';
  function horario(event){
    if(event.start?.date)return {data:event.start.date,hora:'',duracao:120,diaInteiro:true};
    const inicio=new Date(event.start?.dateTime),fim=new Date(event.end?.dateTime);
    if(!Number.isFinite(inicio.getTime()))throw Error('Evento sem data válida.');
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(inicio).map(p=>[p.type,p.value]));
    return {data:`${parts.year}-${parts.month}-${parts.day}`,hora:`${parts.hour}:${parts.minute}`,duracao:Number.isFinite(fim.getTime())?Math.max(1,Math.round((fim-inicio)/60000)):120,diaInteiro:false};
  }
  function chave(calendarId,eventId){return JSON.stringify([calendarId,eventId]);}
  function mesclar(visitas,selecionados,calendarId,calendarName,agora=new Date().toISOString()){
    const saida=visitas.map(v=>({...v}));let novas=0,atualizadas=0;
    for(const {event,empresa,hora} of selecionados){
      if(!event.id||event.status==='cancelled')throw Error('Evento inválido ou cancelado.');
      if(!empresa?.trim())throw Error('Informe a empresa de cada evento selecionado.');
      const h=horario(event);if(h.diaInteiro&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora||''))throw Error('Informe o horário dos eventos de dia inteiro.');
      const key=chave(calendarId,event.id),i=saida.findIndex(v=>v.google?.chave===key);
      const original=i>=0?saida[i]:null;
      const google={chave:key,calendarId,eventId:event.id,calendarName,htmlLink:event.htmlLink||'',updated:event.updated||'',importadoEm:agora};
      const v=original?{...original,data:h.data,hora:h.hora||hora,duracao:h.duracao,google}:{id:'g_'+encodeURIComponent(key).replaceAll("'",'%27'),empresa:empresa.trim(),local:event.location||'',data:h.data,hora:h.hora||hora,duracao:h.duracao,tipo:'Visita técnica',objetivo:event.description||event.summary||'Visita técnica',acompanhante:(event.attendees||[]).filter(a=>!a.self&&!a.resource&&a.responseStatus!=='declined').map(a=>a.displayName||a.email).filter(Boolean).join(', '),status:'Agendada',observacoes:'Importada do Google Agenda: '+(event.summary||'Sem título'),google};
      if(original){saida[i]=v;atualizadas++;}else{saida.push(v);novas++;}
    }
    return {visitas:saida,novas,atualizadas};
  }
  root.SSTGoogleAgenda={horario,chave,mesclar};
})(globalThis);
