"use client";

import { artworks as defaultArtworks } from "@/data/artworks";
import { useArtworkAudio } from "@/hooks/ar/useArtworkAudio";
import { useLowPowerMode } from "@/hooks/ar/useLowPowerMode";
import { ArtworkConfig, TrackingStatus } from "@/types/ar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArtworkOverlay } from "@/components/ar/ArtworkOverlay";
import { FallbackMuseumMode } from "@/components/ar/FallbackMuseumMode";
import { MonaLisaScene } from "@/components/ar/scenes/MonaLisaScene";
import { StarryNightScene } from "@/components/ar/scenes/StarryNightScene";
import { ScreamScene } from "@/components/ar/scenes/ScreamScene";
import { ARInfoPanel } from "@/components/ar/scenes/ARInfoPanel";
import { ARCustomObjects } from "@/components/ar/scenes/ARCustomObjects";

declare global {
  interface Window {
    AFRAME?: {
      scenes: Array<{
        systems?: Record<string, { start?: () => void; stop?: () => void }>;
      }>;
    };
  }
}

const MINDSCRIPTS = [
  "/ar/libs/aframe.min.js",
  "/ar/libs/mindar-image.prod.js",
  "/ar/libs/mindar-image-aframe.prod.js",
];

function SceneByType({
  activeArtwork,
  active,
  lowPower,
  showDetails,
  muted,
  onToggleDetails,
  onToggleMuted,
}: {
  activeArtwork: ArtworkConfig;
  active: boolean;
  lowPower: boolean;
  showDetails: boolean;
  muted: boolean;
  onToggleDetails: () => void;
  onToggleMuted: () => void;
}) {
  const panel = (
    <>
      <ARInfoPanel
        artwork={activeArtwork}
        showDetails={showDetails}
        muted={muted}
        onToggleDetails={onToggleDetails}
        onToggleMuted={onToggleMuted}
      />
      <ARCustomObjects objects={activeArtwork.arObjects} active={active} />
    </>
  );

  if (activeArtwork.arSceneType === "monaLisa") {
    return (
      <>
        <MonaLisaScene artwork={activeArtwork} active={active} lowPower={lowPower} />
        {panel}
      </>
    );
  }
  if (activeArtwork.arSceneType === "starryNight") {
    return (
      <>
        <StarryNightScene artwork={activeArtwork} active={active} lowPower={lowPower} />
        {panel}
      </>
    );
  }
  return (
    <>
      <ScreamScene artwork={activeArtwork} active={active} lowPower={lowPower} />
      {panel}
    </>
  );
}

