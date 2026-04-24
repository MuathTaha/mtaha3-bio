import { getSiteSettings } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { Prose } from '@/components/ui/Prose';
import { PortableText } from '@/components/site/PortableText';

export const metadata = { title: 'About' };
export const revalidate = 300;

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const cvUrl = settings.cvPdf?.asset?.url;
  return (
    <Container measure="prose">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">About</h1>
      <p className="mb-8 text-lg text-[var(--color-fg-muted)]">{settings.shortBio}</p>
      {settings.longBio ? (
        <Prose>
          <PortableText value={settings.longBio} />
        </Prose>
      ) : null}
      {cvUrl ? (
        <a
          href={cvUrl}
          download
          data-analytics="cv_download"
          className="mono mt-10 inline-block border border-[var(--color-border)] px-4 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-fg)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Download CV (PDF)
        </a>
      ) : null}
    </Container>
  );
}
