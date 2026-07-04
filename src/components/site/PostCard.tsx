import Link from 'next/link';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';
import { fitClass } from '@/lib/imageFit';
import { cn } from '@/lib/cn';
import type { Post } from '@/types/content';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return (
    <article className="group border-t border-[var(--color-border)] pt-6 first:border-t-0 first:pt-0">
      <Link href={`/post/${post.slug}`} className="block sm:grid sm:grid-cols-[7.5rem_1fr] sm:gap-x-6">
        <div className="kicker mb-2 flex items-baseline gap-3 sm:mb-0 sm:block sm:pt-1">
          <span className="block">{formatDate(post.publishedAt)}</span>
          <span className="block sm:mt-1.5">
            {post.type}
            {post.readingTime ? ` · ${post.readingTime} min` : ''}
          </span>
        </div>
        <div>
          <h3
            className={cn(
              'font-display font-semibold leading-snug tracking-tight text-[var(--color-fg)] transition-colors group-hover:text-[var(--color-accent)]',
              featured ? 'text-2xl sm:text-3xl' : 'text-xl'
            )}
          >
            {post.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-fg-muted)]">{post.excerpt}</p>
          {post.coverImage && (featured || post.type === 'essay') ? (
            <div className="relative mt-5 aspect-[16/7] w-full overflow-hidden rounded-sm border border-[var(--color-border)]">
              <Image
                src={urlFor(post.coverImage).width(1200).height(525).url()}
                alt={post.coverImage.alt ?? ''}
                fill
                sizes="(max-width: 768px) 100vw, 700px"
                className={cn(
                  fitClass(post.coverImage?.fit, 'cover'),
                  'transition-transform duration-500 group-hover:scale-[1.02]'
                )}
              />
            </div>
          ) : null}
          <span className="kicker mt-3 inline-flex items-center gap-1 text-[var(--color-fg-dim)] transition-colors group-hover:text-[var(--color-accent)]">
            Read
            <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
