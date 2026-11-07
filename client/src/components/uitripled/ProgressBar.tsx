/*
 * Adapted from UI TripleD "animated-progress-shadcnui" — https://ui.tripled.work/r/animated-progress-shadcnui.json
 * Retrieved 2026-10-18, sha256 4e8bee1b9f24.
 * Copyright (c) 2026 uitripled. MIT — see THIRD_PARTY_NOTICES.md
 * Өөрчлөлт: framer-motion-гүй CSS port (сагсны drawer нь eager bundle-д орно), бодит утга props-оор
 * (demo 75% биш), `role="progressbar"` + `aria-valuenow`, токен өнгө, gradient-гүй.
 */
import { cn } from "@/lib/utils";

/** 0–1 харьцааг харуулах нимгэн зурвас (үнэгүй хүргэлт, гишүүнчлэлийн түвшин). */
export default function ProgressBar({ ratio, label, className }: { ratio: number; label: string; className?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
  return (
    <div className={cn("sf-progress", className)} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={label}>
      <span className="sf-progress-fill" style={{ transform: `scaleX(${percent / 100})` }} />
    </div>
  );
}
