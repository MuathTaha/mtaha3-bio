import { ImageResponse } from 'next/og';
import { getProjectBySlug } from '@/sanity/lib/queries';

export const runtime = 'nodejs';
export const alt = 'mtaha.bio project';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const STATUS_LABEL: Record<string, string> = {
  live:     'Live',
  shipped:  'Shipped',
  archived: 'Archived',
  building: 'Building',
};

export default async function ProjectOgImage({ params }: { params: { slug: string } }) {
  const project = await getProjectBySlug(params.slug);
  const title = project?.name ?? 'mtaha.bio';
  const tagline = project?.tagline ?? '';
  const status = project?.status ? STATUS_LABEL[project.status] ?? '' : '';
  const year = project?.year ?? '';

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
          <span>mtaha.bio · work</span>
          {status ? (
            <>
              <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: 2, background: '#bfb39e' }} />
              <span>{status}</span>
            </>
          ) : null}
          {year ? (
            <>
              <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: 2, background: '#bfb39e' }} />
              <span>{year}</span>
            </>
          ) : null}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <h1
            style={{
              fontSize: title.length > 30 ? 92 : 120,
              lineHeight: 1,
              letterSpacing: -2,
              fontWeight: 700,
              margin: 0,
              maxWidth: 1040,
            }}
          >
            {title}
          </h1>
          {tagline ? (
            <p
              style={{
                fontSize: 32,
                lineHeight: 1.3,
                color: '#4a4540',
                margin: 0,
                maxWidth: 1040,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {tagline}
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
