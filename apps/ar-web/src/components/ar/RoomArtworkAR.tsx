"use client";

import { artworks as defaultArtworks } from "@/data/artworks";
import type { ArtworkConfig } from "@/types/ar";
import type { MouseEvent, PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

interface RoomArtworkARProps {
  artworkId: string;
}

type CameraStatus = "idle" | "starting" | "ready" | "fallback" | "error";

export default function RoomArtworkAR({ artworkId }: RoomArtworkARProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [artworks, setArtworks] = useState<ArtworkConfig[]>(defaultArtworks);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 48 });
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/workbench/artworks", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((manifest: { artworks?: ArtworkConfig[] } | null) => {
        if (!cancelled && manifest?.artworks?.length) setArtworks(manifest.artworks);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const artwork = useMemo(
    () => artworks.find((item) => item.id === artworkId) ?? artworks[0] ?? defaultArtworks[0],
    [artworkId, artworks],
  );
  const artworkImage = artwork.targetImageUrl || artwork.historicalImages[0] || "/ar/images/workbench-demo-art.webp";

  const startCamera = async () => {
    if (cameraStatus === "starting") return;
    setCameraStatus("starting");
    setError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("fallback");
      setError("Camera is not available in this browser, so a preview room is shown instead.");
      return;
    }

    if (!window.isSecureContext) {
      setCameraStatus("fallback");
      setError("Camera AR needs HTTPS. The preview room is available here.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStatus("ready");
    } catch {
      setCameraStatus("fallback");
      setError("Camera permission was blocked or unavailable, so a preview room is shown instead.");
    }
  };

  const placeArtwork = (event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLDivElement | HTMLButtonElement>) => {
    if (cameraStatus !== "ready" && cameraStatus !== "fallback") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({
      x: ((event.clientX - bounds.left) / bounds.width) * 100,
      y: ((event.clientY - bounds.top) / bounds.height) * 100,
    });
    setPlaced(true);
  };

  return (
    <div className="room-ar-page">
      <div className="room-ar-stage" onPointerDown={placed ? undefined : placeArtwork}>
        {cameraStatus === "ready" ? (
          <video ref={videoRef} className="room-ar-camera" muted playsInline autoPlay />
        ) : (
          <div className="room-ar-preview-room" />
        )}

        <div className="room-ar-vignette" />

        {cameraStatus === "idle" || cameraStatus === "starting" ? (
          <div className="room-ar-start">
            <p className="room-ar-kicker">Room AR</p>
            <h1>Place {artwork.title} in your room</h1>
            <p>Open your camera, point at a wall, then tap where you want the artwork to appear.</p>
            <button type="button" onClick={startCamera} disabled={cameraStatus === "starting"}>
              {cameraStatus === "starting" ? "Starting camera..." : "Start Room AR"}
            </button>
            <button type="button" className="room-ar-secondary" onClick={() => setCameraStatus("fallback")}>
              Preview without camera
            </button>
          </div>
        ) : null}

        {cameraStatus === "ready" || cameraStatus === "fallback" ? (
          <>
            {!placed ? (
              <div className="room-ar-reticle" aria-hidden="true">
                <span />
                <p>Tap a wall or empty space</p>
              </div>
            ) : null}
            <button type="button" className="room-ar-tap-layer" onClick={(event) => placeArtwork(event)}>
              <span className="sr-only">Place artwork here</span>
            </button>
            {placed ? (
              <div
                className="room-ar-artwork"
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  transform: `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={artworkImage} alt={artwork.title} />
                <div className="room-ar-label">
                  <strong>{artwork.title}</strong>
                  <span>{artwork.artist}</span>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="room-ar-controls">
        <div>
          <span>{cameraStatus === "ready" ? "Camera view" : "Preview mode"}</span>
          <strong>{artwork.title}</strong>
        </div>
        {error ? <p>{error}</p> : null}
        <div className="room-ar-control-row">
          <button type="button" onClick={() => setScale((value) => Math.max(0.72, value - 0.12))}>
            Smaller
          </button>
          <button type="button" onClick={() => setScale((value) => Math.min(1.55, value + 0.12))}>
            Bigger
          </button>
          <button type="button" onClick={() => setRotation((value) => value - 8)}>
            Rotate
          </button>
          <button type="button" onClick={() => setPlaced(false)}>
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
