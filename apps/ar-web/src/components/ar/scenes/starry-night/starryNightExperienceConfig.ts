export type StarryNightLayerId = "base" | "sun";

export interface StarryNightLayerConfig {
  id: StarryNightLayerId;
  src: string;
  opacity: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  scale: {
    x: number;
    y: number;
  };
  parallax: number;
}

export interface StarryNightExperienceConfig {
  plane: {
    width: number;
    height: number;
  };
  layers: StarryNightLayerConfig[];
  particles: {
    count: number;
    src: string;
  };
  shader: {
    enabled: boolean;
    animatedLayer: StarryNightLayerId;
  };
  motion: {
    skyDrift: number;
    waveFlow: number;
    spiralRotation: number;
    starPulse: number;
    particleFloat: number;
  };
}

export function createStarryNightExperienceConfig({
  lowPower,
  targetAspect,
}: {
  lowPower: boolean;
  targetAspect: number;
}): StarryNightExperienceConfig {
  const safeAspect = Number.isFinite(targetAspect) && targetAspect > 0 ? targetAspect : 4 / 3;
  const width = 1.6;
  const height = Number((width / safeAspect).toFixed(3));

  return {
    plane: {
      width,
      height,
    },
    layers: [
      createLayer("base", "/ar/artworks/starry-night/base.webp", 1, 0.005, 0),
      createLayer("sun", "/ar/artworks/starry-night/moon-glow.webp", 0.72, 0.075, 0.018),
    ],
    particles: {
      count: 0,
      src: "/ar/artworks/starry-night/particle.webp",
    },
    shader: {
      enabled: true,
      animatedLayer: "base",
    },
    motion: {
      skyDrift: lowPower ? 0.003 : 0.008,
      waveFlow: lowPower ? 0.018 : 0.045,
      spiralRotation: lowPower ? 0.12 : 0.26,
      starPulse: lowPower ? 0.08 : 0.16,
      particleFloat: lowPower ? 0.035 : 0.07,
    },
  };
}

function createLayer(
  id: StarryNightLayerId,
  src: string,
  opacity: number,
  z: number,
  parallax: number,
): StarryNightLayerConfig {
  return {
    id,
    src,
    opacity,
    position: {
      x: 0,
      y: 0,
      z,
    },
    scale: {
      x: 1,
      y: 1,
    },
    parallax,
  };
}
