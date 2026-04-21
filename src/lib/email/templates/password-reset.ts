import { APP } from "@/lib/config/app";

export function passwordResetEmail(opts: {
  resetUrl: string;
  recipientName?: string | null;
  expiresInMinutes: number;
}) {
  const greeting = opts.recipientName ? `Hi ${opts.recipientName},` : "Hi,";

  const text = [
    greeting,
    "",
    `We received a request to reset your ${APP.name} password.`,
    "",
    `Reset your password using this link (expires in ${opts.expiresInMinutes} minutes):`,
    opts.resetUrl,
    "",
    "If you didn't request this, you can safely ignore this email — your password won't change.",
    "",
    `— The ${APP.name} team`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;border:1px solid #e7e5e4;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px 0;">
                <div style="display:inline-flex;align-items:center;gap:8px;">
                  <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:#ea580c;color:#fff;border-radius:8px;font-weight:600;">${APP.name.charAt(0)}</span>
                  <span style="font-weight:600;font-size:16px;color:#1c1917;">${APP.name}</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px 8px;">
                <h1 style="margin:0;font-size:22px;line-height:28px;color:#1c1917;">Reset your password</h1>
                <p style="margin:12px 0 0;font-size:14px;line-height:22px;color:#57534e;">
                  ${greeting} we received a request to reset your ${APP.name} password.
                  Click the button below to choose a new one. This link expires in
                  <strong>${opts.expiresInMinutes} minutes</strong>.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px;">
                <a href="${opts.resetUrl}"
                   style="display:inline-block;background:#ea580c;color:#ffffff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">
                  Reset password
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 24px;">
                <p style="margin:0;font-size:12px;line-height:20px;color:#78716c;">
                  Or paste this URL into your browser:<br />
                  <a href="${opts.resetUrl}" style="color:#ea580c;word-break:break-all;">${opts.resetUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px;border-top:1px solid #e7e5e4;background:#fafaf9;">
                <p style="margin:0;font-size:12px;line-height:18px;color:#78716c;">
                  Didn't request this? You can safely ignore this email — your password
                  won't change.
                </p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:#a8a29e;">
            © ${new Date().getFullYear()} ${APP.legal.company}
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html, text };
}
