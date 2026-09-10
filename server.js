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

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Variáveis do Supabase não configuradas.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

app.get("/", (req,res)=>res.json({status:"ok",projeto:"SST Vision",mensagem:"Backend funcionando."}));
app.get("/teste-supabase", async (req,res)=>{try{const s=supabaseAdmin();const r={variaveis:{urlConfigurada:Boolean(process.env.SUPABASE_URL),chaveConfigurada:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)},tabela:null,storage:null};const{data:d,error:e}=await s.from("vision_analises").select("id").limit(1);r.tabela=e?{ok:false,erro:e.message,codigo:e.code||null}:{ok:true,registrosLidos:Array.isArray(d)?d.length:0};const{data:b,error:eb}=await s.storage.getBucket("vision-fotos");r.storage=eb?{ok:false,erro:eb.message}:{ok:true,bucket:b?.name||"vision-fotos"};const ok=r.tabela.ok&&r.storage.ok;return res.status(ok?200:500).json({status:ok?"ok":"erro",diagnostico:r});}catch(e){return res.status(500).json({status:"erro",mensagem:e?.message||"Falha no diagnóstico Supabase."});}});

app.get("/analises", async (req,res)=>{try{const s=supabaseAdmin();const{data,error}=await s.from("vision_analises").select("id,empresa,setor,tipo_analise,equipamento,observacao,identificacao_tipo,identificacao_descricao,identificacao_confianca,status,validada_em,criado_em").order("validada_em",{ascending:false,nullsFirst:false});if(error)throw new Error(error.message);return res.json({status:"ok",analises:data||[]});}catch(e){console.error(e);return res.status(500).json({status:"erro",mensagem:e?.message||"Não foi possível consultar as análises."});}});

app.get("/analises/:id", async (req,res)=>{try{const s=supabaseAdmin();const id=req.params.id;const{data:analise,error:ea}=await s.from("vision_analises").select("*").eq("id",id).single();if(ea||!analise)return res.status(404).json({status:"erro",mensagem:"Análise não encontrada."});const{data:fotos,error:ef}=await s.from("vision_fotos").select("*").eq("analise_id",id).order("ordem",{ascending:true});if(ef)throw new Error(ef.message);const{data:achados,error:eac}=await s.from("vision_achados").select("*").eq("analise_id",id).order("numero",{ascending:true});if(eac)throw new Error(eac.message);const fotosComUrl=[];for(const foto of fotos||[]){const{data:assinada,error:es}=await s.storage.from("vision-fotos").createSignedUrl(foto.storage_path,3600);fotosComUrl.push({...foto,url:es?null:assinada?.signedUrl||null});}return res.json({status:"ok",analise,fotos:fotosComUrl,achados:achados||[]});}catch(e){console.error(e);return res.status(500).json({status:"erro",mensagem:e?.message||"Não foi possível carregar a análise."});}});

app.get("/teste-ia", async(req,res)=>{try{const r=await ai.models.generateContent({model:"gemini-3.5-flash-lite",contents:"Responda apenas: SST Vision conectado com sucesso."});res.json({status:"ok",resposta:r.text});}catch(e){console.error(e);res.status(500).json({status:"erro",mensagem:"Falha ao conectar com a IA."});}});

app.post("/transcrever-audio",async(req,res)=>{try{const{audioBase64,mimeType}=req.body;if(!audioBase64)return res.status(400).json({status:"erro",mensagem:"Nenhum áudio recebido."});const permitidos=["audio/webm","audio/mp4","audio/mpeg","audio/wav","audio/ogg"];const recebido=String(mimeType||"audio/webm").split(";")[0].trim().toLowerCase();const tipo=permitidos.includes(recebido)?recebido:"audio/webm";const r=await ai.models.generateContent({model:"gemini-3.5-flash-lite",contents:[{role:"user",parts:[{text:"Transcreva fielmente este áudio em português do Brasil. O áudio é uma observação de campo de uma inspeção de Segurança e Saúde no Trabalho. Retorne somente o texto transcrito, sem explicações e sem acrescentar informações. Corrija apenas pontuação e capitalização."},{inlineData:{mimeType:tipo,data:audioBase64}}]}]});return res.json({status:"ok",texto:String(r.text||"").trim()});}catch(e){console.error(e);return res.status(500).json({status:"erro",mensagem:"Falha ao transcrever o áudio."});}});

