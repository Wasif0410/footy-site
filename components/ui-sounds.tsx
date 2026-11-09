"use client";
// Interface sounds for the whole site, wired once with delegated document-level listeners (nothing is hooked up button by button).
// The sounds themselves are made in lib/sfx.ts. This component decides when they play:
//
//  * a press on a link, button, tab, summary, select, checkbox, radio or a label with an input plays a sound that fits it:
//      tabs, switches, checkboxes, radios, summaries, buttons that open or toggle something  -> "toggle"
//      the primary button of a view (a class or data-primary marker), submit buttons          -> "confirm"
//      Cancel / Back / Close, and Esc when something is open or selected                      -> "back"
//      everything else                                                                        -> "click"
//    A mouse presses on pointer-down (so it feels instant); a finger plays on the tap (a touch that turns into a scroll is silent);
//    the keyboard plays on Enter or Space. The click event that follows a sound already played is ignored, so nothing doubles up.
//  * data-sfx="name" on an element (or a container) picks the sound; data-sfx="none" turns it off for that element and what is inside.
//  * a very quiet tick when a real mouse moves onto a main nav link, a home tile or a card. Never for touch.
//  * window.dispatchEvent(new CustomEvent("sfx", { detail: "whoosh" })) plays a named sound from anywhere (same as sfx.play).
//
// It never calls preventDefault and never delays anything: listeners are passive and the sound is fire-and-forget.
import { useEffect } from "react";
import { MUSIC_MUTE_KEY } from "@/lib/music";
import { isSfxName, sfx, type SfxName } from "@/lib/sfx";

const BASE = [
  "a[href]", "button", "summary", "select", "label",
  '[role="button"]', '[role="tab"]', '[role="switch"]', '[role="menuitem"]', '[role="option"]', '[role="checkbox"]', '[role="radio"]',
  'input[type="checkbox"]', 'input[type="radio"]', 'input[type="submit"]', 'input[type="button"]',
].join(", ");
const WITH_TAG = `${BASE}, [data-sfx]`;
// what Enter / Space activate natively (or by the usual ARIA contract)
const BY_ENTER = 'a[href], button, summary, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], input[type="button"], input[type="submit"]';
const BY_SPACE = 'button, summary, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="checkbox"], [role="radio"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]';
// Esc sounds like "back" only when it has something to close or cancel
const ESC_OPEN = 'dialog[open], [role="dialog"], [aria-modal="true"], [aria-expanded="true"]:not([data-sfx="none"]), .ut-btn[aria-pressed="true"]';
const TAB_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
const BACK_WORDS = /^(cancel|back|close|dismiss|go back|never mind|no,? thanks|clear)\b/i;

// hover ticks: the main nav, the header shortcuts, home tiles and cards
const HOVER_BASE = [".site-nav a", ".tabs a", ".wordmark", ".hud-icons a", ".hud-icons button", ".tile", ".mcard", "a.fut"];
const canHas = typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("selector(:has(*))");
const HOVER = (canHas ? [...HOVER_BASE, "a:has(.fut)"] : HOVER_BASE).join(", ");

const GAP_MS = 120;                 // two interface sounds never closer than this (a label and its checkbox both receive a click)
const CLICK_AFTER_SOUND_MS = 1500;  // the click that follows a pointer-down or key-down we already played

function elementOf(t: EventTarget | null): Element | null {
  return t instanceof Element ? t : t instanceof Node ? t.parentElement : null;
}

const isCheckLike = (el: Element) => el instanceof HTMLInputElement && (el.type === "checkbox" || el.type === "radio");

/** Which sound a press on `target` should make, or null for none. */
function resolve(target: EventTarget | null): SfxName | null {
  const start = elementOf(target);
  const el = start?.closest(WITH_TAG);
  if (!el) return null;
  if (el.matches(":disabled, [aria-disabled='true']")) return null;
  const tag = el.closest("[data-sfx]")?.getAttribute("data-sfx");
  if (tag === "none") return null;
  if (isSfxName(tag)) return tag;
  if (!el.matches(BASE)) return null;

  if (el instanceof HTMLLabelElement) {
    const c = el.control;
    if (!c || c.matches(":disabled")) return null;
    return isCheckLike(c) ? "toggle" : "click";
  }
  if (isCheckLike(el)) return "toggle";
  const label = (el.getAttribute("aria-label") || el.textContent || "").trim();
  if (BACK_WORDS.test(label)) return "back";
  const submit = (el instanceof HTMLButtonElement && el.type === "submit" && !!el.form) || (el instanceof HTMLInputElement && el.type === "submit");
  if (submit || el.matches('[data-primary], [class*="primary"]')) return "confirm";
  if (el.matches('[role="tab"], [role="switch"], [role="checkbox"], [role="radio"], summary, [aria-expanded], [aria-pressed]')) {
    // a card on the Ultimate Team pitch is picked, not switched
    return el.matches(".ut-btn") ? "select" : "toggle";
  }
  return "click";
}

