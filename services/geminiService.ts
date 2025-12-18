
import { GoogleGenAI, Modality } from "@google/genai";
import { ModelType, GenerationConfig, GeneratedContent, GenerationMode, MeshGeometry } from "../types";

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
    // CRITICAL: Always use TTS model for static speech generation. 
    // gemini-2.5-flash-native-audio-preview-09-2025 is FORBIDDEN for generateContent.
    const model = ModelType.TTS; 
    let contents: any[] = [];
    let speechConfig: any = {};

    // 1. DIALOG MODE (Multi-Speaker TTS)
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
    // 2. SPEECH TO SPEECH / VOICE CLONING (Handled as TTS with context or response)
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
    // 3. TEXT TO SPEECH
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
        console.error("Full response for debug:", response);
        throw new Error("The model did not return any audio data. This may be due to an unsupported configuration or safety filter.");
    }

    const wavBlob = base64ToWavBlob(base64Audio, 24000); 
    const audioUrl = URL.createObjectURL(wavBlob);
    
    let displayPrompt = config.prompt;
    if (config.audioInput) displayPrompt = "Voice Clone / Response";
    if (config.speechMode === 'dialog') displayPrompt = "Multi-speaker Dialog";

    return {
      id: `${timestamp}-audio`,
      type: 'audio',
      url: audioUrl,
      prompt: displayPrompt || "AI Speech",
      model: model,
      timestamp,
      voice: config.voice
    };
  } catch (error: any) {
    console.error("Speech generation failed:", error);
    throw error;
  }
};

