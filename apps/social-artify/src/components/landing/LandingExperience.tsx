"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import styles from "./LandingExperience.module.css";

const AR_URL = process.env.NEXT_PUBLIC_AR_MODE_URL ?? "https://artify.technoboost.ca/ar";

export default function LandingExperience() {
  const rootRef = useRef<HTMLElement | null>(null);
  const introRef = useRef<HTMLDivElement | null>(null);
  const enteredRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const intro = introRef.current;
    if (!root || !intro) return;

    document.body.style.overflow = "hidden";
    const ctx = gsap.context(() => {
      gsap.set(`.${styles.hero}`, { scale: 1.04, opacity: 0.55 });
      gsap.set(`.${styles.topbar}`, { opacity: 0 });
      gsap.set(`.${styles.path}`, { y: 24, opacity: 0 });
      gsap.set(`.${styles.center}`, { y: 16, opacity: 0 });
      gsap.set(`.${styles.line}`, { yPercent: 112 });

      gsap.from(`.${styles.introCopyTag}`, { y: 14, opacity: 0, duration: 0.6, ease: "power3.out" });
      gsap.from(`.${styles.introCopyTitle}`, { y: 20, opacity: 0, duration: 0.8, delay: 0.12, ease: "power3.out" });
      gsap.from(`.${styles.enterButton}`, { y: 12, opacity: 0, duration: 0.6, delay: 0.35, ease: "power3.out" });
    }, root);

    return () => {
      ctx.revert();
      document.body.style.overflow = "";
    };
  }, []);

  const enter = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;

    const intro = introRef.current;
    if (!intro) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.to(intro, { opacity: 0, duration: 0.5 })
      .set(intro, { display: "none" })
      .to(`.${styles.hero}`, { scale: 1, opacity: 1, duration: 0.7 }, "-=0.2")
      .to(`.${styles.topbar}`, { opacity: 1, duration: 0.4 }, "-=0.35")
      .to(`.${styles.center}`, { y: 0, opacity: 1, duration: 0.5 }, "-=0.28")
      .to(`.${styles.line}`, { yPercent: 0, duration: 0.6, stagger: 0.06 }, "-=0.4")
      .to(`.${styles.path}`, { y: 0, opacity: 1, duration: 0.5, stagger: 0.08 }, "-=0.35")
      .add(() => {
        document.body.style.overflow = "";
      });
  };

  return (
    <main ref={rootRef} className={styles.root}>
      <div ref={introRef} className={styles.introScene}>
        <div className={styles.introArt} />
        <div className={styles.introVignette} />
        <div className={styles.introCopy}>
          <span className={styles.introCopyTag}>Artify</span>
          <h1 className={styles.introCopyTitle}>Enter the museum.</h1>
          <button type="button" onClick={enter} className={styles.enterButton}>
            <span>Enter</span>
            <svg className={styles.enterIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <header className={styles.topbar}>
        <Link className={styles.brand} href="/">
          Artify<span className={styles.brandDot}>.</span>
        </Link>
        <nav className={styles.nav} aria-label="Experience shortcuts">
          <Link className={styles.navLink} href="/discover">Discovery</Link>
          <a className={styles.navLink} href={AR_URL}>AR Mode</a>
        </nav>
      </header>

      <section className={styles.hero} aria-label="Choose your Artify experience">
        <Link className={`${styles.path} ${styles.pathSocial}`} href="/discover" aria-label="Open Discovery">
          <span className={styles.pathMedia} aria-hidden="true" />
          <span className={styles.pathOverlay} aria-hidden="true" />
          <span className={styles.pathCopy}>
            <h2 className={styles.pathTitle}>Discovery</h2>
            <p className={styles.pathDesc}>Find your own art path, shaped by your taste and favorite pieces.</p>
          </span>
        </Link>

        <section className={styles.center}>
          <h1 className={styles.title}>
            <span className={styles.line}>Choose</span>
            <span className={styles.line}>your way</span>
            <span className={`${styles.line} ${styles.desktopOnly}`}>into art.</span>
            <span className={`${styles.line} ${styles.mobileOnly}`}>into art.</span>
          </h1>
          <p className={styles.intro}>Left for Discovery. Right for AR. One smooth Artify entrance.</p>
        </section>

        <a className={`${styles.path} ${styles.pathAr}`} href={AR_URL} aria-label="Open AR Mode">
          <span className={styles.pathMedia} aria-hidden="true" />
          <span className={styles.pathOverlay} aria-hidden="true" />
          <span className={styles.pathCopy}>
            <h2 className={styles.pathTitle}>AR Mode</h2>
            <p className={styles.pathDesc}>Scan artwork and unlock its interactive AR layer instantly.</p>
          </span>
        </a>
      </section>
    </main>
  );
}
