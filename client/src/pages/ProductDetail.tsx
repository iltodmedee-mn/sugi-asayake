import { useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, LoaderCircle, ShieldCheck, ShoppingBag, Sparkles, Star, Truck } from "lucide-react";
import { Link, useRoute } from "wouter";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { toast } from "sonner";
import CartDrawer from "@/components/CartDrawer";
import CommerceHeader from "@/components/CommerceHeader";
import GlossaryText from "@/components/GlossaryText";
import ImageLightbox from "@/components/ImageLightbox";
import ShareBar from "@/components/ShareBar";
import ProductSectionJumps from "@/components/ProductSectionJumps";
import ProductFacts from "@/components/ProductFacts";
import { LineSkeleton, Skeleton } from "@/components/Skeleton";
import VariantPicker from "@/components/VariantPicker";
import CarouselShelf from "@/components/home/CarouselShelf";
import ProductCard from "@/components/product/ProductCard";
import PriceBlock from "@/components/product/PriceBlock";
import QuantityStepper from "@/components/product/QuantityStepper";
import StarRating from "@/components/product/StarRating";
import MotionProvider from "@/components/motion/MotionProvider";
import ProductGallery from "@/components/uitripled/ProductGallery";
import ProductInfoTabs, { type ProductInfoTab } from "@/components/uitripled/ProductInfoTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productCardRating } from "@shared/product-card";
import "@/styles/routes/product.css";
import SiteFooter from "@/components/SiteFooter";
import { useAuth } from "@/_core/hooks/useAuth";
import { notifyAddedToCart } from "@/lib/addedToCartToast";
import { trackEvent } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import ReviewThread from "@/components/ReviewThread";
import ReviewPhotoPicker from "@/components/ReviewPhotoPicker";
import ProductQuestions from "@/components/ProductQuestions";
import { useLocale } from "@/hooks/useLocale";
import { useProductName } from "@/hooks/useProductName";
import { translateProductText } from "@shared/product-i18n";
import { useSiteText } from "@/hooks/useSiteText";
import { useStoreSetting } from "@/hooks/useStoreSetting";
import { getCategoryPlaceholderImage, getSalePercent, getStockStatusLabel } from "@shared/catalog-filter";
import { UB_DELIVERY_FEE_MNT } from "@shared/const";
import { formatMnt } from "@shared/format";
import { brandName } from "@/lib/brand";

// A product with no uploaded photos at all falls back to just this one
// placeholder tile -- not a 3-item fake "gallery" of stock photography.
const previewGallery = ["/product-placeholder.svg"];
const messageFrom = (error: unknown) => error instanceof Error ? error.message : "Сагсанд нэмж чадсангүй.";
const reviewMessageFrom = (error: unknown) => error instanceof Error ? error.message : "Сэтгэгдэл илгээж чадсангүй.";

