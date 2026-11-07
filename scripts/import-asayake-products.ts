// asayake.mn (Tom-ийн Zochil дэлгүүр) → энэ сайтын каталог (2026-11-07).
//
// Tom: "asayake.mn deerh baraanii too bolon baraanii medeelel bas baraanii zrugiig
// asayake.mn ees av!" + "sugi.karkarond baigaa busad buh baraag ustga! zuwhun
// asayake.mn baraanuudiig ashigl!" Дүрмүүд нь shared/asayake-import.ts-ийн толгойд;
// энд зөвхөн IO: asayake.mn-ийн нийтэд нээлттэй хуудсуудыг унших, DB-ээс унших,
// тайлан бичих, `--apply` үед createAdminProduct/updateAdminProduct-оор бичих (салбарын
// нөөцийн дэвтэр, хувилбар, кэш — admin маягттай ижил инвариант).
//
//   pnpm exec tsx scripts/import-asayake-products.ts                    # dry run (юу ч бичихгүй) + тайлан
//   pnpm exec tsx scripts/import-asayake-products.ts --apply            # бичнэ (production биш DB-д л)
//   pnpm exec tsx scripts/import-asayake-products.ts --apply --hide-others   # + asayake.mn-д байхгүй барааг нуух
//
// Сонголтууд:
//   --from-json <файл>   өмнөх run-ий asayake-catalog.json-оос унших (сайтыг дахин татахгүй)
//   --out <хавтас>       тайлангийн хавтас (анхдагч backups/asayake-import/<огноо>/ — gitignore-д)
//   --no-images          зураг R2 руу хуулахгүй (зөвхөн өгөгдөл)
//   --limit <N>          эхний N өөрчлөлт/шинэ бараа л (туршилт)
//   --concurrency <N>    зэрэг боловсруулах барааны тоо (анхдагч 6, дээд 16)
//   --i-know-this-is-production   production (`defaultdb`) дээр --apply хийх (Tom л, staging-ийг шалгасны дараа)
//
// "Устгах" = НИЙТЛЭЛТЭЭС ХАСАХ (isPublished=false): захиалга, нөөцийн түүхтэй барааг
// deleteAdminProduct өөрөө татгалздаг (түүх эвдэрнэ), нуух нь буцаах боломжтой. Бэлгийн
// картыг (kind=gift_card) хэзээ ч нуухгүй — checkout-д зарагддаг.
import "dotenv/config";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { createAdminCategory, createAdminProduct, getDb, updateAdminProduct } from "../server/db";
import { canonicaliseBrandName } from "../server/search/dictionaries";
import { processUploadedImageVariants, IMAGE_MAX_DIMENSION } from "../server/_core/imageProcessing";
import { storagePutImageVariants } from "../server/storage";
import { productCategories, products, productVariants } from "../drizzle/schema";
import { asayakeImageKeyStem, importSlug, planImport, toAsayakeItem, type AsayakeItem, type SugiProductRow, type ZochilProduct } from "../shared/asayake-import";
import { refuseProductionDatabase } from "./_refuse-production";

const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(name);
const option = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const apply = flag("--apply");
const hideOthers = flag("--hide-others");
const withImages = !flag("--no-images");
const limit = option("--limit") ? Number(option("--limit")) : Infinity;
/** Зэрэг боловсруулах барааны тоо. Бараа бүр өөр мөр тул зөрчилгүй; тунелээр нэг бүрчлэн
 *  явуулахад 756 бараа ~30 минут (бараа бүрт ~10 асуулга Токио руу), зурагтай бол 1–2 цаг байв. */
const concurrency = Math.max(1, Math.min(16, Number(option("--concurrency") ?? 6)));
const outDir = option("--out") ?? join("backups", "asayake-import", new Date().toISOString().replace(/[:.]/g, "-"));

const SITE = "https://asayake.mn";
const USER_AGENT = "sugi-asayake-catalog-sync (owner's own store)";
const UNSORTED_CATEGORY = { name: "Ангилах шаардлагатай", slug: "angilakh-shaardlagatai" };

if (apply) refuseProductionDatabase("import-asayake-products");
if (hideOthers && !apply) console.log("(--hide-others зөвхөн --apply-тай бичнэ; энэ удаа тайланд л тоолно)");

