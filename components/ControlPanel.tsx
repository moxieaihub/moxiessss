
import React, { useEffect, useRef, useState } from 'react';
import { ModelType, AspectRatio, GenerationConfig, GenerationMode, VoiceName, ModelPose, ModelView, ModelMaterial, Bone, BoneConfiguration, AnimationFormat, AnimationQuality } from '../types';
import { Zap, Layers, Palette, Copy, ImageIcon, Mic, Volume2, Layout, Upload, X, Square, Trash2, Box, Move, Bone as BoneIcon, Film, Settings, Clock, FileVideo, Cube } from './Icons';

interface ControlPanelProps {
  config: GenerationConfig;
  setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
  isLoading: boolean;
  onGenerate: () => void;
}

const STYLES = [
  { id: '3d-model', name: '3D Character Model', prompt: '3d render, blender style, unreal engine 5, character design, t-pose, volumetric lighting, high fidelity, 3d modeling, octane render' },
  { id: 'photorealistic', name: 'Photorealistic', prompt: 'photorealistic, 8k, highly detailed, realistic textures, photography, sharp focus' },
  { id: 'cinematic', name: 'Cinematic', prompt: 'cinematic lighting, movie scene, dramatic, color graded, shallow depth of field, blockbuster' },
  { id: 'anime', name: 'Anime', prompt: 'anime style, vibrant, studio ghibli style, detailed line art, cel shaded' },
  { id: 'digital-art', name: 'Digital Art', prompt: 'digital art, concept art, trending on artstation, illustrative, creative' },
  { id: 'oil-painting', name: 'Oil Painting', prompt: 'oil painting, textured brushstrokes, classical, masterpiece, traditional art' },
  { id: 'cyberpunk', name: 'Cyberpunk', prompt: 'cyberpunk, neon, futuristic, synthwave, high contrast, dark atmosphere' },
  { id: 'pixel-art', name: 'Pixel Art', prompt: 'pixel art, 16-bit, retro game style, dithering, low res' },
];

const THUMBNAIL_STYLES = [
  { id: 'reaction', name: 'Reaction Face', prompt: 'exaggerated facial expression, surprised face close up, blurred background, youtube reaction' },
  { id: 'versus', name: 'Versus / Comparison', prompt: 'split screen comparison, versus mode, red vs blue, competition, before and after' },
  { id: 'gaming', name: 'Gaming', prompt: 'gaming thumbnail, action packed, game characters, glowing effects, intense, esports' },
  { id: 'tech', name: 'Tech Review', prompt: 'tech review, clean studio lighting, product close up, modern, sleek, unboxing' },
  { id: 'tutorial', name: 'Tutorial / How-To', prompt: 'educational, infographic elements, arrows pointing, clear focus, instructional' },
  { id: 'vlog', name: 'Vlog / Lifestyle', prompt: 'lifestyle vlog, bright and airy, travel aesthetic, selfie angle, engaging' },
];

const VOICES: { id: VoiceName; name: string; gender: string }[] = [
  { id: 'Puck', name: 'Puck', gender: 'Male (Deep)' },
  { id: 'Charon', name: 'Charon', gender: 'Male (Bold)' },
  { id: 'Kore', name: 'Kore', gender: 'Female (Soft)' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male (Intense)' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female (Clear)' },
];

