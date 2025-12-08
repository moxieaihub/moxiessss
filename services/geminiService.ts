
import { GoogleGenAI, Modality } from "@google/genai";
import { ModelType, GenerationConfig, GeneratedContent, GenerationMode, MeshGeometry } from "../types";

// Utility to convert raw PCM to WAV Blob for playback
const pcmToWav = (pcmData: Float32Array, sampleRate: number): Blob => {
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2; // 16-bit
  const blockAlign = numChannels * 2;
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length * 2, true);
  writeString(8, 'WAVE');

  // fmt sub-chunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample

  // data sub-chunk
  writeString(36, 'data');
  view.setUint32(40, pcmData.length * 2, true);

  // PCM Data (Int16)
  const int16Data = new Int16Array(pcmData.length);
  for (let i = 0; i < pcmData.length; i++) {
    // Clamp to [-1, 1] then scale to Int16
    const s = Math.max(-1, Math.min(1, pcmData[i]));
    int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return new Blob([wavHeader, int16Data], { type: 'audio/wav' });
};

// Base64 decoding helper
const decodeBase64Audio = (base64: string): Float32Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  // The API returns raw PCM bytes (little-endian 16-bit typically, but here we treat as raw for conversion)
  
  const buffer = new ArrayBuffer(len);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    view[i] = binaryString.charCodeAt(i);
  }
  
  const int16 = new Int16Array(buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
};

export const generate3DMesh = async (prompt: string): Promise<MeshGeometry> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Prompt Engineering for JSON Geometry
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
            model: 'gemini-2.5-flash', // Flash is good for reasoning/JSON
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
        // Fallback cube mesh
        return {
            vertices: [
                [-1,-1,-1], [1,-1,-1], [1, 1,-1], [-1, 1,-1],
                [-1,-1, 1], [1,-1, 1], [1, 1, 1], [-1, 1, 1]
            ],
            faces: [
                [0,1,2, "#FF0000"], [0,2,3, "#FF0000"], // Front
                [1,5,6, "#00FF00"], [1,6,2, "#00FF00"], // Right
                [5,4,7, "#0000FF"], [5,7,6, "#0000FF"], // Back
                [4,0,3, "#FFFF00"], [4,3,7, "#FFFF00"], // Left
                [3,2,6, "#00FFFF"], [3,6,7, "#00FFFF"], // Top
                [4,5,1, "#FF00FF"], [4,1,0, "#FF00FF"]  // Bottom
            ]
        };
    }
};

export const generateSpeech = async (config: GenerationConfig): Promise<GeneratedContent> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const timestamp = Date.now();

  try {
    let model = ModelType.TTS;
    let contents: any = {
        parts: [{ text: config.prompt }],
    };

    // SPEECH TO SPEECH
    if (config.audioInput) {
        model = ModelType.NATIVE_AUDIO;
        
        const base64Data = config.audioInput.split(',')[1];
        const mimeType = config.audioInput.split(';')[0].split(':')[1] || 'audio/wav';

        // Prepare parts: Optional text instruction + Audio Input
        const parts: any[] = [];
        
        // If there is a text prompt, include it as instruction/context
        if (config.prompt && config.prompt.trim().length > 0) {
            parts.push({ text: config.prompt });
        } else {
             // Default prompt if none provided to ensure the model knows to respond
             parts.push({ text: "Respond to this audio." });
        }
        
        parts.push({
            inlineData: {
                mimeType: mimeType,
                data: base64Data
            }
        });

        contents = { parts: parts };
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: contents,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: config.voice || 'Puck' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned from the model.");
    }

    // Convert Base64 PCM to a Playable WAV Blob
    const pcmData = decodeBase64Audio(base64Audio);
    const wavBlob = pcmToWav(pcmData, 24000); // 24kHz is standard for this model
    const audioUrl = URL.createObjectURL(wavBlob);

    return {
      id: `${timestamp}-audio`,
      type: 'audio',
      url: audioUrl,
      prompt: config.prompt || (config.audioInput ? "Audio Response" : "Speech Generation"),
      model: model,
      timestamp,
      voice: config.voice
    };

  } catch (error: any) {
    console.error("Speech generation failed:", error);
    throw error;
  }
};

