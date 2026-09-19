"use client";

import { useEffect } from "react";

/** Marks the floating "Cookie settings" button so it can be hidden on small screens. */
export function CookieUiTweaks() {
  useEffect(() => {
    function tag() {
      document.querySelectorAll("button").forEach((b) => {
        if (b.textContent?.trim() === "Cookie settings") {
          b.setAttribute("data-cookie-floating", "true");
        }
      });
    }
    tag();
    const mo = new MutationObserver(tag);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);
  return null;
}