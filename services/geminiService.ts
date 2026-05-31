import { ModelType, GenerationConfig, GeneratedContent, GenerationMode, MeshGeometry } from "../types";

// Convert Base64 PCM to a Playable WAV Blob directly in the browser
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
    try {
        const response = await fetch("/api/gemini/suggestCaption", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error("API call failed");
        const data = await response.json();
        return data.caption || "Must Watch!";
    } catch (error) {
        console.error("Client proxy suggestCaption failed, fallback active", error);
        return "Check this out!";
    }
};

export const enhancePrompt = async (prompt: string): Promise<string> => {
    try {
        const response = await fetch("/api/gemini/enhancePrompt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error("API call failed");
        const data = await response.json();
        return data.prompt || prompt;
    } catch (error) {
        console.error("Client proxy enhancePrompt failed, fallback active", error);
        return prompt;
    }
};

export const generate3DMesh = async (prompt: string): Promise<MeshGeometry> => {
    try {
        const response = await fetch("/api/gemini/generate3DMesh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
        });
        if (!response.ok) throw new Error("API call failed");
        return await response.json();
    } catch (e) {
        console.error("Client proxy generate3DMesh failed, fallback active", e);
        return { vertices: [], faces: [] };
    }
};

export const generateSpeech = async (config: GenerationConfig): Promise<GeneratedContent> => {
  const timestamp = Date.now();
  try {
    const response = await fetch("/api/gemini/generateSpeech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: config.prompt, voice: config.voice })
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate speech audio");
    }
    const { dataBase64 } = await response.json();
    
    return {
      id: `${timestamp}-audio`,
      type: 'audio',
      url: URL.createObjectURL(base64ToWavBlob(dataBase64)),
      prompt: config.prompt,
      model: ModelType.TTS,
      timestamp,
      voice: config.voice
    };
  } catch (error: any) { 
    console.error("Client generateSpeech failed:", error);
    throw error; 
  }
};

export const generateFlipbook = async (config: GenerationConfig, onProgress?: (msg: string) => void): Promise<GeneratedContent> => {
    const timestamp = Date.now();
    if (!config.referenceImage) throw new Error("Reference image is required.");

    try {
        onProgress?.(`Temporal Engine: Connecting to secure full-stack rendering server...`);
        
        const response = await fetch("/api/gemini/generateFlipbook", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config })
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to generate video frames on backend");
        }
        
        const { frames } = await response.json();
        if (!frames || frames.length === 0) throw new Error("Could not synthesize frames. Quota limit reached.");

        onProgress?.(`Syncing rendering blocks...`);

        return {
            id: `${timestamp}-flipbook`,
            type: 'animation',
            url: frames[0], 
            frames: frames,
            prompt: config.prompt,
            model: 'gemini-2.5-flash-image',
            timestamp,
            aspectRatio: config.aspectRatio,
            duration: 10
        };
    } catch (error: any) {
        console.error("Client flipbook generation failed:", error);
        throw error;
    }
};

export const generateImage = async (config: GenerationConfig): Promise<GeneratedContent[]> => {
  const timestamp = Date.now();
  try {
    const response = await fetch("/api/gemini/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config })
    });
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate image on backend");
    }
    
    const { imagesBytes } = await response.json();
    const images: GeneratedContent[] = [];

    imagesBytes.forEach((data: string, idx: number) => {
        let finalPrompt = config.stylePrompts?.length ? `${config.prompt}, ${config.stylePrompts.join(", ")}` : config.prompt;
        
        if (config.mode === GenerationMode.THUMBNAIL) {
            const nicheContext = `Niche: ${config.niche}, Style: ${config.subNiche}. `;
            const thumbnailContext = `Create a high-impact, professional ${config.thumbnailPlatform} thumbnail. `;
            const layoutContext = config.thumbnailLayout === 'before-after' ? 'Use a clear "Before" and "After" split screen layout. ' : '';
            const textContext = config.thumbnailTitle ? `Include the headline text: "${config.thumbnailTitle}". ` : '';
            finalPrompt = `${nicheContext}${thumbnailContext}${layoutContext}${textContext}${finalPrompt}`;
        }
        
        images.push({ 
            id: `${timestamp}-${idx}`, 
            type: 'image', 
            url: `data:image/png;base64,${data}`, 
            prompt: finalPrompt, 
            model: config.model || ModelType.FLASH_IMAGE, 
            timestamp, 
            aspectRatio: config.aspectRatio 
        });
    });

    return images;
  } catch (error: any) { 
    console.error("Client generateImage failed:", error);
    throw error; 
  }
};
