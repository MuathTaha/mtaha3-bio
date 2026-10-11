export type EventProps = Record<string, string | number | boolean>;

type PlausibleFn = ((
  event: string,
  options?: { props?: EventProps },
) => void) & { q?: unknown[] };

declare global {
  interface Window {
    plausible?: PlausibleFn;
  }
}

/**
 * Single place custom events are sent from, so adding or swapping an analytics
 * tool stays one edit rather than a hunt through components. GA4 was removed
 * because it was the only tool here that set cookies, and so the only reason
 * the site needed a consent banner; Vercel Web Analytics covers pageviews
 * without one.
 *
 * Plausible is the only destination that takes named events, and it no-ops
 * safely when unconfigured: `window.plausible` stays undefined until the tag
 * renders, which is gated on NEXT_PUBLIC_PLAUSIBLE_DOMAIN. Vercel Web
 * Analytics needs nothing here — it tracks pageviews on its own.
 */
export function trackEvent(name: string, props?: EventProps) {
  if (typeof window === 'undefined') return;
  window.plausible?.(name, props ? { props } : undefined);
}
