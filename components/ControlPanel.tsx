
import React, { useEffect, useRef, useState } from 'react';
import { ModelType, AspectRatio, GenerationConfig, GenerationMode, VoiceName, ModelPose, ModelView, ModelMaterial, Bone, BoneConfiguration, AnimationFormat, AnimationQuality, StoryScene, StoryEntity } from '../types';
import { Zap, Layers, Palette, Copy, ImageIcon, Mic, Volume2, Layout, Upload, X, Square, Trash2, Box, Move, Bone as BoneIcon, Film, Settings, Clock, FileVideo, Cube, Hexagon, BookOpen, Plus, Minus, FilmStrip, MessageSquare, Users, MapPin, PenTool, Users as UserIcon, Check, Link, Loader2, Sparkles, Wand2, ChevronRight, ChevronDown } from './Icons';
import { suggestCaption } from '../services/geminiService';

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

  useEffect(() => {
    if (config.mode === GenerationMode.THUMBNAIL) setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.LANDSCAPE_16_9 }));
    else if (config.mode === GenerationMode.LOGO) setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.SQUARE }));
    else if (config.mode === GenerationMode.STORY) setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.LANDSCAPE_16_9 }));
    else if (config.mode === GenerationMode.CAPTIONS) setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.PORTRAIT_9_16 }));
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

  const renderSpeechControls = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
        <button onClick={() => setConfig(prev => ({ ...prev, speechMode: 'text', audioInput: null }))} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${config.speechMode === 'text' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Text to Speech</button>
        <button onClick={() => setConfig(prev => ({ ...prev, speechMode: 'mic' }))} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${config.speechMode === 'mic' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>Voice Clone</button>
      </div>

      {config.speechMode === 'text' ? (
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Script Content</label>
          <textarea value={config.prompt} onChange={handlePromptChange} placeholder="Type what the AI should say..." className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white resize-none focus:border-indigo-500 transition-colors"/>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Input Voice Sample</label>
          <div className="aspect-video bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-3xl flex flex-col items-center justify-center p-6 gap-4">
            {config.audioInput ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center"><Check className="w-6 h-6" /></div>
                <span className="text-xs font-bold text-zinc-400">Audio Captured</span>
                <button onClick={() => setConfig(prev => ({ ...prev, audioInput: null }))} className="text-[10px] text-zinc-600 hover:text-red-400 uppercase font-bold">Clear Sample</button>
              </div>
            ) : (
              <>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-zinc-800 text-zinc-400'}`}><Mic className="w-8 h-8" /></div>
                <div className="text-center space-y-1"><p className="text-xs font-bold text-zinc-300">{isRecording ? `Recording... ${recordingDuration}s` : 'Capture your voice'}</p><p className="text-[10px] text-zinc-600 uppercase">AI will match your tone and pitch</p></div>
                <button onClick={isRecording ? stopRecording : startRecording} className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${isRecording ? 'bg-zinc-100 text-black hover:bg-white' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-500/10'}`}>{isRecording ? 'Stop Recording' : 'Start Recording'}</button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Speaker Voice</label>
        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {VOICES.map((v) => (
            <button key={v.id} onClick={() => setConfig(prev => ({ ...prev, voice: v.id }))} className={`p-3 rounded-2xl border text-left transition-all ${config.voice === v.id ? 'bg-indigo-600/10 border-indigo-600' : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'}`}>
              <div className="flex flex-col"><span className={`text-xs font-black ${config.voice === v.id ? 'text-white' : 'text-zinc-300'}`}>{v.name}</span><span className="text-[9px] text-zinc-600 font-bold uppercase">{v.gender}</span></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

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
      <div className="space-y-2">
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center justify-between">Description <span className="text-zinc-700">{config.prompt.length}/30000</span></label>
        <textarea value={config.prompt} onChange={handlePromptChange} placeholder="Describe your vision in detail..." className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white resize-none focus:border-indigo-500 transition-colors" maxLength={30000} />
      </div>

      {(config.mode === GenerationMode.THUMBNAIL || config.mode === GenerationMode.IMAGE) && (
        <div className="space-y-4 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl">
          <div className="flex justify-between items-center"><label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2"><MessageSquare className="w-3 h-3"/> Caption Overlay</label><button onClick={handleSuggestCaption} disabled={isSuggestingCaption || !config.prompt} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${isSuggestingCaption || !config.prompt ? 'text-zinc-700 bg-zinc-900/50' : 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'}`}>{isSuggestingCaption ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />} AI Suggest</button></div>
          <input type="text" value={config.thumbnailTitle || ''} onChange={(e) => setConfig(prev => ({...prev, thumbnailTitle: e.target.value}))} placeholder="Catchy headline text..." className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white focus:border-indigo-500 outline-none" />
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
    <div className="w-full lg:w-96 flex-shrink-0 flex flex-col p-0 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-950/40 shadow-2xl z-30">
      <div className="flex border-b border-zinc-800 overflow-x-auto custom-scrollbar bg-zinc-950/80 sticky top-0 z-10 backdrop-blur-md">
        <button onClick={() => setMode(GenerationMode.IMAGE)} className={`flex-1 min-w-[70px] py-4 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1.5 transition-all relative ${config.mode === GenerationMode.IMAGE ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
          <ImageIcon className="w-4 h-4" /> Image
          {config.mode === GenerationMode.IMAGE && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full"></div>}
        </button>
        <button onClick={() => setMode(GenerationMode.STORY)} className={`flex-1 min-w-[70px] py-4 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1.5 transition-all relative ${config.mode === GenerationMode.STORY ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
          <BookOpen className="w-4 h-4" /> Story
          {config.mode === GenerationMode.STORY && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full"></div>}
        </button>
        <button onClick={() => setMode(GenerationMode.ANIMATOR)} className={`flex-1 min-w-[70px] py-4 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1.5 transition-all relative ${config.mode === GenerationMode.ANIMATOR ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
          <FilmStrip className="w-4 h-4" /> Animator
          {config.mode === GenerationMode.ANIMATOR && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full"></div>}
        </button>
        <button onClick={() => setMode(GenerationMode.CAPTIONS)} className={`flex-1 min-w-[70px] py-4 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1.5 transition-all relative ${config.mode === GenerationMode.CAPTIONS ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
          <MessageSquare className="w-4 h-4" /> Studio
          {config.mode === GenerationMode.CAPTIONS && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full"></div>}
        </button>
        <button onClick={() => setMode(GenerationMode.AUDIO)} className={`flex-1 min-w-[70px] py-4 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1.5 transition-all relative ${config.mode === GenerationMode.AUDIO ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
          <Mic className="w-4 h-4" /> Speech
          {config.mode === GenerationMode.AUDIO && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full"></div>}
        </button>
        <button onClick={() => setMode(GenerationMode.LOGO)} className={`flex-1 min-w-[70px] py-4 text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1.5 transition-all relative ${config.mode === GenerationMode.LOGO ? 'text-white' : 'text-zinc-600 hover:text-zinc-400'}`}>
          <Hexagon className="w-4 h-4" /> Logo
          {config.mode === GenerationMode.LOGO && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-500 rounded-full"></div>}
        </button>
      </div>

      <div className="flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar flex-1 bg-zinc-950/20">
        {config.mode === GenerationMode.STORY ? renderStoryControls() : config.mode === GenerationMode.AUDIO ? renderSpeechControls() : (config.mode === GenerationMode.IMAGE || config.mode === GenerationMode.LOGO || config.mode === GenerationMode.THUMBNAIL) ? renderImageControls() : <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50"><Box className="w-12 h-12 text-zinc-700"/><p className="text-[10px] font-black uppercase tracking-widest">Workspace Active</p></div>}
      </div>

      <div className="p-6 bg-zinc-950 border-t border-zinc-800">
        <button onClick={onGenerate} disabled={isLoading || (config.mode !== GenerationMode.CAPTIONS && config.mode !== GenerationMode.ANIMATOR && config.mode !== GenerationMode.STORY && !config.prompt.trim() && !config.audioInput)} className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 transition-all transform active:scale-95 ${isLoading ? 'bg-zinc-800 text-zinc-600' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/20'}`}>
          {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Synthesizing</> : <>{config.mode === GenerationMode.STORY ? 'Enter Story Studio' : config.mode === GenerationMode.CAPTIONS ? 'Enter Studio' : config.mode === GenerationMode.ANIMATOR ? 'Enter Animator' : 'Generate Asset'}<Zap className="w-4 h-4 fill-current" /></>}
        </button>
        <p className="text-[9px] text-zinc-700 mt-4 text-center font-bold uppercase tracking-widest">Powered by LuminaGen Master Engine</p>
      </div>
    </div>
  );
};

export default ControlPanel;
