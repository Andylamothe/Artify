export type ArtworkSceneType = "monaLisa" | "starryNight" | "scream";
export type ARObjectType = "text" | "image" | "gif" | "video" | "model3d" | "button" | "panel" | "portfolio" | "brush";
export type ARObjectActionType = "none" | "history" | "gallery" | "portfolio" | "artworks" | "nextImage" | "openLink";
export type ARBrushAnimation = "flow" | "pulse" | "wave";
export type MotionBrushTool = "brush" | "eraser" | "path";

export interface MotionBrushPath {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  speed: number;
  force: number;
}

export interface MotionBrushSettings {
  brushSize: number;
  feather: number;
  speed: number;
  intensity: number;
  distortionStrength: number;
  loopDuration: number;
  opacity: number;
}

export interface MotionBrushState {
  maskDataUrl: string;
  paths: MotionBrushPath[];
  settings: MotionBrushSettings;
  previewEnabled: boolean;
}

export interface ARPortfolioItem {
  id: string;
  title: string;
  src: string;
}

export type TrackingStatus = "idle" | "starting" | "scanning" | "detected" | "lost" | "error";

export interface ArtworkConfig {
  id: string;
  title: string;
  artist: string;
  year: string;
  shortSummary: string;
  historyText: string;
  targetIndex: number;
  targetImageUrl?: string;
  audioUrl: string;
  historicalImages: string[];
  arSceneType: ArtworkSceneType;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  effects: {
    particleCount: number;
    lowPowerParticleCount: number;
    intensity: "low" | "medium";
  };
  arObjects?: ARObjectConfig[];
}

export interface ARObjectConfig {
  id: string;
  name: string;
  type: ARObjectType;
  text?: string;
  src?: string;
  icon?: string;
  actionType?: ARObjectActionType;
  actionUrl?: string;
  brushPoints?: Array<{ x: number; y: number }>;
  brushAnimation?: ARBrushAnimation;
  brushSpeed?: number;
  brushWidth?: number;
  motionBrush?: MotionBrushState;
  portfolioItems?: ARPortfolioItem[];
  color: string;
  opacity: number;
  width: number;
  height: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    x: number;
    y: number;
    z: number;
  };
}

export interface WorkbenchManifest {
  version: 1;
  updatedAt: string;
  mindFile: string;
  artworks: ArtworkConfig[];
}
