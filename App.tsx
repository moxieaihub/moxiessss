
import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import Gallery from './components/Gallery';
import Animator from './components/Animator';
import CaptionStudio from './components/CaptionStudio';
import StoryStudio from './components/StoryStudio';
import VideoStudio from './components/VideoStudio';
import { GenerationConfig, ModelType, AspectRatio, ImageResolution, GeneratedContent, GenerationMode } from './types';
import { generateImage, generateSpeech, generateStory } from './services/geminiService';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  
  const [config, setConfig] = useState<GenerationConfig>({
    mode: GenerationMode.IMAGE,
    prompt: '',
    model: ModelType.FLASH_IMAGE,
    aspectRatio: AspectRatio.SQUARE,
    resolution: ImageResolution.RES_1K,
    stylePrompts: [],
    voice: 'puck',
    isRigging: false,
    boneConfigurations: [],
    animationDuration: 3,
    animationFormat: 'mp4',
    animationQuality: 'standard',
    storyScenes: [{ id: '1', prompt: '', order: 0 }],
    storySubjects: [],
    storyEnvironments: [],
    storyArtStyles: [],
    thumbnailPlatform: 'youtube',
    thumbnailLayout: 'standard',
    captionPosition: 'bottom',
    captionColor: 'Pure White',
    captionSize: 'large',
    captionStyle: 'bold',
    captionSegments: []
  });

  const handleGenerate = useCallback(async () => {
    if (config.mode === GenerationMode.CAPTIONS || config.mode === GenerationMode.STORY || config.mode === GenerationMode.VIDEO || config.mode === GenerationMode.ANIMATOR) {
        return;
    }

    const hasPrompt = config.prompt.trim().length > 0;
    const hasAudio = !!config.audioInput;
    const isRiggingValid = config.isRigging && (config.boneConfigurations?.length || 0) > 0;

    if (!hasPrompt && !hasAudio && !isRiggingValid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (config.mode === GenerationMode.AUDIO) {
        const newAudio = await generateSpeech(config);
        setGeneratedContent(prev => [newAudio, ...prev]);
      } else {
        const newImages = await generateImage(config);
        setGeneratedContent(prev => [...newImages, ...prev]);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  const handleEnterRiggingMode = (imageUrl: string) => {
      setConfig(prev => ({
          ...prev,
          isRigging: true,
          referenceImage: imageUrl,
          boneConfigurations: [],
          model: ModelType.FLASH_IMAGE
      }));
  };

  const handleEditImage = (item: GeneratedContent) => {
    let mode = GenerationMode.IMAGE;
    const lowerPrompt = item.prompt.toLowerCase();
    
    if (lowerPrompt.includes("logo")) mode = GenerationMode.LOGO;
    else if (lowerPrompt.includes("thumbnail")) mode = GenerationMode.THUMBNAIL;

    setConfig(prev => ({
      ...prev,
      mode: mode,
      prompt: item.prompt,
      referenceImage: item.url,
      model: ModelType.FLASH_IMAGE
    }));
  };

  const dismissError = () => setError(null);

  // --- MODE SPECIFIC WORKSPACES ---
  if (config.mode === GenerationMode.ANIMATOR) {
      return (
          <Animator 
             config={config} 
             setConfig={setConfig} 
             onExit={() => setConfig(prev => ({...prev, mode: GenerationMode.IMAGE}))}
          />
      );
  }

  if (config.mode === GenerationMode.VIDEO) {
    return (
        <VideoStudio 
          config={config}
          setConfig={setConfig}
          onExit={() => setConfig(prev => ({...prev, mode: GenerationMode.IMAGE}))}
        />
    );
  }

  if (config.mode === GenerationMode.CAPTIONS) {
      return (
          <CaptionStudio 
            config={config}
            setConfig={setConfig}
            onExit={() => setConfig(prev => ({...prev, mode: GenerationMode.IMAGE}))}
          />
      );
  }

  if (config.mode === GenerationMode.STORY) {
    return (
      <StoryStudio 
        config={config}
        setConfig={setConfig}
        onExit={() => setConfig(prev => ({...prev, mode: GenerationMode.IMAGE}))}
      />
    );
  }

  // --- STANDARD APP RENDER ---
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
        <div className="lg:h-full overflow-y-auto lg:overflow-visible z-10 bg-zinc-950">
             <ControlPanel 
                config={config} 
                setConfig={setConfig} 
                isLoading={isLoading} 
                onGenerate={handleGenerate} 
             />
        </div>

        <div className="flex-1 relative flex flex-col h-full bg-zinc-950/30 overflow-hidden">
          {error && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl shadow-2xl backdrop-blur-md flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="flex-1 text-sm">
                    <p className="font-semibold mb-1">Error Generating Content</p>
                    <p className="opacity-90">{error}</p>
                </div>
                <button onClick={dismissError} className="text-red-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </button>
              </div>
            </div>
          )}
          
          <Gallery 
            items={generatedContent} 
            isLoading={isLoading} 
            onRigImage={handleEnterRiggingMode}
            onEditImage={handleEditImage}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
