/*
 * Adapted from UI TripleD "image-slider-card-shadcnui" — https://ui.tripled.work/r/image-slider-card-shadcnui.json
 * Retrieved 2026-10-18, sha256 5d035bd70d30. Copyright (c) 2026 uitripled. MIT — see THIRD_PARTY_NOTICES.md
 * Өөрчлөлт: Unsplash demo слайдын оронд барааны бодит зураг (ResponsivePicture, AVIF→WebP),
 * цэгийн оронд thumbnail tablist (roving tabindex), монгол нэр, `motion.img` → LazyMotion `m.div`,
 * хуудас ачаалах үед хөдөлгөөнгүй (`AnimatePresence initial={false}` — LCP зураг нуугдахгүй),
 * хурууны шудралт (drag feature-гүй, pointer event), томруулах (ImageLightbox) товч хэвээр.
 */
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import ResponsivePicture from "@/components/ResponsivePicture";
import { PRODUCT_FULL_WIDTH, PRODUCT_MAIN_IMAGE_SIZES } from "@shared/image-variants";

/**
 * PDP-ийн галерей. Сонгосон индекс нь ProductDetail.tsx-ийн `activeImage` (ImageLightbox-той
 * хуваалцана) — энд өөр төлөв үүсгэхгүй. Гар: ←/→ дараалал, Home/End эхлэл/төгсгөл.
 */
export default function ProductGallery({ images, index, onIndexChange, onZoom, alt, children }: {
  images: string[];
  index: number;
  onIndexChange: (index: number) => void;
  onZoom: () => void;
  alt: string;
  /** Зураг дээрх давхарга (ProductFacts). */
  children?: ReactNode;
}) {
  const reduceMotion = useReducedMotion();
  const count = images.length;
  const current = Math.min(index, Math.max(0, count - 1));
  const thumbs = useRef<Array<HTMLButtonElement | null>>([]);
  const swipeStart = useRef<number | null>(null);
  // Шудралтын дараах `click` нь томруулах цонхыг нээхгүй.
  const swiped = useRef(false);

  const go = (next: number, focusThumb = false) => {
    if (count < 2) return;
    const wrapped = (next + count) % count;
    onIndexChange(wrapped);
    if (focusThumb) thumbs.current[wrapped]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const fromThumb = (event.target as HTMLElement).getAttribute("role") === "tab";
    if (event.key === "ArrowLeft") { event.preventDefault(); go(current - 1, fromThumb); }
    else if (event.key === "ArrowRight") { event.preventDefault(); go(current + 1, fromThumb); }
    else if (event.key === "Home") { event.preventDefault(); go(0, fromThumb); }
    else if (event.key === "End") { event.preventDefault(); go(count - 1, fromThumb); }
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") swipeStart.current = event.clientX;
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start === null) return;
    const delta = event.clientX - start;
    if (Math.abs(delta) > 40) { swiped.current = true; go(current + (delta < 0 ? 1 : -1)); }
  };

  return (
    <div className="sf-gallery" role="group" aria-roledescription="carousel" aria-label="Барааны зураг" onKeyDown={onKeyDown}>
      <div className="sf-gallery-stage" onClick={() => { if (swiped.current) { swiped.current = false; return; } onZoom(); }} onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
        <AnimatePresence initial={false}>
          <m.div
            key={images[current]}
            className="sf-gallery-slide"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: .985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.01 }}
            transition={{ duration: reduceMotion ? 0 : .3, ease: "easeInOut" }}
          >
            <ResponsivePicture src={images[current]!} fullWidth={PRODUCT_FULL_WIDTH} sizes={PRODUCT_MAIN_IMAGE_SIZES} alt={count > 1 ? `${alt} — ${current + 1}/${count}` : alt} />
          </m.div>
        </AnimatePresence>
        {count > 1 ? (
          <>
            <button type="button" className="sf-gallery-nav is-prev" onClick={event => { event.stopPropagation(); go(current - 1); }} aria-label="Өмнөх зураг"><ChevronLeft size={18} aria-hidden="true" /></button>
            <button type="button" className="sf-gallery-nav is-next" onClick={event => { event.stopPropagation(); go(current + 1); }} aria-label="Дараах зураг"><ChevronRight size={18} aria-hidden="true" /></button>
          </>
        ) : null}
        <button type="button" className="sf-gallery-zoom" onClick={event => { event.stopPropagation(); onZoom(); }} aria-label="Зургийг томруулж харах"><Search size={17} aria-hidden="true" /></button>
        {children}
        <span className="sr-only" role="status">{`Зураг ${current + 1} / ${count}`}</span>
      </div>
      {count > 1 ? (
        <div className="sf-gallery-thumbs" role="tablist" aria-label="Барааны зураг">
          {images.map((image, thumbIndex) => (
            <button
              key={image}
              ref={node => { thumbs.current[thumbIndex] = node; }}
              type="button"
              role="tab"
              aria-selected={thumbIndex === current}
              tabIndex={thumbIndex === current ? 0 : -1}
              className="sf-gallery-thumb"
              onClick={() => onIndexChange(thumbIndex)}
              aria-label={`${thumbIndex + 1} дэх зургийг харах`}
            >
              <ResponsivePicture src={image} fullWidth={PRODUCT_FULL_WIDTH} sizes="88px" alt="" loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
