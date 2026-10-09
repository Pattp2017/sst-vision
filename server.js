import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: "15mb" }));

function supabaseAdmin(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new Error("Variáveis do Supabase não configuradas.");return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}
app.get("/",(req,res)=>res.json({status:"ok",projeto:"SST Vision",mensagem:"Backend funcionando."}));
app.get("/teste-supabase",async(req,res)=>{try{const s=supabaseAdmin();const r={variaveis:{urlConfigurada:Boolean(process.env.SUPABASE_URL),chaveConfigurada:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)},tabela:null,storage:null};const{data:d,error:e}=await s.from("vision_analises").select("id").limit(1);r.tabela=e?{ok:false,erro:e.message,codigo:e.code||null}:{ok:true,registrosLidos:Array.isArray(d)?d.length:0};const{data:b,error:eb}=await s.storage.getBucket("vision-fotos");r.storage=eb?{ok:false,erro:eb.message}:{ok:true,bucket:b?.name||"vision-fotos"};const ok=r.tabela.ok&&r.storage.ok;return res.status(ok?200:500).json({status:ok?"ok":"erro",diagnostico:r});}catch(e){return res.status(500).json({status:"erro",mensagem:e?.message||"Falha no diagnóstico Supabase."});}});
app.get("/analises",async(req,res)=>{try{const s=supabaseAdmin();const{data,error}=await s.from("vision_analises").select("id,empresa,setor,tipo_analise,equipamento,observacao,identificacao_tipo,identificacao_descricao,identificacao_confianca,status,validada_em,criado_em").order("validada_em",{ascending:false,nullsFirst:false});if(error)throw new Error(error.message);return res.json({status:"ok",analises:data||[]});}catch(e){return res.status(500).json({status:"erro",mensagem:e?.message||"Não foi possível consultar as análises."});}});
app.get("/analises/:id",async(req,res)=>{try{const s=supabaseAdmin(),id=req.params.id;const{data:analise,error:ea}=await s.from("vision_analises").select("*").eq("id",id).single();if(ea||!analise)return res.status(404).json({status:"erro",mensagem:"Análise não encontrada."});const{data:fotos,error:ef}=await s.from("vision_fotos").select("*").eq("analise_id",id).order("ordem",{ascending:true});if(ef)throw new Error(ef.message);const{data:achados,error:eac}=await s.from("vision_achados").select("*").eq("analise_id",id).order("numero",{ascending:true});if(eac)throw new Error(eac.message);const fotosComUrl=[];for(const foto of fotos||[]){const{data:assinada,error:es}=await s.storage.from("vision-fotos").createSignedUrl(foto.storage_path,3600);fotosComUrl.push({...foto,url:es?null:assinada?.signedUrl||null});}return res.json({status:"ok",analise,fotos:fotosComUrl,achados:achados||[]});}catch(e){return res.status(500).json({status:"erro",mensagem:e?.message||"Não foi possível carregar a análise."});}});
app.get("/teste-ia",async(req,res)=>{try{const r=await ai.models.generateContent({model:"gemini-3.5-flash-lite",contents:"Responda apenas: SST Vision conectado com sucesso."});res.json({status:"ok",resposta:r.text});}catch(e){res.status(500).json({status:"erro",mensagem:"Falha ao conectar com a IA."});}});
app.post("/transcrever-audio",async(req,res)=>{try{const{audioBase64,mimeType}=req.body;if(!audioBase64)return res.status(400).json({status:"erro",mensagem:"Nenhum áudio recebido."});const permitidos=["audio/webm","audio/mp4","audio/mpeg","audio/wav","audio/ogg"],recebido=String(mimeType||"audio/webm").split(";")[0].trim().toLowerCase(),tipo=permitidos.includes(recebido)?recebido:"audio/webm";const r=await ai.models.generateContent({model:"gemini-3.5-flash-lite",contents:[{role:"user",parts:[{text:"Transcreva fielmente este áudio em português do Brasil. Retorne somente o texto transcrito, sem acrescentar informações."},{inlineData:{mimeType:tipo,data:audioBase64}}]}]});return res.json({status:"ok",texto:String(r.text||"").trim()});}catch(e){return res.status(500).json({status:"erro",mensagem:"Falha ao transcrever o áudio."});}});

