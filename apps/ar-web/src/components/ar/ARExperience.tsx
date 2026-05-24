"use client";

import { artworks as defaultArtworks } from "@/data/artworks";
import { useArtworkAudio } from "@/hooks/ar/useArtworkAudio";
import { useLowPowerMode } from "@/hooks/ar/useLowPowerMode";
import { ARObjectConfig, ArtworkConfig, TrackingStatus } from "@/types/ar";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArtworkOverlay } from "@/components/ar/ArtworkOverlay";
import { FallbackMuseumMode } from "@/components/ar/FallbackMuseumMode";
import { MonaLisaScene } from "@/components/ar/scenes/MonaLisaScene";
import { StarryNightScene } from "@/components/ar/scenes/StarryNightScene";
import { ScreamScene } from "@/components/ar/scenes/ScreamScene";
import { ARCustomObjects } from "@/components/ar/scenes/ARCustomObjects";
import AccessibilityOverlay from "@/components/accessibility/AccessibilityOverlay";

const MINDSCRIPTS = [
  "/ar/libs/aframe.min.js",
  "/ar/libs/mindar-image.prod.js",
  "/ar/libs/mindar-image-aframe.prod.js",
];

const MINDAR_TRACKING_CONFIG = {
  filterMinCF: 0.001,
  filterBeta: 10,
  warmupTolerance: 5,
  missTolerance: 12,
};

