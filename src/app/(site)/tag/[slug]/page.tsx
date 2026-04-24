import { notFound } from 'next/navigation';
import { getAllTags, getTagBySlug, getPostsByTag } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PostList } from '@/components/site/PostList';

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  return tag ? { title: `Tag: ${tag.name}` } : {};
}

export const revalidate = 60;

export default async function TagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) notFound();
  const posts = await getPostsByTag(slug);
  return (
    <Container measure="prose">
      <header className="mb-8">
        <p className="mono mb-2 text-xs uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          Tag
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">{tag.name}</h1>
        {tag.description ? (
          <p className="mt-2 text-[var(--color-fg-muted)]">{tag.description}</p>
        ) : null}
      </header>
      <PostList posts={posts} emptyLabel="No posts for this tag yet." />
    </Container>
  );
}
