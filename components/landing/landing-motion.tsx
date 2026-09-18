"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: all content stays visible without JavaScript. */
export default function LandingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const animations = new Set<Animation>();
    let frame = 0;
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
    container.addEventListener("pointermove", spotlight, { passive: true });
    reducedMotion.addEventListener("change", stopMotion);
    return () => {
      observer.disconnect();
      animations.forEach(animation => animation.cancel());
      cancelAnimationFrame(frame);
      container.removeEventListener("pointermove", spotlight);
      reducedMotion.removeEventListener("change", stopMotion);
    };
  }, []);
  return <div ref={root} className="marketing-shell min-h-screen">{children}</div>;
}
