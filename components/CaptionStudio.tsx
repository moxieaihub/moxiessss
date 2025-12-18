
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GenerationConfig, CaptionSegment, ModelType, GenerationMode, CaptionAnimation } from '../types';
import { 
  Upload, X, Mic, FileVideo, Check, Play, Pause, Download, 
  Sparkles, Loader2, MessageSquare, Volume2, Settings, Palette, 
  Trash2, Plus, Zap, ChevronRight, Layout, ImageIcon, Clock, Minus,
  TypeIcon, Wand2, Zap as MotionIcon
} from './Icons';
import { GoogleGenAI, Type } from "@google/genai";

interface CaptionStudioProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  onExit: () => void;
}

const CAPTION_COLORS = [
  { name: 'White', value: 'Pure White', class: 'bg-white', hex: '#ffffff' },
  { name: 'Black', value: 'Matte Black', class: 'bg-black', hex: '#000000' },
  { name: 'Red', value: 'Crimson Red', class: 'bg-red-600', hex: '#dc2626' },
  { name: 'Blue', value: 'Electric Blue', class: 'bg-blue-500', hex: '#3b82f6' },
  { name: 'Gold', value: 'Metallic Gold', class: 'bg-amber-500', hex: '#fbbf24' },
  { name: 'Neon', value: 'Cyber Lime', class: 'bg-lime-400', hex: '#a3e635' },
  { name: 'Pink', value: 'Vivid Pink', class: 'bg-pink-500', hex: '#ec4899' },
  { name: 'Purple', value: 'Deep Purple', class: 'bg-purple-600', hex: '#9333ea' },
  { name: 'Orange', value: 'Sunset Orange', class: 'bg-orange-500', hex: '#f97316' },
  { name: 'Grad1', value: 'Sunset Gradient', class: 'bg-gradient-to-r from-orange-400 to-red-500', hex: 'gradient-sunset' },
  { name: 'Grad2', value: 'Ocean Gradient', class: 'bg-gradient-to-r from-cyan-400 to-blue-500', hex: 'gradient-ocean' },
  { name: 'Grad3', value: 'Cyber Gradient', class: 'bg-gradient-to-r from-purple-400 to-pink-500', hex: 'gradient-cyber' },
];

const CAPTION_FONTS = [
  { id: 'Inter', name: 'Inter (Sans)' },
  { id: 'Roboto', name: 'Roboto' },
  { id: 'Open Sans', name: 'Open Sans' },
  { id: 'Montserrat', name: 'Montserrat' },
  { id: 'Lato', name: 'Lato' },
];

const CAPTION_STYLES = [
  { id: 'bold', name: 'Impact Bold' },
  { id: 'outline', name: 'Shadow Outline' },
  { id: 'neon', name: 'Neon Glow' },
  { id: '3d', name: '3D Extruded' },
  { id: 'minimalist', name: 'Modern Clean' },
];

const ANIMATIONS: { id: CaptionAnimation; label: string }[] = [
  { id: 'none', label: 'Static' },
  { id: 'fade', label: 'Fade' },
  { id: 'pop', label: 'Pop In' },
  { id: 'slide-up', label: 'Slide Up' },
  { id: 'zoom-in', label: 'Zoom In' },
  { id: 'typewriter', label: 'Typewriter' },
];

