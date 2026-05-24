"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/discover",
    label: "Discover",
    match: (p: string) => p === "/discover" || p.startsWith("/artwork"),
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#810B38" : "#6B4A36"} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/profile",
    label: "You",
    match: (p: string) => p === "/profile",
    icon: (active: boolean) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#810B38" : "#6B4A36"} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Mobile : pill flottant (inchangé) — caché sur desktop ── */}
      <nav
        className="lg:hidden fixed z-40 left-1/2 -translate-x-1/2"
        style={{
          bottom: "max(20px, calc(env(safe-area-inset-bottom, 0px) + 16px))",
        }}
      >
        <div
          className="flex items-center rounded-full border border-border shadow-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--color-surface)",
            boxShadow: "0 8px 32px rgba(18, 10, 4, 0.35), 0 2px 8px rgba(18, 10, 4, 0.2)",
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.match(pathname);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="flex flex-col items-center gap-1 px-7 py-3 min-w-[72px] transition-colors"
                style={{
                  borderRight: tab.label !== "You" ? "1px solid var(--color-border)" : undefined,
                }}
              >
                {tab.icon(isActive)}
                <span
                  className="text-[9px] font-semibold uppercase tracking-widest leading-none"
                  style={{ color: isActive ? "#810B38" : "#6B4A36" }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Desktop : sidebar gauche fixe — cachée sur mobile ── */}
      <nav
        className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-[200px] z-40 border-r border-border shrink-0"
        style={{ backgroundColor: "var(--color-surface)" }}
      >
        {/* Logo */}
        <div className="px-6 pt-8 pb-6">
          <span
            className="text-xl font-bold text-text"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Artify<span className="text-primary">.</span>
          </span>
        </div>

        {/* Séparateur */}
        <div className="h-px bg-border mx-4 mb-4" />

        {/* Nav links verticaux */}
        <div className="flex flex-col gap-1 px-3">
          {tabs.map((tab) => {
            const isActive = tab.match(pathname);
            return (
              <Link
                key={tab.label}
                href={tab.href}
                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--color-background)" : "transparent",
                }}
              >
                {tab.icon(isActive)}
                <span
                  className="text-sm font-semibold tracking-wide"
                  style={{ color: isActive ? "#810B38" : "#6B4A36" }}
                >
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