function hoverTarget(t: EventTarget | null): Element | null {
  const el = elementOf(t)?.closest(HOVER);
  if (!el || el.matches(":disabled, [aria-disabled='true']") || el.closest('[data-sfx="none"]')) return null;
  return el;
}

export function UiSounds() {
  useEffect(() => {
    let lastAt = -1e9;                // when the last interface sound was started from a press
    let skipClickUntil = 0;           // ignore clicks until then: this press/key was already played
    let hovered: Element | null = null;
    let lastMove = 0;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

    const fire = (name: SfxName) => {
      const now = performance.now();
      if (now - lastAt < GAP_MS) return;
      lastAt = now;
      sfx.play(name);
    };

    const onPointerDown = (e: PointerEvent) => {
      sfx.unlock();                   // inside the gesture, as iOS Safari needs
      skipClickUntil = 0;
      if (e.pointerType === "touch" || !e.isPrimary || e.button !== 0) return;
      const name = resolve(e.target);
      if (!name) return;
      skipClickUntil = performance.now() + CLICK_AFTER_SOUND_MS;
      fire(name);
    };

    const onClick = (e: MouseEvent) => {
      sfx.unlock();
      if (!e.isTrusted || performance.now() < skipClickUntil) return;
      const name = resolve(e.target);
      if (name) fire(name);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") return;
      sfx.unlock();
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        if (document.querySelector(ESC_OPEN)) fire("back");
        return;
      }
      const start = elementOf(e.target);
      if (TAB_KEYS.includes(e.key) && start?.closest('[role="tab"]')) {
        if (resolve(e.target)) fire("toggle");
        return;
      }
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = start?.closest(WITH_TAG);
      if (!el || !el.matches(e.key === "Enter" ? BY_ENTER : BY_SPACE)) return;
      const name = resolve(e.target);
      if (!name) return;
      skipClickUntil = performance.now() + CLICK_AFTER_SOUND_MS;
      fire(name);
    };

    // hover ticks are driven by real mouse movement (not by content scrolling under a still pointer), one per element entered
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !fine.matches || e.buttons) return;
      if (e.timeStamp - lastMove < 30) return;
      lastMove = e.timeStamp;
      const el = hoverTarget(e.target);
      if (el === hovered) return;
      hovered = el;
      if (el) sfx.play("hover");
    };
    const onPointerOut = (e: PointerEvent) => { if (!e.relatedTarget) hovered = null; };

    const onCustom = (e: Event) => {
      const d = (e as CustomEvent).detail;
      const name = typeof d === "string" ? d : d && typeof d === "object" ? (d as { name?: unknown }).name : null;
      if (isSfxName(name)) sfx.play(name);
    };
    // the speaker button in another tab
    const onStorage = (e: StorageEvent) => { if (e.key === MUSIC_MUTE_KEY) sfx.setMuted(e.newValue === "1"); };

    const opt = { capture: true, passive: true } as const;
    document.addEventListener("pointerdown", onPointerDown, opt);
    document.addEventListener("click", onClick, opt);
    document.addEventListener("keydown", onKeyDown, opt);
    document.addEventListener("touchend", sfx.unlock, opt);
    document.addEventListener("pointermove", onPointerMove, opt);
    document.addEventListener("pointerout", onPointerOut, opt);
    window.addEventListener("sfx", onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, opt);
      document.removeEventListener("click", onClick, opt);
      document.removeEventListener("keydown", onKeyDown, opt);
      document.removeEventListener("touchend", sfx.unlock, opt);
      document.removeEventListener("pointermove", onPointerMove, opt);
      document.removeEventListener("pointerout", onPointerOut, opt);
      window.removeEventListener("sfx", onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
