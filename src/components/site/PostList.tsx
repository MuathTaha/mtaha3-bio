import { PostCard } from './PostCard';
import type { Post } from '@/types/content';

export function PostList({ posts, emptyLabel }: { posts: Post[]; emptyLabel: string }) {
  if (posts.length === 0) {
    return <p className="text-[var(--color-fg-muted)]">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-10">
      {posts.map((p) => (
        <PostCard key={p._id} post={p} />
      ))}
    </div>
  );
}
