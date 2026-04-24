import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getSiteSettings } from '@/sanity/lib/queries';

export async function Footer() {
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-[var(--color-border)] py-10 text-sm text-[var(--color-fg-muted)]">
      <Container measure="wide">
        <div className="flex flex-wrap items-baseline justify-between gap-6">
          <p className="max-w-md">{settings.shortBio}</p>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-4">
              <Link href="/rss.xml" className="mono text-xs uppercase tracking-[0.12em] hover:text-[var(--color-fg)]">RSS</Link>
              {settings.socials?.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  className="mono text-xs uppercase tracking-[0.12em] hover:text-[var(--color-fg)]"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {s.platform}
                </a>
              ))}
            </div>
            <p className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
              © {year} Muath Taha
            </p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
