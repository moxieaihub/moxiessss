import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GenerationConfig, Bone, Vector3, Export3DFormat, MeshGeometry } from '../types';
import { 
  Cursor, Move, Rotate3D, Scale, Cube, Mesh, Play, Pause, 
  Keyframe, Eye, Lock, Zap, Loader2, Download, Settings, Layers, Box, 
  ChevronRight, ChevronDown, Plus, Minus
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

const Animator: React.FC<AnimatorProps> = ({ config, setConfig, onExit }) => {
    // UI State
    const [currentTool, setCurrentTool] = useState<'select' | 'move' | 'rotate' | 'scale'>('move');
    const [selectedBone, setSelectedBone] = useState<Bone | null>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // 3D Engine State
    const [mesh, setMesh] = useState<MeshGeometry | null>(null);
    const [rotation, setRotation] = useState({ x: 15, y: 45 }); // Camera rotation
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
            const geometry = await generate3DMesh(config.prompt);
            setMesh(geometry);
        } catch (e) {
            console.error(e);
            alert("Failed to generate model.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- 3D MATH ENGINE ---

    // Project 3D point to 2D screen space
    const project = (x: number, y: number, z: number) => {
        // 1. Rotate around Y axis
        const radY = (rotation.y * Math.PI) / 180;
        const x1 = x * Math.cos(radY) - z * Math.sin(radY);
        const z1 = x * Math.sin(radY) + z * Math.cos(radY);

        // 2. Rotate around X axis
        const radX = (rotation.x * Math.PI) / 180;
        const y2 = y * Math.cos(radX) - z1 * Math.sin(radX);
        const z2 = y * Math.sin(radX) + z1 * Math.cos(radX);

        // 3. Perspective Projection
        // Apply Zoom to the scale calculation
        const scale = (400 * cameraZoom) / (z2 + 5); // +5 is camera distance
        
        // Center on screen (400x400 canvas approx)
        return {
            x: 400 + x1 * 150 * scale,
            y: 300 - y2 * 150 * scale,
            depth: z2,
            scale // Return scale for sizing gizmos relative to distance
        };
    };

    // Calculate deformed vertex position based on bone positions (Simple Linear Blend Skinning)
    const getSkinnedVertex = (v: number[]) => {
        const [vx, vy, vz] = v;
        
        // Find closest bone / influencing bone
        // Simple heuristic based on Y height and X side
        let influence = { x: 0, y: 0, z: 0 };
        let weightTotal = 0;

        BONES.forEach(bone => {
            // Check if vertex is in bone's Y range
            const [minY, maxY] = bone.influenceY;
            if (vy >= minY && vy <= maxY) {
                // Determine side for arms/legs
                const isLeft = bone.id.includes('left') || bone.id.includes('.L');
                const isRight = bone.id.includes('right') || bone.id.includes('.R');
                
                if (isLeft && vx > 0) return; // Wrong side
                if (isRight && vx < 0) return; // Wrong side

                // Calculate displacement from default pose
                const currentPos = bonePositions[bone.id];
                const defaultPos = bone.defaultPos;
                
                const dx = currentPos.x - defaultPos.x;
                const dy = currentPos.y - defaultPos.y;
                const dz = currentPos.z - defaultPos.z;

                influence.x += dx;
                influence.y += dy;
                influence.z += dz;
                weightTotal += 1;
            }
        });

        if (weightTotal > 0) {
            return [vx + influence.x, vy + influence.y, vz + influence.z];
        }
        return [vx, vy, vz];
    };

    // --- INPUT HANDLERS ---

    const handleMouseDown = (e: React.MouseEvent) => {
        // If clicking a gizmo, stop camera orbit
        if (activeGizmoAxis) return;

        isDraggingRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        // GIZMO DRAG LOGIC
        if (activeGizmoAxis && selectedBone && gizmoDragRef.current) {
            const dx = e.clientX - gizmoDragRef.current.startX;
            const dy = e.clientY - gizmoDragRef.current.startY;
            
            // Calculate screen vector of the active axis to map mouse movement
            const pos = bonePositions[selectedBone];
            const origin = project(pos.x, pos.y, pos.z);
            
            // Project a point slightly further along the active axis to determine direction
            const axisVec = { x: pos.x, y: pos.y, z: pos.z };
            axisVec[activeGizmoAxis] += 0.5;
            const projectedAxis = project(axisVec.x, axisVec.y, axisVec.z);
            
            const screenVecX = projectedAxis.x - origin.x;
            const screenVecY = projectedAxis.y - origin.y;
            
            // Normalize screen vector
            const len = Math.sqrt(screenVecX * screenVecX + screenVecY * screenVecY);
            const normX = len > 0 ? screenVecX / len : 0;
            const normY = len > 0 ? screenVecY / len : 0;
            
            // Project mouse delta onto axis vector (dot product)
            const projection = dx * normX + dy * normY;
            
            // Scale sensitivity
            const sensitivity = 0.005 / cameraZoom; 
            const newVal = gizmoDragRef.current.startVal + projection * sensitivity * (1000 / (len || 1)); 

            handleBoneChange(activeGizmoAxis, newVal);
            return;
        }

        // CAMERA ORBIT LOGIC
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
        e.stopPropagation(); // Prevent camera orbit
        if (!selectedBone) return;
        
        setActiveGizmoAxis(axis);
        gizmoDragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startVal: bonePositions[selectedBone][axis]
        };
    };

    // --- RENDERER ---
    const RenderedMesh = useMemo(() => {
        if (!mesh) return null;

        // 1. Transform all vertices based on Skeleton (Rigging)
        const transformedVertices = mesh.vertices.map(v => getSkinnedVertex(v));

        // 2. Project all faces to 2D
        const facesToRender = mesh.faces.map(face => {
            const v1 = transformedVertices[face[0]];
            const v2 = transformedVertices[face[1]];
            const v3 = transformedVertices[face[2]];
            const color = face[3] || '#cccccc'; // Default color

            const p1 = project(v1[0], v1[1], v1[2]);
            const p2 = project(v2[0], v2[1], v2[2]);
            const p3 = project(v3[0], v3[1], v3[2]);

            // Calculate average depth for sorting
            const depth = (p1.depth + p2.depth + p3.depth) / 3;

            return { points: [p1, p2, p3], color, depth };
        });

        // 3. Painter's Algorithm: Sort by depth (far to near)
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

    // Helper to render gizmo axes
    const RenderGizmos = () => {
        if (!selectedBone) return null;
        
        const pos = bonePositions[selectedBone];
        const origin = project(pos.x, pos.y, pos.z);
        const axisLength = 0.8;
        
        // Project axis endpoints
        const pX = project(pos.x + axisLength, pos.y, pos.z);
        const pY = project(pos.x, pos.y + axisLength, pos.z);
        const pZ = project(pos.x, pos.y, pos.z + axisLength);

        // Gizmo Colors
        const colorX = activeGizmoAxis === 'x' ? '#ffffff' : '#ef4444'; // Red
        const colorY = activeGizmoAxis === 'y' ? '#ffffff' : '#22c55e'; // Green
        const colorZ = activeGizmoAxis === 'z' ? '#ffffff' : '#3b82f6'; // Blue

        // Shapes based on Tool
        const ScaleTip = ({ x, y, color }: { x: number, y: number, color: string }) => (
            <rect x={x - 4} y={y - 4} width="8" height="8" fill={color} stroke="black" strokeWidth="1" />
        );

        const ArrowTip = ({ x, y, originX, originY, color }: { x: number, y: number, originX: number, originY: number, color: string }) => {
            const angle = Math.atan2(y - originY, x - originX) * 180 / Math.PI + 90;
            return <polygon points={`${x},${y} ${x-4},${y+8} ${x+4},${y+8}`} fill={color} transform={`rotate(${angle} ${x} ${y})`} />;
        };

        return (
            <g className="cursor-pointer" style={{ pointerEvents: 'bounding-box' }}>
                {/* Z Axis (Blue) */}
                <line 
                    x1={origin.x} y1={origin.y} x2={pZ.x} y2={pZ.y} 
                    stroke={colorZ} strokeWidth="3" 
                    onMouseDown={(e) => handleGizmoMouseDown(e, 'z')}
                />
                {(currentTool === 'move' || currentTool === 'select') && <ArrowTip x={pZ.x} y={pZ.y} originX={origin.x} originY={origin.y} color={colorZ} />}
                {currentTool === 'scale' && <ScaleTip x={pZ.x} y={pZ.y} color={colorZ} />}
                
                {/* Y Axis (Green) */}
                <line 
                    x1={origin.x} y1={origin.y} x2={pY.x} y2={pY.y} 
                    stroke={colorY} strokeWidth="3" 
                    onMouseDown={(e) => handleGizmoMouseDown(e, 'y')}
                />
                {(currentTool === 'move' || currentTool === 'select') && <ArrowTip x={pY.x} y={pY.y} originX={origin.x} originY={origin.y} color={colorY} />}
                {currentTool === 'scale' && <ScaleTip x={pY.x} y={pY.y} color={colorY} />}

                {/* X Axis (Red) */}
                <line 
                    x1={origin.x} y1={origin.y} x2={pX.x} y2={pX.y} 
                    stroke={colorX} strokeWidth="3" 
                    onMouseDown={(e) => handleGizmoMouseDown(e, 'x')}
                />
                {(currentTool === 'move' || currentTool === 'select') && <ArrowTip x={pX.x} y={pX.y} originX={origin.x} originY={origin.y} color={colorX} />}
                {currentTool === 'scale' && <ScaleTip x={pX.x} y={pX.y} color={colorX} />}
                
                {/* Center Point */}
                <circle cx={origin.x} cy={origin.y} r="4" fill="white" stroke="black" />
            </g>
        );
    };

    return (
        <div className="flex flex-col h-screen bg-[#1d1d1d] text-[#cfcfcf] font-sans overflow-hidden">
            {/* Header */}
            <div className="h-8 bg-[#2d2d2d] border-b border-black flex items-center px-2 justify-between select-none">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold px-2">
                         <Cube className="w-4 h-4" /> Animator Pro
                    </div>
                </div>
                <button onClick={onExit} className="text-xs bg-[#3d3d3d] px-3 py-1 rounded hover:bg-[#4d4d4d]">
                    Back to Gallery
                </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Tools */}
                <div className="w-10 bg-[#2d2d2d] border-r border-black flex flex-col items-center py-2 gap-2">
                    <button onClick={() => setCurrentTool('select')} className={`p-1.5 rounded ${currentTool === 'select' ? 'bg-indigo-600 text-white' : 'hover:bg-[#4d4d4d]'}`} title="Select">
                        <Cursor className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentTool('move')} className={`p-1.5 rounded ${currentTool === 'move' ? 'bg-indigo-600 text-white' : 'hover:bg-[#4d4d4d]'}`} title="Move Bone">
                        <Move className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentTool('rotate')} className={`p-1.5 rounded ${currentTool === 'rotate' ? 'bg-indigo-600 text-white' : 'hover:bg-[#4d4d4d]'}`} title="Orbit Cam / Rotate">
                        <Rotate3D className="w-4 h-4" />
                    </button>
                    <button onClick={() => setCurrentTool('scale')} className={`p-1.5 rounded ${currentTool === 'scale' ? 'bg-indigo-600 text-white' : 'hover:bg-[#4d4d4d]'}`} title="Scale Bone">
                        <Scale className="w-4 h-4" />
                    </button>
                </div>

                {/* 3D Viewport */}
                <div 
                    className="flex-1 relative bg-[#151515] overflow-hidden flex flex-col"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                >
                    <div className="h-6 bg-transparent absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 pointer-events-none select-none">
                        <span className="text-[10px] text-[#808080]">Perspective | Rot: {Math.round(rotation.x)}°, {Math.round(rotation.y)}° | Zoom: {cameraZoom.toFixed(2)}x</span>
                    </div>

                    <div className="flex-1 relative flex items-center justify-center cursor-move">
                         {/* Grid Floor Visualization */}
                         <div className="absolute inset-0 opacity-20 pointer-events-none" 
                             style={{ 
                                 backgroundImage: `linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)`,
                                 backgroundSize: `${40 * cameraZoom}px ${40 * cameraZoom}px`,
                                 transform: `perspective(600px) rotateX(${rotation.x + 40}deg) rotateZ(${rotation.y}deg) scale(2)`
                             }}
                         ></div>

                         <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 800 600">
                             {/* Render the Mesh */}
                             {RenderedMesh}

                             {/* Render the Rig (Bones) */}
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
                                         {pParent && (
                                             <line x1={pParent.x} y1={pParent.y} x2={p.x} y2={p.y} stroke="#fbbf24" strokeWidth="2" />
                                         )}
                                         <circle 
                                             cx={p.x} cy={p.y} r={selectedBone === bone.id ? 6 : 4} 
                                             fill={selectedBone === bone.id ? '#6366f1' : '#fbbf24'}
                                             className="cursor-pointer hover:r-6"
                                             onClick={(e) => { e.stopPropagation(); setSelectedBone(bone.id); }}
                                         />
                                     </g>
                                 );
                             })}
                             
                             {/* Render Gizmos on top */}
                             <RenderGizmos />
                         </svg>

                         {/* No Mesh Prompt */}
                         {!mesh && (
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                                 <Cube className="w-16 h-16 mx-auto opacity-20 mb-2" />
                                 <p className="text-zinc-500 text-sm">Generate a model to start</p>
                             </div>
                         )}
                    </div>

                    {/* Generator Panel Overlay */}
                    <div className="absolute bottom-4 left-4 p-3 bg-[#2d2d2d]/90 backdrop-blur border border-black rounded shadow-xl w-64 z-20">
                        <h3 className="text-xs font-bold text-white mb-2 uppercase">Mesh Generator</h3>
                        <textarea 
                            value={config.prompt}
                            onChange={(e) => setConfig(prev => ({...prev, prompt: e.target.value}))}
                            placeholder="e.g. Low poly red car..."
                            className="w-full h-16 bg-[#1d1d1d] border border-[#3d3d3d] text-xs p-2 text-white mb-2 resize-none focus:outline-none focus:border-indigo-500 rounded"
                        />
                        <button 
                            onClick={handleGenerateModel}
                            disabled={isLoading}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded flex items-center justify-center gap-2"
                        >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Zap className="w-3 h-3 fill-current"/>} 
                            Generate 3D Mesh
                        </button>
                    </div>
                </div>

                {/* Right Panel (Properties) */}
                <div className="w-64 bg-[#2d2d2d] border-l border-black flex flex-col p-2">
                    <h4 className="text-xs font-bold text-[#cfcfcf] mb-2 border-b border-[#3d3d3d] pb-1">Properties</h4>
                    
                    {selectedBone ? (
                         <div className="flex flex-col gap-2 text-xs">
                             <label className="text-white font-bold bg-[#3d3d3d] px-1 rounded">{BONES.find(b => b.id === selectedBone)?.label}</label>
                             <div className="text-[10px] text-zinc-500 mb-1">Position (Offset)</div>
                             
                             {['x', 'y', 'z'].map((axis) => (
                                 <div key={axis} className="flex items-center gap-2">
                                     <span className="uppercase text-zinc-500 font-bold w-3">{axis}</span>
                                     <input 
                                         type="number" 
                                         step="0.1"
                                         value={bonePositions[selectedBone][axis as 'x'|'y'|'z']}
                                         onChange={(e) => handleBoneChange(axis as 'x'|'y'|'z', parseFloat(e.target.value))}
                                         className="flex-1 bg-[#1d1d1d] border border-[#3d3d3d] px-1 py-1 text-white rounded"
                                     />
                                 </div>
                             ))}
                             <div className="text-[10px] text-zinc-500 mt-2 italic">
                                 Select 'Move' or 'Scale' tool and drag the colored gizmos.
                             </div>
                         </div>
                    ) : (
                        <div className="text-xs text-zinc-600 italic text-center mt-10">Select a yellow bone node to transform</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Animator;