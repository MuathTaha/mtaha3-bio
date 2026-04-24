import { getPosts } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PostList } from '@/components/site/PostList';

export const metadata = { title: 'Essays' };
export const revalidate = 60;

export default async function EssaysPage() {
  const posts = await getPosts(50, 'essay');
  return (
    <Container measure="prose">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Essays</h1>
      <PostList posts={posts} emptyLabel="No essays published yet." />
    </Container>
  );
}
