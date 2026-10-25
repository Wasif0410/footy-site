"use client";
// Links that know which page you're on (the site header and the match centre's tabs).
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links, className, exact = false }: { links: { href: string; label: string }[]; className: string; exact?: boolean }) {
  const path = usePathname() || "/";
  const here = (href: string) => {
    const a = path.replace(/\/$/, ""), b = href.replace(/\/$/, "");
    return exact || b === "" ? a === b : a === b || a.startsWith(`${b}/`);
  };
  return (
    <nav className={className} aria-label={className === "tabs" ? "Match sections" : "Site"}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={here(l.href) ? "page" : undefined}>{l.label}</Link>
      ))}
    </nav>
  );
}
