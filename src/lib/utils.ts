import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Slugify a string for URLs: "Burger Hub" -> "burger-hub" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Format paisa (integer) as PKR: 12500 -> "Rs 125.00" */
export function formatMoney(paisa: number, currency = "Rs"): string {
  const value = (paisa / 100).toFixed(2);
  return `${currency} ${value}`;
}

/** Convert decimal rupees to paisa for storage: 125.5 -> 12550 */
export function rupeesToPaisa(rupees: number): number {
  return Math.round(rupees * 100);
}
