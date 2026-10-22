import { getComments } from '@/sanity/lib/queries';
import { CommentForm } from './CommentForm';

const dateFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

/**
 * Comment thread for a post: approved comments, then the form.
 *
 * Server-rendered, so the comments are in the HTML — unlike the GitHub-backed
 * widget this replaced, which loaded in an iframe and left nothing for search
 * engines or a reader without JavaScript.
 */
export async function Comments({ postId }: { postId: string }) {
  const comments = await getComments(postId);

  return (
    <section className="mt-12 border-t border-[var(--color-border)] pt-8">
      <h2 className="kicker mb-6">
        {comments.length === 0
          ? 'Comments'
          : `${comments.length} comment${comments.length === 1 ? '' : 's'}`}
      </h2>

      {comments.length > 0 ? (
        <ul className="flex flex-col gap-6">
          {comments.map((comment) => (
            <li key={comment._id} className="border-l-2 border-[var(--color-border)] pl-4">
              <div className="flex items-baseline gap-3">
                <p className="text-sm font-medium text-[var(--color-fg)]">{comment.name}</p>
                <time
                  dateTime={comment._createdAt}
                  className="mono text-[10px] uppercase tracking-[0.1em] text-[var(--color-fg-faint)]"
                >
                  {dateFormat.format(new Date(comment._createdAt))}
                </time>
              </div>
              {/*
                Plain text from a reader, so it is rendered as text and never as
                markup. `whitespace-pre-line` keeps their paragraph breaks
                without interpreting anything else.
              */}
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--color-fg-muted)]">
                {comment.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-fg-muted)]">No comments yet.</p>
      )}

      <CommentForm postId={postId} />
    </section>
  );
}
