'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { cn } from '@/lib/cn';

const links = [
  { href: '/essays', label: 'Essays' },
  { href: '/notes', label: 'Notes' },
  { href: '/books', label: 'Books' },
  { href: '/work', label: 'Work' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/search', label: 'Search' },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]/85 backdrop-blur-md">
      <Container measure="wide">
        <nav className="flex items-center justify-between gap-8 py-4">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            className="mono text-sm tracking-[0.14em] text-[var(--color-fg)] transition-colors hover:text-[var(--color-accent)]"
          >
            <span className="text-[var(--color-accent)]">@</span>MTAHA3
          </Link>

          <ul className="hidden items-baseline gap-6 md:flex">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={isActive(l.href) ? 'page' : undefined}
                  className={cn(
                    'mono text-xs uppercase tracking-[0.12em] transition-colors',
                    isActive(l.href)
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle menu"
            className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-fg-muted)] transition-colors hover:text-[var(--color-fg)] md:hidden"
          >
            {open ? 'Close' : 'Menu'}
          </button>
        </nav>

        {open ? (
          <ul className="grid gap-1 border-t border-[var(--color-border)] py-4 md:hidden">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(l.href) ? 'page' : undefined}
                  className={cn(
                    'mono block py-2 text-xs uppercase tracking-[0.12em] transition-colors',
                    isActive(l.href)
                      ? 'text-[var(--color-accent)]'
                      : 'text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]'
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </header>
  );
}
