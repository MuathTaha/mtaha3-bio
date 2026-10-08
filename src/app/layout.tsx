import type { Metadata } from 'next';
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/next';
import { PlausibleAnalytics } from '@/components/site/PlausibleAnalytics';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Muath Taha — @mtaha3',
    template: '%s · @mtaha3',
  },
  description: 'Writing on AI, product, and what I\'m learning.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        {/*
          Vercel Web Analytics. In production the script and its beacon are
          served same-origin (/_vercel/insights/…), so the CSP's 'self' already
          covers it; only the dev-only debug script comes from a Vercel host.
        */}
        <Analytics />
        {/* GA4 only loads when NEXT_PUBLIC_GA_ID is set in the environment. */}
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        {/* Likewise Plausible, which is keyed on the domain registered there. */}
        {plausibleDomain ? <PlausibleAnalytics domain={plausibleDomain} /> : null}
      </body>
    </html>
  );
}
