import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const sendGAEvent = vi.fn();
vi.mock('@next/third-parties/google', () => ({
  sendGAEvent: (...a: unknown[]) => sendGAEvent(...a),
}));

const { trackEvent } = await import('@/lib/analytics');

describe('trackEvent', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    delete window.plausible;
  });

  it('sends the event to GA4', () => {
    trackEvent('cv_download');
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'cv_download', {});
  });

  it('sends the same name to Plausible, so a goal and a GA4 event cannot drift', () => {
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent('newsletter_signup');

    expect(sendGAEvent).toHaveBeenCalledWith('event', 'newsletter_signup', {});
    expect(plausible).toHaveBeenCalledWith('newsletter_signup', undefined);
  });

  it('passes props through to both, nested under `props` for Plausible', () => {
    const plausible = vi.fn();
    window.plausible = plausible;

    trackEvent('search', { search_term: 'sanity' });

    expect(sendGAEvent).toHaveBeenCalledWith('event', 'search', { search_term: 'sanity' });
    expect(plausible).toHaveBeenCalledWith('search', { props: { search_term: 'sanity' } });
  });

  /**
   * Plausible is gated on NEXT_PUBLIC_PLAUSIBLE_DOMAIN, so window.plausible is
   * undefined whenever the tag isn't rendered. An event fired then must not
   * throw and take the calling component's handler down with it.
   */
  it('still reaches GA4, and does not throw, when Plausible is not configured', () => {
    expect(window.plausible).toBeUndefined();
    expect(() => trackEvent('cv_download')).not.toThrow();
    expect(sendGAEvent).toHaveBeenCalledWith('event', 'cv_download', {});
  });
});