function SceneByType({
  activeArtwork,
  active,
  lowPower,
  panelMode,
  galleryIndex,
  onPanelClose,
  onGalleryStep,
  onObjectAction,
}: {
  activeArtwork: ArtworkConfig;
  active: boolean;
  lowPower: boolean;
  panelMode: "history" | "gallery" | "portfolio" | "artworks" | null;
  galleryIndex: number;
  onPanelClose: () => void;
  onGalleryStep: (direction: -1 | 1) => void;
  onObjectAction: (object: ARObjectConfig) => void;
}) {
  const panel = (
    <>
      <ARCustomObjects artworkId={activeArtwork.id} objects={activeArtwork.arObjects} active={active} onAction={onObjectAction} />
      <ARTargetPanel
        artwork={activeArtwork}
        mode={active ? panelMode : null}
        galleryIndex={galleryIndex}
        onClose={onPanelClose}
        onStep={onGalleryStep}
      />
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
  const [mindFileUrl, setMindFileUrl] = useState("/ar/targets/artworks.mind");
  const [overlayPanel, setOverlayPanel] = useState<"history" | "gallery" | "portfolio" | "artworks" | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [scriptsReady, setScriptsReady] = useState(false);
  const [scriptsError, setScriptsError] = useState<string | null>(null);
  const [compatibilityHint, setCompatibilityHint] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useState(false);
  const mountedRef = useRef(true);
  const sceneMounted = mode === "tracking" && scriptsReady;
  const { lowPower, setLowPower } = useLowPowerMode();
  const artworksByTargetIndex = useMemo(
    () => new Map(artworkList.filter((artwork) => artwork.targetIndex >= 0).map((artwork) => [artwork.targetIndex, artwork])),
    [artworkList],
  );
  const trackableArtworks = useMemo(
    () => artworkList.filter((artwork) => artwork.targetIndex >= 0),
    [artworkList],
  );
  const arVideoAssets = useMemo(
    () =>
      trackableArtworks.flatMap((artwork) =>
        (artwork.arObjects ?? [])
          .filter((object) => object.type === "video" && !!object.src)
          .map((object) => ({ artworkId: artwork.id, object })),
      ),
    [trackableArtworks],
  );

  const shouldPlayAudio = trackingStatus === "detected";
  const { muted, toggleMuted, audioError, requiresManualPlay, tryPlayManually, pause } =
    useArtworkAudio({
      started,
      activeArtwork,
      shouldPlay: shouldPlayAudio,
    });

  useEffect(() => {
    const onAccessibilityStarted = () => {
      pause();
    };
    window.addEventListener("artify-accessibility-started", onAccessibilityStarted);
    return () => {
      window.removeEventListener("artify-accessibility-started", onAccessibilityStarted);
    };
  }, [pause]);

  useEffect(() => {
    if (voiceAssistantEnabled) {
      pause();
    }
  }, [pause, voiceAssistantEnabled]);

  useEffect(() => {
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>("video[data-artify-ar-video='true']"));
    if (trackingStatus !== "detected" || !activeArtwork) {
      videos.forEach((video) => video.pause());
      return;
    }

    videos.forEach((video) => {
      const isActiveArtwork = video.dataset.artworkId === activeArtwork.id;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      if (isActiveArtwork) {
        void video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [activeArtwork, trackingStatus]);

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
      .then((manifest: { artworks?: ArtworkConfig[]; mindFile?: string; updatedAt?: string } | null) => {
        if (cancelled || !manifest?.artworks?.length) return;
        setArtworkList(manifest.artworks);
        const mindFile = manifest.mindFile || "/ar/targets/artworks.mind";
        const version = manifest.updatedAt || String(Date.now());
        const separator = mindFile.includes("?") ? "&" : "?";
        setMindFileUrl(`${mindFile}${separator}v=${encodeURIComponent(version)}`);
      })
      .catch(() => {
        setArtworkList(defaultArtworks);
        setMindFileUrl(`/ar/targets/artworks.mind?v=${Date.now()}`);
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

    const targetElements = trackableArtworks.map((artwork) =>
      document.getElementById(`target-${artwork.targetIndex}`)
    );
    const handlers: Array<() => void> = [];

    targetElements.forEach((element, arrayIndex) => {
      if (!element) return;
      const configuredTargetIndex = trackableArtworks[arrayIndex]?.targetIndex;
      const onFound = () => {
        const artwork = artworksByTargetIndex.get(configuredTargetIndex);
        if (!artwork) return;
        setActiveArtwork(artwork);
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
  }, [artworksByTargetIndex, pause, sceneMounted, trackableArtworks]);

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
        sceneElement as unknown as { systems?: Record<string, { start?: () => void; ui?: unknown; imageTargetSrc?: string }> }
      ).systems?.["mindar-image-system"];
      if (!arSystem?.start || !arSystem.ui || !arSystem.imageTargetSrc) {
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
      const aframe = window.AFRAME as
        | {
            scenes?: Array<{
              systems?: Record<string, { start?: () => void; stop?: () => void }>;
            }>;
          }
        | undefined;
      if (aframe?.scenes?.length) {
        aframe.scenes.forEach((scene) => {
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

  const handleARObjectAction = (object: ARObjectConfig) => {
    const action = object.actionType ?? "none";
    if (action === "openLink" && object.actionUrl) {
      window.open(object.actionUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (action === "nextImage") {
      setOverlayPanel("gallery");
      setGalleryIndex((current) => {
        const total = Math.max(1, activeOrDefault.historicalImages.length);
        return (current + 1) % total;
      });
      return;
    }
    if (action === "history" || action === "gallery" || action === "portfolio" || action === "artworks") {
      setOverlayPanel(action);
    }
  };

  const stepGallery = (direction: -1 | 1) => {
    const images = activeOrDefault.historicalImages.length
      ? activeOrDefault.historicalImages
      : activeOrDefault.targetImageUrl
        ? [activeOrDefault.targetImageUrl]
        : [];
    setGalleryIndex((current) => {
      const total = Math.max(1, images.length);
      return (current + direction + total) % total;
    });
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
            key={mindFileUrl}
            mindar-image={`imageTargetSrc: ${mindFileUrl}; autoStart: false; maxTrack: 1; filterMinCF: ${MINDAR_TRACKING_CONFIG.filterMinCF}; filterBeta: ${MINDAR_TRACKING_CONFIG.filterBeta}; warmupTolerance: ${MINDAR_TRACKING_CONFIG.warmupTolerance}; missTolerance: ${MINDAR_TRACKING_CONFIG.missTolerance}; uiLoading: no; uiError: no; uiScanning: no`}
            embedded
            color-space="sRGB"
            renderer="alpha: true; colorManagement: true"
            background="transparent: true"
            vr-mode-ui="enabled: false"
            device-orientation-permission-ui="enabled: false"
          >
            <a-assets timeout="15000">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img id="icon-left" src="/ar/icons/left.png" alt="" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img id="icon-right" src="/ar/icons/right.png" alt="" />
              {arVideoAssets.map(({ artworkId, object }) => (
                <video
                  key={`${artworkId}-${object.id}-${object.src}`}
                  id={arVideoAssetId(artworkId, object.id)}
                  data-artify-ar-video="true"
                  data-artwork-id={artworkId}
                  src={workbenchAssetPlaybackUrl(object.src || "")}
                  crossOrigin="anonymous"
                  muted
                  loop
                  autoPlay
                  playsInline
                  preload="auto"
                />
              ))}
            </a-assets>
            <a-camera
              position="0 0 0"
              look-controls="enabled: false"
              cursor="rayOrigin: mouse; fuse: false"
              raycaster="objects: .ar-clickable; near: 0; far: 10000"
            />
            {trackableArtworks.map((artwork) => (
              <a-entity
                key={artwork.id}
                id={`target-${artwork.targetIndex}`}
                mindar-image-target={`targetIndex: ${artwork.targetIndex}`}
              >
                <SceneByType
                  activeArtwork={artwork}
                  active={activeArtwork?.id === artwork.id}
                  lowPower={lowPower}
                  panelMode={activeArtwork?.id === artwork.id ? overlayPanel : null}
                  galleryIndex={galleryIndex}
                  onPanelClose={() => setOverlayPanel(null)}
                  onGalleryStep={stepGallery}
                  onObjectAction={handleARObjectAction}
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
          voiceAssistantEnabled={voiceAssistantEnabled}
          onToggleVoiceAssistant={() => setVoiceAssistantEnabled((enabled) => !enabled)}
        />
      ) : null}

      {started ? (
        <AccessibilityOverlay
          enabled={voiceAssistantEnabled}
          activeArtwork={activeArtwork}
          artworks={artworkList}
          onDisable={() => setVoiceAssistantEnabled(false)}
        />
      ) : null}

      {started && activeOrDefault && overlayPanel && mode !== "tracking" ? (
        <ARInteractionPanel
          mode={overlayPanel}
          artwork={activeOrDefault}
          artworks={artworkList}
          galleryIndex={galleryIndex}
          setGalleryIndex={setGalleryIndex}
          onClose={() => setOverlayPanel(null)}
          onSelectArtwork={setActiveArtwork}
        />
      ) : null}

    </div>
  );
}

function ARTargetPanel({
  artwork,
  mode,
  galleryIndex,
  onClose,
  onStep,
}: {
  artwork: ArtworkConfig;
  mode: "history" | "gallery" | "portfolio" | "artworks" | null;
  galleryIndex: number;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
}) {
  if (!mode) return null;

  const images = artwork.historicalImages.length ? artwork.historicalImages : artwork.targetImageUrl ? [artwork.targetImageUrl] : [];
  const visibleImages = images.slice(0, 8);
  const currentIndex = visibleImages.length ? galleryIndex % visibleImages.length : 0;
  const imageWidth = 0.92;
  const imageHeight = 0.52;

  if (mode === "history") {
    return (
      <a-entity id={`${artwork.id}-history-panel`} position="0 0 0.82">
        <a-plane width="1.08" height="0.66" color="#fffaf0" material="transparent: true; opacity: 0.94" />
        <a-text value="History" color="#111111" align="center" width="1.7" position="0 0.25 0.018" />
        <a-text
          value={artwork.historyText}
          color="#111111"
          align="center"
          width="0.94"
          wrap-count="34"
          position="0 -0.03 0.018"
        />
        <ARPanelCloseButton onClick={onClose} />
      </a-entity>
    );
  }

  if (mode !== "portfolio" && mode !== "gallery") return null;

  return (
    <a-entity id={`${artwork.id}-portfolio-panel`} position="0 0 0.82">
      <a-plane width="1.08" height="0.74" color="#fffaf0" material="transparent: true; opacity: 0.94" />
      <a-text
        value={mode === "portfolio" ? "Portfolio" : "Gallery"}
        color="#111111"
        align="center"
        width="1.8"
        position="0 0.35 0.018"
      />
      {visibleImages.length ? (
        visibleImages.map((image, index) => (
          <a-image
            key={`${artwork.id}-portfolio-${image}-${index}`}
            src={image}
            visible={index === currentIndex}
            alpha-test="0.5"
            position="0 0.02 0.026"
            width={imageWidth}
            height={imageHeight}
          />
        ))
      ) : (
        <a-text
          value="No images yet"
          color="#111111"
          align="center"
          width="1"
          position="0 0.02 0.026"
        />
      )}
      <a-plane
        class="ar-clickable"
        width="0.14"
        height="0.14"
        color="#111111"
        material={`transparent: true; opacity: ${visibleImages.length > 1 ? 0.9 : 0.28}`}
        position="-0.64 0.02 0.04"
        onClick={() => visibleImages.length > 1 && onStep(-1)}
      />
      <a-text value="<" color="#ffffff" align="center" width="0.55" position="-0.64 0.005 0.052" />
      <a-plane
        class="ar-clickable"
        width="0.14"
        height="0.14"
        color="#111111"
        material={`transparent: true; opacity: ${visibleImages.length > 1 ? 0.9 : 0.28}`}
        position="0.64 0.02 0.04"
        onClick={() => visibleImages.length > 1 && onStep(1)}
      />
      <a-text value=">" color="#ffffff" align="center" width="0.55" position="0.64 0.005 0.052" />
      <a-text
        value={`${Math.min(currentIndex + 1, Math.max(1, visibleImages.length))} / ${Math.max(1, visibleImages.length)}`}
        color="#111111"
        align="center"
        width="0.7"
        position="0 -0.34 0.028"
      />
      <ARPanelCloseButton onClick={onClose} />
    </a-entity>
  );
}

function arVideoAssetId(artworkId: string, objectId: string) {
  return `ar-video-${cssSafeId(artworkId)}-${cssSafeId(objectId)}`;
}

function cssSafeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function workbenchAssetPlaybackUrl(url: string) {
  if (!url.startsWith("/ar/workbench/assets/")) return url;
  return url.replace(/^\/ar\/workbench\/assets\//, "/api/workbench/assets/");
}

function ARPanelCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <>
      <a-plane
        class="ar-clickable"
        width="0.14"
        height="0.14"
        color="#111111"
        position="0.48 0.31 0.04"
        onClick={onClick}
      />
      <a-text value="x" color="#ffffff" align="center" width="0.5" position="0.48 0.295 0.052" />
    </>
  );
}

function ARInteractionPanel({
  mode,
  artwork,
  artworks,
  galleryIndex,
  setGalleryIndex,
  onClose,
  onSelectArtwork,
}: {
  mode: "history" | "gallery" | "portfolio" | "artworks";
  artwork: ArtworkConfig;
  artworks: ArtworkConfig[];
  galleryIndex: number;
  setGalleryIndex: (updater: (current: number) => number) => void;
  onClose: () => void;
  onSelectArtwork: (artwork: ArtworkConfig) => void;
}) {
  const images = artwork.historicalImages.length ? artwork.historicalImages : artwork.targetImageUrl ? [artwork.targetImageUrl] : [];
  const changeImage = (direction: -1 | 1) => {
    setGalleryIndex((current) => {
      const total = Math.max(1, images.length);
      return (current + direction + total) % total;
    });
  };

  return (
    <div className="ar-interaction-panel">
      <div className="ar-panel-heading">
        <div>
          <span>{mode}</span>
          <strong>{artwork.title}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="Close AR panel">
          ×
        </button>
      </div>

      {mode === "history" ? <p>{artwork.historyText}</p> : null}

      {mode === "portfolio" ? (
        <div className="ar-panel-list">
          <div className="ar-portfolio-copy">
            <p>{artwork.artist}</p>
            <p>{artwork.shortSummary}</p>
          </div>
          <ARPhotoCarousel
            images={images}
            galleryIndex={galleryIndex}
            onPrevious={() => changeImage(-1)}
            onNext={() => changeImage(1)}
            emptyLabel="No portfolio photo yet."
          />
          {artworks
            .filter((item) => item.artist === artwork.artist)
            .map((item) => (
              <button key={item.id} type="button" onClick={() => onSelectArtwork(item)}>
                {item.title} · {item.year}
              </button>
            ))}
        </div>
      ) : null}

      {mode === "artworks" ? (
        <div className="ar-panel-list">
          {artworks.map((item) => (
            <button key={item.id} type="button" onClick={() => onSelectArtwork(item)}>
              {item.title} · {item.artist}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "gallery" ? (
        <ARPhotoCarousel
          images={images}
          galleryIndex={galleryIndex}
          onPrevious={() => changeImage(-1)}
          onNext={() => changeImage(1)}
          emptyLabel="No historical image yet."
        />
      ) : null}
    </div>
  );
}

function ARPhotoCarousel({
  images,
  galleryIndex,
  onPrevious,
  onNext,
  emptyLabel,
}: {
  images: string[];
  galleryIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  emptyLabel: string;
}) {
  const total = images.length;
  const currentIndex = total ? galleryIndex % total : 0;
  const currentImage = total ? images[currentIndex] : "";

  return (
    <div className="ar-gallery-panel">
      <div className="ar-photo-carousel">
        {currentImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentImage} alt="" />
        ) : (
          <p className="ar-photo-empty">{emptyLabel}</p>
        )}
        {total > 0 ? (
          <>
            <button
              type="button"
              className="ar-photo-nav is-left"
              onClick={onPrevious}
              disabled={total <= 1}
              aria-label="Previous photo"
            >
              {"<"}
            </button>
            <button
              type="button"
              className="ar-photo-nav is-right"
              onClick={onNext}
              disabled={total <= 1}
              aria-label="Next photo"
            >
              {">"}
            </button>
            <span className="ar-photo-counter">
              {currentIndex + 1} / {total}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
