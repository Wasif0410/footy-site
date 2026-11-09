"use client";
// Links that know which page you're on (the site header and the match centre's tabs).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function NavLinks({ links, className, label, exact = false }: {
  links: { href: string; label: string }[]; className: string; label: string; exact?: boolean;
}) {
  const path = (usePathname() || "/").replace(/\/$/, "");
  const here = (href: string) => {
    const b = href.replace(/\/$/, "");
    return exact || b === "" ? path === b : path === b || path.startsWith(`${b}/`);
  };
  // on a phone the row scrolls sideways: bring the link of the current page into view so the visitor sees where they are
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = ref.current, cur = nav?.querySelector<HTMLElement>("[aria-current=page]");
    if (!nav || !cur || !window.matchMedia("(max-width: 640px)").matches) return;
    nav.scrollLeft = Math.max(0, cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2);
  }, [path]);
  return (
    <nav ref={ref} className={className} aria-label={label}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={here(l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
