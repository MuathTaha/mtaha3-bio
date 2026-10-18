import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackEvent } from '@/lib/analytics';

describe('trackEvent', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    delete window.plausible;
  });

  it('sends the event to Plausible', () => {
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent('newsletter_signup');

    expect(plausible).toHaveBeenCalledWith('newsletter_signup', undefined);
  });

  it('nests props under `props`, which is the shape Plausible expects', () => {
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent('search', { search_term: 'sanity' });

    expect(plausible).toHaveBeenCalledWith('search', { props: { search_term: 'sanity' } });
  });

  /**
   * Plausible is gated on NEXT_PUBLIC_PLAUSIBLE_DOMAIN, so window.plausible is
   * undefined whenever the tag isn't rendered — which is the current production
   * state. An event fired then must not throw and take the calling component's
   * click handler down with it.
   */
  it('does nothing, and does not throw, when no analytics tool is configured', () => {
    expect(window.plausible).toBeUndefined();
    expect(() => trackEvent('cv_download')).not.toThrow();
  });
});
