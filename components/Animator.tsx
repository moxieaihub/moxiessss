
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GenerationConfig, Bone, Vector3, Export3DFormat, MeshGeometry, ModelPose, ModelView } from '../types';
// Import Bone from Icons as BoneIcon to avoid name collision with Bone type from types
import { 
  Cursor, Move, Rotate3D, Scale, Cube, Mesh, Play, Pause, 
  Keyframe, Eye, Lock, Zap, Loader2, Download, Settings, Layers, Box, 
  ChevronRight, ChevronDown, Plus, Minus, Wand2, Bone as BoneIcon
} from './Icons';
import { generate3DMesh } from '../services/geminiService';

interface AnimatorProps {
    config: GenerationConfig;
    setConfig: React.Dispatch<React.SetStateAction<GenerationConfig>>;
    onExit: () => void;
}

// BONE STRUCTURE for Rigging
const BONES: { id: Bone; label: string; parent?: Bone; defaultPos: Vector3; influenceY: [number, number] }[] = [
    { id: 'head', label: 'Head', defaultPos: { x: 0, y: 1.6, z: 0 }, influenceY: [1.4, 2.0] },
    { id: 'torso', label: 'Torso', defaultPos: { x: 0, y: 1.0, z: 0 }, influenceY: [0.6, 1.4] },
    { id: 'left-arm', label: 'Arm.L', parent: 'torso', defaultPos: { x: -0.6, y: 1.3, z: 0 }, influenceY: [1.1, 1.5] },
    { id: 'right-arm', label: 'Arm.R', parent: 'torso', defaultPos: { x: 0.6, y: 1.3, z: 0 }, influenceY: [1.1, 1.5] },
    { id: 'left-leg', label: 'Leg.L', parent: 'torso', defaultPos: { x: -0.3, y: 0.5, z: 0 }, influenceY: [0, 0.7] },
    { id: 'right-leg', label: 'Leg.R', parent: 'torso', defaultPos: { x: 0.3, y: 0.5, z: 0 }, influenceY: [0, 0.7] },
];

const POSES: { id: ModelPose; label: string }[] = [
    { id: 't-pose', label: 'T-Pose' },
    { id: 'standing', label: 'Standing' },
    { id: 'walking', label: 'Walking' },
    { id: 'running', label: 'Running' },
    { id: 'action', label: 'Action' },
    { id: 'sitting', label: 'Sitting' },
];

const VIEWS: { id: ModelView; label: string; rot: { x: number; y: number } }[] = [
    { id: 'front', label: 'Front', rot: { x: 0, y: 0 } },
    { id: 'isometric', label: 'Isometric', rot: { x: 30, y: 45 } },
    { id: 'side', label: 'Side', rot: { x: 0, y: 90 } },
    { id: 'back', label: 'Back', rot: { x: 0, y: 180 } },
    { id: 'top', label: 'Top', rot: { x: 90, y: 0 } },
];

