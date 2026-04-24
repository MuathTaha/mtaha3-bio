import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getPostBySlug, getAllPostSlugs } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { PortableText } from '@/components/site/PortableText';
import { TagChip } from '@/components/site/TagChip';
import { urlFor } from '@/sanity/lib/image';

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
      images: post.coverImage
        ? [urlFor(post.coverImage).width(1200).height(630).url()]
        : undefined,
    },
  };
}

export const revalidate = 60;

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <Container measure="prose">
      <header className="mb-8">
        <div className="mono mb-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          <span>{new Date(post.publishedAt).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '·')}</span>
          <span className="h-1 w-1 rounded-full bg-[var(--color-fg-faint)]" />
          <span>{post.type}</span>
          {post.readingTime ? (
            <>
              <span className="h-1 w-1 rounded-full bg-[var(--color-fg-faint)]" />
              <span>{post.readingTime} min read</span>
            </>
          ) : null}
        </div>
        <h1 className="text-4xl font-semibold leading-tight tracking-tight">{post.title}</h1>
        <p className="mt-4 text-lg text-[var(--color-fg-muted)]">{post.excerpt}</p>
      </header>
      {post.coverImage ? (
        <div className="relative mb-10 aspect-[16/7] w-full overflow-hidden">
          <Image
            src={urlFor(post.coverImage).width(1400).url()}
            alt={post.coverImage.alt ?? ''}
            fill
            sizes="(max-width: 768px) 100vw, 700px"
            className="object-cover"
            priority
          />
        </div>
      ) : null}
      <Prose>
        <PortableText value={post.body} />
      </Prose>
      {post.tags?.length ? (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--color-border)] pt-6">
          {post.tags.map((t) => (
            <TagChip key={t._id} tag={t} />
          ))}
        </div>
      ) : null}
    </Container>
  );
}
