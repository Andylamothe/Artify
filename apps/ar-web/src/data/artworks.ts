import { ArtworkConfig } from "@/types/ar";

export const artworks: ArtworkConfig[] = [
  {
    id: "mona-lisa",
    title: "Mona Lisa",
    artist: "Leonardo da Vinci",
    year: "c. 1503-1506",
    shortSummary:
      "A portrait known for its subtle smile and layered sfumato technique, central to Renaissance portraiture.",
    historyText:
      "Painted in Florence during the High Renaissance, the work became globally famous for its technique, mystery, and historical journey into the Louvre collection.",
    targetIndex: 0,
    audioUrl: "/ar/audio/mona-lisa.wav",
    historicalImages: ["/ar/images/mona-lisa-history-1.jpg"],
    arSceneType: "monaLisa",
    colors: {
      primary: "#CBA35B",
      secondary: "#EAD9B0",
      accent: "#9A6A2D",
    },
    effects: {
      particleCount: 90,
      lowPowerParticleCount: 40,
      intensity: "low",
    },
  },
  {
    id: "starry-night",
    title: "Starry Night",
    artist: "Vincent van Gogh",
    year: "1889",
    shortSummary:
      "A night landscape transformed into rhythmic motion through bold brushwork, contrast, and emotional color.",
    historyText:
      "Created in Saint-Remy, the painting reflects van Gogh's expressive interpretation of the sky and remains one of the most recognized works in modern art history.",
    targetIndex: 1,
    audioUrl: "/ar/audio/starry-night.wav",
    historicalImages: ["/ar/images/starry-night-history-1.jpg"],
    arSceneType: "starryNight",
    colors: {
      primary: "#1F3C88",
      secondary: "#5A83E5",
      accent: "#F7C948",
    },
    effects: {
      particleCount: 130,
      lowPowerParticleCount: 60,
      intensity: "medium",
    },
  },
  {
    id: "the-scream",
    title: "The Scream",
    artist: "Edvard Munch",
    year: "1893",
    shortSummary:
      "An iconic expressionist composition translating anxiety into color, line, and atmosphere.",
    historyText:
      "Part of Munch's Frieze of Life cycle, this work captures existential tension and became a major reference point for expressionism in the 20th century.",
    targetIndex: 2,
    audioUrl: "/ar/audio/the-scream.wav",
    historicalImages: ["/ar/images/the-scream-history-1.jpg"],
    arSceneType: "scream",
    colors: {
      primary: "#A72608",
      secondary: "#F46036",
      accent: "#FFD166",
    },
    effects: {
      particleCount: 110,
      lowPowerParticleCount: 50,
      intensity: "medium",
    },
  },
];

export const artworksByTargetIndex = new Map(artworks.map((a) => [a.targetIndex, a]));
