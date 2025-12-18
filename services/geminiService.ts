
import { GoogleGenAI, Modality } from "@google/genai";
import { ModelType, GenerationConfig, GeneratedContent, GenerationMode, MeshGeometry, ImageResolution, AspectRatio } from "../types";

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
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, len, true);

  // Combine header and raw PCM bytes
  return new Blob([wavHeader, bytes], { type: 'audio/wav' });
};

/**
 * Suggests a catchy caption/headline for a thumbnail using Gemini.
 */
export const suggestCaption = async (prompt: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest a single, short, catchy YouTube thumbnail headline (max 5 words) based on this content: "${prompt}". Return ONLY the text without quotes.`,
        });

        return response.text?.trim() || "Must Watch!";
    } catch (error) {
        console.error("Caption suggestion failed:", error);
        return "Check this out!";
    }
};

export const analyzeLink = async (url: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Using the Google Search tool, search for information regarding the content of this link: ${url}. 
            
            Identify the title, description, and context from the search results.
            Then, provide a detailed summary including:
            1. The Story or Topic summary.
            2. The Visual Style.
            3. Key Characters or Elements.
            4. Important events or details.
            
            Synthesize this information from the search snippets found.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        return response.text || "No analysis could be generated.";
    } catch (error: any) {
        console.error("Link analysis failed:", error);
        throw new Error("Failed to analyze link. Please check the URL or try again later.");
    }
};

export const generate3DMesh = async (prompt: string): Promise<MeshGeometry> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const jsonPrompt = `
      Generate a low-poly 3D mesh for: "${prompt}".
      Return ONLY a JSON object with this exact structure:
      {
        "vertices": [[x, y, z], ...], 
        "faces": [[v1_index, v2_index, v3_index, "hex_color"], ...] 
      }
      Rules:
      1. Maximum 200 vertices for performance.
      2. Coordinates should be roughly within range -2 to 2.
      3. Colors should be appropriate for the object.
      4. Ensure triangles are connected to form a solid shape.
      5. Output valid JSON only, no markdown formatting.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: jsonPrompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const text = response.text;
        if (!text) throw new Error("No data returned");
        
        const data = JSON.parse(text);
        if (!data.vertices || !data.faces) throw new Error("Invalid mesh format");
        
        return data as MeshGeometry;

    } catch (e) {
        console.error("Mesh generation failed", e);
        return {
            vertices: [
                [-1,-1,-1], [1,-1,-1], [1, 1,-1], [-1, 1,-1],
                [-1,-1, 1], [1,-1, 1], [1, 1, 1], [-1, 1, 1]
            ],
            faces: [
                [0,1,2, "#FF0000"], [0,2,3, "#FF0000"],
                [1,5,6, "#00FF00"], [1,6,2, "#00FF00"],
                [5,4,7, "#0000FF"], [5,7,6, "#0000FF"],
                [4,0,3, "#FFFF00"], [4,3,7, "#FFFF00"],
                [3,2,6, "#00FFFF"], [3,6,7, "#00FFFF"],
                [4,5,1, "#FF00FF"], [4,1,0, "#FF00FF"]
            ]
        };
    }
};

export const generateSpeech = async (config: GenerationConfig): Promise<GeneratedContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const timestamp = Date.now();

  try {
    const model = ModelType.TTS; 
    let contents: any[] = [];
    let speechConfig: any = {};

    if (config.speechMode === 'dialog' && config.dialogTurns && config.dialogTurns.length > 0) {
        const validTurns = config.dialogTurns.filter(t => t.text.trim().length > 0);
        if (validTurns.length === 0) throw new Error("Dialog script is empty.");
        
        const uniqueVoices = Array.from(new Set(validTurns.map(t => t.voice)));
        const scriptLines = validTurns.map(turn => `${turn.voice}: ${turn.text}`).join('\n');
        
        contents = [{ parts: [{ text: `TTS the following conversation:\n${scriptLines}` }] }];
        
        const speakerVoiceConfigs = uniqueVoices.map(voiceName => ({
            speaker: voiceName,
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName }
            }
        }));
        
        speechConfig = {
            multiSpeakerVoiceConfig: {
                speakerVoiceConfigs: speakerVoiceConfigs
            }
        };
    }
    else if (config.audioInput) {
        const base64Data = config.audioInput.split(',')[1];
        const mimeType = config.audioInput.split(';')[0].split(':')[1] || 'audio/wav';
        
        contents = [{
            parts: [
                { inlineData: { mimeType: mimeType, data: base64Data } },
                { text: config.prompt || "Say something related to this audio." }
            ]
        }];
        
        speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: config.voice || 'zephyr' },
            },
        };
    }
    else {
        if (!config.prompt || config.prompt.trim().length === 0) {
             throw new Error("Text prompt is required for speech generation.");
        }
        contents = [{ parts: [{ text: config.prompt }] }];
        speechConfig = {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: config.voice || 'zephyr' },
            },
        };
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: speechConfig,
      },
    });

    const candidate = response.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') {
        throw new Error("Speech generation was blocked due to safety settings.");
    }
    
    let base64Audio = null;
    if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
                base64Audio = part.inlineData.data;
                break;
            }
        }
    }
    
    if (!base64Audio) {
        throw new Error("The model did not return any audio data.");
    }

    const wavBlob = base64ToWavBlob(base64Audio, 24000); 
    const audioUrl = URL.createObjectURL(wavBlob);
    
    return {
      id: `${timestamp}-audio`,
      type: 'audio',
      url: audioUrl,
      prompt: config.prompt || "AI Speech",
      model: model,
      timestamp,
      voice: config.voice
    };
  } catch (error: any) {
    console.error("Speech generation failed:", error);
    throw error;
  }
};

