"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselProps {
  children: React.ReactNode[];
  /** Auto-advance in ms. 0 or omitted disables autoplay. */
  autoplayMs?: number;
  /** Show dot indicators. */
  dots?: boolean;
  /** Show prev/next arrows. */
  arrows?: boolean;
  /** Pause autoplay on hover. */
  pauseOnHover?: boolean;
  className?: string;
  /** Aspect ratio CSS class for the slide container, e.g. 'aspect-[16/9]'. */
  aspect?: string;
}

/**
 * Lightweight hero carousel. Uses opacity+translate crossfade between
 * slides (not continuous scroll) so it works well with full-bleed
 * images. For horizontal scrollable rails use <HorizontalScroll />.
 */
export function Carousel({
  children,
  autoplayMs = 0,
  dots = true,
  arrows = true,
  // Default OFF so autoplay keeps rotating even when the user rests their
  // cursor over the carousel (most marketing carousels behave this way).
  pauseOnHover = false,
  className,
  aspect = "aspect-[16/9]",
}: CarouselProps) {
  const slides = React.Children.toArray(children);
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  // Mobile users get manual swipe/arrows only — autoplay on a small screen
  // disrupts attention and breaks WCAG 2.2.2 (no user-pausable on touch).
  const [isDesktop, setIsDesktop] = React.useState(false);

  const go = React.useCallback(
    (next: number) => setActive((prev) => (next + slides.length) % slides.length),
    [slides.length],
  );

  React.useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    if (!autoplayMs || paused || slides.length < 2 || !isDesktop) return;
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), autoplayMs);
    return () => clearInterval(id);
  }, [autoplayMs, paused, slides.length, isDesktop]);

  // Keyboard arrows when focused
  const rootRef = React.useRef<HTMLDivElement>(null);
  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") go(active - 1);
    if (e.key === "ArrowRight") go(active + 1);
  }

  return (
    <div
      ref={rootRef}
      role="region"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={onKey}
      onMouseEnter={pauseOnHover ? () => setPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setPaused(false) : undefined}
      className={cn(
        "relative overflow-hidden rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
    >
      <div className={cn("relative", aspect)}>
        {slides.map((child, i) => (
          <div
            key={i}
            aria-hidden={i !== active}
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              i === active ? "opacity-100 z-10" : "pointer-events-none opacity-0",
            )}
          >
            {child}
          </div>
        ))}
      </div>

      {arrows && slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(active - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all duration-150 hover:bg-background hover:scale-110 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 text-foreground shadow-md backdrop-blur transition-all duration-150 hover:bg-background hover:scale-110 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : null}

      {dots && slides.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === active ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Horizontal scrollable rail with scroll-snap. Use for category chips,
 * featured product cards, testimonials, etc.
 */
export function HorizontalScroll({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  function scroll(dx: number) {
    scrollRef.current?.scrollBy({ left: dx, behavior: "smooth" });
  }

  return (
    <div className={cn("relative", className)}>
      <div
        ref={scrollRef}
        className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-2"
        style={{ scrollbarWidth: "none" }}
      >
        {children}
      </div>
      {canScrollLeft ? (
        <button
          type="button"
          onClick={() => scroll(-300)}
          aria-label="Scroll left"
          className="absolute left-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-border transition-all duration-150 hover:scale-110 active:scale-95 md:flex"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      ) : null}
      {canScrollRight ? (
        <button
          type="button"
          onClick={() => scroll(300)}
          aria-label="Scroll right"
          className="absolute right-0 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-border transition-all duration-150 hover:scale-110 active:scale-95 md:flex"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
