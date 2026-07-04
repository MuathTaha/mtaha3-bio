import { notFound } from 'next/navigation';
import { getAllTags, getTagBySlug, getPostsByTag } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
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
      <PageHeader kicker="Tag" title={tag.name} lede={tag.description} />
      <PostList posts={posts} emptyLabel="No posts for this tag yet." />
    </Container>
  );
}
