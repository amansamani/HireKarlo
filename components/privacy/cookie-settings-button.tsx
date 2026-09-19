"use client";

/** Footer link that re-opens the cookie consent dialog. */
export function CookieSettingsButton() {
  function openSettings() {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent?.trim() === "Cookie settings"
    );
    btn?.click();
  }
  return (
    <button type="button" onClick={openSettings} className="text-left hover:text-white transition-colors">
      Cookie settings
    </button>
  );
}