const Animator: React.FC<AnimatorProps> = ({ config, setConfig, onExit }) => {
    // UI State
    const [currentTool, setCurrentTool] = useState<'select' | 'move' | 'rotate' | 'scale'>('move');
    const [selectedBone, setSelectedBone] = useState<Bone | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activePose, setActivePose] = useState<ModelPose>('t-pose');
    const [activeView, setActiveView] = useState<ModelView>('isometric');
    
    // 3D Engine State
    const [mesh, setMesh] = useState<MeshGeometry | null>(null);
    const [rotation, setRotation] = useState({ x: 30, y: 45 }); // Camera rotation
    const [cameraZoom, setCameraZoom] = useState(1); // Camera Zoom
    const isDraggingRef = useRef(false);
    const lastMouseRef = useRef({ x: 0, y: 0 });

    // Gizmo State
    const [activeGizmoAxis, setActiveGizmoAxis] = useState<'x' | 'y' | 'z' | null>(null);
    const gizmoDragRef = useRef<{ startX: number, startY: number, startVal: number } | null>(null);

    // Rigging State
    const [bonePositions, setBonePositions] = useState<Record<Bone, Vector3>>(
        BONES.reduce((acc, bone) => ({ ...acc, [bone.id]: { ...bone.defaultPos } }), {} as Record<Bone, Vector3>)
    );

    const handleGenerateModel = async () => {
        if (!config.prompt) return;
        setIsLoading(true);
        try {
            const enhancedPrompt = `${config.prompt}. Pose: ${activePose}. View: ${activeView}. Low-poly 3D asset.`;
            const geometry = await generate3DMesh(enhancedPrompt);
            setMesh(geometry);
        } catch (e) {
            console.error(e);
            alert("Failed to generate model.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePoseSelect = (pose: ModelPose) => {
        setActivePose(pose);
        // Reset to default then apply minor offsets for visual variety if needed
        // In a real app, this would apply pre-baked coordinates for each pose
        setBonePositions(BONES.reduce((acc, bone) => ({ ...acc, [bone.id]: { ...bone.defaultPos } }), {} as Record<Bone, Vector3>));
    };

    const handleViewSelect = (view: ModelView) => {
        setActiveView(view);
        const viewConfig = VIEWS.find(v => v.id === view);
        if (viewConfig) {
            setRotation(viewConfig.rot);
        }
    };

    // --- 3D MATH ENGINE ---

    // Project 3D point to 2D screen space
    const project = (x: number, y: number, z: number) => {
        const radY = (rotation.y * Math.PI) / 180;
        const x1 = x * Math.cos(radY) - z * Math.sin(radY);
        const z1 = x * Math.sin(radY) + z * Math.cos(radY);

        const radX = (rotation.x * Math.PI) / 180;
        const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
        const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);

        const scale = (400 * cameraZoom) / (z2 + 5); 
        
        return {
            x: 400 + x1 * 150 * scale,
            y: 300 - y2 * 150 * scale,
            depth: z2,
            scale 
        };
    };

    const getSkinnedVertex = (v: number[]) => {
        const [vx, vy, vz] = v;
        let influence = { x: 0, y: 0, z: 0 };
        let weightTotal = 0;

        BONES.forEach(bone => {
            const [minY, maxY] = bone.influenceY;
            if (vy >= minY && vy <= maxY) {
                const isLeft = bone.id.includes('left') || bone.id.includes('.L');
                const isRight = bone.id.includes('right') || bone.id.includes('.R');
                
                if (isLeft && vx > 0) return; 
                if (isRight && vx < 0) return; 

                const currentPos = bonePositions[bone.id];
                const defaultPos = bone.defaultPos;
                
                influence.x += (currentPos.x - defaultPos.x);
                influence.y += (currentPos.y - defaultPos.y);
                influence.z += (currentPos.z - defaultPos.z);
                weightTotal += 1;
            }
        });

        if (weightTotal > 0) {
            return [vx + influence.x, vy + influence.y, vz + influence.z];
        }
        return [vx, vy, vz];
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (activeGizmoAxis) return;
        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (activeGizmoAxis && selectedBone && gizmoDragRef.current) {
            const dx = e.clientX - gizmoDragRef.current.startX;
            const dy = e.clientY - gizmoDragRef.current.startY;
            
            const pos = bonePositions[selectedBone];
            const origin = project(pos.x, pos.y, pos.z);
            
            const axisVec = { x: pos.x, y: pos.y, z: pos.z };
            axisVec[activeGizmoAxis] += 0.5;
            const projectedAxis = project(axisVec.x, axisVec.y, axisVec.z);
            
            const screenVecX = projectedAxis.x - origin.x;
            const screenVecY = projectedAxis.y - origin.y;
            
            const len = Math.sqrt(screenVecX * screenVecX + screenVecY * screenVecY);
            const normX = len > 0 ? screenVecX / len : 0;
            const normY = len > 0 ? screenVecY / len : 0;
            
            const projection = dx * normX + dy * normY;
            const sensitivity = 0.005 / cameraZoom; 
            const newVal = gizmoDragRef.current.startVal + projection * sensitivity * (1000 / (len || 1)); 

            handleBoneChange(activeGizmoAxis, newVal);
            return;
        }

        if (isDraggingRef.current) {
            const dx = e.clientX - lastMouseRef.current.x;
            const dy = e.clientY - lastMouseRef.current.y;
            
            setRotation(prev => ({
                x: Math.max(-90, Math.min(90, prev.x + dy * 0.5)),
                y: prev.y + dx * 0.5
            }));
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
        }
    };

    const handleMouseUp = () => {
        isDraggingRef.current = false;
        setActiveGizmoAxis(null);
        gizmoDragRef.current = null;
    };

    const handleWheel = (e: React.WheelEvent) => {
        setCameraZoom(prev => {
            const newZoom = prev - e.deltaY * 0.001;
            return Math.max(0.1, Math.min(5, newZoom));
        });
    };

    const handleGizmoMouseDown = (e: React.MouseEvent, axis: 'x' | 'y' | 'z') => {
        e.stopPropagation(); 
        if (!selectedBone) return;
        
        setActiveGizmoAxis(axis);
        gizmoDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startVal: bonePositions[selectedBone][axis]
        };
    };

    const RenderedMesh = useMemo(() => {
        if (!mesh) return null;
        const transformedVertices = mesh.vertices.map(v => getSkinnedVertex(v));
        const facesToRender = mesh.faces.map(face => {
            const v1 = transformedVertices[face[0]];
            const v2 = transformedVertices[face[1]];
            const v3 = transformedVertices[face[2]];
            const color = face[3] || '#cccccc'; 
            const p1 = project(v1[0], v1[1], v1[2]);
            const p2 = project(v2[0], v2[1], v2[2]);
            const p3 = project(v3[0], v3[1], v3[2]);
            const depth = (p1.depth + p2.depth + p3.depth) / 3;
            return { points: [p1, p2, p3], color, depth };
        });
        facesToRender.sort((a, b) => b.depth - a.depth);
        return (
            <g>
                {facesToRender.map((f, i) => (
                    <polygon 
                        key={i}
                        points={`${f.points[0].x},${f.points[0].y} ${f.points[1].x},${f.points[1].y} ${f.points[2].x},${f.points[2].y}`}
                        fill={f.color as string}
                        stroke="rgba(0,0,0,0.1)"
                        strokeWidth="0.5"
                    />
                ))}
            </g>
        );
    }, [mesh, rotation, bonePositions, cameraZoom]);

    const handleBoneChange = (axis: 'x'|'y'|'z', val: number) => {
        if (!selectedBone) return;
        setBonePositions(prev => ({
            ...prev,
            [selectedBone]: {
                ...prev[selectedBone],
                [axis]: val
            }
        }));
    };

    const RenderGizmos = () => {
        if (!selectedBone) return null;
        const pos = bonePositions[selectedBone];
        const origin = project(pos.x, pos.y, pos.z);
        const axisLength = 0.8;
        const pX = project(pos.x + axisLength, pos.y, pos.z);
        const pY = project(pos.x, pos.y + axisLength, pos.z);
        const pZ = project(pos.x, pos.y, pos.z + axisLength);
        const colorX = activeGizmoAxis === 'x' ? '#ffffff' : '#ef4444'; 
        const colorY = activeGizmoAxis === 'y' ? '#ffffff' : '#22c55e'; 
        const colorZ = activeGizmoAxis === 'z' ? '#ffffff' : '#3b82f6'; 

        const ScaleTip = ({ x, y, color }: { x: number, y: number, color: string }) => (
            <rect x={x - 4} y={y - 4} width="8" height="8" fill={color} stroke="black" strokeWidth="1" />
        );

        const ArrowTip = ({ x, y, originX, originY, color }: { x: number, y: number, originX: number, originY: number, color: string }) => {
            const angle = Math.atan2(y - originY, x - originX) * 180 / Math.PI + 90;
            return <polygon points={`${x},${y} ${x-4},${y+8} ${x+4},${y+8}`} fill={color} transform={`rotate(${angle} ${x} ${y})`} />;
        };

        return (
            <g className="cursor-pointer" style={{ pointerEvents: 'bounding-box' as any }}>
                <line x1={origin.x} y1={origin.y} x2={pZ.x} y2={pZ.y} stroke={colorZ} strokeWidth="3" onMouseDown={(e) => handleGizmoMouseDown(e, 'z')} />
                {(currentTool === 'move' || currentTool === 'select') && <ArrowTip x={pZ.x} y={pZ.y} originX={origin.x} originY={origin.y} color={colorZ} />}
                {currentTool === 'scale' && <ScaleTip x={pZ.x} y={pZ.y} color={colorZ} />}
                
                <line x1={origin.x} y1={origin.y} x2={pY.x} y2={pY.y} stroke={colorY} strokeWidth="3" onMouseDown={(e) => handleGizmoMouseDown(e, 'y')} />
                {(currentTool === 'move' || currentTool === 'select') && <ArrowTip x={pY.x} y={pY.y} originX={origin.x} originY={origin.y} color={colorY} />}
                {currentTool === 'scale' && <ScaleTip x={pY.x} y={pY.y} color={colorY} />}

                <line x1={origin.x} y1={origin.y} x2={pX.x} y2={pX.y} stroke={colorX} strokeWidth="3" onMouseDown={(e) => handleGizmoMouseDown(e, 'x')} />
                {(currentTool === 'move' || currentTool === 'select') && <ArrowTip x={pX.x} y={pX.y} originX={origin.x} originY={origin.y} color={colorX} />}
                {currentTool === 'scale' && <ScaleTip x={pX.x} y={pX.y} color={colorX} />}
                
                <circle cx={origin.x} cy={origin.y} r="4" fill="white" stroke="black" />
            </g>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-[#1d1d1d] text-[#cfcfcf] font-sans overflow-hidden">
            {/* Header */}
            <div className="h-10 bg-[#2d2d2d] border-b border-black flex items-center px-4 justify-between select-none shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-black uppercase text-[10px] tracking-widest">
                         <Cube className="w-4 h-4" /> Animator Master Engine
                    </div>
                </div>
                <button onClick={onExit} className="text-[10px] font-black uppercase tracking-widest bg-[#3d3d3d] px-4 py-1.5 rounded-lg hover:bg-[#4d4d4d] border border-black/50 transition-all active:scale-95">
                    Discard Workspace
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Tools */}
                <div className="w-12 bg-[#2d2d2d] border-r border-black flex flex-col items-center py-4 gap-4 z-30">
                    <button onClick={() => setCurrentTool('select')} className={`p-2 rounded-xl transition-all ${currentTool === 'select' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-[#4d4d4d] text-zinc-500'}`} title="Select Entity">
                        <Cursor className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentTool('move')} className={`p-2 rounded-xl transition-all ${currentTool === 'move' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-[#4d4d4d] text-zinc-500'}`} title="Translate (G)">
                        <Move className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentTool('rotate')} className={`p-2 rounded-xl transition-all ${currentTool === 'rotate' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-[#4d4d4d] text-zinc-500'}`} title="Orbit Camera">
                        <Rotate3D className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentTool('scale')} className={`p-2 rounded-xl transition-all ${currentTool === 'scale' ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-[#4d4d4d] text-zinc-500'}`} title="Scale (S)">
                        <Scale className="w-4 h-4" />
                    </button>
                    <div className="h-px w-6 bg-zinc-800 my-2" />
                    <button className="p-2 rounded-xl hover:bg-[#4d4d4d] text-zinc-500" title="Rig Constraints">
                        <Lock className="w-4 h-4" />
                    </button>
                </div>

                {/* 3D Viewport */}
                <div 
                    className="flex-1 relative bg-[#111111] overflow-hidden flex flex-col"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <div className="h-10 bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 pointer-events-none select-none">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#666]">Perspective View | Rot: {Math.round(rotation.x)}°, {Math.round(rotation.y)}°</span>
                        <div className="flex gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/50">Rig Active</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#666]">Zoom: {cameraZoom.toFixed(2)}x</span>
                        </div>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center cursor-move">
                         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                             style={{ 
                                 backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                                 backgroundSize: `${40 * cameraZoom}px ${40 * cameraZoom}px`,
                                 transform: `perspective(1000px) rotateX(${rotation.x + 40}deg) rotateZ(${rotation.y}deg) scale(3)`
                             }}
                         ></div>

                         <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 600">
                             {RenderedMesh}

                             {BONES.map(bone => {
                                 const pos = bonePositions[bone.id];
                                 const p = project(pos.x, pos.y, pos.z);
                                 let pParent = null;
                                 if (bone.parent) {
                                     const parentPos = bonePositions[bone.parent];
                                     pParent = project(parentPos.x, parentPos.y, parentPos.z);
                                 }
                                 return (
                                     <g key={bone.id} className="pointer-events-auto">
                                         {pParent && <line x1={pParent.x} y1={pParent.y} x2={p.x} y2={p.y} stroke="#6366f1" strokeWidth="2" strokeDasharray="4 2" className="opacity-40" />}
                                         <circle 
                                             cx={p.x} cy={p.y} r={selectedBone === bone.id ? 8 : 5} 
                                             fill={selectedBone === bone.id ? '#6366f1' : '#333'}
                                             stroke={selectedBone === bone.id ? '#fff' : '#6366f1'}
                                             strokeWidth="2"
                                             className="cursor-pointer transition-all duration-300"
                                             onClick={(e) => { e.stopPropagation(); setSelectedBone(bone.id); }}
                                         />
                                     </g>
                                 );
                             })}
                             
                             <RenderGizmos />
                         </svg>

                         {!mesh && (
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                 <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 mx-auto mb-6 shadow-2xl">
                                     <Cube className="w-10 h-10 opacity-20 text-indigo-500 animate-pulse" />
                                 </div>
                                 <h2 className="text-xl font-black uppercase text-white tracking-[0.2em] mb-2">Initialize Canvas</h2>
                                 <p className="text-[#444] text-[10px] font-black uppercase tracking-widest italic">Provide scene semantics below</p>
                             </div>
                         )}
                    </div>

                    <div className="absolute bottom-6 left-6 p-5 bg-[#1d1d1d]/95 backdrop-blur-xl border border-zinc-800 rounded-[28px] shadow-2xl w-80 z-20 overflow-hidden">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="w-4 h-4 text-indigo-500 fill-current" />
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Geometric Synthesis</h3>
                        </div>
                        <textarea 
                            value={config.prompt}
                            onChange={(e) => setConfig(prev => ({...prev, prompt: e.target.value}))}
                            placeholder="Describe character geometry..."
                            className="w-full h-20 bg-black border border-zinc-800 text-[11px] p-3 text-white mb-4 resize-none focus:outline-none focus:border-indigo-600 rounded-2xl placeholder:text-zinc-800 uppercase tracking-widest font-black"
                        />
                        <button 
                            onClick={handleGenerateModel}
                            disabled={isLoading || !config.prompt}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] text-white rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>} 
                            {isLoading ? "Synthesizing..." : "Sync Geometry"}
                        </button>
                    </div>
                </div>

                {/* Right Panel (Properties & Rigging Presets) */}
                <div className="w-72 bg-[#1d1d1d] border-l border-black flex flex-col p-6 overflow-y-auto custom-scrollbar z-20">
                    <div className="space-y-8">
                        {/* Pose Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Global Pose</h4>
                                <Move className="w-3.5 h-3.5 text-indigo-500/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {POSES.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => handlePoseSelect(p.id)}
                                        className={`py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${activePose === p.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* View Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Perspective</h4>
                                <Eye className="w-3.5 h-3.5 text-indigo-500/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {VIEWS.map(v => (
                                    <button 
                                        key={v.id}
                                        onClick={() => handleViewSelect(v.id)}
                                        className={`py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${activeView === v.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-black border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                                    >
                                        {v.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-zinc-800" />

                        {/* Bone Properties */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Component Data</h4>
                                <BoneIcon className="w-3.5 h-3.5 text-indigo-500/50" />
                            </div>
                            {selectedBone ? (
                                <div className="space-y-4">
                                    <div className="bg-indigo-600/10 border border-indigo-600/40 rounded-xl p-3">
                                        <span className="text-[11px] font-black uppercase text-indigo-400">{BONES.find(b => b.id === selectedBone)?.label}</span>
                                    </div>
                                    <div className="space-y-3">
                                        {['x', 'y', 'z'].map((axis) => (
                                            <div key={axis} className="flex items-center gap-3">
                                                <span className="uppercase text-zinc-700 font-black text-[10px] w-4">{axis}</span>
                                                <input 
                                                    type="number" 
                                                    step="0.05"
                                                    value={bonePositions[selectedBone][axis as 'x'|'y'|'z']}
                                                    onChange={(e) => handleBoneChange(axis as 'x'|'y'|'z', parseFloat(e.target.value))}
                                                    className="flex-1 bg-black border border-zinc-800 px-3 py-2 text-[11px] font-mono text-white rounded-xl focus:border-indigo-600 outline-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3 border border-dashed border-zinc-800 rounded-3xl opacity-30">
                                    <Cursor className="w-6 h-6 text-zinc-600" />
                                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-700">Select Bone Module</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Animator;
