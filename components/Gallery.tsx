
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedContent, GenerationMode } from '../types';
import { Download, Loader2, Copy, Volume2, Play, Pause, Film, FileVideo, PenTool, Sparkles, Wand2, BookOpen, Hexagon, Layout, ImageIcon, ChevronRight, Zap } from './Icons';

interface GalleryProps {
  items: GeneratedContent[];
  isLoading: boolean;
  onEditImage?: (item: GeneratedContent) => void;
  onSelectPrompt?: (prompt: string, mode: GenerationMode) => void;
}

const AnimationPlayer: React.FC<{ frames: string[], thumbnail: string, duration?: number }> = ({ frames, thumbnail, duration = 3 }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(0);
    const intervalRef = useRef<number | null>(null);

    // Calculate interval based on duration and frame count
    // duration (seconds) * 1000 = ms
    // interval = ms / frames
    const frameInterval = Math.max(100, (duration * 1000) / frames.length);

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = window.setInterval(() => {
                setCurrentFrame(prev => (prev + 1) % frames.length);
            }, frameInterval);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isPlaying, frames.length, frameInterval]);

    const togglePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="relative w-full h-full bg-zinc-900 group">
             <img 
                src={isPlaying ? frames[currentFrame] : thumbnail} 
                alt="Animation Frame" 
                className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                 <button 
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all border border-white/40 shadow-xl pointer-events-auto"
                 >
                     {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                 </button>
            </div>
            {/* Tag */}
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-white flex items-center gap-1 font-bold tracking-wider">
                <Film className="w-3 h-3" /> {duration}s SEQ
            </div>
        </div>
    );
};

