"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

export default function GuestBanner() {
  const { isGuest, isLoggedIn, setAuthModalOpen } = useAuth();
  const show = isGuest && !isLoggedIn;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="shrink-0 flex items-center justify-between gap-3 mx-4 mb-2 px-4 py-3 bg-text text-surface rounded-2xl"
        >
          <p className="text-sm font-medium leading-tight">
            Sign in to like and save artworks
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="shrink-0 px-4 py-1.5 bg-primary text-white rounded-pill text-xs font-semibold"
          >
            Sign in
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
