import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={cn(
        'prose prose-invert max-w-none',
        'prose-headings:font-semibold prose-headings:tracking-tight',
        'prose-h2:text-2xl prose-h3:text-xl',
        'prose-p:text-[var(--color-fg-muted)] prose-p:leading-relaxed',
        'prose-a:text-[var(--color-accent)] prose-a:no-underline hover:prose-a:underline',
        'prose-blockquote:border-l-[var(--color-accent)] prose-blockquote:text-[var(--color-fg)]',
        'prose-code:text-[var(--color-accent)] prose-code:before:content-none prose-code:after:content-none',
        'prose-pre:bg-[var(--color-bg-elevated)] prose-pre:border prose-pre:border-[var(--color-border)]',
        className
      )}
    >
      {children}
    </article>
  );
}
