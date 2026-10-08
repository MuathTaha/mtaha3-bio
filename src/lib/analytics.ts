import { sendGAEvent } from '@next/third-parties/google';

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
 * Sends one custom event to every analytics tool that is switched on, under the
 * same name, so a Plausible goal and a GA4 event never drift apart.
 *
 * Both destinations no-op safely when unconfigured: GA4's helper only pushes to
 * a dataLayer that the tag creates, and `window.plausible` is undefined until
 * the Plausible tag renders.
 */
export function trackEvent(name: string, props?: EventProps) {
  sendGAEvent('event', name, props ?? {});

  if (typeof window !== 'undefined') {
    window.plausible?.(name, props ? { props } : undefined);
  }
}
