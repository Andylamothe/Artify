"use client";

import { ARObjectConfig } from "@/types/ar";
import { useMemo, useState } from "react";

interface Props {
  artworkId: string;
  objects?: ARObjectConfig[];
  active: boolean;
  onAction?: (object: ARObjectConfig) => void;
}

export function ARCustomObjects({ artworkId, objects = [], active, onAction }: Props) {
  if (!active || objects.length === 0) return null;

  return (
    <>
      {objects.map((object) => (
        <a-entity
          key={object.id}
          position={`${object.position.x} ${object.position.y} ${object.position.z}`}
          rotation={`${object.rotation.x} ${object.rotation.y} ${object.rotation.z}`}
          scale={`${object.scale.x} ${object.scale.y} ${object.scale.z}`}
          visible={active}
          class={isInteractiveObject(object) ? "ar-clickable" : undefined}
          onClick={isInteractiveObject(object) ? () => onAction?.(object) : undefined}
        >
          <CustomObject artworkId={artworkId} object={object} />
        </a-entity>
      ))}
    </>
  );
}

function CustomObject({ artworkId, object }: { artworkId: string; object: ARObjectConfig }) {
  if (object.type === "portfolio") {
    return <PortfolioObject object={object} />;
  }

  if (object.type === "brush") {
    return (
      <a-entity>
        {(object.brushPoints ?? []).map((point, index) => (
          <a-sphere
            key={`${object.id}-brush-${index}`}
            position={`${point.x - object.position.x} ${point.y - object.position.y} 0.045`}
            radius={object.brushWidth ?? 0.045}
            color={object.color}
            material={`transparent: true; opacity: ${Math.max(0.2, object.opacity - index * 0.004)}`}
            animation={brushAnimationAttribute(object, index)}
          />
        ))}
      </a-entity>
    );
  }

  if (object.type === "text") {
    return (
      <a-text
        value={object.text || object.name}
        color={object.color}
        align="center"
        width={object.width}
        wrap-count="28"
        material={`transparent: true; opacity: ${object.opacity}`}
      />
    );
  }

  if (object.type === "button") {
    return (
      <a-entity>
        <a-plane
          width={object.width}
          height={object.height}
          color={object.color}
          material={`transparent: true; opacity: ${object.opacity}`}
        />
        <a-text
          value={`${object.icon || ""} ${object.text || object.name}`.trim()}
          color="#ffffff"
          align="center"
          width={object.width * 1.75}
          wrap-count="18"
          position="0 0 0.014"
        />
      </a-entity>
    );
  }

  if (object.type === "panel") {
    return (
      <a-entity>
        <a-plane
          width={object.width}
          height={object.height}
          color={object.color}
          material={`transparent: true; opacity: ${object.opacity}`}
        />
        <a-text
          value={object.text || object.name}
          color="#ffffff"
          align="center"
          width={object.width * 1.45}
          wrap-count="22"
          position="0 0 0.014"
        />
      </a-entity>
    );
  }

  if (object.type === "model3d" && object.src) {
    return <a-gltf-model src={object.src} />;
  }

  if (object.type === "video" && object.src) {
    const videoId = `ar-video-${cssSafeId(artworkId)}-${cssSafeId(object.id)}`;
    return (
      <a-video
        src={`#${videoId}`}
        width={object.width}
        height={object.height}
        material={`shader: flat; transparent: true; opacity: ${object.opacity}`}
      />
    );
  }

  if ((object.type === "image" || object.type === "gif") && object.src) {
    return (
      <a-image
        src={workbenchAssetPlaybackUrl(object.src)}
        width={object.width}
        height={object.height}
        material={`transparent: true; opacity: ${object.opacity}`}
      />
    );
  }

  return (
    <a-plane
      width={object.width}
      height={object.height}
      color={object.color}
      material={`transparent: true; opacity: ${object.opacity}`}
    />
  );
}

function PortfolioObject({ object }: { object: ARObjectConfig }) {
  const items = useMemo(() => object.portfolioItems?.filter((item) => item.src) ?? [], [object.portfolioItems]);
  const [currentItem, setCurrentItem] = useState(0);
  const activeIndex = items.length ? ((currentItem % items.length) + items.length) % items.length : 0;
  const activeItem = items[activeIndex];
  const canStep = items.length > 1;

  const step = (direction: -1 | 1) => {
    if (!canStep) return;
    setCurrentItem((current) => (current + direction + items.length) % items.length);
  };

  return (
    <a-entity>
      <a-text
        value={activeItem?.title || object.text || "Portfolio"}
        color="black"
        align="center"
        width="2"
        position="0 0.4 0"
      />
      {activeItem ? (
        <a-image
          key={`${object.id}-portfolio-active-${activeItem.id || activeIndex}`}
          src={workbenchAssetPlaybackUrl(activeItem.src)}
          alpha-test="0.5"
          position="0 0 0"
          height={object.height}
          width={object.width}
          material={`transparent: true; opacity: ${object.opacity}`}
        />
      ) : (
        <a-plane
          width={object.width}
          height={object.height}
          color={object.color}
          material={`transparent: true; opacity: ${object.opacity}`}
        />
      )}
      <a-image
        visible={canStep}
        id={`${object.id}-portfolio-left-button`}
        class="ar-clickable"
        src="#icon-left"
        position={`${-object.width / 2 - 0.2} 0 0.04`}
        height="0.15"
        width="0.15"
        onClick={(event: Event) => {
          event.stopPropagation();
          step(-1);
        }}
      />
      <a-image
        visible={canStep}
        id={`${object.id}-portfolio-right-button`}
        class="ar-clickable"
        src="#icon-right"
        position={`${object.width / 2 + 0.2} 0 0.04`}
        height="0.15"
        width="0.15"
        onClick={(event: Event) => {
          event.stopPropagation();
          step(1);
        }}
      />
    </a-entity>
  );
}

function cssSafeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

function workbenchAssetPlaybackUrl(url: string) {
  if (!url.startsWith("/ar/workbench/assets/")) return url;
  return url.replace(/^\/ar\/workbench\/assets\//, "/api/workbench/assets/");
}

function isInteractiveObject(object: ARObjectConfig) {
  return object.type === "button" || object.type === "panel" || (!!object.actionType && object.actionType !== "none");
}

function brushAnimationAttribute(object: ARObjectConfig, index: number) {
  const speed = Math.max(0.1, Math.min(4, object.brushSpeed ?? 1));
  const delay = Math.round(index * 42 / speed);
  const duration = Math.round(1600 / speed);
  if (object.brushAnimation === "pulse") {
    return `property: scale; from: 0.8 0.8 0.8; to: 1.35 1.35 1.35; dir: alternate; loop: true; dur: ${duration}; delay: ${delay}; easing: easeInOutSine`;
  }
  if (object.brushAnimation === "wave") {
    return `property: scale; from: 0.7 1.15 0.7; to: 1.15 0.7 1.15; dir: alternate; loop: true; dur: ${duration}; delay: ${delay}; easing: easeInOutSine`;
  }
  return `property: material.opacity; from: 0.22; to: ${object.opacity}; dir: alternate; loop: true; dur: ${duration}; delay: ${delay}; easing: easeInOutSine`;
}
