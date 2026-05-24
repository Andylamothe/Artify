import { createStarryNightExperience, StarryNightExperience } from "./createStarryNightExperience";

type ThreeModule = typeof import("three");

declare global {
  interface Window {
    AFRAME?: {
      THREE?: ThreeModule;
      components?: Record<string, unknown>;
      registerComponent?: (
        name: string,
        definition: {
          schema: Record<string, { type: string; default: boolean | number }>;
          init: (this: StarryNightComponent) => void;
          update: (this: StarryNightComponent) => void;
          remove: (this: StarryNightComponent) => void;
        },
      ) => void;
    };
  }
}

interface StarryNightComponent {
  el: {
    object3D: import("three").Object3D;
  };
  data: {
    active: boolean;
    lowPower: boolean;
    targetAspect: number;
  };
  experience?: StarryNightExperience;
}

export function registerStarryNightExperience() {
  if (typeof window === "undefined") return false;
  const aframe = window.AFRAME;
  if (!aframe?.registerComponent || !aframe.THREE) return false;
  if (aframe.components?.["starry-night-experience"]) return true;

  aframe.registerComponent("starry-night-experience", {
    schema: {
      active: { type: "boolean", default: true },
      lowPower: { type: "boolean", default: false },
      targetAspect: { type: "number", default: 4 / 3 },
    },

    init(this: StarryNightComponent) {
      this.experience = undefined;
      mountExperience(this);
    },

    update(this: StarryNightComponent) {
      this.experience?.dispose();
      this.experience = undefined;
      mountExperience(this);
    },

    remove(this: StarryNightComponent) {
      this.experience?.dispose();
      this.experience = undefined;
    },
  });

  return true;
}

function mountExperience(component: StarryNightComponent) {
  const three = window.AFRAME?.THREE;
  if (!three || !component.data.active) return;

  component.experience = createStarryNightExperience({
    three,
    targetObject: component.el.object3D,
    lowPower: component.data.lowPower,
    targetAspect: component.data.targetAspect,
  });
}
