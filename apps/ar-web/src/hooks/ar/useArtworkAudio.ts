"use client";

import { ArtworkConfig } from "@/types/ar";
import { useEffect, useRef, useState } from "react";

interface UseArtworkAudioArgs {
  started: boolean;
  activeArtwork: ArtworkConfig | null;
  shouldPlay: boolean;
}

export function useArtworkAudio({ started, activeArtwork, shouldPlay }: UseArtworkAudioArgs) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [requiresManualPlay, setRequiresManualPlay] = useState(false);
  const currentAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!started) return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, [started]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !started) return;

    if (!activeArtwork) {
      audio.pause();
      return;
    }

    if (currentAudioUrlRef.current !== activeArtwork.audioUrl) {
      audio.pause();
      audio.src = activeArtwork.audioUrl;
      currentAudioUrlRef.current = activeArtwork.audioUrl;
      setAudioError(null);
    }

    audio.muted = muted;
    if (!shouldPlay || muted) {
      audio.pause();
      return;
    }

    const playPromise = audio.play();
    if (playPromise) {
      playPromise
        .then(() => setRequiresManualPlay(false))
        .catch(() => {
          setRequiresManualPlay(true);
          setAudioError("Audio playback blocked. Tap Play audio.");
        });
    }
  }, [activeArtwork, muted, shouldPlay, started]);

  const pause = () => {
    audioRef.current?.pause();
  };

  const tryPlayManually = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setRequiresManualPlay(false);
      setAudioError(null);
    } catch {
      setAudioError("Audio unavailable on this device.");
    }
  };

  const toggleMuted = () => {
    setMuted((prev) => !prev);
  };

  return {
    muted,
    toggleMuted,
    audioError,
    requiresManualPlay,
    tryPlayManually,
    pause,
  };
}
