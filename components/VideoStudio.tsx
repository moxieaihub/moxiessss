
import React, { useState, useEffect, useRef } from 'react';
import { GenerationConfig, GenerationMode, GeneratedContent, AspectRatio } from '../types';
// Alias Zap icon as MotionIcon to match its usage in the component
import { 
  Zap as MotionIcon, Loader2, Sparkles, Wand2, FileVideo, Download, 
  Trash2, Plus, X, Layout, ImageIcon, ChevronRight, 
  Rotate3D, Play, Clock, Settings, ShieldCheck, Key, Film
} from './Icons';
import { generateVideo, generateFlipbook } from '../services/geminiService';

interface VideoStudioProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  onExit: () => void;
}

const MESSAGES = [
  "Analyzing cinematic context...",
  "Synthesizing temporal vectors...",
  "Rendering high-fidelity frames...",
  "Simulating physics and motion...",
  "Polishing visual semantics...",
  "Finalizing neural stream..."
];

const VideoStudio: React.FC<VideoStudioProps> = ({ config, setConfig, onExit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(MESSAGES[0]);
  const [videoResult, setVideoResult] = useState<GeneratedContent | null>(null);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [motionMode, setMotionMode] = useState<'cinematic' | 'flipbook'>(config.referenceImage ? 'flipbook' : 'cinematic');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    };
    checkKey();
    
    if (config.aspectRatio === AspectRatio.SQUARE) {
        setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.LANDSCAPE_16_9 }));
    }
  }, []);

  const handleSelectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const handleGenerate = async () => {
    if (!config.prompt.trim() && !config.referenceImage) return;
    
    setIsLoading(true);
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % MESSAGES.length;
      setLoadingMsg(MESSAGES[msgIdx]);
    }, 15000);

    try {
      let result;
      if (motionMode === 'flipbook') {
        result = await generateFlipbook(config, (msg) => setLoadingMsg(msg));
      } else {
        result = await generateVideo(config, (msg) => setLoadingMsg(msg));
      }
      setVideoResult(result);
    } catch (err: any) {
      if (err.message === "AUTH_REQUIRED") {
        setHasApiKey(false);
        alert("Paid Key Required for Cinematic Mode: Veo generation requires a paid GCP project. Please use 'Free Flipbook' mode or select a valid billing-enabled API key.");
      } else {
        alert("Generation failed: " + (err.message || "Unknown error"));
      }
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
          setConfig(prev => ({ ...prev, referenceImage: reader.result as string }));
          setMotionMode('flipbook');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-zinc-300 font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><Film className="w-5 h-5" /></div>
          <div>
            <h1 className="font-bold text-sm lg:text-base text-white">Motion <span className="text-indigo-500">Studio</span></h1>
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Animate any vision or image</p>
          </div>
        </div>
        <button onClick={onExit} className="p-2 text-zinc-500 hover:text-white transition-all bg-zinc-800 border border-zinc-700/50 rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Controls */}
        <div className="w-80 lg:w-96 border-r border-zinc-800 flex flex-col bg-zinc-950 shadow-2xl z-20 p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-8">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Animation Engine</label>
                <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
                    <button 
                        onClick={() => setMotionMode('flipbook')} 
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${motionMode === 'flipbook' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-400'}`}
                    >
                        Free Flipbook
                    </button>
                    <button 
                        onClick={() => setMotionMode('cinematic')} 
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${motionMode === 'cinematic' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-400'}`}
                    >
                        Cinematic (Veo)
                    </button>
                </div>
                <p className="text-[9px] text-zinc-600 italic px-2">
                    {motionMode === 'flipbook' ? "FREE: Generates a 10-second high-fidelity loop sequence." : "PAID: Requires a GCP API Key for advanced AI temporal synthesis."}
                </p>
             </div>

             {motionMode === 'cinematic' && !hasApiKey && (
                <div className="p-5 bg-indigo-600/10 border border-indigo-600/30 rounded-3xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400">
                        <ShieldCheck className="w-4 h-4" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest">Key Required</h3>
                    </div>
                    <button onClick={handleSelectKey} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                        <Key className="w-3 h-3" /> Select Paid Key
                    </button>
                </div>
             )}

             <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Target Image (Optional)</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-video border-2 border-dashed rounded-3xl cursor-pointer flex flex-col items-center justify-center gap-3 transition-all group overflow-hidden relative ${config.referenceImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800 hover:border-indigo-500/30 bg-zinc-900/50'}`}
                >
                  {config.referenceImage ? (
                    <>
                      <img src={config.referenceImage} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Replace Image</span>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setConfig(prev => ({...prev, referenceImage: null})); }} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-500"><X className="w-3 h-3"/></button>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="w-8 h-8 text-zinc-700 group-hover:text-indigo-500 transition-colors" />
                      <span className="text-[9px] font-black text-zinc-600 uppercase tracking-tighter">Click to animate a photo</span>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Motion Description</label>
                <textarea 
                  value={config.prompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder={config.referenceImage ? "Describe how it should move... e.g. gently waving in the wind" : "Describe a cinematic sequence..."}
                  className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-white resize-none focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-700"
                />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Aspect</label>
                    <select 
                      value={config.aspectRatio} 
                      onChange={(e) => setConfig(prev => ({...prev, aspectRatio: e.target.value as any}))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-[10px] text-white font-bold outline-none"
                    >
                        <option value={AspectRatio.LANDSCAPE_16_9}>16:9 Cinema</option>
                        <option value={AspectRatio.PORTRAIT_9_16}>9:16 Mobile</option>
                        <option value={AspectRatio.SQUARE}>1:1 Square</option>
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Duration</label>
                    <div className="flex h-[42px] bg-zinc-900 rounded-xl border border-zinc-800 items-center justify-center font-mono text-[10px] text-indigo-400 font-black">
                        10.0 SECS
                    </div>
                </div>
             </div>

             <button 
               onClick={handleGenerate}
               disabled={isLoading || (motionMode === 'cinematic' && !hasApiKey) || (!config.prompt.trim() && !config.referenceImage)}
               className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95 ${isLoading ? 'bg-zinc-800 text-zinc-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20 disabled:opacity-50'}`}
             >
               {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MotionIcon className="w-4 h-4" />}
               {isLoading ? 'Processing...' : 'Generate 10s Animation'}
             </button>
          </div>
        </div>

        {/* Center: Preview */}
        <div className="flex-1 bg-[#09090b] flex items-center justify-center p-8 lg:p-12 relative">
            {isLoading ? (
                <div className="max-w-2xl w-full flex flex-col items-center gap-8 animate-in fade-in duration-700 text-center">
                    <div className="relative">
                        <div className="w-48 h-48 rounded-full border-8 border-indigo-900/20 border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-10 h-10 text-indigo-500 animate-pulse" /></div>
                    </div>
                    <div className="text-center space-y-3">
                        <h2 className="text-xl font-black uppercase tracking-[0.3em] text-white">{loadingMsg}</h2>
                        <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
                            {motionMode === 'flipbook' ? "Synthesizing 12 high-fidelity incremental frames for a cinematic 10-second anti-blink loop." : "Veo engine is synthesizing temporal vectors using massive compute."}
                        </p>
                    </div>
                </div>
            ) : videoResult ? (
                <div className={`relative max-w-5xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500`}>
                   <div className="bg-zinc-900 rounded-[40px] p-2 border border-zinc-800 shadow-2xl overflow-hidden w-full h-full flex items-center justify-center relative">
                       {videoResult.type === 'video' ? (
                           <video src={videoResult.url} controls className="w-full h-full object-contain rounded-[32px]" autoPlay loop />
                       ) : (
                           /* Flipbook Player Simulation */
                           <FlipbookPlayer item={videoResult} />
                       )}
                   </div>
                   <div className="absolute top-6 left-6 flex gap-2">
                       <span className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black uppercase border border-white/10 text-zinc-400">10s Flipbook active</span>
                       <button onClick={() => { const a = document.createElement('a'); a.href = videoResult.url; a.download = 'lumina-motion.png'; a.click(); }} className="bg-white text-black px-4 py-2 rounded-2xl text-[10px] font-black uppercase hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-xl"><Download className="w-3.5 h-3.5"/> Save Frame</button>
                   </div>
                </div>
            ) : (
                <div className="text-center space-y-8 max-w-md">
                    <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center mx-auto shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <FileVideo className="w-10 h-10 text-zinc-700 opacity-20" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-sm font-black uppercase tracking-[0.4em] text-white">Motion Workspace</h3>
                        <p className="text-xs text-zinc-600 uppercase font-bold tracking-widest">Describe motion or upload an image to begin.</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

const FlipbookPlayer: React.FC<{ item: GeneratedContent }> = ({ item }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(1);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        if (!item.frames || item.frames.length < 2) return;

        // Sequence timing for 10s: 12 frames = ~833ms per frame
        const frameInterval = 833; 
        const crossFadeTime = 600; // Longer cross-fade to hide "blinking"

        const interval = setInterval(() => {
            setOpacity(0); // Fade out the top frame to reveal the one underneath
            
            setTimeout(() => {
                setCurrentIndex(prev => (prev + 1) % item.frames!.length);
                setNextIndex(prev => (prev + 2) % item.frames!.length);
                setOpacity(1); // Snap top frame to next and fade back in
            }, crossFadeTime);

        }, frameInterval);

        return () => clearInterval(interval);
    }, [item.frames]);

    return (
        <div className="relative w-full h-full bg-black rounded-[32px] overflow-hidden">
            {/* The "Ghost" background frame - always sits underneath to prevent black blinks */}
            <img 
                src={item.frames?.[nextIndex] || item.url} 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
                alt="Underlay Frame"
            />
            
            {/* The Active foreground frame with smooth opacity transitions */}
            <img 
                src={item.frames?.[currentIndex] || item.url} 
                className="relative w-full h-full object-contain transition-opacity ease-in-out z-10" 
                style={{ opacity, transitionDuration: '600ms' }}
                alt="Motion Frame"
            />

            {/* Cinematic Overlay to tie frames together */}
            <div className="absolute inset-0 bg-indigo-500/5 mix-blend-overlay pointer-events-none z-20" />
        </div>
    );
};

export default VideoStudio;
