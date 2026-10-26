"use client";
// Links that know which page you're on (the site header and the match centre's tabs).
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links, className, label, exact = false }: {
  links: { href: string; label: string }[]; className: string; label: string; exact?: boolean;
}) {
  const path = (usePathname() || "/").replace(/\/$/, "");
  const here = (href: string) => {
    const b = href.replace(/\/$/, "");
    return exact || b === "" ? path === b : path === b || path.startsWith(`${b}/`);
  };
  return (
    <nav className={className} aria-label={label}>
      {links.map((l) => (
        <Link key={l.href} href={l.href} aria-current={here(l.href) ? "page" : undefined}>{l.label}</Link>
      ))}
    </nav>
  );
}
