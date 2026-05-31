
import React, { useEffect, useRef, useState } from 'react';
import { ModelType, AspectRatio, GenerationConfig, GenerationMode, VoiceName, ModelPose, ModelView, ModelMaterial, Bone, BoneConfiguration, AnimationFormat, AnimationQuality, StoryScene, StoryEntity, ThumbnailNiche } from '../types';
import { Zap, Layers, Palette, Copy, ImageIcon, Mic, Volume2, Layout, Upload, X, Square, Trash2, Box, Move, Bone as BoneIcon, Film, Settings, Clock, FileVideo, Cube, Hexagon, BookOpen, Plus, Minus, FilmStrip, MessageSquare, Users, MapPin, PenTool, Users as UserIcon, Check, Link, Loader2, Sparkles, Wand2, ChevronRight, ChevronDown, TypeIcon, Film as MovieIcon, Gamepad2, Heart, Monitor, Book } from './Icons';
import { suggestCaption, enhancePrompt } from '../services/geminiService';

interface ControlPanelProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  isLoading: boolean;
  onGenerate: () => void;
}

const STYLES = [
  { id: 'photorealistic', name: 'Realistic', prompt: 'photorealistic, 8k, highly detailed, realistic textures, photography, sharp focus' },
  { id: 'cinematic', name: 'Cinematic', prompt: 'cinematic lighting, movie scene, dramatic, color graded, shallow depth of field, blockbuster' },
  { id: 'anime', name: 'Anime', prompt: 'anime style, vibrant, studio ghibli style, detailed line art, cel shaded' },
  { id: 'digital-art', name: 'Digital Art', prompt: 'digital art, concept art, trending on artstation, illustrative, creative' },
  { id: 'oil-painting', name: 'Oil Painting', prompt: 'oil painting, textured brushstrokes, classical, masterpiece, traditional art' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'cyberpunk, neon, futuristic, synthwave, high contrast, dark atmosphere' },
  { id: 'pixel-art', name: 'Pixel Art', prompt: 'pixel art, 16-bit, retro game style, dithering, low res' },
  { id: 'story-anime', name: 'Plain Anime', prompt: 'masterpiece, minimalist storytelling aesthetic, flat pure white background, clean hand-drawn anime art with vibrant character colors, emotional character on left side, large hand-written style bold text on right side, high contrast, comic book style, no shadows, no gradients, clean composition' },
];

const CAPTION_FONTS = [
  { id: 'Inter', name: 'Inter (Sans)' },
  { id: 'Roboto', name: 'Roboto' },
  { id: 'Open Sans', name: 'Open Sans' },
  { id: 'Montserrat', name: 'Montserrat' },
  { id: 'Lato', name: 'Lato' },
  { id: 'Caveat', name: 'Caveat (Handwritten)' },
];

const CAPTION_STYLES = [
  { id: 'bold', name: 'Impact Bold' },
  { id: 'outline', name: 'Shadow Outline' },
  { id: 'neon', name: 'Neon Glow' },
  { id: '3d', name: '3D Extruded' },
  { id: 'minimalist', name: 'Modern Clean' },
];

const PLATFORMS = [
  { id: 'youtube', name: 'YouTube', ratio: AspectRatio.LANDSCAPE_16_9 },
  { id: 'tiktok', name: 'TikTok/Shorts', ratio: AspectRatio.PORTRAIT_9_16 },
  { id: 'instagram', name: 'Instagram', ratio: AspectRatio.SQUARE },
  { id: 'linkedin', name: 'LinkedIn', ratio: AspectRatio.LANDSCAPE_16_9 },
];

