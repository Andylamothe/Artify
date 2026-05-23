"use client";

import { TrackingStatus } from "@/types/ar";
import { useMemo } from "react";

export function useTrackingStatusLabel(status: TrackingStatus) {
  return useMemo(() => {
    if (status === "starting") return "Starting AR...";
    if (status === "scanning") return "Scanning...";
    if (status === "detected") return "Artwork detected";
    if (status === "lost") return "Target lost";
    if (status === "error") return "AR unavailable";
    return "Ready";
  }, [status]);
}
