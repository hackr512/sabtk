import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Slide = {
  src: string;
  alt: string;
  caption: string;
};

const SLIDES: Slide[] = [
  {
    src: "/images/hero.jpg",
    alt: "Fresh atta, rice, lentils, cooking oil, eggs and vegetables arranged on a kitchen counter",
    caption: "Daily groceries, delivered",
  },
  {
    src: "/images/hero-ration.jpg",
    alt: "Monthly ration sacks of atta, rice, lentils, ghee and spices stacked in a warm kitchen",
    caption: "Monthly ration baskets",
  },
  {
    src: "/images/hero-fresh.jpg",
    alt: "Fresh fruit, vegetables, dairy and eggs laid out on a kitchen counter",
    caption: "Fresh produce every week",
  },
];

const ROTATE_MS = 5000;

export function HeroCarousel({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (paused || reduced) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, ROTATE_MS);
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current);
    };
  }, [paused, reduced]);

  const go = (i: number) => setIndex(((i % SLIDES.length) + SLIDES.length) % SLIDES.length);

  return (
    <div
      className={cn("group/caro relative", className)}
      role="group"
      aria-roledescription="carousel"
      aria-label="SabTk grocery photos"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-[2rem] shadow-pop ring-1 ring-border">
        <div className="aspect-[4/3] w-full lg:aspect-[5/4]">
          {SLIDES.map((slide, i) => (
            <img
              key={slide.src}
              src={slide.src}
              alt={slide.alt}
              width={1600}
              height={1008}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={i === 0 ? "high" : "auto"}
              aria-hidden={i !== index}
              className={cn(
                "absolute inset-0 size-full object-cover transition-[opacity,transform] duration-[900ms] ease-out",
                i === index ? "z-10 scale-100 opacity-100" : "z-0 scale-[1.04] opacity-0",
              )}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 bg-gradient-to-t from-foreground/55 via-foreground/10 to-transparent p-4">
          <span
            key={SLIDES[index].caption}
            className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-foreground backdrop-blur"
          >
            {SLIDES[index].caption}
          </span>
        </div>

        <div className="absolute inset-y-0 z-30 flex w-full items-center justify-between px-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous photo"
            className="grid size-9 place-items-center rounded-full bg-card/80 text-foreground opacity-0 shadow-pop backdrop-blur transition hover:bg-card focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/caro:opacity-100 motion-reduce:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next photo"
            className="grid size-9 place-items-center rounded-full bg-card/80 text-foreground opacity-0 shadow-pop backdrop-blur transition hover:bg-card focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary group-hover/caro:opacity-100 motion-reduce:opacity-100"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2.5">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show photo ${i + 1} of ${SLIDES.length}`}
            aria-current={i === index}
            className={cn(
              "h-2.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              i === index ? "w-8 bg-primary" : "w-2.5 bg-border hover:bg-primary/50",
            )}
          />
        ))}
      </div>
    </div>
  );
}
