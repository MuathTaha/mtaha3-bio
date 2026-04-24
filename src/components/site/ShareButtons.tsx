'use client';

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);
  const links = [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
  ];

  function copy() {
    void navigator.clipboard.writeText(url);
  }

  return (
    <div className="mono mt-10 flex items-center gap-4 border-t border-[var(--color-border)] pt-6 text-xs uppercase tracking-[0.12em] text-[var(--color-fg-muted)]">
      <span>Share →</span>
      {links.map((l) => (
        <a key={l.label} href={l.href} target="_blank" rel="noreferrer noopener" className="hover:text-[var(--color-accent)]">
          {l.label}
        </a>
      ))}
      <button type="button" onClick={copy} className="hover:text-[var(--color-accent)]">
        Copy link
      </button>
    </div>
  );
}
