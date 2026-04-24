import Link from 'next/link';
import type { Tag } from '@/types/content';

export function TagChip({ tag }: { tag: Pick<Tag, 'name' | 'slug'> }) {
  return (
    <Link
      href={`/tag/${tag.slug}`}
      className="mono inline-block border border-[var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
    >
      {tag.name}
    </Link>
  );
}
