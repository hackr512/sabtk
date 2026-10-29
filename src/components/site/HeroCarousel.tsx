import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function HeroCarousel({ className, children }: { className?: string; children?: ReactNode }) {
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
      className={cn("storefront-hero group/caro relative isolate overflow-hidden bg-deep", className)}
      role="group"
      aria-roledescription="carousel"
      aria-label="SabTk grocery photos"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="absolute inset-0">
        <div className="size-full">
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
              data-active={i === index}
              className={cn(
                "absolute inset-0 size-full object-cover object-center transition-opacity duration-[900ms] ease-out motion-reduce:transition-none",
                i === index ? "z-10 opacity-100" : "z-0 opacity-0",
              )}
            />
          ))}
        </div>

      </div>
      <div className="storefront-shade pointer-events-none absolute inset-0 z-10" />
      {children}
      <div className="absolute inset-x-0 bottom-4 z-30">
      <div className="container-page flex items-center justify-end gap-2 text-deep-foreground">
        <span className="mr-3 hidden text-xs sm:inline">{SLIDES[index]?.caption} · 0{index + 1} / 03</span>
        <Button type="button" size="icon-sm" variant="on-deep" onClick={() => go(index - 1)} aria-label="Previous photo" title="Previous photo"><ChevronLeft /></Button>
        {SLIDES.map((slide, i) => (
          <Button
            key={slide.src}
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => go(i)}
            aria-label={`Show photo ${i + 1} of ${SLIDES.length}`}
            aria-current={i === index}
            className="w-6 hover:bg-deep-foreground/10"
          ><span className={cn("h-0.5 w-4", i === index ? "bg-lime" : "bg-deep-foreground/40")} /></Button>
        ))}
        <Button type="button" size="icon-sm" variant="on-deep" onClick={() => go(index + 1)} aria-label="Next photo" title="Next photo"><ChevronRight /></Button>
      </div>
      </div>
    </div>
  );
}
