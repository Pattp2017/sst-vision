import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const app = express();

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

app.listen(PORT, () => {
  console.log(`SST Vision rodando na porta ${PORT}`);
});
