import type { ReactNode } from 'react';
import { Nav } from '@/components/site/Nav';
import { Footer } from '@/components/site/Footer';
import { getAllSeries } from '@/sanity/lib/queries';

export default async function SiteLayout({ children }: { children: ReactNode }) {
  // Fetched here rather than inside Nav, which is a client component. Keeps the
  // nav honest: it lists exactly the series that exist.
  const series = await getAllSeries();

  return (
    <>
      <Nav
        series={series.map((s) => ({
          href: `/series/${s.slug}`,
          label: s.navLabel ?? s.title,
        }))}
      />
      <main className="min-h-[60vh] py-14 sm:py-20">{children}</main>
      <Footer />
    </>
  );
}