const PROMPT_INSPECAO_VISUAL=`Você auxilia um profissional em inspeção visual de Segurança e Saúde no Trabalho (SST). A IA NÃO é o responsável técnico. Sua função é observar, estruturar hipóteses e indicar o que precisa de confirmação humana.

PRINCÍPIO CENTRAL: SEPARE O QUE A CÂMERA MOSTRA DO QUE VOCÊ INFERE.
Antes de chamar qualquer condição de perigo ou risco, pergunte internamente: "consigo apontar na fotografia a evidência que sustenta esta afirmação?". Se não, não apresente a hipótese como achado confirmado.

Faça varredura de toda a cena, considerando organização/acesso, ergonomia visual, máquinas/equipamentos, eletricidade, quedas, emergência, agentes/produtos visíveis e interação pessoa-equipamento. A lista é roteiro, não obrigação de criar achados.

CLASSIFIQUE CADA EVIDÊNCIA EM UM DESTES 3 ESTADOS:
1. observado: a condição relevante está claramente visível e pode ser descrita sem suposição;
2. requer_verificacao: existe indício visual relevante, mas falta ângulo, detalhe, identificação do componente, condição de operação ou outra informação para concluir;
3. nao_avaliavel: a fotografia não fornece evidência suficiente. Use este estado em limitacoes/verificacoes_recomendadas e NÃO crie um risco como fato.

REGRAS CONTRA INFERÊNCIA EXCESSIVA:
- Ver um componente mecânico NÃO prova que ele seja móvel, esteja em movimento, desprotegido ou acessível durante operação.
- Só nomeie componente específico (ex.: cardã, eixo de transmissão, correia, polia, mangueira hidráulica) quando sua identidade for visualmente inequívoca. Caso contrário use descrição genérica, como "componente mecânico parcialmente visível".
- Ver uma mangueira NÃO prova pressão, fluido, vazamento, defeito ou risco químico.
- Ver reservatório NÃO prova seu conteúdo.
- Ver estrutura tubular NÃO prova que seja ROPS certificada, íntegra ou inadequada.
- Não conclua ausência de cinto, EPI, proteção ou dispositivo se a região necessária não estiver claramente visível.
- Sujidade normal de uso não é achado por si só. Só registre quando houver interferência visual concreta em acesso, circulação, comando ou componente.
- Não declare conformidade/não conformidade legal e não cite NR/NBR.
- Não infira ruído, temperatura, concentração, tensão, pressão, peso ou velocidade.
- Um risco só pode receber estado observado quando a condição que gera o perigo também estiver visualmente demonstrável.
- Quando houver indício mas a conclusão depender de inspeção presencial, use requer_verificacao, confiança baixa ou média, medida_controle.nivel="avaliar" e formule o risco como hipótese a verificar.
- "Não detectado" jamais significa "inexistente".

Para máquinas, dê atenção também a acessos/degraus, objetos soltos que interfiram no posto, linhas/conexões, regiões de acoplamento e zonas parcialmente visíveis. Não invente defeito para aumentar a quantidade de achados.

Retorne SOMENTE JSON válido:
{"identificacao":{"tipo":"maquina | equipamento | ambiente | nao_identificado","descricao":"descrição objetiva","confianca":"baixa | media | alta"},"contexto":{"atividade_visivel":"texto ou null","interacao_pessoa_equipamento":"texto ou null","observacoes":"texto ou null"},"achados":[{"id":1,"categoria":"organizacao_circulacao | ergonomia | maquinas_equipamentos | eletricidade | quedas_nivel | incendio_emergencia | agentes_produtos | interacao_atividade | outra","titulo":"título estritamente sustentado pela imagem","observado":"somente fatos visíveis","contexto_visual":"onde/como a evidência aparece","estado_evidencia":"observado | requer_verificacao","perigo":"perigo confirmado visualmente ou hipótese explicitamente condicionada à verificação","evento_possivel":"evento plausível, sem tratá-lo como fato","possivel_consequencia":"consequência possível ou null","possivel_risco":"síntese prudente; se requer verificação, deixar isso explícito","confianca":"baixa | media | alta","medida_controle":{"nivel":"substituicao | tecnica | organizacional | individual | avaliar","descricao":"medida sugerida; para hipótese não confirmada, priorizar verificação presencial"},"requer_confirmacao_humana":true,"posicao":{"x":50,"y":50}}],"verificacoes_recomendadas":[{"titulo":"item não avaliável ou hipótese que merece outro ângulo","motivo":"por que a fotografia não permite concluir"}],"limitacoes":["limitações da evidência"],"principios":{"nao_detectado_nao_significa_inexistente":true,"validacao_humana_obrigatoria":true}}.

x e y vão de 0 a 100. Se não houver condição relevante claramente visível, achados pode ser vazio. Verificações recomendadas não são achados nem riscos confirmados.`;

