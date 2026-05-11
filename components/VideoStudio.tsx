
import React, { useState, useEffect, useRef } from 'react';
import { GenerationConfig, GenerationMode, GeneratedContent, AspectRatio } from '../types';
import { 
  Zap as MotionIcon, Loader2, Sparkles, Wand2, FileVideo, Download, 
  Trash2, Plus, X, Layout, ImageIcon, ChevronRight, 
  Rotate3D, Play, Clock, Settings, ShieldCheck, Key, Film,
  Minus
} from './Icons';
import { generateFlipbook } from '../services/geminiService';

interface VideoStudioProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  onExit: () => void;
}

const MESSAGES = [
  "Initializing Temporal Engine...",
  "Analyzing visual semantics...",
  "Synthesizing motion vectors...",
  "Calculating frame coherence...",
  "Rate-limit safety cooling...",
  "Finalizing anti-blink loop..."
];

const PROFILES = [
  { id: 'fluid', label: 'Fluid Motion', desc: 'Natural, organic transitions.' },
  { id: 'subtle', label: 'Subtle Life', desc: 'Microscopic movement & breathing.' },
  { id: 'epic', label: 'Epic Shift', desc: 'Dynamic cinematic camera work.' },
  { id: 'jitter', label: 'Stop Motion', desc: 'Hand-crafted stop-motion style.' },
] as const;

