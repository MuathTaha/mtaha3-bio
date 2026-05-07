import { ImageResponse } from 'next/og';
import { getPostBySlug } from '@/sanity/lib/queries';

export const runtime = 'nodejs';
export const alt = 'mtaha.bio post';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function PostOgImage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  const title = post?.title ?? 'mtaha.bio';
  const excerpt = post?.excerpt ?? '';
  const type = post?.type ?? '';
  const date = post?.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }).replace(/\//g, '·')
    : '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: '#f5f1ea',
          color: '#1a1a1f',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            fontFamily: 'monospace',
            fontSize: 18,
            letterSpacing: 4,
            textTransform: 'uppercase',
            color: '#7a6d5c',
          }}
        >
          <span>mtaha.bio</span>
          {type ? (
            <>
              <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: 2, background: '#bfb39e' }} />
              <span>{type}</span>
            </>
          ) : null}
          {date ? (
            <>
              <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: 2, background: '#bfb39e' }} />
              <span>{date}</span>
            </>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h1
            style={{
              fontSize: title.length > 60 ? 64 : 80,
              lineHeight: 1.05,
              letterSpacing: -1.5,
              fontWeight: 600,
              margin: 0,
              maxWidth: 1040,
            }}
          >
            {title}
          </h1>
          {excerpt ? (
            <p
              style={{
                fontSize: 28,
                lineHeight: 1.35,
                color: '#4a4540',
                margin: 0,
                maxWidth: 1040,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {excerpt}
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'monospace',
            fontSize: 18,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: '#7a6d5c',
          }}
        >
          <span>Muath Taha</span>
          <span style={{ color: '#c9a64a' }}>@mtaha</span>
        </div>
      </div>
    ),
    size
  );
}
