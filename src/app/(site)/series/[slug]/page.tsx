import { notFound } from 'next/navigation';
import { getAllSeriesSlugs, getSeriesBySlug, getPostsBySeries } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PostList } from '@/components/site/PostList';

export async function generateStaticParams() {
  const slugs = await getAllSeriesSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  return series ? { title: series.title, description: series.description } : {};
}

export const revalidate = 60;

export default async function SeriesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const posts = await getPostsBySeries(slug);

  return (
    <Container measure="prose">
      <PageHeader kicker="Series" title={series.title} lede={series.description} />
      <PostList
        posts={posts}
        emptyLabel="Nothing in this series yet — the first piece is on its way."
      />
    </Container>
  );
}
