"use client";
import { useMotionValue, useTransform, useAnimation } from "framer-motion";
import type { PanInfo } from "framer-motion";

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 400;

export function useSwipeCard() {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -20], [1, 0]);
  const controls = useAnimation();

  const getSwipeDirection = (info: PanInfo): "like" | "pass" | null => {
    const absOffset = Math.abs(info.offset.x);
    const absVelocity = Math.abs(info.velocity.x);
    if (absOffset > SWIPE_THRESHOLD || absVelocity > VELOCITY_THRESHOLD) {
      return info.offset.x > 0 ? "like" : "pass";
    }
    return null;
  };

  const snapBack = () => {
    controls.start({ x: 0, rotate: 0, transition: { type: "spring", damping: 20, stiffness: 300 } });
    x.set(0);
  };

  return { x, rotate, likeOpacity, passOpacity, controls, getSwipeDirection, snapBack };
}