// PREMIUM-FEATURES.md TIER 4: "Хамт авбал тохирно" / "Routine-оо дуусга" —
// shown only when this product is actually a step of a published routine.
// 2026-09-07: `onAdded` opens the shared CartDrawer instead of this
// function's own separate sonner toast.success -- found during the bsb.mn
// mobile-UX pass that this was the ONE add-to-cart entry point on this page
// that behaved differently from the page's main add-to-cart button (which
// opens the drawer, no toast). Both now behave identically, and both fire
// the new notifyAddedToCart() confirmation toast (AddedToCartToast.tsx) on
// top of opening the drawer -- matching bsb.mn's own real behavior of
// showing both at once.
function RoutineCrossSell({ productId, onAdded }: { productId: number; onAdded: () => void }) {
  const textFor = useSiteText();
  const utils = trpc.useUtils();
  const routineQuery = trpc.routines.forProduct.useQuery({ productId });
  const addItem = trpc.cart.addItem.useMutation({
    onSuccess: () => { utils.cart.current.invalidate(); onAdded(); },
    onError: error => toast.error(messageFrom(error)),
  });
  const routine = routineQuery.data;
  if (!routine) return null;
  const otherSteps = routine.steps.filter(step => step.productId !== productId);
  if (!otherSteps.length) return null;

  return <section className="mt-10 rounded-2xl border border-[var(--primary)]/20 bg-[#fff8f4] p-6">
    <p className="flex items-center gap-2 text-[10px] font-extrabold tracking-[.14em] text-[var(--primary)]"><ListChecks size={14} /> {textFor("pdp-text-routine-kicker", "ROUTINE-ОО ДУУСГА")}</p>
    <h3 className="mt-2 font-[var(--font-display)] text-2xl font-semibold tracking-[-.05em]">{textFor("pdp-text-routine-heading", "Хамт авбал тохирно")}</h3>
    <p className="mt-2 text-xs leading-5 text-muted-foreground">Энэ бүтээгдэхүүн <Link href={`/routine/${routine.slug}`} className="font-bold text-[var(--primary)] hover:underline">"{routine.name}"</Link> арчилгааны дараалалд багтдаг.{routine.discountPercent > 0 ? ` Бүгдийг хамт авбал -${routine.discountPercent}% хямдралтай.` : ""}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {otherSteps.map(step => <div key={step.id} className="flex items-center gap-3 rounded-xl bg-white p-3">
        <Link href={`/product/${step.slug}`} className="flex min-w-0 flex-1 items-center gap-3"><img src={step.imageUrl ?? previewGallery[0]} alt={step.name} loading="lazy" className="size-12 shrink-0 rounded-lg object-cover" /><span className="min-w-0"><span className="block text-[10px] font-bold text-[var(--primary)]">{step.stepLabel}</span><strong className="block truncate text-xs">{step.name}</strong><span className="text-[11px] text-muted-foreground">{formatMnt(step.priceMnt)}</span></span></Link>
        <button type="button" disabled={addItem.isPending || step.stockQuantity === 0} onClick={() => addItem.mutate({ productId: step.productId, quantity: 1 }, { onSuccess: () => notifyAddedToCart(`${step.name} сагсанд нэмэгдлээ.`) })} className="shrink-0 rounded-full bg-[#17181b] p-2.5 text-white transition hover:bg-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-40" aria-label={`${step.name} сагслах`}><ShoppingBag size={14} /></button>
      </div>)}
    </div>
    <Link href={`/routine/${routine.slug}`} className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)] hover:underline"><Sparkles size={14} /> Бүтэн routine-г үзэх</Link>
  </section>;
}

// Preference Profile v2 (2026-09-01): product-to-product tag overlap (see
// getRelatedProducts) -- distinct from RoutineCrossSell above (that's a
// curated, admin-authored routine; this is scored automatically) and from
// Shop/Home's RecommendedForYou (that's per-shopper, this has no concept of
// "the current user" at all -- works for an anonymous visitor).
// NEWVISION.md §14 (Phase 2): re-drawn with the same CarouselShelf/
// ProductCard (shelf) primitive as Home.tsx's bestseller/recommended/category
// rails (Isetan's "pairs well with" reference) instead of this page's own
// one-off static grid -- a shopper now sees one consistent "shelf" pattern
// site-wide instead of a 4th bespoke product-card treatment. 2026-10-18: the
// one shared ProductCard falls back to the category placeholder when the row
// carries a categorySlug, else the generic /product-placeholder.svg.
/**
 * "Хамт авдаг" (NEWVISION.md §14, 2026-09-16) — бодит захиалгын түүхээс: энэ
 * барааг авсан хүмүүс ижил захиалгад өөр юу авсан бэ. Доорх RelatedProducts нь
 * ШИНЖ ЧАНАРААР төстэйг, RoutineCrossSell нь admin-ий гараар бүрдүүлсэн
 * дарааллыг харуулдаг — энэ гурав өөр өөр асуултад хариулдаг.
 *
 * Хангалттай түүх хуримтлагдаагүй бол сервер хоосон буцаадаг тул хэсэг
 * БҮХЭЛДЭЭ алга болно (хоосон rail эсвэл зохиомол өгөгдөл харуулахгүй).
 */
