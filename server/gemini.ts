import { GoogleGenAI, Modality } from "@google/genai";
import { ModelType, GenerationConfig, MeshGeometry } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Shared Gemini client utility on the server.
 * Sets the User-Agent header to 'aistudio-build' for telemetry.
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not defined");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

/**
 * Helper to call Gemini API with aggressive exponential backoff for rate limits.
 */
const callWithRetry = async (fn: () => Promise<any>, retries = 5, baseDelay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const errorStr = JSON.stringify(error).toLowerCase();
      const isRateLimit = 
        error?.status === 429 || 
        errorStr.includes("429") || 
        errorStr.includes("quota") || 
        errorStr.includes("resource_exhausted") ||
        errorStr.includes("rate limit");
      
      if (isRateLimit && i < retries - 1) {
        // Longer wait for each consecutive failure
        const waitTime = baseDelay * Math.pow(2.5, i) + Math.random() * 2000;
        console.warn(`[Gemini Quota] Rate limit hit. Backing off for ${Math.round(waitTime / 1000)}s... (Attempt ${i + 1}/${retries})`);
        await sleep(waitTime);
        continue;
      }
      throw error;
    }
  }
};

export const serverSuggestCaption = async (prompt: string): Promise<string> => {
  const ai = getGeminiClient();
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Suggest a short, catchy headline (max 5 words) for: "${prompt}". Return ONLY text.`,
    }));
    return response.text?.trim() || "Must Watch!";
  } catch (error) {
    console.error("suggestCaption failed:", error);
    return "Check this out!";
  }
};

export const serverEnhancePrompt = async (prompt: string): Promise<string> => {
  const ai = getGeminiClient();
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `Expand and enrich the following description to create a highly detailed, professional, and visually stunning generative AI image/art prompt. Keep it descriptive, elegant, and concise (exactly 1 to 2 sentences).
Original input: "${prompt}"
Enhanced prompt text only:`,
    }));
    return response.text?.trim() || prompt;
  } catch (error) {
    console.error("enhancePrompt failed:", error);
    return prompt;
  }
};

export const serverGenerate3DMesh = async (prompt: string): Promise<MeshGeometry> => {
  const ai = getGeminiClient();
  const jsonPrompt = `Generate a low-poly 3D humanoid mesh in JSON for: "${prompt}". Return {"vertices": [[x,y,z],...], "faces": [[v1,v2,v3,"hex"],...]}`;
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: jsonPrompt,
      config: { responseMimeType: "application/json" }
    }));
    return JSON.parse(response.text || '{"vertices":[],"faces":[]}');
  } catch (e) {
    console.error("generate3DMesh failed:", e);
    return { vertices: [], faces: [] };
  }
};

export const serverGenerateSpeechBase64 = async (prompt: string, voice: string = 'zephyr'): Promise<string> => {
  const ai = getGeminiClient();
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      // TTS Preview model matching previous client setup
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice || 'zephyr' } } },
      },
    }));
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error("No audio returned from Gemini Speech API");
    return data;
  } catch (error: any) {
    console.error("generateSpeech failed:", error);
    throw error;
  }
};

export const serverGenerateFlipbook = async (config: GenerationConfig): Promise<string[]> => {
  const ai = getGeminiClient();
  const frames: string[] = [];

  if (!config.referenceImage) throw new Error("Reference image is required for animating.");

  // Conservative frame counts to stay within RPM/RPD limits
  const densityMap = { 'economy': 6, 'balanced': 10, 'ultra': 14 };
  const frameCount = densityMap[config.frameDensity || 'balanced'];
  
  const profile = config.motionProfile || 'fluid';
  
  const profilePrompts = {
    'fluid': 'Perform ultra-smooth, flowing kinematic updates. No flickering.',
    'subtle': 'Microscopic life-like movement, breathing and blinking.',
    'epic': 'Dramatic cinematic shift and dynamic camera motion.',
    'jitter': 'High-energy stop-motion flickering updates.'
  };

  const imagePart = {
    inlineData: {
      data: config.referenceImage.split(',')[1],
      mimeType: 'image/png'
    }
  };

  for (let i = 0; i < frameCount; i++) {
    const step = (i + 1) / frameCount;
    const prompt = `
      TASK: Frame ${i+1}/${frameCount} of cinematic loop.
      ACTION: ${profilePrompts[profile]} ${config.prompt}.
      GUIDE: Step ${Math.round(step * 100)}%. Maintain 100% character visual identity.
    `;
    
    const res = await callWithRetry(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [imagePart, { text: prompt }] },
      config: { imageConfig: { aspectRatio: config.aspectRatio } }
    }));
    
    const frameData = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
    if (frameData) {
      frames.push(`data:image/png;base64,${frameData}`);
    }

    // Mandatory cooldown to prevent 429 RESOURCE_EXHAUSTED on subsequent requests
    if (i < frameCount - 1) {
      await sleep(4500); 
    }
  }

  if (frames.length === 0) throw new Error("Could not synthesize frames. Quota limit reached.");
  return frames;
};

export const serverGenerateImageBase64 = async (config: GenerationConfig): Promise<string[]> => {
  const ai = getGeminiClient();
  const images: string[] = [];
  const count = config.count || 1;
  let finalPrompt = config.stylePrompts?.length ? `${config.prompt}, ${config.stylePrompts.join(", ")}` : config.prompt;

  if (config.mode === 'thumbnail') { // or GenerationMode.THUMBNAIL
    const nicheContext = `Niche: ${config.niche}, Style: ${config.subNiche}. `;
    const thumbnailContext = `Create a high-impact, professional ${config.thumbnailPlatform || 'youtube'} thumbnail. `;
    const layoutContext = config.thumbnailLayout === 'before-after' ? 'Use a clear "Before" and "After" split screen layout. ' : '';
    const textContext = config.thumbnailTitle ? `Include the headline text: "${config.thumbnailTitle}". ` : '';
    
    finalPrompt = `${nicheContext}${thumbnailContext}${layoutContext}${textContext}${finalPrompt}`;
  }

  const modelUsed = config.model || ModelType.FLASH_IMAGE;

  const promises = Array.from({ length: count }).map(() => 
    callWithRetry(() => ai.models.generateContent({ 
      model: modelUsed, 
      contents: config.referenceImage ? { parts: [{ inlineData: { mimeType: 'image/jpeg', data: config.referenceImage!.split(',')[1] } }, { text: finalPrompt }] } : finalPrompt, 
      config: { imageConfig: { aspectRatio: config.aspectRatio } } 
    }))
  );
  
  const responses = await Promise.all(promises);
  responses.forEach((res) => {
    const data = res.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
    if (data) {
      images.push(data);
    }
  });

  return images;
};
