export type ArtworkSceneType = "monaLisa" | "starryNight" | "scream";
export type ARObjectType = "text" | "image" | "gif" | "video" | "model3d";

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
