"use client";

import { MotionBrushPath, MotionBrushSettings, MotionBrushState, MotionBrushTool } from "@/types/ar";
import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";

const defaultSettings: MotionBrushSettings = {
  brushSize: 42,
  feather: 18,
  speed: 1.15,
  intensity: 0.72,
  distortionStrength: 0.58,
  loopDuration: 2200,
  opacity: 1,
};

type HistoryFrame = Pick<MotionBrushState, "maskDataUrl" | "paths">;

interface Props {
  imageSrc: string;
  initialState?: MotionBrushState;
  onCancel: () => void;
  onSave: (state: MotionBrushState) => void;
  onExport: (file: File, state: MotionBrushState) => Promise<void>;
}

export function MotionBrushModal({ imageSrc, initialState, onCancel, onSave, onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const drawingRef = useRef<{ mode: MotionBrushTool; last: Point } | null>(null);
  const pathStartRef = useRef<Point | null>(null);
  const animationRef = useRef(0);
  const pathsRef = useRef<MotionBrushPath[]>(initialState?.paths ?? []);
  const settingsRef = useRef<MotionBrushSettings>(initialState?.settings ?? defaultSettings);
  const previewRef = useRef(initialState?.previewEnabled ?? false);
  const [tool, setTool] = useState<MotionBrushTool>("brush");
  const [settings, setSettings] = useState<MotionBrushSettings>(initialState?.settings ?? defaultSettings);
  const [paths, setPaths] = useState<MotionBrushPath[]>(initialState?.paths ?? []);
  const [previewEnabled, setPreviewEnabled] = useState(initialState?.previewEnabled ?? false);
  const [history, setHistory] = useState<HistoryFrame[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryFrame[]>([]);
  const [status, setStatus] = useState("Load an image, paint the mask, then draw motion arrows.");
  const [isExporting, setIsExporting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewport, setViewport] = useState({ width: 720, height: 480 });
  const [pathPreviewStart, setPathPreviewStart] = useState<Point | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0.5,
    y: 0.5,
    visible: false,
  });
  const getState = (): MotionBrushState => ({
    maskDataUrl: maskRef.current?.toDataURL("image/png") ?? initialState?.maskDataUrl ?? "",
    paths: pathsRef.current,
    settings: settingsRef.current,
    previewEnabled: previewRef.current,
  });

  function renderFrame(phase: number, targetCanvas = canvasRef.current, showGuides = true) {
    const image = imageRef.current;
    const mask = maskRef.current;
    const canvas = targetCanvas;
    if (!image || !mask || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderMotionFrame(ctx, canvas, image, mask, pathsRef.current, settingsRef.current, phase, previewRef.current);
    if (showGuides) drawGuides(ctx, canvas, mask, pathsRef.current, settingsRef.current, previewRef.current);
  }

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    previewRef.current = previewEnabled;
  }, [previewEnabled]);

  useEffect(() => {
    let cancelled = false;
    loadImage(imageSrc)
      .then((image) => {
        if (cancelled) return;
        imageRef.current = image;
        const size = fitSize(image.naturalWidth, image.naturalHeight, 940);
        setViewport(size);
        const canvas = canvasRef.current;
        const mask = maskRef.current;
        if (!canvas || !mask) return;
        [canvas, mask].forEach((item) => {
          item.width = size.width;
          item.height = size.height;
        });
        if (initialState?.maskDataUrl) {
          loadImage(initialState.maskDataUrl).then((maskImage) => {
            const ctx = mask.getContext("2d");
            ctx?.clearRect(0, 0, mask.width, mask.height);
            ctx?.drawImage(maskImage, 0, 0, mask.width, mask.height);
          });
        }
        renderFrame(0);
      })
      .catch(() => setStatus("Could not load the source image for motion brush."));
    return () => {
      cancelled = true;
    };
  }, [imageSrc, initialState?.maskDataUrl]);

  useEffect(() => {
    const tick = (time: number) => {
      renderFrame(time / settingsRef.current.loopDuration);
      animationRef.current = window.requestAnimationFrame(tick);
    };
    animationRef.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationRef.current);
  });

  const pushHistory = () => {
    const mask = maskRef.current;
    if (!mask) return;
    setHistory((items) => [...items.slice(-24), { maskDataUrl: mask.toDataURL("image/png"), paths }]);
    setRedoStack([]);
  };

  const restoreFrame = (frame: HistoryFrame) => {
    setPaths(frame.paths);
    const mask = maskRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    ctx?.clearRect(0, 0, mask.width, mask.height);
    if (!frame.maskDataUrl) return;
    loadImage(frame.maskDataUrl).then((image) => ctx?.drawImage(image, 0, 0, mask.width, mask.height));
  };

  const undo = () => {
    const previous = history.at(-1);
    const mask = maskRef.current;
    if (!previous || !mask) return;
    setRedoStack((items) => [...items, { maskDataUrl: mask.toDataURL("image/png"), paths }]);
    setHistory((items) => items.slice(0, -1));
    restoreFrame(previous);
  };

  const redo = () => {
    const next = redoStack.at(-1);
    const mask = maskRef.current;
    if (!next || !mask) return;
    setHistory((items) => [...items, { maskDataUrl: mask.toDataURL("image/png"), paths }]);
    setRedoStack((items) => items.slice(0, -1));
    restoreFrame(next);
  };

  const pointerPoint = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left - bounds.width / 2 - pan.x) / zoom + canvas.width / 2) / canvas.width,
      y: ((event.clientY - bounds.top - bounds.height / 2 - pan.y) / zoom + canvas.height / 2) / canvas.height,
    };
  };

  const updateCursor = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = pointerPoint(event);
    setCursor({
      x: clamp01(point.x),
      y: clamp01(point.y),
      visible: true,
    });
    return point;
  };

  const startPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const point = updateCursor(event);
    pushHistory();
    if (tool === "path") {
      pathStartRef.current = point;
      setPathPreviewStart(point);
      return;
    }
    drawingRef.current = { mode: tool, last: point };
    paintStroke(point, point, tool === "eraser");
  };

  const movePointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const point = updateCursor(event);
    const drawing = drawingRef.current;
    if (!drawing) return;
    event.preventDefault();
    paintStroke(drawing.last, point, drawing.mode === "eraser");
    if (drawing.mode === "brush") appendStrokeMotionPath(drawing.last, point);
    drawing.last = point;
  };

  const endPointer = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (tool === "path" && pathStartRef.current) {
      const end = pointerPoint(event);
      const start = pathStartRef.current;
      if (distance(start, end) > 0.025) {
        setPaths((items) => {
          const nextPaths = [
            ...items,
            {
            id: `motion-path-${Date.now()}`,
            from: start,
            to: end,
            speed: settings.speed,
            force: settings.intensity,
          },
          ];
          pathsRef.current = nextPaths;
          return nextPaths;
        });
      }
    }
    drawingRef.current = null;
    pathStartRef.current = null;
    setPathPreviewStart(null);
  };

  const paintStroke = (from: Point, to: Point, erase: boolean) => {
    const mask = maskRef.current;
    if (!mask) return;
    const ctx = mask.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = erase ? "destination-out" : "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = settings.brushSize;
    ctx.strokeStyle = "rgba(255,255,255,1)";
    ctx.shadowColor = "rgba(255,255,255,0.78)";
    ctx.shadowBlur = erase ? 0 : settings.feather;
    ctx.beginPath();
    ctx.moveTo(from.x * mask.width, from.y * mask.height);
    ctx.lineTo(to.x * mask.width, to.y * mask.height);
    ctx.stroke();
    ctx.restore();
  };

  const appendStrokeMotionPath = (from: Point, to: Point) => {
    const strokeDistance = distance(from, to);
    if (strokeDistance < 0.012) return;
    const motionPath: MotionBrushPath = {
      id: `brush-direction-${Date.now()}-${Math.round(from.x * 1000)}-${Math.round(from.y * 1000)}`,
      from,
      to,
      speed: settingsRef.current.speed,
      force: Math.max(0.12, settingsRef.current.intensity),
    };
    setPaths((items) => {
      const recentItems = items.filter((item) => item.id.startsWith("brush-direction-")).slice(-90);
      const manualItems = items.filter((item) => !item.id.startsWith("brush-direction-"));
      const nextPaths = [...manualItems, ...recentItems, motionPath].slice(-120);
      pathsRef.current = nextPaths;
      return nextPaths;
    });
  };

  const clearMask = () => {
    pushHistory();
    const mask = maskRef.current;
    mask?.getContext("2d")?.clearRect(0, 0, mask.width, mask.height);
  };

  const clearPaths = () => {
    pushHistory();
    pathsRef.current = [];
    setPaths([]);
  };

  const exportWebP = async () => {
    const image = imageRef.current;
    const mask = maskRef.current;
    if (!image || !mask) return;
    setIsExporting(true);
    setStatus("Rendering frames...");
    try {
      const size = fitSize(image.naturalWidth, image.naturalHeight, 720);
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = size.width;
      exportCanvas.height = size.height;
      const exportMask = document.createElement("canvas");
      exportMask.width = size.width;
      exportMask.height = size.height;
      exportMask.getContext("2d")?.drawImage(mask, 0, 0, size.width, size.height);
      const ctx = exportCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas export is not available.");
      const frameCount = Math.max(12, Math.min(36, Math.round(settings.loopDuration / 75)));
      const frames = [];
      for (let index = 0; index < frameCount; index += 1) {
        renderMotionFrame(ctx, exportCanvas, image, exportMask, paths, settings, index / frameCount, true);
        frames.push({
          data: new Uint8Array(ctx.getImageData(0, 0, exportCanvas.width, exportCanvas.height).data),
          duration: Math.round(settings.loopDuration / frameCount),
          config: { lossless: 0, quality: 82 },
        });
      }
      setStatus("Encoding animated WebP...");
      const { encodeAnimation } = (await loadWebPEncoder()) as {
        encodeAnimation: (
          width: number,
          height: number,
          hasAlpha: boolean,
          frames: Array<{ data: Uint8Array; duration: number; config: { lossless: number; quality: number } }>,
        ) => Promise<Uint8Array | null>;
      };
      const bytes = await encodeAnimation(exportCanvas.width, exportCanvas.height, true, frames);
      if (!bytes) throw new Error("Animated WebP encoder returned no data.");
      const byteCopy = new Uint8Array(bytes.byteLength);
      byteCopy.set(bytes);
      const file = new File([byteCopy.buffer], `motion-brush-${Date.now()}.webp`, {
        type: "image/webp",
      });
      await onExport(file, {
        ...getState(),
        maskDataUrl: mask.toDataURL("image/png"),
        previewEnabled: true,
      });
      setStatus(`Exported animated WebP (${Math.round(file.size / 1024)} KB).`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not export animated WebP.");
    } finally {
      setIsExporting(false);
    }
  };

  const saveState = () => {
    onSave(getState());
  };

  return (
    <div className="motion-modal-backdrop" role="dialog" aria-modal="true" aria-label="Motion Brush Animation editor">
      <div className="motion-modal">
        <header className="motion-modal-header">
          <div>
            <span>Motion Brush Animation</span>
            <strong>Paint the moving area, draw direction arrows, export a looping animated WebP</strong>
          </div>
          <button type="button" onClick={onCancel}>Cancel</button>
        </header>

        <aside className="motion-tools">
          <span className="motion-panel-label">Tools</span>
          <ToolButton label="Motion Brush" active={tool === "brush"} onClick={() => setTool("brush")} />
          <ToolButton label="Eraser" active={tool === "eraser"} onClick={() => setTool("eraser")} />
          <ToolButton label="Motion Path Tool" active={tool === "path"} onClick={() => setTool("path")} />
          <button type="button" onClick={undo} disabled={!history.length}>Undo</button>
          <button type="button" onClick={redo} disabled={!redoStack.length}>Redo</button>
          <button type="button" onClick={clearMask}>Clear Mask</button>
          <button type="button" onClick={clearPaths}>Clear Paths</button>
          <button type="button" onClick={() => setPreviewEnabled((value) => !value)}>
            {previewEnabled ? "Stop Preview" : "Preview Animation"}
          </button>
          <button type="button" className="primary-action" onClick={() => void exportWebP()} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export WEBP"}
          </button>
          <button type="button" onClick={saveState}>Save</button>
        </aside>

        <section className="motion-stage">
          <div className="motion-stage-badge">
            <span>{tool === "path" ? "Draw direction arrows" : tool === "eraser" ? "Erase mask" : "Paint motion mask"}</span>
            <strong>{previewEnabled ? "Live preview ON" : "Mask view"}</strong>
          </div>
          <div
            className="motion-canvas-wrap"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            <canvas
              ref={canvasRef}
              width={viewport.width}
              height={viewport.height}
              onPointerDown={startPointer}
              onPointerMove={movePointer}
              onPointerUp={endPointer}
              onPointerCancel={endPointer}
              onPointerEnter={updateCursor}
              onPointerLeave={() => setCursor((current) => ({ ...current, visible: false }))}
            />
            {cursor.visible ? (
              <BrushCursorOverlay
                cursor={cursor}
                settings={settings}
                tool={tool}
                viewport={viewport}
                pathStart={pathPreviewStart}
              />
            ) : null}
            <canvas ref={maskRef} className="motion-hidden-canvas" />
          </div>
          <div className="motion-viewport-controls">
            <button type="button" onClick={() => setZoom((value) => Math.max(0.35, value / 1.2))}>-</button>
            <span>{Math.round(zoom * 100)}%</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(4, value * 1.2))}>+</button>
            <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
          </div>
        </section>

        <aside className="motion-settings">
          <span className="motion-panel-label">Settings</span>
          <RangeControl label="Brush Size" min={4} max={130} step={1} value={settings.brushSize} onChange={(brushSize) => setSettings({ ...settings, brushSize })} />
          <RangeControl label="Feather / Softness" min={0} max={80} step={1} value={settings.feather} onChange={(feather) => setSettings({ ...settings, feather })} />
          <RangeControl label="Speed" min={0.2} max={4} step={0.1} value={settings.speed} onChange={(speed) => setSettings({ ...settings, speed })} />
          <RangeControl label="Intensity" min={0} max={1} step={0.01} value={settings.intensity} onChange={(intensity) => setSettings({ ...settings, intensity })} />
          <RangeControl label="Distortion Strength" min={0} max={1} step={0.01} value={settings.distortionStrength} onChange={(distortionStrength) => setSettings({ ...settings, distortionStrength })} />
          <RangeControl label="Loop Duration" min={600} max={4200} step={100} value={settings.loopDuration} onChange={(loopDuration) => setSettings({ ...settings, loopDuration })} />
          <RangeControl label="Opacity" min={0.2} max={1} step={0.01} value={settings.opacity} onChange={(opacity) => setSettings({ ...settings, opacity })} />
          <p>{status}</p>
        </aside>
      </div>
    </div>
  );
}

function ToolButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={active ? "is-active" : ""} onClick={onClick}>
      {label}
    </button>
  );
}

function RangeControl({
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
      <span>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <strong>{value}</strong>
    </label>
  );
}

type Point = { x: number; y: number };

function BrushCursorOverlay({
  cursor,
  settings,
  tool,
  viewport,
  pathStart,
}: {
  cursor: { x: number; y: number; visible: boolean };
  settings: MotionBrushSettings;
  tool: MotionBrushTool;
  viewport: { width: number; height: number };
  pathStart: Point | null;
}) {
  const brushWidth = `${Math.max(10, (settings.brushSize / Math.max(1, viewport.width)) * 100)}%`;
  const featherWidth = `${Math.max(
    14,
    ((settings.brushSize + settings.feather * 2) / Math.max(1, viewport.width)) * 100,
  )}%`;
  const left = `${cursor.x * 100}%`;
  const top = `${cursor.y * 100}%`;
  const pathAngle =
    pathStart && tool === "path"
      ? (Math.atan2(cursor.y - pathStart.y, cursor.x - pathStart.x) * 180) / Math.PI
      : 0;
  const pathLength =
    pathStart && tool === "path"
      ? `${Math.hypot(cursor.x - pathStart.x, cursor.y - pathStart.y) * 100}%`
      : "0%";

  return (
    <div className={`motion-cursor-overlay is-${tool}`} aria-hidden="true">
      {pathStart && tool === "path" ? (
        <span
          className="motion-path-preview"
          style={{
            left: `${pathStart.x * 100}%`,
            top: `${pathStart.y * 100}%`,
            width: pathLength,
            transform: `rotate(${pathAngle}deg)`,
          }}
        />
      ) : null}
      <span className="motion-cursor-feather" style={{ left, top, width: featherWidth }} />
      <span className="motion-cursor-core" style={{ left, top, width: brushWidth }} />
      <span className="motion-cursor-crosshair" style={{ left, top }} />
      <span
        className="motion-cursor-readout"
        style={{
          left,
          top,
        }}
      >
        <strong>{tool === "path" ? "Path" : tool === "eraser" ? "Eraser" : "Brush"}</strong>
        <span>Size {Math.round(settings.brushSize)}px</span>
        <span>Soft {Math.round(settings.feather)}px</span>
        <span>Speed {settings.speed.toFixed(1)}x</span>
        <span>Force {Math.round(settings.intensity * 100)}%</span>
      </span>
    </div>
  );
}

function renderMotionFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  mask: HTMLCanvasElement,
  paths: MotionBrushPath[],
  settings: MotionBrushSettings,
  phase: number,
  animate: boolean,
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  if (!animate) return;
  const renderPaths = getRenderablePaths(paths);
  if (!renderPaths.length) return;

  const layer = document.createElement("canvas");
  layer.width = canvas.width;
  layer.height = canvas.height;
  const layerCtx = layer.getContext("2d");
  const influence = document.createElement("canvas");
  influence.width = canvas.width;
  influence.height = canvas.height;
  const influenceCtx = influence.getContext("2d");
  if (!layerCtx || !influenceCtx) return;

  renderPaths.forEach((path) => {
    renderLocalMotionPath(ctx, layerCtx, influenceCtx, layer, influence, canvas, image, mask, path, settings, phase);
  });
}

function renderLocalMotionPath(
  targetCtx: CanvasRenderingContext2D,
  layerCtx: CanvasRenderingContext2D,
  influenceCtx: CanvasRenderingContext2D,
  layer: HTMLCanvasElement,
  influence: HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  mask: HTMLCanvasElement,
  path: MotionBrushPath,
  settings: MotionBrushSettings,
  phase: number,
) {
  const vector = pathVector(path);
  if (!vector) return;
  const localSpeed = path.speed || settings.speed;
  const progress = ((phase * localSpeed) % 1 + 1) % 1;
  const travel = settings.distortionStrength * settings.intensity * path.force * 88;
  const dx = vector.x * travel;
  const dy = vector.y * travel;
  const ripple = Math.sin(progress * Math.PI * 2) * settings.distortionStrength * settings.intensity * 9;

  layerCtx.clearRect(0, 0, layer.width, layer.height);
  layerCtx.save();
  layerCtx.globalAlpha = settings.opacity * (1 - progress);
  layerCtx.drawImage(image, dx * progress, dy * progress, layer.width, layer.height);
  layerCtx.globalAlpha = settings.opacity * progress;
  layerCtx.drawImage(image, dx * (progress - 1), dy * (progress - 1), layer.width, layer.height);
  layerCtx.globalAlpha = 0.18 * settings.intensity;
  layerCtx.drawImage(
    image,
    dx * progress + vector.y * ripple,
    dy * progress - vector.x * ripple,
    layer.width,
    layer.height,
  );
  layerCtx.restore();

  influenceCtx.clearRect(0, 0, influence.width, influence.height);
  drawPathInfluence(influenceCtx, path, canvas, settings);

  layerCtx.globalCompositeOperation = "destination-in";
  layerCtx.drawImage(mask, 0, 0, layer.width, layer.height);
  layerCtx.drawImage(influence, 0, 0);
  layerCtx.globalCompositeOperation = "source-over";
  targetCtx.drawImage(layer, 0, 0);
}

