import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    projeto: "SST Vision",
    mensagem: "Backend funcionando."
  });
});

app.listen(PORT, () => {
  console.log(`SST Vision rodando na porta ${PORT}`);
});
