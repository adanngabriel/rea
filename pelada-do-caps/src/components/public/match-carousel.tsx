"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Children, useEffect, useRef, useState } from "react";

/**
 * Jogos da rodada lado a lado: no celular desliza com o dedo (o próximo
 * cartão aparece na borda), no computador tem setas. Abre no jogo em destaque.
 */
export function MatchCarousel({ children, start = 0, label }: { children: React.ReactNode; start?: number; label: string }) {
  const slides = Children.toArray(children);
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(start);

  const slideAt = (i: number) => track.current?.children[i] as HTMLElement | undefined;
  const go = (i: number, behavior: ScrollBehavior = "smooth") => {
    const el = slideAt(i);
    if (el && track.current) track.current.scrollTo({ left: el.offsetLeft - track.current.offsetLeft, behavior });
  };

  useEffect(() => {
    if (start > 0) go(start, "instant");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent([...el.children].indexOf(e.target));
      },
      { root: el, threshold: 0.6 },
    );
    for (const child of el.children) io.observe(child);
    return () => io.disconnect();
  }, [slides.length]);

  if (slides.length === 1) return <>{slides[0]}</>;
  return (
    <section aria-roledescription="carrossel" aria-label={label} className="space-y-3">
      <div ref={track} className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 [scrollbar-width:none] sm:mx-0 sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {slides.map((slide, i) => (
          <div key={i} className="w-[92%] shrink-0 snap-start sm:w-full" aria-roledescription="slide" aria-label={`${i + 1} de ${slides.length}`}>
            {slide}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-start gap-3 sm:justify-center">
        <button type="button" onClick={() => go(Math.max(0, current - 1))} disabled={current === 0} className="btn-ghost btn-sm hidden px-2 sm:inline-flex" aria-label="Jogo anterior">
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ver jogo ${i + 1}`}
              aria-current={i === current}
              className="grid size-6 place-items-center"
            >
              <span className={`block h-2 rounded-full transition-all ${i === current ? "w-5 bg-accent" : "w-2 bg-line"}`} />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => go(Math.min(slides.length - 1, current + 1))} disabled={current === slides.length - 1} className="btn-ghost btn-sm hidden px-2 sm:inline-flex" aria-label="Próximo jogo">
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>
    </section>
  );
}