type PageProps = {
  products?: ZochilProduct[];
  brands?: Array<{ id: number; name: string }>;
  totalCount?: number;
  activeCategory?: { name?: string } | null;
  categories?: Array<{ id: number; children?: unknown[] }>;
};

async function fetchPageProps(path: string): Promise<PageProps> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${SITE}${path}`, { headers: { "user-agent": USER_AGENT } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) throw new Error("__NEXT_DATA__ олдсонгүй (Zochil хуудасны бүтэц өөрчлөгдсөн?)");
      return JSON.parse(match[1]).props.pageProps as PageProps;
    } catch (error) {
      if (attempt >= 3) throw new Error(`${path}: ${(error as Error).message}`, { cause: error });
      await sleep(2000 * attempt);
    }
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Үндсэн жагсаалт `created_at desc`-ээр эрэмбэлэгддэг ба нэг цагт үүссэн олон бараа
 * хуудас хооронд солигддог (32 хуудаснаас 684/768 л олдсон, 2026-11-07). Тиймээс
 * ангилал бүрээр (`?category_id=`) нэмж татаж, нийлбэрийг `totalCount`-той тулгана.
 */
async function fetchCatalog(): Promise<{ items: AsayakeItem[]; totalCount: number; skipped: number }> {
  const byId = new Map<number, { product: ZochilProduct; categories: Set<string> }>();
  const brands = new Map<number, string>();
  const collect = (pp: PageProps) => {
    for (const b of pp.brands ?? []) brands.set(b.id, b.name);
    const category = pp.activeCategory?.name;
    for (const p of pp.products ?? []) {
      const entry = byId.get(p.id) ?? { product: p, categories: new Set<string>() };
      if (category) entry.categories.add(category);
      byId.set(p.id, entry);
    }
  };
  const listAll = async (query: string) => {
    for (let page = 1; ; page++) {
      const pp = await fetchPageProps(`/products?${query}${query ? "&" : ""}page=${page}`);
      collect(pp);
      const total = pp.totalCount ?? 0;
      await sleep(400);
      if (!pp.products?.length || page * 24 >= total) return total;
    }
  };

  const home = await fetchPageProps("/");
  const categoryIds: number[] = [];
  /** Дэд ангилал ("Маск", "Шампунь") → үндсэн ангиллын нэр ("Арьс арчилгаа") — sugi-д үндсэн ангилал л бий. */
  const topNameOf = new Map<string, string>();
  type Node = { id: number; name?: string; children?: unknown[] };
  const walk = (list: Node[], top: string | null) => {
    for (const c of list) {
      categoryIds.push(c.id);
      const root = top ?? c.name ?? "";
      if (c.name) topNameOf.set(c.name, root);
      walk((c.children ?? []) as Node[], root);
    }
  };
  walk((home.categories ?? []) as Node[], null);
  const totalCount = await listAll("");
  process.stdout.write(`asayake.mn: нийт ${totalCount}, ${categoryIds.length} ангилал уншиж байна`);
  for (const id of categoryIds) {
    await listAll(`category_id=${id}`);
    process.stdout.write(".");
  }
  process.stdout.write("\n");

  let skipped = 0;
  const items: AsayakeItem[] = [];
  for (const { product, categories } of byId.values()) {
    const names = [...categories];
    const tops = names.map(n => topNameOf.get(n)).filter((n): n is string => Boolean(n));
    const item = toAsayakeItem(product, { brand: product.brand_id ? brands.get(product.brand_id) ?? null : null, categoryNames: [...new Set([...tops, ...names])] });
    if (item) items.push(item);
    else skipped += 1;
  }
  return { items, totalCount, skipped };
}

async function loadSugi(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const rows = await db.select({
    id: products.id, sku: products.sku, name: products.name, nameMn: products.nameMn, description: products.description,
    imageUrl: products.imageUrl, priceMnt: products.priceMnt, compareAtPriceMnt: products.compareAtPriceMnt,
    stockQuantity: products.stockQuantity, isPublished: products.isPublished, kind: products.kind,
  }).from(products);
  const variantCount = new Map<number, number>();
  for (const v of await db.select({ productId: productVariants.productId }).from(productVariants)) {
    variantCount.set(v.productId, (variantCount.get(v.productId) ?? 0) + 1);
  }
  return rows.map(r => ({ ...r, variantCount: variantCount.get(r.id) ?? 0 }));
}

/** Zochil CDN-ээс татаж, admin upload-тай ИЖИЛ замаар (WebP + 600px + AVIF) R2 руу. */
async function rehostImage(url: string, sku: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": USER_AGENT } });
  if (!res.ok) throw new Error(`зураг HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const format = (await sharp(buffer).metadata()).format;
  if (!format || !["jpeg", "png", "webp", "gif"].includes(format)) throw new Error(`зургийн төрөл "${format}" дэмжигдээгүй`);
  const variants = await processUploadedImageVariants(buffer, IMAGE_MAX_DIMENSION.product, { flattenAnimation: true });
  return (await storagePutImageVariants(`${asayakeImageKeyStem(sku)}.webp`, variants)).url;
}

