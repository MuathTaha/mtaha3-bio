import { getPosts } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PostList } from '@/components/site/PostList';

export const metadata = { title: 'Notes' };
export const revalidate = 60;

export default async function NotesPage() {
  const posts = await getPosts(100, 'note');
  return (
    <Container measure="prose">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Notes</h1>
      <PostList posts={posts} emptyLabel="No notes published yet." />
    </Container>
  );
}