function BoughtTogether({ productId }: { productId: number }) {
  const query = trpc.catalog.boughtTogether.useQuery({ productId });
  const products = query.data ?? [];
  if (!products.length) return null;

  return <div className="mt-10">
    <CarouselShelf eyebrow="ХАМТ АВДАГ" title={<>Ихэвчлэн <em>хамт авдаг</em></>} emptyState={null} cardWidth={200} inset>
      {products.map(product => <ProductCard variant="shelf" imageSizes="200px" product={product} key={product.id} />)}
    </CarouselShelf>
  </div>;
}

function RelatedProducts({ productId }: { productId: number }) {
  const relatedQuery = trpc.catalog.related.useQuery({ productId });
  const related = relatedQuery.data ?? [];

  return <div className="mt-10">
    <CarouselShelf eyebrow="ХАМТ ХАРСАН НЬ ТОХИРНО" title={<>Мөн танд <em>таалагдаж магадгүй</em></>} loading={relatedQuery.isLoading} emptyState={null} cardWidth={200} inset>
      {related.map(product => <ProductCard variant="shelf" imageSizes="200px" product={product} key={product.id} />)}
    </CarouselShelf>
  </div>;
}

// Product Q&A (2026-09-13). Staff and verified buyers may answer; anyone
// signed in may ask (the component handles the login prompt itself).
function QuestionsSection({ productId }: { productId: number }) {
  const { isAuthenticated, user } = useAuth();
  const eligibilityQuery = trpc.reviews.eligibility.useQuery({ productId }, { enabled: isAuthenticated });
  const eligibility = eligibilityQuery.data;
  const canAnswer = Boolean(isAuthenticated && (eligibility?.canReview || eligibility?.alreadyReviewed || (user?.role && user.role !== "user")));
  return <ProductQuestions productId={productId} canAnswer={canAnswer} />;
}

const REVIEW_PAGE_SIZE = 20;