const CaptionStudio: React.FC<CaptionStudioProps> = ({ config, setConfig, onExit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'setup' | 'style'>('setup');
  const [statusMessage, setStatusMessage] = useState("");
  
  const [audioUrl, setAudioUrl] = useState<string | null>(config.captionAudioUrl || null);
  const [videoUrl, setVideoUrl] = useState<string | null>(config.captionVideoUrl || null);
  const [script, setScript] = useState(config.captionScript || "");
  const [segments, setSegments] = useState<CaptionSegment[]>(config.captionSegments || []);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  // Synchronize internal segments with parent config for persistence
  useEffect(() => {
    setConfig(prev => ({ ...prev, captionSegments: segments, captionScript: script }));
  }, [segments, script, setConfig]);

  const getSupportedMimeType = () => {
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=h264', 'video/mp4'];
    for (const type of types) if (MediaRecorder.isTypeSupported(type)) return type;
    return '';
  };

  const handleTimeUpdate = useCallback(() => {
    if (!videoPlayerRef.current || segments.length === 0) return;
    const currentTime = videoPlayerRef.current.currentTime;
    const index = segments.findIndex(seg => currentTime >= seg.startTime && currentTime <= seg.endTime);
    if (index !== -1 && index !== activeSegmentIndex) {
      setActiveSegmentIndex(index);
    }
  }, [segments, activeSegmentIndex]);

  const extractAudioFromVideo = async (videoFile: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
          );
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(offlineContext.destination);
          source.start();
          const renderedBuffer = await offlineContext.startRendering();
          const wavBlob = bufferToWav(renderedBuffer);
          resolve(wavBlob);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(videoFile);
    });
  };

  const bufferToWav = (abuffer: AudioBuffer) => {
    const numOfChan = abuffer.numberOfChannels,
      length = abuffer.length * numOfChan * 2 + 44,
      buffer = new ArrayBuffer(length),
      view = new DataView(buffer),
      channels = [],
      sampleRate = abuffer.sampleRate;
    let i, sample, offset = 0, pos = 0;
    const setUint16 = (data: number) => { view.setUint16(pos, data, true); pos += 2; };
    const setUint32 = (data: number) => { view.setUint32(pos, data, true); pos += 4; };
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157); setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan); setUint32(sampleRate); setUint32(sampleRate * 2 * numOfChan); setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);
    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {
        sample = Math.max(-1, Math.min(1, channels[i][offset]));
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
        view.setInt16(pos, sample, true);
        pos += 2;
      }
      offset++;
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setConfig(prev => ({ ...prev, captionVideoUrl: url }));
      if (confirm("Would you like to analyze this video to generate AI captions?")) {
        handleAutoCaption(file);
      }
    }
  };

  const handleAutoCaption = async (videoFile: File) => {
    setIsSyncing(true);
    setStatusMessage("Extracting audio...");
    try {
      const audioBlob = await extractAudioFromVideo(videoFile);
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioUrl(audioUrl);
      setStatusMessage("AI Transcribing...");
      
      const reader = new FileReader();
      const base64Audio = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(audioBlob);
      });
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { 
            parts: [ 
              { inlineData: { mimeType: 'audio/wav', data: base64Audio } }, 
              { text: "Analyze this audio. Transcribe the speech into a series of short, engaging caption segments. Provide highly accurate start and end timestamps. Format the response ONLY as a JSON array of objects with 'text', 'startTime' (seconds), and 'endTime' (seconds)." } 
            ] 
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                startTime: { type: Type.NUMBER },
                endTime: { type: Type.NUMBER }
              },
              required: ["text", "startTime", "endTime"]
            }
          }
        }
      });
      
      // Sanitizing response to ensure only JSON remains (stripping markdown)
      let rawText = response.text || "[]";
      if (rawText.includes("```json")) {
        rawText = rawText.split("```json")[1].split("```")[0];
      } else if (rawText.includes("```")) {
        rawText = rawText.split("```")[1].split("```")[0];
      }

      const data = JSON.parse(rawText.trim());
      const formatted = data.map((item: any, i: number) => ({
        id: `seg-${Date.now()}-${i}`,
        text: item.text,
        startTime: item.startTime,
        endTime: item.endTime,
        animation: config.defaultCaptionAnimation || 'fade'
      }));
      
      setSegments(formatted);
      setScript(formatted.map((s: any) => s.text).join(" "));
      setConfig(prev => ({ ...prev, captionSegments: formatted, captionAudioUrl: audioUrl }));
      setStatusMessage("Captions synchronized!");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to auto-caption. Check console for details.");
    } finally {
      setIsSyncing(false);
    }
  };

  const adjustTime = (id: string, field: 'startTime' | 'endTime', delta: number) => {
    setSegments(prev => prev.map(seg => {
      if (seg.id === id) {
        const newVal = Math.round((seg[field] + delta) * 10) / 10;
        return { ...seg, [field]: Math.max(0, newVal) };
      }
      return seg;
    }));
  };

  const renderCaptionsToCanvas = (ctx: CanvasRenderingContext2D, segment: CaptionSegment, currentTime: number, canvasWidth: number, canvasHeight: number) => {
    const text = segment.text;
    const animation = segment.animation || config.defaultCaptionAnimation || 'none';
    const segmentDuration = segment.endTime - segment.startTime;
    const progress = (currentTime - segment.startTime) / (segmentDuration || 1);
    
    const size = config.captionSize || 'large';
    const colorVal = config.captionColor || 'Pure White';
    const style = config.captionStyle || 'bold';
    const position = config.captionPosition || 'bottom';
    const font = config.captionFont || 'Inter';
    
    let fontSize = canvasHeight * 0.08;
    if (size === 'small') fontSize = canvasHeight * 0.04;
    else if (size === 'medium') fontSize = canvasHeight * 0.06;
    else if (size === 'xl') fontSize = canvasHeight * 0.12;
    
    ctx.save();
    
    let opacity = 1;
    let scale = 1;
    let offsetY = 0;
    let displayText = text;

    const entryTime = 0.25;
    const entryProgress = Math.min(1, (currentTime - segment.startTime) / entryTime);

    if (animation === 'fade') {
      opacity = entryProgress;
    } else if (animation === 'pop') {
      opacity = entryProgress;
      scale = 0.5 + (entryProgress * 0.5);
      if (entryProgress > 0.8) scale = 1.05;
      if (entryProgress >= 1) scale = 1;
    } else if (animation === 'slide-up') {
      opacity = entryProgress;
      offsetY = (1 - entryProgress) * 40;
    } else if (animation === 'zoom-in') {
      opacity = entryProgress;
      scale = 1 + (0.2 * (1 - entryProgress));
    } else if (animation === 'typewriter') {
      const charLimit = Math.floor(text.length * entryProgress * 4);
      displayText = text.substring(0, charLimit);
    }

    ctx.globalAlpha = opacity;
    ctx.font = `900 ${fontSize}px "${font}", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    
    const maxWidth = canvasWidth * 0.9;
    const words = displayText.split(' ');
    let line = ''; const lines = [];
    for(let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      if (ctx.measureText(testLine).width > maxWidth && n > 0) { lines.push(line); line = words[n] + ' '; }
      else line = testLine;
    }
    lines.push(line);
    
    let startY = canvasHeight / 2;
    if (position === 'top') startY = canvasHeight * 0.2;
    else if (position === 'bottom') startY = canvasHeight * 0.8;
    
    startY += offsetY;
    const lineHeight = fontSize * 1.1;
    let currentY = startY - ((lines.length - 1) * lineHeight / 2);
    
    lines.forEach(lineText => {
      ctx.save();
      ctx.translate(canvasWidth / 2, currentY);
      ctx.scale(scale, scale);
      ctx.translate(-canvasWidth / 2, -currentY);

      const colorObj = CAPTION_COLORS.find(c => c.value === colorVal);
      if (colorObj?.hex.startsWith('gradient')) {
        const gradient = ctx.createLinearGradient(0, currentY - fontSize/2, canvasWidth, currentY + fontSize/2);
        if (colorObj.hex === 'gradient-sunset') { gradient.addColorStop(0, '#fb923c'); gradient.addColorStop(1, '#dc2626'); }
        else if (colorObj.hex === 'gradient-ocean') { gradient.addColorStop(0, '#22d3ee'); gradient.addColorStop(1, '#2563eb'); }
        else if (colorObj.hex === 'gradient-cyber') { gradient.addColorStop(0, '#a855f7'); gradient.addColorStop(1, '#ec4899'); }
        ctx.fillStyle = gradient;
      } else ctx.fillStyle = colorObj?.hex || '#ffffff';
      
      if (style === 'outline') {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = fontSize * 0.15;
        ctx.strokeText(lineText.trim(), canvasWidth / 2, currentY);
      } else if (style === 'neon') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = ctx.fillStyle as string;
      } else if (style === '3d') {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowOffsetX = 4;
        ctx.shadowOffsetY = 4;
      }
      
      ctx.fillText(lineText.trim(), canvasWidth / 2, currentY); 
      ctx.restore(); 
      currentY += lineHeight;
    });
    ctx.restore();
  };

  const handleExportVideo = async () => {
    if (!videoPlayerRef.current || !videoUrl) return;
    setIsExporting(true);
    setExportProgress(0);
    const video = videoPlayerRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const wasLooping = video.loop;
    video.loop = false;
    
    const mimeType = getSupportedMimeType();
    const canvasStream = canvas.captureStream(30);
    // @ts-ignore
    const videoStream = video.captureStream ? video.captureStream() : (video as any).mozCaptureStream ? (video as any).mozCaptureStream() : null;
    
    const combinedTracks = [...canvasStream.getTracks()];
    if (videoStream && videoStream.getAudioTracks().length > 0) {
        combinedTracks.push(videoStream.getAudioTracks()[0]);
    }
    
    const recorder = new MediaRecorder(new MediaStream(combinedTracks), { 
        mimeType, 
        videoBitsPerSecond: 10000000 
    });
    
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `captioned-master-${Date.now()}.webm`;
        a.click();
        video.loop = wasLooping;
        video.muted = false;
        setIsExporting(false);
    };

    video.currentTime = 0;
    video.muted = false;
    recorder.start();
    video.play();
    
    const drawLoop = () => {
        if (video.ended || video.currentTime >= video.duration - 0.05) {
            if (recorder.state !== 'inactive') recorder.stop();
            return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const currentTime = video.currentTime;
        const currentSeg = segments.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
        if (currentSeg) renderCaptionsToCanvas(ctx, currentSeg, currentTime, canvas.width, canvas.height);
        setExportProgress((video.currentTime / video.duration) * 100);
        if (recorder.state === 'recording') {
            requestAnimationFrame(drawLoop);
        }
    };
    drawLoop();
  };

  const getCaptionContainerClasses = () => {
    const pos = config.captionPosition || 'bottom';
    let classes = "absolute inset-0 flex p-10 pointer-events-none z-10 transition-all duration-300 ";
    if (pos === 'top') classes += "items-start pt-24 justify-center";
    else if (pos === 'center') classes += "items-center justify-center";
    else classes += "items-end pb-32 justify-center";
    return classes;
  };

  const getCaptionStyles = () => {
      const colorVal = config.captionColor || 'Pure White';
      const size = config.captionSize || 'large';
      const style = config.captionStyle || 'bold';
      const font = config.captionFont || 'Inter';
      const colorObj = CAPTION_COLORS.find(c => c.value === colorVal);
      
      let classes = `transition-all duration-300 font-black tracking-tight drop-shadow-2xl text-center px-6 max-w-[90%] leading-[1.1] `;
      
      if (size === 'small') classes += "text-xl ";
      else if (size === 'medium') classes += "text-3xl ";
      else if (size === 'large') classes += "text-5xl ";
      else if (size === 'xl') classes += "text-7xl ";
      
      if (style === 'outline') classes += "style-outline ";
      else if (style === 'neon') classes += "style-neon ";
      else if (style === '3d') classes += "style-3d ";
      else if (style === 'minimalist') classes += "font-medium italic tracking-normal opacity-90 ";
      
      const activeSeg = segments[activeSegmentIndex];
      const anim = activeSeg?.animation || config.defaultCaptionAnimation || 'none';
      if (anim !== 'none') classes += `anim-${anim} `;

      const inlineStyle: React.CSSProperties = { fontFamily: `'${font}', sans-serif` };
      if (colorObj?.hex.startsWith('gradient')) {
          classes += "bg-clip-text text-transparent ";
          if (colorObj.hex === 'gradient-sunset') classes += "bg-gradient-to-r from-orange-400 to-red-600 ";
          else if (colorObj.hex === 'gradient-ocean') classes += "bg-gradient-to-r from-cyan-400 to-blue-600 ";
          else if (colorObj.hex === 'gradient-cyber') classes += "bg-gradient-to-r from-purple-500 to-pink-500 ";
      } else inlineStyle.color = colorObj?.hex || '#ffffff';
      
      return { classes, inlineStyle };
  };

  const { classes: captionClasses, inlineStyle: captionInlineStyle } = getCaptionStyles();

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 overflow-hidden relative">
      {isExporting && (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-10 text-center">
            <div className="relative mb-8">
                 <div className="w-32 h-32 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                 <div className="absolute inset-0 flex items-center justify-center font-black text-white text-xl">{Math.round(exportProgress)}%</div>
            </div>
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Finalizing Master</h2>
            <p className="text-zinc-500 text-sm max-w-sm">Merging visual overrides and merging audio tracks. Please do not close this window.</p>
        </div>
      )}

      {/* Top Navbar */}
      <div className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-xl shadow-indigo-500/10"><MessageSquare className="w-5 h-5" /></div>
            <div>
                <h1 className="font-bold text-sm lg:text-base text-white">Master <span className="text-indigo-500">Studio</span></h1>
                <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{statusMessage || "Workspace Active"}</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={onExit} className="px-5 py-2.5 text-xs font-bold text-zinc-500 hover:text-white transition-colors bg-zinc-900 rounded-xl border border-zinc-800">Discard</button>
            <button 
                onClick={handleExportVideo}
                disabled={segments.length === 0 || !videoUrl || isExporting}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs transition-all bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl disabled:bg-zinc-800 disabled:text-zinc-600"
            >
                <Download className="w-4 h-4" /> Render & Export
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Column */}
        <div className="w-80 lg:w-96 border-r border-zinc-800 flex flex-col bg-zinc-950/40 shadow-2xl z-20">
            <div className="flex border-b border-zinc-800">
                <button onClick={() => setActiveTab('setup')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'setup' ? 'text-white border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}><Settings className="w-3 h-3"/> Setup</button>
                <button onClick={() => setActiveTab('style')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'style' ? 'text-white border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}><Palette className="w-3 h-3"/> Layout & Style</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === 'setup' ? (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Target Asset</label>
                            <div onClick={() => videoInputRef.current?.click()} className={`aspect-video border-2 border-dashed rounded-3xl cursor-pointer flex flex-col items-center justify-center gap-4 transition-all relative overflow-hidden group ${videoUrl ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/50'}`}>
                                {videoUrl ? (<><Check className="w-8 h-8 text-indigo-500" /><span className="text-xs font-bold text-zinc-400">Media Loaded</span></>) : (<><div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center"><FileVideo className="w-6 h-6 text-zinc-400" /></div><span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Click to Upload</span></>)}
                                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                            </div>
                        </div>
                        {videoUrl && (
                            <div className="p-5 bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-3xl space-y-4">
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <Sparkles className="w-4 h-4 fill-current"/>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest">AI Master Engine</h3>
                                </div>
                                <button onClick={() => { if (videoInputRef.current?.files?.[0]) handleAutoCaption(videoInputRef.current.files[0]); }} disabled={isSyncing} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                                    {isSyncing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>} {isSyncing ? "Analyzing..." : "Auto-Transcribe Scene"}
                                </button>
                                <p className="text-[10px] text-zinc-600 leading-relaxed text-center italic">Uses Gemini Flash 3 to analyze audio patterns and sync timestamps precisely.</p>
                            </div>
                        )}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">Global Motion</span>
                                <span className="text-[9px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">Per Caption</span>
                            </div>
                            <select 
                                value={config.defaultCaptionAnimation || 'none'} 
                                onChange={(e) => setConfig(prev => ({...prev, defaultCaptionAnimation: e.target.value as CaptionAnimation}))} 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 px-4 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                            >
                                {ANIMATIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Typography</span><select value={config.captionFont || 'Inter'} onChange={(e) => setConfig(prev => ({...prev, captionFont: e.target.value}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-indigo-500">{CAPTION_FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                                <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Graphic Effect</span><select value={config.captionStyle || 'bold'} onChange={(e) => setConfig(prev => ({...prev, captionStyle: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-indigo-500">{CAPTION_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Safe Area</span><select value={config.captionPosition || 'bottom'} onChange={(e) => setConfig(prev => ({...prev, captionPosition: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-indigo-500"><option value="top">Header</option><option value="center">Center</option><option value="bottom">Footer</option></select></div>
                                    <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Scale</span><select value={config.captionSize || 'large'} onChange={(e) => setConfig(prev => ({...prev, captionSize: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-indigo-500"><option value="small">S</option><option value="medium">M</option><option value="large">L</option><option value="xl">XL</option></select></div>
                                </div>
                                <div className="space-y-3"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest block mb-1">Color Theme</span><div className="flex flex-wrap gap-3">{CAPTION_COLORS.map((c) => (<button key={c.name} title={c.value} onClick={() => setConfig(prev => ({...prev, captionColor: c.value}))} className={`w-8 h-8 rounded-full border-2 transition-all transform hover:scale-110 active:scale-90 ${config.captionColor === c.value ? 'border-white scale-110 ring-2 ring-indigo-600' : 'border-zinc-800'} ${c.class} shadow-lg`} />))}</div></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Viewport Workspace */}
        <div className="flex-1 bg-zinc-950 flex flex-col relative group">
            <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-zinc-900/10">
                <div className="relative aspect-[9/16] h-[95%] max-h-[720px] bg-zinc-900 rounded-[40px] border-[12px] border-zinc-900 shadow-2xl overflow-hidden flex flex-col ring-1 ring-zinc-800 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    {videoUrl ? (<video ref={videoPlayerRef} src={videoUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setVideoDuration(videoPlayerRef.current?.duration || 0)} className="absolute inset-0 w-full h-full object-cover" playsInline loop controls />) : (<div className="absolute inset-0 flex items-center justify-center text-zinc-800 flex-col gap-6"><FileVideo className="w-16 h-16 opacity-20" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Source Material</p></div>)}
                    
                    {/* Live Preview Overlay */}
                    <div className={getCaptionContainerClasses()}>
                        <div 
                          key={`${activeSegmentIndex}-${config.captionFont}-${config.captionSize}`} // Keying to force transition resets on style changes
                          className={captionClasses} 
                          style={captionInlineStyle}
                        >
                            {segments.length > 0 ? (segments[activeSegmentIndex]?.text || "") : ""}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Timeline Control */}
            <div className="h-32 border-t border-zinc-800 bg-zinc-950 px-10 py-5 flex flex-col gap-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-zinc-500"/>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Sequence Timeline</span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/30">{videoPlayerRef.current?.currentTime.toFixed(2)}s / {videoDuration.toFixed(2)}s</span>
                </div>
                <div className="flex-1 bg-zinc-900 rounded-2xl relative overflow-hidden border border-zinc-800 shadow-inner">
                    {segments.map((seg, i) => (<div key={seg.id} onClick={() => { setActiveSegmentIndex(i); if (videoPlayerRef.current) videoPlayerRef.current.currentTime = seg.startTime; }} className={`absolute h-full border-r border-black/20 transition-all cursor-pointer ${activeSegmentIndex === i ? 'bg-indigo-600/50 z-10 shadow-[inset_0_0_20px_rgba(0,0,0,0.3)]' : 'bg-indigo-600/10 hover:bg-indigo-600/20'}`} style={{ left: `${(seg.startTime / (videoDuration || 1)) * 100}%`, width: `${((seg.endTime - seg.startTime) / (videoDuration || 1)) * 100}%` }}><span className="absolute top-1 left-2 text-[8px] font-black text-white/40 truncate w-[90%] uppercase">{seg.text}</span></div>))}
                    <div className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 pointer-events-none shadow-[0_0_10px_rgba(239,68,68,0.5)]" style={{ left: `${(videoPlayerRef.current?.currentTime || 0) / (videoDuration || 1) * 100}%` }} />
                </div>
            </div>
        </div>

        {/* Right Sidebar - Segment Registry */}
        <div className="w-80 lg:w-96 border-l border-zinc-800 flex flex-col bg-zinc-950 shadow-2xl z-20">
             <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/80 sticky top-0 z-10">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Segment Registry ({segments.length})</span>
                <button onClick={() => setSegments([...segments, { id: `seg-${Date.now()}`, text: "Add scene content...", startTime: segments.length > 0 ? segments[segments.length-1].endTime : 0, endTime: (segments.length > 0 ? segments[segments.length-1].endTime : 0) + 2, animation: 'fade' }])} className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white shadow-xl shadow-indigo-600/10 transition-all active:scale-95"><Plus className="w-5 h-5"/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar bg-zinc-950">
                {segments.map((seg, i) => (
                    <div key={seg.id} onClick={() => { setActiveSegmentIndex(i); if (videoPlayerRef.current) videoPlayerRef.current.currentTime = seg.startTime; }} className={`p-6 rounded-[32px] border transition-all cursor-pointer group relative ${activeSegmentIndex === i ? 'bg-indigo-600/5 border-indigo-600/40 shadow-xl' : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700'}`}>
                        <div className="flex items-center justify-between mb-5">
                            <span className={`w-7 h-7 flex items-center justify-center rounded-xl text-[10px] font-black shadow-lg ${activeSegmentIndex === i ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{i + 1}</span>
                            <div className="flex items-center gap-2">
                                <MotionIcon className={`w-3 h-3 ${activeSegmentIndex === i ? 'text-indigo-500' : 'text-zinc-700'}`} />
                                <select 
                                    value={seg.animation || 'none'} 
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => setSegments(segments.map(s => s.id === seg.id ? { ...s, animation: e.target.value as CaptionAnimation } : s))}
                                    className="bg-black/40 border border-zinc-800 rounded-xl text-[10px] px-3 py-1.5 text-zinc-400 focus:text-white transition-all outline-none"
                                >
                                    {ANIMATIONS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                                </select>
                            </div>
                        </div>
                        <textarea value={seg.text} onClick={(e) => e.stopPropagation()} onChange={(e) => setSegments(segments.map(s => s.id === seg.id ? { ...s, text: e.target.value } : s))} className={`w-full bg-transparent border-none text-sm focus:outline-none resize-none leading-relaxed transition-colors ${activeSegmentIndex === i ? 'text-white font-bold' : 'text-zinc-500'}`} rows={2} placeholder="Scene narrative..." />
                        
                        <div className="flex items-center justify-between mt-5 pt-5 border-t border-zinc-800/50">
                            <div className="flex gap-4">
                                <div className="flex flex-col gap-1.5"><span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Entry</span><div className="flex items-center gap-1 bg-black/40 p-2 rounded-xl border border-zinc-800"><button onClick={(e) => { e.stopPropagation(); adjustTime(seg.id, 'startTime', -0.1); }} className="hover:text-white transition-colors"><Minus className="w-2.5 h-2.5"/></button><span className="text-[10px] font-mono w-10 text-center text-zinc-400">{seg.startTime.toFixed(1)}</span><button onClick={(e) => { e.stopPropagation(); adjustTime(seg.id, 'startTime', 0.1); }} className="hover:text-white transition-colors"><Plus className="w-2.5 h-2.5"/></button></div></div>
                                <div className="flex flex-col gap-1.5"><span className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">Exit</span><div className="flex items-center gap-1 bg-black/40 p-2 rounded-xl border border-zinc-800"><button onClick={(e) => { e.stopPropagation(); adjustTime(seg.id, 'endTime', -0.1); }} className="hover:text-white transition-colors"><Minus className="w-2.5 h-2.5"/></button><span className="text-[10px] font-mono w-10 text-center text-zinc-400">{seg.endTime.toFixed(1)}</span><button onClick={(e) => { e.stopPropagation(); adjustTime(seg.id, 'endTime', 0.1); }} className="hover:text-white transition-colors"><Plus className="w-2.5 h-2.5"/></button></div></div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setSegments(segments.filter(s => s.id !== seg.id)); }} className="text-zinc-700 hover:text-red-500 transition-colors p-2"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </div>
                ))}
             </div>
        </div>
      </div>
      <style>{`
        .style-outline { -webkit-text-stroke: 2px black; text-shadow: 4px 4px 0px rgba(0,0,0,0.8); }
        .style-neon { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor, 0 0 40px rgba(255,255,255,0.4); }
        .style-3d { text-shadow: 0 1px 0 #ccc, 0 2px 0 #c9c9c9, 0 3px 0 #bbb, 0 4px 0 #b9b9b9, 0 5px 0 #aaa, 0 6px 1px rgba(0,0,0,.3), 0 0 5px rgba(0,0,0,.2); transform: perspective(500px) rotateX(10deg); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #18181b; border-radius: 10px; }

        @keyframes anim-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes anim-pop { 0% { opacity: 0; transform: scale(0.6); } 70% { transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes anim-slide-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes anim-zoom-in { from { opacity: 0; transform: scale(1.1); } to { opacity: 1; transform: scale(1); } }
        @keyframes anim-typewriter { from { width: 0; } to { width: 100%; } }

        .anim-fade { animation: anim-fade 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .anim-pop { animation: anim-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .anim-slide-up { animation: anim-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .anim-zoom-in { animation: anim-zoom-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
        .anim-typewriter { overflow: hidden; white-space: nowrap; animation: anim-typewriter 0.5s steps(40, end); }
      `}</style>
    </div>
  );
};

export default CaptionStudio;
