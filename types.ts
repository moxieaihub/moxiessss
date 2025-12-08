

export enum ModelType {
  FLASH = 'gemini-2.5-flash-image',
  IMAGEN = 'imagen-4.0-generate-001',
  TTS = 'gemini-2.5-flash-preview-tts',
  NATIVE_AUDIO = 'gemini-2.5-flash-native-audio-preview-09-2025'
}

export enum GenerationMode {
  IMAGE = 'image',
  AUDIO = 'audio',
  THUMBNAIL = 'thumbnail',
  MODEL_3D = 'model-3d',
  ANIMATOR = 'animator'
}

export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE_4_3 = '4:3',
  LANDSCAPE_16_9 = '16:9',
  PORTRAIT_3_4 = '3:4',
  PORTRAIT_9_16 = '9:16'
}

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K'
}

// 3D Model Specific Types
export type ModelPose = 't-pose' | 'standing' | 'walking' | 'running' | 'action' | 'sitting';
export type ModelView = 'front' | 'isometric' | 'side' | 'back' | 'top';
export type ModelMaterial = 'clay' | 'realistic' | 'low-poly' | 'anime' | 'voxel' | 'gold';

// Rigging / Bone Control Types
export type Bone = 'head' | 'torso' | 'left-arm' | 'right-arm' | 'left-leg' | 'right-leg' | 'left-hand' | 'right-hand' | 'left-foot' | 'right-foot';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoneData {
  id: Bone;
  position: Vector3; // Relative to parent or center
  parent?: Bone;
}

export interface Keyframe {
  id: string;
  timestamp: number; // in seconds
  bonePositions: Record<Bone, Vector3>; // Snapshot of all bone positions
}

export interface BoneConfiguration {
  bone: Bone;
  action: string; // e.g., "raised", "bent 90 degrees", "turned left"
}

// Animation Specific Types
export type AnimationFormat = 'mp4' | 'gif'; 
export type AnimationQuality = 'standard' | 'high'; 
export type Export3DFormat = 'fbx' | 'obj' | 'gltf' | 'usd';

// Actual 3D Mesh Data
export interface MeshGeometry {
    vertices: number[][]; // Array of [x, y, z]
    faces: [number, number, number, string?][];    // Array of [v1_index, v2_index, v3_index, color_hex?]
}

export interface GeneratedContent {
  id: string;
  type: 'image' | 'audio' | 'animation';
  url: string; // For animation, this is the thumbnail or first frame
  frames?: string[]; // Array of URLs for animation frames
  duration?: number; // Duration in seconds
  prompt: string;
  model: string;
  timestamp: number;
  aspectRatio?: string; // Only for images
  voice?: VoiceName;    // Only for audio
}

export interface GenerationConfig {
  mode: GenerationMode;
  prompt: string;
  model: ModelType;
  aspectRatio: AspectRatio;
  resolution?: ImageResolution;
  count?: number;
  stylePrompts: string[];
  voice: VoiceName;
  thumbnailTitle?: string;
  referenceImage?: string | null; // Base64 string of uploaded reference
  audioInput?: string | null; // Base64 string of recorded audio for S2S
  
  // 3D Model Configs
  modelPose?: ModelPose;
  modelView?: ModelView;
  modelMaterial?: ModelMaterial;

  // Rigging Configs
  isRigging?: boolean;
  keyframes?: Keyframe[]; // New advanced animation system
  boneConfigurations?: BoneConfiguration[];
  renderAnimation?: boolean; // New flag for generating animation sequence
  
  // Animation Settings
  animationFormat?: AnimationFormat;
  animationQuality?: AnimationQuality;
  animationDuration?: number; // Seconds (1-10)
  
  // Animator Mode
  exportFormat?: Export3DFormat;
}