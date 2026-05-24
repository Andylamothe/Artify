"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { ART_PROFILE_META } from "@/lib/artProfile";
import BottomNav from "@/components/layout/BottomNav";
import AuthModal from "@/components/auth/AuthModal";

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoggedIn, isGuest, logout, openAuthModal } = useAuth();
  const guestArtProfile = useAuthStore((s) => s.guestArtProfile);
  const setShowQuiz = useAuthStore((s) => s.setShowQuiz);
  const profile = user?.artProfile ?? guestArtProfile ?? null;

  useEffect(() => {
    if (!isLoggedIn && !isGuest) router.push("/onboarding");
  }, [isLoggedIn, isGuest, router]);

  return (
    <div className="flex min-h-dvh flex-col bg-background lg:pl-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-5">
        <span className="text-xl font-bold text-text lg:hidden" style={{ fontFamily: "var(--font-serif)" }}>
          Artify<span className="text-primary">.</span>
        </span>
        <span className="hidden text-sm font-semibold uppercase tracking-widest text-muted lg:block">
          Profile
        </span>
        <div />
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-5 pb-32 pt-10">
        {user ? (
          <>
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="mb-1 text-2xl font-bold text-text" style={{ fontFamily: "var(--font-serif)" }}>
                {user.name}
              </h1>
              <p className="mb-3 text-sm text-muted">{user.email}</p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3E1E8] px-3 py-1 text-xs font-semibold text-primary">
                <span className="material-icons" style={{ fontSize: "14px" }}>
                  {user.role === "artist" ? "draw" : "palette"}
                </span>
                {user.role === "artist" ? "Artist" : "Art Lover"}
              </span>
            </div>

            {profile ? (
              <div className="mb-6 flex items-center justify-between rounded-2xl bg-surface px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F3E1E8]">
                    <span className="material-icons text-primary" style={{ fontSize: "18px" }}>
                      {ART_PROFILE_META[profile].icon}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Art profile
                    </p>
                    <p className="text-sm font-bold text-text" style={{ fontFamily: "var(--font-serif)" }}>
                      {ART_PROFILE_META[profile].name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowQuiz(true)}
                  className="text-xs font-semibold text-primary underline underline-offset-2 active:opacity-70"
                >
                  Retake
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowQuiz(true)}
                className="mb-6 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-3.5 text-sm font-medium text-muted transition-transform active:scale-95"
              >
                <span className="material-icons" style={{ fontSize: "18px" }}>
                  quiz
                </span>
                Discover my art profile
              </button>
            )}

            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-border py-4 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary active:scale-95"
            >
              <span className="material-icons" style={{ fontSize: "18px" }}>
                logout
              </span>
              Log out
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center pt-12 text-center">
            <span className="material-icons mb-4 text-border" style={{ fontSize: "4.5rem" }}>
              account_circle
            </span>
            <h1 className="mb-2 text-2xl font-bold text-text" style={{ fontFamily: "var(--font-serif)" }}>
              You are browsing as a guest
            </h1>
            <p className="mb-8 max-w-xs text-sm leading-relaxed text-muted">
              Create an account to keep your profile, likes, and saved artworks.
            </p>
            <button
              onClick={() => openAuthModal("register")}
              className="mb-3 flex w-full items-center justify-center rounded-full bg-primary py-4 text-base font-semibold text-white active:scale-95"
            >
              Get started
            </button>
            <button
              onClick={() => setShowQuiz(true)}
              className="flex w-full items-center justify-center rounded-full border border-border py-3.5 text-sm font-medium text-muted active:scale-95"
            >
              Retake taste quiz
            </button>
          </div>
        )}
      </main>

      <div className="h-24 shrink-0 lg:hidden" />
      <BottomNav />
      <AuthModal />
    </div>
  );
}
