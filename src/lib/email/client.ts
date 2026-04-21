import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "EasyMenu <onboarding@resend.dev>";

let cached: Resend | null = null;
function getResend(): Resend | null {
  if (!apiKey) return null;
  if (!cached) cached = new Resend(apiKey);
  return cached;
}

export type EmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string };

/**
 * Send a transactional email via Resend.
 *
 * If RESEND_API_KEY is not configured, the email is logged to the server
 * console instead — handy for local dev so the reset link is still visible
 * to the developer (never to the browser).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<EmailResult> {
  const resend = getResend();
  if (!resend) {
    // Dev fallback — visible in the terminal only
    console.warn(
      `[email:dev] RESEND_API_KEY not set — email NOT sent.\n  To: ${opts.to}\n  Subject: ${opts.subject}\n  Text: ${opts.text ?? "(html only)"}`,
    );
    return { ok: true, id: null };
  }
  try {
    const res = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true, id: res.data?.id ?? null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}
