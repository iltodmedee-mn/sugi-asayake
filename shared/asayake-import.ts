/**
 * asayake.mn (Tom-ийн Zochil дэлгүүр) → энэ сайтын каталог (2026-11-07, `/grill-me`
 * session-ий шийдвэр). Цэвэр функцууд л — сүлжээ, DB-гүй — тул
 * `server/asayake-import.test.ts` тулгана; IO нь `scripts/import-asayake-products.ts`.
 *
 * Шийдвэрүүд (Tom: "бүгд тийм"):
 *  - баркод (`products.sku` = JAN = Zochil-ийн `sku`)-оор тулгана;
 *  - таарсан бараа: үнэ, хямдрал, нөөц, зураг asayake.mn-ээс ДАРЖ бичнэ; тайлбар,
 *    монгол нэр sugi-д ХООСОН бол л нөхнө;
 *  - шинэ бараа: НООРОГ (isPublished=false), ангиллыг нэрээр тааруулна, таараагүй нь
 *    нуугдмал "Ангилах шаардлагатай" ангилалд;
 *  - зөвхөн sugi-д байгаа барааг хөндөхгүй — жагсаалтаар тайлагнана;
 *  - нөөц нь онлайн биелүүлэлтийн (fulfillment-default) салбарт (updateAdminProduct
 *    нь өөрөө тийшээ бичдэг).
 */

/** Zochil-ийн Next.js хуудасны `__NEXT_DATA__.props.pageProps.products[]`-ийн бидэнд хэрэгтэй хэсэг. */
export type ZochilProduct = {
  id: number;
  name: string;
  status?: string | null;
  price: string | number | null;
  sale_price?: string | number | null;
  stock?: number | null;
  sku?: string | null;
  image?: string | null;
  /** JSON мөр (`[{"url":"…"}]`) эсвэл аль хэдийн задалсан массив. */
  images?: string | Array<{ url?: string }> | null;
  description?: string | null;
  variants?: unknown[] | null;
  brand_id?: number | null;
};

export type AsayakeItem = {
  zochilId: number;
  sku: string;
  name: string;
  /** Кирилл үсэг агуулсан нэр л — латин нэрийг `nameMn` болгохгүй. */
  nameMn: string | null;
  priceMnt: number;
  compareAtPriceMnt: number | null;
  stock: number;
  imageUrls: string[];
  description: string | null;
  brand: string | null;
  categoryNames: string[];
  hasVariants: boolean;
};

export type SugiProductRow = {
  id: number;
  sku: string;
  name: string;
  nameMn: string | null;
  description: string | null;
  imageUrl: string | null;
  priceMnt: number;
  compareAtPriceMnt: number | null;
  stockQuantity: number;
  variantCount: number;
};

/** "4 541082 000756", "04541082000756" → "4541082000756" (EAN-13/8-ийн тэргүүлэх 0-ийг тэгшитгэнэ). */
export function normaliseBarcode(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").replace(/^0+/, "");
}

const CYRILLIC = /[Ѐ-ӿ]/;

/** "176900.00" → 176900. Буруу/хоосон утга → null. */
export function parseMnt(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

/** Zochil-ийн тайлбар HTML (`<p><strong>…</strong></p>`) → энэ сайтын энгийн текст (PDP нь `<p>` дотор текст зурдаг). */
export function htmlToPlainText(html: string | null | undefined): string | null {
  if (!html) return null;
  const text = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])\s*>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

function imageUrlsOf(p: ZochilProduct): string[] {
  let list: Array<{ url?: string }> = [];
  if (Array.isArray(p.images)) list = p.images;
  else if (typeof p.images === "string" && p.images.trim()) {
    try {
      const parsed = JSON.parse(p.images);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }
  const urls = list.map(x => x?.url).filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u));
  if (!urls.length && p.image && /^https:\/\//.test(p.image)) urls.push(p.image);
  return [...new Set(urls)];
}

/**
 * Zochil-ийн нэг барааг импортын хэлбэрт. Баркод/үнэгүй барааг (импортлох боломжгүй)
 * null болгоно. Хямдрал: `sale_price` < `price` бол үнэ = sale_price, хуучин үнэ = price.
 */
