import Image from 'next/image';
import Link from 'next/link';
import { urlFor } from '@/sanity/lib/image';
import type { Project } from '@/types/content';

const statusLabel: Record<Project['status'], string> = {
  live:     'Live',
  shipped:  'Shipped',
  archived: 'Archived',
  building: 'Building',
};

export function ProjectCard({ project }: { project: Project }) {
  const href = project.writeup ? `/work/${project.slug}` : project.url;
  const Wrapper = project.writeup
    ? ({ children }: { children: React.ReactNode }) => <Link href={href!}>{children}</Link>
    : ({ children }: { children: React.ReactNode }) => (
        <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>
      );

  return (
    <Wrapper>
      <div className="flex items-start gap-4 border-t border-[var(--color-border)] py-5 transition-colors hover:border-[var(--color-accent)]">
        {project.logo ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-[var(--color-bg-elevated)]">
            <Image src={urlFor(project.logo).width(96).height(96).url()} alt={project.name} fill sizes="48px" />
          </div>
        ) : (
          <div className="h-12 w-12 shrink-0 bg-[var(--color-bg-elevated)]" />
        )}
        <div className="flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <span className="mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-fg-faint)]">
              {statusLabel[project.status]} {project.year ? `· ${project.year}` : ''}
            </span>
          </div>
          <p className="text-sm text-[var(--color-fg-muted)]">{project.tagline}</p>
        </div>
      </div>
    </Wrapper>
  );
}
