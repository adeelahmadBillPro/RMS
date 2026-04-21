/**
 * Customer-side favorite items — stored in localStorage, scoped per tenant.
 * This is Phase-1: a stateless "heart" that stays on-device. Later we move
 * these into a `CustomerFavorite` Prisma model keyed by userId + menuItemId.
 */
import * as React from "react";

const KEY_PREFIX = "easymenu:fav-items:";

function readSet(slug: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY_PREFIX + slug);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function writeSet(slug: string, set: Set<string>) {
  try {
    localStorage.setItem(KEY_PREFIX + slug, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

export function useFavoriteItems(slug: string): {
  favorites: Set<string>;
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
} {
  const [favorites, setFavorites] = React.useState<Set<string>>(() => new Set());
  React.useEffect(() => {
    setFavorites(readSet(slug));
  }, [slug]);

  const toggle = React.useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        writeSet(slug, next);
        return next;
      });
    },
    [slug],
  );

  const isFavorite = React.useCallback((id: string) => favorites.has(id), [favorites]);

  return { favorites, isFavorite, toggle };
}