const VideoStudio: React.FC<VideoStudioProps> = ({ config, setConfig, onExit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingSequence, setIsExportingSequence] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(MESSAGES[0]);
  const [videoResult, setVideoResult] = useState<GeneratedContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config.aspectRatio === AspectRatio.SQUARE) {
        setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.LANDSCAPE_16_9 }));
    }
    if (!config.motionIntensity) setConfig(prev => ({ ...prev, motionIntensity: 0.5 }));
    if (!config.motionProfile) setConfig(prev => ({ ...prev, motionProfile: 'fluid' }));
    if (!config.frameDensity) setConfig(prev => ({ ...prev, frameDensity: 'balanced' }));
  }, []);

  const handleGenerate = async () => {
    if (!config.prompt.trim() && !config.referenceImage) return;
    
    setIsLoading(true);
    setError(null);
    let msgIdx = 0;
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % MESSAGES.length;
      setLoadingMsg(MESSAGES[msgIdx]);
    }, 6000);

    try {
      const result = await generateFlipbook(config, (msg) => setLoadingMsg(msg));
      setVideoResult(result);
    } catch (err: any) {
      console.error(err);
      let errMsg = "Synthesis interrupted. Please try again.";
      const errStr = JSON.stringify(err);
      if (errStr.includes("429") || errStr.includes("quota") || errStr.includes("RESOURCE_EXHAUSTED")) {
        errMsg = "API Quota Depleted. Motion synthesis requires high frequency neural calls. Please wait 2-5 minutes for your limit to reset and try again.";
      }
      setError(errMsg);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const handleExportFullVideo = async () => {
    if (!videoResult?.frames || videoResult.frames.length === 0) return;
    
    setIsExportingSequence(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const firstImg = new Image();
      await new Promise((resolve, reject) => { 
          firstImg.onload = resolve; 
          firstImg.onerror = reject;
          firstImg.src = videoResult.frames![0]; 
      });
      
      canvas.width = firstImg.width;
      canvas.height = firstImg.height;

      const mimeType = 'video/webm;codecs=vp9';
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `lumina-motion-sequence-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setIsExportingSequence(false);
        }, 100);
      };

      recorder.start();

      const frameCount = videoResult.frames.length;
      const totalFramesToDraw = 120; // ~4 seconds at 30fps for a quick loop export
      
      for (let i = 0; i < totalFramesToDraw; i++) {
        const frameIndex = Math.floor(i * (frameCount / totalFramesToDraw)) % frameCount;
        const frameImg = new Image();
        frameImg.src = videoResult.frames[frameIndex];
        await new Promise((r) => { frameImg.onload = r; });
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
        // Small delay to ensure frame is captured
        await new Promise(r => requestAnimationFrame(r));
      }

      setTimeout(() => {
          if (recorder.state === 'recording') recorder.stop();
      }, 200);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Browser video synthesis failed. Ensure you are using a modern browser.");
      setIsExportingSequence(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
          setConfig(prev => ({ ...prev, referenceImage: reader.result as string }));
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
            <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Advanced Neural Animation</p>
          </div>
        </div>
        <button onClick={onExit} className="p-2 text-zinc-500 hover:text-white transition-all bg-zinc-800 border border-zinc-700/50 rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Controls */}
        <div className="w-80 lg:w-[400px] border-r border-zinc-800 flex flex-col bg-zinc-950 shadow-2xl z-20 p-6 overflow-y-auto custom-scrollbar">
          <div className="space-y-8 pb-10">
             <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Motion Profile</label>
                <div className="grid grid-cols-2 gap-2">
                    {PROFILES.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => setConfig(prev => ({ ...prev, motionProfile: p.id }))}
                            className={`p-3 rounded-2xl border text-left transition-all ${config.motionProfile === p.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                        >
                            <p className="text-[10px] font-black uppercase tracking-tighter mb-1">{p.label}</p>
                            <p className="text-[8px] opacity-60 leading-tight">{p.desc}</p>
                        </button>
                    ))}
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Momentum</label>
                    <span className="text-[10px] font-mono text-indigo-400 font-black">{(config.motionIntensity! * 100).toFixed(0)}%</span>
                </div>
                <input 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05" 
                    value={config.motionIntensity} 
                    onChange={(e) => setConfig(prev => ({ ...prev, motionIntensity: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Temporal Density</label>
                <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
                    {['economy', 'balanced', 'ultra'].map((d) => (
                        <button 
                            key={d}
                            onClick={() => setConfig(prev => ({ ...prev, frameDensity: d as any }))}
                            className={`flex-1 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${config.frameDensity === d ? 'bg-indigo-600 text-white' : 'text-zinc-600 hover:text-zinc-400'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
                <p className="text-[8px] text-zinc-600 italic">
                    Sequential throttling enabled to preserve API quota.
                </p>
             </div>

             <div className="h-px bg-zinc-900" />

             <div className="space-y-4">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Base Material</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`aspect-video border-2 border-dashed rounded-3xl cursor-pointer flex flex-col items-center justify-center gap-3 transition-all group overflow-hidden relative ${config.referenceImage ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800 hover:border-indigo-500/30 bg-zinc-900/50'}`}
                >
                  {config.referenceImage ? (
                    <>
                      <img src={config.referenceImage} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Update Reference</span>
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
                  placeholder="e.g. hair blowing gently in a soft breeze"
                  className="w-full h-28 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-xs text-white resize-none focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-800"
                />
             </div>

             <button 
               onClick={handleGenerate}
               disabled={isLoading || (!config.prompt.trim() && !config.referenceImage)}
               className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-95 ${isLoading ? 'bg-zinc-800 text-zinc-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/30'}`}
             >
               {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <MotionIcon className="w-5 h-5" />}
               {isLoading ? 'Synthesizing...' : 'Sync Motion Sequence'}
             </button>
          </div>
        </div>

        {/* Center: Preview */}
        <div className="flex-1 bg-[#09090b] flex items-center justify-center p-8 lg:p-20 relative">
            {error && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
                <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-xl p-6 rounded-3xl flex items-start gap-4 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <X className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-black uppercase text-xs tracking-widest mb-1">Quota Exceeded</h3>
                    <p className="text-zinc-400 text-[11px] leading-relaxed font-medium">{error}</p>
                    <button onClick={() => setError(null)} className="mt-3 text-[10px] font-black uppercase text-red-400 hover:text-white transition-colors">Dismiss</button>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
                <div className="max-w-2xl w-full flex flex-col items-center gap-8 animate-in fade-in duration-700 text-center">
                    <div className="relative">
                        <div className="w-56 h-56 rounded-full border-[10px] border-indigo-950/30 border-t-indigo-500 animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <MotionIcon className="w-12 h-12 text-indigo-500 animate-pulse fill-current" />
                        </div>
                    </div>
                    <div className="text-center space-y-4">
                        <h2 className="text-2xl font-black uppercase tracking-[0.4em] text-white animate-pulse">{loadingMsg}</h2>
                        <div className="flex flex-col items-center gap-2">
                             <div className="h-1 w-64 bg-zinc-900 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-500 animate-[loading_2s_ease-in-out_infinite]" />
                             </div>
                             <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest max-w-xs leading-relaxed italic">
                                Note: High-fidelity loops require strictly sequential processing to stay under API rate limits.
                             </p>
                        </div>
                    </div>
                </div>
            ) : videoResult ? (
                <div className={`relative max-w-6xl w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-700`}>
                   <div className="bg-zinc-900 rounded-[56px] p-2.5 border border-white/5 shadow-[0_0_120px_rgba(0,0,0,1)] overflow-hidden w-full h-full flex items-center justify-center relative ring-1 ring-white/10">
                       <FlipbookPlayer item={videoResult} />
                   </div>
                   
                   <div className="absolute top-10 left-10 flex flex-col gap-3">
                       <div className="bg-black/60 backdrop-blur-xl px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase border border-white/10 text-zinc-400 flex items-center gap-3">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                            Active Neural Loop
                       </div>
                       <div className="flex gap-3">
                         <button 
                            onClick={handleExportFullVideo} 
                            disabled={isExportingSequence} 
                            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase hover:bg-indigo-500 transition-all flex items-center gap-3 shadow-2xl active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-600"
                         >
                           {isExportingSequence ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileVideo className="w-4 h-4"/>} 
                           {isExportingSequence ? 'Merging Video...' : 'Export Master Sequence'}
                         </button>
                         <button onClick={() => { 
                             const a = document.createElement('a'); 
                             a.style.display = 'none';
                             a.href = videoResult.url; 
                             a.download = 'lumina-master-frame.png'; 
                             document.body.appendChild(a);
                             a.click(); 
                             document.body.removeChild(a);
                         }} className="bg-white text-black px-6 py-3 rounded-2xl text-[11px] font-black uppercase hover:bg-zinc-200 transition-all flex items-center gap-3 shadow-2xl active:scale-95"><Download className="w-4 h-4"/> Save Frame</button>
                       </div>
                   </div>

                   <div className="absolute bottom-10 right-10 flex gap-4">
                        <div className="bg-zinc-900/80 backdrop-blur-xl p-5 rounded-3xl border border-white/5 text-right flex flex-col gap-1">
                             <span className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Loop Metadata</span>
                             <span className="text-[10px] font-black uppercase text-white tracking-widest">{videoResult.frames?.length} Frames • 10.0s Synthesized</span>
                        </div>
                   </div>
                </div>
            ) : (
                <div className="text-center space-y-10 max-w-lg group">
                    <div className="relative">
                        <div className="w-32 h-32 bg-zinc-900 border border-white/5 rounded-full flex items-center justify-center mx-auto shadow-2xl group-hover:scale-110 transition-transform duration-700">
                            <FileVideo className="w-12 h-12 text-zinc-700 opacity-20" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xl font-black uppercase tracking-[0.5em] text-white">Neural Workspace</h3>
                        <p className="text-xs text-zinc-700 uppercase font-black tracking-widest leading-relaxed">
                            Upload a master reference or describe a kinetic sequence to initiate temporal synthesis.
                        </p>
                    </div>
                </div>
            )}
        </div>
      </div>
      <style>{`
        @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

const FlipbookPlayer: React.FC<{ item: GeneratedContent }> = ({ item }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [nextIndex, setNextIndex] = useState(1);
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        if (!item.frames || item.frames.length < 2) return;
        const frameCount = item.frames.length;
        const frameInterval = 10000 / frameCount; 
        const crossFadeTime = frameInterval * 0.7;

        const interval = setInterval(() => {
            setOpacity(0);
            setTimeout(() => {
                setCurrentIndex(prev => (prev + 1) % item.frames!.length);
                setNextIndex(prev => (prev + 2) % item.frames!.length);
                setOpacity(1);
            }, crossFadeTime);
        }, frameInterval);

        return () => clearInterval(interval);
    }, [item.frames]);

    return (
        <div className="relative w-full h-full bg-black rounded-[46px] overflow-hidden group">
            <img 
                src={item.frames?.[nextIndex] || item.url} 
                className="absolute inset-0 w-full h-full object-contain pointer-events-none scale-105 blur-sm opacity-20" 
                alt="Motion Buffer"
            />
            <img 
                src={item.frames?.[currentIndex] || item.url} 
                className="relative w-full h-full object-contain transition-opacity ease-in-out z-10" 
                style={{ opacity, transitionDuration: '400ms' }}
                alt="Active Temporal Frame"
            />
            <div className="absolute inset-0 bg-radial-gradient from-transparent to-black/40 pointer-events-none z-20" />
            <div className="absolute inset-x-0 h-px bg-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-30 animate-[scan_4s_linear_infinite] pointer-events-none" />
        </div>
    );
};

export default VideoStudio;
