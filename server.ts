import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import {
  serverSuggestCaption,
  serverEnhancePrompt,
  serverGenerate3DMesh,
  serverGenerateSpeechBase64,
  serverGenerateFlipbook,
  serverGenerateImageBase64,
} from "./server/gemini";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support large Base64 images payloads (like canvas designs and reference images)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // --- API proxy routes ---
  app.post("/api/gemini/suggestCaption", async (req, res) => {
    try {
      const { prompt } = req.body;
      const caption = await serverSuggestCaption(prompt);
      res.json({ caption });
    } catch (err: any) {
      console.error("API Error suggestCaption:", err);
      res.status(500).json({ error: err.message || "Failed to suggest caption" });
    }
  });

  app.post("/api/gemini/enhancePrompt", async (req, res) => {
    try {
      const { prompt } = req.body;
      const enhanced = await serverEnhancePrompt(prompt);
      res.json({ prompt: enhanced });
    } catch (err: any) {
      console.error("API Error enhancePrompt:", err);
      res.status(500).json({ error: err.message || "Failed to enhance prompt" });
    }
  });

  app.post("/api/gemini/generate3DMesh", async (req, res) => {
    try {
      const { prompt } = req.body;
      const mesh = await serverGenerate3DMesh(prompt);
      res.json(mesh);
    } catch (err: any) {
      console.error("API Error generate3DMesh:", err);
      res.status(500).json({ error: err.message || "Failed to generate 3D mesh" });
    }
  });

  app.post("/api/gemini/generateSpeech", async (req, res) => {
    try {
      const { prompt, voice } = req.body;
      const base64Audio = await serverGenerateSpeechBase64(prompt, voice);
      res.json({ dataBase64: base64Audio });
    } catch (err: any) {
      console.error("API Error generateSpeech:", err);
      res.status(500).json({ error: err.message || "Failed to generate speech" });
    }
  });

  app.post("/api/gemini/generateFlipbook", async (req, res) => {
    try {
      const { config } = req.body;
      const frames = await serverGenerateFlipbook(config);
      res.json({ frames });
    } catch (err: any) {
      console.error("API Error generateFlipbook:", err);
      res.status(500).json({ error: err.message || "Failed to generate flipbook" });
    }
  });

  app.post("/api/gemini/generateImage", async (req, res) => {
    try {
      const { config } = req.body;
      const imagesBytes = await serverGenerateImageBase64(config);
      res.json({ imagesBytes });
    } catch (err: any) {
      console.error("API Error generateImage:", err);
      res.status(500).json({ error: err.message || "Failed to generate image" });
    }
  });

  // --- Vite integration middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
