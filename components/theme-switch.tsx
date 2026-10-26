"use client";
// Dark by default; this switch picks light (or back), remembered on this device.
import { useEffect, useState } from "react";

export function ThemeSwitch() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  const flip = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* private mode: just for this visit */ }
    setTheme(next);
  };
  return (
    <button type="button" className="linkish" onClick={flip} aria-pressed={theme === "light"}>
      {theme === "dark" ? "Light mode" : "Dark mode"}
    </button>
  );
}
