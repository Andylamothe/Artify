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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const currentAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!started) return;
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = "auto";
    }
    const audio = audioRef.current;
    const updateTime = () => setCurrentTime(audio.currentTime || 0);
    const updateDuration = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const markPlaying = () => setIsPlaying(true);
    const markPaused = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("play", markPlaying);
    audio.addEventListener("pause", markPaused);
    audio.addEventListener("ended", markPaused);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("play", markPlaying);
      audio.removeEventListener("pause", markPaused);
      audio.removeEventListener("ended", markPaused);
      audio.pause();
      audio.src = "";
      setIsPlaying(false);
    };
  }, [started]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !started) return;

    if (!activeArtwork || !activeArtwork.audioEnabled || !activeArtwork.audioUrl) {
      audio.pause();
      audio.removeAttribute("src");
      currentAudioUrlRef.current = null;
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

  const play = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setRequiresManualPlay(false);
      setAudioError(null);
    } catch {
      setRequiresManualPlay(true);
      setAudioError("Audio playback blocked. Tap Play audio.");
    }
  };

  const togglePlayback = () => {
    if (audioRef.current?.paused) void play();
    else pause();
  };

  const seekBy = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const safeDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    audio.currentTime = Math.max(0, Math.min(safeDuration || Number.MAX_SAFE_INTEGER, audio.currentTime + seconds));
    setCurrentTime(audio.currentTime);
  };

  const seekToRatio = (ratio: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.duration * ratio));
    setCurrentTime(audio.currentTime);
  };

  const tryPlayManually = async () => {
    await play();
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
    isPlaying,
    currentTime,
    duration,
    togglePlayback,
    seekBy,
    seekToRatio,
    pause,
  };
}