function csv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map(r => cols.map(c => cell(r[c])).join(","))].join("\n") + "\n";
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL тохируулаагүй байна — ажиллаж буй хөгжүүлэлтийн хуулбарын .env (ба oci-ca.pem)-ийг энэ фолдерт хуулна уу (docs/OPERATIONS.md §8).");
  process.exit(2);
}
const db = await getDb();
if (!db) throw new Error("DATABASE_URL-д холбогдож чадсангүй (ssh тунель 127.0.0.1:3307 ажиллаж байна уу?)");
mkdirSync(outDir, { recursive: true });

const fromJson = option("--from-json");
const catalog = fromJson
  ? { items: JSON.parse(readFileSync(fromJson, "utf8")) as AsayakeItem[], totalCount: NaN, skipped: 0 }
  : await fetchCatalog();
if (!fromJson) writeFileSync(join(outDir, "asayake-catalog.json"), JSON.stringify(catalog.items, null, 1));

const sugiRows = await loadSugi(db);
const giftCardIds = new Set(sugiRows.filter(r => r.kind === "gift_card").map(r => r.id));
const categories = await db.select({ id: productCategories.id, name: productCategories.name, slug: productCategories.slug }).from(productCategories);
const plan = planImport(sugiRows as SugiProductRow[], catalog.items, categories);
const unsortedCount = plan.creates.filter(c => !c.publish).length;
const imageChanges = plan.updates.filter(u => u.changes.imageSourceUrl);

writeFileSync(join(outDir, "updates.csv"), csv(plan.updates.map(u => ({
  productId: u.productId, sku: u.sku, name: u.name, hadImage: u.hadImage,
  priceMnt: u.changes.priceMnt ?? "", compareAtPriceMnt: u.changes.compareAtPriceMnt === undefined ? "" : u.changes.compareAtPriceMnt ?? "null",
  stockQuantity: u.changes.stockQuantity ?? "", fillsDescription: Boolean(u.changes.description), fillsNameMn: u.changes.nameMn ?? "",
}))));
writeFileSync(join(outDir, "creates.csv"), csv(plan.creates.map(item => ({
  sku: item.sku, name: item.name, priceMnt: item.priceMnt, compareAtPriceMnt: item.compareAtPriceMnt ?? "", stock: item.stock, brand: item.brand ?? "",
  asayakeCategories: item.categoryNames.join(" | "), sugiCategory: categories.find(c => c.id === item.categoryId)?.name ?? UNSORTED_CATEGORY.name,
  published: item.publish,
}))));
writeFileSync(join(outDir, "hide.csv"), csv(plan.hide.map(p => ({ ...p }))));
writeFileSync(join(outDir, "multi-variant-skipped.csv"), csv(plan.skippedMultiVariant.map(p => ({ ...p }))));

