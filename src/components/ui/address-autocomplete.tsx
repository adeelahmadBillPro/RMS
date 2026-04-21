"use client";

import * as React from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from "use-places-autocomplete";
import { MapPin, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

/**
 * Module-level loader so we only ever attach the Google Maps script once
 * per browser session, even if multiple <AddressAutocomplete> instances
 * mount on the same page.
 */
let loaderPromise: Promise<unknown> | null = null;
function loadGoogle(): Promise<unknown> {
  if (loaderPromise) return loaderPromise;
  if (!API_KEY) {
    const rejected = Promise.reject(new Error("NO_KEY"));
    loaderPromise = rejected;
    return rejected;
  }
  // js-api-loader v2 exposes standalone setOptions + importLibrary.
  setOptions({ key: API_KEY, v: "weekly" });
  const p = importLibrary("places");
  loaderPromise = p;
  return p;
}

type Props = {
  id?: string;
  value: string;
  onChange: (value: string, meta?: { lat?: number; lng?: number }) => void;
  placeholder?: string;
  invalid?: boolean;
  /**
   * Two-letter ISO country code(s) to bias suggestions to. Default ["pk"].
   * Pass [] to disable country bias.
   */
  countries?: string[];
};

/**
 * Address input with Google Places autocomplete. If
 * NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is unset, gracefully degrades to a plain
 * text input — same UX, no autocomplete dropdown.
 */
export function AddressAutocomplete({
  id,
  value,
  onChange,
  placeholder = "Street, area, city",
  invalid,
  countries = ["pk"],
}: Props) {
  const [scriptReady, setScriptReady] = React.useState(false);
  const [scriptError, setScriptError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    loadGoogle()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => {
        if (!cancelled) setScriptError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // No API key (or load failed) → plain input, no Places hook calls.
  if (!API_KEY || scriptError) {
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        invalid={invalid}
      />
    );
  }

  if (!scriptReady) {
    // While the script loads, still let the user type — the hook just
    // won't return suggestions yet. The component swaps in below.
    return (
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        invalid={invalid}
      />
    );
  }

  return (
    <PlacesField
      id={id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      invalid={invalid}
      countries={countries}
    />
  );
}

function PlacesField({
  id,
  value,
  onChange,
  placeholder,
  invalid,
  countries,
}: Props) {
  const {
    ready,
    value: hookValue,
    suggestions: { status, data },
    setValue: setHookValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions:
        (countries ?? []).length > 0 ? { country: countries! } : undefined,
    },
    debounce: 250,
  });

  // Mirror the parent value into the hook's internal value when the parent
  // resets it (e.g. cart cleared). Only push DOWN to the hook so we don't
  // loop on every keystroke.
  React.useEffect(() => {
    if (value !== hookValue) setHookValue(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const [open, setOpen] = React.useState(false);
  const [activeIdx, setActiveIdx] = React.useState(0);

  React.useEffect(() => {
    if (status === "OK" && data.length > 0) {
      setOpen(true);
      setActiveIdx(0);
    } else {
      setOpen(false);
    }
  }, [status, data.length]);

  async function pick(description: string) {
    setHookValue(description, false);
    onChange(description);
    clearSuggestions();
    setOpen(false);
    // Best-effort lat/lng resolution. Failure is non-fatal — we still have
    // the human-readable address.
    try {
      const results = await getGeocode({ address: description });
      const first = results[0];
      if (first) {
        const { lat, lng } = await getLatLng(first);
        onChange(description, { lat, lng });
      }
    } catch {
      /* ignore geocode failures */
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || data.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % data.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + data.length) % data.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick0 = data[activeIdx];
      if (pick0) void pick(pick0.description);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <Input
        id={id}
        value={hookValue}
        onChange={(e) => {
          setHookValue(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (status === "OK" && data.length > 0) setOpen(true);
        }}
        onBlur={() => {
          // Delay so a click on a suggestion can fire before we hide.
          setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        invalid={invalid}
        disabled={!ready}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={id ? `${id}-listbox` : undefined}
      />
      {hookValue && (
        <button
          type="button"
          aria-label="Clear address"
          onClick={() => {
            setHookValue("", false);
            onChange("");
            clearSuggestions();
            setOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground-subtle hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && data.length > 0 ? (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-background shadow-lg"
        >
          {data.map((s, i) => {
            const main = s.structured_formatting?.main_text ?? s.description;
            const secondary = s.structured_formatting?.secondary_text;
            return (
              <li key={s.place_id} role="option" aria-selected={i === activeIdx}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    // Prevent the Input's blur from firing first.
                    e.preventDefault();
                  }}
                  onClick={() => void pick(s.description)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                    i === activeIdx ? "bg-primary-subtle" : "hover:bg-surface-muted",
                  )}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{main}</span>
                    {secondary ? (
                      <span className="block truncate text-xs text-foreground-muted">
                        {secondary}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
