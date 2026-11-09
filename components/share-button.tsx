"use client";
// Share this page: the device's own share sheet where there is one (phones, most computers), otherwise the link is
// copied and the icon turns to a tick for a moment.
import { useState } from "react";

export function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { /* the share sheet was closed, or copying isn't allowed here: nothing to do */ }
  };
  const label = copied ? "Link copied" : "Share this page";
  return (
    <button type="button" className="hud-btn" onClick={share} aria-label={label} title={label}>
      {copied ? (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5v11" /><path d="M8 7.5l4-4 4 4" /><path d="M6.5 11H5.5v9h13v-9h-1" /></svg>
      )}
      <span className="sr-only" role="status" aria-live="polite">{copied ? "Link copied" : ""}</span>
    </button>
  );
}