const SkeletonRig: React.FC<{ 
    selectedBone: Bone | null; 
    onSelectBone: (bone: Bone) => void;
    configurations: BoneConfiguration[];
}> = ({ selectedBone, onSelectBone, configurations }) => {
    const activeBones = configurations.map(c => c.bone);

    const getBoneClass = (bone: Bone) => {
        const isModified = activeBones.includes(bone);
        const isSelected = selectedBone === bone;

        let baseClasses = "cursor-pointer transition-all duration-300 ease-out";
        
        if (isSelected) {
            // Selected: Indigo Glow
            return `${baseClasses} fill-indigo-500 stroke-indigo-300 stroke-[3] filter drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]`;
        } 
        
        if (isModified) {
            // Modified: Emerald/Green
            return `${baseClasses} fill-emerald-500/90 stroke-emerald-300 stroke-[2] filter drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]`;
        }

        // Default
        return `${baseClasses} fill-zinc-800 stroke-zinc-600 stroke-[2] hover:fill-zinc-700 hover:stroke-zinc-500`;
    };

    const StatusIndicator = ({ x, y, active }: { x: number, y: number, active: boolean }) => {
        if (!active) return null;
        return (
            <g transform={`translate(${x}, ${y})`}>
                <circle r="4" className="fill-emerald-500 stroke-zinc-950 stroke-1" />
                <path d="M-2 0 L-0.5 2 L2 -2" className="stroke-white stroke-[1.5] fill-none" />
            </g>
        );
    };

    return (
        <div className="relative h-64 w-full flex items-center justify-center bg-zinc-900/50 rounded-xl border border-zinc-800 my-4 overflow-hidden group">
             {/* Grid Background */}
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
             
             <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none select-none">
                 <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Interactive Rig</span>
                 <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Selected</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Modified</span>
                 </div>
             </div>

             <svg viewBox="0 0 100 200" className="h-56 drop-shadow-2xl z-10">
                {/* Connecting Lines (Spine/Limbs) - Rendered first so they are behind */}
                <g className="stroke-zinc-800 stroke-[4] opacity-50">
                    <line x1="50" y1="30" x2="50" y2="90" />
                    <line x1="50" y1="50" x2="20" y2="80" />
                    <line x1="50" y1="50" x2="80" y2="80" />
                    <line x1="50" y1="90" x2="35" y2="160" />
                    <line x1="50" y1="90" x2="65" y2="160" />
                </g>

                {/* Head */}
                <circle cx="50" cy="30" r="12" 
                    className={getBoneClass('head')}
                    onClick={() => onSelectBone('head')} 
                />
                <StatusIndicator x={60} y={20} active={activeBones.includes('head')} />
                
                {/* Torso */}
                <path d="M35 50 L65 50 L55 90 L45 90 Z" 
                    className={getBoneClass('torso')}
                    onClick={() => onSelectBone('torso')}
                />
                <StatusIndicator x={60} y={80} active={activeBones.includes('torso')} />

                {/* Left Arm (Viewer Left) */}
                <rect x="10" y="50" width="15" height="40" rx="6" transform="rotate(20 17 50)"
                    className={getBoneClass('left-arm')}
                    onClick={() => onSelectBone('left-arm')}
                />
                <StatusIndicator x={10} y={60} active={activeBones.includes('left-arm')} />

                {/* Right Arm (Viewer Right) */}
                <rect x="75" y="50" width="15" height="40" rx="6" transform="rotate(-20 82 50)"
                     className={getBoneClass('right-arm')}
                     onClick={() => onSelectBone('right-arm')}
                />
                <StatusIndicator x={90} y={60} active={activeBones.includes('right-arm')} />

                {/* Left Leg */}
                <rect x="30" y="95" width="15" height="60" rx="6"
                    className={getBoneClass('left-leg')}
                    onClick={() => onSelectBone('left-leg')}
                />
                <StatusIndicator x={32} y={150} active={activeBones.includes('left-leg')} />

                {/* Right Leg */}
                <rect x="55" y="95" width="15" height="60" rx="6"
                    className={getBoneClass('right-leg')}
                    onClick={() => onSelectBone('right-leg')}
                />
                <StatusIndicator x={68} y={150} active={activeBones.includes('right-leg')} />
             </svg>
        </div>
    );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, isLoading, onGenerate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [inputType, setInputType] = useState<'text' | 'mic'>('text');

  // Rigging State
  const [selectedBone, setSelectedBone] = useState<Bone | null>(null);

  // Effect to enforce constraints when switching modes
  useEffect(() => {
    if (config.mode === GenerationMode.THUMBNAIL) {
        setConfig(prev => ({ ...prev, aspectRatio: AspectRatio.LANDSCAPE_16_9 }));
    } else if (config.mode === GenerationMode.MODEL_3D) {
        setConfig(prev => ({ 
            ...prev, 
            aspectRatio: AspectRatio.SQUARE,
            modelPose: prev.modelPose || 't-pose',
            modelView: prev.modelView || 'front',
            modelMaterial: prev.modelMaterial || 'realistic'
        }));
    }
  }, [config.mode, setConfig]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setConfig(prev => ({ ...prev, model: e.target.value as ModelType }));
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConfig(prev => ({ ...prev, prompt: e.target.value }));
  };

  const toggleStyle = (stylePrompt: string) => {
    setConfig(prev => {
      const currentStyles = prev.stylePrompts || [];
      const isSelected = currentStyles.includes(stylePrompt);
      
      let newStyles;
      if (isSelected) {
        newStyles = currentStyles.filter(s => s !== stylePrompt);
      } else {
        // Limit to 3 styles to prevent overwhelming the prompt
        if (currentStyles.length >= 3) {
            newStyles = [...currentStyles.slice(1), stylePrompt];
        } else {
            newStyles = [...currentStyles, stylePrompt];
        }
      }
      return { ...prev, stylePrompts: newStyles };
    });
  };

  const setMode = (mode: GenerationMode) => {
    setConfig(prev => ({ ...prev, mode, isRigging: false }));
  };

  const exitRiggingMode = () => {
      setConfig(prev => ({ ...prev, isRigging: false, boneConfigurations: [], renderAnimation: false }));
      setSelectedBone(null);
  };

  const handleBoneAction = (action: string) => {
      if (!selectedBone) return;
      
      setConfig(prev => {
          const currentConfigs = prev.boneConfigurations || [];
          const existingIndex = currentConfigs.findIndex(c => c.bone === selectedBone);
          
          let newConfigs;
          if (existingIndex >= 0) {
              newConfigs = [...currentConfigs];
              newConfigs[existingIndex] = { bone: selectedBone, action };
          } else {
              newConfigs = [...currentConfigs, { bone: selectedBone, action }];
          }
          return { ...prev, boneConfigurations: newConfigs };
      });
  };

  const getBoneActions = (bone: Bone) => {
      switch(bone) {
          case 'head': return ['Look Left', 'Look Right', 'Look Up', 'Look Down', 'Tilt Left', 'Tilt Right'];
          case 'left-arm':
          case 'right-arm': return ['Raised Up', 'Resting by Side', 'Waving', 'Crossed', 'Flexing', 'Holding Object', 'Pointing'];
          case 'left-leg':
          case 'right-leg': return ['Step Forward', 'Step Back', 'Kneeling', 'Kick', 'Wide Stance'];
          case 'torso': return ['Lean Forward', 'Lean Back', 'Twist Left', 'Twist Right'];
          default: return [];
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setConfig(prev => ({ ...prev, referenceImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const clearReferenceImage = () => {
    setConfig(prev => ({ ...prev, referenceImage: null }));
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  // --- AUDIO RECORDING LOGIC ---
  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.onloadend = () => {
                setConfig(prev => ({ ...prev, audioInput: reader.result as string }));
            };
            reader.readAsDataURL(blob);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            clearInterval(timerRef.current!);
            setRecordingDuration(0);
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
        
        timerRef.current = window.setInterval(() => {
            setRecordingDuration(prev => prev + 1);
        }, 1000);

    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        setIsRecording(false);
    }
  };

  const deleteRecording = () => {
    setConfig(prev => ({ ...prev, audioInput: null }));
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Switch input type clears previous input type data for cleanliness
  const switchInputType = (type: 'text' | 'mic') => {
      setInputType(type);
      if (type === 'text') {
        setConfig(prev => ({ ...prev, audioInput: null }));
      } else {
        // Keep prompt as instructions, but prioritize audio logic in service
      }
  };


  const activeStyles = config.mode === GenerationMode.THUMBNAIL ? THUMBNAIL_STYLES : STYLES;

  const getPlaceholder = () => {
      switch(config.mode) {
          case GenerationMode.AUDIO: return inputType === 'mic' ? "Add instructions for your audio (optional)... e.g. 'Translate to French'" : "Enter text to speak...";
          case GenerationMode.THUMBNAIL: return "Describe the video topic... e.g., 'A review of the newest iPhone' or 'Minecraft survival challenge'";
          case GenerationMode.MODEL_3D: return "Describe the character... e.g., 'A futuristic robot soldier with neon armor'";
          default: return "Describe your imagination... e.g., A cyberpunk street food vendor in Tokyo";
      }
  }

  const getLabel = () => {
    switch(config.mode) {
        case GenerationMode.AUDIO: return inputType === 'mic' ? "Instructions (Optional)" : "Text to Speak";
        case GenerationMode.THUMBNAIL: return "Video Topic";
        case GenerationMode.MODEL_3D: return "Character Description";
        default: return "Image Description";
    }
  }

  // --- RIGGING MODE UI ---
  if (config.isRigging) {
      return (
        <div className="w-full lg:w-96 flex-shrink-0 flex flex-col p-0 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/50">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                    <BoneIcon className="w-5 h-5" />
                    <span>Rigging Mode</span>
                </div>
                <button 
                    onClick={exitRiggingMode}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col gap-4 p-4 lg:p-6 overflow-y-auto custom-scrollbar flex-1">
                <div className="bg-zinc-950 p-1 rounded-lg flex border border-zinc-800">
                    <button 
                        onClick={() => setConfig(prev => ({ ...prev, renderAnimation: false }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${!config.renderAnimation ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Static Pose
                    </button>
                    <button 
                        onClick={() => setConfig(prev => ({ ...prev, renderAnimation: true }))}
                        className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${config.renderAnimation ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Animate Motion
                    </button>
                </div>

                <p className="text-xs text-zinc-500">
                    Select a bone on the rig below to {config.renderAnimation ? 'create a motion sequence' : 'adjust the static pose'}.
                </p>

                <SkeletonRig 
                    selectedBone={selectedBone} 
                    onSelectBone={setSelectedBone}
                    configurations={config.boneConfigurations || []}
                />

                {/* ANIMATION SETTINGS (Only visible in Animation Mode) */}
                {config.renderAnimation && (
                    <div className="space-y-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            <Settings className="w-3 h-3" /> Animation Settings
                        </div>
                        
                        {/* Duration Slider */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-zinc-500">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> Duration</span>
                                <span className="text-indigo-400">{config.animationDuration || 3}s</span>
                            </div>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                value={config.animationDuration || 3}
                                onChange={(e) => setConfig(prev => ({ ...prev, animationDuration: parseInt(e.target.value) }))}
                                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                             {/* Quality Selector */}
                             <div className="space-y-1">
                                <span className="text-[10px] text-zinc-500 uppercase">Quality</span>
                                <select 
                                    value={config.animationQuality || 'standard'}
                                    onChange={(e) => setConfig(prev => ({ ...prev, animationQuality: e.target.value as AnimationQuality }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="standard">Standard (Fast)</option>
                                    <option value="high">High (Smooth)</option>
                                </select>
                             </div>
                             {/* Format Selector */}
                             <div className="space-y-1">
                                <span className="text-[10px] text-zinc-500 uppercase">Format</span>
                                <select 
                                    value={config.animationFormat || 'mp4'}
                                    onChange={(e) => setConfig(prev => ({ ...prev, animationFormat: e.target.value as AnimationFormat }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-1.5 px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="mp4">Video (WebM)</option>
                                    <option value="gif">GIF Loop</option>
                                </select>
                             </div>
                        </div>
                    </div>
                )}

                {selectedBone ? (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between">
                            {selectedBone.replace('-', ' ')} Action
                            <span className="text-[10px] text-indigo-400">Selected</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {getBoneActions(selectedBone).map((action) => {
                                const isActive = config.boneConfigurations?.find(c => c.bone === selectedBone)?.action === action;
                                return (
                                    <button
                                        key={action}
                                        onClick={() => handleBoneAction(action)}
                                        className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-center ${
                                            isActive
                                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                                        }`}
                                    >
                                        {action}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-20 text-zinc-600 text-xs italic border border-dashed border-zinc-800 rounded-xl mt-2">
                        Click a bone to see actions
                    </div>
                )}
                
                {config.boneConfigurations && config.boneConfigurations.length > 0 && (
                     <div className="bg-zinc-950/50 rounded-lg p-3 border border-zinc-800 space-y-2">
                        <span className="text-[10px] uppercase text-zinc-500 font-semibold">Active Changes</span>
                        <div className="flex flex-wrap gap-2">
                            {config.boneConfigurations.map((c, i) => (
                                <span key={i} className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 flex items-center gap-1">
                                    {c.bone}: {c.action}
                                    <button 
                                        onClick={() => {
                                            const newConfigs = config.boneConfigurations?.filter((_, idx) => idx !== i);
                                            setConfig(prev => ({...prev, boneConfigurations: newConfigs}));
                                        }}
                                        className="hover:text-red-400"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                     </div>
                )}

            </div>

            <div className="mt-auto p-4 lg:p-6 border-t border-zinc-800 bg-zinc-950/30">
                <button
                onClick={onGenerate}
                disabled={isLoading || !config.boneConfigurations?.length}
                className={`w-full py-4 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all ${
                    isLoading || !config.boneConfigurations?.length
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : config.renderAnimation
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500'
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500'
                }`}
                >
                {isLoading ? 'Processing...' : config.renderAnimation ? `Render ${config.animationDuration || 3}s Animation` : 'Apply New Pose'}
                {config.renderAnimation ? <Film className="w-4 h-4" /> : <Zap className="w-4 h-4 fill-current" />}
                </button>
            </div>
        </div>
      );
  }

  // --- STANDARD MODE UI ---
  return (
    <div className="w-full lg:w-96 flex-shrink-0 flex flex-col p-0 border-b lg:border-b-0 lg:border-r border-zinc-800 bg-zinc-900/50">
      
      {/* Mode Toggle Tabs */}
      <div className="flex border-b border-zinc-800 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setMode(GenerationMode.IMAGE)}
          className={`flex-1 min-w-[80px] py-4 text-xs lg:text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            config.mode === GenerationMode.IMAGE ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Image
          {config.mode === GenerationMode.IMAGE && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          )}
        </button>
        <button
          onClick={() => setMode(GenerationMode.MODEL_3D)}
          className={`flex-1 min-w-[80px] py-4 text-xs lg:text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            config.mode === GenerationMode.MODEL_3D ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Box className="w-4 h-4" /> 3D Gen
          {config.mode === GenerationMode.MODEL_3D && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          )}
        </button>
        <button
          onClick={() => setMode(GenerationMode.ANIMATOR)}
          className={`flex-1 min-w-[80px] py-4 text-xs lg:text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            config.mode === GenerationMode.ANIMATOR ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Cube className="w-4 h-4" /> Animator
          {config.mode === GenerationMode.ANIMATOR && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          )}
        </button>
        <button
          onClick={() => setMode(GenerationMode.THUMBNAIL)}
          className={`flex-1 min-w-[80px] py-4 text-xs lg:text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            config.mode === GenerationMode.THUMBNAIL ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Layout className="w-4 h-4" /> Thumb
          {config.mode === GenerationMode.THUMBNAIL && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          )}
        </button>
        <button
          onClick={() => setMode(GenerationMode.AUDIO)}
          className={`flex-1 min-w-[80px] py-4 text-xs lg:text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
            config.mode === GenerationMode.AUDIO ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Mic className="w-4 h-4" /> Speech
          {config.mode === GenerationMode.AUDIO && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
          )}
        </button>
      </div>

      <div className="flex flex-col gap-6 p-4 lg:p-6 overflow-y-auto custom-scrollbar">
        
        {/* AUDIO: INPUT SOURCE SELECTOR */}
        {config.mode === GenerationMode.AUDIO && (
            <div className="bg-zinc-950 p-1 rounded-lg flex border border-zinc-800">
                <button 
                    onClick={() => switchInputType('text')}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${inputType === 'text' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Text to Speech
                </button>
                <button 
                    onClick={() => switchInputType('mic')}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${inputType === 'mic' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Speech to Speech
                </button>
            </div>
        )}

        {/* AUDIO: RECORDING UI */}
        {config.mode === GenerationMode.AUDIO && inputType === 'mic' && (
            <div className="space-y-4">
                 <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-4 min-h-[160px]">
                    {!config.audioInput && !isRecording && (
                        <>
                             <button 
                                onClick={startRecording}
                                className="w-16 h-16 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-all group border border-red-500/30"
                            >
                                <Mic className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                            </button>
                            <span className="text-sm text-zinc-500">Tap to record</span>
                        </>
                    )}

                    {isRecording && (
                        <>
                            <div className="text-2xl font-mono text-red-400 font-bold animate-pulse">
                                {formatDuration(recordingDuration)}
                            </div>
                             <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                                <span className="text-xs text-zinc-400">Recording...</span>
                             </div>
                            <button 
                                onClick={stopRecording}
                                className="mt-2 w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center transition-all border border-zinc-700"
                            >
                                <Square className="w-4 h-4 fill-current" />
                            </button>
                        </>
                    )}

                    {config.audioInput && !isRecording && (
                        <div className="w-full">
                            <audio controls src={config.audioInput} className="w-full h-8 mb-4 custom-audio" />
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                    Audio recorded
                                </span>
                                <button 
                                    onClick={deleteRecording}
                                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" /> Record Again
                                </button>
                            </div>
                        </div>
                    )}
                 </div>
            </div>
        )}

        {/* Prompt Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 flex items-center justify-between">
            {getLabel()}
            <span className="text-xs text-zinc-500">{config.prompt.length}/1000</span>
          </label>
          <textarea
            value={config.prompt}
            onChange={handlePromptChange}
            placeholder={getPlaceholder()}
            className="w-full h-28 bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all"
            maxLength={1000}
          />
        </div>
        
        {/* REFERENCE IMAGE UPLOAD (For Image & Thumbnail modes) */}
        {(config.mode === GenerationMode.IMAGE || config.mode === GenerationMode.THUMBNAIL) && (
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center justify-between">
                    Reference Image <span className="text-xs text-zinc-500">Optional</span>
                </label>
                
                {!config.referenceImage ? (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-zinc-700 hover:border-indigo-500 hover:bg-zinc-800/50 rounded-xl p-4 cursor-pointer transition-all group flex flex-col items-center justify-center gap-2 text-zinc-500 h-24"
                    >
                        <Upload className="w-5 h-5 group-hover:text-indigo-400" />
                        <span className="text-xs group-hover:text-zinc-300">Upload image to guide generation</span>
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileUpload} 
                        />
                    </div>
                ) : (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-700 group h-40">
                        <img 
                            src={config.referenceImage} 
                            alt="Reference" 
                            className="w-full h-full object-cover opacity-80"
                        />
                        <button 
                            onClick={clearReferenceImage}
                            className="absolute top-2 right-2 bg-black/60 hover:bg-red-500/80 p-1.5 rounded-full text-white backdrop-blur-sm transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-2 text-xs text-zinc-300 truncate text-center">
                            Reference active (Gemini Flash only)
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* THUMBNAIL SPECIFIC: Text Overlay */}
        {config.mode === GenerationMode.THUMBNAIL && (
            <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300 flex items-center justify-between">
                    Text Overlay <span className="text-xs text-zinc-500">Optional</span>
                </label>
                <input 
                    type="text"
                    value={config.thumbnailTitle || ''}
                    onChange={(e) => setConfig(prev => ({...prev, thumbnailTitle: e.target.value}))}
                    placeholder="e.g. 'INSANE RESULTS!'"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
            </div>
        )}
        
        {/* 3D MODEL SPECIFIC: CONTROLS */}
        {config.mode === GenerationMode.MODEL_3D && (
            <div className="space-y-6">
                <div className="space-y-3 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
                    <label className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        <Move className="w-3 h-3" /> Character Rigging
                    </label>
                    
                    <div className="grid grid-cols-2 gap-3">
                         <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 uppercase">Pose / Action</span>
                            <select 
                                value={config.modelPose}
                                onChange={(e) => setConfig(prev => ({ ...prev, modelPose: e.target.value as ModelPose }))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2 px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="t-pose">T-Pose (Reference)</option>
                                <option value="standing">Standing Idle</option>
                                <option value="walking">Walking</option>
                                <option value="running">Running</option>
                                <option value="action">Combat / Action</option>
                                <option value="sitting">Sitting</option>
                            </select>
                         </div>
                         <div className="space-y-1">
                            <span className="text-[10px] text-zinc-500 uppercase">Camera View</span>
                            <select 
                                value={config.modelView}
                                onChange={(e) => setConfig(prev => ({ ...prev, modelView: e.target.value as ModelView }))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2 px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="front">Front View</option>
                                <option value="isometric">Isometric</option>
                                <option value="side">Side Profile</option>
                                <option value="back">Back View</option>
                                <option value="top">Top Down</option>
                            </select>
                         </div>
                         <div className="space-y-1 col-span-2">
                            <span className="text-[10px] text-zinc-500 uppercase">Material / Style</span>
                            <select 
                                value={config.modelMaterial}
                                onChange={(e) => setConfig(prev => ({ ...prev, modelMaterial: e.target.value as ModelMaterial }))}
                                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg py-2 px-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="realistic">Realistic (Unreal Engine 5)</option>
                                <option value="clay">Clay Render (Blender)</option>
                                <option value="low-poly">Low Poly (Game Asset)</option>
                                <option value="voxel">Voxel (Minecraft Style)</option>
                                <option value="anime">Anime 3D (Cel Shaded)</option>
                                <option value="gold">Gold Material</option>
                            </select>
                         </div>
                    </div>
                </div>
            </div>
        )}

        {/* IMAGE & THUMBNAIL CONTROLS */}
        {(config.mode === GenerationMode.IMAGE || config.mode === GenerationMode.THUMBNAIL) && (
          <div className="space-y-6">
            {/* Model Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-3 h-3" /> Model
              </label>
              <div className="relative">
                <select
                  value={config.model}
                  onChange={handleModelChange}
                  className="w-full appearance-none bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={ModelType.FLASH}>Gemini 2.5 Flash (Fastest + Ref Image)</option>
                  <option value={ModelType.IMAGEN}>Imagen 3 (Best for Text)</option>
                </select>
                <div className="absolute right-3 top-3 pointer-events-none">
                  <svg className="w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {config.model === ModelType.IMAGEN && config.referenceImage && (
                  <p className="text-[10px] text-yellow-500/80">Note: Reference images are not supported by Imagen 3 in this mode. Switch to Flash to use the reference.</p>
              )}
            </div>

            {/* Style Mixer */}
            <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-3 h-3" /> {config.mode === GenerationMode.THUMBNAIL ? 'Thumbnail Vibe' : 'Style Mixer'}
                    <span className="text-xs font-normal text-zinc-600 ml-auto lowercase">select up to 3</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                    {activeStyles.map((style) => {
                        const isSelected = config.stylePrompts?.includes(style.prompt);
                        return (
                            <button
                                key={style.id}
                                onClick={() => toggleStyle(style.prompt)}
                                className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all text-left truncate ${
                                    isSelected
                                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                                }`}
                                title={style.name}
                            >
                                {style.name}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Aspect Ratio (Hidden/Locked for Thumbnail) */}
            {config.mode !== GenerationMode.THUMBNAIL && (
                <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-2">
                    {[AspectRatio.SQUARE, AspectRatio.LANDSCAPE_16_9, AspectRatio.PORTRAIT_9_16].map((ratio) => (
                    <button
                        key={ratio}
                        onClick={() => setConfig(prev => ({ ...prev, aspectRatio: ratio }))}
                        className={`flex items-center justify-center py-2 rounded-lg border text-sm transition-all ${
                        config.aspectRatio === ratio
                            ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                    >
                        {ratio}
                    </button>
                    ))}
                </div>
                </div>
            )}

            {/* Image Count */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Copy className="w-3 h-3" /> Batch Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    onClick={() => setConfig(prev => ({ ...prev, count: num }))}
                    className={`flex items-center justify-center py-2 rounded-lg border text-sm transition-all ${
                      (config.count || 1) === num
                        ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* AUDIO MODE CONTROLS */}
        {config.mode === GenerationMode.AUDIO && (
          <div className="space-y-6">
            {/* Voice Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                <Volume2 className="w-3 h-3" /> Voice Selection
              </label>
              <div className="grid grid-cols-1 gap-2">
                {VOICES.map((v) => (
                   <button
                   key={v.id}
                   onClick={() => setConfig(prev => ({ ...prev, voice: v.id }))}
                   className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all ${
                     config.voice === v.id
                       ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400'
                       : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                   }`}
                 >
                   <span>{v.name}</span>
                   <span className="text-xs text-zinc-600">{v.gender}</span>
                 </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto p-4 lg:p-6 pt-0">
        <button
          onClick={onGenerate}
          disabled={isLoading || (!config.prompt.trim() && !config.audioInput)}
          className={`w-full py-4 rounded-xl font-semibold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all ${
            isLoading || (!config.prompt.trim() && !config.audioInput)
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 transform hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {isLoading ? (
            <>Generating...</>
          ) : (
            <>
              Generate {config.mode === GenerationMode.AUDIO ? 'Speech' : config.mode === GenerationMode.THUMBNAIL ? 'Thumbnail' : config.mode === GenerationMode.MODEL_3D ? '3D Model' : 'Image'}
              <Zap className="w-4 h-4 fill-current" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ControlPanel;