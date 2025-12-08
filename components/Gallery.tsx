
import React, { useState, useEffect, useRef } from 'react';
import { GeneratedContent } from '../types';
import { Download, Loader2, Copy, Volume2, Bone, Play, Pause, Film, FileVideo } from './Icons';

interface GalleryProps {
  items: GeneratedContent[];
  isLoading: boolean;
  onRigImage?: (url: string) => void;
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

const Gallery: React.FC<GalleryProps> = ({ items, isLoading, onRigImage }) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleDownload = (url: string, id: string, type: 'image' | 'audio' | 'animation') => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `lumina-${type}-${id}.${type === 'audio' ? 'wav' : 'png'}`;
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
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[500px] text-zinc-600 p-8 text-center">
        <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
           <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </div>
        <h3 className="text-xl font-semibold text-zinc-300 mb-2">Ready to Create</h3>
        <p className="max-w-md">Select a mode (Image or Speech) and describe your vision to start generating instantly.</p>
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
                                        {/* Rigging Button - Only if it looks like a 3D model prompt or user manually wants to */}
                                        {onRigImage && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onRigImage(item.url); }}
                                                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-full hover:bg-indigo-500 transition-colors shadow-lg"
                                                title="Control Bones & Pose"
                                            >
                                                <Bone className="w-3.5 h-3.5" /> Rig & Pose
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

                </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Gallery;
