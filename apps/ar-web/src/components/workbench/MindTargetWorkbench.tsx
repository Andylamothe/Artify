"use client";

import { artworks as seedArtworks } from "@/data/artworks";
import { AILivingArtModal } from "@/components/workbench/AILivingArtModal";
import { MotionBrushModal } from "@/components/workbench/MotionBrushModal";
import {
  ARObjectConfig,
  ARObjectActionType,
  ARPortfolioItem,
  ARObjectType,
  ArtworkConfig,
  MotionBrushState,
  ArtworkSceneType,
  WorkbenchManifest,
} from "@/types/ar";
import {
  ChangeEvent,
  DragEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type MindCompiler = {
  compileImageTargets(images: HTMLImageElement[], progress: (value: number) => void): Promise<unknown[]>;
  exportData(): Uint8Array;
};

type WorkshopTab = "target" | "scene" | "assets" | "preview" | "publish";
type AssetKind = "audio" | "image" | "layer" | "target";
type UploadKind = AssetKind | "motion";
type UploadProgressItem = {
  id: string;
  name: string;
  kind: UploadKind;
  loaded: number;
  total: number;
  percent: number;
  state: "uploading" | "done" | "error";
};
type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type MediaDimensions = { width: number; height: number; aspect: number };
type ViewportState = { zoom: number; panX: number; panY: number };
type WorldPoint = { x: number; y: number };
type TransformDrag =
  | { objectId: string; mode: "move"; startObject: ARObjectConfig; startPointer: WorldPoint }
  | { objectId: string; mode: "resize"; handle: ResizeHandle; startObject: ARObjectConfig; startPointer: WorldPoint }
  | { objectId: string; mode: "rotate"; startObject: ARObjectConfig; startPointer: WorldPoint };
type PanDrag = { startX: number; startY: number; startPanX: number; startPanY: number };

declare global {
  interface Window {
    MINDAR?: {
      IMAGE?: {
        Compiler?: new () => MindCompiler;
      };
    };
  }
}

const compilerScript = "/ar/libs/mindar-image.prod.js";
const tabs: Array<{ id: WorkshopTab; label: string; hint: string }> = [
  { id: "target", label: "Target Setup", hint: "Image + MindAR index" },
  { id: "scene", label: "Scene Editor", hint: "Objects + animation" },
  { id: "assets", label: "Assets", hint: "Audio, media, history" },
  { id: "preview", label: "Preview", hint: "AR-style test view" },
  { id: "publish", label: "Publish", hint: "Compile + deploy assets" },
];

const sceneTypes: Array<{ value: ArtworkSceneType; label: string; note: string }> = [
  { value: "monaLisa", label: "Halo / glow", note: "Golden frame, particles, soft light" },
  { value: "starryNight", label: "Swirl / stars", note: "Blue/yellow movement and rotating sky" },
  { value: "scream", label: "Pulse / waves", note: "Red pulse, shake and dramatic frame" },
];

const objectPalette: Array<{ type: ARObjectType; label: string; icon: string; note: string }> = [
  { type: "text", label: "Text", icon: "T", note: "A-Frame a-text label" },
  { type: "image", label: "Image", icon: "IMG", note: "PNG/JPG/WebP plane" },
  { type: "gif", label: "GIF", icon: "GIF", note: "Animated texture layer" },
  { type: "video", label: "Video", icon: "VID", note: "Mobile-friendly MP4/WebM" },
  { type: "model3d", label: "3D", icon: "3D", note: "Light GLB model" },
  { type: "button", label: "Button", icon: "BTN", note: "Clickable AR action" },
  { type: "panel", label: "Panel", icon: "PNL", note: "History / portfolio card" },
  { type: "portfolio", label: "Portfolio", icon: "PF", note: "Artist works carousel" },
  { type: "brush", label: "Brush", icon: "BR", note: "Draw animated motion paths" },
];

const actionTypes: Array<{ value: ARObjectActionType; label: string }> = [
  { value: "none", label: "No action" },
  { value: "history", label: "Show history" },
  { value: "gallery", label: "Show gallery" },
  { value: "portfolio", label: "Creator portfolio" },
  { value: "artworks", label: "Other artworks" },
  { value: "nextImage", label: "Next image" },
  { value: "openLink", label: "Open link" },
];

const emptyArtwork = (targetIndex: number): ArtworkConfig => ({
  id: `artwork-${Date.now()}`,
  title: "New artwork",
  artist: "Unknown artist",
  year: "2026",
  shortSummary: "Short visitor-facing summary.",
  historyText: "Historical context for the museum panel.",
  targetIndex,
  targetImageUrl: "",
  audioUrl: "",
  historicalImages: [],
  arSceneType: "monaLisa",
  colors: {
    primary: "#2f6f61",
    secondary: "#d7ece4",
    accent: "#d19a3a",
  },
  effects: {
    particleCount: 80,
    lowPowerParticleCount: 35,
    intensity: "low",
  },
  arObjects: [],
});

export function MindTargetWorkbench() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const targetInputRef = useRef<HTMLInputElement | null>(null);
  const transformDragRef = useRef<TransformDrag | null>(null);
  const panDragRef = useRef<PanDrag | null>(null);
  const viewportRef = useRef<ViewportState>({ zoom: 1, panX: 0, panY: 0 });
  const [manifest, setManifest] = useState<WorkbenchManifest>({
    version: 1,
    updatedAt: new Date().toISOString(),
    mindFile: "/ar/targets/artworks.mind",
    artworks: seedArtworks,
  });
  const [selectedId, setSelectedId] = useState(seedArtworks[0]?.id ?? "");
  const selectedArtwork = useMemo(
    () => manifest.artworks.find((artwork) => artwork.id === selectedId) ?? manifest.artworks[0],
    [manifest.artworks, selectedId],
  );
  const [draft, setDraft] = useState<ArtworkConfig>(selectedArtwork ?? emptyArtwork(0));
  const [activeTab, setActiveTab] = useState<WorkshopTab>("scene");
  const [aframeReady, setAframeReady] = useState(() => typeof window !== "undefined" && !!window.AFRAME);
  const [targetFiles, setTargetFiles] = useState<Record<string, File>>({});
  const [targetPreviews, setTargetPreviews] = useState<Record<string, string>>({});
  const [targetDimensions, setTargetDimensions] = useState<Record<string, MediaDimensions>>({});
  const [creationDraft, setCreationDraft] = useState<ArtworkConfig | null>(null);
  const [creationTargetFile, setCreationTargetFile] = useState<File | null>(null);
  const [creationTargetPreview, setCreationTargetPreview] = useState("");
  const [creationTargetDimensions, setCreationTargetDimensions] = useState<MediaDimensions | null>(null);
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [uploadProgressItems, setUploadProgressItems] = useState<UploadProgressItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [motionBrushObjectId, setMotionBrushObjectId] = useState<string | null>(null);
  const [aiMotionObjectId, setAiMotionObjectId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ objectId: string; x: number; y: number } | null>(null);
  const [brushMode, setBrushMode] = useState(false);
  const brushDrawingRef = useRef<string | null>(null);
  const [viewport, setViewport] = useState<ViewportState>({ zoom: 1, panX: 0, panY: 0 });

  const objects = useMemo(() => draft.arObjects ?? [], [draft.arObjects]);
  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );
  const motionBrushObject = useMemo(
    () => objects.find((object) => object.id === motionBrushObjectId) ?? null,
    [motionBrushObjectId, objects],
  );
  const aiMotionObject = useMemo(
    () => objects.find((object) => object.id === aiMotionObjectId) ?? null,
    [aiMotionObjectId, objects],
  );
  const workingArtworks = useMemo(
    () => manifest.artworks.map((artwork) => (artwork.id === draft.id ? normalizeDraft(draft) : artwork)),
    [draft, manifest.artworks],
  );
  const targetQueue = useMemo(
    () => workingArtworks.filter((artwork) => targetFiles[artwork.id] || artwork.targetImageUrl),
    [targetFiles, workingArtworks],
  );
  const targetPreview = targetPreviews[draft.id] || draft.targetImageUrl || draft.historicalImages[0] || "";
  const targetSize = targetDimensions[draft.id];
  const targetHealth = targetPreview ? "Target image ready" : "Needs target image";

  const updateDraft = <Key extends keyof ArtworkConfig>(key: Key, value: ArtworkConfig[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateObjects = (nextObjects: ARObjectConfig[]) => {
    updateDraft("arObjects", nextObjects);
  };

  const updateViewport = (updater: (current: ViewportState) => ViewportState) => {
    setViewport((current) => {
      const next = normalizeViewport(updater(current));
      viewportRef.current = next;
      return next;
    });
  };

  const beginUploadProgress = (file: File, kind: UploadKind) => {
    const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const uploadItem: UploadProgressItem = {
      id,
      name: file.name || assetLabel(kind),
      kind,
      loaded: 0,
      total: file.size,
      percent: 0,
      state: "uploading",
    };
    setUploadProgressItems((items) => [uploadItem, ...items].slice(0, 8));
    return id;
  };

  const updateUploadProgress = (
    id: string,
    patch: Partial<Omit<UploadProgressItem, "id" | "name" | "kind">>,
  ) => {
    setUploadProgressItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const finishUploadProgress = (id: string, state: "done" | "error") => {
    updateUploadProgress(id, { percent: state === "done" ? 100 : undefined, state });
    window.setTimeout(
      () => setUploadProgressItems((items) => items.filter((item) => item.id !== id)),
      state === "done" ? 1800 : 4500,
    );
  };

  function appendBrushPoint(objectId: string, event: globalThis.PointerEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPointerToWorld(event, canvas, viewportRef.current);
    setDraft((current) => ({
      ...current,
      arObjects: (current.arObjects ?? []).map((object) => {
        if (object.id !== objectId) return object;
        const points = [...(object.brushPoints ?? [])];
        const previous = points.at(-1);
        if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 0.025) return object;
        const nextPoints = [...points, point].slice(-90);
        return applyBrushBounds({ ...object, brushPoints: nextPoints });
      }),
    }));
  }

  useEffect(() => {
    fetch("/api/workbench/artworks", { cache: "no-store" })
      .then((response) => response.json())
      .then((nextManifest: WorkbenchManifest) => {
        if (!nextManifest.artworks?.length) return;
        const restoredSelectedId = window.sessionStorage.getItem("artify-workbench-selected-id");
        const restoredTab = window.sessionStorage.getItem("artify-workbench-active-tab") as WorkshopTab | null;
        const restoredArtwork =
          nextManifest.artworks.find((artwork) => artwork.id === restoredSelectedId) ?? nextManifest.artworks[0];
        setManifest(nextManifest);
        setSelectedId(restoredArtwork.id);
        setDraft(restoredArtwork);
        if (restoredTab && tabs.some((tab) => tab.id === restoredTab)) setActiveTab(restoredTab);
      })
      .catch(() => setError("Could not load saved workbench config; using bundled demo artworks."));
  }, []);

  useEffect(() => {
    const initialPixelRatio = window.devicePixelRatio;
    const initialViewportScale = window.visualViewport?.scale ?? 1;
    let reloadTimer = 0;

    const reloadAfterBrowserZoom = () => {
      const nextPixelRatio = window.devicePixelRatio;
      const nextViewportScale = window.visualViewport?.scale ?? 1;
      const pixelRatioChanged = Math.abs(nextPixelRatio - initialPixelRatio) > 0.01;
      const viewportScaleChanged = Math.abs(nextViewportScale - initialViewportScale) > 0.01;
      if (!pixelRatioChanged && !viewportScaleChanged) return;

      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(() => {
        window.sessionStorage.setItem("artify-workbench-selected-id", selectedId);
        window.sessionStorage.setItem("artify-workbench-active-tab", activeTab);
        window.location.reload();
      }, 450);
    };

    window.addEventListener("resize", reloadAfterBrowserZoom);
    window.visualViewport?.addEventListener("resize", reloadAfterBrowserZoom);
    return () => {
      window.clearTimeout(reloadTimer);
      window.removeEventListener("resize", reloadAfterBrowserZoom);
      window.visualViewport?.removeEventListener("resize", reloadAfterBrowserZoom);
    };
  }, [activeTab, selectedId]);

  useEffect(() => {
    if (!targetPreview || targetDimensions[draft.id]) return;
    let cancelled = false;
    loadImageDimensions(targetPreview)
      .then((dimensions) => {
        if (cancelled) return;
        setTargetDimensions((current) => ({ ...current, [draft.id]: dimensions }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [draft.id, targetDimensions, targetPreview]);

  useEffect(() => {
    if (window.AFRAME) {
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-workbench-aframe="true"]');
    if (existing) {
      existing.addEventListener("load", () => setAframeReady(true), { once: true });
      existing.addEventListener("error", () => setError("Could not load A-Frame preview engine."), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "/ar/libs/aframe.min.js";
    script.async = true;
    script.dataset.workbenchAframe = "true";
    script.onload = () => setAframeReady(true);
    script.onerror = () => setError("Could not load A-Frame preview engine.");
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.key !== "Delete" && event.key !== "Backspace") || !selectedObjectId) return;
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT") return;
      event.preventDefault();
      setDraft((current) => ({
        ...current,
        arObjects: (current.arObjects ?? []).filter((object) => object.id !== selectedObjectId),
      }));
      setSelectedObjectId(null);
    };
    const closeMenu = () => setContextMenu(null);
    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (brushDrawingRef.current && canvasRef.current) {
        event.preventDefault();
        appendBrushPoint(brushDrawingRef.current, event);
        return;
      }

      const pan = panDragRef.current;
      if (pan) {
        event.preventDefault();
        updateViewport(() => ({
          zoom: viewportRef.current.zoom,
          panX: pan.startPanX + event.clientX - pan.startX,
          panY: pan.startPanY + event.clientY - pan.startY,
        }));
        return;
      }

      const drag = transformDragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      event.preventDefault();
      setDraft((current) => ({
        ...current,
        arObjects: (current.arObjects ?? []).map((object) =>
          object.id === drag.objectId ? transformObjectFromPointer(drag, event, canvas, viewportRef.current) : object,
        ),
      }));
    };
    const onPointerUp = () => {
      transformDragRef.current = null;
      panDragRef.current = null;
      brushDrawingRef.current = null;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", closeMenu);
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [objects, selectedObjectId]);

  const updateObject = (nextObject: ARObjectConfig) => {
    updateObjects(objects.map((object) => (object.id === nextObject.id ? nextObject : object)));
  };

  const addObject = (type: ARObjectType) => {
    if (type === "brush") {
      setBrushMode(true);
      setSelectedObjectId(null);
      setStatus("Brush mode: drag on the AR canvas to draw an animated stroke.");
      return;
    }
    const nextObject = createARObject(type, objects.length);
    updateObjects([...objects, nextObject]);
    setSelectedObjectId(nextObject.id);
    setActiveTab("scene");
    setStatus(`${nextObject.name} added`);
  };

  const openMotionBrushStudio = () => {
    const editableSelected =
      selectedObject && (selectedObject.type === "image" || selectedObject.type === "gif" || selectedObject.type === "video")
        ? selectedObject
        : null;
    const existingImageObject =
      editableSelected ??
      objects.find((object) => (object.type === "image" || object.type === "gif" || object.type === "video") && object.src);

    if (existingImageObject) {
      setBrushMode(false);
      setSelectedObjectId(existingImageObject.id);
      setMotionBrushObjectId(existingImageObject.id);
      setActiveTab("scene");
      setStatus(`Motion Brush opened for ${existingImageObject.name}.`);
      return;
    }

    if (!targetPreview) {
      setError("Upload or select an artwork target image before opening Motion Brush.");
      return;
    }

    const baseLayer = createARObject("image", objects.length);
    const aspect = targetSize?.aspect ?? 0.72;
    const nextObject = applyMediaAspectRatio(
      {
        ...baseLayer,
        name: "Motion Brush layer",
        src: targetPreview,
        position: { x: 0, y: 0, z: 0.34 },
        opacity: 1,
      },
      aspect,
    );

    updateObjects([...objects, nextObject]);
    setBrushMode(false);
    setSelectedObjectId(nextObject.id);
    setMotionBrushObjectId(nextObject.id);
    setActiveTab("scene");
    setStatus("Motion Brush Studio opened on a new image layer.");
  };

  const openAILivingArtStudio = () => {
    const editableSelected =
      selectedObject && (selectedObject.type === "image" || selectedObject.type === "gif" || selectedObject.type === "video")
        ? selectedObject
        : null;
    const existingImageObject =
      editableSelected ??
      objects.find((object) => (object.type === "image" || object.type === "gif" || object.type === "video") && object.src);

    if (existingImageObject) {
      setSelectedObjectId(existingImageObject.id);
      setAiMotionObjectId(existingImageObject.id);
      setActiveTab("scene");
      setStatus(`Google Living Art opened for ${existingImageObject.name}.`);
      return;
    }

    if (!targetPreview) {
      setError("Upload or select an artwork target image before opening Google Living Art.");
      return;
    }

    const baseLayer = createARObject("image", objects.length);
    const nextObject = applyMediaAspectRatio(
      {
        ...baseLayer,
        name: "Google Living Art source",
        src: targetPreview,
        position: { x: 0, y: 0, z: 0.36 },
        opacity: 1,
      },
      targetSize?.aspect ?? 0.72,
    );
    updateObjects([...objects, nextObject]);
    setSelectedObjectId(nextObject.id);
    setAiMotionObjectId(nextObject.id);
    setActiveTab("scene");
    setStatus("Google Living Art opened on the artwork image.");
  };

  const attachAIGeneratedVideo = async (url: string) => {
    const sourceObject = aiMotionObject;
    if (!sourceObject) return;
    const playbackUrl = workbenchAssetPlaybackUrl(url);
    await warmVideoPlayback(playbackUrl).catch(() => null);
    const dimensions = await loadMediaDimensions(playbackUrl, "video").catch(() => null);
    const nextObject = dimensions
      ? applyMediaAspectRatio({ ...sourceObject, type: "video", src: playbackUrl, name: "Google Living Art video" }, dimensions.aspect)
      : { ...sourceObject, type: "video" as const, src: playbackUrl, name: "Google Living Art video" };
    const nextObjects = objects.map((object) => (object.id === nextObject.id ? nextObject : object));
    updateObjects(nextObjects);
    const nextDraft = { ...draft, arObjects: nextObjects };
    setDraft(nextDraft);
    setSelectedObjectId(nextObject.id);
    setAiMotionObjectId(null);
    setStatus("Google Living Art video attached and saved to the artwork repository.");
    await saveDraft(manifest.artworks.map((artwork) => (artwork.id === draft.id ? normalizeDraft(nextDraft) : artwork)));
  };

  const selectArtwork = (artwork: ArtworkConfig) => {
    setSelectedId(artwork.id);
    setDraft(artwork);
    setSelectedObjectId(null);
    setContextMenu(null);
  };

  const addArtwork = () => {
    const nextArtwork = emptyArtwork(manifest.artworks.length);
    setCreationDraft(nextArtwork);
    setCreationTargetFile(null);
    if (creationTargetPreview) URL.revokeObjectURL(creationTargetPreview);
    setCreationTargetPreview("");
    setCreationTargetDimensions(null);
    setSelectedObjectId(null);
    setContextMenu(null);
    setStatus("New artwork setup started.");
  };

  const cancelArtworkCreation = () => {
    if (creationTargetPreview) URL.revokeObjectURL(creationTargetPreview);
    setCreationDraft(null);
    setCreationTargetFile(null);
    setCreationTargetPreview("");
    setCreationTargetDimensions(null);
    setError(null);
    setStatus("Ready");
  };

  const assignCreationTarget = async (files: File[]) => {
    const file = files.find(isSupportedImageFile);
    if (!file) {
      setError("Choose a supported image target before creating the artwork.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    const dimensions = await readMediaDimensions(file).catch(() => null);
    if (creationTargetPreview) URL.revokeObjectURL(creationTargetPreview);
    setCreationTargetFile(file);
    setCreationTargetPreview(previewUrl);
    setCreationTargetDimensions(dimensions);
    setError(null);
    setStatus("Target image ready for new artwork.");
  };

  const createArtworkAndCompile = async () => {
    if (!creationDraft) return;
    if (!creationTargetFile) {
      setError("Upload a target image before creating the artwork.");
      return;
    }

    const stableId = uniqueArtworkId(slugify(creationDraft.title || "new-artwork"), manifest.artworks);
    setIsSaving(true);
    setError(null);
    setStatus("Uploading target image");
    const creationUploadId = beginUploadProgress(creationTargetFile, "target");
    const targetUrl = await uploadWorkbenchAsset(creationTargetFile, stableId, (uploadProgress) =>
      updateUploadProgress(creationUploadId, uploadProgress),
    )
      .then((payload) => payload.url)
      .catch((uploadError) => {
        finishUploadProgress(creationUploadId, "error");
        setError(uploadError instanceof Error ? uploadError.message : "Target upload failed.");
        return "";
      })
      .finally(() => setIsSaving(false));
    if (!targetUrl) return;
    finishUploadProgress(creationUploadId, "done");

    const nextArtwork = normalizeDraft({
      ...creationDraft,
      id: stableId,
      targetImageUrl: targetUrl,
      targetIndex: manifest.artworks.length,
    });
    const nextArtworks = [...workingArtworks, nextArtwork];
    const nextTargetFiles = { ...targetFiles, [nextArtwork.id]: creationTargetFile };

    setTargetFiles(nextTargetFiles);
    if (creationTargetPreview) {
      setTargetPreviews((current) => ({ ...current, [nextArtwork.id]: creationTargetPreview }));
    }
    if (creationTargetDimensions) {
      setTargetDimensions((current) => ({ ...current, [nextArtwork.id]: creationTargetDimensions }));
    }

    const created = await compileMindWith(nextArtworks, nextTargetFiles, nextArtwork.id, "Artwork created and .mind installed");
    if (!created) return;

    setCreationDraft(null);
    setCreationTargetFile(null);
    setCreationTargetPreview("");
    setCreationTargetDimensions(null);
    setActiveTab("scene");
  };

  const deleteArtwork = async (artworkId: string) => {
    if (manifest.artworks.length <= 1) {
      setError("Keep at least one artwork in the collection.");
      return;
    }

    const artwork = manifest.artworks.find((item) => item.id === artworkId);
    const confirmed = window.confirm(`Delete "${artwork?.title ?? "this artwork"}" from the workbench?`);
    if (!confirmed) return;

    const nextArtworks = manifest.artworks
      .filter((item) => item.id !== artworkId)
      .map((item, index) => ({ ...item, targetIndex: index }));
    const nextSelected = nextArtworks[0];

    setTargetFiles((current) => {
      const next = { ...current };
      delete next[artworkId];
      return next;
    });
    setTargetDimensions((current) => {
      const next = { ...current };
      delete next[artworkId];
      return next;
    });
    setTargetPreviews((current) => {
      if (current[artworkId]) URL.revokeObjectURL(current[artworkId]);
      const next = { ...current };
      delete next[artworkId];
      return next;
    });

    setIsSaving(true);
    setError(null);
    try {
      const saved = await saveManifest({ ...manifest, artworks: nextArtworks });
      setManifest(saved);
      setSelectedId(nextSelected.id);
      setDraft(nextSelected);
      setSelectedObjectId(null);
      setStatus("Artwork deleted. Recompile .mind before demo if target order changed.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete artwork.");
    } finally {
      setIsSaving(false);
    }
  };

  const assignTarget = async (files: File[]) => {
    const file = files.find(isSupportedImageFile);
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const dimensions = await readMediaDimensions(file).catch(() => null);
    setTargetFiles((current) => ({ ...current, [draft.id]: file }));
    if (dimensions) {
      setTargetDimensions((current) => ({ ...current, [draft.id]: dimensions }));
    }
    setTargetPreviews((current) => {
      if (current[draft.id]) URL.revokeObjectURL(current[draft.id]);
      return { ...current, [draft.id]: previewUrl };
    });
    const uploadedUrl = await uploadAsset(file, "target");
    if (uploadedUrl) updateDraft("targetImageUrl", uploadedUrl);
    setStatus(`Target image assigned to ${draft.title}`);
  };

  const uploadAsset = async (file: File, kind: AssetKind) => {
    setIsSaving(true);
    setError(null);
    const uploadId = beginUploadProgress(file, kind);
    const selectedLayer = kind === "layer" ? selectedObject : null;
    const localPreviewUrl =
      selectedLayer && (selectedLayer.type === "image" || selectedLayer.type === "gif" || selectedLayer.type === "video")
        ? URL.createObjectURL(file)
        : "";
    try {
      const dimensions = kind === "layer" ? await readMediaDimensions(file).catch(() => null) : null;
      if (selectedLayer && localPreviewUrl) {
        const previewObject = dimensions
          ? applyMediaAspectRatio({ ...selectedLayer, src: localPreviewUrl }, dimensions.aspect)
          : { ...selectedLayer, src: localPreviewUrl };
        updateObject(previewObject);
        setStatus("Local preview ready while the asset uploads...");
      }

      const payload = await uploadWorkbenchAsset(file, draft.id, (uploadProgress) =>
        updateUploadProgress(uploadId, uploadProgress),
      );
      if (kind === "audio") updateDraft("audioUrl", payload.url);
      if (kind === "image") updateDraft("historicalImages", [...draft.historicalImages, payload.url]);
      if (kind === "layer" && selectedLayer) {
        const nextObject = dimensions
          ? applyMediaAspectRatio({ ...selectedLayer, src: payload.url }, dimensions.aspect)
          : { ...selectedLayer, src: payload.url };
        updateObject(nextObject);
      }
      if (kind === "target") updateDraft("targetImageUrl", payload.url);
      setStatus(`${assetLabel(kind)} uploaded`);
      finishUploadProgress(uploadId, "done");
      return payload.url;
    } catch (assetError) {
      if (selectedLayer && localPreviewUrl) updateObject(selectedLayer);
      finishUploadProgress(uploadId, "error");
      setError(assetError instanceof Error ? assetError.message : "Asset upload failed.");
      return null;
    } finally {
      if (localPreviewUrl) window.setTimeout(() => URL.revokeObjectURL(localPreviewUrl), 1000);
      setIsSaving(false);
    }
  };

  const uploadPortfolioImages = async (files: File[]) => {
    const imageFiles = files.filter(isSupportedImageFile);
    if (!imageFiles.length) {
      setError("Choose at least one supported image file for the portfolio.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of imageFiles) {
        const uploadId = beginUploadProgress(file, "image");
        try {
          const payload = await uploadWorkbenchAsset(file, draft.id, (uploadProgress) =>
            updateUploadProgress(uploadId, uploadProgress),
          );
          finishUploadProgress(uploadId, "done");
          uploadedUrls.push(payload.url);
        } catch (portfolioUploadError) {
          finishUploadProgress(uploadId, "error");
          throw portfolioUploadError;
        }
      }
      setDraft((current) => ({
        ...current,
        historicalImages: [...current.historicalImages, ...uploadedUrls],
      }));
      setStatus(`${uploadedUrls.length} portfolio image${uploadedUrls.length > 1 ? "s" : ""} uploaded`);
    } catch (assetError) {
      setError(assetError instanceof Error ? assetError.message : "Portfolio upload failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const uploadPortfolioObjectImage = async (object: ARObjectConfig, file: File) => {
    if (!isSupportedImageFile(file)) {
      setError("Choose a supported image file for the portfolio item.");
      return;
    }

    setIsSaving(true);
    setError(null);
    const uploadId = beginUploadProgress(file, "image");
    try {
      const payload = await uploadWorkbenchAsset(file, draft.id, (uploadProgress) =>
        updateUploadProgress(uploadId, uploadProgress),
      );
      const nextItem = createPortfolioItem(payload.url, file.name.replace(/\.[^/.]+$/, "") || "Artwork");
      updateObject({
        ...object,
        portfolioItems: [...(object.portfolioItems ?? []), nextItem],
      });
      setDraft((current) => ({
        ...current,
        historicalImages: current.historicalImages.includes(payload.url)
          ? current.historicalImages
          : [...current.historicalImages, payload.url],
      }));
      finishUploadProgress(uploadId, "done");
      setStatus("Portfolio artwork uploaded and selected.");
    } catch (assetError) {
      finishUploadProgress(uploadId, "error");
      setError(assetError instanceof Error ? assetError.message : "Portfolio artwork upload failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const saveMotionBrushState = (state: MotionBrushState) => {
    if (!motionBrushObject) return;
    updateObject({ ...motionBrushObject, motionBrush: state });
    setStatus("Motion brush state saved.");
  };

  const exportMotionBrushWebP = async (file: File, state: MotionBrushState) => {
    if (!motionBrushObject) return;
    setIsSaving(true);
    setError(null);
    const uploadId = beginUploadProgress(file, "motion");
    try {
      const payload = await uploadWorkbenchAsset(file, draft.id, (uploadProgress) =>
        updateUploadProgress(uploadId, uploadProgress),
      );
      const dimensions = await readMediaDimensions(file).catch(() => null);
      const nextObject = dimensions
        ? applyMediaAspectRatio({ ...motionBrushObject, src: payload.url, motionBrush: state }, dimensions.aspect)
        : { ...motionBrushObject, src: payload.url, motionBrush: state };
      updateObject(nextObject);
      setMotionBrushObjectId(null);
      setStatus("Animated WebP exported and linked to the selected image object.");
      finishUploadProgress(uploadId, "done");
    } catch (assetError) {
      finishUploadProgress(uploadId, "error");
      setError(assetError instanceof Error ? assetError.message : "Animated WebP upload failed.");
    } finally {
      setIsSaving(false);
    }
  };

  const removePortfolioImage = (imageUrl: string) => {
    setDraft((current) => ({
      ...current,
      historicalImages: current.historicalImages.filter((item) => item !== imageUrl),
    }));
    setStatus("Portfolio image removed. Save the artwork config to publish the change.");
  };

  const saveDraft = async (override?: ArtworkConfig[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const normalizedDraft = normalizeDraft(draft);
      const nextArtworks =
        override ??
        manifest.artworks.map((artwork) => (artwork.id === draft.id ? normalizedDraft : artwork));
      const saved = await saveManifest({ ...manifest, artworks: nextArtworks });
      setManifest(saved);
      const nextDraft = saved.artworks.find((artwork) => artwork.id === normalizedDraft.id) ?? saved.artworks[0];
      setDraft(nextDraft);
      setSelectedId(nextDraft.id);
      setStatus("Artwork config saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save artwork config.");
    } finally {
      setIsSaving(false);
    }
  };

  const compileAndInstallMind = async () => {
    await compileMindWith(workingArtworks, targetFiles, draft.id, undefined);
  };

  const compileMindWith = async (
    artworksToCompile: ArtworkConfig[],
    filesByArtworkId: Record<string, File>,
    selectedAfterId: string,
    successMessage?: string,
  ) => {
    const candidates = artworksToCompile.filter((artwork) => filesByArtworkId[artwork.id] || artwork.targetImageUrl);
    if (candidates.length === 0) {
      setError("Assign at least one target image before compiling a .mind file.");
      setActiveTab("target");
      return false;
    }

    setIsCompiling(true);
    setError(null);
    setProgress(2);
    setStatus("Loading MindAR compiler");

    try {
      const Compiler = await loadMindCompiler();
      const compiler = new Compiler();
      const loadedTargets = await loadCompilableTargets(candidates, filesByArtworkId);

      if (loadedTargets.compiled.length === 0) {
        throw new Error("No valid target image could be loaded. Upload a fresh target image and try again.");
      }

      setStatus("Compiling image targets");
      const images = loadedTargets.compiled.map((target) => target.image);
      await compiler.compileImageTargets(images, (value) => setProgress(Math.min(98, Math.max(5, value))));

      const bytes = compiler.exportData();
      const mindBlob = new Blob([copyToArrayBuffer(bytes)], { type: "application/octet-stream" });
      const formData = new FormData();
      formData.append("mindFile", mindBlob, "artworks.mind");

      setStatus("Installing .mind into public/ar/targets");
      const mindResponse = await fetch("/api/workbench/mind", { method: "POST", body: formData });
      if (!mindResponse.ok) throw new Error(await mindResponse.text());

      const queueIndexes = new Map(loadedTargets.compiled.map((target, index) => [target.artwork.id, index]));
      const nextArtworks = artworksToCompile.map((artwork) => {
        const nextIndex = queueIndexes.get(artwork.id);
        const next = normalizeDraft(artwork);
        return nextIndex === undefined ? { ...next, targetIndex: -1 } : { ...next, targetIndex: nextIndex };
      });
      const saved = await saveManifest({ ...manifest, artworks: nextArtworks, mindFile: "/ar/targets/artworks.mind" });

      setManifest(saved);
      const nextDraft = saved.artworks.find((artwork) => artwork.id === selectedAfterId) ?? saved.artworks[0];
      setDraft(nextDraft);
      setSelectedId(nextDraft.id);
      setProgress(100);
      const skippedMessage = loadedTargets.skipped.length
        ? ` Skipped broken target${loadedTargets.skipped.length > 1 ? "s" : ""}: ${loadedTargets.skipped.join(", ")}.`
        : "";
      setStatus(
        `${successMessage ?? `Installed .mind with ${loadedTargets.compiled.length} target${loadedTargets.compiled.length > 1 ? "s" : ""}`}.${skippedMessage}`,
      );
      return true;
    } catch (compileError) {
      setError(compileError instanceof Error ? compileError.message : "Mind compilation failed.");
      setStatus("Compilation failed");
      return false;
    } finally {
      setIsCompiling(false);
    }
  };

  const downloadCurrentMind = async () => {
    const response = await fetch("/ar/targets/artworks.mind", { cache: "no-store" });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "artworks.mind";
    link.click();
    URL.revokeObjectURL(url);
  };

  const startObjectTransform = (
    request: Pick<TransformDrag, "objectId" | "mode"> & { handle?: ResizeHandle },
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedObjectId(request.objectId);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const object = objects.find((item) => item.id === request.objectId);
    if (!object) return;
    const startPointer = canvasPointerToWorld(event.nativeEvent as globalThis.PointerEvent, canvas, viewportRef.current);
    transformDragRef.current =
      request.mode === "resize"
        ? { objectId: request.objectId, mode: "resize", handle: request.handle ?? "se", startObject: object, startPointer }
        : { objectId: request.objectId, mode: request.mode, startObject: object, startPointer };
  };

  const startCanvasPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(".studio-object") || target.closest("button") || target.closest("input")) return;
    if (brushMode) {
      event.preventDefault();
      startBrushStroke(event.nativeEvent as globalThis.PointerEvent);
      return;
    }
    event.preventDefault();
    panDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startPanX: viewportRef.current.panX,
      startPanY: viewportRef.current.panY,
    };
  };

  const zoomCanvas = (direction: "in" | "out" | "reset") => {
    updateViewport((current) => {
      if (direction === "reset") return { zoom: 1, panX: 0, panY: 0 };
      const factor = direction === "in" ? 1.18 : 1 / 1.18;
      return { ...current, zoom: current.zoom * factor };
    });
  };

  const handleCanvasWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey && !event.altKey) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    updateViewport((current) => ({ ...current, zoom: current.zoom * factor }));
  };

  const startBrushStroke = (event: globalThis.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = canvasPointerToWorld(event, canvas, viewportRef.current);
    const nextObject = createBrushObject(objects.length, [point]);
    updateObjects([...objects, nextObject]);
    setSelectedObjectId(nextObject.id);
    brushDrawingRef.current = nextObject.id;
    setStatus("Drawing animated brush stroke.");
  };

  const duplicateObject = (object: ARObjectConfig) => {
    const clone: ARObjectConfig = {
      ...object,
      id: `object-${Date.now()}`,
      name: `${object.name} copy`,
      position: {
        ...object.position,
        x: clampFloat(object.position.x + 0.12, -1.5, 1.5),
        y: clampFloat(object.position.y - 0.12, -1.5, 1.5),
      },
    };
    updateObjects([...objects, clone]);
    setSelectedObjectId(clone.id);
    setContextMenu(null);
  };

  const deleteObject = (objectId: string) => {
    updateObjects(objects.filter((object) => object.id !== objectId));
    if (selectedObjectId === objectId) setSelectedObjectId(null);
    setContextMenu(null);
  };

  return (
    <main className="workshop-shell">
      <header className="workshop-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">A</span>
          <div>
            <strong>Artify Workbench</strong>
            <small>MindAR target and A-Frame scene builder</small>
          </div>
        </div>
        <nav className="workshop-tabs" aria-label="Workbench sections">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === activeTab ? "is-active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.hint}</small>
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <a href="/ar">Open AR</a>
          <button type="button" onClick={() => void saveDraft()} disabled={isSaving}>
            {isSaving ? "Saving" : "Save"}
          </button>
        </div>
      </header>

      {creationDraft ? (
        <NewArtworkSetup
          draft={creationDraft}
          targetPreview={creationTargetPreview}
          targetDimensions={creationTargetDimensions}
          isCompiling={isCompiling}
          isSaving={isSaving}
          error={error}
          status={status}
          progress={progress}
          onDraftChange={(nextDraft) => setCreationDraft(nextDraft)}
          onTargetFiles={(files) => void assignCreationTarget(files)}
          onCancel={cancelArtworkCreation}
          onCreate={() => void createArtworkAndCompile()}
        />
      ) : null}

      {!creationDraft ? (
      <section className="workshop-layout">
        <aside className="collection-rail">
          <div className="rail-heading">
            <div>
              <span>Collection</span>
              <strong>{manifest.artworks.length} artworks</strong>
            </div>
            <button type="button" onClick={addArtwork} aria-label="Add artwork">
              +
            </button>
          </div>

          <div className="artwork-stack">
            {manifest.artworks.map((artwork, index) => (
              <button
                key={artwork.id}
                type="button"
                className={`artwork-tile ${artwork.id === draft.id ? "is-selected" : ""}`}
                onClick={() => selectArtwork(artwork)}
              >
                <span className="artwork-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="artwork-copy">
                  <strong>{artwork.title}</strong>
                  <small>{artwork.artist}</small>
                </span>
                <span className={artwork.targetImageUrl ? "state-dot is-ready" : "state-dot"} />
                <span
                  role="button"
                  tabIndex={0}
                  className="delete-artwork-button"
                  aria-label={`Delete ${artwork.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteArtwork(artwork.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    event.stopPropagation();
                    void deleteArtwork(artwork.id);
                  }}
                >
                  ×
                </span>
              </button>
            ))}
          </div>

          <div className="tool-library">
            <span className="section-kicker">Add Elements</span>
            <button type="button" className="motion-brush-hero-button" onClick={openMotionBrushStudio}>
              <span>Motion Brush Studio</span>
              <strong>Animate image areas and export WebP</strong>
            </button>
            <button type="button" className="ai-motion-hero-button" onClick={openAILivingArtStudio}>
              <span>Google Living Art</span>
              <strong>Subtle AI movement, original art preserved</strong>
            </button>
            <div className="tool-grid">
              {objectPalette.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className={item.type === "brush" && brushMode ? "is-active-tool" : ""}
                  onClick={() => addObject(item.type)}
                  title={item.note}
                >
                  <strong>{item.icon}</strong>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="workshop-stage-column">
          <div className="stage-meta-bar">
            <div className="artwork-title-fields">
              <input
                aria-label="Artwork title"
                value={draft.title}
                onChange={(event) => updateDraft("title", event.target.value)}
              />
              <div>
                <input
                  aria-label="Artist"
                  value={draft.artist}
                  onChange={(event) => updateDraft("artist", event.target.value)}
                />
                <input
                  aria-label="Year"
                  value={draft.year}
                  onChange={(event) => updateDraft("year", event.target.value)}
                />
              </div>
            </div>
            <div className="stage-pills">
              <span>{targetSize ? `${targetSize.width} x ${targetSize.height}` : targetHealth}</span>
              <span>targetIndex {draft.targetIndex}</span>
              <span>{objects.length} layers</span>
            </div>
          </div>

          <div className="workshop-main-panel">
            <div className="stage-toolbar">
              <div className="tab-context">
                <strong>{tabs.find((tab) => tab.id === activeTab)?.label}</strong>
                <span>{status}</span>
              </div>
              <button type="button" className="stage-motion-brush-button" onClick={openMotionBrushStudio}>
                Motion Brush
              </button>
              <button type="button" className="stage-ai-motion-button" onClick={openAILivingArtStudio}>
                Google AI Motion
              </button>
              <div className="scene-select-group">
                {sceneTypes.map((scene) => (
                  <button
                    key={scene.value}
                    type="button"
                    className={draft.arSceneType === scene.value ? "is-active" : ""}
                    onClick={() => updateDraft("arSceneType", scene.value)}
                    title={scene.note}
                  >
                    {scene.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={`target-canvas-zone ${isDraggingTarget ? "is-dragging" : ""}`}
              onDragOver={(event: DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                setIsDraggingTarget(true);
              }}
              onDragLeave={() => setIsDraggingTarget(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingTarget(false);
                void assignTarget(Array.from(event.dataTransfer.files));
              }}
            >
              <input
                ref={targetInputRef}
                className="sr-only"
                type="file"
                accept="image/*,.heic,.heif,.avif,.bmp,.svg"
                onChange={(event) => void assignTarget(Array.from(event.currentTarget.files ?? []))}
              />

              <div
                className="canvas-shell"
                ref={canvasRef}
                onPointerDown={startCanvasPan}
                onWheel={handleCanvasWheel}
              >
                <div
                  className="canvas-viewport"
                  style={{
                    transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
                  }}
                >
                  <AFrameStagePreview
                    artwork={draft}
                    targetPreview={targetPreview}
                    targetDimensions={targetSize}
                    ready={aframeReady}
                    onUploadClick={() => targetInputRef.current?.click()}
                  />

                  <div className="edit-hit-layer">
                    {objects.map((object) => (
                      <CanvasObject
                        key={object.id}
                        object={object}
                        selected={object.id === selectedObjectId}
                        onSelect={() => setSelectedObjectId(object.id)}
                        onStartMove={(event) => startObjectTransform({ objectId: object.id, mode: "move" }, event)}
                        onStartResize={(handle, event) =>
                          startObjectTransform({ objectId: object.id, mode: "resize", handle }, event)
                        }
                        onStartRotate={(event) => startObjectTransform({ objectId: object.id, mode: "rotate" }, event)}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setSelectedObjectId(object.id);
                          setContextMenu({ objectId: object.id, x: event.clientX, y: event.clientY });
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="canvas-zoom-toolbar" aria-label="Canvas view controls">
                  <button type="button" onClick={() => zoomCanvas("out")} aria-label="Zoom out">
                    -
                  </button>
                  <span>{Math.round(viewport.zoom * 100)}%</span>
                  <button type="button" onClick={() => zoomCanvas("in")} aria-label="Zoom in">
                    +
                  </button>
                  <button type="button" onClick={() => zoomCanvas("reset")}>
                    Reset
                  </button>
                </div>
                <div className="canvas-corner-hint">A-Frame scene plane</div>
                {contextMenu ? (
                  <div
                    className="object-context-menu workshop-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedObjectId(contextMenu.objectId);
                        setContextMenu(null);
                      }}
                    >
                      Edit object
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const object = objects.find((item) => item.id === contextMenu.objectId);
                        if (object) duplicateObject(object);
                      }}
                    >
                      Duplicate
                    </button>
                    <button type="button" className="danger-menu-item" onClick={() => deleteObject(contextMenu.objectId)}>
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <WorkbenchTabPanel
              activeTab={activeTab}
              draft={draft}
              targetQueue={targetQueue}
              progress={progress}
              isCompiling={isCompiling}
              isSaving={isSaving}
              error={error}
              status={status}
              onUploadClick={() => targetInputRef.current?.click()}
              onCompile={() => void compileAndInstallMind()}
              onDownload={() => void downloadCurrentMind()}
              onSave={() => void saveDraft()}
              onDraftChange={updateDraft}
              onAsset={(file, kind) => void uploadAsset(file, kind)}
              onPortfolioUpload={(files) => void uploadPortfolioImages(files)}
              onPortfolioRemove={removePortfolioImage}
            />
          </div>
        </section>

        <aside className="inspector-rail">
          <section className="inspector-card">
            <div className="inspector-heading">
              <span>Inspector</span>
              <strong>{selectedObject ? selectedObject.name : "Scene settings"}</strong>
            </div>

            {selectedObject ? (
              <ObjectInspector
                object={selectedObject}
                existingImages={draft.historicalImages}
                onChange={updateObject}
                onDelete={() => deleteObject(selectedObject.id)}
                onUpload={(file) => void uploadAsset(file, "layer")}
                onPortfolioUpload={(file) => void uploadPortfolioObjectImage(selectedObject, file)}
                onMotionBrush={() => setMotionBrushObjectId(selectedObject.id)}
              />
            ) : (
              <SceneInspector draft={draft} onDraftChange={updateDraft} />
            )}
          </section>

          <section className="inspector-card layer-card">
            <div className="inspector-heading">
              <span>Layers</span>
              <strong>{objects.length} objects</strong>
            </div>
            <div className="layer-stack">
              {objects.length === 0 ? <p>No objects yet. Add elements from the left rail.</p> : null}
              {objects.map((object, index) => (
                <button
                  key={object.id}
                  type="button"
                  className={object.id === selectedObjectId ? "is-selected" : ""}
                  onClick={() => setSelectedObjectId(object.id)}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{object.name}</strong>
                  <small>{object.type}</small>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </section>
      ) : null}
      {motionBrushObject ? (
        <MotionBrushModal
          imageSrc={motionBrushObject.src || targetPreview}
          initialState={motionBrushObject.motionBrush}
          onCancel={() => setMotionBrushObjectId(null)}
          onSave={saveMotionBrushState}
          onExport={exportMotionBrushWebP}
        />
      ) : null}
      {aiMotionObject ? (
        <AILivingArtModal
          artworkId={draft.id}
          imageSrc={aiMotionObject.src || targetPreview}
          title={draft.title}
          onCancel={() => setAiMotionObjectId(null)}
          onGenerated={(url) => void attachAIGeneratedVideo(url)}
        />
      ) : null}
      {uploadProgressItems.length > 0 ? <UploadProgressQueue items={uploadProgressItems} /> : null}
    </main>
  );
}

function NewArtworkSetup({
  draft,
  targetPreview,
  targetDimensions,
  isCompiling,
  isSaving,
  error,
  status,
  progress,
  onDraftChange,
  onTargetFiles,
  onCancel,
  onCreate,
}: {
  draft: ArtworkConfig;
  targetPreview: string;
  targetDimensions: MediaDimensions | null;
  isCompiling: boolean;
  isSaving: boolean;
  error: string | null;
  status: string;
  progress: number;
  onDraftChange: (draft: ArtworkConfig) => void;
  onTargetFiles: (files: File[]) => void;
  onCancel: () => void;
  onCreate: () => void;
}) {
  return (
    <section className="new-artwork-flow">
      <div className="new-artwork-card">
        <div className="new-artwork-copy">
          <span className="section-kicker">New artwork pipeline</span>
          <h1>Create scan target first</h1>
          <p>
            Add the artwork metadata, upload the exact image visitors will scan, then generate the
            MindAR file before opening the scene editor.
          </p>
        </div>

        <div className="new-artwork-form">
          <label>
            Artwork name
            <input
              value={draft.title}
              onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            />
          </label>
          <label>
            Artist
            <input
              value={draft.artist}
              onChange={(event) => onDraftChange({ ...draft, artist: event.target.value })}
            />
          </label>
          <label>
            Year
            <input
              value={draft.year}
              onChange={(event) => onDraftChange({ ...draft, year: event.target.value })}
            />
          </label>
          <label>
            Scene preset
            <select
              value={draft.arSceneType}
              onChange={(event) => onDraftChange({ ...draft, arSceneType: event.target.value as ArtworkSceneType })}
            >
              {sceneTypes.map((scene) => (
                <option key={scene.value} value={scene.value}>
                  {scene.label}
                </option>
              ))}
            </select>
          </label>
          <label className="new-artwork-wide">
            Short summary
            <textarea
              rows={3}
              value={draft.shortSummary}
              onChange={(event) => onDraftChange({ ...draft, shortSummary: event.target.value })}
            />
          </label>
        </div>

        <div
          className="new-target-upload"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            onTargetFiles(Array.from(event.dataTransfer.files));
          }}
        >
          <input
            id="new-artwork-target"
            type="file"
            accept="image/*,.heic,.heif,.avif,.bmp,.svg"
            onChange={(event) => onTargetFiles(Array.from(event.currentTarget.files ?? []))}
          />
          {targetPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={targetPreview} alt="" />
          ) : (
            <div>
              <strong>Upload target image</strong>
              <span>PNG, JPG, WebP, GIF, AVIF, BMP, SVG, HEIC/HEIF where browser-supported.</span>
            </div>
          )}
          {targetDimensions ? (
            <small>
              {targetDimensions.width} x {targetDimensions.height}
            </small>
          ) : null}
        </div>

        <div className="new-artwork-actions">
          <button type="button" className="secondary-action" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={onCreate}
            disabled={isCompiling || isSaving || !targetPreview || !draft.title.trim()}
          >
            {isCompiling ? "Compiling .mind..." : "Create artwork + compile .mind"}
          </button>
        </div>

        <div className="progress-block">
          <div className="progress-row">
            <span>{status}</span>
            <strong>{Math.round(progress)}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>

        {error ? <p className="workbench-error">{error}</p> : null}
      </div>
    </section>
  );
}

function WorkbenchTabPanel({
  activeTab,
  draft,
  targetQueue,
  progress,
  isCompiling,
  isSaving,
  error,
  status,
  onUploadClick,
  onCompile,
  onDownload,
  onSave,
  onDraftChange,
  onAsset,
  onPortfolioUpload,
  onPortfolioRemove,
}: {
  activeTab: WorkshopTab;
  draft: ArtworkConfig;
  targetQueue: ArtworkConfig[];
  progress: number;
  isCompiling: boolean;
  isSaving: boolean;
  error: string | null;
  status: string;
  onUploadClick: () => void;
  onCompile: () => void;
  onDownload: () => void;
  onSave: () => void;
  onDraftChange: <Key extends keyof ArtworkConfig>(key: Key, value: ArtworkConfig[Key]) => void;
  onAsset: (file: File, kind: AssetKind) => void;
  onPortfolioUpload: (files: File[]) => void;
  onPortfolioRemove: (imageUrl: string) => void;
}) {
  return (
    <section className="context-drawer">
      {activeTab === "target" ? (
        <div className="drawer-grid">
          <InfoBlock title="Original target" value={draft.targetImageUrl || "No target image uploaded yet"} />
          <button type="button" className="drawer-action" onClick={onUploadClick}>
            Upload / replace target image
          </button>
          <InfoBlock title="MindAR compile rule" value="Compile every queued artwork together to preserve targetIndex order." />
        </div>
      ) : null}

      {activeTab === "scene" ? (
        <div className="drawer-grid">
          <label className="drawer-field wide">
            Visitor summary
            <textarea
              rows={2}
              value={draft.shortSummary}
              onChange={(event) => onDraftChange("shortSummary", event.target.value)}
            />
          </label>
          <InfoBlock title="Live preview" value="Drag objects on the artwork. Right-click any object to duplicate or delete." />
          <InfoBlock title="Runtime output" value="Objects are saved as A-Frame entities under the detected MindAR target." />
        </div>
      ) : null}

      {activeTab === "assets" ? (
        <div className="drawer-grid assets-drawer">
          <AssetDrop label="Audio narration" value={draft.audioUrl || "No audio file"} accept="audio/mpeg,audio/wav" onFile={(file) => onAsset(file, "audio")} />
          <PortfolioImageManager
            images={draft.historicalImages}
            disabled={isSaving}
            onUpload={onPortfolioUpload}
            onRemove={onPortfolioRemove}
          />
          <label className="drawer-field wide">
            History panel text
            <textarea
              rows={3}
              value={draft.historyText}
              onChange={(event) => onDraftChange("historyText", event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {activeTab === "preview" ? (
        <div className="drawer-grid">
          <InfoBlock title="Preview state" value={`${draft.title} uses ${draft.arSceneType} with ${(draft.arObjects ?? []).length} object(s).`} />
              <InfoBlock title="Mobile performance" value={`${draft.effects.particleCount} particles only while detected, ${draft.effects.lowPowerParticleCount} in low-power mode.`} />
          <a className="drawer-link" href="/ar">Open live AR page</a>
        </div>
      ) : null}

      {activeTab === "publish" ? (
        <div className="drawer-grid publish-drawer">
          <div className="progress-block">
            <div className="progress-row">
              <span>{status}</span>
              <strong>{Math.round(progress)}%</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
          <ol className="target-order">
            {targetQueue.length === 0 ? <li>No target images queued yet.</li> : null}
            {targetQueue.map((artwork, index) => (
              <li key={artwork.id}>
                targetIndex {index}: {artwork.title}
              </li>
            ))}
          </ol>
          <button type="button" className="drawer-action" onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save config"}
          </button>
          <button type="button" className="drawer-action is-dark" onClick={onCompile} disabled={isCompiling}>
            {isCompiling ? "Compiling..." : "Compile and install .mind"}
          </button>
          <button type="button" className="drawer-action" onClick={onDownload}>
            Download current .mind
          </button>
          {error ? <p className="workbench-error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function AFrameStagePreview({
  artwork,
  targetPreview,
  targetDimensions,
  ready,
  onUploadClick,
}: {
  artwork: ArtworkConfig;
  targetPreview: string;
  targetDimensions?: MediaDimensions;
  ready: boolean;
  onUploadClick: () => void;
}) {
  const objects = artwork.arObjects ?? [];
  const plane = getPlaneSize(targetDimensions?.aspect ?? 0.72);
  const [previewState, setPreviewState] = useState({ src: "", loaded: false, failed: false });
  const previewLoaded = previewState.src === targetPreview && previewState.loaded;
  const previewFailed = previewState.src === targetPreview && previewState.failed;

  if (!targetPreview) {
    return (
      <div className="aframe-preview-empty">
        <button type="button" onClick={onUploadClick}>Upload original artwork image</button>
        <span>The original artwork becomes the tracked plane in preview and AR.</span>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="aframe-preview-empty">
        <strong>Loading A-Frame preview...</strong>
      </div>
    );
  }

  return (
    <div className={`aframe-preview-wrap ${previewLoaded ? "is-preview-ready" : "is-preview-loading"}`}>
      <div className="aframe-preview-image-layer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={targetPreview}
          alt=""
          onLoad={() => setPreviewState({ src: targetPreview, loaded: true, failed: false })}
          onError={() => {
            setPreviewState({ src: targetPreview, loaded: true, failed: true });
          }}
        />
        {!previewLoaded ? (
          <span>Decoding artwork preview...</span>
        ) : null}
        {previewFailed ? (
          <span>Preview image could not be decoded. Try a PNG or JPG export.</span>
        ) : null}
      </div>
      <a-scene
        key={`${artwork.id}-${targetPreview}`}
        embedded
        renderer="alpha: true; antialias: true; colorManagement: true"
        background="color: #f7f8f4"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false"
        loading-screen="enabled: false"
      >
        <a-assets>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img id={`target-preview-${artwork.id}`} src={targetPreview} alt="" crossOrigin="anonymous" />
        </a-assets>
        <a-entity light="type: ambient; color: #ffffff; intensity: 0.8" />
        <a-entity light="type: directional; color: #ffffff; intensity: 0.65" position="0 2 2" />
        <a-camera position="0 0 2.7" look-controls="enabled: false" wasd-controls="enabled: false" />
        <a-entity position="0 0 -0.35">
          <a-plane
            src={`#target-preview-${artwork.id}`}
            width={plane.width}
            height={plane.height}
            position="0 0 0"
            material="shader: flat; transparent: false"
          />
          <a-plane
            width={plane.width + 0.07}
            height={plane.height + 0.07}
            position="0 0 -0.012"
            color="#ffffff"
            material="shader: flat; opacity: 0.92"
          />
          {objects.map((object) => (
            <a-entity
              key={`${object.id}-${object.src || "no-src"}-${object.type}`}
              position={`${object.position.x} ${object.position.y} ${object.position.z + 0.04}`}
              rotation={`${object.rotation.x} ${object.rotation.y} ${object.rotation.z}`}
              scale={`${object.scale.x} ${object.scale.y} ${object.scale.z}`}
            >
              <AFrameObject object={object} />
            </a-entity>
          ))}
        </a-entity>
      </a-scene>
    </div>
  );
}

function AFrameObject({ object }: { object: ARObjectConfig }) {
  if (object.type === "brush") {
    return (
      <a-entity>
        {(object.brushPoints ?? []).map((point, index) => (
          <a-sphere
            key={`${object.id}-brush-${index}`}
            position={`${point.x - object.position.x} ${point.y - object.position.y} 0.04`}
            radius={object.brushWidth ?? 0.045}
            color={object.color}
            material={`transparent: true; opacity: ${Math.max(0.22, object.opacity - index * 0.004)}`}
            animation={brushAnimationAttribute(object, index)}
          />
        ))}
      </a-entity>
    );
  }

  if (object.type === "text") {
    return (
      <a-text
        value={object.text || object.name}
        color={object.color}
        align="center"
        width={object.width}
        wrap-count="24"
        material={`transparent: true; opacity: ${object.opacity}`}
      />
    );
  }

  if (object.type === "button") {
    return (
      <a-entity>
        <a-plane
          width={object.width}
          height={object.height}
          color={object.color}
          material={`transparent: true; opacity: ${object.opacity}`}
        />
        <a-text
          value={`${object.icon || ""} ${object.text || object.name}`.trim()}
          color="#ffffff"
          align="center"
          width={object.width * 1.7}
          wrap-count="18"
          position="0 0 0.012"
        />
      </a-entity>
    );
  }

  if (object.type === "panel") {
    return (
      <a-entity>
        <a-plane
          width={object.width}
          height={object.height}
          color={object.color}
          material={`transparent: true; opacity: ${object.opacity}`}
        />
        <a-text
          value={object.text || object.name}
          color="#ffffff"
          align="center"
          width={object.width * 1.45}
          wrap-count="22"
          position="0 0 0.012"
        />
      </a-entity>
    );
  }

  if (object.type === "portfolio") {
    const items = object.portfolioItems ?? [];
    const activeItem = items[0];
    return (
      <a-entity>
        <a-text
          value={activeItem?.title || object.text || "Portfolio"}
          color="black"
          align="center"
          width="2"
          position="0 0.4 0.012"
        />
        {activeItem ? (
          <a-image
            src={activeItem.src}
            alpha-test="0.5"
            width={object.width}
            height={object.height}
            material={`transparent: true; opacity: ${object.opacity}`}
          />
        ) : (
          <a-plane
            width={object.width}
            height={object.height}
            color={object.color}
            material={`transparent: true; opacity: ${object.opacity}`}
          />
        )}
        <a-text value="<" color="black" align="center" width="0.7" position={`${-object.width / 2 - 0.2} -0.02 0.02`} />
        <a-text value=">" color="black" align="center" width="0.7" position={`${object.width / 2 + 0.2} -0.02 0.02`} />
      </a-entity>
    );
  }

  if (object.type === "model3d" && object.src) {
    return <a-gltf-model src={object.src} />;
  }

  if (object.type === "video" && object.src) {
    const videoId = `workbench-video-${cssSafeId(object.id)}`;
    return (
      <a-entity>
        <a-assets timeout="10000">
          <video
            id={videoId}
            src={workbenchAssetPlaybackUrl(object.src)}
            crossOrigin="anonymous"
            muted
            loop
            autoPlay
            playsInline
            preload="auto"
          />
        </a-assets>
        <a-video
          src={`#${videoId}`}
          width={object.width}
          height={object.height}
          material={`shader: flat; transparent: true; opacity: ${object.opacity}`}
        />
      </a-entity>
    );
  }

  if ((object.type === "image" || object.type === "gif") && object.src) {
    return <a-image src={object.src} width={object.width} height={object.height} material={`transparent: true; opacity: ${object.opacity}`} />;
  }

  return <a-plane width={object.width} height={object.height} color={object.color} material={`transparent: true; opacity: ${object.opacity}`} />;
}

function CanvasObject({
  object,
  selected,
  onSelect,
  onStartMove,
  onStartResize,
  onStartRotate,
  onContextMenu,
}: {
  object: ARObjectConfig;
  selected: boolean;
  onSelect: () => void;
  onStartMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onStartResize: (handle: ResizeHandle, event: ReactPointerEvent<HTMLSpanElement>) => void;
  onStartRotate: (event: ReactPointerEvent<HTMLSpanElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const style = {
    left: `${50 + object.position.x * 33}%`,
    top: `${50 - object.position.y * 33}%`,
    width: `${Math.max(42, object.width * 135)}px`,
    height: object.type === "text" ? "auto" : `${Math.max(34, object.height * 112)}px`,
    minHeight: object.type === "text" ? `${Math.max(30, object.height * 82)}px` : undefined,
    color: object.color,
    borderColor: object.color,
    opacity: object.opacity,
    transform: `translate(-50%, -50%) rotate(${object.rotation.z}deg) scale(${object.scale.x}, ${object.scale.y})`,
  };

  const handles: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

  return (
    <div
      role="button"
      tabIndex={0}
      className={`studio-object studio-${object.type} ${selected ? "is-selected" : ""}`}
      style={style}
      onPointerDown={(event) => {
        onSelect();
        onStartMove(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onSelect();
      }}
      onContextMenu={onContextMenu}
      title={object.name}
    >
      <ObjectPreview object={object} selected={selected} />
      {selected ? (
        <span className="gizmo-controls" aria-hidden="true">
          {handles.map((handle) => (
            <span
              key={handle}
              className={`resize-handle handle-${handle}`}
              onPointerDown={(event) => {
                onSelect();
                onStartResize(handle, event);
              }}
            />
          ))}
          <span
            className="rotate-handle"
            onPointerDown={(event) => {
              onSelect();
              onStartRotate(event);
            }}
          />
        </span>
      ) : null}
    </div>
  );
}

function ObjectPreview({ object, selected }: { object: ARObjectConfig; selected: boolean }) {
  if ((object.type === "image" || object.type === "gif") && object.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={object.src} alt="" />;
  }
  if (object.type === "video" && object.src) {
    return <video src={workbenchAssetPlaybackUrl(object.src)} muted loop playsInline autoPlay preload="auto" />;
  }
  if (!selected) return null;
  if (object.type === "text") return <span>{object.text || "Text"}</span>;
  if (object.type === "brush") {
    return (
      <span>
        Brush
        <small>{object.brushAnimation ?? "flow"}</small>
      </span>
    );
  }
  if (object.type === "button") return <span>{`${object.icon || ""} ${object.text || "Button"}`.trim()}</span>;
  if (object.type === "panel") {
    return (
      <span>
        {object.text || "Info panel"}
        <small>{object.actionType || "history"}</small>
      </span>
    );
  }
  if (object.type === "portfolio") {
    const firstItem = object.portfolioItems?.[0];
    if (firstItem?.src) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={firstItem.src} alt="" />;
    }
    return (
      <span>
        {object.text || "Portfolio"}
        <small>{object.portfolioItems?.length ?? 0} works</small>
      </span>
    );
  }
  return (
    <span>
      {object.type === "model3d" ? "3D model" : object.type}
      <small>{object.src ? "asset linked" : "drop asset in inspector"}</small>
    </span>
  );
}

function workbenchAssetPlaybackUrl(url: string) {
  if (!url.startsWith("/ar/workbench/assets/")) return url;
  return url.replace(/^\/ar\/workbench\/assets\//, "/api/workbench/assets/");
}

function cssSafeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function warmVideoPlayback(src: string) {
  return new Promise<void>((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    video.preload = "auto";
    video.src = src;
    const finish = () => {
      video.remove();
      resolve();
    };
    video.onloadeddata = finish;
    video.oncanplay = finish;
    video.onerror = finish;
    window.setTimeout(finish, 3500);
    void video.play().catch(() => undefined);
  });
}

function SceneInspector({
  draft,
  onDraftChange,
}: {
  draft: ArtworkConfig;
  onDraftChange: <Key extends keyof ArtworkConfig>(key: Key, value: ArtworkConfig[Key]) => void;
}) {
  return (
    <div className="inspector-form">
      <ColorField label="Primary" value={draft.colors.primary} onChange={(value) => onDraftChange("colors", { ...draft.colors, primary: value })} />
      <ColorField label="Secondary" value={draft.colors.secondary} onChange={(value) => onDraftChange("colors", { ...draft.colors, secondary: value })} />
      <ColorField label="Accent" value={draft.colors.accent} onChange={(value) => onDraftChange("colors", { ...draft.colors, accent: value })} />
      <NumberControl label="Particles" value={draft.effects.particleCount} min={0} max={90} step={1} onChange={(value) => onDraftChange("effects", { ...draft.effects, particleCount: value })} />
      <NumberControl label="Low power" value={draft.effects.lowPowerParticleCount} min={0} max={36} step={1} onChange={(value) => onDraftChange("effects", { ...draft.effects, lowPowerParticleCount: value })} />
      <label>
        Intensity
        <select
          value={draft.effects.intensity}
          onChange={(event) =>
            onDraftChange("effects", {
              ...draft.effects,
              intensity: event.target.value === "medium" ? "medium" : "low",
            })
          }
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
        </select>
      </label>
    </div>
  );
}

function ObjectInspector({
  object,
  existingImages,
  onChange,
  onDelete,
  onUpload,
  onPortfolioUpload,
  onMotionBrush,
}: {
  object: ARObjectConfig;
  existingImages: string[];
  onChange: (object: ARObjectConfig) => void;
  onDelete: () => void;
  onUpload: (file: File) => void;
  onPortfolioUpload: (file: File) => void;
  onMotionBrush: () => void;
}) {
  const portfolioInputRef = useRef<HTMLInputElement | null>(null);
  const updatePosition = (axis: "x" | "y" | "z", value: number) => {
    onChange({ ...object, position: { ...object.position, [axis]: value } });
  };
  const updateRotation = (axis: "x" | "y" | "z", value: number) => {
    onChange({ ...object, rotation: { ...object.rotation, [axis]: value } });
  };
  const updateScale = (axis: "x" | "y" | "z", value: number) => {
    onChange({ ...object, scale: { ...object.scale, [axis]: value } });
  };

  return (
    <div className="inspector-form">
      <label>
        Name
        <input value={object.name} onChange={(event) => onChange({ ...object, name: event.target.value })} />
      </label>
      <label>
        Type
        <select value={object.type} onChange={(event) => onChange({ ...object, type: event.target.value as ARObjectType })}>
          <option value="text">Text</option>
          <option value="image">Image</option>
          <option value="gif">GIF</option>
          <option value="video">Video</option>
          <option value="model3d">3D object</option>
          <option value="button">Button</option>
          <option value="panel">Panel</option>
          <option value="portfolio">Portfolio</option>
          <option value="brush">Brush</option>
        </select>
      </label>
      {object.type === "text" ? (
        <label className="wide">
          Text
          <textarea rows={3} value={object.text ?? ""} onChange={(event) => onChange({ ...object, text: event.target.value })} />
        </label>
      ) : object.type === "brush" ? (
        <>
          <label>
            Animation
            <select
              value={object.brushAnimation ?? "flow"}
              onChange={(event) =>
                onChange({ ...object, brushAnimation: event.target.value as "flow" | "pulse" | "wave" })
              }
            >
              <option value="flow">Flow</option>
              <option value="pulse">Pulse</option>
              <option value="wave">Wave</option>
            </select>
          </label>
          <NumberControl
            label="Speed"
            value={object.brushSpeed ?? 1}
            min={0.1}
            max={4}
            step={0.1}
            onChange={(value) => onChange({ ...object, brushSpeed: value })}
          />
          <NumberControl
            label="Stroke"
            value={object.brushWidth ?? 0.045}
            min={0.01}
            max={0.16}
            step={0.005}
            onChange={(value) => onChange({ ...object, brushWidth: value })}
          />
          <InfoBlock title="Points" value={`${object.brushPoints?.length ?? 0} animated points`} />
        </>
      ) : object.type === "portfolio" ? (
        <PortfolioObjectEditor
          object={object}
          existingImages={existingImages}
          inputRef={portfolioInputRef}
          onChange={onChange}
          onUpload={onPortfolioUpload}
        />
      ) : object.type === "button" || object.type === "panel" ? (
        <>
          <label className="wide">
            Label
            <input value={object.text ?? ""} onChange={(event) => onChange({ ...object, text: event.target.value })} />
          </label>
          <label>
            Icon
            <input value={object.icon ?? ""} onChange={(event) => onChange({ ...object, icon: event.target.value })} />
          </label>
          <label>
            Action
            <select
              value={object.actionType ?? "none"}
              onChange={(event) => onChange({ ...object, actionType: event.target.value as ARObjectActionType })}
            >
              {actionTypes.map((action) => (
                <option key={action.value} value={action.value}>
                  {action.label}
                </option>
              ))}
            </select>
          </label>
          {object.actionType === "openLink" ? (
            <label className="wide">
              Link URL
              <input
                value={object.actionUrl ?? ""}
                onChange={(event) => onChange({ ...object, actionUrl: event.target.value })}
                placeholder="https://museum.example/artist"
              />
            </label>
          ) : null}
        </>
      ) : (
        <>
          <AssetDrop label="Object asset" value={object.src || "No asset selected"} accept={assetAcceptFor(object.type)} onFile={onUpload} />
          {object.type === "image" || object.type === "gif" ? (
            <button type="button" className="motion-brush-launch" onClick={onMotionBrush}>
              Motion Brush
            </button>
          ) : null}
        </>
      )}
      <ColorField label="Color" value={object.color} onChange={(value) => onChange({ ...object, color: value })} />
      <div className="placement-presets">
        <button type="button" onClick={() => onChange(applyPlacementPreset(object, "above"))}>
          Above art
        </button>
        <button type="button" onClick={() => onChange(applyPlacementPreset(object, "right"))}>
          Right panel
        </button>
        <button type="button" onClick={() => onChange(applyPlacementPreset(object, "left"))}>
          Left panel
        </button>
        <button type="button" onClick={() => onChange(applyPlacementPreset(object, "overlay"))}>
          Overlay
        </button>
      </div>
      <NumberControl label="Opacity" value={object.opacity} min={0.05} max={1} step={0.05} onChange={(value) => onChange({ ...object, opacity: value })} />
      <NumberControl label="Width" value={object.width} min={0.05} max={3} step={0.05} onChange={(value) => onChange(resizeObjectWithAspectLock(object, "width", value))} />
      <NumberControl label="Height" value={object.height} min={0.05} max={3} step={0.05} onChange={(value) => onChange(resizeObjectWithAspectLock(object, "height", value))} />
      <div className="field-row-title">Position</div>
      <NumberControl label="X" value={object.position.x} min={-1.5} max={1.5} step={0.05} onChange={(value) => updatePosition("x", value)} />
      <NumberControl label="Y" value={object.position.y} min={-1.5} max={1.5} step={0.05} onChange={(value) => updatePosition("y", value)} />
      <NumberControl label="Z" value={object.position.z} min={-0.5} max={1.5} step={0.05} onChange={(value) => updatePosition("z", value)} />
      <div className="field-row-title">Rotation</div>
      <NumberControl label="Rot X" value={object.rotation.x} min={-180} max={180} step={5} onChange={(value) => updateRotation("x", value)} />
      <NumberControl label="Rot Y" value={object.rotation.y} min={-180} max={180} step={5} onChange={(value) => updateRotation("y", value)} />
      <NumberControl label="Rot Z" value={object.rotation.z} min={-180} max={180} step={5} onChange={(value) => updateRotation("z", value)} />
      <div className="field-row-title">Scale</div>
      <NumberControl label="Scale X" value={object.scale.x} min={0.05} max={5} step={0.05} onChange={(value) => updateScale("x", value)} />
      <NumberControl label="Scale Y" value={object.scale.y} min={0.05} max={5} step={0.05} onChange={(value) => updateScale("y", value)} />
      <NumberControl label="Scale Z" value={object.scale.z} min={0.05} max={5} step={0.05} onChange={(value) => updateScale("z", value)} />
      <button type="button" className="delete-layer-action" onClick={onDelete}>
        Delete object
      </button>
    </div>
  );
}

function PortfolioObjectEditor({
  object,
  existingImages,
  inputRef,
  onChange,
  onUpload,
}: {
  object: ARObjectConfig;
  existingImages: string[];
  inputRef: { current: HTMLInputElement | null };
  onChange: (object: ARObjectConfig) => void;
  onUpload: (file: File) => void;
}) {
  const items = object.portfolioItems ?? [];
  const selectedSources = new Set(items.map((item) => item.src));

  const updateItems = (portfolioItems: ARPortfolioItem[]) => {
    onChange({ ...object, portfolioItems });
  };

  const toggleExistingImage = (imageUrl: string) => {
    if (selectedSources.has(imageUrl)) {
      updateItems(items.filter((item) => item.src !== imageUrl));
      return;
    }
    updateItems([...items, createPortfolioItem(imageUrl, `Artwork ${items.length + 1}`)]);
  };

  const updateItemTitle = (itemId: string, title: string) => {
    updateItems(items.map((item) => (item.id === itemId ? { ...item, title } : item)));
  };

  return (
    <>
      <label className="wide">
        Panel title
        <input value={object.text ?? "Portfolio"} onChange={(event) => onChange({ ...object, text: event.target.value })} />
      </label>
      <div className="portfolio-object-editor wide">
        <div className="portfolio-manager-head">
          <div>
            <span>Artist works</span>
            <strong>{items.length} selected</strong>
          </div>
          <button type="button" onClick={() => inputRef.current?.click()}>
            Upload work
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif,.avif,.bmp,.svg"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.currentTarget.files?.[0];
            if (file) onUpload(file);
            event.currentTarget.value = "";
          }}
        />
        <div className="portfolio-selection-list">
          {existingImages.length === 0 ? <p>No existing uploaded images yet.</p> : null}
          {existingImages.map((imageUrl, index) => {
            const item = items.find((candidate) => candidate.src === imageUrl);
            const selected = !!item;
            return (
              <div key={`${imageUrl}-${index}`} className={`portfolio-select-row ${selected ? "is-selected" : ""}`}>
                <button type="button" onClick={() => toggleExistingImage(imageUrl)} aria-pressed={selected}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" />
                  <span>{selected ? "Selected" : "Select"}</span>
                </button>
                {item ? (
                  <input
                    value={item.title}
                    onChange={(event) => updateItemTitle(item.id, event.target.value)}
                    placeholder="Artwork title"
                    aria-label={`Portfolio title ${index + 1}`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        {items
          .filter((item) => !existingImages.includes(item.src))
          .map((item, index) => (
            <div key={item.id} className="portfolio-select-row is-selected">
              <button type="button" onClick={() => updateItems(items.filter((candidate) => candidate.id !== item.id))}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.src} alt="" />
                <span>Remove</span>
              </button>
              <input
                value={item.title}
                onChange={(event) => updateItemTitle(item.id, event.target.value)}
                placeholder="Artwork title"
                aria-label={`Uploaded portfolio title ${index + 1}`}
              />
            </div>
          ))}
      </div>
    </>
  );
}

function PortfolioImageManager({
  images,
  disabled,
  onUpload,
  onRemove,
}: {
  images: string[];
  disabled: boolean;
  onUpload: (files: File[]) => void;
  onRemove: (imageUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="portfolio-manager">
      <div className="portfolio-manager-head">
        <div>
          <span>Portfolio photos</span>
          <strong>{images.length} selected for AR carousel</strong>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled}>
          Upload photos
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.avif,.bmp,.svg"
        multiple
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(event.currentTarget.files ?? []);
          if (files.length) onUpload(files);
          event.currentTarget.value = "";
        }}
      />
      <div className="portfolio-strip">
        {images.length === 0 ? <p>No portfolio photos yet. Upload images used by the AR Portfolio panel.</p> : null}
        {images.map((imageUrl, index) => (
          <figure key={`${imageUrl}-${index}`} className="portfolio-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" />
            <figcaption>
              <span>Photo {index + 1}</span>
              <button type="button" onClick={() => onRemove(imageUrl)} aria-label={`Remove photo ${index + 1}`}>
                Remove
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

function AssetDrop({
  label,
  value,
  accept,
  onFile,
}: {
  label: string;
  value: string;
  accept: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <label className="asset-drop">
      <span>{label}</span>
      <strong>{value}</strong>
      <button type="button" onClick={() => inputRef.current?.click()}>
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.currentTarget.files?.[0];
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="color-control">
      {label}
      <span>
        <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      </span>
    </label>
  );
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={formatNumber(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="info-block">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function UploadProgressQueue({ items }: { items: UploadProgressItem[] }) {
  return (
    <aside className="upload-progress-queue" aria-live="polite" aria-label="Upload progress">
      <div className="upload-progress-head">
        <span>Uploading</span>
        <strong>{items.length} file{items.length > 1 ? "s" : ""}</strong>
      </div>
      <div className="upload-progress-list">
        {items.map((item) => (
          <div key={item.id} className={`upload-progress-item is-${item.state}`}>
            <div className="upload-progress-copy">
              <span>{assetLabel(item.kind)}</span>
              <strong>{item.name}</strong>
            </div>
            <div className="upload-progress-meta">
              <span>{formatUploadBytes(item.loaded, item.total)}</span>
              <strong>{item.state === "error" ? "Failed" : `${Math.round(item.percent)}%`}</strong>
            </div>
            <div className="upload-progress-track">
              <span style={{ width: `${clamp(item.percent, 4, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

async function saveManifest(manifest: WorkbenchManifest) {
  const response = await fetch("/api/workbench/artworks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(manifest),
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as WorkbenchManifest;
}

async function uploadWorkbenchAsset(
  file: File,
  artworkId: string,
  onProgress?: (progress: { loaded: number; total: number; percent: number }) => void,
) {
  const formData = new FormData();
  formData.append("asset", file);
  formData.append("artworkId", artworkId);

  return await new Promise<{ ok: boolean; url: string; bytes: number; type: string }>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/workbench/assets");

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      onProgress?.({
        loaded: event.loaded,
        total: event.total,
        percent: clamp((event.loaded / event.total) * 100, 0, 100),
      });
    };

    request.onload = () => {
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(request.responseText || `Upload failed with status ${request.status}.`));
        return;
      }
      try {
        resolve(JSON.parse(request.responseText) as { ok: boolean; url: string; bytes: number; type: string });
      } catch {
        reject(new Error("Upload returned an invalid response."));
      }
    };

    request.onerror = () => reject(new Error("Asset upload failed."));
    request.onabort = () => reject(new Error("Asset upload was cancelled."));
    request.send(formData);
  });
}

function normalizeDraft(artwork: ArtworkConfig): ArtworkConfig {
  const id = slugify(artwork.id || artwork.title);
  return {
    ...artwork,
    id,
    targetIndex: Number.isFinite(artwork.targetIndex) ? artwork.targetIndex : 0,
    targetImageUrl: artwork.targetImageUrl || "",
    effects: {
      particleCount: clamp(artwork.effects.particleCount, 20, 150),
      lowPowerParticleCount: clamp(artwork.effects.lowPowerParticleCount, 10, 80),
      intensity: artwork.effects.intensity,
    },
    arObjects: artwork.arObjects ?? [],
  };
}

function createARObject(type: ARObjectType, index: number): ARObjectConfig {
  if (type === "brush") return createBrushObject(index, []);

  const id = `object-${Date.now()}`;
  const baseName =
    type === "model3d"
      ? "3D object"
      : type === "gif"
        ? "GIF layer"
        : type === "button"
          ? "Action button"
          : type === "panel"
            ? "Info panel"
            : type === "portfolio"
              ? "Portfolio"
            : `${type[0].toUpperCase()}${type.slice(1)} layer`;
  const placement =
    type === "text" || type === "button"
      ? { x: 0, y: 1.18, z: 0.24 }
      : type === "portfolio"
        ? { x: 0, y: 0.6, z: 0.82 }
      : type === "panel"
        ? { x: 1.08, y: 0.22, z: 0.28 }
      : type === "model3d"
        ? { x: 0, y: 0.08, z: 0.55 }
        : index % 2 === 0
          ? { x: 1.05, y: 0.2, z: 0.3 }
          : { x: -1.05, y: 0.2, z: 0.3 };
  return {
    id,
    name: `${baseName} ${index + 1}`,
    type,
    text: type === "text" ? "Museum label" : type === "button" ? "History" : type === "panel" ? "Artwork details" : type === "portfolio" ? "Portfolio" : "",
    src: "",
    icon: type === "button" ? "i" : "",
    actionType: type === "button" ? "history" : type === "panel" ? "history" : "none",
    actionUrl: "",
    brushPoints: [],
    brushAnimation: "flow",
    brushSpeed: 1,
    brushWidth: 0.045,
    portfolioItems: [],
    mediaAspectRatio: undefined,
    mediaFit: "cover",
    color: type === "text" ? "#fff7d6" : type === "button" ? "#2f6f61" : "#55c7a9",
    opacity: 1,
    width: type === "text" ? 1.1 : type === "button" ? 0.72 : type === "panel" ? 0.96 : type === "portfolio" ? 1 : 0.62,
    height: type === "text" ? 0.2 : type === "button" ? 0.28 : type === "panel" ? 0.58 : type === "portfolio" ? 0.552 : 0.48,
    position: placement,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

function createBrushObject(index: number, points: WorldPoint[]): ARObjectConfig {
  return applyBrushBounds({
    id: `brush-${Date.now()}`,
    name: `Animated brush ${index + 1}`,
    type: "brush",
    text: "",
    src: "",
    icon: "",
    actionType: "none",
    actionUrl: "",
    brushPoints: points,
    brushAnimation: "flow",
    brushSpeed: 1,
    brushWidth: 0.045,
    mediaAspectRatio: undefined,
    mediaFit: "cover",
    color: "#5A83E5",
    opacity: 0.92,
    width: 0.2,
    height: 0.2,
    position: { x: points[0]?.x ?? 0, y: points[0]?.y ?? 0, z: 0.34 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  });
}

function applyBrushBounds(object: ARObjectConfig): ARObjectConfig {
  const points = object.brushPoints ?? [];
  if (points.length === 0) return object;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    ...object,
    width: clampFloat(Math.max(0.16, maxX - minX + (object.brushWidth ?? 0.045) * 2), 0.08, 3),
    height: clampFloat(Math.max(0.16, maxY - minY + (object.brushWidth ?? 0.045) * 2), 0.08, 3),
    position: {
      ...object.position,
      x: clampFloat((minX + maxX) / 2, -2, 2),
      y: clampFloat((minY + maxY) / 2, -2, 2),
    },
  };
}

function applyPlacementPreset(object: ARObjectConfig, preset: "above" | "right" | "left" | "overlay"): ARObjectConfig {
  if (preset === "above") {
    return { ...object, position: { ...object.position, x: 0, y: 1.18, z: 0.24 } };
  }
  if (preset === "right") {
    return { ...object, position: { ...object.position, x: 1.08, y: 0.18, z: 0.3 } };
  }
  if (preset === "left") {
    return { ...object, position: { ...object.position, x: -1.08, y: 0.18, z: 0.3 } };
  }
  return { ...object, position: { ...object.position, x: 0, y: 0, z: 0.22 } };
}

function applyMediaAspectRatio(object: ARObjectConfig, aspect: number): ARObjectConfig {
  if (!Number.isFinite(aspect) || aspect <= 0) return object;
  const base = object.width || 0.62;
  const nextHeight = clampFloat(base / aspect, 0.08, 3);
  return {
    ...object,
    mediaAspectRatio: aspect,
    mediaFit: "cover",
    width: clampFloat(base, 0.08, 3),
    height: nextHeight,
  };
}

function resizeObjectWithAspectLock(object: ARObjectConfig, axis: "width" | "height", value: number): ARObjectConfig {
  const nextValue = clampFloat(value, 0.05, 3);
  const aspect = object.type === "video" && Number.isFinite(object.mediaAspectRatio) ? object.mediaAspectRatio ?? 0 : 0;
  if (aspect <= 0) return { ...object, [axis]: nextValue };
  if (axis === "width") {
    return {
      ...object,
      width: nextValue,
      height: clampFloat(nextValue / aspect, 0.05, 3),
    };
  }
  return {
    ...object,
    height: nextValue,
    width: clampFloat(nextValue * aspect, 0.05, 3),
  };
}

function brushAnimationAttribute(object: ARObjectConfig, index: number) {
  const speed = clampFloat(object.brushSpeed ?? 1, 0.1, 4);
  const delay = Math.round(index * 42 / speed);
  const duration = Math.round(1600 / speed);
  if (object.brushAnimation === "pulse") {
    return `property: scale; from: 0.8 0.8 0.8; to: 1.35 1.35 1.35; dir: alternate; loop: true; dur: ${duration}; delay: ${delay}; easing: easeInOutSine`;
  }
  if (object.brushAnimation === "wave") {
    return `property: scale; from: 0.7 1.15 0.7; to: 1.15 0.7 1.15; dir: alternate; loop: true; dur: ${duration}; delay: ${delay}; easing: easeInOutSine`;
  }
  return `property: material.opacity; from: 0.22; to: ${object.opacity}; dir: alternate; loop: true; dur: ${duration}; delay: ${delay}; easing: easeInOutSine`;
}

function transformObjectFromPointer(
  drag: TransformDrag,
  event: globalThis.PointerEvent,
  canvas: HTMLDivElement,
  viewport: ViewportState,
): ARObjectConfig {
  const pointer = canvasPointerToWorld(event, canvas, viewport);
  const object = drag.startObject;

  if (drag.mode === "move") {
    const deltaX = pointer.x - drag.startPointer.x;
    const deltaY = pointer.y - drag.startPointer.y;
    return {
      ...object,
      position: {
        ...object.position,
        x: clampFloat(object.position.x + deltaX, -2, 2),
        y: clampFloat(object.position.y + deltaY, -2, 2),
      },
    };
  }

  if (drag.mode === "rotate") {
    const center = worldPointToClient(object.position, canvas, viewport);
    const radians = Math.atan2(event.clientY - center.centerY, event.clientX - center.centerX);
    return {
      ...object,
      rotation: { ...object.rotation, z: Math.round((radians * 180) / Math.PI) + 90 },
    };
  }

  let left = object.position.x - object.width / 2;
  let right = object.position.x + object.width / 2;
  let bottom = object.position.y - object.height / 2;
  let top = object.position.y + object.height / 2;

  if (drag.handle.includes("e")) right = pointer.x;
  if (drag.handle.includes("w")) left = pointer.x;
  if (drag.handle.includes("n")) top = pointer.y;
  if (drag.handle.includes("s")) bottom = pointer.y;

  const horizontal = normalizeBounds(left, right, 0.08);
  const vertical = normalizeBounds(bottom, top, 0.08);
  const locked = resizeBoundsWithAspectLock(object, horizontal, vertical, drag.handle);

  return {
    ...object,
    width: clampFloat(locked.horizontal.size, 0.08, 3),
    height: clampFloat(locked.vertical.size, 0.08, 3),
    position: {
      ...object.position,
      x: clampFloat(locked.horizontal.center, -2, 2),
      y: clampFloat(locked.vertical.center, -2, 2),
    },
  };
}

function resizeBoundsWithAspectLock(
  object: ARObjectConfig,
  horizontal: { center: number; size: number },
  vertical: { center: number; size: number },
  handle: ResizeHandle,
) {
  const aspect = object.type === "video" && Number.isFinite(object.mediaAspectRatio) ? object.mediaAspectRatio ?? 0 : 0;
  if (aspect <= 0) return { horizontal, vertical };

  const useVerticalSize = handle === "n" || handle === "s";
  if (useVerticalSize) {
    return {
      horizontal: { ...horizontal, size: clampFloat(vertical.size * aspect, 0.08, 3) },
      vertical,
    };
  }

  return {
    horizontal,
    vertical: { ...vertical, size: clampFloat(horizontal.size / aspect, 0.08, 3) },
  };
}

function canvasPointerToWorld(
  event: globalThis.PointerEvent,
  canvas: HTMLDivElement,
  viewport: ViewportState,
): WorldPoint {
  const bounds = canvas.getBoundingClientRect();
  const localX = event.clientX - bounds.left - bounds.width / 2 - viewport.panX;
  const localY = event.clientY - bounds.top - bounds.height / 2 - viewport.panY;
  return {
    x: clampFloat(localX / viewport.zoom / (bounds.width * 0.33), -3, 3),
    y: clampFloat(-localY / viewport.zoom / (bounds.height * 0.33), -3, 3),
  };
}

function worldPointToClient(
  point: { x: number; y: number },
  canvas: HTMLDivElement,
  viewport: ViewportState,
) {
  const bounds = canvas.getBoundingClientRect();
  return {
    centerX: bounds.left + bounds.width / 2 + viewport.panX + point.x * bounds.width * 0.33 * viewport.zoom,
    centerY: bounds.top + bounds.height / 2 + viewport.panY - point.y * bounds.height * 0.33 * viewport.zoom,
  };
}

function normalizeBounds(start: number, end: number, minSize: number) {
  let low = Math.min(start, end);
  let high = Math.max(start, end);
  if (high - low < minSize) {
    const center = (low + high) / 2;
    low = center - minSize / 2;
    high = center + minSize / 2;
  }
  return {
    center: (low + high) / 2,
    size: high - low,
  };
}

function normalizeViewport(viewport: ViewportState): ViewportState {
  return {
    zoom: clampFloat(viewport.zoom, 0.35, 4),
    panX: clampFloat(viewport.panX, -1600, 1600),
    panY: clampFloat(viewport.panY, -1600, 1600),
  };
}

function getPlaneSize(aspect: number) {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 0.72;
  const maxHeight = 2.05;
  const maxWidth = 1.86;
  if (safeAspect >= 1) {
    return {
      width: maxWidth,
      height: clampFloat(maxWidth / safeAspect, 0.5, maxHeight),
    };
  }
  return {
    width: clampFloat(maxHeight * safeAspect, 0.5, maxWidth),
    height: maxHeight,
  };
}

function readMediaDimensions(file: File): Promise<MediaDimensions> {
  if (file.type.startsWith("video/")) return readVideoDimensions(file);
  return readImageFileDimensions(file);
}

function readImageFileDimensions(file: File): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        aspect: (image.naturalWidth || image.width) / Math.max(1, image.naturalHeight || image.height),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read dimensions for ${file.name}.`));
    };
    image.src = url;
  });
}

function readVideoDimensions(file: File): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        aspect: video.videoWidth / Math.max(1, video.videoHeight),
      });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read dimensions for ${file.name}.`));
    };
    video.src = url;
  });
}

function loadImageDimensions(src: string): Promise<MediaDimensions> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        aspect: (image.naturalWidth || image.width) / Math.max(1, image.naturalHeight || image.height),
      });
    };
    image.onerror = () => reject(new Error(`Could not read dimensions for ${src}.`));
    image.src = src;
  });
}

function loadMediaDimensions(src: string, type: "image" | "video"): Promise<MediaDimensions> {
  if (type === "image") return loadImageDimensions(src);
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        aspect: video.videoWidth / Math.max(1, video.videoHeight),
      });
    };
    video.onerror = () => reject(new Error(`Could not read dimensions for ${src}.`));
    video.src = src;
  });
}

function assetAcceptFor(type: ARObjectType) {
  if (type === "model3d") return ".glb,.gltf,model/gltf-binary,model/gltf+json";
  if (type === "video") return "video/mp4,video/webm";
  if (type === "gif") return "image/gif";
  if (type === "button" || type === "panel" || type === "portfolio" || type === "text") return "";
  return "image/*,.avif,.bmp,.svg,.heic,.heif";
}

function createPortfolioItem(src: string, title: string): ARPortfolioItem {
  return {
    id: `portfolio-item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim() || "Artwork",
    src,
  };
}

function loadMindCompiler(): Promise<new () => MindCompiler> {
  if (window.MINDAR?.IMAGE?.Compiler) return Promise.resolve(window.MINDAR.IMAGE.Compiler);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${compilerScript}"]`);
    const finish = () => {
      const Compiler = window.MINDAR?.IMAGE?.Compiler;
      if (!Compiler) reject(new Error("MindAR Compiler was not exposed after loading."));
      else resolve(Compiler);
    };

    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      if (window.MINDAR?.IMAGE?.Compiler) finish();
      return;
    }

    const script = document.createElement("script");
    script.src = compilerScript;
    script.async = true;
    script.onload = finish;
    script.onerror = () => reject(new Error("Could not load the MindAR compiler."));
    document.head.appendChild(script);
  });
}

function loadFileAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not decode ${file.name}.`));
    };
    image.src = url;
  });
}

function loadArtworkTargetImage(artwork: ArtworkConfig, file?: File): Promise<HTMLImageElement> {
  if (file) return loadFileAsImage(file);
  if (!artwork.targetImageUrl) {
    return Promise.reject(new Error(`${artwork.title} has no target image.`));
  }
  return loadImageElementFromUrl(artwork.targetImageUrl, artwork.title);
}

async function loadCompilableTargets(artworks: ArtworkConfig[], filesByArtworkId: Record<string, File>) {
  const compiled: Array<{ artwork: ArtworkConfig; image: HTMLImageElement }> = [];
  const skipped: string[] = [];

  for (const artwork of artworks) {
    try {
      const image = await loadArtworkTargetImage(artwork, filesByArtworkId[artwork.id]);
      compiled.push({ artwork, image });
    } catch (targetError) {
      if (filesByArtworkId[artwork.id]) {
        throw targetError;
      }
      skipped.push(artwork.title);
    }
  }

  return { compiled, skipped };
}

function loadImageElementFromUrl(src: string, label: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load target image for ${label}.`));
    image.src = src;
  });
}

function copyToArrayBuffer(bytes: Uint8Array) {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

function isSupportedImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function assetLabel(kind: UploadKind) {
  if (kind === "audio") return "Audio";
  if (kind === "target") return "Target image";
  if (kind === "layer") return "Layer asset";
  if (kind === "motion") return "Motion WebP";
  return "Historical image";
}

function formatUploadBytes(loaded: number, total: number) {
  const loadedLabel = formatBytes(loaded);
  if (!total) return loadedLabel;
  return `${loadedLabel} / ${formatBytes(total)}`;
}

function formatBytes(value: number) {
  if (value < 1024) return `${Math.max(0, Math.round(value))} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueArtworkId(baseValue: string, artworks: ArtworkConfig[]) {
  const base = baseValue || "artwork";
  const existing = new Set(artworks.map((artwork) => artwork.id));
  if (!existing.has(base)) return base;

  let index = 2;
  let candidate = `${base}-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}`;
  }
  return candidate;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampFloat(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))));
}

function formatNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}