const NICHES = [
  { id: ThumbnailNiche.TUTORIAL, name: 'Tutorial', icon: PenTool, subNiches: ['YouTube Strategy', 'Faceless Channel', 'AI Tools', 'Animation Guide', 'Video Editing', 'Coding'] },
  { id: ThumbnailNiche.MOVIE, name: 'Movie', icon: MovieIcon, subNiches: ['Action/Thriller', 'Horror/Suspense', 'Documentary', 'Animation', 'Sci-Fi'] },
  { id: ThumbnailNiche.GAMING, name: 'Gaming', icon: Gamepad2, subNiches: ["Let's Play", 'Review', 'Esports', 'Mobile Gaming', 'Walkthrough'] },
  { id: ThumbnailNiche.LIFESTYLE, name: 'Lifestyle', icon: Heart, subNiches: ['Vlog', 'Travel', 'Fashion', 'Minimalist', 'Productivity'] },
  { id: ThumbnailNiche.TECH, name: 'Tech', icon: Monitor, subNiches: ['Unboxing', 'Review', 'News', 'Setup Tour', 'Comparison'] },
  { id: ThumbnailNiche.STORYTELLING, name: 'Story', icon: Book, subNiches: ['Dark Anime Story', 'True Crime', 'Mystery', 'History', 'Motivation', 'Creepypasta'] },
];

const RATIOS = [
  { id: AspectRatio.LANDSCAPE_16_9, label: '16:9' },
  { id: AspectRatio.PORTRAIT_9_16, label: '9:16' },
  { id: AspectRatio.SQUARE, label: '1:1' },
  { id: AspectRatio.PHOTO_4_3, label: '4:3' },
  { id: AspectRatio.PHOTO_3_4, label: '3:4' },
];

