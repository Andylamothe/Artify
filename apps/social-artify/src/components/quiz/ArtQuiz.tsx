"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useFeedStore } from "@/store/feedStore";
import { APP_BASE } from "@/lib/api";
import { ART_PROFILE_META } from "@/lib/artProfile";
import type { ArtProfile } from "@/lib/types";

const QUESTIONS: {
  text: string;
  choices: { label: string; text: string; profile: ArtProfile }[];
}[] = [
  {
    text: "What usually pulls you into an artwork first?",
    choices: [
      { label: "A", text: "Technique, balance, and timeless beauty", profile: "renaissance" },
      { label: "B", text: "Emotion, movement, and visible brushwork", profile: "modern" },
      { label: "C", text: "Color, rhythm, shape, and atmosphere", profile: "abstract" },
      { label: "D", text: "Mystery, dreams, and unexpected symbols", profile: "surreal" },
    ],
  },
  {
    text: "Which gallery would you enter first?",
    choices: [
      { label: "A", text: "A classical room with portraits and golden frames", profile: "renaissance" },
      { label: "B", text: "A vivid room full of expressive, energetic canvases", profile: "modern" },
      { label: "C", text: "A quiet space of large colors and clean forms", profile: "abstract" },
      { label: "D", text: "A strange room where every piece feels like a dream", profile: "surreal" },
    ],
  },
  {
    text: "What do you want Artify to recommend more often?",
    choices: [
      { label: "A", text: "Masterpieces with history and craft", profile: "renaissance" },
      { label: "B", text: "Works that feel intense, human, and alive", profile: "modern" },
      { label: "C", text: "Pieces that let me interpret freely", profile: "abstract" },
      { label: "D", text: "Art that surprises me and changes the mood", profile: "surreal" },
    ],
  },
];

function getWinningProfile(answers: ArtProfile[]): ArtProfile {
  const scores: Record<ArtProfile, number> = {
    renaissance: 0,
    modern: 0,
    abstract: 0,
    surreal: 0,
  };
  answers.forEach((answer) => {
    scores[answer] += 1;
  });
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0] as ArtProfile;
}

export default function ArtQuiz() {
  const showQuiz = useAuthStore((s) => s.showQuiz);
  const user = useAuthStore((s) => s.user);
  const setShowQuiz = useAuthStore((s) => s.setShowQuiz);
  const setUser = useAuthStore((s) => s.setUser);
  const setUserProfile = useAuthStore((s) => s.setUserProfile);
  const setCategory = useFeedStore((s) => s.setCategory);

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<ArtProfile[]>([]);
  const [selected, setSelected] = useState<ArtProfile | null>(null);
  const [result, setResult] = useState<ArtProfile | null>(null);
  const [saving, setSaving] = useState(false);

  if (!showQuiz) return null;

  const question = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const progress = ((step + (selected ? 1 : 0)) / QUESTIONS.length) * 100;

  const handleNext = () => {
    if (!selected) return;
    const nextAnswers = [...answers, selected];
    if (!isLast) {
      setAnswers(nextAnswers);
      setSelected(null);
      setStep((current) => current + 1);
      return;
    }
    setResult(getWinningProfile(nextAnswers));
  };

  const handleFinish = async () => {
    if (!result) return;
    setSaving(true);
    setUserProfile(result);
    setCategory("All");
    try {
      if (user) {
        const res = await fetch(`${APP_BASE}/api/auth/profile`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ artProfile: result }),
        });
        const data = await res.json();
        if (res.ok && data.user) setUser(data.user);
      }
    } finally {
      setSaving(false);
      setShowQuiz(false);
      setStep(0);
      setAnswers([]);
      setSelected(null);
      setResult(null);
    }
  };

  if (result) {
    const meta = ART_PROFILE_META[result];
    return (
      <motion.div
        className="fixed inset-0 z-[70] flex items-center justify-center px-6"
        style={{ backgroundColor: "#F1E2D1" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="flex w-full max-w-sm flex-col items-center text-center"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-[#F3E1E8]">
            <span className="material-icons text-primary" style={{ fontSize: "2.5rem" }}>
              {meta.icon}
            </span>
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Your art profile
          </p>
          <h1 className="mb-3 text-4xl font-bold text-text" style={{ fontFamily: "var(--font-serif)" }}>
            {meta.name}
          </h1>
          <p className="mb-9 text-sm leading-relaxed text-muted">{meta.description}</p>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-4 text-base font-semibold text-white transition-transform active:scale-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Show my recommendations"}
            <span className="material-icons" style={{ fontSize: "18px" }}>
              arrow_forward
            </span>
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      <div className="h-1 bg-border">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex h-14 shrink-0 items-center justify-between px-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">
          Question {step + 1} / {QUESTIONS.length}
        </p>
        <p className="text-sm font-bold text-text" style={{ fontFamily: "var(--font-serif)" }}>
          Artify<span className="text-primary">.</span>
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ x: 32, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -32, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-5"
          >
            <h2 className="mb-2 text-2xl font-bold leading-snug text-text" style={{ fontFamily: "var(--font-serif)" }}>
              {question.text}
            </h2>
            <div className="flex flex-col gap-3">
              {question.choices.map((choice) => {
                const isActive = selected === choice.profile;
                return (
                  <button
                    key={`${step}-${choice.label}`}
                    onClick={() => setSelected(choice.profile)}
                    className="flex items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all active:scale-[0.98]"
                    style={{
                      borderColor: isActive ? "#810B38" : "#C2A07A",
                      backgroundColor: isActive ? "#F3E1E8" : "transparent",
                    }}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        backgroundColor: isActive ? "#810B38" : "#DCC3AA",
                        color: isActive ? "#FFFFFF" : "#6B4A36",
                      }}
                    >
                      {choice.label}
                    </span>
                    <span className="text-sm font-medium leading-snug text-text">{choice.text}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className="mx-auto w-full max-w-lg shrink-0 px-5 pb-10"
        style={{ paddingBottom: "max(40px, calc(env(safe-area-inset-bottom, 0px) + 24px))" }}
      >
        <button
          onClick={handleNext}
          disabled={!selected}
          className="w-full rounded-full py-4 text-base font-semibold transition-all active:scale-95 disabled:opacity-70"
          style={{
            backgroundColor: selected ? "#810B38" : "#DCC3AA",
            color: selected ? "#FFFFFF" : "#6B4A36",
          }}
        >
          {isLast ? "See my profile" : "Continue"}
        </button>
      </div>
    </div>
  );
}