app.post("/analisar-imagem",async(req,res)=>{try{const{imagemBase64}=req.body;if(!imagemBase64)return res.status(400).json({status:"erro",mensagem:"Nenhuma imagem recebida."});const r=await ai.models.generateContent({model:"gemini-3.5-flash-lite",contents:[{role:"user",parts:[{text:PROMPT_INSPECAO_VISUAL},{inlineData:{mimeType:"image/jpeg",data:imagemBase64}}]}]});return res.json({status:"ok",analise:r.text});}catch(e){console.error(e);return res.status(500).json({status:"erro",mensagem:"Falha ao processar a imagem."});}});

function valorPosicao(a,eixo){return Number(a?.[eixo]??a?.posicao?.[eixo]??50);}
function registroLegado(analiseId,a,i){return{analise_id:analiseId,numero:Number(a.numero??a.id??i+1),titulo:a.titulo||null,observado:a.observado||a.descricao||null,possivel_risco:a.possivel_risco||a.risco||null,confianca:a.confianca||null,posicao_x:valorPosicao(a,"x"),posicao_y:valorPosicao(a,"y"),origem:a.origem==="manual"||a.manual?"manual":"ia",editado:Boolean(a.editado)};}
function registroRico(analiseId,a,i){const base=registroLegado(analiseId,a,i),medida=a.medida_controle||{};return{...base,categoria:a.categoria||null,contexto_visual:a.contexto_visual||null,perigo:a.perigo||null,evento_possivel:a.evento_possivel||null,possivel_consequencia:a.possivel_consequencia||null,estado_evidencia:a.estado_evidencia||null,hierarquia_controle:medida.nivel||a.hierarquia_controle||null,medida_sugerida:medida.descricao||a.medida_sugerida||null,status_validacao:a.status_validacao||"confirmado",decisao_profissional:a.decisao_profissional||null,dados_tecnicos:{...a}};}
function erroSchemaNovo(error){const c=String(error?.code||""),m=String(error?.message||"").toLowerCase();return c==="42703"||c==="PGRST204"||m.includes("column")||m.includes("schema cache");}
async function inserirAchados(s,analiseId,achados){const lista=Array.isArray(achados)?achados:[];if(!lista.length)return{modo:"vazio",quantidade:0};const ricos=lista.map((a,i)=>registroRico(analiseId,a,i));const{error:er}=await s.from("vision_achados").insert(ricos);if(!er)return{modo:"estruturado",quantidade:ricos.length};if(!erroSchemaNovo(er))throw new Error(`vision_achados: ${er.message}`);const legados=lista.filter(a=>a.status_validacao!=="rejeitado"&&!a.excluido).map((a,i)=>registroLegado(analiseId,a,i));if(legados.length){const{error:e}=await s.from("vision_achados").insert(legados);if(e)throw new Error(`vision_achados: ${e.message}`);}return{modo:"compatibilidade",quantidade:legados.length};}
app.post("/salvar-analise",async(req,res)=>{let analiseId=null,storagePath=null;try{const{empresa,setor,tipoAnalise,equipamento,observacao,identificacao,achados,imagemBase64}=req.body;if(!empresa||!setor||!tipoAnalise||!imagemBase64)return res.status(400).json({status:"erro",mensagem:"Dados obrigatórios da análise não foram recebidos."});const s=supabaseAdmin();const{data:a,error:ea}=await s.from("vision_analises").insert({empresa,setor,tipo_analise:tipoAnalise,equipamento:equipamento||null,observacao:observacao||null,identificacao_tipo:identificacao?.tipo||null,identificacao_descricao:identificacao?.descricao||null,identificacao_confianca:identificacao?.confianca||null,status:"validada",validada_em:new Date().toISOString()}).select("id").single();if(ea)throw new Error(ea.message);analiseId=a.id;storagePath=`${analiseId}/foto-1.jpg`;const buffer=Buffer.from(imagemBase64,"base64");const{error:eu}=await s.storage.from("vision-fotos").upload(storagePath,buffer,{contentType:"image/jpeg",upsert:false});if(eu)throw new Error(eu.message);const{error:ef}=await s.from("vision_fotos").insert({analise_id:analiseId,storage_path:storagePath,ordem:1});if(ef)throw new Error(ef.message);const persistencia=await inserirAchados(s,analiseId,achados);return res.json({status:"ok",mensagem:"Análise salva com sucesso.",analiseId,ordemFoto:1,persistencia});}catch(e){console.error(e);try{const s=supabaseAdmin();if(storagePath)await s.storage.from("vision-fotos").remove([storagePath]);if(analiseId)await s.from("vision_analises").delete().eq("id",analiseId);}catch{}return res.status(500).json({status:"erro",mensagem:e?.message||"Não foi possível salvar a análise no banco."});}});
app.post("/adicionar-foto-analise",async(req,res)=>{let storagePath=null;try{const{analiseId,achados,imagemBase64}=req.body;if(!analiseId||!imagemBase64)return res.status(400).json({status:"erro",mensagem:"Análise e foto são obrigatórias."});const s=supabaseAdmin();const{data:existente,error:ee}=await s.from("vision_analises").select("id").eq("id",analiseId).single();if(ee||!existente)throw new Error("Análise original não encontrada.");const{data:fotos,error:ec}=await s.from("vision_fotos").select("ordem").eq("analise_id",analiseId).order("ordem",{ascending:false}).limit(1);if(ec)throw new Error(ec.message);const ordem=(fotos?.[0]?.ordem||0)+1;storagePath=`${analiseId}/foto-${ordem}.jpg`;const buffer=Buffer.from(imagemBase64,"base64");const{error:eu}=await s.storage.from("vision-fotos").upload(storagePath,buffer,{contentType:"image/jpeg",upsert:false});if(eu)throw new Error(eu.message);const{error:ef}=await s.from("vision_fotos").insert({analise_id:analiseId,storage_path:storagePath,ordem});if(ef)throw new Error(ef.message);const persistencia=await inserirAchados(s,analiseId,achados);return res.json({status:"ok",mensagem:"Foto adicionada à análise.",analiseId,ordemFoto:ordem,persistencia});}catch(e){console.error(e);try{if(storagePath)await supabaseAdmin().storage.from("vision-fotos").remove([storagePath]);}catch{}return res.status(500).json({status:"erro",mensagem:e?.message||"Não foi possível adicionar a foto."});}});

