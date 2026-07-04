import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { getSiteSettings } from '@/sanity/lib/queries';
import { NewsletterForm } from './NewsletterForm';

export async function Footer() {
  const settings = await getSiteSettings();
  const year = new Date().getFullYear();
  return (
    <footer className="mt-28 border-t border-[var(--color-border)]">
      <Container measure="wide" className="py-14">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">Muath Taha</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--color-fg-muted)]">
              {settings.shortBio}
            </p>
          </div>
          <div className="max-w-sm md:justify-self-end md:text-left">
            <NewsletterForm cta={settings.newsletterCta ?? 'Get new posts in your inbox.'} />
          </div>
        </div>
        <div className="mt-12 flex flex-wrap items-baseline justify-between gap-6 border-t border-[var(--color-border)] pt-6">
          <div className="flex flex-wrap gap-5">
            <Link
              href="/rss.xml"
              className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-fg-dim)] transition-colors hover:text-[var(--color-accent)]"
            >
              RSS
            </Link>
            {settings.socials?.map((s) => (
              <a
                key={s.platform}
                href={s.url}
                className="mono text-xs uppercase tracking-[0.12em] text-[var(--color-fg-dim)] transition-colors hover:text-[var(--color-accent)]"
                target="_blank"
                rel="noreferrer noopener"
              >
                {s.platform}
              </a>
            ))}
          </div>
          <p className="kicker text-[10px]">© {year} Muath Taha</p>
        </div>
      </Container>
    </footer>
  );
}
