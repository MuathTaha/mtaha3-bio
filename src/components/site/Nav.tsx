import Link from 'next/link';
import { Container } from '@/components/ui/Container';

const links = [
  { href: '/essays', label: 'Essays' },
  { href: '/notes', label: 'Notes' },
  { href: '/work', label: 'Work' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About Me' },
  { href: '/search', label: 'Search' },
];

export function Nav() {
  return (
    <header className="border-b border-[var(--color-border)] py-5">
      <Container measure="wide">
        <nav className="flex items-baseline justify-between gap-8">
          <Link href="/" className="mono text-sm tracking-[0.14em] text-[var(--color-fg)] hover:text-[var(--color-accent)]">
            @MTAHA
          </Link>
          <ul className="flex items-baseline gap-6">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)]"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Container>
    </header>
  );
}
