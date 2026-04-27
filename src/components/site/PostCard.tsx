import Link from 'next/link';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';
import { fitClass } from '@/lib/imageFit';
import type { Post } from '@/types/content';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '·');
}

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="border-t border-[var(--color-border)] pt-5 first:border-t-0">
      <Link href={`/post/${post.slug}`} className="group block">
        <div className="mono mb-2 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          <span>{formatDate(post.publishedAt)}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--color-fg-faint)]" />
          <span>{post.type}</span>
          {post.readingTime ? (
            <>
              <span className="h-1 w-1 rounded-full bg-[var(--color-fg-faint)]" />
              <span>{post.readingTime} min</span>
            </>
          ) : null}
        </div>
        <h3 className="text-xl font-semibold leading-tight text-[var(--color-fg)] group-hover:text-[var(--color-accent)]">
          {post.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{post.excerpt}</p>
        {post.coverImage && post.type === 'essay' ? (
          <div className="relative mt-4 aspect-[16/7] w-full overflow-hidden">
            <Image
              src={urlFor(post.coverImage).width(1200).height(525).url()}
              alt={post.coverImage.alt ?? ''}
              fill
              sizes="(max-width: 768px) 100vw, 700px"
              className={fitClass(post.coverImage?.fit, 'cover')}
            />
          </div>
        ) : null}
      </Link>
    </article>
  );
}
