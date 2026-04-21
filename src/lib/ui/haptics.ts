/**
 * Tiny haptic feedback for taps. Calls navigator.vibrate when the device
 * supports it (mostly Android Chrome + some Edge/Firefox mobile). Silent
 * no-op everywhere else, so it's safe to sprinkle on every interactive.
 *
 * `light` is the "tap" pulse — use on every button click / item add.
 * `success` is a celebratory bump — use on order placed / save confirmed.
 * `warn` is a fast double — use on rejection / out-of-stock / form error.
 */

type Pattern = number | number[];

function vibrate(pattern: Pattern) {
  if (typeof window === "undefined") return;
  // Respect motion preference: users who turn off animations also don't want
  // their phone buzzing on every tap.
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return;
  const nav = window.navigator as Navigator & { vibrate?: (p: Pattern) => boolean };
  if (typeof nav.vibrate === "function") {
    try {
      nav.vibrate(pattern);
    } catch {
      /* iOS Safari throws on some versions — ignore */
    }
  }
}

export const haptic = {
  light: () => vibrate(8),
  medium: () => vibrate(15),
  success: () => vibrate([10, 40, 20]),
  warn: () => vibrate([15, 30, 15]),
};
