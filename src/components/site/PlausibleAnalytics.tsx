import Script from 'next/script';

/**
 * Plausible's tracking tag. Rendered only when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is
 * set, so an unconfigured environment loads nothing.
 *
 * `plausible.io` has to be allowed in the CSP's script-src (the tag) and
 * connect-src (the event beacon) — see next.config.ts.
 */
export function PlausibleAnalytics({ domain }: { domain: string }) {
  return (
    <>
      {/*
        The queue stub. trackEvent() may fire before the tag has finished
        loading — Plausible drains window.plausible.q on load, so queued
        events survive instead of hitting an undefined function.
      */}
      <Script id="plausible-queue" strategy="afterInteractive">
        {`window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`}
      </Script>
      {/*
        No `defer`: next/script injects this after hydration, and defer has no
        meaning on a dynamically inserted script.
      */}
      <Script
        id="plausible-tag"
        src="https://plausible.io/js/script.js"
        data-domain={domain}
        strategy="afterInteractive"
      />
    </>
  );
}
