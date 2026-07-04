import { getPosts } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PostList } from '@/components/site/PostList';

export const metadata = { title: 'Essays' };
export const revalidate = 60;

export default async function EssaysPage() {
  const posts = await getPosts(50, 'essay');
  return (
    <Container measure="prose">
      <PageHeader
        kicker="Writing"
        title="Essays"
        lede="Longer-form pieces — argued, edited, meant to last."
      />
      <PostList posts={posts} emptyLabel="No essays published yet." />
    </Container>
  );
}
