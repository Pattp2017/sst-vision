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

app.get("/", (req, res) => res.json({ status: "ok", projeto: "SST Vision", mensagem: "Backend funcionando." }));

app.get("/teste-ia", async (req, res) => {
  try {
    const response = await ai.models.generateContent({ model: "gemini-3.5-flash-lite", contents: "Responda apenas: SST Vision conectado com sucesso." });
    res.json({ status: "ok", resposta: response.text });
  } catch (erro) {
    console.error("Erro Gemini:", erro);
    res.status(500).json({ status: "erro", mensagem: "Falha ao conectar com a IA." });
  }
});

app.post("/transcrever-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) return res.status(400).json({ status: "erro", mensagem: "Nenhum áudio recebido." });
    const tiposPermitidos = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"];
    const tipoRecebido = String(mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
    const tipoAudio = tiposPermitidos.includes(tipoRecebido) ? tipoRecebido : "audio/webm";
    const respostaIA = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: "Transcreva fielmente este áudio em português do Brasil. O áudio é uma observação de campo de uma inspeção de Segurança e Saúde no Trabalho. Retorne somente o texto transcrito, sem explicações e sem acrescentar informações. Corrija apenas pontuação e capitalização." }, { inlineData: { mimeType: tipoAudio, data: audioBase64 } }] }]
    });
    return res.json({ status: "ok", texto: String(respostaIA.text || "").trim() });
  } catch (erro) {
    console.error("Erro ao transcrever áudio:", erro);
    return res.status(500).json({ status: "erro", mensagem: "Falha ao transcrever o áudio." });
  }
});

app.post("/analisar-imagem", async (req, res) => {
  try {
    const { imagemBase64 } = req.body;
    if (!imagemBase64) return res.status(400).json({ status: "erro", mensagem: "Nenhuma imagem recebida." });
    const respostaIA = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: `Você está auxiliando em uma inspeção visual de Segurança e Saúde no Trabalho (SST).
Analise exclusivamente o que estiver visível na fotografia.
Retorne SOMENTE um JSON válido, sem Markdown e sem texto antes ou depois.
Use exatamente esta estrutura:
{"identificacao":{"tipo":"maquina | equipamento | ambiente | nao_identificado","descricao":"descrição objetiva do que foi identificado","confianca":"baixa | media | alta"},"achados":[{"id":1,"titulo":"nome curto do achado","observado":"descrição somente do que é visível","possivel_risco":"risco relacionado ao que foi observado","confianca":"baixa | media | alta","posicao":{"x":50,"y":50}}],"limitacoes":["informação que não pode ser confirmada somente pela fotografia"]}
REGRAS: x e y de 0 a 100 e indicam aproximadamente o centro visual do achado. Não invente componentes. Não trate hipótese como fato. Não presuma ausência de proteção quando a região não estiver visível. Não declare conformidade ou não conformidade legal. Não cite NR. Se não houver achado visual relevante, retorne achados vazio. Preserve a distinção entre condição observada e possível risco.` }, { inlineData: { mimeType: "image/jpeg", data: imagemBase64 } }] }]
    });
    return res.json({ status: "ok", analise: respostaIA.text });
  } catch (erro) {
    console.error("Erro ao receber imagem:", erro);
    return res.status(500).json({ status: "erro", mensagem: "Falha ao processar a imagem." });
  }
});

app.post("/salvar-analise", async (req, res) => {
  let analiseId = null;
  let storagePath = null;
  try {
    const { empresa, setor, tipoAnalise, equipamento, observacao, identificacao, achados, imagemBase64 } = req.body;
    if (!empresa || !setor || !tipoAnalise || !imagemBase64) return res.status(400).json({ status: "erro", mensagem: "Dados obrigatórios da análise não foram recebidos." });

    const supabase = supabaseAdmin();
    const { data: analise, error: erroAnalise } = await supabase.from("vision_analises").insert({
      empresa, setor, tipo_analise: tipoAnalise, equipamento: equipamento || null, observacao: observacao || null,
      identificacao_tipo: identificacao?.tipo || null, identificacao_descricao: identificacao?.descricao || null,
      identificacao_confianca: identificacao?.confianca || null, status: "validada", validada_em: new Date().toISOString()
    }).select("id").single();
    if (erroAnalise) throw erroAnalise;
    analiseId = analise.id;

    const buffer = Buffer.from(imagemBase64, "base64");
    storagePath = `${analiseId}/foto-1.jpg`;
    const { error: erroUpload } = await supabase.storage.from("vision-fotos").upload(storagePath, buffer, { contentType: "image/jpeg", upsert: false });
    if (erroUpload) throw erroUpload;

    const { error: erroFoto } = await supabase.from("vision_fotos").insert({ analise_id: analiseId, storage_path: storagePath, ordem: 1 });
    if (erroFoto) throw erroFoto;

    const lista = Array.isArray(achados) ? achados : [];
    if (lista.length) {
      const registros = lista.map((a, indice) => ({
        analise_id: analiseId,
        numero: Number(a.numero ?? a.id ?? indice + 1),
        titulo: a.titulo || null,
        observado: a.observado || a.descricao || null,
        possivel_risco: a.possivel_risco || a.risco || null,
        confianca: a.confianca || null,
        posicao_x: Number(a.x ?? a.posicao?.x ?? 50),
        posicao_y: Number(a.y ?? a.posicao?.y ?? 50),
        origem: a.origem === "manual" || a.manual ? "manual" : "ia",
        editado: Boolean(a.editado)
      }));
      const { error: erroAchados } = await supabase.from("vision_achados").insert(registros);
      if (erroAchados) throw erroAchados;
    }

    return res.json({ status: "ok", mensagem: "Análise salva com sucesso.", analiseId });
  } catch (erro) {
    console.error("Erro ao salvar análise:", erro);
    try {
      const supabase = supabaseAdmin();
      if (storagePath) await supabase.storage.from("vision-fotos").remove([storagePath]);
      if (analiseId) await supabase.from("vision_analises").delete().eq("id", analiseId);
    } catch (rollbackErro) { console.error("Erro no rollback:", rollbackErro); }
    return res.status(500).json({ status: "erro", mensagem: "Não foi possível salvar a análise no banco." });
  }
});

app.listen(PORT, () => console.log(`SST Vision rodando na porta ${PORT}`));
