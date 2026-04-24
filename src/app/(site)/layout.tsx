import type { ReactNode } from 'react';
import { Nav } from '@/components/site/Nav';
import { Footer } from '@/components/site/Footer';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="min-h-[60vh] py-12">{children}</main>
      <Footer />
    </>
  );
}
