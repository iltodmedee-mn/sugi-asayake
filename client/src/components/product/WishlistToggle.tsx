/*
 * Adapted from UI TripleD "heart-favorite-shadcnui" — https://ui.tripled.work/r/heart-favorite-shadcnui.json
 * Retrieved 2026-10-18, sha256 44c5289aea83.
 * Copyright (c) 2026 uitripled. MIT — see THIRD_PARTY_NOTICES.md
 * Өөрчлөлт: framer-motion-гүй CSS "pop" (карт нь нүүрний eager bundle-д орно), `aria-pressed`,
 * бодит хүслийн жагсаалтын mutation-аар, токен өнгө, монгол нэр (useProductName).
 */
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Хүслийн жагсаалтын зүрх. Нэр нь тогтмол ("…-г хүслийн жагсаалтад нэмэх") — төлөвийг
 * `aria-pressed` хэлнэ (ARIA toggle button-ийн загвар; нэр төлөвөөр солигдвол дэлгэц
 * уншигч "дарагдсан" гэж хоёр удаа хэлнэ). Нэвтрээгүй бол дуудагч `startLogin()` хийнэ.
 */
export default function WishlistToggle({ name, saved, onToggle, className }: {
  /** Харагдах барааны нэр (`useProductName().primary`). */
  name: string;
  saved: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button type="button" className={cn("sf-wish", saved && "is-saved", className)} aria-pressed={saved} aria-label={`${name}-г хүслийн жагсаалтад нэмэх`} onClick={onToggle}>
      <Heart size={16} aria-hidden="true" />
    </button>
  );
}
