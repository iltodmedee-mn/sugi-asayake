import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Storefront-ийн жижиг тэмдэг (2026-10-18). shadcn-ий Badge-ийн API, харин загвар нь
 * `client/src/styles/primitives.css`-ийн `sf-badge` (Tailwind-ийн `rounded-*` утга
 * index.css-ийн шүүрдэлтэд 4px болдог тул класс + токеноор). ProductCard-аар нүүрний
 * eager bundle-д ордог тул cva-гүй энгийн map.
 */
const TONES = {
  neutral: "sf-badge--neutral",
  sale: "sf-badge--sale",
  low: "sf-badge--low",
  out: "sf-badge--out",
  rank: "sf-badge--rank",
} as const;

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof TONES };

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn("sf-badge", TONES[tone], className)} {...props} />;
}
