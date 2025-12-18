
import React, { useState, useEffect, useRef } from 'react';
import { GenerationConfig, StoryEntity, GeneratedContent, AspectRatio, ModelType, Bone, BoneConfiguration, ModelPose, ModelView } from '../types';
import { 
  Plus, X, Layout, Users, MapPin, PenTool, Download, 
  ImageIcon, ChevronRight, Sparkles, Settings, Loader2, Rotate3D, Trash2, Check, Upload, Minus, Bone as BoneIcon, Wand2, Layers, Palette, Eye, Move
} from './Icons';
import { generateImage } from '../services/geminiService';

interface StoryStudioProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  onExit: () => void;
}

const BONES: { id: Bone; label: string }[] = [
    { id: 'head', label: 'Head' },
    { id: 'torso', label: 'Torso' },
    { id: 'left-arm', label: 'Left Arm' },
    { id: 'right-arm', label: 'Right Arm' },
    { id: 'left-leg', label: 'Left Leg' },
    { id: 'right-leg', label: 'Right Leg' },
];

const POSES: { id: ModelPose; label: string }[] = [
    { id: 'standing', label: 'Standing' },
    { id: 'walking', label: 'Walking' },
    { id: 'running', label: 'Running' },
    { id: 'action', label: 'Action Pose' },
    { id: 'sitting', label: 'Sitting' },
    { id: 't-pose', label: 'T-Pose' },
];

const VIEWS: { id: ModelView; label: string }[] = [
    { id: 'front', label: 'Front' },
    { id: 'side', label: 'Side Profile' },
    { id: 'back', label: 'Back View' },
    { id: 'isometric', label: 'Isometric' },
    { id: 'top', label: 'Bird\'s Eye' },
];

const STYLES = [
  { id: 'photorealistic', name: 'Realistic', prompt: 'photorealistic, 8k, highly detailed, realistic textures, photography, sharp focus' },
  { id: 'cinematic', name: 'Cinematic', prompt: 'cinematic lighting, movie scene, dramatic, color graded, shallow depth of field, blockbuster' },
  { id: 'anime', name: 'Anime', prompt: 'anime style, vibrant, studio ghibli style, detailed line art, cel shaded' },
  { id: 'digital-art', name: 'Digital Art', prompt: 'digital art, concept art, trending on artstation, illustrative, creative' },
  { id: 'oil-painting', name: 'Oil Painting', prompt: 'oil painting, textured brushstrokes, classical, masterpiece, traditional art' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'cyberpunk, neon, futuristic, synthwave, high contrast, dark atmosphere' },
  { id: 'pixel-art', name: 'Pixel Art', prompt: 'pixel art, 16-bit, retro game style, dithering, low res' },
];

