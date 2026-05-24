import { createStarryNightExperienceConfig, StarryNightExperienceConfig } from "./starryNightExperienceConfig";

type ThreeModule = typeof import("three");
type MeshLike = import("three").Mesh;
type MaterialLike = import("three").Material;
type TextureLike = import("three").Texture;
type Object3DLike = import("three").Object3D;
type SpriteLike = import("three").Sprite;
type LayerMaterialLike = MaterialLike & {
  map?: TextureLike | null;
  uniforms?: {
    map?: { value: TextureLike | null };
  };
};

interface StarryNightExperienceOptions {
  three: ThreeModule;
  targetObject: Object3DLike;
  lowPower: boolean;
  targetAspect?: number;
}

interface AnimatedLayer {
  id: string;
  mesh: MeshLike;
  baseX: number;
  baseY: number;
  baseZ: number;
  parallax: number;
}

interface AnimatedParticle {
  sprite: SpriteLike;
  seed: number;
  baseX: number;
  baseY: number;
  baseZ: number;
}

export interface StarryNightExperience {
  dispose: () => void;
}

export function createStarryNightExperience({
  three,
  targetObject,
  lowPower,
  targetAspect = 4 / 3,
}: StarryNightExperienceOptions): StarryNightExperience {
  const config = createStarryNightExperienceConfig({ lowPower, targetAspect });
  const group = new three.Group();
  group.name = "StarryNightLivingPainting";
  targetObject.add(group);

  const cleanup: Array<() => void> = [];
  const animatedLayers: AnimatedLayer[] = [];
  const particles: AnimatedParticle[] = [];
  let disposed = false;
  let frameId = 0;
  const startedAt = performance.now();

  const loader = new three.TextureLoader();

  for (const layer of config.layers) {
    const geometry = new three.PlaneGeometry(
      config.plane.width * layer.scale.x,
      config.plane.height * layer.scale.y,
      layer.id === config.shader.animatedLayer && config.shader.enabled ? 28 : 1,
      layer.id === config.shader.animatedLayer && config.shader.enabled ? 16 : 1,
    );
    const material = createLayerMaterial(three, layer.id, layer.opacity, config);
    const mesh = new three.Mesh(geometry, material);
    mesh.name = `starry-night-${layer.id}`;
    mesh.position.set(layer.position.x, layer.position.y, layer.position.z);
    mesh.renderOrder = Math.round(layer.position.z * 1000);
    group.add(mesh);
    animatedLayers.push({
      id: layer.id,
      mesh,
      baseX: layer.position.x,
      baseY: layer.position.y,
      baseZ: layer.position.z,
      parallax: layer.parallax,
    });
    cleanup.push(() => {
      geometry.dispose();
      disposeMaterial(material);
    });

    loadTexture(loader, layer.src, (texture) => {
      texture.colorSpace = three.SRGBColorSpace;
      texture.generateMipmaps = false;
      texture.minFilter = three.LinearFilter;
      texture.magFilter = three.LinearFilter;
      const layerMaterial = material as LayerMaterialLike;
      if (layerMaterial.uniforms?.map) {
        layerMaterial.uniforms.map.value = texture;
      } else {
        layerMaterial.map = texture;
      }
      material.needsUpdate = true;
      cleanup.push(() => texture.dispose());
    });
  }

  const particleMaterial = new three.SpriteMaterial({
    color: 0xffe68a,
    transparent: true,
    opacity: lowPower ? 0.52 : 0.72,
    depthWrite: false,
  });
  cleanup.push(() => particleMaterial.dispose());
  loadTexture(loader, config.particles.src, (texture) => {
    texture.colorSpace = three.SRGBColorSpace;
    texture.minFilter = three.LinearFilter;
    texture.magFilter = three.LinearFilter;
    particleMaterial.map = texture;
    particleMaterial.needsUpdate = true;
    cleanup.push(() => texture.dispose());
  });

  for (let index = 0; index < config.particles.count; index += 1) {
    const seed = index * 12.9898;
    const x = seededRange(seed, -0.68, 0.68);
    const y = seededRange(seed + 8.13, -0.2, 0.5);
    const z = seededRange(seed + 4.91, 0.14, 0.24);
    const sprite = new three.Sprite(particleMaterial);
    sprite.name = `starry-night-particle-${index}`;
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(seededRange(seed + 2.5, 0.018, 0.042));
    group.add(sprite);
    particles.push({ sprite, seed, baseX: x, baseY: y, baseZ: z });
  }

  addSpiralAccents(three, group, config, cleanup);

  const animate = () => {
    if (disposed) return;
    const elapsed = (performance.now() - startedAt) / 1000;
    animateLayers(animatedLayers, elapsed, config);
    animateParticles(particles, elapsed, config);
    frameId = requestAnimationFrame(animate);
  };
  frameId = requestAnimationFrame(animate);

  return {
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      targetObject.remove(group);
      cleanup.forEach((dispose) => dispose());
      group.clear();
    },
  };
}

