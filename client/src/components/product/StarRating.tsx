import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Барааны үнэлгээ (2026-10-18). Өмнө нь Shop-ийн карт `fill="#f0b52d"` hex attribute-аар, нүүрний
 * карт 5 одоор, PDP өөрөөр зурдаг байв — нэг бүрэлдэхүүн, өнгө нь CSS-ийн `currentColor`
 * (`--ck-gold` токен, харанхуй горимд ч солигдоно). Зөвхөн бодит сэтгэгдэлтэй үед дуудагдана
 * (`productCardRating`). Дэлгэц уншигчид нэг өгүүлбэр; харагдах тоонууд aria-hidden.
 */
export default function StarRating({ average, count, filled, variant = "compact", className }: {
  average: string;
  count: number;
  filled: number;
  variant?: "compact" | "stars";
  className?: string;
}) {
  return (
    <span className={cn("sf-rating", className)}>
      <span className="sf-rating-stars" aria-hidden="true">
        {variant === "stars"
          ? Array.from({ length: 5 }, (_, index) => <Star key={index} size={12} className={index < filled ? "is-on" : undefined} />)
          : <Star size={12} className="is-on" />}
      </span>
      <span aria-hidden="true">{average} <em>{`(${count})`}</em></span>
      <span className="sr-only">{`Үнэлгээ ${average} / 5, ${count} сэтгэгдэл`}</span>
    </span>
  );
}
