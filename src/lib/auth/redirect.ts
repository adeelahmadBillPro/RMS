/**
 * Whitelists callbackUrl values to prevent open-redirect attacks.
 *
 * Only allows same-origin paths starting with a single "/". Anything else
 * (absolute URLs, "//evil.com", javascript: schemes, encoded variants) falls
 * back to the safe default.
 */
export function safeCallbackUrl(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return fallback;

  // Decode once to catch %2F%2Fevil.com style attacks.
  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  // Must start with single "/" and not "//" (which is protocol-relative).
  if (!decoded.startsWith("/")) return fallback;
  if (decoded.startsWith("//")) return fallback;
  if (decoded.startsWith("/\\")) return fallback;

  // Reject any scheme: prefix, backslash escapes, or whitespace.
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded)) return fallback;
  if (/[\s\\]/.test(decoded)) return fallback;

  return decoded;
}