/**
 * Free alternative to Veo: Generates a sequence of related frames for looping animation using flash-image.
 * Upgraded for 10-second duration and anti-blinking consistency.
 */
export const generateFlipbook = async (config: GenerationConfig, onProgress?: (msg: string) => void): Promise<GeneratedContent> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const timestamp = Date.now();
    const frames: string[] = [];

    if (!config.referenceImage) throw new Error("Reference image is required for animation.");

    try {
        onProgress?.("Calculating temporal consistency...");
        
        // Generate 12 frames for a cinematic 10-second loop (approx 1 frame per 833ms)
        const frameCount = 12;
        const prompts = Array.from({ length: frameCount }).map((_, i) => {
            const step = (i + 1) / frameCount;
            return `Strictly preserve the original background and character style. Modify only the movement: ${config.prompt}. This is frame ${i+1}/${frameCount}. Ensure smooth, tiny incremental motion that loops back to frame 1. DO NOT change colors, lighting or background layout.`;
        });

        const imagePart = {
            inlineData: {
                data: config.referenceImage.split(',')[1],
                mimeType: 'image/png'
            }
        };

        // Batch processing to respect potential rate limits and prevent timeouts
        const batchSize = 4;
        for (let i = 0; i < prompts.length; i += batchSize) {
            const batch = prompts.slice(i, i + batchSize);
            onProgress?.(`Synthesizing motion sequence: ${Math.round(((i + batch.length) / frameCount) * 100)}%`);
            
            const batchPromises = batch.map(p => 
                ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: [imagePart, { text: p }] },
                    config: { imageConfig: { aspectRatio: config.aspectRatio } }
                })
            );
            
            const batchResponses = await Promise.all(batchPromises);
            
            batchResponses.forEach(res => {
                if (res.candidates?.[0]?.content?.parts) {
                    for (const part of res.candidates[0].content.parts) {
                        if (part.inlineData?.data) {
                            frames.push(`data:image/png;base64,${part.inlineData.data}`);
                            break;
                        }
                    }
                }
            });
        }

        if (frames.length === 0) throw new Error("Could not generate animation frames.");

        return {
            id: `${timestamp}-flipbook`,
            type: 'animation',
            url: frames[0], 
            frames: frames,
            prompt: config.prompt,
            model: 'gemini-2.5-flash-image-ultra-flipbook',
            timestamp,
            aspectRatio: config.aspectRatio,
            duration: 10 // Total duration for the loop cycle
        };
    } catch (error: any) {
        console.error("Flipbook generation failed:", error);
        throw error;
    }
};

export const generateVideo = async (config: GenerationConfig, onProgress?: (msg: string) => void): Promise<GeneratedContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const timestamp = Date.now();

  try {
    onProgress?.("Initiating temporal synthesis...");
    
    let videoParams: any = {
      model: 'veo-3.1-fast-generate-preview',
      prompt: config.prompt,
      config: {
        numberOfVideos: 1,
        resolution: config.videoResolution || '720p',
        aspectRatio: config.aspectRatio === AspectRatio.PORTRAIT_9_16 ? '9:16' : '16:9'
      }
    };

    if (config.referenceImage) {
      videoParams.image = {
        imageBytes: config.referenceImage.split(',')[1],
        mimeType: 'image/png',
      };
    }

    let operation;
    try {
      operation = await ai.models.generateVideos(videoParams);
    } catch (e: any) {
      const eStr = JSON.stringify(e);
      if (eStr.includes("Requested entity was not found") || e.message?.includes("Requested entity was not found")) {
        throw new Error("AUTH_REQUIRED");
      }
      throw e;
    }

    while (!operation.done) {
      onProgress?.(`Rendering frames... ${Math.floor(Math.random() * 20 + 20)}% complete`);
      await new Promise(resolve => setTimeout(resolve, 8000));
      try {
        operation = await ai.operations.getVideosOperation({ operation: operation });
      } catch (e: any) {
        const eStr = JSON.stringify(e);
        if (eStr.includes("Requested entity was not found") || e.message?.includes("Requested entity was not found")) {
          throw new Error("AUTH_REQUIRED");
        }
        throw e;
      }
    }

    if (operation.error) {
      if (JSON.stringify(operation.error).includes("Requested entity was not found") || operation.error.message?.includes("Requested entity was not found")) {
         throw new Error("AUTH_REQUIRED");
      }
      throw new Error(operation.error.message || "Video generation failed.");
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URI returned.");

    onProgress?.("Finalizing MP4 stream...");
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    const videoUrl = URL.createObjectURL(blob);

    return {
      id: `${timestamp}-video`,
      type: 'video',
      url: videoUrl,
      prompt: config.prompt,
      model: 'veo-3.1-fast-generate-preview',
      timestamp,
      aspectRatio: config.aspectRatio
    };
  } catch (error: any) {
    console.error("Video generation failed:", error);
    throw error;
  }
};