// Revisão textual do RV: a IA não deve adicionar fatos, riscos, normas ou prazos.
app.post("/analisar-fotos-rv",async(req,res)=>{
 try{
  const fotos=req.body?.fotos;
  if(!Array.isArray(fotos)||!fotos.length||fotos.length>6)return res.status(400).json({status:"erro",mensagem:"Envie de 1 a 6 fotos por análise."});
  const partes=[{text:[
   "Atue como profissional experiente em Segurança e Saúde no Trabalho. Analise somente as fotografias fornecidas, em conjunto com o contexto informado.",
   "Produza um objeto JSON com exatamente duas chaves string: evidencia e recomendacao.",
   "Em evidencia, descreva objetivamente apenas as condições visualmente verificáveis; não afirme medições, conformidade legal, falta de EPI fora do enquadramento, causas ou riscos não demonstrados. Explicite incertezas e necessidade de inspeção presencial.",
   "Em recomendacao, apresente orientações técnicas proporcionais aos achados visíveis, indicando verificações necessárias quando cabível. Não invente normas, decisões, responsáveis ou prazos.",
   "Não afirme que houve inspeção técnica presencial. Não invente defeitos apenas para preencher o relatório. Caso não haja evidência suficiente, declare a limitação.",
   "Contexto do setor (fornecido pelo usuário): "+String(req.body?.ambiente||"").slice(0,250),
   "Observações fornecidas pelo usuário: "+String(req.body?.observacao||"").slice(0,1000),
   "Responda em português brasileiro, com texto técnico objetivo, exclusivamente JSON."
  ].join("\\n")}];
  for(const foto of fotos){
   if(typeof foto!=="string"||!/^data:image\\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(foto)||foto.length>2500000)return res.status(400).json({status:"erro",mensagem:"Formato ou tamanho de foto inválido."});
   const [prefixo,dados]=foto.split(",");
   partes.push({inlineData:{mimeType:prefixo.slice(5,-7),data:dados}});
  }
  let resposta;
  for(let tentativa=0;tentativa<3;tentativa++){
   try{resposta=await ai.models.generateContent({model:process.env.GEMINI_RV_MODEL||"gemini-3.8-flash",contents:[{role:"user",parts:partes}],config:{responseMimeType:"application/json"}});break}
   catch(e){const status=Number(e?.status||e?.code||0);if(![429,503].includes(status)||tentativa===2)throw e;await new Promise(resolve=>setTimeout(resolve,1000*(tentativa+1)))}
  }
  const resultado=JSON.parse(String(resposta.text||"").replace(/^```(?:json)?\\s*/i,"").replace(/\\s*```$/,"").trim());
  if(typeof resultado?.evidencia!=="string"||typeof resultado?.recomendacao!=="string")throw Error("Resposta incompleta da IA");
  res.json({status:"ok",evidencia:resultado.evidencia.slice(0,4000),recomendacao:resultado.recomendacao.slice(0,4000)});
 }catch(e){
  const status=Number(e?.status||e?.code||0);
  console.error("Falha análise fotográfica RV:",{status,detalhe:String(e?.message||e)});
  res.status(502).json({status:"erro",mensagem:status===503?"Gemini temporariamente sobrecarregado. Tente novamente.":"Não foi possível analisar as fotos. Consulte os logs do Render."});
 }
});