const StoryStudio: React.FC<StoryStudioProps> = ({ config, setConfig, onExit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [showAspectPicker, setShowAspectPicker] = useState(false);
  const [showCountPicker, setShowCountPicker] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  
  // Rigging/Correction State
  const [editingResult, setEditingResult] = useState<GeneratedContent | null>(null);
  const [boneConfigs, setBoneConfigs] = useState<BoneConfiguration[]>([]);
  const [correctionPose, setCorrectionPose] = useState<ModelPose | ''>('');
  const [correctionView, setCorrectionView] = useState<ModelView | ''>('');
  const [backgroundEditPrompt, setBackgroundEditPrompt] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'subject' | 'scene' | 'style' | null>(null);

  useEffect(() => {
    if (!config.storySubjects) setConfig(prev => ({ ...prev, storySubjects: [] }));
    if (!config.storyEnvironments) setConfig(prev => ({ ...prev, storyEnvironments: [] }));
    if (!config.storyArtStyles) setConfig(prev => ({ ...prev, storyArtStyles: [] }));
    if (!config.count) setConfig(prev => ({ ...prev, count: 4 }));
    if (!config.stylePrompts) setConfig(prev => ({ ...prev, stylePrompts: [] }));
  }, [setConfig]);

  const toggleStylePreset = (stylePrompt: string) => {
    setConfig(prev => {
      const current = prev.stylePrompts || [];
      const isSelected = current.includes(stylePrompt);
      const next = isSelected 
        ? current.filter(s => s !== stylePrompt) 
        : [...current, stylePrompt].slice(-3); // Limit to 3 active presets
      return { ...prev, stylePrompts: next };
    });
  };

  const handleGenerate = async (isCorrection: boolean = false) => {
    const activeSubjects = (config.storySubjects || []).filter(s => s.isActive);
    const activeScenes = (config.storyEnvironments || []).filter(e => e.isActive);
    const activeStyles = (config.storyArtStyles || []).filter(s => s.isActive);
    const activePresets = config.stylePrompts || [];

    if (!config.prompt.trim() && activeSubjects.length === 0 && activeScenes.length === 0 && !isCorrection) {
      alert("Please describe your vision or select ingredients from your pools!");
      return;
    }

    setIsLoading(true);
    try {
      let finalPrompt = "";
      let referenceImages: string[] = [];

      if (isCorrection && editingResult) {
          const rigChanges = boneConfigs.map(b => `${b.bone.replace('-', ' ')} ${b.action}`).join(", ");
          const poseText = correctionPose ? `Character stance: ${correctionPose}.` : "";
          const viewText = correctionView ? `Camera angle: ${correctionView}.` : "";
          const bgChange = backgroundEditPrompt ? `Background adjustment: ${backgroundEditPrompt}.` : "";
          
          finalPrompt = `REFINEMENT TASK: 
          ${poseText} ${viewText} 
          ${rigChanges ? `Specific bone adjustments: ${rigChanges}.` : ""} 
          ${bgChange ? `Scene changes: ${bgChange}.` : ""}
          Strictly maintain the character's core appearance and the established art style.
          Context: ${config.prompt}`;
          referenceImages = [editingResult.url];
      } else {
          const subjectText = activeSubjects.map(s => s.text).join(", ");
          const sceneText = activeScenes.map(e => e.text).join(", ");
          const styleText = activeStyles.map(s => s.text).join(", ");
          const presetText = activePresets.join(", ");
          
          let contextStr = "COMPOSITION GUIDELINES:\n";
          if (activeSubjects.length > 0) contextStr += `- Main characters: ${subjectText}\n`;
          if (activeScenes.length > 0) contextStr += `- Setting: ${sceneText}\n`;
          
          let styleInstructions = "";
          if (activeStyles.length > 0) styleInstructions += `- Reference Styles: Replicate the aesthetic from these uploads: ${styleText}. `;
          if (presetText) styleInstructions += `- Style Presets: Apply these artistic qualities: ${presetText}.`;
          
          if (styleInstructions) contextStr += `STYLE: ${styleInstructions}\n`;
          
          finalPrompt = `${contextStr}\nUSER REQUEST: ${config.prompt}\n\nTask: Synthesis of high-detail cinematic imagery. Aspect Ratio: ${config.aspectRatio}.`;
          
          referenceImages = [
              ...activeSubjects.map(s => s.image).filter((img): img is string => !!img),
              ...activeScenes.map(e => e.image).filter((img): img is string => !!img),
              ...activeStyles.map(s => s.image).filter((img): img is string => !!img)
          ];
      }

      const newImages = await generateImage({
        ...config,
        prompt: finalPrompt,
        referenceImages: referenceImages,
        count: isCorrection ? 1 : (config.count || 4) 
      });
      
      if (isCorrection) {
          setResults(prev => [...newImages, ...prev]);
          setEditingResult(null);
          setBoneConfigs([]);
          setCorrectionPose('');
          setCorrectionView('');
          setBackgroundEditPrompt("");
      } else {
          setResults(newImages);
      }
    } catch (err) {
      console.error(err);
      alert("Synthesis failed. Ensure your prompt is descriptive and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerUpload = (type: 'subject' | 'scene' | 'style') => {
    setUploadTarget(type);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadTarget) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const label = prompt(`Label this ${uploadTarget}:`) || "Unnamed " + uploadTarget;

      const newEntity: StoryEntity = {
        id: `${uploadTarget}-${Date.now()}`,
        text: label,
        image: base64,
        isActive: true
      };

      if (uploadTarget === 'subject') setConfig(prev => ({ ...prev, storySubjects: [...(prev.storySubjects || []), newEntity] }));
      else if (uploadTarget === 'scene') setConfig(prev => ({ ...prev, storyEnvironments: [...(prev.storyEnvironments || []), newEntity] }));
      else if (uploadTarget === 'style') setConfig(prev => ({ ...prev, storyArtStyles: [...(prev.storyArtStyles || []), newEntity] }));
      
      setUploadTarget(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleItem = (id: string, type: 'subject' | 'scene' | 'style') => {
    const update = (list: StoryEntity[] = []) => list.map(item => item.id === id ? { ...item, isActive: !item.isActive } : item);
    if (type === 'subject') setConfig(prev => ({ ...prev, storySubjects: update(prev.storySubjects) }));
    else if (type === 'scene') setConfig(prev => ({ ...prev, storyEnvironments: update(prev.storyEnvironments) }));
    else if (type === 'style') setConfig(prev => ({ ...prev, storyArtStyles: update(prev.storyArtStyles) }));
  };

  const removeItem = (id: string, type: 'subject' | 'scene' | 'style', e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'subject') setConfig(prev => ({ ...prev, storySubjects: prev.storySubjects?.filter(i => i.id !== id) }));
    else if (type === 'scene') setConfig(prev => ({ ...prev, storyEnvironments: prev.storyEnvironments?.filter(i => i.id !== id) }));
    else if (type === 'style') setConfig(prev => ({ ...prev, storyArtStyles: prev.storyArtStyles?.filter(i => i.id !== id) }));
  };

  const renderIngredientPool = (type: 'subject' | 'scene' | 'style', label: string, entities: StoryEntity[] = []) => (
    <div className="p-4 border-b border-zinc-800 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{label} Pool</h3>
        <button onClick={() => handleTriggerUpload(type)} className="p-1 bg-indigo-600/10 text-indigo-500 rounded hover:bg-indigo-600 hover:text-white transition-all"><Plus className="w-3 h-3" /></button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {entities.length === 0 && (
          <div onClick={() => handleTriggerUpload(type)} className="aspect-[4/1] bg-zinc-900/30 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center cursor-pointer hover:border-indigo-500/30 transition-all opacity-30 hover:opacity-100">
            <span className="text-[8px] font-bold uppercase text-zinc-700">Add {label}</span>
          </div>
        )}
        {entities.map(item => (
          <div key={item.id} onClick={() => toggleItem(item.id, type)} className={`p-1.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between gap-2 ${item.isActive ? 'bg-indigo-600/10 border-indigo-600/50' : 'bg-zinc-900/40 border-zinc-800 text-zinc-500'}`}>
            <div className="flex items-center gap-2 truncate">
              <div className="relative w-8 h-8 shrink-0">
                {item.image ? <img src={item.image} className="w-full h-full object-cover rounded-lg" /> : <div className="w-full h-full bg-zinc-800 rounded-lg flex items-center justify-center">{type === 'subject' ? <Users className="w-4 h-4"/> : type === 'scene' ? <MapPin className="w-4 h-4"/> : <PenTool className="w-4 h-4"/>}</div>}
                {item.isActive && <div className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 border border-zinc-950"><Check className="w-2 h-2" /></div>}
              </div>
              <p className={`text-[10px] font-bold truncate ${item.isActive ? 'text-white' : 'text-zinc-600'}`}>{item.text}</p>
            </div>
            <button onClick={(e) => removeItem(item.id, type, e)} className="opacity-0 group-hover:opacity-100 p-1 text-zinc-700 hover:text-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-zinc-200 overflow-hidden font-sans">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      
      {/* Header */}
      <div className="h-14 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarHidden(!isSidebarHidden)} className="p-2 hover:bg-zinc-800 rounded-lg transition-all text-indigo-500">
            <Layout className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg">
                <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <h1 className="text-xs font-black tracking-[0.2em] uppercase">LuminaGen <span className="text-indigo-500 italic">Story</span></h1>
          </div>
        </div>
        <button onClick={onExit} className="p-2 text-zinc-500 hover:text-white transition-all bg-zinc-800 border border-zinc-700/50 rounded-lg"><X className="w-4 h-4" /></button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!isSidebarHidden && (
          <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-y-auto custom-scrollbar z-40">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-10 flex items-center justify-between">
               <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700">Ingredient Studio</span>
               {editingResult && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded font-bold animate-pulse">Correction Active</span>}
            </div>
            {renderIngredientPool('subject', 'Subject', config.storySubjects)}
            {renderIngredientPool('scene', 'Scene', config.storyEnvironments)}
            {renderIngredientPool('style', 'Style', config.storyArtStyles)}

            {/* Style Mixer Component */}
            <div className="p-4 border-b border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">Style Mixer</h3>
                    <Palette className="w-3.5 h-3.5 text-indigo-500/50" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                    {STYLES.map(style => (
                        <button 
                            key={style.id}
                            onClick={() => toggleStylePreset(style.prompt)}
                            className={`p-2 rounded-xl border text-[9px] font-bold uppercase transition-all flex items-center justify-between ${config.stylePrompts?.includes(style.prompt) ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                        >
                            <span className="truncate mr-1">{style.name}</span>
                            {config.stylePrompts?.includes(style.prompt) && <Check className="w-2.5 h-2.5 shrink-0" />}
                        </button>
                    ))}
                </div>
            </div>
          </div>
        )}

        {/* Workspace */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#09090b]">
          
          {/* Correction/Rigging Overlay */}
          {editingResult && (
            <div className="absolute inset-0 z-[60] bg-zinc-950/98 backdrop-blur-3xl p-8 flex items-center justify-center animate-in fade-in duration-300">
                <div className="flex flex-col lg:flex-row gap-8 max-w-6xl w-full max-h-full overflow-y-auto lg:overflow-visible">
                    <div className="flex-1 flex flex-col gap-4">
                        <div className={`relative rounded-[32px] overflow-hidden border-2 border-indigo-600/40 bg-black flex items-center justify-center shadow-[0_0_80px_rgba(79,70,229,0.1)]`} style={{ aspectRatio: editingResult.aspectRatio === AspectRatio.PORTRAIT_9_16 ? '9/16' : editingResult.aspectRatio === AspectRatio.SQUARE ? '1/1' : '16/9' }}>
                            <img src={editingResult.url} className="w-full h-full object-contain" />
                        </div>
                        <p className="text-[9px] text-zinc-700 uppercase font-black tracking-widest text-center">Reference Master Visual</p>
                    </div>
                    
                    <div className="w-full lg:w-96 bg-zinc-900 p-6 rounded-[32px] border border-zinc-800 shadow-2xl space-y-6 flex flex-col">
                        <div className="flex items-center gap-3">
                            <BoneIcon className="w-4 h-4 text-indigo-500"/>
                            <h2 className="text-lg font-black uppercase text-white tracking-tight">Rig & Correct</h2>
                        </div>
                        
                        <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                            {/* Action Poses Section */}
                            <div className="space-y-2">
                                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-2">
                                    <Move className="w-3 h-3"/> Global Pose Override
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {POSES.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => setCorrectionPose(correctionPose === p.id ? '' : p.id)}
                                            className={`py-2 rounded-xl border text-[9px] font-bold uppercase transition-all ${correctionPose === p.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Camera View Section */}
                            <div className="space-y-2">
                                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest flex items-center gap-2">
                                    <Eye className="w-3 h-3"/> Perspective Override
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {VIEWS.map(v => (
                                        <button 
                                            key={v.id}
                                            onClick={() => setCorrectionView(correctionView === v.id ? '' : v.id)}
                                            className={`py-2 rounded-xl border text-[9px] font-bold uppercase transition-all ${correctionView === v.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                                        >
                                            {v.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Fine Bone Overrides */}
                            <div className="space-y-3 pt-2 border-t border-zinc-800/50">
                                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Bone-Level Synthesis</label>
                                {boneConfigs.map((bc, i) => (
                                    <div key={i} className="flex gap-2 items-center bg-zinc-950 p-2.5 rounded-xl border border-zinc-800">
                                        <select value={bc.bone} onChange={(e) => { const updated = [...boneConfigs]; updated[i].bone = e.target.value as Bone; setBoneConfigs(updated); }} className="bg-transparent text-[10px] font-black uppercase text-indigo-400 outline-none w-16 appearance-none">{BONES.map(b => <option key={b.id} value={b.id} className="bg-zinc-900">{b.label}</option>)}</select>
                                        <input value={bc.action} onChange={(e) => { const updated = [...boneConfigs]; updated[i].action = e.target.value; setBoneConfigs(updated); }} placeholder="Action (e.g. pointing)" className="flex-1 bg-transparent text-[10px] text-white outline-none border-b border-zinc-800 focus:border-indigo-600" />
                                        <button onClick={() => setBoneConfigs(boneConfigs.filter((_, idx) => idx !== i))} className="text-zinc-700 hover:text-red-500 transition-colors"><Trash2 className="w-3 h-3"/></button>
                                    </div>
                                ))}
                                <button onClick={() => setBoneConfigs([...boneConfigs, { bone: 'head', action: '' }])} className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-[8px] font-black uppercase tracking-widest text-zinc-600 hover:text-indigo-400 hover:border-indigo-600/30 transition-all flex items-center justify-center gap-2"><Plus className="w-3 h-3"/> Add Bone Override</button>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                                <label className="text-[8px] font-black uppercase text-zinc-600 tracking-widest">Environment Modification</label>
                                <textarea value={backgroundEditPrompt} onChange={(e) => setBackgroundEditPrompt(e.target.value)} placeholder="e.g. Make background darker, add cinematic fog..." className="w-full h-16 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-600 resize-none" />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-zinc-800">
                            <button onClick={() => {setEditingResult(null); setBoneConfigs([]); setCorrectionPose(''); setCorrectionView(''); setBackgroundEditPrompt("");}} className="flex-1 py-3 text-[9px] font-black uppercase text-zinc-600 hover:text-white transition-colors">Discard</button>
                            <button onClick={() => handleGenerate(true)} disabled={isLoading} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-600/10 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2">
                                {isLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>} {isLoading ? "Synthesizing..." : "Sync Overrides"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
          )}

          {/* Results Display */}
          <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
            <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto w-full pb-20`}>
              {results.length > 0 ? (
                results.map((img, idx) => (
                  <div key={img.id} className={`group relative rounded-[40px] overflow-hidden bg-zinc-900 border border-zinc-800/50 shadow-2xl transition-all flex items-center justify-center`} style={{ aspectRatio: img.aspectRatio === AspectRatio.PORTRAIT_9_16 ? '9/16' : img.aspectRatio === AspectRatio.SQUARE ? '1/1' : '16/9' }}>
                     <img src={img.url} alt="Master Output" className="w-full h-full object-contain" />
                     <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-6 backdrop-blur-md">
                        <button onClick={() => {
                          const link = document.createElement('a');
                          link.href = img.url;
                          link.download = `lumina-story-${idx}.png`;
                          link.click();
                        }} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-xl hover:bg-indigo-600 hover:text-white transition-all transform hover:scale-110">
                          <Download className="w-5 h-5" />
                        </button>
                        <button onClick={() => setEditingResult(img)} className="w-12 h-12 bg-zinc-800 border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-indigo-600 transition-all transform hover:scale-110" title="Rig & Correct">
                          <BoneIcon className="w-5 h-5" />
                        </button>
                     </div>
                     <div className="absolute bottom-6 left-8 flex items-center gap-2">
                         <span className="px-2.5 py-1 bg-black/60 backdrop-blur rounded-lg text-[8px] font-black uppercase tracking-widest text-zinc-500 border border-white/5">Variant {idx + 1}</span>
                         <span className="px-2.5 py-1 bg-indigo-600/20 backdrop-blur rounded-lg text-[8px] font-black uppercase tracking-widest text-indigo-400 border border-indigo-500/20">{img.aspectRatio}</span>
                     </div>
                  </div>
                ))
              ) : (
                Array.from({ length: config.count || 4 }).map((_, i) => (
                  <div key={i} className={`bg-zinc-900/40 rounded-[40px] flex items-center justify-center border border-zinc-800/30 shadow-inner group relative overflow-hidden`} style={{ aspectRatio: config.aspectRatio === AspectRatio.PORTRAIT_9_16 ? '9/16' : config.aspectRatio === AspectRatio.SQUARE ? '1/1' : '16/9' }}>
                     <div className="z-10 flex flex-col items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600/5 rounded-full flex items-center justify-center border border-indigo-500/10 group-hover:scale-110 transition-all duration-500">
                          <ImageIcon className="w-5 h-5 opacity-10 text-indigo-500" />
                        </div>
                        <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-800">Ready for Synthesis</span>
                     </div>
                  </div>
                ))
              )}
            </div>
            
            {isLoading && !editingResult && (
              <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-xl z-[55] flex flex-col items-center justify-center gap-8">
                 <div className="relative">
                    <div className="w-16 h-16 border-[4px] border-indigo-900/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" /></div>
                 </div>
                 <div className="text-center space-y-2">
                    <p className="text-sm font-black uppercase tracking-[0.4em] text-white">Synthesizing Visuals</p>
                    <p className="text-[9px] text-zinc-600 font-black tracking-widest uppercase italic">Master Engine 2.5 Active</p>
                 </div>
              </div>
            )}
          </div>

          {/* Fixed Bottom Bar Controller */}
          <div className="h-24 bg-zinc-900/95 border-t border-zinc-800 flex items-center px-10 gap-4 z-50 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setShowAspectPicker(!showAspectPicker); setShowCountPicker(false); }}
                  className={`w-12 h-12 rounded-xl transition-all shrink-0 border flex items-center justify-center relative ${showAspectPicker ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-indigo-400'}`}
                >
                  <Layout className="w-4 h-4"/>
                  {showAspectPicker && (
                    <div className="absolute bottom-[calc(100%+16px)] left-0 bg-zinc-900 rounded-[28px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-zinc-800 p-6 min-w-[280px] animate-in slide-in-from-bottom-4 duration-200">
                      <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700 mb-5 border-b border-zinc-800 pb-2">Canvas Ratio</h4>
                      <div className="flex justify-between items-end gap-6">
                        <div onClick={(e) => { e.stopPropagation(); setConfig(prev => ({...prev, aspectRatio: AspectRatio.SQUARE})); setShowAspectPicker(false); }} className="flex flex-col items-center gap-3 cursor-pointer group">
                            <div className={`w-10 h-10 border-2 rounded-lg transition-all ${config.aspectRatio === AspectRatio.SQUARE ? 'bg-indigo-600 border-white scale-110' : 'bg-zinc-950 border-zinc-800 group-hover:border-indigo-500'}`}></div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${config.aspectRatio === AspectRatio.SQUARE ? 'text-white' : 'text-zinc-600'}`}>1:1</span>
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); setConfig(prev => ({...prev, aspectRatio: AspectRatio.PORTRAIT_9_16})); setShowAspectPicker(false); }} className="flex flex-col items-center gap-3 cursor-pointer group">
                            <div className={`w-8 h-12 border-2 rounded-lg transition-all ${config.aspectRatio === AspectRatio.PORTRAIT_9_16 ? 'bg-indigo-600 border-white scale-110' : 'bg-zinc-950 border-zinc-800 group-hover:border-indigo-500'}`}></div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${config.aspectRatio === AspectRatio.PORTRAIT_9_16 ? 'text-white' : 'text-zinc-600'}`}>9:16</span>
                        </div>
                        <div onClick={(e) => { e.stopPropagation(); setConfig(prev => ({...prev, aspectRatio: AspectRatio.LANDSCAPE_16_9})); setShowAspectPicker(false); }} className="flex flex-col items-center gap-3 cursor-pointer group">
                            <div className={`w-12 h-8 border-2 rounded-lg transition-all ${config.aspectRatio === AspectRatio.LANDSCAPE_16_9 ? 'bg-indigo-600 border-white scale-110' : 'bg-zinc-950 border-zinc-800 group-hover:border-indigo-500'}`}></div>
                            <span className={`text-[8px] font-black uppercase tracking-widest ${config.aspectRatio === AspectRatio.LANDSCAPE_16_9 ? 'text-white' : 'text-zinc-600'}`}>16:9</span>
                        </div>
                      </div>
                    </div>
                  )}
                </button>

                <button 
                  onClick={() => { setShowCountPicker(!showCountPicker); setShowAspectPicker(false); }}
                  className={`w-12 h-12 rounded-xl transition-all shrink-0 border flex items-center justify-center relative ${showCountPicker ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-indigo-400'}`}
                >
                  <Layers className="w-4 h-4"/>
                  {showCountPicker && (
                    <div className="absolute bottom-[calc(100%+16px)] left-0 bg-zinc-900 rounded-[24px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] border border-zinc-800 p-5 min-w-[200px] animate-in slide-in-from-bottom-4 duration-200">
                      <h4 className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-700 mb-4 border-b border-zinc-800 pb-2">Batch Count</h4>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map(num => (
                          <button 
                            key={num} 
                            onClick={(e) => { e.stopPropagation(); setConfig(prev => ({...prev, count: num})); setShowCountPicker(false); }}
                            className={`py-2 rounded-lg text-[10px] font-black border transition-all ${config.count === num ? 'bg-indigo-600 border-white text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'}`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
              </div>

              <div className="flex-1">
                <input 
                  type="text" 
                  value={config.prompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe your creative vision in detail..." 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-[20px] px-6 py-3.5 text-xs font-black text-white outline-none focus:border-indigo-600/40 transition-all placeholder:text-zinc-800 uppercase tracking-widest shadow-inner"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
              </div>

              <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden lg:flex flex-col items-end gap-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Multi-Ingredient Fusion</span>
                      <span className="text-[9px] font-black uppercase text-indigo-500/60 italic">Quantity: {config.count || 4}x</span>
                  </div>
                  <button 
                    onClick={() => handleGenerate()}
                    disabled={isLoading}
                    className="w-14 h-14 bg-indigo-600 text-white rounded-[20px] flex items-center justify-center hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-700"
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-8 h-8" />}
                  </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryStudio;
