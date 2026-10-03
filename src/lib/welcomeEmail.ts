/**
 * The email a new subscriber receives. Kept apart from the route so the copy
 * can be read and tested without standing up a request.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mtaha3.bio';

export const WELCOME_SUBJECT = 'Thanks for subscribing';

export function welcomeText(): string {
  return [
    'Thanks for subscribing.',
    '',
    "You'll get new essays and notes from mtaha3.bio in your inbox — writing on AI,",
    "product, and what I'm learning. Nothing else, and not often.",
    '',
    'Stay tuned.',
    '',
    '— Muath',
    '',
    `${SITE}`,
    '',
    "If you'd rather not receive these, reply to this email and I'll take you off the list.",
  ].join('\n');
}

export function welcomeHtml(): string {
  // Deliberately plain: email clients mangle anything clever, and several
  // ignore dark backgrounds, so this stays light with a single accent.
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1b1b1f;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e6e3dc;border-radius:4px;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0 0 20px;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;color:#8a8780;">mtaha3.bio</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;font-weight:600;">Thanks for subscribing.</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#44433f;">
            You'll get new essays and notes in your inbox — writing on AI, product, and what
            I'm learning. Nothing else, and not often.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#44433f;">Stay tuned.</p>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#44433f;">— Muath</p>
          <p style="margin:0;">
            <a href="${SITE}" style="display:inline-block;padding:10px 18px;border:1px solid #c8922f;border-radius:3px;color:#8a6417;text-decoration:none;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">Visit the site</a>
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 32px 28px;">
          <p style="margin:0;padding-top:20px;border-top:1px solid #e6e3dc;font-size:12px;line-height:1.6;color:#8a8780;">
            If you'd rather not receive these, reply to this email and I'll take you off the list.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