export const generateStory = async (config: GenerationConfig): Promise<GeneratedContent[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const timestamp = Date.now();
    const images: GeneratedContent[] = [];
    const scenes = (config.storyScenes || [])
        .filter(s => s.prompt.trim().length > 0)
        .sort((a, b) => a.order - b.order);

    if (scenes.length === 0) throw new Error("No scenes to generate");
    const activeSubjects = config.storySubjects?.filter(s => s.isActive !== false) || [];
    const activeEnvironments = config.storyEnvironments?.filter(s => s.isActive !== false) || [];
    const activeStyles = config.storyArtStyles?.filter(s => s.isActive !== false) || [];
    let previousSceneBase64: string | null = null;

    for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const contentParts: any[] = [];
        let promptText = `TASK: Generate a cinematic image for Scene ${i + 1} of a story.\n\n`;
        promptText += `CRITICAL INSTRUCTION: STYLISTIC AND CHARACTER CONSISTENCY.\n`;
        if (activeSubjects.length > 0) {
            promptText += `CHARACTERS:\n`;
            activeSubjects.forEach((s, idx) => { promptText += `- Subject ${idx + 1}: ${s.text}\n`; });
        }
        if (activeEnvironments.length > 0) {
            promptText += `LOCATIONS:\n`;
            activeEnvironments.forEach((e, idx) => { promptText += `- Location ${idx + 1}: ${e.text}\n`; });
        }
        if (activeStyles.length > 0) {
            promptText += `ART STYLE:\n`;
            activeStyles.forEach((s, idx) => { promptText += `- Style ${idx + 1}: ${s.text}\n`; });
        }
        promptText += `SCENE ${i + 1} ACTION:\n${scene.prompt}\n\n`;
        contentParts.push({ text: promptText });
        activeSubjects.forEach((s) => {
            if (s.image) contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: s.image.split(',')[1] } });
        });
        if (previousSceneBase64) {
             contentParts.push({ text: `[VISUAL CONTEXT]: The image below is Scene ${i}. Maintain strict continuity.` });
             contentParts.push({ inlineData: { mimeType: 'image/png', data: previousSceneBase64 } });
        }
        const imageConfig = { aspectRatio: config.aspectRatio };
        try {
            const scenePromises = Array.from({ length: config.count || 1 }).map(() => 
                 ai.models.generateContent({
                    model: ModelType.FLASH, 
                    contents: { parts: contentParts },
                    config: { imageConfig }
                })
            );
            const sceneResponses = await Promise.all(scenePromises);
            sceneResponses.forEach((response, idx) => {
                let imageData = null;
                let mimeType = 'image/png';
                if (response.candidates?.[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData?.data) {
                            imageData = part.inlineData.data;
                            mimeType = part.inlineData.mimeType || 'image/png';
                            break;
                        }
                    }
                }

                if (imageData) {
                    if (idx === 0) previousSceneBase64 = imageData;
                    images.push({
                        id: `${timestamp}-story-${scene.id}-${idx}`,
                        type: 'image' as const,
                        url: `data:${mimeType};base64,${imageData}`,
                        prompt: `[Scene ${i + 1}] ${scene.prompt}`,
                        model: ModelType.FLASH,
                        timestamp: timestamp + i,
                        aspectRatio: config.aspectRatio
                    });
                }
            });
        } catch (e) { console.error(`Error scene ${i+1}:`, e); }
    }
    return images;
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
    finalPrompt = `YouTube thumbnail about ${config.prompt}.`;
    if (config.thumbnailTitle) {
      const color = config.captionColor || 'vibrant white';
      const size = config.captionSize || 'large';
      const style = config.captionStyle || 'bold';
      finalPrompt += ` \nCRITICAL OVERLAY INSTRUCTION: Include the text "${config.thumbnailTitle}" in the image. 
      The text must be:
      - Color: ${color}
      - Size: ${size.toUpperCase()}
      - Design Style: ${style.toUpperCase()} (e.g., if neon, make it glow; if 3D, give it depth).
      Ensure the text is highly readable, centered or positioned professionally, and integrates perfectly with the scene.`;
    }
    finalPrompt += " High quality, 4k, clickable, professional graphic design.";
  } 
  else if (config.mode === GenerationMode.MODEL_3D) {
    const material = config.modelMaterial || 'realistic';
    const pose = config.modelPose || 't-pose';
    const view = config.modelView || 'front';
    finalPrompt = `${material} 3D render of a ${config.prompt}, ${pose} pose, ${view} view. White background, 8k Unreal Engine 5.`;
  }
  
  if (config.mode === GenerationMode.IMAGE && config.thumbnailTitle) {
    const color = config.captionColor || 'white';
    const size = config.captionSize || 'medium';
    const style = config.captionStyle || 'minimalist';
    finalPrompt += ` \nInclude text overlay: "${config.thumbnailTitle}". Style: ${style}, Color: ${color}, Size: ${size}. Make it part of the artistic composition.`;
  }

  if (!config.isRigging && config.stylePrompts && config.stylePrompts.length > 0) {
    finalPrompt = `${finalPrompt}, ${config.stylePrompts.join(", ")}`;
  }

  try {
    if (config.renderAnimation && config.isRigging) {
        const changes = config.boneConfigurations?.map(b => `${b.bone.replace('-', ' ')} ${b.action}`).join(", ") || "";
        const imageConfig = { aspectRatio: config.aspectRatio };
        const res = await ai.models.generateContent({
            model: ModelType.FLASH, 
            contents: { parts: [{ text: `Cinematic frame. ${finalPrompt}. Start pose to ${changes}` }] },
            config: { imageConfig },
        });
        
        let animationFrameData = null;
        if (res.candidates?.[0]?.content?.parts) {
            for (const part of res.candidates[0].content.parts) {
                if (part.inlineData?.data) {
                    animationFrameData = part.inlineData.data;
                    break;
                }
            }
        }

        if (animationFrameData) {
            return [{ id: `${timestamp}-anim`, type: 'animation', url: `data:image/png;base64,${animationFrameData}`, frames: [`data:image/png;base64,${animationFrameData}`], duration: config.animationDuration || 3, prompt: `Animation: ${changes}`, model: ModelType.FLASH, timestamp, aspectRatio: config.aspectRatio }];
        }
    }

    if (config.model === ModelType.IMAGEN) {
      const response = await ai.models.generateImages({
        model: config.model,
        prompt: finalPrompt,
        config: { numberOfImages: count, outputMimeType: 'image/jpeg', aspectRatio: config.aspectRatio },
      });
      response.generatedImages?.forEach((img, idx) => {
          if (img.image?.imageBytes) {
             images.push({ id: `${timestamp}-${idx}`, type: 'image', url: `data:image/jpeg;base64,${img.image.imageBytes}`, prompt: finalPrompt, model: config.model, timestamp, aspectRatio: config.aspectRatio });
          }
      });
    } else {
      const imageConfig = { aspectRatio: config.aspectRatio };
      const contentParts: any[] = [];
      if (config.referenceImage) contentParts.push({ inlineData: { mimeType: 'image/jpeg', data: config.referenceImage.split(',')[1] } });
      contentParts.push({ text: finalPrompt });
      const promises = Array.from({ length: count }).map(() => ai.models.generateContent({ model: config.model, contents: { parts: contentParts }, config: { imageConfig } }));
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
          if (extractedImageData) images.push({ id: `${timestamp}-${idx}`, type: 'image', url: `data:image/png;base64,${extractedImageData}`, prompt: finalPrompt, model: config.model, timestamp, aspectRatio: config.aspectRatio });
      });
    }
    return images;
  } catch (error: any) { console.error(error); throw error; }
};
