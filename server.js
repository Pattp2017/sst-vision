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
    limit: "15mb"
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

app.post("/transcrever-audio", async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;

    if (!audioBase64) {
      return res.status(400).json({
        status: "erro",
        mensagem: "Nenhum áudio recebido."
      });
    }

    const tiposPermitidos = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg"
    ];

    const tipoRecebido = String(mimeType || "audio/webm")
      .split(";")[0]
      .trim()
      .toLowerCase();

    const tipoAudio = tiposPermitidos.includes(tipoRecebido)
      ? tipoRecebido
      : "audio/webm";

    const respostaIA = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `
Transcreva fielmente este áudio em português do Brasil.
O áudio é uma observação de campo de uma inspeção de Segurança e Saúde no Trabalho.
Retorne somente o texto transcrito, sem explicações, sem Markdown e sem acrescentar informações que não tenham sido faladas.
Corrija apenas pontuação e capitalização para tornar o texto legível.
`
            },
            {
              inlineData: {
                mimeType: tipoAudio,
                data: audioBase64
              }
            }
          ]
        }
      ]
    });

    return res.json({
      status: "ok",
      texto: String(respostaIA.text || "").trim()
    });
  } catch (erro) {
    console.error("Erro ao transcrever áudio:", erro);

    return res.status(500).json({
      status: "erro",
      mensagem: "Falha ao transcrever o áudio."
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

Analise exclusivamente o que estiver visível na fotografia.

Retorne SOMENTE um JSON válido.
Não use Markdown.
Não escreva texto antes ou depois do JSON.

Use exatamente esta estrutura:

{
  "identificacao": {
    "tipo": "maquina | equipamento | ambiente | nao_identificado",
    "descricao": "descrição objetiva do que foi identificado",
    "confianca": "baixa | media | alta"
  },
  "achados": [
    {
      "id": 1,
      "titulo": "nome curto do achado",
      "observado": "descrição somente do que é visível",
      "possivel_risco": "risco relacionado ao que foi observado",
      "confianca": "baixa | media | alta",
      "posicao": {
        "x": 50,
        "y": 50
      }
    }
  ],
  "limitacoes": [
    "informação que não pode ser confirmada somente pela fotografia"
  ]
}

REGRAS PARA POSIÇÃO:
- x e y devem ser números inteiros de 0 a 100.
- x representa a posição horizontal percentual na fotografia.
- y representa a posição vertical percentual na fotografia.
- A posição deve indicar aproximadamente o centro visual do achado.
- Não crie coordenadas para algo que não esteja visível.

REGRAS DE ANÁLISE:
- Não invente componentes.
- Não trate hipótese como fato.
- Não presuma ausência de proteção quando a região não estiver visível.
- Não declare conformidade ou não conformidade legal.
- Não cite NR nesta etapa.
- Se não houver achado visual relevante, retorne "achados": [].
- Preserve a distinção entre condição observada e possível risco.
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
