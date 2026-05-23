"use client";

import { artworks } from "@/data/artworks";
import { ArtworkConfig } from "@/types/ar";
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Props {
  activeArtwork: ArtworkConfig;
  lowPower: boolean;
  onSelectArtwork: (artwork: ArtworkConfig) => void;
}

export function NonTrackingARMode({ activeArtwork, lowPower, onSelectArtwork }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let frame = 0;
    const videoEl = videoRef.current;

    const start = async () => {
      if (!videoEl || !canvasHostRef.current) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        videoEl.srcObject = stream;
        await videoEl.play();
      } catch {
        // Camera can fail on desktops; scene still renders without video.
      }

      const host = canvasHostRef.current;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, host.clientWidth / host.clientHeight, 0.1, 100);
      camera.position.set(0, 0, 2.6);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setSize(host.clientWidth, host.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);

      const lightA = new THREE.DirectionalLight(0xffffff, 0.8);
      lightA.position.set(1, 1, 1.5);
      scene.add(lightA);
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));

      let geometry: THREE.BufferGeometry;
      if (activeArtwork.arSceneType === "monaLisa") {
        geometry = new THREE.TorusGeometry(0.56, 0.16, 28, 120);
      } else if (activeArtwork.arSceneType === "starryNight") {
        geometry = new THREE.IcosahedronGeometry(0.62, 1);
      } else {
        geometry = new THREE.OctahedronGeometry(0.68, 2);
      }
      const material = new THREE.MeshStandardMaterial({
        color: activeArtwork.colors.primary,
        emissive: new THREE.Color(activeArtwork.colors.accent),
        emissiveIntensity: 0.3,
        metalness: 0.2,
        roughness: 0.45,
      });
      const knot = new THREE.Mesh(geometry, material);
      scene.add(knot);

      const particleCount = lowPower ? activeArtwork.effects.lowPowerParticleCount : activeArtwork.effects.particleCount;
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const radius = 1.0 + (i % 11) * 0.03;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = Math.sin(angle) * radius;
        positions[i * 3 + 2] = ((i % 9) - 4) * 0.08;
      }
      particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const particles = new THREE.Points(
        particleGeo,
        new THREE.PointsMaterial({
          color: activeArtwork.colors.secondary,
          size: lowPower ? 0.018 : 0.024,
          transparent: true,
          opacity: 0.8,
        })
      );
      scene.add(particles);

      const handleResize = () => {
        if (!host || !renderer) return;
        camera.aspect = host.clientWidth / host.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(host.clientWidth, host.clientHeight);
      };
      window.addEventListener("resize", handleResize);

      const animate = () => {
        frame = requestAnimationFrame(animate);
        const t = performance.now() * 0.001;
        if (activeArtwork.arSceneType === "monaLisa") {
          knot.rotation.x = t * 0.22;
          knot.rotation.y = t * 0.44;
          knot.position.y = Math.sin(t * 0.9) * 0.05;
          particles.rotation.z = t * 0.16;
        } else if (activeArtwork.arSceneType === "starryNight") {
          knot.rotation.x = t * 0.35;
          knot.rotation.y = t * 0.95;
          knot.position.y = Math.sin(t * 1.5) * 0.08;
          particles.rotation.z = t * 0.35;
        } else {
          knot.rotation.x = t * 0.9;
          knot.rotation.y = t * 0.35;
          knot.rotation.z = t * 0.4;
          knot.position.y = Math.sin(t * 2.2) * 0.1;
          particles.rotation.z = t * 0.55;
        }
        renderer?.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("resize", handleResize);
        geometry.dispose();
        material.dispose();
        particleGeo.dispose();
        (particles.material as THREE.Material).dispose();
        renderer?.dispose();
        if (renderer?.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    };

    let cleanupScene: (() => void) | undefined;
    start().then((cleanup) => {
      cleanupScene = cleanup;
    });

    return () => {
      cleanupScene?.();
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [activeArtwork, lowPower]);

  return (
    <div className="nontracking-root">
      <video ref={videoRef} className="nontracking-video" playsInline muted />
      <div ref={canvasHostRef} className="nontracking-canvas" />
      <div className="nontracking-top">
        {artworks.map((artwork) => (
          <button
            key={artwork.id}
            type="button"
            className={`chip ${activeArtwork.id === artwork.id ? "chip-active" : ""}`}
            onClick={() => onSelectArtwork(artwork)}
          >
            {artwork.title}
          </button>
        ))}
      </div>
    </div>
  );
}
