
import React, { useState, useEffect, useRef } from 'react';
import { GenerationConfig, StoryEntity, GeneratedContent, AspectRatio, ModelType } from '../types';
import { 
  Plus, X, Layout, Users, MapPin, PenTool, Download, 
  ImageIcon, ChevronRight, Sparkles, Settings, Loader2, Rotate3D, Trash2, Check, Upload, Minus
} from './Icons';
import { generateImage } from '../services/geminiService';

interface StoryStudioProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  onExit: () => void;
}

const StoryStudio: React.FC<StoryStudioProps> = ({ config, setConfig, onExit }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeneratedContent[]>([]);
  const [showAspectPicker, setShowAspectPicker] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isImagesHidden, setIsImagesHidden] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<'subject' | 'scene' | 'style' | null>(null);

  // Initialize entities if they don't exist
  useEffect(() => {
    if (!config.storySubjects) setConfig(prev => ({ ...prev, storySubjects: [] }));
    if (!config.storyEnvironments) setConfig(prev => ({ ...prev, storyEnvironments: [] }));
    if (!config.storyArtStyles) setConfig(prev => ({ ...prev, storyArtStyles: [] }));
  }, [config.storySubjects, config.storyEnvironments, config.storyArtStyles, setConfig]);

  const handleGenerate = async () => {
    if (!config.prompt.trim() && !config.storySubjects?.length && !config.storyEnvironments?.length) {
      alert("Please provide a prompt or some ingredients to start!");
      return;
    }

    setIsLoading(true);
    try {
      const activeSubjects = config.storySubjects?.filter(s => s.isActive).map(s => s.text).join(", ") || "";
      const activeScenes = config.storyEnvironments?.filter(e => e.isActive).map(e => e.text).join(", ") || "";
      const activeStyles = config.storyArtStyles?.filter(s => s.isActive).map(s => s.text).join(", ") || "";
      
      const ingredientString = [activeSubjects, activeScenes, activeStyles].filter(Boolean).join(" in ");
      const finalPrompt = config.prompt.trim() 
        ? `${config.prompt}. Featuring: ${ingredientString}. Cinematic quality.` 
        : `A professional cinematic visualization of ${ingredientString}.`;
      
      const referenceImg = config.storySubjects?.find(s => s.isActive && s.image)?.image || 
                          config.storyEnvironments?.find(e => e.isActive && e.image)?.image ||
                          config.storyArtStyles?.find(s => s.isActive && s.image)?.image;

      const newImages = await generateImage({
        ...config,
        prompt: finalPrompt,
        referenceImage: referenceImg,
        count: 4 
      });
      
      setResults(newImages);
      setIsImagesHidden(false);
    } catch (err) {
      console.error(err);
      alert("Generation failed. Please check your prompt or API status.");
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
      const description = prompt(`Name this ${uploadTarget} (e.g. "Main Hero", "Cloudy Mountains"):`);
      if (!description) return;

      const newEntity: StoryEntity = {
        id: `${uploadTarget}-${Date.now()}`,
        text: description,
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

  const addEntityTextOnly = (type: 'subject' | 'scene' | 'style') => {
    const text = prompt(`Describe the ${type}:`);
    if (!text) return;

    const newEntity: StoryEntity = {
      id: `${type}-${Date.now()}`,
      text: text,
      image: null,
      isActive: true
    };

    if (type === 'subject') setConfig(prev => ({ ...prev, storySubjects: [...(prev.storySubjects || []), newEntity] }));
    else if (type === 'scene') setConfig(prev => ({ ...prev, storyEnvironments: [...(prev.storyEnvironments || []), newEntity] }));
    else if (type === 'style') setConfig(prev => ({ ...prev, storyArtStyles: [...(prev.storyArtStyles || []), newEntity] }));
  };

  const toggleActive = (id: string, type: 'subject' | 'scene' | 'style') => {
    const update = (list: StoryEntity[] = []) => list.map(item => item.id === id ? { ...item, isActive: !item.isActive } : item);
    if (type === 'subject') setConfig(prev => ({ ...prev, storySubjects: update(prev.storySubjects) }));
    else if (type === 'scene') setConfig(prev => ({ ...prev, storyEnvironments: update(prev.storyEnvironments) }));
    else if (type === 'style') setConfig(prev => ({ ...prev, storyArtStyles: update(prev.storyArtStyles) }));
  };

  const removeEntity = (id: string, type: 'subject' | 'scene' | 'style', e: React.MouseEvent) => {
    e.stopPropagation();
    if (type === 'subject') setConfig(prev => ({ ...prev, storySubjects: prev.storySubjects?.filter(i => i.id !== id) }));
    else if (type === 'scene') setConfig(prev => ({ ...prev, storyEnvironments: prev.storyEnvironments?.filter(i => i.id !== id) }));
    else if (type === 'style') setConfig(prev => ({ ...prev, storyArtStyles: prev.storyArtStyles?.filter(i => i.id !== id) }));
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      
      {/* LuminaGen Header Style */}
      <div className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsSidebarHidden(!isSidebarHidden)} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-indigo-500">
            <Layout className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-1.5 rounded-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">LuminaGen <span className="text-indigo-400">Story</span></h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 mr-4">
             <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"><Settings className="w-5 h-5"/></button>
             <button className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"><Plus className="w-5 h-5"/></button>
          </div>
          <button onClick={onExit} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {!isSidebarHidden && (
          <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-y-auto custom-scrollbar z-40 shadow-xl">
            
            {/* SUBJECT SECTION */}
            <div className="p-5 space-y-4 border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Subject Upload</h3>
                <div className="flex gap-1">
                  <button onClick={() => addEntityTextOnly('subject')} className="p-1.5 hover:text-indigo-500 text-zinc-600"><Sparkles className="w-4 h-4"/></button>
                  <button onClick={() => handleTriggerUpload('subject')} className="p-1.5 hover:text-indigo-500 text-zinc-600"><Plus className="w-4 h-4"/></button>
                </div>
              </div>
              <div 
                onClick={() => handleTriggerUpload('subject')}
                className="aspect-video bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/30 transition-all group overflow-hidden"
              >
                {config.storySubjects?.find(s => s.isActive && s.image) ? (
                  <img src={config.storySubjects.find(s => s.isActive && s.image)?.image || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Users className="w-6 h-6 opacity-30 text-indigo-400" />
                    <span className="text-[9px] font-bold uppercase text-zinc-700">Add character ref</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {config.storySubjects?.map(s => (
                  <div key={s.id} onClick={() => toggleActive(s.id, 'subject')} className={`p-2.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between ${s.isActive ? 'bg-indigo-600/10 border-indigo-600/50 text-white' : 'bg-zinc-950/50 border-zinc-800 text-zinc-600 opacity-60'}`}>
                    <div className="flex items-center gap-2 truncate">
                        {s.image ? <img src={s.image} className="w-6 h-6 rounded-sm object-cover" /> : <div className="w-6 h-6 rounded-sm bg-zinc-800 flex items-center justify-center"><Users className="w-3 h-3"/></div>}
                        <p className="text-xs font-medium truncate">{s.text}</p>
                    </div>
                    <button onClick={(e) => removeEntity(s.id, 'subject', e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* SCENE SECTION */}
            <div className="p-5 space-y-4 border-b border-zinc-800/50">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Scene Upload</h3>
                <div className="flex gap-1">
                   <button onClick={() => addEntityTextOnly('scene')} className="p-1.5 hover:text-indigo-500 text-zinc-600"><Sparkles className="w-4 h-4"/></button>
                   <button onClick={() => handleTriggerUpload('scene')} className="p-1.5 hover:text-indigo-500 text-zinc-600"><Plus className="w-4 h-4"/></button>
                </div>
              </div>
              <div 
                onClick={() => handleTriggerUpload('scene')}
                className="aspect-video bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/30 transition-all group overflow-hidden"
              >
                {config.storyEnvironments?.find(e => e.isActive && e.image) ? (
                  <img src={config.storyEnvironments.find(e => e.isActive && e.image)?.image || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <MapPin className="w-6 h-6 opacity-30 text-indigo-400" />
                    <span className="text-[9px] font-bold uppercase text-zinc-700">Add environment ref</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {config.storyEnvironments?.map(e => (
                  <div key={e.id} onClick={() => toggleActive(e.id, 'scene')} className={`p-2.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between ${e.isActive ? 'bg-indigo-600/10 border-indigo-600/50 text-white' : 'bg-zinc-950/50 border-zinc-800 text-zinc-600 opacity-60'}`}>
                    <div className="flex items-center gap-2 truncate">
                        {e.image ? <img src={e.image} className="w-6 h-6 rounded-sm object-cover" /> : <div className="w-6 h-6 rounded-sm bg-zinc-800 flex items-center justify-center"><MapPin className="w-3 h-3"/></div>}
                        <p className="text-xs font-medium truncate">{e.text}</p>
                    </div>
                    <button onClick={(ev) => removeEntity(e.id, 'scene', ev)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* STYLE SECTION */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Style Upload</h3>
                <div className="flex gap-1">
                   <button onClick={() => addEntityTextOnly('style')} className="p-1.5 hover:text-indigo-500 text-zinc-600"><Sparkles className="w-4 h-4"/></button>
                   <button onClick={() => handleTriggerUpload('style')} className="p-1.5 hover:text-indigo-500 text-zinc-600"><Plus className="w-4 h-4"/></button>
                </div>
              </div>
              <div 
                onClick={() => handleTriggerUpload('style')}
                className="aspect-video bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/30 transition-all group overflow-hidden"
              >
                {config.storyArtStyles?.find(s => s.isActive && s.image) ? (
                  <img src={config.storyArtStyles.find(s => s.isActive && s.image)?.image || ''} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <PenTool className="w-6 h-6 opacity-30 text-indigo-400" />
                    <span className="text-[9px] font-bold uppercase text-zinc-700">Add style ref</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {config.storyArtStyles?.map(s => (
                  <div key={s.id} onClick={() => toggleActive(s.id, 'style')} className={`p-2.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between ${s.isActive ? 'bg-indigo-600/10 border-indigo-600/50 text-white' : 'bg-zinc-950/50 border-zinc-800 text-zinc-600 opacity-60'}`}>
                    <div className="flex items-center gap-2 truncate">
                        {s.image ? <img src={s.image} className="w-6 h-6 rounded-sm object-cover" /> : <div className="w-6 h-6 rounded-sm bg-zinc-800 flex items-center justify-center"><PenTool className="w-3 h-3"/></div>}
                        <p className="text-xs font-medium truncate">{s.text}</p>
                    </div>
                    <button onClick={(e) => removeEntity(s.id, 'style', e)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Area */}
        <div className="flex-1 bg-zinc-950 flex flex-col p-8 overflow-y-auto relative custom-scrollbar">
          <div className={`grid grid-cols-2 gap-6 flex-1 max-w-5xl mx-auto w-full pb-40 transition-all duration-500 ${isImagesHidden ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            {results.length > 0 ? (
              results.map((img, idx) => (
                <div key={img.id} className="relative aspect-video rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl transition-all group hover:border-indigo-500/30">
                   <img src={img.url} alt="Output" className="w-full h-full object-cover" />
                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                      <button onClick={() => {
                        const link = document.createElement('a');
                        link.href = img.url;
                        link.download = `lumina-story-${idx}.png`;
                        link.click();
                      }} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:bg-indigo-500 hover:text-white transition-all">
                        <Download className="w-5 h-5" />
                      </button>
                   </div>
                </div>
              ))
            ) : (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-video bg-zinc-900/50 rounded-3xl flex items-center justify-center border border-zinc-800/30 shadow-inner group overflow-hidden">
                   <ImageIcon className="w-8 h-8 opacity-10 text-zinc-500" />
                </div>
              ))
            )}
            
            {isLoading && (
              <div className="col-span-2 absolute inset-0 bg-zinc-950/70 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-6 rounded-3xl">
                 <div className="relative">
                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center"><Sparkles className="w-5 h-5 text-indigo-500" /></div>
                 </div>
                 <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-bold text-white tracking-widest uppercase">Rendering Scene</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Applying subject & style overrides</p>
                 </div>
              </div>
            )}
          </div>

          {/* Floating Control Bar */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50">
             <div className="bg-zinc-900 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-zinc-800 flex items-center p-2 gap-2">
                
                <button 
                  onClick={() => setIsImagesHidden(!isImagesHidden)}
                  className={`text-[10px] font-bold uppercase px-6 py-4 rounded-full transition-all shrink-0 flex items-center gap-3 ${isImagesHidden ? 'bg-zinc-800 text-zinc-400' : 'bg-indigo-600 text-white'}`}
                >
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-300 ${isImagesHidden ? 'rotate-0' : 'rotate-180'}`} /> 
                    {isImagesHidden ? 'Show' : 'Hide'}
                </button>

                <input 
                  type="text" 
                  value={config.prompt}
                  onChange={(e) => setConfig(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe the action or scene details..." 
                  className="flex-1 bg-transparent border-none text-sm px-4 focus:outline-none placeholder:text-zinc-600 text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />

                <div className="flex items-center gap-1 shrink-0 px-2 border-l border-zinc-800">
                   <button 
                      onClick={() => setShowAspectPicker(!showAspectPicker)}
                      className={`p-3 rounded-full transition-all ${showAspectPicker ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-800 text-zinc-500'}`} 
                   >
                     <Layout className="w-5 h-5"/>
                   </button>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-500 transition-all shadow-lg shrink-0 disabled:bg-zinc-800 disabled:text-zinc-700"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ChevronRight className="w-8 h-8" />}
                </button>

                {showAspectPicker && (
                  <div className="absolute bottom-20 right-10 bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-800 p-6 flex flex-col gap-4 animate-in slide-in-from-bottom-2 duration-200">
                    <span className="text-[10px] font-bold uppercase text-zinc-600 text-center tracking-widest">Aspect Ratio</span>
                    <div className="flex gap-4">
                       <button onClick={() => { setConfig(prev => ({...prev, aspectRatio: AspectRatio.SQUARE})); setShowAspectPicker(false); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${config.aspectRatio === AspectRatio.SQUARE ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><div className="w-6 h-6 border-2 border-current rounded-sm"></div><span className="text-[9px] font-bold">1:1</span></button>
                       <button onClick={() => { setConfig(prev => ({...prev, aspectRatio: AspectRatio.PORTRAIT_9_16})); setShowAspectPicker(false); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${config.aspectRatio === AspectRatio.PORTRAIT_9_16 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><div className="w-4 h-7 border-2 border-current rounded-sm"></div><span className="text-[9px] font-bold">9:16</span></button>
                       <button onClick={() => { setConfig(prev => ({...prev, aspectRatio: AspectRatio.LANDSCAPE_16_9})); setShowAspectPicker(false); }} className={`p-3 rounded-xl border flex flex-col items-center gap-2 ${config.aspectRatio === AspectRatio.LANDSCAPE_16_9 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}><div className="w-7 h-4 border-2 border-current rounded-sm"></div><span className="text-[9px] font-bold">16:9</span></button>
                    </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryStudio;