export const generateStory = async (config: GenerationConfig): Promise<GeneratedContent[]> => {
    return [];
};

export const generateImage = async (config: GenerationConfig): Promise<GeneratedContent[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const images: GeneratedContent[] = [];
  const timestamp = Date.now();
  const count = config.count || 1;

  let finalPrompt = config.prompt;
  
  if (config.isRigging && config.boneConfigurations && config.boneConfigurations.length > 0) {
      const changes = config.boneConfigurations.map(b => `${b.bone.replace('-', ' ')} ${b.action}`).join(", ");
      finalPrompt = `Edit this character. Keep the design same. Change pose: ${changes}.`;
  } 
  else if (config.mode === GenerationMode.THUMBNAIL) {
    const platform = config.thumbnailPlatform || 'youtube';
    const layout = config.thumbnailLayout || 'standard';
    
    finalPrompt = `${platform.toUpperCase()} thumbnail about ${config.prompt}.`;
    
    if (layout === 'before-after') {
      finalPrompt += " Split the image vertically into two halves for a 'Before' and 'After' comparison. The left half should show a state of problem or beginning, and the right half should show the solution or peak result.";
    }

    if (config.thumbnailTitle) {
      const color = config.captionColor || 'vibrant white';
      const size = config.captionSize || 'large';
      const style = config.captionStyle || 'bold';
      finalPrompt += ` \nCRITICAL OVERLAY INSTRUCTION: Include the text "${config.thumbnailTitle}" in the image. Text style: ${style}, Color: ${color}, Size: ${size}.`;
    }
  } 
  
  if (!config.isRigging && config.stylePrompts && config.stylePrompts.length > 0) {
    finalPrompt = `${finalPrompt}, ${config.stylePrompts.join(", ")}`;
  }

  try {
    const useModel = config.model;

    if (useModel === ModelType.IMAGEN) {
      const response = await ai.models.generateImages({
        model: useModel,
        prompt: finalPrompt,
        config: { numberOfImages: count, outputMimeType: 'image/jpeg', aspectRatio: config.aspectRatio },
      });
      response.generatedImages?.forEach((img, idx) => {
          if (img.image?.imageBytes) {
             images.push({ id: `${timestamp}-${idx}`, type: 'image', url: `data:image/jpeg;base64,${img.image.imageBytes}`, prompt: finalPrompt, model: useModel, timestamp, aspectRatio: config.aspectRatio });
          }
      });
    } else {
      const imageConfig: any = { aspectRatio: config.aspectRatio };
      const contentParts: any[] = [];
      
      if (config.referenceImages && config.referenceImages.length > 0) {
          config.referenceImages.forEach(imgBase64 => {
              contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: imgBase64.split(',')[1] } });
          });
      } else if (config.referenceImage) {
          contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: config.referenceImage.split(',')[1] } });
      }

      contentParts.push({ text: finalPrompt });
      
      const promises = Array.from({ length: count }).map(() => 
        ai.models.generateContent({ 
            model: useModel, 
            contents: { parts: contentParts }, 
            config: { imageConfig } 
        })
      );
      
      const responses = await Promise.all(promises);
      responses.forEach((res, idx) => {
          let extractedImageData = null;
          if (res.candidates?.[0]?.content?.parts) {
              for (const part of res.candidates[0].content.parts) {
                  if (part.inlineData?.data) {
                      extractedImageData = part.inlineData.data;
                      break;
                  }
              }
          }
          if (extractedImageData) images.push({ id: `${timestamp}-${idx}`, type: 'image', url: `data:image/png;base64,${extractedImageData}`, prompt: finalPrompt, model: useModel, timestamp, aspectRatio: config.aspectRatio });
      });
    }
    return images;
  } catch (error: any) { console.error(error); throw error; }
};
