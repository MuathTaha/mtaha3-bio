import type { ReactNode } from 'react';

export function PageHeader({
  kicker,
  title,
  lede,
}: {
  kicker?: string;
  title: string;
  lede?: ReactNode;
}) {
  return (
    <header className="mb-12 sm:mb-14">
      {kicker ? <p className="kicker mb-3">{kicker}</p> : null}
      <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
        {title}
      </h1>
      {lede ? (
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-[var(--color-fg-muted)]">
          {lede}
        </p>
      ) : null}
    </header>
  );
}