const PROMPT_INSPECAO_VISUAL = `Você está auxiliando um profissional em uma inspeção visual de Segurança e Saúde no Trabalho (SST).

Seu papel é OBSERVAR, ESTRUTURAR e SUGERIR. A decisão técnica final pertence ao profissional responsável.

Analise EXCLUSIVAMENTE o que estiver visível na fotografia. Antes de gerar a resposta, faça uma varredura visual sistemática de TODA a cena e verifique, quando aplicável, as seguintes categorias:
1. organização, arranjo físico, circulação e acesso: objetos, materiais, cabos, obstáculos, passagens e espaço de trabalho;
2. ergonomia visualmente observável: postura claramente visível, alcance, espaço para movimentação e disposição do posto;
3. máquinas e equipamentos: partes móveis visíveis, transmissões, zonas de esmagamento/cisalhamento, proteções visíveis e acesso a zonas perigosas;
4. eletricidade: cabos, tomadas, extensões, conexões, painéis e partes elétricas visíveis;
5. quedas e diferenças de nível: piso, escadas, plataformas, aberturas, bordas e acessos;
6. incêndio e emergência: obstruções, armazenamento e condições visualmente observáveis relacionadas a recursos de emergência;
7. agentes e produtos visíveis: recipientes, derramamentos, poeira, fumaça, névoa ou outras condições que possam ser constatadas visualmente;
8. interação entre pessoa, equipamento e ambiente, quando houver pessoas ou atividade visível.

A lista é um roteiro de inspeção, NÃO uma obrigação de criar achados em todas as categorias. Registre somente condições realmente visíveis e potencialmente relevantes para SST. Não omita uma condição visível apenas por parecer secundária. Não crie achados genéricos sem evidência visual.

A análise deve seguir esta lógica:
EVIDÊNCIA VISUAL -> CONTEXTO -> PERIGO -> EVENTO POSSÍVEL -> CONSEQUÊNCIA POSSÍVEL -> RISCO -> MEDIDA SUGERIDA -> VALIDAÇÃO HUMANA.

Ao sugerir medida de controle, use como referência a lógica STOP, sem declarar conformidade legal:
- substituicao: substituir fonte/processo/material quando tecnicamente plausível;
- tecnica: proteção, enclausuramento, barreira, engenharia ou solução física;
- organizacional: procedimento, organização, sinalização, treinamento, restrição de acesso ou gestão;
- individual: EPI ou proteção individual;
- avaliar: quando a fotografia não permitir indicar uma medida com segurança.

Retorne SOMENTE um JSON válido, sem Markdown e sem texto antes ou depois. Use exatamente esta estrutura:
{"identificacao":{"tipo":"maquina | equipamento | ambiente | nao_identificado","descricao":"descrição objetiva do que foi identificado","confianca":"baixa | media | alta"},"contexto":{"atividade_visivel":"descrição objetiva ou null","interacao_pessoa_equipamento":"descrição objetiva ou null","observacoes":"contexto visual útil ou null"},"achados":[{"id":1,"categoria":"organizacao_circulacao | ergonomia | maquinas_equipamentos | eletricidade | quedas_nivel | incendio_emergencia | agentes_produtos | interacao_atividade | outra","titulo":"nome curto do achado","observado":"descrição objetiva somente do que é visível","contexto_visual":"contexto visual diretamente relacionado ao achado","estado_evidencia":"observado | parcialmente_visivel | nao_confirmavel","perigo":"fonte, situação ou condição com potencial de causar lesão ou agravo, sem inventar informação","evento_possivel":"evento perigoso plausível relacionado ao observado, sem tratá-lo como fato","possivel_consequencia":"possível lesão ou agravo, somente quando houver base visual suficiente","possivel_risco":"síntese do risco relacionado ao que foi observado","confianca":"baixa | media | alta","medida_controle":{"nivel":"substituicao | tecnica | organizacional | individual | avaliar","descricao":"medida preventiva sugerida de forma objetiva, sem declarar obrigatoriedade legal"},"requer_confirmacao_humana":true,"posicao":{"x":50,"y":50}}],"limitacoes":["informação relevante que não pode ser confirmada somente pela fotografia"],"principios":{"nao_detectado_nao_significa_inexistente":true,"validacao_humana_obrigatoria":true}}.

REGRAS OBRIGATÓRIAS:
- x e y variam de 0 a 100 e indicam aproximadamente o centro visual do achado.
- Não invente componentes, pessoas, atividades, condições ou defeitos.
- Não trate hipótese como fato observado.
- Não presuma ausência de proteção quando a região correspondente não estiver visível.
- Não conclua que um EPI está ausente se não for possível confirmar que a atividade exige aquele EPI apenas pela imagem.
- Não declare conformidade ou não conformidade legal.
- Não cite NR, NBR ou legislação.
- Não inferira níveis de ruído, temperatura, concentração, tensão elétrica, peso, velocidade ou qualquer grandeza não mensurável pela fotografia.
- Não diagnostique exposição ocupacional apenas pela presença visual de um agente.
- Preserve rigorosamente a distinção entre observado, contexto, perigo, evento possível e possível consequência.
- Use confiança baixa quando a condição estiver parcialmente visível ou ambígua.
- Se a região necessária para confirmar uma hipótese não estiver visível, use estado_evidencia parcialmente_visivel ou nao_confirmavel; não transforme isso em ausência confirmada.
- Se, após a varredura completa, não houver condição visual relevante, retorne achados vazio.
- A ausência de um achado nesta fotografia NÃO prova que a condição inexiste em outros ângulos ou momentos.
- Priorize cobertura da cena sem repetir o mesmo achado com títulos diferentes.
- Medidas sugeridas são apoio à decisão e devem ser confirmadas ou alteradas pelo profissional.`;

