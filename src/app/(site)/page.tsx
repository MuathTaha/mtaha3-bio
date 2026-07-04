import Link from 'next/link';
import { getPosts, getSiteSettings } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PostCard } from '@/components/site/PostCard';

export const revalidate = 60;

const heroLinks = [
  { href: '/essays', label: 'Essays' },
  { href: '/notes', label: 'Notes' },
  { href: '/books', label: 'Books' },
  { href: '/about', label: 'About' },
];

export default async function HomePage() {
  const [settings, posts] = await Promise.all([getSiteSettings(), getPosts(10)]);
  const [latest, ...rest] = posts;

  return (
    <>
      <Container measure="wide">
        <section className="border-b border-[var(--color-border)] pb-14 sm:pb-20">
          <p className="kicker mb-4">Muath Taha</p>
          <h1 className="font-display max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-6xl">
            Writing on AI, product, and what I&rsquo;m learning.
          </h1>
          {settings.shortBio ? (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-fg-muted)]">
              {settings.shortBio}
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            {heroLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="mono border border-[var(--color-border)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-fg-muted)] transition-colors hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </section>
      </Container>

      <Container measure="prose" className="mt-14 sm:mt-20">
        <section>
          <p className="kicker mb-8">Recent writing</p>
          <div className="space-y-12">
            {latest ? <PostCard post={latest} featured /> : null}
            {rest.map((post) => (
              <PostCard key={post._id} post={post} />
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}
