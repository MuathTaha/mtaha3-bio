import Image from 'next/image';
import { getExperiences } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { PortableText } from '@/components/site/PortableText';
import { urlFor } from '@/sanity/lib/image';
import type { Experience } from '@/types/content';

export const metadata = { title: 'Work' };
export const revalidate = 60;

function formatRange(start: string, end?: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  };
  return `${fmt(start)} — ${end ? fmt(end) : 'Present'}`;
}

export default async function WorkPage() {
  const experiences = await getExperiences();

  return (
    <Container measure="prose">
      <header className="mb-12">
        <h1 className="text-3xl font-semibold tracking-tight">Work</h1>
        <p className="mt-2 text-[var(--color-fg-muted)]">
          My professional career — the places, the work, the impact.
        </p>
      </header>

      {experiences.length === 0 ? (
        <p className="text-[var(--color-fg-muted)]">No entries yet.</p>
      ) : (
        <div className="space-y-12">
          {experiences.map((exp) => (
            <ExperienceEntry key={exp._id} exp={exp} />
          ))}
        </div>
      )}
    </Container>
  );
}

function ExperienceEntry({ exp }: { exp: Experience }) {
  return (
    <article className="border-t border-[var(--color-border)] pt-8 first:border-t-0 first:pt-0">
      <div className="mb-4 flex items-start gap-4">
        {exp.companyLogo ? (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden bg-[var(--color-bg-elevated)]">
            <Image
              src={urlFor(exp.companyLogo).width(96).height(96).url()}
              alt={exp.company}
              fill
              sizes="48px"
              className="object-contain"
            />
          </div>
        ) : null}
        <div className="flex-1">
          <h2 className="text-xl font-semibold leading-tight text-[var(--color-fg)]">
            {exp.title}
          </h2>
          <p className="mono mt-1 text-xs uppercase tracking-[0.12em] text-[var(--color-fg-muted)]">
            {exp.companyUrl ? (
              <a
                href={exp.companyUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-[var(--color-accent)]"
              >
                {exp.company}
              </a>
            ) : (
              exp.company
            )}
            {exp.location ? <> · {exp.location}</> : null}
          </p>
          <p className="mono mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-faint)]">
            {formatRange(exp.startDate, exp.endDate)}
          </p>
        </div>
      </div>

      {exp.summary ? (
        <p className="mb-4 text-[var(--color-fg-muted)]">{exp.summary}</p>
      ) : null}

      {exp.body && exp.body.length > 0 ? (
        <Prose className="prose-sm">
          <PortableText value={exp.body} />
        </Prose>
      ) : null}
    </article>
  );
}
