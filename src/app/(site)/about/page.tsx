import { getSiteSettings } from '@/sanity/lib/queries';
import { Container } from '@/components/ui/Container';
import { PageHeader } from '@/components/ui/PageHeader';
import { Prose } from '@/components/ui/Prose';
import { PortableText } from '@/components/site/PortableText';
import { CVDownloadButton } from '@/components/site/CVDownloadButton';

export const metadata = { title: 'About' };
export const revalidate = 300;

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const cvUrl = settings.cvPdf?.asset?.url;
  return (
    <Container measure="prose">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Muath Taha',
            url: process.env.NEXT_PUBLIC_SITE_URL,
            sameAs: settings.socials?.map((s) => s.url) ?? [],
            description: settings.shortBio,
          }),
        }}
      />
      <PageHeader kicker="Who I am" title="About" lede={settings.shortBio} />
      {settings.longBio ? (
        <Prose>
          <PortableText value={settings.longBio} />
        </Prose>
      ) : null}
      {cvUrl ? <CVDownloadButton url={cvUrl} /> : null}
    </Container>
  );
}