const Gallery: React.FC<GalleryProps> = ({ items, isLoading, onEditImage, onSelectPrompt }) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Fix: Expanded the allowed types to include 'video' to prevent type mismatch in handleDownloadAll on line 154
  const handleDownload = (url: string, id: string, type: 'image' | 'audio' | 'animation' | 'caption-set' | 'video') => {
    const link = document.createElement('a');
    link.href = url;
    // Fix: Handle the file extension for each type, adding JSON support for caption sets and mp4 for videos
    let extension = 'png';
    if (type === 'audio') extension = 'wav';
    else if (type === 'video') extension = 'mp4';
    else if (type === 'caption-set') extension = 'json';
    else if (type === 'animation') extension = 'webm';
    
    link.download = `lumina-${type}-${id}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportVideo = async (item: GeneratedContent) => {
      if (!item.frames || item.frames.length === 0) return;
      setIsExporting(item.id);

      try {
          // Create a hidden canvas to render the frames
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          // Load first image to set dimensions
          await new Promise((resolve) => {
              img.onload = resolve;
              img.src = item.frames![0];
          });
          
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Setup MediaRecorder
          const stream = canvas.captureStream(30); // 30 FPS stream
          const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          const chunks: BlobPart[] = [];
          
          recorder.ondataavailable = (e) => chunks.push(e.data);
          recorder.onstop = () => {
              const blob = new Blob(chunks, { type: 'video/webm' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `lumina-animation-${item.id}.webm`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              setIsExporting(null);
          };

          recorder.start();

          // Draw frames to canvas
          // We want the total video to match the requested duration
          const durationMs = (item.duration || 3) * 1000;
          const frameDuration = durationMs / item.frames.length;
          const startTime = Date.now();
          
          let frameIndex = 0;
          
          const drawFrame = async () => {
             if (frameIndex >= item.frames!.length) {
                 recorder.stop();
                 return;
             }

             const frameImg = new Image();
             frameImg.src = item.frames![frameIndex];
             await new Promise(r => frameImg.onload = r);
             
             if (ctx) ctx.drawImage(frameImg, 0, 0);
             
             // Wait for the duration of this frame before drawing next
             setTimeout(() => {
                 frameIndex++;
                 drawFrame();
             }, frameDuration);
          };

          drawFrame();

      } catch (err) {
          console.error("Export failed", err);
          alert("Failed to export video. Your browser may not support WebM recording.");
          setIsExporting(null);
      }
  };

  const handleDownloadAll = () => {
    items.forEach((item, index) => {
      setTimeout(() => {
        handleDownload(item.url, item.id, item.type);
      }, index * 500);
    });
  };

  if (isLoading && items.length === 0) {
     return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-zinc-500 space-y-4">
             <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-pulse" />
                </div>
             </div>
             <p className="animate-pulse font-medium">Creating magic...</p>
        </div>
     );
  }

  if (items.length === 0) {
    const STARTERS = [
      {
        title: "Lost Jungle Ruins",
        desc: "Lush ancient mossy temple consumed by jungle vines, sunset golden lighting, cinematic 8k",
        prompt: "Dramatic wide angle shot of long-lost ancient temple ruins consumed by deep green mossy vines, hidden deep inside a mist-shrouded jungle, sunset volumetric lighting, cinematic atmosphere, 8k",
        mode: GenerationMode.IMAGE,
        icon: ImageIcon,
        styleClass: "from-amber-600/15 via-transparent to-transparent border-amber-950/40 hover:border-amber-500/40 focus:ring-amber-500/20 text-amber-400"
      },
      {
        title: "Neon Origami Crane",
        desc: "Glowing magenta and violet origami emblem, clean aesthetic, high contrast vector lines",
        prompt: "Geometric vector logo design of an elegant folding origami crane glowing with magenta and violet neon light, minimalist composition, pure matte dark background, high contrast lines",
        mode: GenerationMode.LOGO,
        icon: Hexagon,
        styleClass: "from-pink-600/15 via-transparent to-transparent border-pink-950/40 hover:border-pink-500/40 focus:ring-pink-500/20 text-pink-400"
      },
      {
        title: "Plain Anime Fantasy",
        desc: "Modern anime illustration overlooking sparkling starry ocean sky with bold typographic layout",
        prompt: "Masterpiece minimalism, hand-drawn anime silhouette overlooking a sparkling fantasy ocean, clear starry night sky, large bold typography space, aesthetic high contrast composition",
        mode: GenerationMode.STORY,
        icon: BookOpen,
        styleClass: "from-teal-600/15 via-transparent to-transparent border-teal-950/40 hover:border-teal-500/40 focus:ring-teal-500/20 text-teal-400"
      },
      {
        title: "Sleek Commercial Space",
        desc: "Tech-forward minimalist desk accessory setup, symmetric cinematic branding visual",
        prompt: "Modern dark matte tactile product backdrop with sleek glowing gadget accessories arranged symmetrically, perfect 8k resolution, crisp advertising studio photography, deep blue accents",
        mode: GenerationMode.THUMBNAIL,
        icon: Layout,
        styleClass: "from-indigo-600/15 via-transparent to-transparent border-indigo-950/40 hover:border-indigo-500/40 focus:ring-indigo-500/20 text-indigo-400"
      }
    ];

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-16 relative overflow-y-auto custom-scrollbar h-full bg-[#050508]/10">
        {/* Decorative Grid and Background Glows */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: `radial-gradient(ellipse at 50% 50%, #ffffff 1px, transparent 1px)`, backgroundSize: '24px 24px' }}></div>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[90px] pointer-events-none"></div>

        <div className="max-w-2xl w-full text-center space-y-8 z-10 my-auto">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-500/5 border border-indigo-500/15 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm animate-pulse">
            <Sparkles className="w-3 h-3 fill-current" /> Creative Studio Active
          </div>

          <div className="space-y-3">
            <h3 className="text-3xl md:text-4xl font-black tracking-tight text-white/90">
              LuminaGen Workspace
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-lg mx-auto font-medium">
              Configure parameters in the left panel, or select an inspirational starter card below to instantly populate your canvas details.
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-2 text-left">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.8)]"></span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Inspirational Starters</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
              {STARTERS.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.title}
                    onClick={() => onSelectPrompt && onSelectPrompt(starter.prompt, starter.mode)}
                    className={`p-5 rounded-2xl bg-gradient-to-br bg-zinc-950/40 border text-left transition-all duration-300 hover:scale-[1.01] hover:-translate-y-0.5 shadow-xl group flex flex-col justify-between h-[135px] ${starter.styleClass}`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-400 transition-colors">
                          {starter.mode === GenerationMode.IMAGE && 'IMAGE'}
                          {starter.mode === GenerationMode.LOGO && 'LOGO'}
                          {starter.mode === GenerationMode.STORY && 'STORY'}
                          {starter.mode === GenerationMode.THUMBNAIL && 'THUMBNAIL'}
                        </span>
                        <Icon className="w-3.5 h-3.5 opacity-55 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300" />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wide text-zinc-200 group-hover:text-white transition-colors">{starter.title}</h4>
                      <p className="text-[10px] text-zinc-500 leading-normal line-clamp-2 font-medium">{starter.desc}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-zinc-650 group-hover:text-indigo-400 transition-colors mt-2">
                      <span>Populate Prompt</span>
                      <ChevronRight className="w-3 h-3 translate-x-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Gallery Header */}
      <div className="flex-shrink-0 p-4 lg:px-8 border-b border-zinc-800/50 flex items-center justify-between bg-zinc-950/50 backdrop-blur-sm z-10">
        <h2 className="text-sm font-medium text-zinc-400">Results <span className="text-zinc-600">({items.length})</span></h2>
        {items.length > 1 && (
            <button 
                onClick={handleDownloadAll}
                className="text-xs flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 transition-colors"
            >
                <Copy className="w-3 h-3" /> Download All
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {isLoading && (
                <div className="aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center animate-pulse">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        <span className="text-zinc-500 text-sm">Generating...</span>
                    </div>
                </div>
            )}
            
            {items.map((item) => (
                <div key={item.id} className={`group relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl transition-all hover:border-indigo-500/50 ${item.type === 'audio' ? 'aspect-auto' : ''}`}>
                    
                    {/* ANIMATION CONTENT */}
                    {item.type === 'animation' && item.frames && (
                         <div className={`w-full h-full bg-zinc-900 aspect-square`}>
                             <AnimationPlayer frames={item.frames} thumbnail={item.url} duration={item.duration} />
                             
                             <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between">
                                <p className="text-white text-xs font-medium line-clamp-1 flex-1 mr-2">{item.prompt}</p>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleExportVideo(item); }}
                                    disabled={isExporting === item.id}
                                    className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-1.5"
                                >
                                    {isExporting === item.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <FileVideo className="w-3 h-3" />
                                    )}
                                    {isExporting === item.id ? 'Exporting...' : 'Save Video'}
                                </button>
                             </div>
                         </div>
                    )}

                    {/* IMAGE CONTENT */}
                    {item.type === 'image' && (
                        <>
                            <div className={`w-full h-full bg-zinc-900 flex items-center justify-center ${item.aspectRatio === '16:9' ? 'aspect-video' : item.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-[3/4]'}`}>
                                <img 
                                    src={item.url} 
                                    alt={item.prompt} 
                                    className="w-full h-full object-contain"
                                    loading="lazy"
                                />
                            </div>
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                <p className="text-white text-sm font-medium line-clamp-2 mb-4 drop-shadow-md">
                                    {item.prompt}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400 bg-black/50 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                                        {item.model.split('-')[1]} • {item.aspectRatio}
                                    </span>
                                    
                                    <div className="flex gap-2">
                                        {/* Edit Button for manual refinement */}
                                        {onEditImage && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onEditImage(item); }}
                                                className="flex items-center gap-2 px-3 py-2 bg-zinc-800 text-white text-xs font-bold rounded-full hover:bg-zinc-700 transition-colors"
                                                title="Edit / Refine"
                                            >
                                                <PenTool className="w-3.5 h-3.5" /> Edit
                                            </button>
                                        )}



                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDownload(item.url, item.id, 'image'); }}
                                            className="flex items-center gap-2 px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 transition-colors"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Download
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* AUDIO CONTENT */}
                    {item.type === 'audio' && (
                        <div className="p-6 flex flex-col justify-between h-full bg-gradient-to-br from-zinc-900 to-zinc-950">
                             <div className="mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                        <Volume2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Audio Generated</span>
                                </div>
                                <p className="text-zinc-200 text-sm font-medium line-clamp-3">"{item.prompt}"</p>
                             </div>

                             <div className="space-y-4">
                                <div className="w-full h-12 bg-zinc-950 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800 relative">
                                    {/* Fake waveform viz */}
                                    <div className="flex items-center gap-1 h-full w-full justify-center px-4">
                                        {[...Array(20)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="w-1 bg-indigo-500/40 rounded-full animate-pulse"
                                                style={{ height: `${Math.random() * 80 + 20}%`, animationDelay: `${i * 0.1}s` }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>

                                <audio controls src={item.url} className="w-full h-8 block custom-audio" />
                                
                                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                                     <span className="text-xs text-zinc-500">Voice: <span className="text-zinc-300">{item.voice}</span></span>
                                     <button 
                                        onClick={() => handleDownload(item.url, item.id, 'audio')}
                                        className="text-xs flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Save WAV
                                    </button>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* VIDEO CONTENT */}
                    {item.type === 'video' && (
                        <div className="relative w-full h-full bg-zinc-900 group aspect-video">
                            <video src={item.url} className="w-full h-full object-contain" autoPlay loop muted />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
                                <p className="text-white text-xs font-medium line-clamp-1 mb-4">{item.prompt}</p>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-zinc-400 bg-black/50 px-2 py-1 rounded">Veo Video • {item.aspectRatio}</span>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDownload(item.url, item.id, 'video'); }}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-zinc-200 transition-colors"
                                    >
                                        <Download className="w-3 h-3" /> Download
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