function createLayerMaterial(
  three: ThreeModule,
  id: string,
  opacity: number,
  config: StarryNightExperienceConfig,
): MaterialLike {
  if (id === config.shader.animatedLayer && config.shader.enabled) {
    return new three.ShaderMaterial({
      uniforms: {
        map: { value: null },
        opacity: { value: opacity },
        time: { value: 0 },
        drift: { value: config.motion.skyDrift },
        flow: { value: config.motion.waveFlow },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: `
        varying vec2 vUv;
        uniform float time;
        uniform float drift;
        void main() {
          vUv = uv;
          vec3 p = position;
          float skyMask = smoothstep(0.34, 0.56, uv.y);
          p.z += sin((uv.x * 14.0) + time * 0.85) * drift * skyMask;
          p.z += cos((uv.y * 12.0) + time * 0.6) * drift * 0.6 * skyMask;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float opacity;
        uniform float time;
        uniform float flow;
        varying vec2 vUv;
        void main() {
          float skyMask = smoothstep(0.34, 0.56, vUv.y);
          float cypressGuard = 1.0 - smoothstep(0.0, 0.28, vUv.x) * (1.0 - smoothstep(0.18, 0.55, vUv.y));
          float motionMask = skyMask * cypressGuard;
          vec2 waveUv = vUv;
          waveUv.x += mod(time * flow, 1.0) * 0.035 * motionMask;
          waveUv.x += sin(vUv.y * 26.0 + time * 0.72) * 0.008 * motionMask;
          waveUv.y += cos(vUv.x * 20.0 - time * 0.55) * 0.005 * motionMask;
          vec4 animatedTexel = texture2D(map, waveUv);
          vec4 stillTexel = texture2D(map, vUv);
          vec4 texel = mix(stillTexel, animatedTexel, motionMask * 0.82);
          gl_FragColor = vec4(texel.rgb, texel.a * opacity);
        }
      `,
    });
  }

  return new three.MeshBasicMaterial({
    transparent: true,
    opacity,
    depthWrite: false,
  });
}

function addSpiralAccents(
  three: ThreeModule,
  group: Object3DLike,
  config: StarryNightExperienceConfig,
  cleanup: Array<() => void>,
) {
  if (config.particles.count === 0) return;

  const accents = [
    { x: -0.05, y: 0.17, z: 0.135, radius: 0.17, speed: 0.18 },
    { x: 0.35, y: -0.02, z: 0.13, radius: 0.1, speed: -0.22 },
    { x: 0.68, y: 0.39, z: 0.15, radius: 0.08, speed: 0.26 },
  ];

  for (const accent of accents) {
    const geometry = new three.RingGeometry(accent.radius * 0.72, accent.radius, 48);
    const material = new three.MeshBasicMaterial({
      color: 0x9ed8ff,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: three.DoubleSide,
    });
    const ring = new three.Mesh(geometry, material);
    ring.name = "starry-night-spiral-accent";
    ring.position.set(accent.x, accent.y, accent.z);
    ring.scale.y = 0.58;
    group.add(ring);
    let frameId = 0;
    cleanup.push(() => {
      cancelAnimationFrame(frameId);
      geometry.dispose();
      material.dispose();
    });

    const start = performance.now();
    const loop = () => {
      if (!ring.parent) return;
      const elapsed = (performance.now() - start) / 1000;
      ring.rotation.z = elapsed * accent.speed;
      ring.scale.x = 1 + Math.sin(elapsed * 0.7) * 0.035;
      ring.scale.y = 0.58 + Math.cos(elapsed * 0.6) * 0.02;
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
  }
}

function animateLayers(layers: AnimatedLayer[], elapsed: number, config: StarryNightExperienceConfig) {
  for (const layer of layers) {
    const breathing = Math.sin(elapsed * 0.55 + layer.baseZ * 20);
    layer.mesh.position.x = layer.baseX + breathing * layer.parallax;
    layer.mesh.position.y = layer.baseY + Math.cos(elapsed * 0.38 + layer.baseZ * 18) * layer.parallax * 0.45;
    layer.mesh.position.z = layer.baseZ;
    if (layer.id === "sun") {
      const pulse = 1 + Math.sin(elapsed * 1.4 + layer.baseZ * 10) * config.motion.starPulse;
      layer.mesh.scale.set(pulse, pulse, 1);
    }
    const material = layer.mesh.material as MaterialLike & {
      uniforms?: {
        time?: { value: number };
      };
    };
    if (material.uniforms?.time) {
      material.uniforms.time.value = elapsed;
    }
  }
}

function animateParticles(particles: AnimatedParticle[], elapsed: number, config: StarryNightExperienceConfig) {
  for (const particle of particles) {
    const speed = 0.45 + (particle.seed % 7) * 0.03;
    particle.sprite.position.x = particle.baseX + Math.sin(elapsed * speed + particle.seed) * 0.035;
    particle.sprite.position.y = particle.baseY + Math.cos(elapsed * speed * 0.8 + particle.seed) * config.motion.particleFloat;
    particle.sprite.position.z = particle.baseZ + Math.sin(elapsed * 0.7 + particle.seed) * 0.025;
    const pulse = 0.78 + Math.sin(elapsed * 1.2 + particle.seed) * 0.18;
    (particle.sprite.material as import("three").SpriteMaterial).opacity = Math.max(0.18, pulse);
  }
}

function loadTexture(
  loader: import("three").TextureLoader,
  src: string,
  onLoad: (texture: TextureLike) => void,
) {
  loader.load(src, onLoad, undefined, () => {
    // Missing optional overlays should not break the AR scene.
  });
}

function seededRange(seed: number, min: number, max: number) {
  const x = Math.sin(seed) * 10000;
  const normalized = x - Math.floor(x);
  return min + normalized * (max - min);
}

function disposeMaterial(material: MaterialLike) {
  const maybeMapped = material as MaterialLike & { map?: TextureLike | null };
  maybeMapped.map?.dispose();
  material.dispose();
}
