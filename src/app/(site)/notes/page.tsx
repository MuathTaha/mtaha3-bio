import { getPosts } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { PostList } from '@/components/site/PostList';

export const metadata = { title: 'Notes' };
export const revalidate = 60;

export default async function NotesPage() {
  const posts = await getPosts(100, 'note');
  return (
    <Container measure="prose">
      <PageHeader
        kicker="Writing"
        title="Notes"
        lede="Short, rough, and current — thinking out loud."
      />
      <PostList posts={posts} emptyLabel="No notes published yet." />
    </Container>
  );
}
