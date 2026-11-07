import { formatMnt } from "@shared/format";
import { cn } from "@/lib/utils";

/**
 * Үнэ (2026-10-18). Одоогийн үнэ бэх өнгөөр (`--ck-ink`) — жижиг улаан текст харанхуй горим
 * ба 13 баярын палитрт AA-г барьдаггүй тул хямдралыг хувийн тэмдэг + зурсан хуучин үнэ хэлнэ.
 * `stacked` — сүлжээний картад хуучин үнийн мөр хоосон ч өндрөө эзэлнэ, тиймээс нэг эгнээний
 * холимог картуудын үнэ нэг шугам дээр сууна.
 */
export default function PriceBlock({ priceMnt, compareAtMnt, layout = "inline", className }: {
  priceMnt: number;
  compareAtMnt: number | null;
  layout?: "inline" | "stacked";
  className?: string;
}) {
  return (
    <span className={cn("sf-price", `sf-price--${layout}`, className)}>
      {compareAtMnt ? (
        <s className="sf-price-was"><span className="sr-only">Хуучин үнэ </span>{formatMnt(compareAtMnt)}</s>
      ) : layout === "stacked" ? <span className="sf-price-was" aria-hidden="true" /> : null}
      <strong className="sf-price-now">{formatMnt(priceMnt)}</strong>
    </span>
  );
}
