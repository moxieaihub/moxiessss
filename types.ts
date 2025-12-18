
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
  ANIMATOR = 'animator',
  STORY = 'story',
  LOGO = 'logo',
  CAPTIONS = 'captions'
}

export enum AspectRatio {
  SQUARE = '1:1',
  LANDSCAPE_16_9 = '16:9',
  PORTRAIT_9_16 = '9:16'
}

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K'
}

export type VoiceName = 'puck' | 'charon' | 'kore' | 'fenrir' | 'zephyr' | 'aoede' | 'leda' | 'orus';

export type ModelPose = 't-pose' | 'standing' | 'walking' | 'running' | 'action' | 'sitting';
export type ModelView = 'front' | 'isometric' | 'side' | 'back' | 'top';
export type ModelMaterial = 'realistic' | 'clay' | 'low-poly' | 'voxel' | 'anime' | 'gold';

export type Bone = 'head' | 'torso' | 'left-arm' | 'right-arm' | 'left-leg' | 'right-leg';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface BoneConfiguration {
  bone: Bone;
  action: string;
}

export type AnimationFormat = 'mp4' | 'gif';
export type AnimationQuality = 'standard' | 'high';
export type Export3DFormat = 'obj' | 'gltf' | 'fbx';

export interface StoryScene {
  id: string;
  prompt: string;
  order: number;
}

export interface StoryEntity {
  id: string;
  text: string;
  image: string | null;
  isActive: boolean;
}

export interface DialogTurn {
  id: string;
  voice: VoiceName;
  text: string;
}

export type CaptionAnimation = 'none' | 'fade' | 'pop' | 'slide-up' | 'zoom-in' | 'typewriter';

export interface CaptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  animation?: CaptionAnimation;
}

export interface GenerationConfig {
  mode: GenerationMode;
  prompt: string;
  model: ModelType;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  count?: number;
  stylePrompts?: string[];
  referenceImage?: string | null;
  
  // Audio specific
  voice?: VoiceName;
  audioInput?: string | null;
  speechMode?: 'text' | 'mic' | 'dialog';
  dialogTurns?: DialogTurn[];

  // Thumbnail specific
  thumbnailTitle?: string;
  captionColor?: string;
  captionSize?: 'small' | 'medium' | 'large' | 'xl';
  captionStyle?: 'bold' | 'outline' | 'neon' | '3d' | 'minimalist' | 'gradient';
  captionPosition?: 'top' | 'center' | 'bottom';
  captionFont?: string;

  // Story specific
  storyScenes?: StoryScene[];
  storySubjects?: StoryEntity[];
  storyEnvironments?: StoryEntity[];
  storyArtStyles?: StoryEntity[];
  storyContext?: string;
  storyLink?: string;
  storyAnalysis?: string;

  // 3D/Rigging specific
  modelPose?: ModelPose;
  modelView?: ModelView;
  modelMaterial?: ModelMaterial;
  isRigging?: boolean;
  boneConfigurations?: BoneConfiguration[];
  renderAnimation?: boolean;
  animationDuration?: number;
  animationFormat?: AnimationFormat;
  animationQuality?: AnimationQuality;

  // Caption Studio Specific
  captionScript?: string;
  captionAudioUrl?: string | null;
  captionVideoUrl?: string | null;
  captionSegments?: CaptionSegment[];
  defaultCaptionAnimation?: CaptionAnimation;
}

export interface GeneratedContent {
  id: string;
  type: 'image' | 'audio' | 'animation' | 'caption-set';
  url: string;
  prompt: string;
  model: ModelType | string;
  timestamp: number;
  aspectRatio?: string;
  voice?: string;
  frames?: string[];
  duration?: number;
  segments?: CaptionSegment[];
}

export interface MeshGeometry {
    vertices: number[][];
    faces: (number | string)[][];
}
