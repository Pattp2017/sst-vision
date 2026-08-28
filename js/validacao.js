// SST Vision - validação, persistência e múltiplas fotos

document.addEventListener("DOMContentLoaded", () => {
  const preview = document.getElementById("previewContainer");
  const foto = document.getElementById("fotoPreview");
  const btnUsarFoto = document.getElementById("btnUsarFoto");
  const btnRefazerFoto = document.getElementById("btnRefazerFoto");
  const mensagem = document.getElementById("mensagem");
  if (!preview || !foto || !btnUsarFoto) return;

  let modoFotoAdicional = false;
  let analiseIdAtual = null;

  const contextoSalvo = sessionStorage.getItem("sstVisionNovaAnalise");
  if (contextoSalvo) {
    try {
      const c=JSON.parse(contextoSalvo), empresa=document.getElementById("empresa"), setor=document.getElementById("setor"), tipo=document.querySelector(`input[name="tipoInspecao"][value="${c.tipoAnalise}"]`);
      if(empresa)empresa.value=c.empresa||""; if(setor)setor.value=c.setor||""; if(tipo){tipo.checked=true;tipo.dispatchEvent(new Event("change",{bubbles:true}));}
    } catch(e){console.error(e);} sessionStorage.removeItem("sstVisionNovaAnalise");
  }

  let btnValidar=document.getElementById("btnValidarAnalise");
  if(!btnValidar){btnValidar=document.createElement("button");btnValidar.type="button";btnValidar.id="btnValidarAnalise";btnValidar.className="btn btn-validar-analise";btnValidar.textContent="✓ Validar análise";btnValidar.hidden=true;btnUsarFoto.closest(".camera-actions")?.insertAdjacentElement("afterend",btnValidar);}

  let btnMais=document.getElementById("btnAdicionarFoto");
  if(!btnMais){btnMais=document.createElement("button");btnMais.type="button";btnMais.id="btnAdicionarFoto";btnMais.className="btn-adicionar-foto";btnMais.textContent="+";btnMais.title="Adicionar outra foto desta análise";btnMais.setAttribute("aria-label","Adicionar outra foto desta análise");btnMais.hidden=true;document.body.appendChild(btnMais);}

  function mostrarValidar(){const tem=preview.querySelectorAll(".marcador-risco").length>0||(mensagem&&/Identificado:|Nenhum achado marcado/.test(mensagem.textContent||""));if(tem&&!window.sstAnaliseValidada?.salva)btnValidar.hidden=false;}
  const observer=new MutationObserver(mostrarValidar);observer.observe(preview,{childList:true,subtree:false});if(mensagem)observer.observe(mensagem,{childList:true,characterData:true,subtree:true});

  async function imagemAtualBase64(){const r=await fetch(foto.src),b=await r.blob();return await new Promise((resolve,reject)=>{const l=new FileReader();l.onload=()=>resolve(String(l.result).split(",")[1]);l.onerror=reject;l.readAsDataURL(b);});}
  function montarAchados(){const manuais=(window.sstManualAchados||[]).filter(a=>!a.excluido),map=new Map(manuais.map(a=>[String(a.id),a]));return [...preview.querySelectorAll(".marcador-risco")].map((m,i)=>{const n=String(m.dataset.numero||m.textContent||i+1),manual=map.get(n);if(manual)return{...manual,numero:Number(n),origem:"manual"};return{numero:Number(n),titulo:m.title||`Achado ${n}`,x:parseFloat(m.style.left)||50,y:parseFloat(m.style.top)||50,origem:"ia"};});}

  function prepararNovaAnalise(){const empresa=document.getElementById("empresa")?.value.trim()||"",setor=document.getElementById("setor")?.value.trim()||"",tipoAnalise=document.querySelector('input[name="tipoInspecao"]:checked')?.value||"maquina";sessionStorage.setItem("sstVisionNovaAnalise",JSON.stringify({empresa,setor,tipoAnalise}));window.location.reload();}

  function prepararFotoAdicional(){
    modoFotoAdicional=true; window.sstAnaliseValidada=null; btnMais.hidden=true; btnValidar.hidden=true; btnValidar.disabled=false;btnValidar.textContent="✓ Validar nova foto";btnValidar.classList.remove("validada");
    btnUsarFoto.textContent="Usar foto";btnUsarFoto.classList.remove("btn-primary");btnUsarFoto.classList.add("btn-success");btnUsarFoto.onclick=null;
    if(btnRefazerFoto)btnRefazerFoto.hidden=true;
    preview.querySelectorAll(".marcador-risco").forEach(m=>m.remove()); document.getElementById("painelAchado")?.remove();document.getElementById("painelAchadoManual")?.remove();
    window.sstManualAchados=[]; foto.removeAttribute("src"); preview.hidden=true;
    const cameraArea=document.getElementById("cameraArea");if(cameraArea)cameraArea.hidden=false;
    const input=document.getElementById("cameraInput");if(input){input.value="";input.click();}
    if(mensagem){mensagem.hidden=false;mensagem.textContent="Nova foto da mesma análise. Registre outro ângulo da máquina ou ambiente.";}
  }
  btnMais.addEventListener("click",prepararFotoAdicional);

  btnValidar.addEventListener("click",async()=>{
    if(btnValidar.disabled)return;const empresa=document.getElementById("empresa")?.value.trim(),setor=document.getElementById("setor")?.value.trim(),tipoAnalise=document.querySelector('input[name="tipoInspecao"]:checked')?.value,equipamento=document.getElementById("equipamento")?.value.trim(),observacao=document.getElementById("observacao")?.value.trim();if(!empresa||!setor||!tipoAnalise||!foto.src)return;
    const marcadores=[...preview.querySelectorAll(".marcador-risco")];btnValidar.disabled=true;btnValidar.textContent=modoFotoAdicional?"Salvando nova foto...":"Salvando análise...";
    try{
      const imagemBase64=await imagemAtualBase64(),achados=montarAchados(),texto=mensagem?.textContent||"",descricao=texto.match(/Identificado:\s*(.*?)(?:\s*\||$)/)?.[1]||null;
      const endpoint=modoFotoAdicional?"adicionar-foto-analise":"salvar-analise";
      const body=modoFotoAdicional?{analiseId:analiseIdAtual,achados,imagemBase64}:{empresa,setor,tipoAnalise,equipamento,observacao,identificacao:{descricao},achados,imagemBase64};
      const resposta=await fetch(`https://sst-vision.onrender.com/${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),dados=await resposta.json();if(!resposta.ok)throw new Error(dados.mensagem||"Falha ao salvar.");
      analiseIdAtual=dados.analiseId;window.sstAnaliseValidada={validada:true,salva:true,analiseId:analiseIdAtual,validadaEm:new Date().toISOString(),quantidadeAchados:marcadores.length};
      document.getElementById("painelAchado")?.remove();document.getElementById("painelAchadoManual")?.remove();btnValidar.textContent=modoFotoAdicional?`✓ Foto ${dados.ordemFoto} validada e salva`:"✓ Análise validada e salva";btnValidar.classList.add("validada");marcadores.forEach(m=>m.classList.add("marcador-validado"));
      if(btnRefazerFoto)btnRefazerFoto.hidden=true;btnUsarFoto.hidden=false;btnUsarFoto.textContent="Nova análise";btnUsarFoto.classList.remove("btn-success");btnUsarFoto.classList.add("btn-primary");btnUsarFoto.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();prepararNovaAnalise();};
      btnMais.hidden=false;modoFotoAdicional=false;if(mensagem){mensagem.hidden=false;mensagem.textContent=`${dados.ordemFoto>1?`Foto ${dados.ordemFoto}`:"Análise"} validada e salva. ${marcadores.length} achado(s) confirmado(s).`;}
    }catch(e){console.error(e);btnValidar.disabled=false;btnValidar.textContent=modoFotoAdicional?"✓ Validar nova foto":"✓ Validar análise";if(mensagem){mensagem.hidden=false;mensagem.textContent=`Não foi possível salvar. ${e.message||"Tente novamente."}`;}}
  });
});
