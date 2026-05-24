"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_BASE } from "@/lib/api";
import type { Artwork } from "@/lib/types";

type EditableArtwork = Omit<Artwork, "categories"> & {
  categories: string[] | string;
};

const emptyArtwork: EditableArtwork = {
  id: "",
  title: "",
  artistName: "",
  artistId: "admin-created",
  medium: "",
  year: new Date().getFullYear(),
  dimensions: "",
  museum: "",
  location: "",
  categories: "",
  galleryLocation: {
    floor: 1,
    section: "Main Hall",
    piece: "A",
  },
  imageUrl: "",
  isHidden: false,
  has3D: false,
  arWebId: "",
  description: "",
  likes: 0,
  dislikes: 0,
  likedBy: [],
  dislikedBy: [],
  savedBy: [],
  createdAt: new Date().toISOString(),
};

function asEditable(artwork: Artwork): EditableArtwork {
  return {
    ...artwork,
    categories: artwork.categories.join(", "),
  };
}

export default function AdminPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableArtwork>(emptyArtwork);
  const [status, setStatus] = useState("Loading artworks...");
  const [query, setQuery] = useState("");
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const selectedArtwork = useMemo(
    () => artworks.find((artwork) => artwork.id === selectedId) ?? null,
    [artworks, selectedId],
  );
  const arLinked = Boolean(draft.arWebId);

  const filteredArtworks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return artworks.filter((artwork) => {
      if (showHiddenOnly && !artwork.isHidden) return false;
      if (!needle) return true;
      return [artwork.title, artwork.artistName, artwork.location, artwork.museum, artwork.id]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(needle));
    });
  }, [artworks, query, showHiddenOnly]);

  useEffect(() => {
    fetch(`${APP_BASE}/api/admin/artworks`, { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { artworks?: Artwork[] }) => {
        const next = data.artworks ?? [];
        setArtworks(next);
        if (next[0]) {
          setSelectedId(next[0].id);
          setDraft(asEditable(next[0]));
        }
        setStatus(`${next.length} artworks loaded`);
      })
      .catch((error) => setStatus(`Could not load artworks: ${error instanceof Error ? error.message : "Unknown error"}`));
  }, []);

  const updateDraft = <K extends keyof EditableArtwork>(key: K, value: EditableArtwork[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveDraft = async () => {
    setStatus("Saving...");
    const response = await fetch(`${APP_BASE}/api/admin/artworks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error ?? "Save failed");
      return;
    }
    setArtworks(data.artworks ?? []);
    setSelectedId(data.artwork?.id ?? draft.id);
    setStatus(`Saved ${data.artwork?.title ?? draft.title}`);
  };

  const uploadImage = async (file: File | null) => {
    if (!file) return;
    setIsUploading(true);
    setStatus("Uploading image...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${APP_BASE}/api/admin/uploads`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus(data.error ?? "Upload failed");
        return;
      }
      updateDraft("imageUrl", data.imageUrl);
      setStatus("Image uploaded. Save the artwork to keep it.");
    } catch (error) {
      setStatus(`Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const createArtwork = () => {
    const next = { ...emptyArtwork, createdAt: new Date().toISOString() };
    setSelectedId(null);
    setDraft(next);
    setStatus("Creating a new artwork");
  };

  const duplicateArtwork = async (id: string) => {
    setStatus("Duplicating...");
    const response = await fetch(`${APP_BASE}/api/admin/artworks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ duplicateFromId: id }),
    });
    const data = await response.json();
    setArtworks(data.artworks ?? artworks);
    setSelectedId(data.artwork?.id ?? id);
    if (data.artwork) setDraft(asEditable(data.artwork));
    setStatus(data.artwork ? `Duplicated ${data.artwork.title}` : "Duplicate failed");
  };

  const deleteArtwork = async (id: string) => {
    if (!window.confirm("Delete this artwork from Social Hub?")) return;
    setStatus("Deleting...");
    const response = await fetch(`${APP_BASE}/api/admin/artworks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deleteId: id }),
    });
    const data = await response.json();
    const next = data.artworks ?? [];
    setArtworks(next);
    setSelectedId(next[0]?.id ?? null);
    setDraft(next[0] ? asEditable(next[0]) : emptyArtwork);
    setStatus("Artwork deleted");
  };

  const toggleHidden = async (artwork: Artwork) => {
    const next = { ...artwork, isHidden: !artwork.isHidden };
    setStatus(next.isHidden ? "Hiding artwork..." : "Publishing artwork...");
    const response = await fetch(`${APP_BASE}/api/admin/artworks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await response.json();
    setArtworks(data.artworks ?? artworks);
    setDraft(asEditable(next));
    setStatus(next.isHidden ? `${next.title} hidden` : `${next.title} published`);
  };

  return (
    <main className="min-h-dvh bg-[#F1E2D1] text-text">
      <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-4 py-4 lg:px-6">
        <header className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted">No-login admin</p>
            <h1 className="mt-1 text-3xl font-black text-primary" style={{ fontFamily: "var(--font-serif)" }}>
              Social Artwork Manager
            </h1>
            <p className="mt-1 text-sm text-muted">{status}</p>
          </div>
          <button
            type="button"
            onClick={createArtwork}
            className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-white active:scale-[0.98]"
          >
            New Artwork
          </button>
        </header>

        <div className="grid flex-1 gap-4 py-4 lg:grid-cols-[minmax(320px,0.9fr)_minmax(520px,1.35fr)]">
          <section className="min-h-0 rounded-2xl border border-border bg-[#F8EBDD] p-3 shadow-sm">
            <div className="flex gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search title, artist, location..."
                className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowHiddenOnly((value) => !value)}
                className={`rounded-full px-4 py-2.5 text-sm font-bold ${showHiddenOnly ? "bg-primary text-white" : "border border-border text-primary"}`}
              >
                Hidden
              </button>
            </div>

            <div className="mt-3 max-h-[62dvh] space-y-2 overflow-y-auto pr-1">
              {filteredArtworks.map((artwork) => (
                <button
                  key={artwork.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(artwork.id);
                    setDraft(asEditable(artwork));
                  }}
                  className={`flex w-full gap-3 rounded-xl border p-2 text-left transition ${selectedId === artwork.id ? "border-primary bg-background" : "border-border bg-[#FFF7ED]"}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={artwork.imageUrl} alt="" className="h-16 w-13 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-primary">{artwork.title}</span>
                    <span className="block truncate text-xs text-muted">{artwork.artistName}</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">
                        Floor {artwork.galleryLocation?.floor ?? 1}
                      </span>
                      {artwork.isHidden ? (
                        <span className="rounded-full bg-[#2A160B] px-2 py-0.5 text-[10px] font-bold text-white">Hidden</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-[#F8EBDD] p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[180px_1fr]">
              <div>
                <div className="overflow-hidden rounded-2xl border border-border bg-background">
                  {draft.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.imageUrl} alt="" className="h-60 w-full object-cover" />
                  ) : (
                    <div className="flex h-60 items-center justify-center text-sm text-muted">No image</div>
                  )}
                </div>
                <label className="mt-3 flex cursor-pointer items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold text-primary active:scale-[0.98]">
                  {isUploading ? "Uploading..." : "Upload Photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={isUploading}
                    onChange={(event) => void uploadImage(event.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>
                <div className="mt-3 grid gap-2">
                  <button type="button" onClick={() => saveDraft()} className="rounded-full bg-primary px-4 py-3 text-sm font-bold text-white">
                    Save Changes
                  </button>
                  {draft.id ? (
                    <>
                      <button type="button" onClick={() => selectedArtwork && toggleHidden(selectedArtwork)} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold text-primary">
                        {draft.isHidden ? "Publish" : "Hide"}
                      </button>
                      <button type="button" onClick={() => duplicateArtwork(draft.id)} className="rounded-full border border-border px-4 py-2.5 text-sm font-bold text-primary">
                        Duplicate
                      </button>
                      <button type="button" onClick={() => deleteArtwork(draft.id)} className="rounded-full border border-[#9D1B32] px-4 py-2.5 text-sm font-bold text-[#9D1B32]">
                        Delete
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); void saveDraft(); }}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Title" value={draft.title} onChange={(value) => updateDraft("title", value)} />
                  <Field label="Artist" value={draft.artistName} onChange={(value) => updateDraft("artistName", value)} />
                  <Field label="Image URL" value={draft.imageUrl} onChange={(value) => updateDraft("imageUrl", value)} span />
                  <Field label="Medium" value={draft.medium} onChange={(value) => updateDraft("medium", value)} />
                  <Field label="Year" type="number" value={String(draft.year)} onChange={(value) => updateDraft("year", Number(value))} />
                  <Field label="Museum" value={draft.museum ?? ""} onChange={(value) => updateDraft("museum", value)} />
                  <Field label="City / Location" value={draft.location ?? ""} onChange={(value) => updateDraft("location", value)} />
                  <Field label="Categories" value={String(draft.categories)} onChange={(value) => updateDraft("categories", value)} span />
                </div>

                <div className="grid gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-3">
                  <Field
                    label="Floor"
                    type="number"
                    value={String(draft.galleryLocation?.floor ?? 1)}
                    onChange={(value) => updateDraft("galleryLocation", { ...(draft.galleryLocation ?? { section: "", piece: "" }), floor: Number(value) })}
                  />
                  <Field
                    label="Room / Wing"
                    value={draft.galleryLocation?.section ?? ""}
                    onChange={(value) => updateDraft("galleryLocation", { ...(draft.galleryLocation ?? { floor: 1, piece: "" }), section: value })}
                  />
                  <Field
                    label="Piece code"
                    value={draft.galleryLocation?.piece ?? ""}
                    onChange={(value) => updateDraft("galleryLocation", { ...(draft.galleryLocation ?? { floor: 1, section: "" }), piece: value })}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <Field label="Artist ID" value={draft.artistId} onChange={(value) => updateDraft("artistId", value)} />
                  <Toggle
                    label="Connecter au AR"
                    checked={arLinked}
                    onChange={(checked) => {
                      updateDraft("arWebId", checked ? draft.id || "" : "");
                      updateDraft("has3D", checked);
                    }}
                  />
                  <Toggle label="Hidden" checked={Boolean(draft.isHidden)} onChange={(checked) => updateDraft("isHidden", checked)} />
                </div>
                {arLinked ? (
                  <div className="grid gap-3 rounded-xl border border-border bg-background p-3 md:grid-cols-[1fr_auto]">
                    <Field label="AR artwork id" value={draft.arWebId ?? ""} onChange={(value) => updateDraft("arWebId", value)} />
                    <Toggle label="3D" checked={draft.has3D} onChange={(checked) => updateDraft("has3D", checked)} />
                  </div>
                ) : (
                  <p className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-muted">
                    This artwork is Social-only. It will not require any change in ar-web.
                  </p>
                )}

                <label className="grid gap-1 text-sm font-bold text-primary">
                  Description
                  <textarea
                    value={draft.description ?? ""}
                    onChange={(event) => updateDraft("description", event.target.value)}
                    rows={5}
                    className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-text outline-none focus:border-primary"
                  />
                </label>
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  span = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  span?: boolean;
}) {
  return (
    <label className={`grid gap-1 text-sm font-bold text-primary ${span ? "md:col-span-2" : ""}`}>
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-text outline-none focus:border-primary"
      />
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-primary">
      {label}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