function ReviewsSection({ productId }: { productId: number }) {
  const textFor = useSiteText();
  const { isAuthenticated, user } = useAuth();
  const utils = trpc.useUtils();
  // Хуудаслалт (2026-09-21): эхний 20, "Бусад сэтгэгдлийг харах" нь дараагийн 20-ыг
  // сүүлийн id-г cursor болгон татна (бүтэн хуудас ирээгүй = дууссан).
  const reviewsQuery = trpc.reviews.list.useInfiniteQuery({ productId, limit: REVIEW_PAGE_SIZE }, {
    getNextPageParam: last => (last.length === REVIEW_PAGE_SIZE ? last[last.length - 1].id : undefined),
  });
  const eligibilityQuery = trpc.reviews.eligibility.useQuery({ productId }, { enabled: isAuthenticated });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const createReview = trpc.reviews.create.useMutation({
    onSuccess: result => {
      toast.success(result.rewardMnt > 0 ? `Сэтгэгдэл нийтлэгдлээ. Танд ${formatMnt(result.rewardMnt)} дэлгүүрийн зээл нэмэгдлээ!` : "Сэтгэгдэл нийтлэгдлээ. Баярлалаа!");
      setComment("");
      setPhotoUrl(null);
      setRating(5);
      utils.reviews.list.invalidate({ productId });
      utils.reviews.eligibility.invalidate({ productId });
      utils.catalog.bySlug.invalidate();
      utils.catalog.list.invalidate();
    },
    onError: error => toast.error(reviewMessageFrom(error)),
  });
  const reviews = reviewsQuery.data?.pages.flat() ?? [];
  const reviewRewardMnt = Number(useStoreSetting()("review-reward-mnt", "0")) || 0;
  const eligibility = eligibilityQuery.data;

  return <section id="product-reviews" className="pdp-anchor-section mt-16 border-t border-border pt-10">
    <h2 className="font-[var(--font-display)] text-3xl font-semibold tracking-[-.06em]">{textFor("pdp-text-reviews-heading", "Хэрэглэгчийн сэтгэгдэл")}{reviews.length ? ` (${reviews.length}${reviewsQuery.hasNextPage ? "+" : ""})` : ""}</h2>
    {reviewsQuery.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Ачааллаж байна...</p>
      : reviews.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">{textFor("pdp-text-reviews-empty", "Одоогоор сэтгэгдэл байхгүй байна. Эхний сэтгэгдлийг та үлдээгээрэй!")}</p>
      : <ReviewThread productId={productId} reviews={reviews} canReply={Boolean(isAuthenticated && (eligibility?.canReview || eligibility?.alreadyReviewed || user?.role && user.role !== "user"))} />}
    {reviewsQuery.hasNextPage && (
      <button type="button" className="thread-load-more" onClick={() => void reviewsQuery.fetchNextPage()} disabled={reviewsQuery.isFetchingNextPage}>
        {reviewsQuery.isFetchingNextPage ? "Ачааллаж байна…" : textFor("pdp-text-reviews-more", "Бусад сэтгэгдлийг харах")}
      </button>
    )}

    {!isAuthenticated ? <p className="mt-7 text-sm text-muted-foreground"><Link href="/login" className="font-bold text-[var(--primary)]">Нэвтэрч</Link> сэтгэгдэл үлдээгээрэй.</p>
      : eligibility?.canReview ? <form onSubmit={event => { event.preventDefault(); createReview.mutate({ productId, rating, comment: comment.trim() || null, imageUrl: photoUrl }); }} className="mt-8 max-w-lg rounded-2xl border border-border bg-muted p-6">
        <p className="text-sm font-bold text-foreground">Сэтгэгдэл үлдээх</p>{reviewRewardMnt > 0 ? <p className="mt-1 text-xs font-bold text-[#2c7650]">{`Сэтгэгдэл бичвэл ${formatMnt(reviewRewardMnt)} дэлгүүрийн зээл бэлэглэнэ.`}</p> : null}
        <div className="mt-3 flex items-center gap-1">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} од өгөх`} aria-pressed={rating === n}><Star size={24} fill={n <= rating ? "#f0b52d" : "none"} stroke={n <= rating ? "#f0b52d" : "#c7c8cc"} /></button>)}</div>
        {/* translate="no" (2026-09-27): TranslateSurface л дэлгэрэнгүй
            байрладаг тул худалдан авагч гадаад хэлээр бичиж байхад тэдний
            бичсэн текстийг дунд нь орчуулж эхэлдэггүй байх ёстой. */}
        <textarea translate="no" value={comment} onChange={event => setComment(event.target.value)} maxLength={2000} rows={3} placeholder="Бүтээгдэхүүний талаарх сэтгэгдлээ бичнэ үү (заавал биш)" className="mt-3 w-full rounded-xl border border-border bg-white p-3 text-sm outline-none focus:border-[var(--primary)]" />
        <ReviewPhotoPicker productId={productId} value={photoUrl} onChange={setPhotoUrl} />
        <button type="submit" disabled={createReview.isPending} className="mt-3 min-h-11 rounded-full bg-[var(--primary)] px-6 text-xs font-bold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-55">{createReview.isPending ? <LoaderCircle className="mx-auto animate-spin" size={15} /> : "Нийтлэх"}</button>
      </form>
      : eligibility?.alreadyReviewed ? <p className="mt-7 text-sm text-muted-foreground">Та энэ бүтээгдэхүүнд сэтгэгдэл бичсэн байна. Баярлалаа!</p>
      : eligibilityQuery.isSuccess ? <p className="mt-7 text-sm text-muted-foreground">{textFor("pdp-text-reviews-eligibility", "Зөвхөн энэ бүтээгдэхүүнийг захиалсан хэрэглэгч сэтгэгдэл бичих боломжтой.")}</p>
      : null}
  </section>;
}

export default function ProductDetail() {
  const [, params] = useRoute("/product/:slug");
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const valueForSetting = useStoreSetting();
  const supplierText = useSiteText();
  const deliveryFeeUbMnt = Number(valueForSetting("delivery-fee-ub-mnt", String(UB_DELIVERY_FEE_MNT)));
  const [cartOpen, setCartOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // 2026-09-23: toast-д харагдах нэрийг `useProductName()`-ээр (PROJECT-GUIDE:
  // storefront барааны нэрийг зөвхөн түүгээр харуулна). Түүний утга mutation-аас
  // ХОЙШ тооцогддог тул ref-ээр дамжуулна.
  const addedNameRef = useRef("");
  const utils = trpc.useUtils();
  const productQuery = trpc.catalog.bySlug.useQuery({ slug: params?.slug ?? "hada-labo-gokujyun-lotion" });
  const cartQuery = trpc.cart.current.useQuery();
  const addItem = trpc.cart.addItem.useMutation({ onSuccess: () => { utils.cart.current.invalidate(); setCartOpen(true); notifyAddedToCart(`${addedNameRef.current || "Бараа"} сагсанд нэмэгдлээ.`); }, onError: error => toast.error(messageFrom(error)) });
  const product = productQuery.data;
  const cartCount = cartQuery.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  // PHASE 2 of product variants: only queried to find out whether this
  // product has more than one option — a single-variant product (the common
  // case) never shows a picker and behaves exactly as before variants
  // existed. All of this must run on every render, same as `gallery` below.
  const variantsQuery = trpc.catalog.variants.useQuery({ productId: product?.id ?? 0 }, { enabled: Boolean(product) });
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  // 2026-09-23: галерей/lightbox/тоо ч мөн адил дахин эхэлнэ. Холбоотой
  // бараа/"хамт авдаг"/routine-ийн холбоос зөвхөн замын параметрийг сольдог
  // тул компонент unmount болдоггүй: 5 зурагтай бараа дээр 4-р зургийг
  // сонгоод 2 зурагтай бараа руу орвол үндсэн зураг нь 2 дахийг харуулах
  // (clamp) атлаа ямар ч thumbnail тодрохгүй, lightbox нь өөр индексээс
  // нээгдэнэ.
  useEffect(() => {
    setSelectedVariantId(null);
    setActiveImage(0);
    setLightboxOpen(false);
    setQuantity(1);
  }, [product?.id]);
  useEffect(() => {
    if (product) trackEvent("view_item", { value: product.priceMnt, items: [{ item_id: product.sku, item_name: product.name, price: product.priceMnt, quantity: 1 }] });
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (selectedVariantId !== null) return;
    const variants = variantsQuery.data;
    if (!variants?.length) return;
    // 2026-09-27: сая нэвтэрсэн худалдан авагч default variant-аа сонгосон
    // байтал тэр яг сарнинал дууссан бол "Нөөц дууссан" дэлгэц шууд харна --
    // default-ыг эхлээд л ЗӨВХӨН нөөцтэй бол сонго, дараа нь нөөцтэй ямар ч
    // variant, эцэст нь (бүгд дууссан бол) хуучин зан төлөв.
    const defaultVariant = variants.find(variant => variant.isDefault);
    const preferred = (defaultVariant && defaultVariant.stockQuantity > 0 ? defaultVariant : null)
      ?? variants.find(variant => variant.stockQuantity > 0)
      ?? defaultVariant
      ?? variants[0];
    setSelectedVariantId(preferred.id);
  }, [variantsQuery.data, selectedVariantId]);
  // A quantity chosen against one variant's stock isn't necessarily valid
  // for another (e.g. 5 units of a 170ml option, then switching to a
  // near-sold-out 400ml one) -- reset to 1 on every switch rather than
  // leaving a stale number the server would just reject anyway.
  useEffect(() => { setQuantity(1); }, [selectedVariantId]);
  // NOTE: this hook must run on every render (loading/error/success alike) —
  // React requires the same hooks in the same order every time. Computing it
  // here, before any early `return`, is what fixes the
  // "Rendered more hooks than during the previous render" crash.
  const gallery = useMemo(() => {
    if (!product) return previewGallery;
    // A category-appropriate placeholder (shampoo bottle, lipstick, etc.)
    // reads as far less "broken" than one generic bottle icon on every
    // product that still lacks a real photo (see PRODUCT-IMPORT.md).
    const categoryFallback = [getCategoryPlaceholderImage(product.categorySlug)];
    try {
      const saved = product.galleryJson ? JSON.parse(product.galleryJson) : [];
      return Array.from(new Set([product.imageUrl, ...(Array.isArray(saved) ? saved : [])].filter((image): image is string => typeof image === "string" && image.length > 0))).slice(0, 6).concat(product.imageUrl ? [] : categoryFallback);
    } catch { return product.imageUrl ? [product.imageUrl] : categoryFallback; }
  }, [product]);

  const locale = useLocale();
  // Монгол нэр (2026-09-20): гарчиг, таб, share бүгд нэг дүрмээр (shared/product-name.ts).
  const displayName = useProductName();
  const names = product ? displayName(product) : { primary: "", secondary: null };
  addedNameRef.current = names.primary;
  const metaSource = product?.shortDescription || product?.description || null;
  useDocumentMeta(product?.name ? `${names.primary} — ${brandName()}` : null, typeof metaSource === "string" ? metaSource.replace(/<[^>]+>/g, "").slice(0, 160) : null);
  if (productQuery.isLoading) {
    return <div className="min-h-screen bg-muted text-foreground"><CommerceHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} backLabel={`${brandName()} дэлгүүр`} /><main className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12" aria-busy="true" aria-label="Бүтээгдэхүүнийг ачаалж байна"><div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:gap-16"><div><Skeleton className="aspect-[4/5] w-full rounded-3xl" /><div className="mt-4 grid grid-cols-3 gap-3">{[0, 1, 2].map(index => <Skeleton key={index} className="aspect-square rounded-2xl" />)}</div></div><section className="max-w-xl pt-4 lg:pt-10"><LineSkeleton width="30%" height="10px" /><Skeleton style={{ width: "80%", height: "52px", marginTop: "14px" }} /><LineSkeleton width="95%" style={{ marginTop: "26px" }} /><LineSkeleton width="70%" style={{ marginTop: "10px" }} /><Skeleton style={{ width: "45%", height: "40px", marginTop: "26px" }} /><Skeleton style={{ width: "100%", height: "48px", marginTop: "26px", borderRadius: "999px" }} /></section></div></main><SiteFooter /><CartDrawer open={cartOpen} onOpenChange={setCartOpen} /></div>;
  }

  if (productQuery.isError || !product) {
    return <div className="min-h-screen bg-muted text-foreground"><CommerceHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} backLabel={`${brandName()} дэлгүүр`} /><main className="mx-auto grid min-h-[62vh] max-w-3xl place-items-center px-4 py-12 sm:px-8"><section className="w-full rounded-[2rem] border border-border bg-white p-8 text-center shadow-[var(--shadow-md)] sm:p-12"><p className="text-[10px] font-extrabold tracking-[.18em] text-[var(--primary-strong)]">CATALOG NOTICE</p><h1 className="mt-4 font-[var(--font-display)] text-4xl font-semibold tracking-[-.07em] sm:text-5xl">Бүтээгдэхүүн олдсонгүй.</h1><p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#67686c]">Таны хайсан бүтээгдэхүүн одоогоор нийтлэгдээгүй, эсвэл холбоос өөрчлөгдсөн байж болно. Манай каталогоос бусад сонголтыг хараарай.</p><Link href="/shop" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--primary)] px-6 text-sm font-bold text-white! transition hover:-translate-y-0.5 hover:bg-[var(--primary-hover)] active:scale-[.97]">Бүтээгдэхүүнүүдийг харах</Link></section></main><SiteFooter /><CartDrawer open={cartOpen} onOpenChange={setCartOpen} /></div>;
  }
  const display = product;
  // PHASE 2 of product variants: once a product has more than one variant,
  // price/stock for the option the shopper has picked take over from the
  // product-level fields (which stay meaningful only for the single-variant
  // case — see syncSoleVariantFromProduct in server/db.ts).
  const variants = variantsQuery.data ?? [];
  const hasVariantChoice = variants.length > 1;
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) ?? null;
  const activePriceMnt = hasVariantChoice && selectedVariant ? selectedVariant.priceMnt : display.priceMnt;
  const activeCompareAtPriceMnt = hasVariantChoice && selectedVariant ? selectedVariant.compareAtPriceMnt ?? null : display.compareAtPriceMnt;
  const activeStockQuantity = hasVariantChoice && selectedVariant ? selectedVariant.stockQuantity : display.stockQuantity;
  const salePercent = getSalePercent(activePriceMnt, activeCompareAtPriceMnt);
  const stockStatus = getStockStatusLabel(activeStockQuantity);
  // 2026-09-27: бэлгийн карт мөр checkout/POS/гар захиалгад нөөц хөндөхгүй
  // (PROJECT-GUIDE) тул storefront-д ч үргэлж худалдаж авах боломжтой байх ёстой.
  const isGiftCard = display.kind === "gift_card";
  const stockExhausted = !isGiftCard && activeStockQuantity <= 0;
  const canIncreaseQuantity = isGiftCard || quantity < activeStockQuantity;

  const addToCart = () => {
    trackEvent("add_to_cart", { value: activePriceMnt * quantity, items: [{ item_id: product.sku, item_name: product.name, price: activePriceMnt, quantity }] });
    if (hasVariantChoice && selectedVariant) addItem.mutate({ variantId: selectedVariant.id, quantity });
    else addItem.mutate({ productId: product.id, quantity });
  };

  const rating = productCardRating(display);
  const activeImageIndex = Math.min(activeImage, Math.max(0, gallery.length - 1));
  const description = translateProductText(display.description ?? display.shortDescription, locale, display);
  const facts = [
    display.netContent ? { label: "Хэмжээ", value: display.netContent } : null,
    display.countryOfOrigin ? { label: "Гарал үүсэл", value: display.countryOfOrigin } : null,
    display.shelfLifeMonths ? { label: "Хадгалах хугацаа", value: `${display.shelfLifeMonths} сар` } : null,
    display.ingredients ? { label: "Найрлага", value: display.ingredients } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);
  // 2026-10-18: тайлбар ба бүтээгдэхүүний мэдээлэл (UI TripleD native-tabs) — худалдан авах
  // хэсгийн доор, ингэснээр үнэ ба "Сагсанд нэмэх" нь эхний дэлгэцэд багтана.
  const infoTabs = ([
    description ? { id: "description", label: "Тайлбар", content: <p className="sf-info-text"><GlossaryText text={description} /></p> } : null,
    facts.length ? { id: "facts", label: "Бүтээгдэхүүний мэдээлэл", content: <dl className="sf-info-facts">{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}<div><dt>Баркод / SKU</dt><dd>{display.sku}</dd></div></dl> } : null,
  ] as Array<ProductInfoTab | null>).filter((tab): tab is ProductInfoTab => tab !== null);
  const addLabel = stockExhausted ? "Нөөц дууссан" : `Сагсанд нэмэх — ${formatMnt(activePriceMnt * quantity)}`;
  const categoryHref = display.categoryName ? `/shop?category=${encodeURIComponent(display.categoryName)}` : "/shop";

  return <MotionProvider><div className="sf-pdp-page min-h-screen bg-muted text-foreground">
    <CommerceHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} backLabel={`${brandName()} дэлгүүр`} />
    <main className="sf-pdp">
      {/* Замын мөр: "ДЭЛГҮҮР" яг энэ бичвэрээр (e2e shop-navigation), одоогийн хуудас aria-current. */}
      <nav className="sf-crumbs" aria-label="Замын мөр">
        <ol>
          <li><Link href="/shop">ДЭЛГҮҮР</Link></li>
          <li><Link href={categoryHref}>{display.categoryName ?? "АРЬС АРЧИЛГАА"}</Link></li>
          <li aria-current="page">{names.primary}</li>
        </ol>
      </nav>
      <div className="sf-pdp-grid">
        <div className="sf-pdp-media">
          <ProductGallery images={gallery} index={activeImageIndex} onIndexChange={setActiveImage} onZoom={() => setLightboxOpen(true)} alt={names.primary}>
            <ProductFacts netContent={display.netContent} countryOfOrigin={display.countryOfOrigin} shelfLifeMonths={display.shelfLifeMonths} ingredients={display.ingredients} />
          </ProductGallery>
          <ImageLightbox images={gallery} index={activeImageIndex} onIndexChange={setActiveImage} open={lightboxOpen} onOpenChange={setLightboxOpen} alt={display.name} />
        </div>
        <section className="sf-pdp-buy" aria-labelledby="pdp-title">
          {display.brand ? <Link href={`/shop?brand=${encodeURIComponent(display.brand)}`} className="sf-pdp-brand">{display.brand}</Link> : <span className="sf-pdp-brand">{brandName()}</span>}
          <h1 id="pdp-title" className="sf-pdp-title">{names.primary}</h1>
          {names.secondary ? <p className="sf-pdp-subtitle">{names.secondary}</p> : null}
          <div className="sf-pdp-meta">
            {rating ? <StarRating average={rating.average} count={rating.count} filled={rating.filled} variant="stars" /> : null}
            <ProductSectionJumps productId={display.id} reviewCount={display.reviewCount} />
          </div>
          {/* Үнэ — `main strong`-ийн ЭХНИЙХ нь (e2e product-variants) тул түүнээс өмнө <strong> бүү нэм. */}
          <div className="sf-pdp-price">
            <div className="sf-pdp-price-row">
              <PriceBlock priceMnt={activePriceMnt} compareAtMnt={salePercent ? activeCompareAtPriceMnt : null} className="sf-price--hero" />
              {salePercent ? <Badge tone="sale">-{salePercent}<i>%</i></Badge> : <span className="sf-pdp-tax">НӨАТ багтсан</span>}
            </div>
            {/* 2026-09-07: эрүүл нөөцөд ч үнэн шошго (getStockStatusLabel), тоогүй. */}
            <p className={`sf-pdp-stock is-${isGiftCard ? "in" : stockStatus.tone}`}><span aria-hidden="true" />{isGiftCard ? "Цахим бэлгийн карт — төлбөр баталгаажмагц код шууд ирнэ" : stockStatus.label}</p>
          </div>
          {hasVariantChoice ? <div className="sf-pdp-variants"><VariantPicker variants={variants} selectedId={selectedVariantId} onSelect={setSelectedVariantId} /></div> : null}
          {/* 2026-09-07 (bsb.mn mobile-UX pass): утсанд доорх наалттай мөр л — нэг дэлгэцэд хоёр
              "Сагсанд нэмэх" мөр харуулахгүй. Хоёр мөр ИЖИЛ quantity/addToCart төлөвтэй. */}
          <div className="sf-pdp-actions">
            <QuantityStepper value={quantity} onChange={setQuantity} canIncrease={canIncreaseQuantity} />
            <Button className="sf-pdp-add" loading={addItem.isPending} disabled={stockExhausted} onClick={addToCart}><ShoppingBag size={17} aria-hidden="true" />{addLabel}</Button>
          </div>
          <ul className="sf-pdp-assurances">
            <li><Truck size={19} aria-hidden="true" /><p><strong>УБ хүргэлт — {formatMnt(deliveryFeeUbMnt)}</strong><span>24–48 цагийн дотор · Салбараас үнэгүй авах</span></p></li>
            <li><ShieldCheck size={19} aria-hidden="true" /><p><strong>Албан ёсны баталгаа</strong><span>{supplierText("brand-text-supplier", "SUGI Drug Store Japan")}</span></p></li>
          </ul>
          <p className="sf-pdp-sku">{`Баркод / SKU: ${display.sku}`}</p>
          <ShareBar title={names.primary} />
        </section>
      </div>
      <ProductInfoTabs items={infoTabs} heading="Бүтээгдэхүүний мэдээлэл" />
      <RoutineCrossSell productId={product.id} onAdded={() => setCartOpen(true)} />
      <BoughtTogether productId={product.id} />
      <RelatedProducts productId={product.id} />
      <ReviewsSection productId={product.id} />
      <QuestionsSection productId={product.id} />
    </main>
    {/* 2026-09-07 (bsb.mn mobile-UX pass): утсанд л харагдах наалттай "тоо + Сагсанд нэмэх" мөр
        (BottomNavBar /product/*-д нуугддаг). Дээрх мөртэй ижил төлөв, ижил handler. */}
    <div className="mobile-sticky-bar pd-sticky-cart sf-pdp-sticky">
      <QuantityStepper value={quantity} onChange={setQuantity} canIncrease={canIncreaseQuantity} />
      <Button className="sf-pdp-add" loading={addItem.isPending} disabled={stockExhausted} onClick={addToCart}>{addLabel}</Button>
    </div>
    <SiteFooter /><CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
  </div></MotionProvider>;
}
