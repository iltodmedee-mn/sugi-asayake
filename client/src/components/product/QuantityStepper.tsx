import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Тоо ширхэг (2026-10-18). PDP-ийн компьютерийн мөр ба утасны наалттай мөр ХОЁУЛАА энэ
 * бүрэлдэхүүнийг нэг `quantity` төлөвтэй дуудна (PROJECT-GUIDE: нэг төлөвийг хоёр газар
 * зурвал төлөв нь хуваалцсан байна); сагсны мөр бүр ч мөн. Нэр нь хуучнаараа: PDP-д
 * "Тоо хасах"/"Тоо нэмэх", сагсанд "`${нэр}` — тоо хасах" (e2e cart.spec).
 */
export default function QuantityStepper({ value, onChange, canIncrease, itemName, disabled = false, size = "md", className }: {
  value: number;
  onChange: (value: number) => void;
  /** Нөөцөөс хэтрэхгүй (бэлгийн карт үргэлж true). */
  canIncrease: boolean;
  /** Сагсны мөрөнд: товчны нэрэнд барааны нэр. */
  itemName?: string;
  /** Тухайн мөрийн хүсэлт явж байх үед. */
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const decreaseLabel = itemName ? `${itemName} — тоо хасах` : "Тоо хасах";
  const increaseLabel = itemName ? `${itemName} — тоо нэмэх` : "Тоо нэмэх";
  return (
    <div className={cn("sf-stepper", size === "sm" && "sf-stepper--sm", className)} role="group" aria-label="Тоо ширхэг">
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={disabled || value <= 1} aria-label={decreaseLabel}><Minus size={size === "sm" ? 14 : 16} aria-hidden="true" /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(value + 1)} disabled={disabled || !canIncrease} aria-label={increaseLabel}><Plus size={size === "sm" ? 14 : 16} aria-hidden="true" /></button>
    </div>
  );
}
