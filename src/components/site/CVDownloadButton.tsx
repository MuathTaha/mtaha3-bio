'use client';
import { trackEvent } from '@/lib/analytics';

export function CVDownloadButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      download
      onClick={() => trackEvent('cv_download')}
      className="mono mt-10 inline-block border border-[var(--color-border)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    >
      Download CV (PDF)
    </a>
  );
}