export function toAsayakeItem(p: ZochilProduct, extra: { brand?: string | null; categoryNames?: string[] } = {}): AsayakeItem | null {
  const sku = normaliseBarcode(p.sku);
  const price = parseMnt(p.price);
  if (!sku || price === null || price === 0) return null;
  const sale = parseMnt(p.sale_price);
  const onSale = sale !== null && sale > 0 && sale < price;
  const name = (p.name ?? "").replace(/\s+/g, " ").trim();
  return {
    zochilId: p.id,
    sku,
    name,
    nameMn: CYRILLIC.test(name) ? name : null,
    priceMnt: onSale ? sale : price,
    compareAtPriceMnt: onSale ? price : null,
    stock: Math.max(0, Math.trunc(p.stock ?? 0)),
    imageUrls: imageUrlsOf(p),
    description: htmlToPlainText(p.description),
    brand: extra.brand?.trim() || null,
    categoryNames: extra.categoryNames ?? [],
    hasVariants: Array.isArray(p.variants) && p.variants.length > 0,
  };
}

export type ProductChanges = {
  priceMnt?: number;
  compareAtPriceMnt?: number | null;
  stockQuantity?: number;
  description?: string;
  nameMn?: string;
  /** Зургийг R2 руу хуулах эх URL (дарж бичнэ). */
  imageSourceUrl?: string;
};

export type ImportPlan = {
  updates: Array<{ productId: number; sku: string; name: string; changes: ProductChanges; hadImage: boolean }>;
  /** Олон хувилбартай бараа — нэг үлдэгдлийг аль хувилбарт бичихийг мэдэхгүй тул хөндөхгүй. */
  skippedMultiVariant: Array<{ productId: number; sku: string; name: string }>;
  unchanged: number;
  creates: AsayakeItem[];
  sugiOnly: Array<{ productId: number; sku: string; name: string }>;
  /** asayake.mn дотор давхардсан баркод (хоёр дахийг нь алгасна). */
  duplicateSkus: string[];
};

/** Хоёр каталогийг тулгаж юу өөрчлөгдөхийг тооцно. DB-д юу ч бичихгүй. */
export function planImport(sugi: SugiProductRow[], asayake: AsayakeItem[]): ImportPlan {
  const bySku = new Map<string, SugiProductRow>();
  for (const row of sugi) bySku.set(normaliseBarcode(row.sku), row);

  const plan: ImportPlan = { updates: [], skippedMultiVariant: [], unchanged: 0, creates: [], sugiOnly: [], duplicateSkus: [] };
  const seen = new Set<string>();
  for (const item of asayake) {
    if (seen.has(item.sku)) {
      plan.duplicateSkus.push(item.sku);
      continue;
    }
    seen.add(item.sku);
    const row = bySku.get(item.sku);
    if (!row) {
      plan.creates.push(item);
      continue;
    }
    if (row.variantCount !== 1) {
      plan.skippedMultiVariant.push({ productId: row.id, sku: row.sku, name: row.name });
      continue;
    }
    const changes: ProductChanges = {};
    if (row.priceMnt !== item.priceMnt) changes.priceMnt = item.priceMnt;
    if ((row.compareAtPriceMnt ?? null) !== item.compareAtPriceMnt) changes.compareAtPriceMnt = item.compareAtPriceMnt;
    if (row.stockQuantity !== item.stock) changes.stockQuantity = item.stock;
    if (!row.description?.trim() && item.description) changes.description = item.description;
    if (!row.nameMn?.trim() && item.nameMn) changes.nameMn = item.nameMn;
    if (item.imageUrls[0]) changes.imageSourceUrl = item.imageUrls[0];
    if (Object.keys(changes).length) plan.updates.push({ productId: row.id, sku: row.sku, name: row.name, changes, hadImage: Boolean(row.imageUrl) });
    else plan.unchanged += 1;
  }
  for (const row of sugi) {
    if (!seen.has(normaliseBarcode(row.sku))) plan.sugiOnly.push({ productId: row.id, sku: row.sku, name: row.name });
  }
  return plan;
}

/** asayake.mn-ийн ангиллын нэрийг sugi-ийн ангилалтай тулгана (том/жижиг үсэг, зай үл хамаарна). */
export function matchCategoryId(names: string[], categories: Array<{ id: number; name: string }>): number | null {
  const key = (s: string) => s.toLocaleLowerCase("mn").replace(/\s+/g, " ").trim();
  const byName = new Map(categories.map(c => [key(c.name), c.id]));
  for (const name of names) {
    const id = byName.get(key(name));
    if (id !== undefined) return id;
  }
  return null;
}

/** Ноорог барааны slug: латин нэрээс + баркод (давхцахгүй). Кирилл нэрд латин үсэг байхгүй бол зөвхөн баркод. */
export function importSlug(item: Pick<AsayakeItem, "name" | "sku">): string {
  const base = item.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 6)
    .join("-");
  return (base ? `${base}-${item.sku}` : `asayake-${item.sku}`).slice(0, 200);
}
