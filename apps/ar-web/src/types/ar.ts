export type ArtworkSceneType = "monaLisa" | "starryNight" | "scream";

export type TrackingStatus = "idle" | "starting" | "scanning" | "detected" | "lost" | "error";

export interface ArtworkConfig {
  id: string;
  title: string;
  artist: string;
  year: string;
  shortSummary: string;
  historyText: string;
  targetIndex: number;
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
}
