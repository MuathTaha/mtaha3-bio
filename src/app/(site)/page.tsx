import { getPosts } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PostCard } from '@/components/site/PostCard';

export const revalidate = 60;

export default async function HomePage() {
  const posts = await getPosts(10);
  return (
    <Container measure="prose">
      <section>
        <p className="mono mb-6 text-xs uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          Recent writing
        </p>
        <div className="space-y-10">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>
      </section>
    </Container>
  );
}
