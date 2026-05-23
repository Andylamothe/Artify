import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "a-scene": Record<string, unknown>;
      "a-assets": Record<string, unknown>;
      "a-entity": Record<string, unknown>;
      "a-camera": Record<string, unknown>;
      "a-ring": Record<string, unknown>;
      "a-plane": Record<string, unknown>;
      "a-sphere": Record<string, unknown>;
      "a-circle": Record<string, unknown>;
      "a-box": Record<string, unknown>;
      "a-text": Record<string, unknown>;
      "a-image": Record<string, unknown>;
      "a-video": Record<string, unknown>;
      "a-gltf-model": Record<string, unknown>;
    }
  }
}
