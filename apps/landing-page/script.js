const root = document.querySelector("[data-landing]");
const introScene = document.querySelector("[data-intro]");
const enterButton = document.querySelector("[data-enter]");
const camera = document.querySelector("[data-camera]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 900px)").matches;

document.body.classList.add("is-locked");

if (root && introScene && enterButton && window.gsap && !reduceMotion) {
  const gsap = window.gsap;
  let hasEntered = false;

  gsap.set(camera, {
    scale: isMobile ? 1.04 : 1.16,
    opacity: isMobile ? 0.6 : 0.25,
    filter: isMobile ? "blur(4px)" : "blur(10px)",
  });
  gsap.set(".ambient-left", { xPercent: isMobile ? 0 : -9, opacity: isMobile ? 0 : 0.3 });
  gsap.set(".ambient-right", { xPercent: isMobile ? 0 : 9, opacity: isMobile ? 0 : 0.3 });
  gsap.set(".path", isMobile
    ? { y: 34, opacity: 0, scale: 0.96, clipPath: "inset(0% 0% 0% 0%)" }
    : { clipPath: "inset(13% 9% 13% 9%)" });
  gsap.set(".center", { y: isMobile ? 18 : 0, scale: isMobile ? 0.98 : 0.92, opacity: 0 });
  gsap.set(".topbar", { opacity: 0 });
  gsap.set(".line", { yPercent: 112 });
  gsap.set(".intro", { y: 18, opacity: 0 });
  gsap.set(".float-photo", { scale: 0.84, opacity: 0, rotate: -4 });
  gsap.set(".split-line", { scaleY: 0 });

  const idle = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
  idle
    .to(".intro-art", { scale: 1.48, duration: 3.2 }, 0)
    .to(".enter-button", { y: -5, duration: 1.8 }, 0);

  gsap.from(".intro-copy span", { y: 16, opacity: 0, duration: 0.65, ease: "power3.out" });
  gsap.from(".intro-copy strong", {
    yPercent: 34,
    opacity: 0,
    duration: 0.9,
    delay: 0.12,
    ease: "power3.out",
  });
  gsap.from(".enter-button", {
    y: 14,
    opacity: 0,
    duration: 0.65,
    delay: 0.42,
    ease: "power3.out",
  });

  const startExperience = () => {
    if (hasEntered) return;
    hasEntered = true;
    enterButton.disabled = true;
    idle.kill();

    const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (isMobile) {
      timeline
        .to(".enter-button", { scale: 0.94, opacity: 0, duration: 0.24 })
        .to(".intro-art", { scale: 1.12, yPercent: -4, duration: 1.05, ease: "power2.inOut" }, "-=0.02")
        .to(".intro-copy", { y: -18, opacity: 0, duration: 0.46 }, "-=0.62")
        .to(camera, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.72 }, "-=0.34")
        .to(introScene, { opacity: 0, duration: 0.5, ease: "power2.inOut" }, "-=0.34")
        .set(introScene, { display: "none" })
        .to(".topbar", { opacity: 1, duration: 0.38 }, "-=0.2")
        .to(".center", { y: 0, scale: 1, opacity: 1, duration: 0.58 }, "-=0.18")
        .to(".line", { yPercent: 0, duration: 0.62, stagger: 0.06 }, "-=0.44")
        .to(".intro", { y: 0, opacity: 1, duration: 0.42 }, "-=0.25")
        .to(".path", {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.54,
          stagger: 0.08,
          ease: "back.out(1.18)",
        }, "-=0.18")
        .add(() => document.body.classList.remove("is-locked"));
      return;
    }

    timeline
      .to(".enter-button", { scale: 0.94, opacity: 0, duration: 0.28 })
      .to(".intro-art", { scale: 1.06, duration: 1.45, ease: "power2.inOut" }, "-=0.05")
      .to(".intro-copy", { y: -28, opacity: 0, duration: 0.62 }, "-=0.76")
      .to(camera, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.18 }, "-=0.42")
      .to(".ambient-left", { xPercent: 0, opacity: 0.86, duration: 1.08 }, "-=1.02")
      .to(".ambient-right", { xPercent: 0, opacity: 0.86, duration: 1.08 }, "-=1.08")
      .to(introScene, { opacity: 0, duration: 0.68, ease: "power2.inOut" }, "-=0.54")
      .set(introScene, { display: "none" })
      .to(".topbar", { opacity: 1, duration: 0.56 }, "-=0.34")
      .to(".path", { clipPath: "inset(0% 0% 0% 0%)", duration: 0.92, stagger: 0.07 }, "-=0.5")
      .to(".center", { scale: 1, opacity: 1, duration: 0.85 }, "-=0.7")
      .to(".line", { yPercent: 0, duration: 0.86, stagger: 0.08 }, "-=0.62")
      .to(".intro", { y: 0, opacity: 1, duration: 0.62 }, "-=0.38")
      .to(".float-photo", { scale: 1, opacity: 1, rotate: 0, duration: 0.82, stagger: 0.08 }, "-=0.56")
      .to(".split-line", { scaleY: 1, duration: 0.76 }, "-=0.74")
      .add(() => document.body.classList.remove("is-locked"));
  };

  enterButton.addEventListener("click", startExperience);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") startExperience();
  });

  gsap.to(".photo-a", {
    y: -18,
    rotate: -10,
    duration: 4.8,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  gsap.to(".photo-b", {
    y: 18,
    rotate: 9,
    duration: 5.2,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  gsap.to(".photo-c", {
    y: -12,
    rotate: 2,
    duration: 4.4,
    repeat: -1,
    yoyo: true,
    ease: "sine.inOut",
  });

  if (!isMobile) {
    root.addEventListener("pointermove", (event) => {
      const rect = root.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;

      gsap.to(root, {
        "--spot-x": `${event.clientX - rect.left}px`,
        "--spot-y": `${event.clientY - rect.top}px`,
        duration: 0.45,
        ease: "power2.out",
      });

      gsap.to(".float-photo", {
        x: (index) => x * (index + 1) * 10,
        y: y * 12,
        duration: 0.6,
        ease: "power2.out",
      });
    });
  }

  document.querySelectorAll("[data-path]").forEach((path) => {
    if (isMobile) {
      const clearPressed = () => path.classList.remove("is-pressed");

      path.addEventListener("pointerdown", () => {
        if (!hasEntered) return;
        path.classList.add("is-pressed");
        gsap.to(path, {
          scale: 0.985,
          y: -2,
          duration: 0.16,
          ease: "power2.out",
          overwrite: true,
        });
      });

      path.addEventListener("pointerup", clearPressed);
      path.addEventListener("pointercancel", clearPressed);
      path.addEventListener("pointerleave", clearPressed);

      path.addEventListener("click", (event) => {
        if (!hasEntered) return;
        event.preventDefault();
        const href = path.getAttribute("href");

        gsap.timeline({
          defaults: { ease: "power2.out" },
          onComplete: () => {
            if (href) window.location.href = href;
          },
        })
          .to(path, { scale: 0.975, y: -4, duration: 0.12, overwrite: true })
          .to(path, { scale: 1, y: 0, duration: 0.18, ease: "back.out(1.4)" });
      });

      return;
    }

    path.addEventListener("pointerenter", () => {
      if (!hasEntered) return;
      const direction = path.dataset.path === "social" ? 1 : -1;
      gsap.to(camera, {
        scale: 1.035,
        x: direction * 28,
        duration: 0.65,
        ease: "power3.out",
      });
      gsap.to(".center", {
        scale: 0.965,
        opacity: 0.82,
        duration: 0.45,
        ease: "power2.out",
      });
      gsap.to(path.querySelector(".path-copy"), {
        y: -12,
        duration: 0.45,
        ease: "power2.out",
      });
    });

    path.addEventListener("pointerleave", () => {
      if (!hasEntered) return;
      gsap.to(camera, {
        scale: 1,
        x: 0,
        duration: 0.78,
        ease: "elastic.out(1, 0.65)",
      });
      gsap.to(".center", {
        scale: 1,
        opacity: 1,
        duration: 0.5,
        ease: "power2.out",
      });
      gsap.to(path.querySelector(".path-copy"), {
        y: 0,
        duration: 0.5,
        ease: "power2.out",
      });
    });
  });
} else {
  document.body.classList.remove("is-locked");
  if (introScene) introScene.style.display = "none";
}