const summary = [
  `asayake.mn: ${catalog.items.length} бараа${Number.isFinite(catalog.totalCount) ? ` (сайт ${catalog.totalCount} гэж мэдээлдэг)` : ""}, импортлох боломжгүй ${catalog.skipped}`,
  `sugi: ${sugiRows.length} бараа (бэлгийн карт ${giftCardIds.size})`,
  `таарсан, өөрчлөгдөх: ${plan.updates.length}  — үнэ ${plan.updates.filter(u => u.changes.priceMnt !== undefined).length}, хямдрал ${plan.updates.filter(u => u.changes.compareAtPriceMnt !== undefined).length}, нөөц ${plan.updates.filter(u => u.changes.stockQuantity !== undefined).length}, зураг ${imageChanges.length} (одоо зураггүй ${imageChanges.filter(u => !u.hadImage).length}), тайлбар нөхөх ${plan.updates.filter(u => u.changes.description).length}, монгол нэр нөхөх ${plan.updates.filter(u => u.changes.nameMn).length}`,
  `таарсан, өөрчлөлтгүй: ${plan.unchanged}`,
  `олон хувилбартай тул алгасах: ${plan.skippedMultiVariant.length}`,
  `шинээр үүсэх: ${plan.creates.length} — нийтлэгдэх ${plan.creates.length - unsortedCount}, "${UNSORTED_CATEGORY.name}" (ноорог) ${unsortedCount}`,
  `asayake.mn-д байхгүй (зөвхөн sugi-д): ${plan.sugiOnly.length} — нуух ${plan.hide.length}${hideOthers ? "" : " (--hide-others-гүй тул НУУХГҮЙ)"}`,
  `asayake.mn дотор давхардсан баркод: ${plan.duplicateSkus.length}`,
  `тайлан: ${outDir}`,
];
console.log(summary.join("\n"));
writeFileSync(join(outDir, "summary.txt"), summary.join("\n") + "\n");

if (!apply) {
  console.log("\nDRY RUN — юу ч бичээгүй. Бичихийн тулд --apply.");
  process.exit(0);
}

const failures: Array<{ sku: string; step: string; error: string }> = [];

/** `items`-ийг `concurrency` ширхгээр зэрэг; 25 тутамд явц хэвлэнэ. Амжилттай болсны тоог буцаана. */
async function runPool<T>(items: T[], label: string, work: (item: T) => Promise<void>, skuOf: (item: T) => string, step: string): Promise<number> {
  let next = 0;
  let finished = 0;
  let succeeded = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      try {
        await work(item);
        succeeded += 1;
      } catch (error) {
        failures.push({ sku: skuOf(item), step, error: (error as Error).message });
      }
      finished += 1;
      if (finished % 25 === 0 || finished === items.length) console.log(`  ${label} ${finished}/${items.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return succeeded;
}

const done = await runPool(plan.updates.slice(0, limit), "шинэчилсэн", async update => {
  const { imageSourceUrl, ...fields } = update.changes;
  const imageUrl = withImages && imageSourceUrl ? await rehostImage(imageSourceUrl, update.sku) : undefined;
  await updateAdminProduct({ id: update.productId, ...fields, ...(imageUrl ? { imageUrl } : {}) });
}, update => update.sku, "update");

let unsortedId = categories.find(c => c.slug === UNSORTED_CATEGORY.slug)?.id ?? null;
if (unsortedCount && unsortedId === null) {
  const created = await createAdminCategory({ name: UNSORTED_CATEGORY.name, slug: UNSORTED_CATEGORY.slug, description: "asayake.mn-ээс импортолсон, ангилал нь тааралгүй бараа — /admin-аас зөв ангилалд зөөнө үү.", sortOrder: 99, isActive: false });
  unsortedId = created.id;
}

const createdCount = await runPool(plan.creates.slice(0, limit), "үүсгэсэн", async item => {
    const imageUrl = withImages && item.imageUrls[0] ? await rehostImage(item.imageUrls[0], item.sku) : null;
    await createAdminProduct({
      categoryId: item.categoryId ?? unsortedId!,
      name: item.name,
      nameMn: item.nameMn,
      slug: importSlug(item),
      brand: item.brand ? await canonicaliseBrandName(item.brand) : null,
      description: item.description,
      priceMnt: item.priceMnt,
      compareAtPriceMnt: item.compareAtPriceMnt,
      sku: item.sku,
      imageUrl,
      stockQuantity: item.stock,
      isPublished: item.publish,
    });
}, item => item.sku, "create");

const hidden = hideOthers
  ? await runPool(plan.hide.slice(0, limit), "нуусан", async p => {
    await updateAdminProduct({ id: p.productId, isPublished: false });
  }, p => p.sku, "hide")
  : 0;

writeFileSync(join(outDir, "failures.csv"), csv(failures));
console.log(`\nБИЧСЭН: шинэчилсэн ${done}, үүсгэсэн ${createdCount}, нуусан ${hidden}, алдаа ${failures.length}${failures.length ? ` (${join(outDir, "failures.csv")})` : ""}`);
process.exit(failures.length ? 1 : 0);