app.post("/melhorar-texto-rv",async(req,res)=>{
 try{
  const entrada=req.body?.textos;
  if(!entrada||typeof entrada!=="object"||Array.isArray(entrada))return res.status(400).json({status:"erro",mensagem:"Textos inválidos."});
  const textos={};
  for(const [chave,valor] of Object.entries(entrada)){
   if(!/^(objetivo|atividades|conclusao|item_[0-9]+_(constatacao|recomendacao|providencia))$/.test(chave)||typeof valor!=="string")continue;
   if(valor.trim())textos[chave]=valor.slice(0,3500);
  }
  if(!Object.keys(textos).length)return res.status(400).json({status:"erro",mensagem:"Não há textos para revisar."});
  const instrucao=[
   "Atue como engenheiro de Segurança do Trabalho experiente, revisando um relatório de visita técnica de SST no Brasil.",
   "Objetivo: transformar anotações breves em redação técnica clara, consistente, objetiva e suficientemente detalhada para orientar ações corretivas e acompanhamento.",
   "Em constatações, descreva tecnicamente a condição informada, o mecanismo de exposição e as possíveis consequências, quando inferíveis com segurança. Diferencie expressamente observação registrada de risco potencial.",
   "Em recomendações, detalhe medidas de controle compatíveis com a condição descrita, priorizando eliminação, substituição, medidas de engenharia, administrativas e EPI conforme pertinência. Não apresente medidas não deliberadas como providências já acordadas.",
   "Em providências, preserve integralmente o que foi efetivamente decidido. Em atividades e objetivo, use terminologia profissional sem ampliar o escopo real da visita. Em considerações finais, sintetize resultados e necessidades de acompanhamento sem declarar regularidade ou conformidade não comprovada.",
   "Não invente inspeções, medições, causas definitivas, irregularidades, normas específicas, obrigações legais, dados, responsáveis, prazos, medidas executadas, decisões, treinamentos ou EPIs que não constem do texto original.",
   "Não cite números de NRs ou normas ABNT sem fundamento explícito fornecido no texto. Quando faltarem dados relevantes, formule recomendações condicionais sem afirmar que a situação foi verificada.",
   "Evite frases genéricas, repetições, alarmismo e excesso de formalismo. Cada campo deve ser um parágrafo técnico completo, preferencialmente entre 50 e 110 palavras quando houver conteúdo suficiente; anotações simples podem gerar textos menores.",
   "Mantenha o mesmo significado de cada chave e não mova informações entre registros. Escreva em português brasileiro.",
   "Retorne exclusivamente um objeto JSON válido com exatamente as mesmas chaves de entrada e valores string, sem markdown.",
   "Textos para revisão: "+JSON.stringify(textos)
  ].join("\n");
  let resposta;
  for(let tentativa=0;tentativa<3;tentativa++){
   try{
    resposta=await ai.models.generateContent({model:process.env.GEMINI_RV_MODEL||"gemini-3.8-flash",contents:instrucao,config:{responseMimeType:"application/json"}});
    break;
   }catch(erro){
    const codigo=Number(erro?.status||erro?.code||0);
    if(![429,503].includes(codigo)||tentativa===2)throw erro;
    const espera=1000*Math.pow(2,tentativa);
    console.warn("Gemini temporariamente indisponível; nova tentativa:",{codigo,tentativa:tentativa+2,esperaMs:espera});
    await new Promise(resolve=>setTimeout(resolve,espera));
   }
  }
  const bruto=String(resposta.text||"").trim();
  const parsed=JSON.parse(bruto.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,""));
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("Resposta JSON inválida");
  const revisados={};
  for(const [chave,original] of Object.entries(textos))revisados[chave]=typeof parsed[chave]==="string"&&parsed[chave].trim()?parsed[chave].slice(0,4000):original;
  res.json({status:"ok",textos:revisados});
 }catch(e){
  const detalhe=String(e?.message||e||"Erro desconhecido");
  const status=Number(e?.status||e?.code||0);
  const categoria=status===429?"LIMITE_GEMINI":status===401||status===403?"AUTENTICACAO_GEMINI":status===404?"MODELO_GEMINI":status===503?"INDISPONIBILIDADE_GEMINI":detalhe.includes("JSON")?"RESPOSTA_INVALIDA":"FALHA_GEMINI";
  console.error("Falha revisão RV:",{categoria,status,detalhe});
  res.status(502).json({status:"erro",mensagem:"Falha na revisão com IA ("+categoria+"). Consulte os logs do Render.",codigo:categoria});
 }
});

app.listen(PORT,()=>console.log(`SST Vision rodando na porta ${PORT}`));