app.post("/analisar-imagem",async(req,res)=>{try{const{imagemBase64}=req.body;if(!imagemBase64)return res.status(400).json({status:"erro",mensagem:"Nenhuma imagem recebida."});const r=await ai.models.generateContent({model:"gemini-3.5-flash-lite",contents:[{role:"user",parts:[{text:PROMPT_INSPECAO_VISUAL},{inlineData:{mimeType:"image/jpeg",data:imagemBase64}}]}]});return res.json({status:"ok",analise:r.text});}catch(e){console.error(e);return res.status(500).json({status:"erro",mensagem:"Falha ao processar a imagem."});}});

function valorPosicao(a, eixo) {
  return Number(a?.[eixo] ?? a?.posicao?.[eixo] ?? 50);
}

function registroLegado(analiseId, a, i) {
  return {
    analise_id:analiseId,
    numero:Number(a.numero??a.id??i+1),
    titulo:a.titulo||null,
    observado:a.observado||a.descricao||null,
    possivel_risco:a.possivel_risco||a.risco||null,
    confianca:a.confianca||null,
    posicao_x:valorPosicao(a,"x"),
    posicao_y:valorPosicao(a,"y"),
    origem:a.origem==="manual"||a.manual?"manual":"ia",
    editado:Boolean(a.editado)
  };
}

function registroRico(analiseId, a, i) {
  const base = registroLegado(analiseId,a,i);
  const medida = a.medida_controle || {};
  return {
    ...base,
    categoria:a.categoria||null,
    contexto_visual:a.contexto_visual||null,
    perigo:a.perigo||null,
    evento_possivel:a.evento_possivel||null,
    possivel_consequencia:a.possivel_consequencia||null,
    estado_evidencia:a.estado_evidencia||null,
    hierarquia_controle:medida.nivel||a.hierarquia_controle||null,
    medida_sugerida:medida.descricao||a.medida_sugerida||null,
    status_validacao:a.status_validacao||"confirmado",
    decisao_profissional:a.decisao_profissional||null,
    dados_tecnicos:{
      categoria:a.categoria||null,
      contexto_visual:a.contexto_visual||null,
      perigo:a.perigo||null,
      evento_possivel:a.evento_possivel||null,
      possivel_consequencia:a.possivel_consequencia||null,
      possivel_risco:a.possivel_risco||a.risco||null,
      estado_evidencia:a.estado_evidencia||null,
      confianca:a.confianca||null,
      medida_controle:a.medida_controle||null,
      requer_confirmacao_humana:a.requer_confirmacao_humana!==false,
      status_validacao:a.status_validacao||"confirmado",
      decisao_profissional:a.decisao_profissional||null,
      editado:Boolean(a.editado),
      excluido:Boolean(a.excluido)
    }
  };
}

function erroSchemaNovo(error) {
  const codigo=String(error?.code||"");
  const mensagem=String(error?.message||"").toLowerCase();
  return codigo==="42703"||codigo==="PGRST204"||mensagem.includes("column")||mensagem.includes("schema cache");
}

