import { GoogleGenAI, Modality } from "@google/genai";
import { ModelType, GenerationConfig, GeneratedContent, GenerationMode, MeshGeometry, ImageResolution, AspectRatio } from "../types";

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

// Convert Base64 PCM to a Playable WAV Blob directly
const base64ToWavBlob = (base64: string, sampleRate: number = 24000): Blob => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // WAV Header
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + len, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); 
  view.setUint16(20, 1, true); 
  view.setUint16(22, numChannels, true); 
  view.setUint32(24, sampleRate, true); 
  view.setUint32(28, byteRate, true); 
  view.setUint16(32, blockAlign, true); 
  view.setUint16(34, bitsPerSample, true); 
  writeString(36, 'data');
  view.setUint32(40, len, true);

  return new Blob([wavHeader, bytes], { type: 'audio/wav' });
};

export const suggestCaption = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await callWithRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest a short, catchy headline (max 5 words) for: "${prompt}". Return ONLY text.`,
        }));
        // Fix: accessing text property directly as per guidelines
        return response.text?.trim() || "Must Watch!";
    } catch (error) {
        return "Check this out!";
    }
};

export const generate3DMesh = async (prompt: string): Promise<MeshGeometry> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const jsonPrompt = `Generate a low-poly 3D humanoid mesh in JSON for: "${prompt}". Return {"vertices": [[x,y,z],...], "faces": [[v1,v2,v3,"hex"],...]}`;
    try {
        const response = await callWithRetry(() => ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: jsonPrompt,
            config: { responseMimeType: "application/json" }
        }));
        // Fix: accessing text property directly as per guidelines
        return JSON.parse(response.text || '{"vertices":[],"faces":[]}');
    } catch (e) {
        return { vertices: [], faces: [] };
    }
};

export const generateSpeech = async (config: GenerationConfig): Promise<GeneratedContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const timestamp = Date.now();
  try {
    const response = await callWithRetry(() => ai.models.generateContent({
      model: ModelType.TTS,
      contents: [{ parts: [{ text: config.prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voice || 'zephyr' } } },
      },
    }));
    const data = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!data) throw new Error("No audio returned");
    return {
      id: `${timestamp}-audio`,
      type: 'audio',
      url: URL.createObjectURL(base64ToWavBlob(data)),
      prompt: config.prompt,
      model: ModelType.TTS,
      timestamp,
      voice: config.voice
    };
  } catch (error: any) { throw error; }
};

/**
 * Advanced Neural Flipbook: Optimized for rate limit compliance.
 * Processes frames one-by-one with mandatory cooling periods.
 */
export const generateFlipbook = async (config: GenerationConfig, onProgress?: (msg: string) => void): Promise<GeneratedContent> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const timestamp = Date.now();
    const frames: string[] = [];

    if (!config.referenceImage) throw new Error("Reference image is required.");

    // Conservative frame counts to stay within RPM/RPD limits
    const densityMap = { 'economy': 6, 'balanced': 10, 'ultra': 14 };
    const frameCount = densityMap[config.frameDensity || 'balanced'];
    
    const intensity = config.motionIntensity || 0.5;
    const profile = config.motionProfile || 'fluid';
    
    const profilePrompts = {
        'fluid': 'Perform ultra-smooth, flowing kinematic updates. No flickering.',
        'subtle': 'Microscopic life-like movement, breathing and blinking.',
        'epic': 'Dramatic cinematic shift and dynamic camera motion.',
        'jitter': 'High-energy stop-motion flickering updates.'
    };

    try {
        onProgress?.(`Temporal Engine: Throttled Synthesis Active...`);
        
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

            onProgress?.(`Synthesizing Frame ${i+1}/${frameCount}... (Safety Throttling active)`);
            
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

        return {
            id: `${timestamp}-flipbook`,
            type: 'animation',
            url: frames[0], 
            frames: frames,
            prompt: config.prompt,
            // Fix: Replaced unspecified model name with actual model used
            model: 'gemini-2.5-flash-image',
            timestamp,
            aspectRatio: config.aspectRatio,
            duration: 10
        };
    } catch (error: any) {
        console.error("Flipbook generation failed:", error);
        throw error;
    }
};

export const generateImage = async (config: GenerationConfig): Promise<GeneratedContent[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const images: GeneratedContent[] = [];
  const timestamp = Date.now();
  const count = config.count || 1;
  let finalPrompt = config.stylePrompts?.length ? `${config.prompt}, ${config.stylePrompts.join(", ")}` : config.prompt;

  if (config.mode === GenerationMode.THUMBNAIL) {
    const nicheContext = `Niche: ${config.niche}, Style: ${config.subNiche}. `;
    const thumbnailContext = `Create a high-impact, professional ${config.thumbnailPlatform} thumbnail. `;
    const layoutContext = config.thumbnailLayout === 'before-after' ? 'Use a clear "Before" and "After" split screen layout. ' : '';
    const textContext = config.thumbnailTitle ? `Include the headline text: "${config.thumbnailTitle}". ` : '';
    
    finalPrompt = `${nicheContext}${thumbnailContext}${layoutContext}${textContext}${finalPrompt}`;
  }

  try {
    const promises = Array.from({ length: count }).map(() => 
      callWithRetry(() => ai.models.generateContent({ 
          model: ModelType.FLASH_IMAGE, 
          contents: config.referenceImage ? { parts: [{ inlineData: { mimeType: 'image/jpeg', data: config.referenceImage.split(',')[1] } }, { text: finalPrompt }] } : finalPrompt, 
          config: { imageConfig: { aspectRatio: config.aspectRatio } } 
      }))
    );
    
    const responses = await Promise.all(promises);
    responses.forEach((res, idx) => {
        const data = res.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        if (data) images.push({ id: `${timestamp}-${idx}`, type: 'image', url: `data:image/png;base64,${data}`, prompt: finalPrompt, model: ModelType.FLASH_IMAGE, timestamp, aspectRatio: config.aspectRatio });
    });
    return images;
  } catch (error: any) { throw error; }
};