export default function ARExperience() {
  const [mode, setMode] = useState<"start" | "tracking-loading" | "tracking" | "fallback">(
    "start"
  );
  const started = mode !== "start";
  const [trackingStatus, setTrackingStatus] = useState<TrackingStatus>("idle");
  const [activeArtwork, setActiveArtwork] = useState<ArtworkConfig | null>(null);
  const [artworkList, setArtworkList] = useState<ArtworkConfig[]>(defaultArtworks);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [scriptsError, setScriptsError] = useState<string | null>(null);
  const [compatibilityHint, setCompatibilityHint] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [showArDetails, setShowArDetails] = useState(false);
  const mountedRef = useRef(true);
  const sceneMounted = mode === "tracking" && scriptsReady;
  const { lowPower, setLowPower } = useLowPowerMode();
  const artworksByTargetIndex = useMemo(
    () => new Map(artworkList.map((artwork) => [artwork.targetIndex, artwork])),
    [artworkList],
  );

  const shouldPlayAudio = trackingStatus === "detected";
  const { muted, toggleMuted, audioError, requiresManualPlay, tryPlayManually, pause } =
    useArtworkAudio({
      started,
      activeArtwork,
      shouldPlay: shouldPlayAudio,
    });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/workbench/artworks", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: { artworks?: ArtworkConfig[] } | null) => {
        if (cancelled || !manifest?.artworks?.length) return;
        setArtworkList(manifest.artworks);
      })
      .catch(() => {
        setArtworkList(defaultArtworks);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (mode !== "tracking-loading") return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled && mountedRef.current && !scriptsReady) {
        setScriptsError("AR libraries timed out while loading.");
        setTrackingStatus("error");
        setMode("fallback");
      }
    }, 12000);

    const loadScripts = async () => {
      setTrackingStatus("starting");
      for (const src of MINDSCRIPTS) {
        if (document.querySelector(`script[data-ar-src="${src}"]`)) continue;
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = src;
          script.async = true;
          script.dataset.arSrc = src;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          document.body.appendChild(script);
        });
      }
      if (!cancelled && mountedRef.current) {
        setScriptsReady(true);
        setMode("tracking");
        setTrackingStatus("starting");
      }
    };

    loadScripts().catch(() => {
      if (!cancelled && mountedRef.current) {
        setScriptsError("Camera AR libraries could not load.");
        setTrackingStatus("error");
        setMode("fallback");
      }
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [mode, scriptsReady]);

  useEffect(() => {
    if (!sceneMounted) return;

    const targetElements = artworkList.map((artwork) =>
      document.getElementById(`target-${artwork.targetIndex}`)
    );
    const handlers: Array<() => void> = [];

    targetElements.forEach((element, arrayIndex) => {
      if (!element) return;
      const configuredTargetIndex = artworkList[arrayIndex]?.targetIndex;
      const onFound = () => {
        const artwork = artworksByTargetIndex.get(configuredTargetIndex);
        if (!artwork) return;
        setActiveArtwork(artwork);
        setShowArDetails(false);
        setTrackingStatus("detected");
      };
      const onLost = () => {
        setTrackingStatus("lost");
        pause();
      };
      element.addEventListener("targetFound", onFound);
      element.addEventListener("targetLost", onLost);
      handlers.push(() => {
        element.removeEventListener("targetFound", onFound);
        element.removeEventListener("targetLost", onLost);
      });
    });

    const sceneElement = document.getElementById("museum-ar-scene");
    const onReady = () => setTrackingStatus("scanning");
    const onError = () => {
      setTrackingStatus("error");
      setMode("fallback");
    };
    sceneElement?.addEventListener("arReady", onReady);
    sceneElement?.addEventListener("arError", onError);

    return () => {
      handlers.forEach((cleanup) => cleanup());
      sceneElement?.removeEventListener("arReady", onReady);
      sceneElement?.removeEventListener("arError", onError);
    };
  }, [artworkList, artworksByTargetIndex, pause, sceneMounted]);

  useEffect(() => {
    if (mode !== "tracking" || trackingStatus !== "starting") return;
    const timeout = window.setTimeout(() => {
      if (!mountedRef.current || trackingStatus !== "starting") return;
      setScriptsError("Camera started slowly or the AR engine did not become ready.");
      setCompatibilityHint("Refresh, allow camera permission, and make sure the page is opened over HTTPS.");
      setTrackingStatus("error");
      setMode("fallback");
    }, 10000);

    return () => window.clearTimeout(timeout);
  }, [mode, trackingStatus]);

  useEffect(() => {
    if (mode !== "tracking") return;
    const sceneElement = document.getElementById("museum-ar-scene");
    if (!sceneElement) return;
    let cancelled = false;
    let startedAr = false;

    const startWhenReady = () => {
      if (cancelled || startedAr) return;
      const arSystem = (
        sceneElement as unknown as { systems?: Record<string, { start?: () => void }> }
      ).systems?.["mindar-image-system"];
      if (!arSystem?.start) {
        window.setTimeout(startWhenReady, 100);
        return;
      }
      startedAr = true;
      arSystem.start();
    };

    sceneElement.addEventListener("loaded", startWhenReady);
    sceneElement.addEventListener("renderstart", startWhenReady);
    startWhenReady();

    return () => {
      cancelled = true;
      sceneElement.removeEventListener("loaded", startWhenReady);
      sceneElement.removeEventListener("renderstart", startWhenReady);
    };
  }, [mode]);

  useEffect(() => {
    return () => {
      if (window.AFRAME?.scenes?.length) {
        window.AFRAME.scenes.forEach((scene) => {
          const system = scene.systems?.["mindar-image-system"];
          system?.stop?.();
        });
      }
    };
  }, []);

  const activeOrDefault = useMemo(() => activeArtwork ?? artworkList[0], [activeArtwork, artworkList]);

  const startAR = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setCompatibilityHint(null);
    setScriptsError(null);
    const hasMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
    if (!hasMedia) {
      setScriptsError("Camera API not available on this browser/device.");
      setCompatibilityHint("Use Safari on iPhone or Chrome on Android. Fallback mode is available.");
      setMode("fallback");
      setTrackingStatus("error");
      setIsStarting(false);
      return;
    }

    if (!window.isSecureContext) {
      setScriptsError("Secure HTTPS context required for camera access.");
      setCompatibilityHint("Open the HTTPS URL and trust the certificate on the device.");
      setMode("fallback");
      setTrackingStatus("error");
      setIsStarting(false);
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isCriOS = /CriOS/i.test(ua);
    const isInAppBrowser = /FBAN|FBAV|Instagram|Line|LinkedInApp|Twitter|Snapchat/i.test(ua);
    if (isIOS && isCriOS) {
      setCompatibilityHint(
        "Chrome on iOS may block WebAR features. Safari is recommended for reliable camera AR."
      );
    }
    if (isInAppBrowser) {
      setScriptsError("In-app browsers often block camera AR.");
      setCompatibilityHint("Open this page in Safari (iOS) or Chrome (Android), not inside another app.");
      setMode("fallback");
      setTrackingStatus("error");
      setIsStarting(false);
      return;
    }

    setMode("tracking-loading");
    setTrackingStatus("starting");
    setIsStarting(false);
  };

  return (
    <div className="ar-page">
      {mode === "start" ? (
        <div className="start-screen">
          <h1>Museum Image Tracking</h1>
          <p>Start the camera, point it at a compiled MindAR target, and the 3D scene will attach to the artwork.</p>
          {compatibilityHint ? <p className="compat-note">{compatibilityHint}</p> : null}
          <button type="button" className="primary-btn" onClick={startAR} disabled={isStarting}>
            {isStarting ? "Starting..." : "Start Image Tracking"}
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => {
              setMode("fallback");
              setTrackingStatus("scanning");
            }}
          >
            Fallback preview
          </button>
        </div>
      ) : null}

      {mode === "tracking-loading" && !scriptsReady ? (
        <div className="start-screen">
          <h1>Loading AR Engine</h1>
          <p>Preparing camera and tracking libraries. If this takes too long, fallback mode will open.</p>
          {compatibilityHint ? <p className="compat-note">{compatibilityHint}</p> : null}
          <button type="button" className="chip" onClick={() => setMode("fallback")}>
            Open fallback now
          </button>
        </div>
      ) : null}

      {mode === "tracking" && scriptsReady ? (
        <div className="ar-canvas-wrap">
          <a-scene
            id="museum-ar-scene"
            mindar-image="imageTargetSrc: /ar/targets/artworks.mind; autoStart: false; maxTrack: 1; uiLoading: no; uiError: no; uiScanning: no"
            embedded
            color-space="sRGB"
            renderer="alpha: true; colorManagement: true"
            background="transparent: true"
            vr-mode-ui="enabled: false"
            device-orientation-permission-ui="enabled: false"
          >
            <a-camera
              position="0 0 0"
              look-controls="enabled: false"
              cursor="rayOrigin: mouse; fuse: false"
              raycaster="objects: .ar-clickable; near: 0; far: 10000"
            />
            {artworkList.map((artwork) => (
              <a-entity
                key={artwork.id}
                id={`target-${artwork.targetIndex}`}
                mindar-image-target={`targetIndex: ${artwork.targetIndex}`}
              >
                <SceneByType
                  activeArtwork={artwork}
                  active={activeArtwork?.id === artwork.id}
                  lowPower={lowPower}
                  showDetails={showArDetails}
                  muted={muted}
                  onToggleDetails={() => setShowArDetails((value) => !value)}
                  onToggleMuted={toggleMuted}
                />
              </a-entity>
            ))}
          </a-scene>
        </div>
      ) : null}

      {mode === "fallback" || trackingStatus === "error" ? (
        <FallbackMuseumMode activeArtwork={activeOrDefault} artworks={artworkList} onSelectArtwork={setActiveArtwork} />
      ) : null}

      {started ? (
        <ArtworkOverlay
          activeArtwork={activeArtwork}
          trackingStatus={trackingStatus}
          muted={muted}
          onToggleMuted={toggleMuted}
          lowPower={lowPower}
          setLowPower={setLowPower}
          audioError={scriptsError ?? audioError}
          requiresManualPlay={requiresManualPlay}
          onManualPlay={tryPlayManually}
        />
      ) : null}

    </div>
  );
}