function drawPathInfluence(
  ctx: CanvasRenderingContext2D,
  path: MotionBrushPath,
  canvas: HTMLCanvasElement,
  settings: MotionBrushSettings,
) {
  const from = { x: path.from.x * canvas.width, y: path.from.y * canvas.height };
  const to = { x: path.to.x * canvas.width, y: path.to.y * canvas.height };
  const radius = Math.max(12, settings.brushSize + settings.feather * 2);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.92)";
  ctx.lineWidth = radius;
  ctx.shadowColor = "rgba(255,255,255,0.95)";
  ctx.shadowBlur = settings.feather;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawGuides(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  paths: MotionBrushPath[],
  settings: MotionBrushSettings,
  previewEnabled: boolean,
) {
  if (!previewEnabled) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#5A83E5";
    ctx.drawImage(mask, 0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  getRenderablePaths(paths).forEach((path) => drawArrow(ctx, path, canvas, settings));
}

function drawArrow(ctx: CanvasRenderingContext2D, path: MotionBrushPath, canvas: HTMLCanvasElement, settings: MotionBrushSettings) {
  const from = { x: path.from.x * canvas.width, y: path.from.y * canvas.height };
  const to = { x: path.to.x * canvas.width, y: path.to.y * canvas.height };
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.save();
  ctx.strokeStyle = "#f7c948";
  ctx.fillStyle = "#f7c948";
  ctx.lineWidth = Math.max(2, settings.brushSize * 0.08);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - Math.cos(angle - 0.45) * 18, to.y - Math.sin(angle - 0.45) * 18);
  ctx.lineTo(to.x - Math.cos(angle + 0.45) * 18, to.y - Math.sin(angle + 0.45) * 18);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function getRenderablePaths(paths: MotionBrushPath[]) {
  const manualPaths = paths.filter((path) => !path.id.startsWith("brush-direction-")).slice(-18);
  const brushPaths = paths.filter((path) => path.id.startsWith("brush-direction-")).slice(-54);
  return [...manualPaths, ...brushPaths].filter((path) => !!pathVector(path));
}

function pathVector(path: MotionBrushPath) {
  const dx = path.to.x - path.from.x;
  const dy = path.to.y - path.from.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.0001) return null;
  return { x: dx / length, y: dy / length };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = src;
  });
}

function loadWebPEncoder() {
  const dynamicImport = new Function("specifier", "return import(specifier)") as (specifier: string) => Promise<unknown>;
  return dynamicImport(`/vendor/wasm-webp/index.js?v=${Date.now()}`);
}

function fitSize(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
