"use client";

interface TopBarProps {
  onFilterClick?: () => void;
  pageTitle?: string;
}

export default function TopBar({ onFilterClick, pageTitle = "Discover" }: TopBarProps) {
  return (
    <header className="flex items-center justify-between h-14 px-5 bg-background shrink-0">
      {/* Logo — mobile seulement (la sidebar desktop l'affiche) */}
      <span
        className="text-xl font-bold text-text lg:hidden"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        Artify
        <span className="text-primary">.</span>
      </span>

      {/* Titre de page — desktop seulement */}
      <span className="hidden lg:block text-sm font-semibold uppercase tracking-widest text-muted">
        {pageTitle}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted text-sm font-medium hover:bg-border transition-colors"
          aria-label="Help"
        >
          ?
        </button>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-muted hover:bg-border transition-colors"
          aria-label="Filter"
          onClick={onFilterClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="6" x2="20" y2="6" />
            <circle cx="8" cy="6" r="2" fill="currentColor" stroke="none" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <circle cx="16" cy="12" r="2" fill="currentColor" stroke="none" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>
    </header>
  );
}