export const generateImage = async (config: GenerationConfig): Promise<GeneratedContent[]> => {
  // Initialize client with the API KEY
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const images: GeneratedContent[] = [];
  const timestamp = Date.now();
  const count = config.count || 1;

  // Construct the final prompt
  let finalPrompt = config.prompt;
  
  if (config.isRigging && config.boneConfigurations && config.boneConfigurations.length > 0) {
      const changes = config.boneConfigurations.map(b => `${b.bone.replace('-', ' ')} ${b.action}`).join(", ");
      finalPrompt = `Edit this character. Keep the character design, lighting, and style exactly the same. Only change the pose: ${changes}. High quality, consistent character.`;
  } 
  else if (config.mode === GenerationMode.THUMBNAIL) {
    finalPrompt = `YouTube thumbnail about ${config.prompt}.`;
    if (config.thumbnailTitle) {
      finalPrompt += ` Include the text "${config.thumbnailTitle}" prominently and clearly in the image.`;
    }
    finalPrompt += " High quality, 4k, clickable, vibrant colors, high contrast, catchy visual, trending on youtube.";
  } 
  else if (config.mode === GenerationMode.MODEL_3D) {
    const material = config.modelMaterial || 'realistic';
    const pose = config.modelPose || 't-pose';
    const view = config.modelView || 'front';
    finalPrompt = `${material} 3D render of a ${config.prompt}, in ${pose} pose, ${view} view. High quality 3D asset, studio lighting, white background, detailed textures, 8k, unreal engine 5 render, sharp focus.`;
  }

  if (!config.isRigging && config.stylePrompts && config.stylePrompts.length > 0) {
    finalPrompt = `${finalPrompt}, ${config.stylePrompts.join(", ")}`;
  }

  try {
    if (config.renderAnimation && config.isRigging) {
        const changes = config.boneConfigurations?.map(b => `${b.bone.replace('-', ' ')} ${b.action}`).join(", ") || "";
        const quality = config.animationQuality || 'standard';
        const frameCount = quality === 'high' ? 6 : 4; 
        
        const prompts = [];
        for (let i = 0; i < frameCount; i++) {
             const progress = Math.round((i / (frameCount - 1)) * 100);
             let description = "";
             if (i === 0) description = "Start of motion: slightly " + changes;
             else if (i === frameCount - 1) description = "End of motion: fully " + changes;
             else description = `Motion in progress (${progress}%): ${changes}`;

             prompts.push(`${description}. Maintain exact character consistency from reference.`);
        }
        
        const imageConfig: any = {
            aspectRatio: config.aspectRatio,
        };

        const generateFrame = async (promptSuffix: string) => {
             const frameContentParts: any[] = [];
             if (config.referenceImage) {
                 const base64Data = config.referenceImage.split(',')[1];
                 const mimeType = config.referenceImage.split(';')[0].split(':')[1] || 'image/jpeg';
                 frameContentParts.push({ inlineData: { mimeType, data: base64Data } });
             }
             frameContentParts.push({ text: `Cinematic sequence frame. ${finalPrompt}. ${promptSuffix}` });
             
             return ai.models.generateContent({
                model: ModelType.FLASH, // Must use Flash for multimodal
                contents: { parts: frameContentParts },
                config: { imageConfig },
             });
        };

        const responses = await Promise.all(prompts.map(p => generateFrame(p)));
        const frames: string[] = [];

        responses.forEach(res => {
            const part = res.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData?.data) {
                 frames.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`);
            }
        });

        if (frames.length > 0) {
            return [{
                id: `${timestamp}-anim`,
                type: 'animation',
                url: frames[0],
                frames: frames,
                duration: config.animationDuration || 3, 
                prompt: `Animation: ${changes}`,
                model: ModelType.FLASH,
                timestamp,
                aspectRatio: config.aspectRatio
            }];
        }
        throw new Error("Failed to generate animation frames");
    }

    if (config.model === ModelType.IMAGEN) {
      const response = await ai.models.generateImages({
        model: config.model,
        prompt: finalPrompt,
        config: {
          numberOfImages: count,
          outputMimeType: 'image/jpeg',
          aspectRatio: config.aspectRatio,
        },
      });

      if (response.generatedImages) {
        response.generatedImages.forEach((img, idx) => {
          if (img.image?.imageBytes) {
             images.push({
              id: `${timestamp}-${idx}`,
              type: 'image',
              url: `data:image/jpeg;base64,${img.image.imageBytes}`,
              prompt: finalPrompt,
              model: config.model,
              timestamp,
              aspectRatio: config.aspectRatio
            });
          }
        });
      }

    } else {
      const imageConfig: any = {
        aspectRatio: config.aspectRatio,
      };

      const contentParts: any[] = [];
      if (config.referenceImage) {
        try {
            const base64Data = config.referenceImage.split(',')[1];
            const mimeType = config.referenceImage.split(';')[0].split(':')[1] || 'image/jpeg';
            contentParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
        } catch (e) {
            console.warn("Failed to parse reference image", e);
        }
      }
      contentParts.push({ text: finalPrompt });

      const promises = Array.from({ length: count }).map(() => 
        ai.models.generateContent({
          model: config.model,
          contents: {
            parts: contentParts,
          },
          config: {
            imageConfig: imageConfig,
          },
        })
      );

      const responses = await Promise.all(promises);

      responses.forEach((response, responseIdx) => {
        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
          parts.forEach((part, partIdx) => {
            if (part.inlineData && part.inlineData.data) {
              const mimeType = part.inlineData.mimeType || 'image/png';
              images.push({
                id: `${timestamp}-${responseIdx}-${partIdx}`,
                type: 'image',
                url: `data:${mimeType};base64,${part.inlineData.data}`,
                prompt: finalPrompt,
                model: config.model,
                timestamp,
                aspectRatio: config.aspectRatio
              });
            }
          });
        }
      });
    }

    if (images.length === 0) {
      throw new Error("No images were generated. The model might have blocked the request or returned text only.");
    }

    return images;

  } catch (error: any) {
    console.error("Generation failed:", error);
    throw error;
  }
};
