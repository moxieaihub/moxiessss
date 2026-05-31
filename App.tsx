import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import Gallery from './components/Gallery';
import CaptionStudio from './components/CaptionStudio';
import StoryStudio from './components/StoryStudio';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import { GenerationConfig, ModelType, AspectRatio, ImageResolution, GeneratedContent, GenerationMode } from './types';
// Fix: Removed non-existent export 'generateStory' to resolve module error
import { generateImage } from './services/geminiService';

const App: React.FC = () => {
  const [showLanding, setShowLanding] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
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
    if (config.mode === GenerationMode.CAPTIONS || config.mode === GenerationMode.STORY) {
        return;
    }

    const hasPrompt = config.prompt.trim().length > 0;
    const isRiggingValid = config.isRigging && (config.boneConfigurations?.length || 0) > 0;

    if (!hasPrompt && !isRiggingValid) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newImages = await generateImage(config);
      const taggedImages = newImages.map(img => ({
        ...img,
        mode: config.mode
      }));
      setGeneratedContent(prev => [...taggedImages, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate content. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [config]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const dismissError = () => setError(null);

  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  // Screen-specific prompt filter ensuring items generated in different modes remain fully separate
  const filteredContent = generatedContent.filter(item => {
    // Determine if the item belongs to the currently active studio screen
    const itemMode = item.mode || (
      item.prompt.toLowerCase().includes('logo') ? GenerationMode.LOGO :
      item.prompt.toLowerCase().includes('thumbnail') ? GenerationMode.THUMBNAIL :
      GenerationMode.IMAGE
    );
    const matchesMode = itemMode === config.mode;
    const matchesSearch = item.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.type && item.type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesMode && matchesSearch;
  });

  // --- STANDARD APP RENDER ---
  return (
    <div className="min-h-screen bg-[#07080c] text-zinc-200 flex flex-col font-sans overflow-hidden">
      <Header />
      
      <main className="flex-1 flex flex-row h-[calc(100vh-64px)] overflow-hidden">
        {/* Left Sidebar Navigation Menu */}
        <Sidebar 
          currentMode={config.mode} 
          setMode={(mode) => setConfig(prev => ({ ...prev, mode, isRigging: false }))}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />

        {/* Center Display / Workspaces Viewport */}
        <div className="flex-1 relative flex flex-col h-full bg-[#050608]/40 overflow-hidden">
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
          
          {config.mode === GenerationMode.CAPTIONS ? (
            <CaptionStudio 
              config={config}
              setConfig={setConfig}
              onExit={() => setConfig(prev => ({...prev, mode: GenerationMode.IMAGE}))}
            />
          ) : config.mode === GenerationMode.STORY ? (
            <StoryStudio 
              config={config}
              setConfig={setConfig}
              onExit={() => setConfig(prev => ({...prev, mode: GenerationMode.IMAGE}))}
            />
          ) : (
            <Gallery 
              items={filteredContent} 
              isLoading={isLoading} 
              onEditImage={handleEditImage}
              onSelectPrompt={(selectedPrompt, mode) => {
                setConfig(prev => ({
                  ...prev,
                  prompt: selectedPrompt,
                  mode: mode
                }));
              }}
            />
          )}
        </div>

        {/* Right parameters Panel */}
        {config.mode !== GenerationMode.CAPTIONS && config.mode !== GenerationMode.STORY && (
          <ControlPanel 
            config={config} 
            setConfig={setConfig} 
            isLoading={isLoading} 
            onGenerate={handleGenerate} 
          />
        )}
      </main>
    </div>
  );
};

export default App;