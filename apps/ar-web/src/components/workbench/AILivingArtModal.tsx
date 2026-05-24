"use client";

import { useEffect, useMemo, useState } from "react";

type GenerateState = "idle" | "preparing" | "starting" | "running" | "done" | "error";
type AnalyzeState = "idle" | "preparing" | "analyzing" | "done" | "error";

interface Props {
  artworkId: string;
  imageSrc: string;
  title: string;
  onCancel: () => void;
  onGenerated: (url: string) => void;
}

export function AILivingArtModal({ artworkId, imageSrc, title, onCancel, onGenerated }: Props) {
  const [prompt, setPrompt] = useState("Use Gemini Analyze to create a creative multi-zone Veo 3 motion prompt, or write your own prompt here.");
  const [analysisState, setAnalysisState] = useState<AnalyzeState>("idle");
  const [analysisStatus, setAnalysisStatus] = useState("Analyze the artwork first to build a creative multi-zone Veo 3 prompt.");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(4);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [previewMode, setPreviewMode] = useState<"photo" | "video">("photo");
  const [state, setState] = useState<GenerateState>("idle");
  const [status, setStatus] = useState("Ready to create a subtle living-art video.");
  const [operationName, setOperationName] = useState("");
  const [model, setModel] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [generatedDownloadUrl, setGeneratedDownloadUrl] = useState("");
  const [generatedFileName, setGeneratedFileName] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");

  const canGenerate = useMemo(() => !!imageSrc && state !== "preparing" && state !== "starting" && state !== "running", [
    imageSrc,
    state,
  ]);
  const canAnalyze = useMemo(() => !!imageSrc && analysisState !== "preparing" && analysisState !== "analyzing", [
    analysisState,
    imageSrc,
  ]);

  useEffect(() => {
    if (!operationName || state !== "running") return;
    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/workbench/ai-motion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", artworkId, operationName, model }),
        });
        const payload = await parseApiJson(response);
        if (cancelled) return;
        if (!response.ok) throw new Error(payload.error || "Could not poll Google AI generation.");
        if (payload.status !== "done") {
          setStatus("Google Veo is still rendering the subtle motion...");
          return;
        }
        window.clearInterval(timer);
        if (!payload.url) {
          throw new Error(payload.warning || "Generation finished but no downloadable video was returned.");
        }
        const playbackUrl = workbenchAssetPlaybackUrl(payload.url || "");
        const downloadUrl = workbenchAssetPlaybackUrl(payload.downloadUrl || payload.url || "");
        setGeneratedUrl(playbackUrl);
        setGeneratedDownloadUrl(downloadUrl);
        setGeneratedFileName(payload.fileName || "google-living-art.mp4");
        setPreviewMode("video");
        setState("done");
        setStatus("Generated video was saved on the server and is ready to preview, download, or attach.");
      } catch (error) {
        window.clearInterval(timer);
        setState("error");
        setStatus(error instanceof Error ? error.message : "Google AI motion failed.");
      }
    }, 6000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [artworkId, model, operationName, state]);

  const analyze = async () => {
    if (!imageSrc) return;
    setAnalysisState("preparing");
    setAnalysisStatus("Preparing artwork image for Gemini vision analysis...");
    try {
      const imageBase64 = await imageToAiInputDataUrl(imageSrc);
      setAnalysisState("analyzing");
      setAnalysisStatus("Gemini is identifying small safe areas to animate...");
      const response = await fetch("/api/workbench/ai-motion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze",
          artworkId,
          imageBase64,
          mimeType: "image/jpeg",
          title,
        }),
      });
      const payload = await parseApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not analyze artwork with Gemini.");
      setPrompt(payload.prompt || "");
      setFocusAreas(Array.isArray(payload.focusAreas) ? payload.focusAreas : []);
      setAnalysisState("done");
      setAnalysisStatus("Creative Veo prompt ready. Review it, tune it, then generate the video.");
    } catch (error) {
      setAnalysisState("error");
      setAnalysisStatus(error instanceof Error ? error.message : "Gemini analysis failed.");
    }
  };

  const generate = async () => {
    if (!imageSrc) return;
    setState("preparing");
    setStatus("Preparing artwork image for Google Veo...");
    try {
      const imageBase64 = await imageToAiInputDataUrl(imageSrc);
      setState("starting");
      setStatus("Starting Google Veo image-to-video generation...");
      const response = await fetch("/api/workbench/ai-motion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          artworkId,
          imageBase64,
          mimeType: "image/jpeg",
          prompt,
          durationSeconds,
          aspectRatio,
        }),
      });
      const payload = await parseApiJson(response);
      if (!response.ok) throw new Error(payload.error || "Could not start Google AI motion.");
      setOperationName(payload.operationName);
      setModel(payload.model);
      setSubmittedPrompt(payload.prompt || prompt);
      setState("running");
      setStatus(payload.message || "Google Veo generation started.");
    } catch (error) {
      setState("error");
      setStatus(error instanceof Error ? error.message : "Google AI motion failed.");
    }
  };

  return (
    <div className="ai-motion-backdrop" role="dialog" aria-modal="true" aria-label="Google Living Art editor">
      <div className="ai-motion-modal">
        <header className="ai-motion-header">
          <div>
            <span>Google Living Art</span>
            <strong>Create a subtle AI video while preserving the artwork</strong>
          </div>
          <button type="button" onClick={onCancel}>Cancel</button>
        </header>

        <section className="ai-motion-preview">
          <div className="ai-motion-viewer">
            <div className="ai-motion-viewer-topbar">
              <span>{previewMode === "video" && generatedUrl ? "Generated video" : "Source artwork"}</span>
              {generatedUrl ? <strong>Saved on server</strong> : <strong>Waiting for Veo output</strong>}
            </div>
            <div className="ai-motion-media-stage">
              {previewMode === "video" && generatedUrl ? (
                <video key={generatedUrl} src={generatedUrl} controls loop playsInline preload="metadata" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSrc} alt="" />
              )}
            </div>
            <div className="ai-motion-view-toggle" aria-label="Preview mode">
              <button
                type="button"
                className={previewMode === "photo" ? "is-active" : ""}
                onClick={() => setPreviewMode("photo")}
              >
                View source photo
              </button>
              <button
                type="button"
                className={previewMode === "video" ? "is-active" : ""}
                onClick={() => setPreviewMode("video")}
                disabled={!generatedUrl}
              >
                View generated video
              </button>
            </div>
          </div>
          <div className="ai-motion-status">
            <span>{title}</span>
            <strong>{status}</strong>
            {operationName ? <small>{operationName}</small> : null}
          </div>
        </section>

        <aside className="ai-motion-controls">
          <div className="ai-motion-analyze">
            <div>
              <span>Gemini prompt builder</span>
              <strong>{analysisStatus}</strong>
            </div>
            <button type="button" onClick={analyze} disabled={!canAnalyze}>
              {analysisState === "analyzing" || analysisState === "preparing" ? "Analyzing..." : "Analyze image"}
            </button>
          </div>
          {focusAreas.length ? (
            <div className="ai-motion-focus">
              {focusAreas.map((area) => (
                <span key={area}>{area}</span>
              ))}
            </div>
          ) : null}
          <label>
            <span>Validated motion prompt</span>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={7} />
          </label>
          {submittedPrompt ? (
            <details className="ai-motion-submitted-prompt" open>
              <summary>Exact prompt sent to Veo</summary>
              <p>{submittedPrompt}</p>
            </details>
          ) : null}
          <label>
            <span>Duration</span>
            <input
              type="range"
              min={4}
              max={8}
              step={1}
              value={durationSeconds}
              onChange={(event) => setDurationSeconds(Number(event.target.value))}
            />
            <strong>{durationSeconds}s</strong>
          </label>
          <label>
            <span>Aspect ratio</span>
            <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
              <option value="16:9">16:9 landscape</option>
              <option value="9:16">9:16 portrait</option>
            </select>
          </label>
          <div className="ai-motion-actions">
            <button type="button" onClick={generate} disabled={!canGenerate}>
              {state === "running" ? "Generating..." : "Generate with Google"}
            </button>
            <button type="button" onClick={() => onGenerated(generatedUrl)} disabled={!generatedUrl}>
              Attach video layer
            </button>
            <a
              className={generatedUrl ? "ai-motion-download" : "ai-motion-download is-disabled"}
              href={generatedDownloadUrl || generatedUrl || undefined}
              download={generatedFileName || "google-living-art.mp4"}
              target="_blank"
              rel="noreferrer"
            >
              Download video
            </a>
          </div>
          <p>
            Gemini proposes an ambitious multi-zone prompt for Veo 3, while the safety wrapper still keeps the original
            artwork recognizable.
          </p>
        </aside>
      </div>
    </div>
  );
}

function workbenchAssetPlaybackUrl(url: string) {
  if (!url.startsWith("/ar/workbench/assets/")) return url;
  return url.replace(/^\/ar\/workbench\/assets\//, "/api/workbench/assets/");
}

function imageToAiInputDataUrl(src: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 896 / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
      canvas.width = Math.max(1, Math.round((image.naturalWidth || image.width) * scale));
      canvas.height = Math.max(1, Math.round((image.naturalHeight || image.height) * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas conversion is not available."));
        return;
      }
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.84));
    };
    image.onerror = () => reject(new Error("Could not load the selected artwork image."));
    image.src = src;
  });
}

async function parseApiJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return {
      error: plain || `Server returned ${response.status} instead of JSON. The image may be too large for the proxy.`,
    };
  }
}
