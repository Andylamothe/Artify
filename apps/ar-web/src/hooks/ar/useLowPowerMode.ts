"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ar-low-power-mode";

export function useLowPowerMode() {
  const [lowPower, setLowPower] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, lowPower ? "1" : "0");
    } catch {
      // Ignore storage failures.
    }
  }, [lowPower]);

  return { lowPower, setLowPower };
}
