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
Você está auxiliando em uma inspeção visual de Segurança e Saúde no Trabalho (SST).

Analise exclusivamente o que é visível na fotografia.

Responda em português do Brasil seguindo exatamente esta estrutura:

IDENTIFICAÇÃO:
Descreva objetivamente o equipamento, máquina ou ambiente observado.

CONDIÇÕES VISÍVEIS:
Liste somente condições que podem ser efetivamente observadas na imagem.

POSSÍVEIS RISCOS:
Indique riscos de SST que possam estar relacionados às condições visíveis.
Não trate hipótese como fato.

NÍVEL DE CONFIANÇA:
Informe: BAIXO, MÉDIO ou ALTO.

LIMITAÇÕES:
Informe o que não pode ser confirmado somente pela fotografia.

REGRAS:
- Não invente componentes que não estejam visíveis.
- Não presuma ausência de proteção se a área correspondente não estiver visível.
- Não declare conformidade ou não conformidade legal.
- Não cite normas regulamentadoras nesta etapa.
- Se a fotografia não permitir avaliação adequada, informe isso claramente.
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
