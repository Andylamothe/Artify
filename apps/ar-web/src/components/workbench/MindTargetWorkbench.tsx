"use client";

import { artworks as seedArtworks } from "@/data/artworks";
import {
  ARObjectConfig,
  ARObjectType,
  ArtworkConfig,
  ArtworkSceneType,
  WorkbenchManifest,
} from "@/types/ar";
import { ChangeEvent, DragEvent, MouseEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

type MindCompiler = {
  compileImageTargets(images: HTMLImageElement[], progress: (value: number) => void): Promise<unknown[]>;
  exportData(): Uint8Array;
};

type WorkshopTab = "target" | "scene" | "assets" | "preview" | "publish";
type AssetKind = "audio" | "image" | "layer" | "target";

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
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ objectId: string; x: number; y: number } | null>(null);

  const objects = useMemo(() => draft.arObjects ?? [], [draft.arObjects]);
  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );
  const targetQueue = useMemo(
    () => manifest.artworks.filter((artwork) => targetFiles[artwork.id]),
    [manifest.artworks, targetFiles],
  );
  const targetPreview = targetPreviews[draft.id] || draft.targetImageUrl || draft.historicalImages[0] || "";
  const targetHealth = targetPreview ? "Target image ready" : "Needs target image";

  const updateDraft = <Key extends keyof ArtworkConfig>(key: Key, value: ArtworkConfig[Key]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateObjects = (nextObjects: ARObjectConfig[]) => {
    updateDraft("arObjects", nextObjects);
  };

  useEffect(() => {
    fetch("/api/workbench/artworks", { cache: "no-store" })
      .then((response) => response.json())
      .then((nextManifest: WorkbenchManifest) => {
        if (!nextManifest.artworks?.length) return;
        setManifest(nextManifest);
        setSelectedId(nextManifest.artworks[0].id);
        setDraft(nextManifest.artworks[0]);
      })
      .catch(() => setError("Could not load saved workbench config; using bundled demo artworks."));
  }, []);

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
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("click", closeMenu);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("click", closeMenu);
    };
  }, [objects, selectedObjectId]);

  const updateObject = (nextObject: ARObjectConfig) => {
    updateObjects(objects.map((object) => (object.id === nextObject.id ? nextObject : object)));
  };

  const addObject = (type: ARObjectType) => {
    const nextObject = createARObject(type, objects.length);
    updateObjects([...objects, nextObject]);
    setSelectedObjectId(nextObject.id);
    setActiveTab("scene");
    setStatus(`${nextObject.name} added`);
  };

  const selectArtwork = (artwork: ArtworkConfig) => {
    setSelectedId(artwork.id);
    setDraft(artwork);
    setSelectedObjectId(null);
    setContextMenu(null);
  };

  const addArtwork = () => {
    const nextArtwork = emptyArtwork(manifest.artworks.length);
    setManifest((current) => ({ ...current, artworks: [...current.artworks, nextArtwork] }));
    setSelectedId(nextArtwork.id);
    setDraft(nextArtwork);
    setSelectedObjectId(null);
    setActiveTab("target");
    setStatus("New artwork created locally. Save when ready.");
  };

  const assignTarget = async (files: File[]) => {
    const file = files.find(isSupportedImageFile);
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setTargetFiles((current) => ({ ...current, [draft.id]: file }));
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
    try {
      const formData = new FormData();
      formData.append("asset", file);
      formData.append("artworkId", draft.id);
      const response = await fetch("/api/workbench/assets", { method: "POST", body: formData });
      if (!response.ok) throw new Error(await response.text());
      const payload = (await response.json()) as { url: string };
      if (kind === "audio") updateDraft("audioUrl", payload.url);
      if (kind === "image") updateDraft("historicalImages", [...draft.historicalImages, payload.url]);
      if (kind === "layer" && selectedObject) updateObject({ ...selectedObject, src: payload.url });
      if (kind === "target") updateDraft("targetImageUrl", payload.url);
      setStatus(`${assetLabel(kind)} uploaded`);
      return payload.url;
    } catch (assetError) {
      setError(assetError instanceof Error ? assetError.message : "Asset upload failed.");
      return null;
    } finally {
      setIsSaving(false);
    }
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
    if (targetQueue.length === 0) {
      setError("Assign at least one target image before compiling a .mind file.");
      setActiveTab("target");
      return;
    }

    setIsCompiling(true);
    setError(null);
    setProgress(2);
    setStatus("Loading MindAR compiler");

    try {
      const Compiler = await loadMindCompiler();
      const compiler = new Compiler();
      const images = await Promise.all(targetQueue.map((artwork) => loadFileAsImage(targetFiles[artwork.id])));

      setStatus("Compiling image targets");
      await compiler.compileImageTargets(images, (value) => setProgress(Math.min(98, Math.max(5, value))));

      const bytes = compiler.exportData();
      const mindBlob = new Blob([copyToArrayBuffer(bytes)], { type: "application/octet-stream" });
      const formData = new FormData();
      formData.append("mindFile", mindBlob, "artworks.mind");

      setStatus("Installing .mind into public/ar/targets");
      const mindResponse = await fetch("/api/workbench/mind", { method: "POST", body: formData });
      if (!mindResponse.ok) throw new Error(await mindResponse.text());

      const queueIndexes = new Map(targetQueue.map((artwork, index) => [artwork.id, index]));
      const nextArtworks = manifest.artworks.map((artwork) => {
        const nextIndex = queueIndexes.get(artwork.id);
        const next = artwork.id === draft.id ? normalizeDraft(draft) : artwork;
        return nextIndex === undefined ? next : { ...next, targetIndex: nextIndex };
      });
      const saved = await saveManifest({ ...manifest, artworks: nextArtworks, mindFile: "/ar/targets/artworks.mind" });

      setManifest(saved);
      setDraft(saved.artworks.find((artwork) => artwork.id === draft.id) ?? saved.artworks[0]);
      setProgress(100);
      setStatus(`Installed .mind with ${targetQueue.length} target${targetQueue.length > 1 ? "s" : ""}`);
    } catch (compileError) {
      setError(compileError instanceof Error ? compileError.message : "Mind compilation failed.");
      setStatus("Compilation failed");
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

  const moveObjectFromPointer = (object: ARObjectConfig, event: PointerEvent<HTMLButtonElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bounds = canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const y = (0.5 - (event.clientY - bounds.top) / bounds.height) * 2;
    updateObject({
      ...object,
      position: {
        ...object.position,
        x: clampFloat(x, -1.5, 1.5),
        y: clampFloat(y, -1.5, 1.5),
      },
    });
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
              </button>
            ))}
          </div>

          <div className="tool-library">
            <span className="section-kicker">Add Elements</span>
            <div className="tool-grid">
              {objectPalette.map((item) => (
                <button key={item.type} type="button" onClick={() => addObject(item.type)}>
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
              <span>{targetHealth}</span>
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
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => void assignTarget(Array.from(event.currentTarget.files ?? []))}
              />

              <div className="canvas-shell" ref={canvasRef}>
                <AFrameStagePreview
                  artwork={draft}
                  targetPreview={targetPreview}
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
                      onMove={(event) => moveObjectFromPointer(object, event)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        setSelectedObjectId(object.id);
                        setContextMenu({ objectId: object.id, x: event.clientX, y: event.clientY });
                      }}
                    />
                  ))}
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
                onChange={updateObject}
                onDelete={() => deleteObject(selectedObject.id)}
                onUpload={(file) => void uploadAsset(file, "layer")}
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
    </main>
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
          <AssetDrop label="Historical image" value={`${draft.historicalImages.length} historical image(s)`} accept="image/png,image/jpeg,image/webp,image/gif" onFile={(file) => onAsset(file, "image")} />
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
          <InfoBlock title="Mobile performance" value={`${draft.effects.particleCount} particles, ${draft.effects.lowPowerParticleCount} in low-power mode.`} />
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
  ready,
  onUploadClick,
}: {
  artwork: ArtworkConfig;
  targetPreview: string;
  ready: boolean;
  onUploadClick: () => void;
}) {
  const objects = artwork.arObjects ?? [];

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
    <div className="aframe-preview-wrap">
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
            width="1.45"
            height="2.05"
            position="0 0 0"
            material="shader: flat; transparent: false"
          />
          <a-plane
            width="1.52"
            height="2.12"
            position="0 0 -0.012"
            color="#ffffff"
            material="shader: flat; opacity: 0.92"
          />
          <a-text
            value="tracked artwork plane"
            position="0 -1.17 0.08"
            color="#17483d"
            align="center"
            width="1.3"
            wrap-count="24"
          />
          {objects.map((object) => (
            <a-entity
              key={object.id}
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

  if (object.type === "model3d" && object.src) {
    return <a-gltf-model src={object.src} />;
  }

  if (object.type === "video" && object.src) {
    return <a-video src={object.src} width={object.width} height={object.height} material={`transparent: true; opacity: ${object.opacity}`} />;
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
  onMove,
  onContextMenu,
}: {
  object: ARObjectConfig;
  selected: boolean;
  onSelect: () => void;
  onMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
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

  return (
    <button
      type="button"
      className={`studio-object studio-${object.type} ${selected ? "is-selected" : ""}`}
      style={style}
      onPointerDown={(event) => {
        onSelect();
        event.currentTarget.setPointerCapture(event.pointerId);
        onMove(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons !== 1) return;
        onMove(event);
      }}
      onContextMenu={onContextMenu}
      title={object.name}
    >
      <ObjectPreview object={object} />
    </button>
  );
}

function ObjectPreview({ object }: { object: ARObjectConfig }) {
  if (object.type === "text") return <span>{object.text || "Text"}</span>;
  if ((object.type === "image" || object.type === "gif") && object.src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={object.src} alt="" />;
  }
  if (object.type === "video" && object.src) {
    return <video src={object.src} muted loop playsInline autoPlay />;
  }
  return (
    <span>
      {object.type === "model3d" ? "3D model" : object.type}
      <small>{object.src ? "asset linked" : "drop asset in inspector"}</small>
    </span>
  );
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
      <NumberControl label="Particles" value={draft.effects.particleCount} min={20} max={150} step={1} onChange={(value) => onDraftChange("effects", { ...draft.effects, particleCount: value })} />
      <NumberControl label="Low power" value={draft.effects.lowPowerParticleCount} min={10} max={80} step={1} onChange={(value) => onDraftChange("effects", { ...draft.effects, lowPowerParticleCount: value })} />
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
  onChange,
  onDelete,
  onUpload,
}: {
  object: ARObjectConfig;
  onChange: (object: ARObjectConfig) => void;
  onDelete: () => void;
  onUpload: (file: File) => void;
}) {
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
        </select>
      </label>
      {object.type === "text" ? (
        <label className="wide">
          Text
          <textarea rows={3} value={object.text ?? ""} onChange={(event) => onChange({ ...object, text: event.target.value })} />
        </label>
      ) : (
        <AssetDrop label="Object asset" value={object.src || "No asset selected"} accept={assetAcceptFor(object.type)} onFile={onUpload} />
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
      <NumberControl label="Width" value={object.width} min={0.05} max={3} step={0.05} onChange={(value) => onChange({ ...object, width: value })} />
      <NumberControl label="Height" value={object.height} min={0.05} max={3} step={0.05} onChange={(value) => onChange({ ...object, height: value })} />
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

async function saveManifest(manifest: WorkbenchManifest) {
  const response = await fetch("/api/workbench/artworks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(manifest),
  });
  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as WorkbenchManifest;
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
  const id = `object-${Date.now()}`;
  const baseName =
    type === "model3d" ? "3D object" : type === "gif" ? "GIF layer" : `${type[0].toUpperCase()}${type.slice(1)} layer`;
  const placement =
    type === "text"
      ? { x: 0, y: 1.18, z: 0.24 }
      : type === "model3d"
        ? { x: 0, y: 0.08, z: 0.55 }
        : index % 2 === 0
          ? { x: 1.05, y: 0.2, z: 0.3 }
          : { x: -1.05, y: 0.2, z: 0.3 };
  return {
    id,
    name: `${baseName} ${index + 1}`,
    type,
    text: type === "text" ? "Museum label" : "",
    src: "",
    color: type === "text" ? "#fff7d6" : "#55c7a9",
    opacity: 1,
    width: type === "text" ? 1.1 : 0.62,
    height: type === "text" ? 0.2 : 0.48,
    position: placement,
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
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

function assetAcceptFor(type: ARObjectType) {
  if (type === "model3d") return ".glb,.gltf,model/gltf-binary,model/gltf+json";
  if (type === "video") return "video/mp4,video/webm";
  if (type === "gif") return "image/gif";
  return "image/png,image/jpeg,image/webp,image/gif";
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

function copyToArrayBuffer(bytes: Uint8Array) {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

function isSupportedImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

function assetLabel(kind: AssetKind) {
  if (kind === "audio") return "Audio";
  if (kind === "target") return "Target image";
  if (kind === "layer") return "Layer asset";
  return "Historical image";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
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