const VOICES: { id: VoiceName; name: string; gender: string }[] = [
  { id: 'puck', name: 'Puck', gender: 'Male (Deep)' },
  { id: 'charon', name: 'Charon', gender: 'Male (Bold)' },
  { id: 'kore', name: 'Kore', gender: 'Female (Soft)' },
  { id: 'fenrir', name: 'Fenrir', gender: 'Male (Intense)' },
  { id: 'zephyr', name: 'Zephyr', gender: 'Female (Clear)' },
  { id: 'aoede', name: 'Aoede', gender: 'Female (Confident)' },
  { id: 'leda', name: 'Leda', gender: 'Female (Calm)' },
  { id: 'orus', name: 'Orus', gender: 'Male (Narrative)' },
];

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, isLoading, onGenerate }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [isSuggestingCaption, setIsSuggestingCaption] = useState(false);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);

  const handleEnhancePrompt = async () => {
    if (!config.prompt.trim()) return;
    setIsEnhancingPrompt(true);
    try {
      const enhanced = await enhancePrompt(config.prompt);
      setConfig(prev => ({ ...prev, prompt: enhanced }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  useEffect(() => {
    if (config.mode === GenerationMode.THUMBNAIL) {
      if (!config.thumbnailPlatform) setConfig(prev => ({ ...prev, thumbnailPlatform: 'youtube', aspectRatio: AspectRatio.LANDSCAPE_16_9 }));
      if (!config.thumbnailLayout) setConfig(prev => ({ ...prev, thumbnailLayout: 'standard' }));
      if (!config.niche) setConfig(prev => ({ ...prev, niche: ThumbnailNiche.TUTORIAL, subNiche: 'Software Guide' }));
    } else if (config.mode === GenerationMode.LOGO) setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.SQUARE }));
    else if (config.mode === GenerationMode.STORY) setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.LANDSCAPE_16_9 }));
    else if (config.mode === GenerationMode.CAPTIONS) setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.PORTRAIT_9_16 }));
    
    if (!config.count) setConfig(prev => ({ ...prev, count: 1 }));
  }, [config.mode, setConfig]);

  const handleSuggestCaption = async () => {
    if (!config.prompt) return;
    setIsSuggestingCaption(true);
    try {
      const suggestion = await suggestCaption(config.prompt);
      setConfig(prev => ({ ...prev, thumbnailTitle: suggestion }));
    } finally {
      setIsSuggestingCaption(false);
    }
  };

  const handlePlatformChange = (platform: any) => {
    setConfig(prev => ({ ...prev, thumbnailPlatform: platform.id, aspectRatio: platform.ratio }));
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setConfig(prev => ({ ...prev, prompt: e.target.value })); };
  
  const toggleStyle = (stylePrompt: string) => {
    setConfig(prev => {
      const currentStyles = prev.stylePrompts || [];
      const isSelected = currentStyles.includes(stylePrompt);
      let newStyles = isSelected ? currentStyles.filter(s => s !== stylePrompt) : (currentStyles.length >= 3 ? [...currentStyles.slice(1), stylePrompt] : [...currentStyles, stylePrompt]);
      return { ...prev, stylePrompts: newStyles };
    });
  };

  const setMode = (mode: GenerationMode) => setConfig(prev => ({ ...prev, mode, isRigging: false }));

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => { setConfig(prev => ({ ...prev, audioInput: reader.result as string })); };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        setRecordingDuration(0);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      timerRef.current = window.setInterval(() => { setRecordingDuration(prev => prev + 1); }, 1000);
    } catch (err) { alert("Could not access microphone."); }
  };

  const stopRecording = () => { if (mediaRecorder && isRecording) { mediaRecorder.stop(); setIsRecording(false); } };

  const renderStoryControls = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 mb-4 border border-indigo-500/20">
         <BookOpen className="w-8 h-8" />
      </div>
      <h3 className="text-sm font-black uppercase tracking-widest text-white">Story Mode</h3>
      <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest leading-relaxed max-w-[220px]">Enter the Story Studio to manage characters, environments, and consistent art styles across your scenes.</p>
    </div>
  );

  const renderImageControls = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {config.mode !== GenerationMode.THUMBNAIL && (
        <div className="space-y-4">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Zap className="w-3 h-3" /> Engine Selection
          </label>
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setConfig(prev => ({ ...prev, model: ModelType.FLASH_IMAGE }))} 
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${config.model === ModelType.FLASH_IMAGE ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              Flash 2.5
            </button>
            <button 
              onClick={() => setConfig(prev => ({ ...prev, model: ModelType.IMAGEN }))} 
              className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${config.model === ModelType.IMAGEN ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
            >
              Imagen 4
            </button>
          </div>
        </div>
      )}

      {config.mode === GenerationMode.THUMBNAIL && (
        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">Niche Selection</label>
            <div className="grid grid-cols-3 gap-2">
              {NICHES.map(n => (
                <button 
                  key={n.id} 
                  onClick={() => setConfig(prev => ({ ...prev, niche: n.id, subNiche: n.subNiches[0] }))}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${config.niche === n.id ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <n.icon className={`w-4 h-4 ${config.niche === n.id ? 'text-white' : 'text-zinc-500'}`} />
                  <span className={`text-[8px] font-black uppercase ${config.niche === n.id ? 'text-white' : 'text-zinc-400'}`}>{n.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">Sub-Niche Style</label>
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto custom-scrollbar no-scrollbar">
              {NICHES.find(n => n.id === config.niche)?.subNiches.map(sub => (
                <button 
                  key={sub} 
                  onClick={() => setConfig(prev => ({ ...prev, subNiche: sub }))}
                  className={`whitespace-nowrap px-4 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${config.subNiche === sub ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">Platform Context</label>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => handlePlatformChange(p)}
                  className={`p-3 rounded-xl border text-left transition-all ${config.thumbnailPlatform === p.id ? 'bg-indigo-600 border-indigo-500' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase ${config.thumbnailPlatform === p.id ? 'text-white' : 'text-zinc-400'}`}>{p.name}</span>
                    <span className="text-[8px] text-zinc-600 font-bold">{p.ratio}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">Layout Dynamics</label>
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button 
                onClick={() => setConfig(prev => ({ ...prev, thumbnailLayout: 'standard' }))} 
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${config.thumbnailLayout === 'standard' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                Standard
              </button>
              <button 
                onClick={() => setConfig(prev => ({ ...prev, thumbnailLayout: 'before-after' }))} 
                className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${config.thumbnailLayout === 'before-after' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-600 hover:text-zinc-400'}`}
              >
                Before & After
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">Aspect Ratio</label>
        <div className="grid grid-cols-5 gap-1.5">
          {RATIOS.map(r => (
            <button 
              key={r.id}
              onClick={() => setConfig(prev => ({ ...prev, aspectRatio: r.id }))}
              className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl border transition-all ${config.aspectRatio === r.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400'}`}
            >
              <div className={`border-2 rounded-sm ${config.aspectRatio === r.id ? 'border-white' : 'border-zinc-700'}`} style={{ 
                width: r.id === AspectRatio.LANDSCAPE_16_9 ? '14px' : r.id === AspectRatio.PORTRAIT_9_16 ? '8px' : r.id === AspectRatio.SQUARE ? '11px' : r.id === AspectRatio.PHOTO_4_3 ? '13px' : '9px',
                height: r.id === AspectRatio.LANDSCAPE_16_9 ? '8px' : r.id === AspectRatio.PORTRAIT_9_16 ? '14px' : r.id === AspectRatio.SQUARE ? '11px' : r.id === AspectRatio.PHOTO_4_3 ? '10px' : '12px'
              }} />
              <span className="text-[8px] font-black uppercase tracking-tighter">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {config.referenceImage && (
          <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon className="w-3 h-3" /> Editing Reference
              </label>
              <button 
                onClick={() => setConfig(prev => ({ ...prev, referenceImage: null }))}
                className="text-[10px] text-zinc-600 hover:text-red-400 font-black uppercase tracking-widest"
              >
                Clear
              </button>
            </div>
            <div className="relative group aspect-square rounded-2xl overflow-hidden border border-indigo-500/30 bg-zinc-900">
              <img src={config.referenceImage} className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="text-[9px] font-black text-white uppercase tracking-widest">Base Reference Active</span>
              </div>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            Description <span className="text-zinc-700 font-bold">({config.prompt.length}/30000)</span>
          </label>
          <button
            type="button"
            disabled={isEnhancingPrompt || !config.prompt.trim()}
            onClick={handleEnhancePrompt}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
              isEnhancingPrompt 
                ? 'bg-zinc-900 border-zinc-800 text-zinc-500 animate-pulse' 
                : !config.prompt.trim()
                ? 'bg-transparent border-transparent text-zinc-700 cursor-not-allowed'
                : 'bg-indigo-600/10 border-indigo-500/25 text-indigo-400 hover:bg-indigo-600/20 hover:border-indigo-500/40 shadow-sm'
            }`}
            title="Expand prompt with AI generator instructions"
          >
            {isEnhancingPrompt ? (
              <>
                <Loader2 className="w-2.5 h-2.5 animate-spin text-indigo-400" />
                Enhancing
              </>
            ) : (
              <>
                <Wand2 className="w-2.5 h-2.5" />
                AI Enhance
              </>
            )}
          </button>
        </div>
        <textarea value={config.prompt} onChange={handlePromptChange} placeholder="Describe your vision in detail..." className="w-full h-32 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-2xl p-4 text-sm text-white resize-none outline-none transition-colors placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500/20 font-medium" maxLength={30000} />
      </div>

      {config.mode === GenerationMode.THUMBNAIL && (
        <div className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-3xl space-y-6">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare className="w-3 h-3"/> Caption Overlay</label>
            <button onClick={handleSuggestCaption} disabled={isSuggestingCaption || !config.prompt} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isSuggestingCaption || !config.prompt ? 'text-zinc-700 bg-zinc-900/50' : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'}`}>
              {isSuggestingCaption ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Suggest
            </button>
          </div>
          <input type="text" value={config.thumbnailTitle || ''} onChange={(e) => setConfig(prev => ({...prev, thumbnailTitle: e.target.value}))} placeholder="Headline text..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none" />
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Font</span>
              <select value={config.captionFont || 'Inter'} onChange={(e) => setConfig(prev => ({...prev, captionFont: e.target.value}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] text-white outline-none focus:border-indigo-500">
                {CAPTION_FONTS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Style</span>
              <select value={config.captionStyle || 'bold'} onChange={(e) => setConfig(prev => ({...prev, captionStyle: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] text-white outline-none focus:border-indigo-500">
                {CAPTION_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Area</span>
              <select value={config.captionPosition || 'bottom'} onChange={(e) => setConfig(prev => ({...prev, captionPosition: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] text-white outline-none focus:border-indigo-500">
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Scale</span>
              <select value={config.captionSize || 'large'} onChange={(e) => setConfig(prev => ({...prev, captionSize: e.target.value as any}))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 px-3 text-[10px] text-white outline-none focus:border-indigo-500">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="xl">XL</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {(config.mode === GenerationMode.THUMBNAIL || config.mode === GenerationMode.IMAGE) && (
        <div className="space-y-3">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Layers className="w-3 h-3" /> Asset Count</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map(num => (
              <button 
                key={num} 
                onClick={() => setConfig(prev => ({ ...prev, count: num }))}
                className={`flex-1 py-2 text-[10px] font-black rounded-lg border transition-all ${config.count === num ? 'bg-indigo-600 border-white text-white shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-zinc-400'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Palette className="w-3 h-3" /> Style Mixer</label>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((style) => (
            <button key={style.id} onClick={() => toggleStyle(style.prompt)} className={`px-3 py-3 text-[10px] font-bold uppercase tracking-tight rounded-xl border transition-all text-left flex items-center justify-between ${config.stylePrompts?.includes(style.prompt) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
              <span>{style.name}</span>
              {config.stylePrompts?.includes(style.prompt) && <Check className="w-3 h-3" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full lg:w-96 flex-shrink-0 flex flex-col p-0 border-b lg:border-b-0 lg:border-l border-zinc-800 bg-[#090b0e] shadow-2xl z-20">
      <div className="flex items-center justify-between px-6 py-5 border-b border-[#161920] bg-zinc-950/90 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Settings className="w-4 h-4 text-indigo-400 stroke-[2.5px] animate-spin-slow" />
          <span className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-100">
            {config.mode === GenerationMode.IMAGE && 'Image Workspace'}
            {config.mode === GenerationMode.THUMBNAIL && 'Thumbnail Setup'}
            {config.mode === GenerationMode.LOGO && 'Logo Parameters'}
            {config.mode === GenerationMode.STORY && 'Story Parameters'}
            {config.mode === GenerationMode.CAPTIONS && 'Caption Settings'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
          <span className="text-[8px] font-bold uppercase text-zinc-500 tracking-wider">Active</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950/20">
        {config.mode === GenerationMode.STORY ? renderStoryControls() : (config.mode === GenerationMode.IMAGE || config.mode === GenerationMode.LOGO || config.mode === GenerationMode.THUMBNAIL) ? renderImageControls() : <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50"><Box className="w-12 h-12 text-zinc-700"/><p className="text-[10px] font-black uppercase tracking-widest">Workspace Active</p></div>}
      </div>

      <div className="p-6 bg-zinc-950 border-t border-zinc-800">
        <button 
          onClick={onGenerate} 
          disabled={isLoading || (config.mode !== GenerationMode.CAPTIONS && config.mode !== GenerationMode.STORY && !config.prompt.trim() && !config.audioInput)} 
          className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all duration-300 transform active:scale-95 ${
            isLoading 
              ? 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed shadow-none' 
              : 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500 shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.4)] border border-indigo-400/20'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white/55" /> 
              <span>Synthesizing...</span>
            </>
          ) : (
            <>
              <span>
                {config.mode === GenerationMode.STORY 
                  ? 'Enter Story Studio' 
                  : config.mode === GenerationMode.CAPTIONS 
                  ? 'Enter Studio' 
                  : 'Generate Asset'}
              </span>
              <Zap className="w-3.5 h-3.5 fill-current text-white/90" />
            </>
          )}
        </button>
        <p className="text-[9px] text-zinc-700 mt-4 text-center font-bold uppercase tracking-widest">Powered by LuminaGen Master Engine</p>
      </div>
    </div>
  );
};

export default ControlPanel;
