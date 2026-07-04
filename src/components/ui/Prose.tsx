import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={cn(
        'prose prose-invert max-w-none',
        'prose-headings:font-display prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-h2:text-2xl prose-h3:text-xl',
        'prose-p:text-[var(--color-fg-muted)] prose-p:leading-relaxed',
        'prose-li:text-[var(--color-fg-muted)]',
        'prose-strong:text-[var(--color-fg)]',
        'prose-a:text-[var(--color-accent)] prose-a:underline prose-a:decoration-[var(--color-accent)]/40 prose-a:underline-offset-4 hover:prose-a:decoration-[var(--color-accent)]',
        'prose-blockquote:border-l-[var(--color-accent)] prose-blockquote:font-display prose-blockquote:text-lg prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-[var(--color-fg)]',
        'prose-code:text-[var(--color-accent-strong)] prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:border prose-pre:border-[var(--color-border)] prose-pre:bg-[var(--color-bg-elevated)]',
        'prose-hr:border-[var(--color-border)]',
        'prose-img:rounded-sm prose-img:border prose-img:border-[var(--color-border)]',
        className
      )}
    >
      {children}
    </article>
  );
}