async function inserirAchados(s, analiseId, achados) {
  const lista=Array.isArray(achados)?achados:[];
  if(!lista.length)return {modo:"vazio",quantidade:0};

  const ricos=lista.map((a,i)=>registroRico(analiseId,a,i));
  const {error:erroRico}=await s.from("vision_achados").insert(ricos);
  if(!erroRico)return {modo:"estruturado",quantidade:ricos.length};
  if(!erroSchemaNovo(erroRico))throw new Error(`vision_achados: ${erroRico.message}`);

  console.warn("Schema estruturado ainda não aplicado. Salvando em modo compatível.");
  const legados=lista
    .filter(a=>a.status_validacao!=="rejeitado"&&a.decisao_profissional!=="rejeitado"&&!a.excluido)
    .map((a,i)=>registroLegado(analiseId,a,i));
  if(!legados.length)return {modo:"legado",quantidade:0};
  const {error:erroLegado}=await s.from("vision_achados").insert(legados);
  if(erroLegado)throw new Error(`vision_achados: ${erroLegado.message}`);
  return {modo:"legado",quantidade:legados.length};
}

app.post("/salvar-analise",async(req,res)=>{let analiseId=null,storagePath=null;try{const{empresa,setor,tipoAnalise,equipamento,observacao,identificacao,achados,imagemBase64}=req.body;if(!empresa||!setor||!tipoAnalise||!imagemBase64)return res.status(400).json({status:"erro",mensagem:"Dados obrigatórios da análise não foram recebidos."});const s=supabaseAdmin();const{data:a,error:ea}=await s.from("vision_analises").insert({empresa,setor,tipo_analise:tipoAnalise,equipamento:equipamento||null,observacao:observacao||null,identificacao_tipo:identificacao?.tipo||null,identificacao_descricao:identificacao?.descricao||null,identificacao_confianca:identificacao?.confianca||null,status:"validada",validada_em:new Date().toISOString()}).select("id").single();if(ea)throw new Error(`vision_analises: ${ea.message}`);analiseId=a.id;const buffer=Buffer.from(imagemBase64,"base64");storagePath=`${analiseId}/foto-1.jpg`;const{error:eu}=await s.storage.from("vision-fotos").upload(storagePath,buffer,{contentType:"image/jpeg",upsert:false});if(eu)throw new Error(`Storage vision-fotos: ${eu.message}`);const{error:ef}=await s.from("vision_fotos").insert({analise_id:analiseId,storage_path:storagePath,ordem:1});if(ef)throw new Error(`vision_fotos: ${ef.message}`);const persistencia=await inserirAchados(s,analiseId,achados);return res.json({status:"ok",mensagem:"Análise salva com sucesso.",analiseId,ordemFoto:1,persistencia});}catch(e){console.error(e);try{const s=supabaseAdmin();if(storagePath)await s.storage.from("vision-fotos").remove([storagePath]);if(analiseId)await s.from("vision_analises").delete().eq("id",analiseId);}catch(er){console.error(er);}return res.status(500).json({status:"erro",mensagem:e?.message||"Não foi possível salvar a análise no banco."});}});

app.post("/adicionar-foto-analise",async(req,res)=>{let storagePath=null;try{const{analiseId,achados,imagemBase64}=req.body;if(!analiseId||!imagemBase64)return res.status(400).json({status:"erro",mensagem:"Análise e foto são obrigatórias."});const s=supabaseAdmin();const{data:existente,error:ee}=await s.from("vision_analises").select("id").eq("id",analiseId).single();if(ee||!existente)throw new Error("Análise original não encontrada.");const{data:fotos,error:ec}=await s.from("vision_fotos").select("ordem").eq("analise_id",analiseId).order("ordem",{ascending:false}).limit(1);if(ec)throw new Error(`vision_fotos: ${ec.message}`);const ordem=(fotos?.[0]?.ordem||0)+1;storagePath=`${analiseId}/foto-${ordem}.jpg`;const buffer=Buffer.from(imagemBase64,"base64");const{error:eu}=await s.storage.from("vision-fotos").upload(storagePath,buffer,{contentType:"image/jpeg",upsert:false});if(eu)throw new Error(`Storage vision-fotos: ${eu.message}`);const{error:ef}=await s.from("vision_fotos").insert({analise_id:analiseId,storage_path:storagePath,ordem});if(ef)throw new Error(`vision_fotos: ${ef.message}`);const persistencia=await inserirAchados(s,analiseId,achados);return res.json({status:"ok",mensagem:"Foto adicionada à análise.",analiseId,ordemFoto:ordem,persistencia});}catch(e){console.error(e);try{if(storagePath)await supabaseAdmin().storage.from("vision-fotos").remove([storagePath]);}catch(er){console.error(er);}return res.status(500).json({status:"erro",mensagem:e?.message||"Não foi possível adicionar a foto."});}});

app.listen(PORT,()=>console.log(`SST Vision rodando na porta ${PORT}`));