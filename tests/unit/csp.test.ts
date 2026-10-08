import { describe, it, expect } from 'vitest';
import config from '../../next.config';

/** The CSP applied to content pages (the broadest `source` rule). */
async function contentPageCsp(): Promise<string> {
  const headers = await config.headers!();
  const rule = headers.find((h) => h.source === '/(.*)');
  const csp = rule?.headers.find((h) => h.key === 'Content-Security-Policy');
  expect(csp, 'no CSP header on the content-page rule').toBeDefined();
  return csp!.value;
}

function directive(csp: string, name: string): string {
  const found = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(`${name} `));
  expect(found, `missing ${name} directive`).toBeDefined();
  return found!;
}

describe('content security policy', () => {
  it('allows the Plausible tag to load', async () => {
    expect(directive(await contentPageCsp(), 'script-src')).toContain('https://plausible.io');
  });

  /**
   * Plausible posts each pageview and custom event back to plausible.io. With
   * the origin in script-src but not connect-src the tag loads and appears to
   * work while every event is blocked, which is invisible without opening the
   * console — so assert it separately.
   */
  it('allows the Plausible event beacon to be sent', async () => {
    expect(directive(await contentPageCsp(), 'connect-src')).toContain('https://plausible.io');
  });

  it('still allows GA4 and Sanity alongside it', async () => {
    const csp = await contentPageCsp();
    expect(directive(csp, 'script-src')).toContain('https://www.googletagmanager.com');
    expect(directive(csp, 'connect-src')).toContain('https://*.api.sanity.io');
  });
});
