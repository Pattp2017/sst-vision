(() => {
  function cfg(){return window.SUPABASE_CONFIG||{};}
  function configurado(){return Boolean(cfg().url&&cfg().anonKey);}
  async function supabaseFetch(path,options={}){if(!configurado())throw new Error('Supabase ainda não configurado.');const base=cfg().url.replace(/\/$/,'');const r=await fetch(base+'/rest/v1/'+path,{...options,headers:{apikey:cfg().anonKey,Authorization:'Bearer '+cfg().anonKey,'Content-Type':'application/json',Accept:'application/json',...(options.headers||{})}});const t=await r.text();if(!r.ok)throw new Error(t||('HTTP '+r.status));return t?JSON.parse(t):null;}
  function somenteDigitos(v){return String(v||'').replace(/\D/g,'');}
  function formatarDocumento(v){const d=somenteDigitos(v).slice(0,14);if(d.length<=11)return d.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');return d.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d{1,2})$/,'$1-$2');}
  function formatarCaepf(v){
    return somenteDigitos(v).slice(0,14).replace(/^(\d{3})(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  function cpfValido(v){const d=somenteDigitos(v);if(d.length!==11||/^(\d)\1{10}$/.test(d))return false;let s=0;for(let i=0;i<9;i++)s+=Number(d[i])*(10-i);let x=(s*10)%11;if(x===10)x=0;if(x!==Number(d[9]))return false;s=0;for(let i=0;i<10;i++)s+=Number(d[i])*(11-i);x=(s*10)%11;if(x===10)x=0;return x===Number(d[10]);}
  function cnpjValido(v){const d=somenteDigitos(v);if(d.length!==14||/^(\d)\1{13}$/.test(d))return false;const calc=(base,pesos)=>{let s=0;base.split('').forEach((n,i)=>s+=Number(n)*pesos[i]);const r=s%11;return r<2?0:11-r;};const d1=calc(d.slice(0,12),[5,4,3,2,9,8,7,6,5,4,3,2]);const d2=calc(d.slice(0,12)+d1,[6,5,4,3,2,9,8,7,6,5,4,3,2]);return d1===Number(d[12])&&d2===Number(d[13]);}
  let empresaEditando=null;let consultaSeq=0;
  function tela(){return `<div class="card"><button class="btn" id="empVoltar">← Cadastros</button><h2 style="margin:16px 0 8px">🏢 Empresas</h2><p style="color:#6c757d">Digite o CNPJ, CPF ou CAEPF para consultar uma empresa ou fazenda.</p><label style="max-width:380px">Tipo de consulta<select id="empTipoConsulta"><option value="cpf-cnpj">CNPJ / CPF</option><option value="caepf">CAEPF</option></select></label><label style="max-width:380px"><span id="empRotuloDocumento">CNPJ / CPF</span><input id="empDocumentoEntrada" inputmode="numeric" autocomplete="off" placeholder="00.000.000/0000-00 ou 000.000.000-00"></label><div id="empStatusDocumento" class="aviso"></div><div id="empFormulario" style="display:none;margin-top:18px;padding-top:18px;border-top:1px solid #dde6e3"><h3 id="empTitulo">Nova empresa</h3><div class="grid-form"><label>Nome da empresa / fazenda *<input id="empNome"></label><label>Documento<input id="empDocumento" disabled></label><label>Grupo empresarial (opcional)<input id="empGrupo"></label><label>Telefone<input id="empTelefone"></label><label>E-mail<input id="empEmail" type="email"></label><label class="full">Endereço<input id="empEndereco"></label></div><div id="empAviso" class="aviso"></div><div class="acoes"><button class="btn secundario" id="empLimpar">Limpar</button><button class="btn primario" id="empSalvar">Salvar</button></div></div></div>`;}
  function limpar(manterDocumento=false){empresaEditando=null;['empNome','empGrupo','empTelefone','empEmail','empEndereco'].forEach(id=>document.getElementById(id).value='');document.getElementById('empAviso').textContent='';document.getElementById('empTitulo').textContent='Nova empresa';if(!manterDocumento){document.getElementById('empDocumentoEntrada').value='';document.getElementById('empDocumento').value='';document.getElementById('empFormulario').style.display='none';document.getElementById('empStatusDocumento').textContent='';}}
  function preencher(e){empresaEditando=e;document.getElementById('empTitulo').textContent='Editar empresa';document.getElementById('empNome').value=e.nome||'';document.getElementById('empDocumento').value=String(e.tipo_documento).toUpperCase()==='CAEPF'?formatarCaepf(e.numero_documento):formatarDocumento(e.numero_documento);document.getElementById('empGrupo').value=e.grupo||'';document.getElementById('empTelefone').value=e.telefone||'';document.getElementById('empEmail').value=e.email||'';document.getElementById('empEndereco').value=e.endereco||'';}
  async function consultar(){
    const entrada=document.getElementById('empDocumentoEntrada');
    const status=document.getElementById('empStatusDocumento');
    const form=document.getElementById('empFormulario');
    const caepf=document.getElementById('empTipoConsulta').value==='caepf';
    const formatar=caepf?formatarCaepf:formatarDocumento;
    const d=somenteDigitos(entrada.value);
    entrada.value=formatar(d);
    const seq=++consultaSeq;
    form.style.display='none';

    if(caepf?d.length!==14:d.length!==11&&d.length!==14){
      status.textContent=d?(caepf?'Digite os 14 dígitos do CAEPF.':'Digite 11 dígitos para CPF ou 14 para CNPJ.'):'';
      return;
    }
    if(!caepf&&!(d.length===11?cpfValido(d):cnpjValido(d))){
      status.textContent=(d.length===11?'CPF':'CNPJ')+' inválido. Confira os números informados.';
      return;
    }

    status.textContent='Verificando documento...';
    try{
      const numeros='(numero_documento.eq.'+d+',numero_documento.eq."'+formatar(d)+'")';
      const tipo=caepf
        ? '&tipo_documento=ilike.CAEPF'
        : '&and=(or(tipo_documento.is.null,tipo_documento.not.ilike.CAEPF))';
      const r=await supabaseFetch('empresas?or='+encodeURIComponent(numeros)+tipo+'&select=id,nome,numero_documento,tipo_documento,grupo,telefone,email,endereco,ativo&limit=1');
      if(seq!==consultaSeq||!entrada.isConnected)return;
      limpar(true);
      if(r?.[0]){
        preencher(r[0]);
        form.style.display='block';
        status.textContent='Documento já cadastrado. Cadastro carregado para edição.';
      }else if(caepf){
        status.textContent='Nenhuma empresa ou fazenda encontrada com este CAEPF.';
      }else{
        document.getElementById('empDocumento').value=formatar(d);
        form.style.display='block';
        status.textContent='Documento não cadastrado. Preencha os dados para criar a empresa.';
        document.getElementById('empNome').focus();
      }
    }catch(e){
      if(seq!==consultaSeq||!entrada.isConnected)return;
      status.textContent='Não foi possível verificar o documento: '+e.message;
    }
  }
  async function salvar(){const nome=document.getElementById('empNome').value.trim();const documento=somenteDigitos(document.getElementById('empDocumento').value);if(!nome){document.getElementById('empAviso').textContent='Informe o nome da empresa ou fazenda.';return;}const dados={nome,numero_documento:documento,tipo_documento:documento.length===11?'CPF':'CNPJ',grupo:document.getElementById('empGrupo').value.trim()||null,telefone:document.getElementById('empTelefone').value.trim()||null,email:document.getElementById('empEmail').value.trim()||null,endereco:document.getElementById('empEndereco').value.trim()||null,ativo:true,atualizado_em:new Date().toISOString()};if(String(empresaEditando?.tipo_documento).toUpperCase()==='CAEPF'){delete dados.numero_documento;delete dados.tipo_documento;}try{let retorno;if(empresaEditando){retorno=await supabaseFetch('empresas?id=eq.'+encodeURIComponent(empresaEditando.id),{method:'PATCH',headers:{Prefer:'return=representation'},body:JSON.stringify(dados)});}else{retorno=await supabaseFetch('empresas',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(dados)});}empresaEditando=retorno?.[0]||empresaEditando;document.getElementById('empAviso').textContent=empresaEditando?'Cadastro salvo com sucesso.':'Empresa cadastrada com sucesso.';}catch(e){const m=String(e.message||'');document.getElementById('empAviso').textContent=m.includes('uq_empresas_documento')||m.includes('empresas_documento_key')?'Este documento já pertence a outra empresa cadastrada.':'Erro ao salvar: '+m;}}
  window.renderEmpresasGithub=function(){const area=document.getElementById('conteudoPrincipal');area.innerHTML=tela();document.getElementById('empVoltar').onclick=()=>window.renderCadastrosGithub();const entrada=document.getElementById('empDocumentoEntrada');
    const tipo=document.getElementById('empTipoConsulta');
    entrada.oninput=consultar;
    tipo.onchange=()=>{
      ++consultaSeq;
      limpar(false);
      const caepf=tipo.value==='caepf';
      document.getElementById('empRotuloDocumento').textContent=caepf?'CAEPF':'CNPJ / CPF';
      entrada.placeholder=caepf?'000.000.000/000-00':'00.000.000/0000-00 ou 000.000.000-00';
      entrada.focus();
    };
    document.getElementById('empLimpar').onclick=()=>{++consultaSeq;limpar(false);};document.getElementById('empSalvar').onclick=salvar;document.getElementById('empDocumentoEntrada').focus();};

  const renderOriginal=window.renderCadastrosGithub;
  if(renderOriginal){window.renderCadastrosGithub=async function(){await renderOriginal();const botoes=[...document.querySelectorAll('#conteudoPrincipal button.card')];const empresa=botoes.find(b=>b.textContent.includes('Empresas'));if(empresa){empresa.disabled=false;empresa.style.opacity='1';empresa.innerHTML='<strong style="font-size:17px">🏢 Empresas</strong><div style="font-size:12px;color:#6c757d;margin-top:6px">Empresas e fazendas</div>';empresa.onclick=window.renderEmpresasGithub;}};}
})();