"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const animations = new Set<Animation>();
    let frame = 0;

    // Reveal on scroll
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        if (reducedMotion.matches) continue;
        const element = entry.target as HTMLElement;
        const animation = element.animate([
          { opacity: 0, transform: "translateY(22px)" },
          { opacity: 1, transform: "translateY(0)" },
        ], { duration: 700, delay: Number(element.dataset.reveal || 0), easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.08 });

    container.querySelectorAll("[data-reveal]").forEach(element => observer.observe(element));

    // 3D scroll reveal
    const scrollObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      }
    }, { threshold: 0.12, rootMargin: "0px 0px -60px 0px" });

    container.querySelectorAll(".scroll-reveal").forEach(el => scrollObserver.observe(el));

    // Parallax & perspective scroll transforms
    const parallaxElements = container.querySelectorAll<HTMLElement>("[data-parallax]");
    const perspectiveElements = container.querySelectorAll<HTMLElement>("[data-perspective]");

    function updateScroll() {
      if (reducedMotion.matches) return;
      const vh = window.innerHeight;
      parallaxElements.forEach(el => {
        const speed = parseFloat(el.dataset.parallax || "0.5");
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const offset = (center - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${offset * 0.3}px, 0)`;
      });
      perspectiveElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const progress = Math.max(0, Math.min(1, 1 - rect.top / vh));
        const rotateX = (1 - progress) * 12;
        const scale = 0.85 + progress * 0.15;
        el.style.transform = `perspective(1200px) rotateX(${rotateX}deg) scale(${scale})`;
        el.style.opacity = `${0.4 + progress * 0.6}`;
      });
      rafRef.current = null;
    }

    function onScroll() {
      if (rafRef.current === null) rafRef.current = requestAnimationFrame(updateScroll);
    }

    if (!reducedMotion.matches) {
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    function stopMotion() {
      if (!reducedMotion.matches) return;
      animations.forEach(animation => animation.cancel());
      animations.clear();
      cancelAnimationFrame(frame);
    }

    function spotlight(event: PointerEvent) {
      if (reducedMotion.matches || !finePointer.matches || !(event.target instanceof Element)) return;
      const card = event.target.closest<HTMLElement>("[data-spotlight]");
      if (!card || !container?.contains(card)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
        card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
      });
    }

    // Mouse-driven 3D tilt
    const tiltCards = container.querySelectorAll<HTMLElement>("[data-tilt]");
    function tiltHandler(event: PointerEvent) {
      if (reducedMotion.matches || !finePointer.matches) return;
      const card = (event.target as Element).closest<HTMLElement>("[data-tilt]");
      if (!card || !container?.contains(card)) return;
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const maxTilt = parseFloat(card.dataset.tilt || "8");
      const rotateY = ((x - centerX) / centerX) * maxTilt;
      const rotateX = ((centerY - y) / centerY) * maxTilt;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    }

    function tiltReset(event: PointerEvent) {
      const card = (event.target as Element).closest<HTMLElement>("[data-tilt]");
      if (card && container?.contains(card)) {
        card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)";
      }
    }

    tiltCards.forEach(card => {
      card.addEventListener("pointermove", tiltHandler as EventListener);
      card.addEventListener("pointerleave", tiltReset as EventListener);
    });

    container.addEventListener("pointermove", spotlight, { passive: true });
    reducedMotion.addEventListener("change", stopMotion);

    return () => {
      observer.disconnect();
      scrollObserver.disconnect();
      animations.forEach(animation => animation.cancel());
      cancelAnimationFrame(frame);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      container.removeEventListener("pointermove", spotlight);
      reducedMotion.removeEventListener("change", stopMotion);
      window.removeEventListener("scroll", onScroll);
      tiltCards.forEach(card => {
        card.removeEventListener("pointermove", tiltHandler as EventListener);
        card.removeEventListener("pointerleave", tiltReset as EventListener);
      });
    };
  }, []);

  return <div ref={root} className="marketing-shell min-h-screen">{children}</div>;
}