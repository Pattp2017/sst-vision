import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

app.use(
  express.json({
    limit: "10mb"
  })
);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    projeto: "SST Vision",
    mensagem: "Backend funcionando."
  });
});

app.get("/teste-ia", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "Responda apenas: SST Vision conectado com sucesso."
    });

    res.json({
      status: "ok",
      resposta: response.text
    });
  } catch (erro) {
    console.error("Erro Gemini:", erro);

    res.status(500).json({
      status: "erro",
      mensagem: "Falha ao conectar com a IA."
    });
  }
});

app.post("/analisar-imagem", async (req, res) => {
  try {
    const { imagemBase64 } = req.body;

    if (!imagemBase64) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Nenhuma imagem recebida."
      });
    }

const respostaIA = await ai.models.generateContent({
  model: "gemini-3.5-flash-lite",
  contents: [
    {
      role: "user",
      parts: [
        {
          text: `
Observe esta fotografia.

Por enquanto, NÃO faça análise de riscos de SST.

Responda somente:
1. O que aparece na imagem.
2. Se parece ser uma máquina/equipamento ou um ambiente de trabalho.
3. Seu nível de confiança na identificação: baixo, médio ou alto.

Se não conseguir identificar, diga claramente que não foi possível identificar.
          `
        },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imagemBase64
          }
        }
      ]
    }
  ]
});

return res.json({
  status: "ok",
  analise: respostaIA.text
});
  } catch (erro) {
    console.error("Erro ao receber imagem:", erro);

    return res.status(500).json({
      status: "erro",
      mensagem: "Falha ao processar a imagem."
    });
  }
});

app.listen(PORT, () => {
  console.log(`SST Vision rodando na porta ${PORT}`);
});
