import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GenerationConfig, CaptionSegment, ModelType, GenerationMode, CaptionAnimation, AspectRatio } from '../types';
import { 
  Upload, X, Mic, FileVideo, Check, Play, Pause, Download, 
  Sparkles, Loader2, MessageSquare, Volume2, Settings, Palette, 
  Trash2, Plus, Zap, ChevronRight, Layout, ImageIcon, Clock, Minus,
  TypeIcon, Wand2
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
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setConfig(prev => ({ ...prev, captionSegments: segments, captionScript: script }));
  }, [segments, script, setConfig]);

  const getSupportedMimeType = () => {
    const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4;codecs=h264', 'video/mp4'];
    for (const type of types) if (MediaRecorder.isTypeSupported(type)) return type;
    return 'video/webm';
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
              { text: "Analyze this audio. Transcribe speech into segments. Format: JSON array of {'text', 'startTime', 'endTime'}." } 
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
      
      let rawText = response.text || "[]";
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
      alert("Failed to auto-caption.");
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

  const formatSRTTime = (seconds: number) => {
    const date = new Date(0);
    date.setSeconds(Math.floor(seconds));
    const hh = date.getUTCHours().toString().padStart(2, '0');
    const mm = date.getUTCMinutes().toString().padStart(2, '0');
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
    return `${hh}:${mm}:${ss},${ms}`;
  };

  const handleDownloadSRT = (e: React.MouseEvent) => {
    e.preventDefault();
    if (segments.length === 0) return;

    const srtContent = segments.map((seg, i) => {
      const index = i + 1;
      const start = formatSRTTime(seg.startTime);
      const end = formatSRTTime(seg.endTime);
      return `${index}\n${start} --> ${end}\n${seg.text}\n`;
    }).join('\n');

    const blob = new Blob([srtContent], { type: 'text/srt' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `lumina-captions-${Date.now()}.srt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
  };

  const handleExportVideo = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!videoPlayerRef.current || !videoUrl || isExporting) return;
    
    setIsExporting(true);
    setExportProgress(0);
    
    const video = videoPlayerRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const mimeType = getSupportedMimeType();
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    
    recorder.ondataavailable = (ev) => { if (ev.data.size > 0) chunks.push(ev.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lumina-export-${Date.now()}.webm`;
      a.click();
      setIsExporting(false);
    };

    video.currentTime = 0;
    recorder.start();
    video.play();

    const drawLoop = () => {
      if (!isExporting || video.ended) {
        if (recorder.state === 'recording') recorder.stop();
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const currentTime = video.currentTime;
      const currentSeg = segments.find(s => currentTime >= s.startTime && currentTime <= s.endTime);
      if (currentSeg) {
        renderCaptionsToCanvas(ctx, currentSeg, currentTime, canvas.width, canvas.height);
      }
      setExportProgress((currentTime / video.duration) * 100);
      requestAnimationFrame(drawLoop);
    };
    drawLoop();
  };

  const renderCaptionsToCanvas = (ctx: CanvasRenderingContext2D, segment: CaptionSegment, currentTime: number, canvasWidth: number, canvasHeight: number) => {
    const text = segment.text;
    const font = config.captionFont || 'Inter';
    const color = CAPTION_COLORS.find(c => c.value === (config.captionColor || 'Pure White'))?.hex || '#ffffff';
    const size = config.captionSize === 'small' ? 24 : config.captionSize === 'medium' ? 36 : config.captionSize === 'xl' ? 64 : 48;
    const pos = config.captionPosition || 'bottom';
    
    ctx.font = `bold ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    
    const x = canvasWidth / 2;
    let y = canvasHeight * 0.8;
    if (pos === 'top') y = canvasHeight * 0.2;
    if (pos === 'center') y = canvasHeight * 0.5;

    ctx.fillText(text, x, y);
  };

  const handleClearAll = () => {
    if (confirm("Clear all caption segments?")) {
      setSegments([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-300 overflow-hidden relative">
      <div className="h-16 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-xl shadow-indigo-500/10"><MessageSquare className="w-5 h-5" /></div>
            <div>
                <h1 className="font-bold text-sm lg:text-base text-white">Master <span className="text-indigo-500">Studio</span></h1>
                <p className="text-[10px] text-zinc-600 uppercase font-black tracking-widest">{statusMessage || "Studio Active"}</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <button onClick={handleDownloadSRT} disabled={segments.length === 0} className="px-4 py-2 text-[10px] font-black uppercase text-zinc-300 hover:text-white transition-colors bg-zinc-800 rounded-xl border border-zinc-700 disabled:opacity-50">Download SRT</button>
            <button onClick={onExit} className="px-4 py-2 text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors bg-zinc-900 rounded-xl border border-zinc-800">Exit</button>
            <button onClick={handleExportVideo} disabled={!videoUrl || isExporting} className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl disabled:bg-zinc-800 disabled:text-zinc-600">
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Export
            </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 lg:w-96 border-r border-zinc-800 flex flex-col bg-zinc-950/40">
            <div className="flex border-b border-zinc-800">
                <button onClick={() => setActiveTab('setup')} className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'setup' ? 'text-white border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}><Settings className="w-3 h-3"/> Setup</button>
                <button onClick={() => setActiveTab('style')} className={`flex-1 py-4 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'style' ? 'text-white border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-zinc-500 hover:text-zinc-300'}`}><Palette className="w-3 h-3"/> Styling</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {activeTab === 'setup' ? (
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Base Asset</label>
                            <div onClick={() => videoInputRef.current?.click()} className={`aspect-video border-2 border-dashed rounded-3xl cursor-pointer flex flex-col items-center justify-center gap-4 transition-all relative overflow-hidden group ${videoUrl ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/50'}`}>
                                {videoUrl ? (<><Check className="w-8 h-8 text-indigo-500" /><span className="text-xs font-bold text-zinc-400">Source Ready</span></>) : (<><FileVideo className="w-10 h-10 text-zinc-700" /><span className="text-[10px] font-black uppercase text-zinc-600">Click to Upload</span></>)}
                                <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoUpload} />
                            </div>
                        </div>
                        {videoUrl && (
                          <div className="space-y-3">
                            <button onClick={() => { if (videoInputRef.current?.files?.[0]) handleAutoCaption(videoInputRef.current.files[0]); }} disabled={isSyncing} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 disabled:bg-zinc-800">
                                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>} {isSyncing ? "Analyzing..." : "Auto AI Transcribe"}
                            </button>
                            {/* Extra Button Request: Clear All Segments */}
                            <button onClick={handleClearAll} className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 border border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
                                <Trash2 className="w-4 h-4"/> Clear All Segments
                            </button>
                          </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Font Family</span><select value={config.captionFont || 'Inter'} onChange={(e) => setConfig(prev => ({...prev, captionFont: e.target.value}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-indigo-500">{CAPTION_FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div>
                            <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Graphics Style</span><select value={config.captionStyle || 'bold'} onChange={(e) => setConfig(prev => ({...prev, captionStyle: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-indigo-500">{CAPTION_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Safe Zone</span><select value={config.captionPosition || 'bottom'} onChange={(e) => setConfig(prev => ({...prev, captionPosition: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-indigo-500"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></select></div>
                                <div className="space-y-1.5"><span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Scale</span><select value={config.captionSize || 'large'} onChange={(e) => setConfig(prev => ({...prev, captionSize: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-indigo-500"><option value="small">S</option><option value="medium">M</option><option value="large">L</option><option value="xl">XL</option></select></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>

        <div className="flex-1 bg-zinc-950 flex flex-col relative">
            <div className="flex-1 flex items-center justify-center p-6 lg:p-10 bg-zinc-900/10">
                <div className="relative aspect-[9/16] h-[95%] max-h-[720px] bg-zinc-900 rounded-[40px] border-[10px] border-zinc-900 shadow-2xl overflow-hidden flex flex-col ring-1 ring-zinc-800">
                    {videoUrl ? (<video ref={videoPlayerRef} src={videoUrl} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setVideoDuration(videoPlayerRef.current?.duration || 0)} className="absolute inset-0 w-full h-full object-cover" playsInline loop controls />) : (<div className="absolute inset-0 flex items-center justify-center text-zinc-800 flex-col gap-4"><FileVideo className="w-12 h-12 opacity-10" /><p className="text-[10px] font-black uppercase tracking-[0.3em]">Awaiting Source</p></div>)}
                    <div className={`absolute inset-0 flex justify-center pointer-events-none z-10 ${config.captionPosition === 'top' ? 'items-start pt-16' : config.captionPosition === 'center' ? 'items-center' : 'items-end pb-16'}`}>
                        {segments[activeSegmentIndex] && (
                          <div className="text-center px-6 max-w-[90%]" style={{ 
                            fontFamily: config.captionFont, 
                            color: CAPTION_COLORS.find(c => c.value === (config.captionColor || 'Pure White'))?.hex || '#ffffff',
                            fontSize: config.captionSize === 'small' ? '1.5rem' : config.captionSize === 'medium' ? '2rem' : config.captionSize === 'xl' ? '4rem' : '3rem',
                            fontWeight: '900',
                            textShadow: config.captionStyle === 'outline' ? '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000' : 'none'
                          }}>
                            {segments[activeSegmentIndex].text}
                          </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        <div className="w-80 lg:w-96 border-l border-zinc-800 flex flex-col bg-zinc-950">
             <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Segments ({segments.length})</span>
                <button onClick={() => setSegments([...segments, { id: `seg-${Date.now()}`, text: "New segment", startTime: segments.length > 0 ? segments[segments.length-1].endTime : 0, endTime: (segments.length > 0 ? segments[segments.length-1].endTime : 0) + 2, animation: 'fade' }])} className="w-8 h-8 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white transition-all"><Plus className="w-4 h-4"/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {segments.map((seg, i) => (
                    <div key={seg.id} onClick={() => { setActiveSegmentIndex(i); if (videoPlayerRef.current) videoPlayerRef.current.currentTime = seg.startTime; }} className={`p-4 rounded-3xl border transition-all cursor-pointer ${activeSegmentIndex === i ? 'bg-indigo-600/5 border-indigo-600/40' : 'bg-zinc-900/40 border-zinc-800/50 hover:border-zinc-700'}`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className={`w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-black ${activeSegmentIndex === i ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>{i + 1}</span>
                            <button onClick={(e) => { e.stopPropagation(); setSegments(segments.filter(s => s.id !== seg.id)); }} className="text-zinc-700 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                        </div>
                        <textarea value={seg.text} onClick={(e) => e.stopPropagation()} onChange={(e) => setSegments(segments.map(s => s.id === seg.id ? { ...s, text: e.target.value } : s))} className={`w-full bg-transparent border-none text-xs font-bold focus:outline-none resize-none leading-relaxed ${activeSegmentIndex === i ? 'text-white' : 'text-zinc-500'}`} rows={2} />
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-1 flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); adjustTime(seg.id, 'startTime', -0.1); }}><Minus className="w-3 h-3"/></button>
                            <span className="text-[9px] font-mono flex-1 text-center">{seg.startTime.toFixed(1)}s</span>
                            <button onClick={(e) => { e.stopPropagation(); adjustTime(seg.id, 'startTime', 0.1); }}><Plus className="w-3 h-3"/></button>
                          </div>
                          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded p-1 flex items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); adjustTime(seg.id, 'endTime', -0.1); }}><Minus className="w-3 h-3"/></button>
                            <span className="text-[9px] font-mono flex-1 text-center">{seg.endTime.toFixed(1)}s</span>
                            <button onClick={(e) => { e.stopPropagation(); adjustTime(seg.id, 'endTime', 0.1); }}><Plus className="w-3 h-3"/></button>
                          </div>
                        </div>
                    </div>
                ))}
             </div>
        </div>
      </div>
    </div>
  );
};

export default CaptionStudio;