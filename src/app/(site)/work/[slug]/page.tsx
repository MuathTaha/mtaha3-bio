import { notFound } from 'next/navigation';
import { draftMode } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { getProjectBySlug, getAllProjectSlugs } from '@/sanity/lib/queries';
import { client, draftClient } from '@/sanity/lib/client';
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { PortableText } from '@/components/site/PortableText';
import { urlFor } from '@/sanity/lib/image';
import { fitClass } from '@/lib/imageFit';
import type { Project } from '@/types/content';

const STATUS_LABEL: Record<Project['status'], string> = {
  live:     'Live',
  shipped:  'Shipped',
  archived: 'Archived',
  building: 'Building',
};

export async function generateStaticParams() {
  const slugs = await getAllProjectSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.name,
    description: project.tagline,
    openGraph: {
      title: project.name,
      description: project.tagline,
      type: 'article',
      images: project.logo
        ? [urlFor(project.logo).width(1200).height(630).url()]
        : undefined,
    },
  };
}

export const revalidate = 60;

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { isEnabled } = await draftMode();
  const sanity = isEnabled ? draftClient : client;
  const project = await getProjectBySlug(slug, sanity);
  if (!project) notFound();

  return (
    <Container measure="prose">
      <nav className="mono mb-6 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
        <Link href="/work" className="hover:text-[var(--color-fg)]">← Work</Link>
      </nav>

      <header className="mb-8">
        <div className="mono mb-4 flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
          <span>{STATUS_LABEL[project.status]}</span>
          {project.year ? (
            <>
              <span className="h-1 w-1 rounded-full bg-[var(--color-fg-faint)]" />
              <span>{project.year}</span>
            </>
          ) : null}
        </div>
        <div className="flex items-start gap-5">
          {project.logo ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden bg-[var(--color-bg-elevated)]">
              <Image
                src={urlFor(project.logo).width(128).height(128).url()}
                alt={project.name}
                fill
                sizes="64px"
                className={fitClass(project.logo?.fit, 'contain')}
              />
            </div>
          ) : null}
          <div className="flex-1">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">{project.name}</h1>
            <p className="mt-3 text-lg text-[var(--color-fg-muted)]">{project.tagline}</p>
          </div>
        </div>
        {(project.url || project.repo) ? (
          <div className="mono mt-5 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.12em]">
            {project.url ? (
              <a
                href={project.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[var(--color-accent)] hover:underline"
              >
                Visit →
              </a>
            ) : null}
            {project.repo ? (
              <a
                href={project.repo}
                target="_blank"
                rel="noreferrer noopener"
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:underline"
              >
                Repo →
              </a>
            ) : null}
          </div>
        ) : null}
      </header>

      {project.writeup && project.writeup.length > 0 ? (
        <Prose>
          <PortableText value={project.writeup} />
        </Prose>
      ) : (
        <p className="text-[var(--color-fg-muted)]">No writeup yet.</p>
      )}
    </Container>
  );
}
