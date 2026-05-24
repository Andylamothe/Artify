"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useLike } from "@/hooks/useLike";

export default function AuthModal() {
  const { authModalOpen, setAuthModalOpen, login, register, pendingAction, setPendingAction } = useAuth();
  const authModalTab = useAuthStore((s) => s.authModalTab);
  const [tab, setTab] = useState<"login" | "register">(authModalTab);

  useEffect(() => {
    if (authModalOpen) {
      queueMicrotask(() => setTab(authModalTab));
    }
  }, [authModalOpen, authModalTab]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"viewer" | "artist">("viewer");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const pendingArtworkId = pendingAction?.artworkId ?? "";
  const { toggle: replayLike } = useLike(pendingArtworkId);

  const close = () => {
    setAuthModalOpen(false);
    setPendingAction(null);
    setError("");
    setPassword("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      if (pendingAction?.type === "like" && pendingAction.artworkId) replayLike();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, role);
      if (pendingAction?.type === "like" && pendingAction.artworkId) replayLike();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full px-4 py-3 rounded-xl border border-border bg-background text-text text-sm outline-none focus:border-primary transition-colors";

  return (
    <AnimatePresence>
      {authModalOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-3xl px-6 pt-5 pb-10"
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 32px)" }}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />

            {/* Tabs */}
            <div className="flex gap-1 bg-background rounded-xl p-1 mb-6">
              {(["login", "register"] as const).map((t) => (
                <button key={t} onClick={() => { setTab(t); setError(""); }}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                  style={{ backgroundColor: tab === t ? "#1A1A1A" : "transparent", color: tab === t ? "#FFFFFF" : "#6B4A36" }}>
                  {t === "login" ? "Log in" : "Sign up"}
                </button>
              ))}
            </div>

            {tab === "login" ? (
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <input type="email" placeholder="Email address" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputCls} required autoFocus />
                <input type="password" placeholder="Password" value={password}
                  onChange={(e) => setPassword(e.target.value)} className={inputCls} required />
                {error && <p className="text-primary text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-text text-surface rounded-full font-semibold text-sm mt-1 disabled:opacity-50">
                  {loading ? "Signing in…" : "Log in"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <input type="text" placeholder="Your name" value={name}
                  onChange={(e) => setName(e.target.value)} className={inputCls} required autoFocus />
                <input type="email" placeholder="Email address" value={email}
                  onChange={(e) => setEmail(e.target.value)} className={inputCls} required />
                <input type="password" placeholder="Password" value={password}
                  onChange={(e) => setPassword(e.target.value)} className={inputCls} required />
                <div className="flex gap-2 mt-1">
                  {(["viewer", "artist"] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className="flex-1 py-3 rounded-xl border-2 text-sm font-medium capitalize transition-colors"
                      style={{ borderColor: role === r ? "#810B38" : "#C2A07A", color: role === r ? "#810B38" : "#6B4A36", backgroundColor: role === r ? "#F3E1E8" : "transparent" }}>
                      <span className="flex items-center justify-center gap-1.5">
                        <span className="material-icons" style={{ fontSize: "16px", lineHeight: 1 }}>
                          {r === "viewer" ? "palette" : "draw"}
                        </span>
                        {r === "viewer" ? "Art Lover" : "Artist"}
                      </span>
                    </button>
                  ))}
                </div>
                {error && <p className="text-primary text-xs">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-primary text-white rounded-full font-semibold text-sm mt-1 disabled:opacity-50">
                  {loading ? "Creating account…" : "Create account"}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
