/**
 * Барааны картын цэвэр дүрэм (2026-10-18, storefront шинэчлэл).
 *
 * Өмнө нь дөрвөн тусдаа карт (Shop-ийн grid, нүүрний shelf, Shop-ийн rail, Профайлын
 * хүслийн жагсаалт) нөөц, брэнд, хямдралын шийдвэрээ тус тусдаа гаргадаг байсан тул
 * нэг нь бэлгийн картыг "нөөц дууссан" гэж, нөгөө нь ангиллын нэрийг брэнд гэж харуулах
 * зэргээр зөрдөг байв. Одоо `client/src/components/product/ProductCard.tsx` нэг л газар
 * эдгээрийг дуудна; React-гүй тул vitest-ээр шалгагдана (`server/product-card.test.ts`).
 */
import { getSalePercent, LOW_STOCK_THRESHOLD } from "./catalog-filter";

export type ProductStockState = "in_stock" | "low_stock" | "out_of_stock" | "always_available";

export type ProductCardStock = { state: ProductStockState; remaining: number | null };

/**
 * Бэлгийн карт нөөц хөндөхгүй (PROJECT-GUIDE: `products.kind === "gift_card"`) тул үргэлж
 * худалдаж авах боломжтой. `stockQuantity` ирээгүй (нүүрний rail-ийн зарим query) бол
 * "нөөцтэй" гэж үзнэ — дутуу өгөгдлөөс болж худалдах товчийг хаахгүй.
 */
export function productCardStock(product: { kind?: string | null; stockQuantity?: number | null }): ProductCardStock {
  if (product.kind === "gift_card") return { state: "always_available", remaining: null };
  if (product.stockQuantity === undefined || product.stockQuantity === null) return { state: "in_stock", remaining: null };
  if (product.stockQuantity <= 0) return { state: "out_of_stock", remaining: 0 };
  if (product.stockQuantity <= LOW_STOCK_THRESHOLD) return { state: "low_stock", remaining: product.stockQuantity };
  return { state: "in_stock", remaining: product.stockQuantity };
}

/** Брэнд → ангилал → дэлгүүрийн нэр: 937 барааны 98 нь брэндгүй тул мөр хэзээ ч хоосон биш. */
export function productCardBrand(product: { brand?: string | null; categoryName?: string | null }, houseBrand: string): string {
  return product.brand?.trim() || product.categoryName?.trim() || houseBrand;
}

export type ProductCardPrice = { priceMnt: number; compareAtMnt: number | null; salePercent: number | null };

/** Хуучин үнэ зөвхөн бодит хямдралтай үед (`getSalePercent`) — хуурамч "хуучин үнэ" гаргахгүй. */
export function productCardPrice(product: { priceMnt: number; compareAtPriceMnt?: number | null }): ProductCardPrice {
  const salePercent = getSalePercent(product.priceMnt, product.compareAtPriceMnt);
  return { priceMnt: product.priceMnt, compareAtMnt: salePercent ? product.compareAtPriceMnt! : null, salePercent };
}

/** Үнэлгээ зөвхөн бодит сэтгэгдэлтэй үед; дундажийг нэг оронтой. */
export function productCardRating(product: { reviewCount?: number | null; avgRating?: number | null }): { average: string; count: number; filled: number } | null {
  const count = product.reviewCount ?? 0;
  if (count <= 0 || product.avgRating === null || product.avgRating === undefined) return null;
  return { average: product.avgRating.toFixed(1), count, filled: Math.max(0, Math.min(5, Math.round(product.avgRating))) };
}
