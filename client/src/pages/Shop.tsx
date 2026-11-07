import { trackEvent } from "@/lib/analytics";
import { X, ArrowDownUp, ArrowUpRight, Eye, Grid3x3, LayoutGrid, MapPin, PackageCheck, Phone, RotateCcw, Search, SlidersHorizontal, Sparkles, Truck, Wallet } from "lucide-react";
import { keepPreviousData } from "@tanstack/react-query";
import { scrollElementToTopNow } from "@/lib/scroll";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import CartDrawer from "@/components/CartDrawer";
import CommerceHeader from "@/components/CommerceHeader";
import QuickViewDialog, { type QuickViewProduct } from "@/components/QuickViewDialog";
import ProductCard from "@/components/product/ProductCard";
import MotionProvider from "@/components/motion/MotionProvider";
import ShopPagination from "@/components/uitripled/ShopPagination";
import { AnimatePresence, m } from "framer-motion";
import "@/styles/routes/shop.css";
import RecommendedForYou from "@/components/RecommendedForYou";
import SiteFooter from "@/components/SiteFooter";
import { useCategories } from "@/hooks/useCategories";
import { useShopContact } from "@/hooks/useShopContact";
import { ProductCardSkeleton } from "@/components/Skeleton";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { notifyAddedToCart } from "@/lib/addedToCartToast";
import { filterCatalogBrand, filterCatalogPriceRange, filterCatalogProducts, filterCatalogSkinType, skinTypeLabels, sortCatalogProducts, type CatalogSortOption, type SkinType } from "@shared/catalog-filter";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { rememberRecentlyViewed, resolveRecentlyViewed } from "@shared/recently-viewed";
import { UB_DELIVERY_FEE_MNT } from "@shared/const";
import { useSiteText } from "@/hooks/useSiteText";
import { useT } from "@/hooks/useLocale";
import { useStoreSetting } from "@/hooks/useStoreSetting";
import { useProductName } from "@/hooks/useProductName";
import { formatMnt } from "@shared/format";
import { brandName } from "@/lib/brand";
// 2026-09-04 cohesion audit: this used to be a locally hardcoded 4-of-6-category
// list with its own copy/ordering, independent of (and already drifted from)
// Home.tsx's real 6-category array -- now the same shared source of truth
// (see categories-data.ts), so the empty-catalog discovery cards below can
// never silently disagree with what the rest of the site calls these
// categories again.

/** Grid card width in CSS: 2 / 3 / 4 columns (see .shop-product-grid). */
const SHOP_CARD_SIZES = "(max-width: 760px) 46vw, (max-width: 900px) 31vw, 23vw";
const RECENTLY_VIEWED_KEY = "sugi-asayake-recently-viewed-v1";
// NEWVISION.md §14 (Phase 2): Isetan's small/large grid density toggle --
// a per-device view preference, not catalog state, so localStorage (not
// URL/server) is the right home for it, same reasoning as
// RECENTLY_VIEWED_KEY above.
const DENSITY_KEY = "sugi-asayake-shop-density-v1";
type GridDensity = "comfortable" | "compact";

type RecentlyViewedProps = {
  products: QuickViewProduct[];
  rememberedCount: number;
  onRemember: (id: number) => void;
  onQuickView: (product: QuickViewProduct) => void;
};

function RecentlyViewed({ products, rememberedCount, onRemember, onQuickView }: RecentlyViewedProps) {
  const textFor = useSiteText();
  const unavailableCount = Math.max(0, rememberedCount - products.length);
  const [recentLine1, recentLine2] = textFor("shop-text-recent-heading", "Буцаад\nхараарай.").split("\n");
  return <section className="recently-viewed-section" data-reveal>
    <div className="recently-viewed-heading">
      <div>
        <p className="shop-kicker"><span /> {textFor("shop-text-recent-kicker", "ТАНЫ СҮҮЛД ҮЗСЭН")}</p>
        <h2>{recentLine1} <em>{recentLine2}</em></h2>
      </div>
      <p>{textFor("shop-text-recent-note", "Энэ жагсаалт зөвхөн таны энэ төхөөрөмж дээр хадгалагдана. Нэвтрэх мэдээлэл, захиалга, эсвэл хувийн таних мэдээлэл цуглуулахгүй.")}</p>
    </div>
    {products.length ? <><div className="recently-viewed-grid">{products.map(product => <ProductCard variant="compact" imageSizes="104px" product={product} onNavigate={onRemember} onQuickView={onQuickView} key={product.id} />)}</div>{unavailableCount ? <p className="recently-viewed-notice">{`Таны өмнө үзсэн ${unavailableCount} бүтээгдэхүүн одоогоор онлайн каталогоос хасагдсан байна.`}</p> : null}</> : <div className="recently-viewed-empty"><Eye size={19} /><p>{rememberedCount ? `Таны өмнө үзсэн ${rememberedCount} бүтээгдэхүүн одоогоор онлайн каталогоос хасагдсан байна. Шинэ сонголт нэмэгдэхэд энд дахин гарна.` : "Таны үзсэн бүтээгдэхүүн энд гарна. Бодит каталог нийтлэгдсэний дараа бүтээгдэхүүний картнаас “Шуурхай харах” эсвэл дэлгэрэнгүй хуудас нээгээрэй."}</p></div>}
  </section>;
}

export default function Shop() {
  const qaHistoryMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get("historyQa") : null;
  const initialParams = new URLSearchParams(window.location.search);
  const textFor = useSiteText();
  const t = useT();
  // Монгол нэр (2026-09-20): карт бүр нэг дүрмээр (shared/product-name.ts).
  const displayName = useProductName();
  useDocumentMeta(
    textFor("seo-text-shop-title", `Дэлгүүр — ${brandName()}`),
    textFor("seo-text-shop-description", "Японоос албан ёсоор нийлүүлсэн арьс арчилгаа, эрүүл мэнд, гэр бүлийн хэрэгцээний 900+ бүтээгдэхүүн."),
  );
  const contact = useShopContact();
  // The discovery deck (shown when the catalogue returns nothing) lists the
  // real categories from the database -- same source as the homepage, the
  // header drawer and the footer, so a rename in /admin reaches all four.
  const discoveryCategories = useCategories();
  const branchesQuery = trpc.content.branches.useQuery();
  const branchCount = branchesQuery.data?.length ?? 0;
  const [shopLine1, shopLine2] = textFor("shop-text-hero-heading", "Өдөр тутмын\nсонголтууд.").split("\n");
  const [discoveryLine1, discoveryLine2] = textFor("shop-text-discovery-heading", "Өнөөдрийн хэрэгцээ\nэндээс эхэлнэ.").split("\n");
  const valueForSetting = useStoreSetting();
  const deliveryFeeUbMnt = Number(valueForSetting("delivery-fee-ub-mnt", String(UB_DELIVERY_FEE_MNT)));
  // Variable-count phrase list (one per line), unlike Home.tsx's sunrise
  // ribbon which has exactly 3 fixed home-text-ribbon-phraseN slots -- Tom
  // asked to be able to add/remove however many phrases he wants here, so
  // this is one textarea-editable slot split on "\n" instead. .filter(Boolean)
  // drops blank lines (e.g. a trailing newline) rather than rendering an
  // empty marquee segment. Rendered into BOTH the visible and the
  // aria-hidden duplicate row via shopRibbonRow() so an edit can never
  // make the two rows drift out of sync -- same technique as Home.tsx's
  // ribbonRow().
  const shopRibbonPhrases = textFor("home-shop-ribbon-phrases", "CURATED IN JAPAN\nFIND YOUR DAILY CARE\nУЛААНБААТАР / MONGOLIA").split("\n").map(line => line.trim()).filter(Boolean);
  const shopRibbonRow = (keyPrefix: string) => (
    <>
      {shopRibbonPhrases.map((phrase, index) => (
        <Fragment key={`${keyPrefix}-${index}`}><span>{phrase}</span><i /></Fragment>
      ))}
    </>
  );
  // Prefills from the header search's "бүх дэлгүүрээс харах" link
  // (/shop?q=...) so a search started from any page lands here already
  // filtered, instead of dropping the shopper's query on the floor.
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [category, setCategory] = useState(() => initialParams.get("category") ?? "all");
  // NEWVISION.md §5: the homepage's "Топ брэндүүд" tiles link here with
  // ?brand=<real brand name> -- without a real URL-state facet, those tiles
  // would be links that filter nothing.
  const [brand, setBrand] = useState(() => initialParams.get("brand") ?? "all");
  // NEWVISION.md §14 (Phase 2): Isetan's deep faceted filter, starting with
  // a price range -- kept as text state (not number) so the input can be
  // legitimately empty (no floor/ceiling) while typing, same reasoning as
  // Number(initialParams.get("page")) below but without that immediate
  // coercion, since "" -> 0 would wrongly mean "only free products".
  const [minPrice, setMinPrice] = useState(() => initialParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(() => initialParams.get("maxPrice") ?? "");
  // 2026-09-27: сервер `z.number().int().nonnegative()` шаарддаг тул сөрөг/
  // бутархай/NaN утга явбал zod татгалздаг байв (бүх каталог сүлжээний алдаа
  // карт болж унадаг) — эндээс өгвөл ЗААВАЛ бүхэл, ≥0.
  const sanitizePriceInput = (value: string): number | undefined => {
    if (!value.trim()) return undefined;
    const parsed = Math.floor(Number(value));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
  };
  const parsedMinPrice = sanitizePriceInput(minPrice);
  const parsedMaxPrice = sanitizePriceInput(maxPrice);
  // 2026-09-16: эдгээр гурав нь URL-д БИЧИГДДЭГГҮЙ байсан цорын ганц шүүлтүүрүүд
  // байв — q/category/brand/minPrice/maxPrice/page бүгд хадгалагддаг атлаа
  // "Эрэмбэ", "Арьсны төрөл", "Бэлэн нөөцтэй" гурав нь refresh хийхэд, бараа
  // харчихаад буцахад, эсвэл хаягаа найздаа илгээхэд чимээгүй тэглэгддэг байв.
  const [skinTypeFilter, setSkinTypeFilter] = useState<SkinType | "all">(() => {
    const value = initialParams.get("skinType");
    return value && ["dry", "oily", "combination", "sensitive", "normal"].includes(value) ? value as SkinType : "all";
  });
  const [inStockOnly, setInStockOnly] = useState(() => initialParams.get("inStock") === "1");
  const [sort, setSort] = useState<CatalogSortOption>(() => {
    const value = initialParams.get("sort");
    return value === "price-low" || value === "price-high" || value === "name-asc" ? value : "featured";
  });
  const [density, setDensity] = useState<GridDensity>(() => {
    try { return window.localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "comfortable"; } catch { return "comfortable"; }
  });
  useEffect(() => {
    try { window.localStorage.setItem(DENSITY_KEY, density); } catch { /* private-browsing/blocked storage -- the toggle still works for this visit */ }
  }, [density]);
  const [cartOpen, setCartOpen] = useState(false);
  // 2026-09-10: the grid's cart button used to be a decorative circle inside
  // the product <Link>, so clicking it only navigated. It adds to the cart
  // now, on the same success path as ProductDetail (invalidate -> open
  // drawer -> toast). addCartItem resolves a product's default variant
  // server-side, so one click is enough for a single-variant catalogue --
  // which is all 937 published products today. If multi-variant products
  // come back, this button must route those to Quick View rather than
  // silently guessing a variant for the shopper.
  const addToCart = trpc.cart.addItem.useMutation({
    onError: error => toast.error(error instanceof Error ? error.message : "Сагсанд нэмж чадсангүй."),
  });
  // `displayName` нь монгол нэрийг буцаана; toast нь худалдан авагчийн дөнгөж
  // уншсан гарчигтай ижил нэр дуудна (2026-09-23). `name` нь латин POS нэр тул
  // зөвхөн analytics-д (`item_name`) хэвээр — тэр нь тайлангийн тогтвортой
  // түлхүүр.
  const addProductToCart = (product: { id: number; name: string; nameMn?: string | null; sku?: string; priceMnt?: number }) => addToCart.mutate({ productId: product.id, quantity: 1 }, {
    onSuccess: () => {
      utils.cart.current.invalidate();
      setCartOpen(true);
      notifyAddedToCart(`${displayName(product).primary || product.name} сагсанд нэмэгдлээ.`);
      trackEvent("add_to_cart", { value: product.priceMnt ?? 0, items: [{ item_id: product.sku ?? String(product.id), item_name: product.name, price: product.priceMnt ?? 0, quantity: 1 }] });
    },
  });
  const [quickViewProduct, setQuickViewProduct] = useState<QuickViewProduct | null>(null);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<number[]>([]);
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  // ~940 real products (PRODUCT-IMPORT.md) made an unpaginated grid an
  // endless scroll — page it like any real catalog. 24 divides evenly into
  // the 4/3/2-column grid breakpoints (see .shop-product-grid in index.css).
  const SHOP_PAGE_SIZE = 24;
  // 2026-09-27: сервер `page: z.number().int().positive()` -- "2.5" мэт
  // бутархай эсвэл NaN утга явбал татгалзана, тиймээс энд заавал бүхэлд нь.
  const sanitizePage = (raw: string | null): number => {
    const parsed = Math.floor(Number(raw));
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  };
  const [page, setPage] = useState(() => sanitizePage(initialParams.get("page")));
  // Server-side search (ROADMAP.md TIER 2): a debounced 2+ character query
  // hits catalog.search (FULLTEXT index) instead of running a JS substring
  // filter over the whole published catalog on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState(search.trim());
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(handle);
  }, [search]);
  const isSearching = debouncedSearch.length >= 2;
  // On the DEBOUNCED term, never the raw input: firing per keystroke would
  // send GA one "search" hit per letter and make the report meaningless.
  useEffect(() => {
    if (debouncedSearch.length >= 2) trackEvent("search", { search_term: debouncedSearch });
  }, [debouncedSearch]);
  // Frontend performance audit (2026-09-02): category/skinType/in-stock/
  // sort/pagination now happen server-side (see getPublishedCatalogPage's
  // own comment) instead of shipping the full ~937-row catalog to the
  // browser on every /shop visit for the browser to filter — a real cost
  // on this audience's actual mobile network conditions (Mongolia's median
  // 17 Mbps / 92ms latency, well below the 33.9 Mbps global median), not a
  // cosmetic one. `search` is only sent here for the <2-character case — a
  // real 2+ character query routes through catalog.search's FULLTEXT index
  // below instead, mirroring the blank-search-string behavior
  // filterCatalogProducts always got once isSearching took over.
  const catalog = trpc.catalog.list.useQuery({
    // 2026-09-23: `debouncedSearch`, түүхий `search` БИШ. Өмнө нь товчлуур
    // дарах бүрт шинэ query түлхүүр үүсч (`"к"`, `"ко"`, `"кок"` …) сүлжээний
    // дуудлага явж, debounce дуусахад дахин нэг өөрчлөлт болдог байв — дээрх
    // тайлбар "зөвхөн 2 тэмдэгтээс богино үед илгээнэ" гэж бичсэн ч код тэгж
    // ажиллахгүй байсан.
    search: isSearching ? undefined : (debouncedSearch.trim() || undefined),
    category,
    brand,
    skinType: skinTypeFilter,
    minPriceMnt: parsedMinPrice,
    maxPriceMnt: parsedMaxPrice,
    inStockOnly,
    sort,
    page,
    pageSize: SHOP_PAGE_SIZE,
  }, {
    // 2026-09-12 (phone): the previous page's cards stay on screen while the
    // next page loads. Before, a page change unmounted the grid into an
    // 8-card skeleton, the document shrank by half, and the browser clamped
    // or cancelled the scroll that was meant to land on the grid -- on
    // Safari the reader ended up in the footer.
    placeholderData: keepPreviousData,
  });
  const searchResults = trpc.catalog.search.useQuery({ query: debouncedSearch }, { enabled: isSearching });
  const wishlist = trpc.profile.wishlist.list.useQuery(undefined, { enabled: isAuthenticated });
  // 2026-09-12 (Tom: "bi login hiigegui baihad ... tanid sanal bolgoj baina
  // geed ... bi profile preference hiisen login hiisen hund l iimerduu ym
  // garga"): the rail is headed "Танд санал болгож байна" and describes the
  // reader's own saved skin type and interests, so it is shown to exactly
  // the people that sentence is true for -- signed in, with preferences or
  // a purchase history on file. personalOnly makes the server return
  // nothing rather than the bestseller-backed fallback, and the query does
  // not fire at all for a guest.
  const recommended = trpc.catalog.recommended.useQuery({ personalOnly: true }, { enabled: isAuthenticated });
  const wishlistIds = useMemo(() => new Set(wishlist.data?.map(item => item.productId) ?? []), [wishlist.data]);
  const toggleWishlist = trpc.profile.wishlist.toggle.useMutation({ onSuccess: () => utils.profile.wishlist.list.invalidate() });
  const onToggleWishlist = (productId: number) => {
    if (!isAuthenticated) { startLogin(); return; }
    toggleWishlist.mutate({ productId, saved: !wishlistIds.has(productId) });
  };
  const cart = trpc.cart.current.useQuery();
  const catalogLoading = isSearching ? searchResults.isLoading : catalog.isLoading;
  const catalogErrored = isSearching ? searchResults.isError : catalog.isError;
  const cartCount = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const categories = catalog.data?.categories ?? [];
  const skinTypes = catalog.data?.skinTypes ?? [];
  // catalog.search's FULLTEXT match already narrows by text; category/
  // skinType/stock/sort still need to be applied here since that endpoint
  // doesn't take those params — but its own <=200-row cap keeps this
  // client-side pass cheap, unlike the old always-937-row version of this
  // same logic.
  const searchFiltered = useMemo(() => {
    const matching = filterCatalogPriceRange(filterCatalogSkinType(filterCatalogBrand(filterCatalogProducts(searchResults.data ?? [], "", category), brand), skinTypeFilter), parsedMinPrice, parsedMaxPrice);
    // 2026-09-27: shared filterCatalogStock() doesn't know about gift cards
    // (server never checks their stock) -- keep them through "Бэлэн нөөцтэй".
    const stockFiltered = inStockOnly ? matching.filter(product => product.kind === "gift_card" || product.stockQuantity > 0) : matching;
    return sortCatalogProducts(stockFiltered, sort);
  }, [searchResults.data, category, brand, skinTypeFilter, parsedMinPrice, parsedMaxPrice, inStockOnly, sort]);
  const pagedProducts = isSearching ? searchFiltered.slice((page - 1) * SHOP_PAGE_SIZE, page * SHOP_PAGE_SIZE) : (catalog.data?.items ?? []);
  // "X илэрц" (matches after filters) vs "Y бүтээгдэхүүн" (raw source size
  // before category/skinType/stock filters) — two different numbers the
  // header copy has always shown side by side.
  const resultCount = isSearching ? searchFiltered.length : (catalog.data?.totalCount ?? 0);
  const sourceCount = isSearching ? (searchResults.data?.length ?? 0) : (catalog.data?.totalPublishedCount ?? 0);
  const totalPages = Math.max(1, Math.ceil(resultCount / SHOP_PAGE_SIZE));
  // 2026-09-27: дотоод холбоосоор (толгойн цэс, footer) /shop дээр АЛЬ
  // ХЭДИЙН байхдаа шинэ query-тэй /shop руу шилжихэд wouter зөвхөн URL-ыг
  // солидог -- state нь өөрчлөгдөхгүй тул шүүлтүүр юу ч хийгээгүй хэвээр
  // үлддэг байв (дараагийн шүүлтүүрийн товшилт URL-ыг хуучин руу нь буцаадаг
  // байсан ч мөн үүнээс). wouter-ийн useSearch() location.search-ийг бодит
  // цагт ажигладаг тул үүнийг эх сурвалж болгож state-ээ дахин уншина.
  const urlSearch = useSearch();
  const lastSyncedUrlSearch = useRef(urlSearch);
  // 2026-09-27: both write-effects below normalise as they write (e.g.
  // `search.trim()`) -- that normalised URL then bounces back through
  // useSearch() and used to be re-parsed here as if it came from OUTSIDE,
  // so e.g. `setSearch("cocochi ")` (still typing, trailing space) wrote
  // "?q=cocochi" and this effect immediately clobbered the input back to
  // the trimmed value mid-keystroke. Skip reconciling a URL this component
  // just wrote itself.
  const selfWrittenSearchRef = useRef<string | null>(null);
  useEffect(() => {
    if (urlSearch === lastSyncedUrlSearch.current) return;
    lastSyncedUrlSearch.current = urlSearch;
    if (urlSearch === selfWrittenSearchRef.current) return;
    const params = new URLSearchParams(urlSearch);
    const nextSearch = params.get("q") ?? "";
    const nextCategory = params.get("category") ?? "all";
    const nextBrand = params.get("brand") ?? "all";
    const nextMinPrice = params.get("minPrice") ?? "";
    const nextMaxPrice = params.get("maxPrice") ?? "";
    const skinValue = params.get("skinType");
    const nextSkinType: SkinType | "all" = skinValue && ["dry", "oily", "combination", "sensitive", "normal"].includes(skinValue) ? skinValue as SkinType : "all";
    const nextInStock = params.get("inStock") === "1";
    const sortValue = params.get("sort");
    const nextSort: CatalogSortOption = sortValue === "price-low" || sortValue === "price-high" || sortValue === "name-asc" ? sortValue : "featured";
    const nextPage = sanitizePage(params.get("page"));
    setSearch(current => current === nextSearch ? current : nextSearch);
    setCategory(current => current === nextCategory ? current : nextCategory);
    setBrand(current => current === nextBrand ? current : nextBrand);
    setMinPrice(current => current === nextMinPrice ? current : nextMinPrice);
    setMaxPrice(current => current === nextMaxPrice ? current : nextMaxPrice);
    setSkinTypeFilter(current => current === nextSkinType ? current : nextSkinType);
    setInStockOnly(current => current === nextInStock ? current : nextInStock);
    setSort(current => current === nextSort ? current : nextSort);
    setPage(current => current === nextPage ? current : nextPage);
  }, [urlSearch]);
  const controlsMounted = useRef(false);
  useEffect(() => {
    if (controlsMounted.current) setPage(1);
    controlsMounted.current = true;
    const params = new URLSearchParams(window.location.search);
    params.delete("page");
    if (search.trim()) params.set("q", search.trim()); else params.delete("q");
    if (category !== "all") params.set("category", category); else params.delete("category");
    if (brand !== "all") params.set("brand", brand); else params.delete("brand");
    if (minPrice.trim()) params.set("minPrice", minPrice.trim()); else params.delete("minPrice");
    if (maxPrice.trim()) params.set("maxPrice", maxPrice.trim()); else params.delete("maxPrice");
    if (skinTypeFilter !== "all") params.set("skinType", skinTypeFilter); else params.delete("skinType");
    if (inStockOnly) params.set("inStock", "1"); else params.delete("inStock");
    if (sort !== "featured") params.set("sort", sort); else params.delete("sort");
    const nextSearchString = params.toString() ? `?${params}` : "";
    selfWrittenSearchRef.current = nextSearchString;
    window.history.replaceState(null, "", `${window.location.pathname}${nextSearchString}`);
  }, [search, category, brand, minPrice, maxPrice, skinTypeFilter, inStockOnly, sort]);
  useEffect(() => { if (!catalogLoading && page > totalPages) setPage(totalPages); }, [catalogLoading, totalPages, page]);
  // Scroll to the grid AFTER the new page has rendered, instantly (the
  // global smooth rule is overridden for this one jump). Only for the pager
  // buttons -- a filter change or the URL's ?page= on first load must not
  // yank the viewport.
  const pagerJump = useRef(false);
  useEffect(() => {
    if (!pagerJump.current) return;
    pagerJump.current = false;
    const grid = document.getElementById("shop-product-grid");
    if (grid) scrollElementToTopNow(grid);
  }, [page]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (page > 1) params.set("page", String(page)); else params.delete("page");
    const nextSearchString = params.toString() ? `?${params}` : "";
    selfWrittenSearchRef.current = nextSearchString;
    window.history.replaceState(null, "", `${window.location.pathname}${nextSearchString}`);
  }, [page]);
  const effectiveRecentIds = useMemo(() => qaHistoryMode === "unavailable" ? [999_999] : recentlyViewedIds, [qaHistoryMode, recentlyViewedIds]);
  const forceZeroResults = qaHistoryMode === "zero-filter";
  // Frontend performance audit (2026-09-02): catalog.list no longer ships
  // the full catalog for the client to resolve arbitrary recently-viewed
  // ids against locally — a small, dedicated lookup instead, bounded by
  // rememberRecentlyViewed's own 6-id cap.
  const recentIdsQuery = trpc.catalog.byIds.useQuery({ ids: effectiveRecentIds }, { enabled: effectiveRecentIds.length > 0 });
  const recentlyViewed = useMemo(() => resolveRecentlyViewed(recentIdsQuery.data ?? [], effectiveRecentIds), [recentIdsQuery.data, effectiveRecentIds]);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(RECENTLY_VIEWED_KEY) ?? "[]");
      if (Array.isArray(saved)) setRecentlyViewedIds(saved.filter((value): value is number => Number.isInteger(value)).slice(0, 6));
    } catch {
      // 2026-09-23: цэвэрлэгээг ч хамгаална — хувийн цонх/блоклосон санах ойд
      // `removeItem` өөрөө шиддэг тул catch дотроос дахин уналт гардаг байв.
      try { window.localStorage.removeItem(RECENTLY_VIEWED_KEY); } catch { /* storage blocked */ }
    }
  }, []);

  const resetControls = () => { setSearch(""); setCategory("all"); setBrand("all"); setMinPrice(""); setMaxPrice(""); setSkinTypeFilter("all"); setInStockOnly(false); setSort("featured"); };
  /**
   * Every filter the shopper has actually applied, one removable chip each,
   * shown right where the results begin (2026-09-12). Research on faceted
   * navigation is consistent on this point: applied values belong beside
   * the product list and must be individually removable, not just a
   * highlighted state inside the controls -- otherwise someone who forgot
   * they set a price cap reads a thin catalogue as "you have nothing".
   */
  const appliedFilters = [
    search.trim() ? { key: "q", label: `Хайлт: ${search.trim()}`, clear: () => setSearch("") } : null,
    category !== "all" ? { key: "category", label: category, clear: () => setCategory("all") } : null,
    brand !== "all" ? { key: "brand", label: brand, clear: () => setBrand("all") } : null,
    skinTypeFilter !== "all" ? { key: "skin", label: `Арьсны төрөл: ${skinTypeLabels[skinTypeFilter]}`, clear: () => setSkinTypeFilter("all") } : null,
    minPrice || maxPrice ? { key: "price", label: `Үнэ: ${minPrice || "0"}–${maxPrice || "∞"}`, clear: () => { setMinPrice(""); setMaxPrice(""); } } : null,
    inStockOnly ? { key: "stock", label: "Бэлэн нөөцтэй", clear: () => setInStockOnly(false) } : null,
  ].filter((chip): chip is { key: string; label: string; clear: () => void } => chip !== null);
  // 2026-09-23: localStorage-ийн бичилт setState-ийн updater-ээс ГАРСАН.
  // (a) updater нь цэвэр байх ёстой (React StrictMode давхар дуудна),
  // (b) хаалттай санах ойд `setItem` шиддэг тул барааны карт дээр дарахад
  // тэр уналт нь навигацийг таслах, эсвэл render дунд гарвал бүхэл /shop
  // хуудсыг ErrorBoundary руу оруулах эрсдэлтэй байв.
  const rememberProduct = (productId: number) => setRecentlyViewedIds(current => {
    const next = rememberRecentlyViewed(current, productId);
    try { window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next)); } catch { /* private-browsing/blocked storage */ }
    return next;
  });
  const openQuickView = (product: QuickViewProduct) => { rememberProduct(product.id); setQuickViewProduct(product); };

  return <MotionProvider><div className="sugi-commerce">
    {/* Tom, 2026-09-05 (explicit, /shop only): the logo already reads "SUGI
        ASAYAKE" -- backLabel="" (not omitted -- omitting it would fall back
        to CommerceHeader's own "SUGI ASAYAKE" default) suppresses the
        redundant text span entirely, leaving just the logo + back-arrow. */}
    <CommerceHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} backLabel="" />
    <main className="shop-main">
      <section className="shop-hero" data-reveal>
        <div className="shop-hero-copy"><p className="shop-kicker"><span /> {textFor("shop-text-hero-kicker", "02 / SUGI MARKET")}</p><h1>{shopLine1}<br /><em>{shopLine2}</em></h1><p>{textFor("shop-text-hero-description", "Японоос албан ёсоор нийлүүлсэн арьс арчилгаа, эрүүл мэнд, гэр бүлийн хэрэгцээний бүтээгдэхүүнээ өөртөө тохируулан олоорой.")}</p><div className="shop-hero-badges"><div className="shop-hero-signature"><Sparkles size={17} /><span>{textFor("shop-text-hero-signature", "ТАНЫ ӨДӨР БҮРТ / ЯПОН ЧАНАР")}</span></div><div className="shop-hero-delivery"><Truck size={17} /><span>УБ ХҮРГЭЛТ {formatMnt(deliveryFeeUbMnt)} / САЛБАРААС ҮНЭГҮЙ АВАХ</span></div></div></div>
        <div className="shop-search-panel"><div className="shop-search-stamp" aria-hidden="true">CARE<br />IS<br />COLOR</div><label><Search size={19} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Бүтээгдэхүүн, брэндээр хайх" /></label><p><strong>{resultCount}</strong> үр дүн / <span>{sourceCount} бүтээгдэхүүн</span></p></div>
      </section>
      <div className="shop-ribbon" aria-label={`${brandName()} брэндийн мессеж`}>
        <div>{shopRibbonRow("shop-ribbon-a")}</div>
        <div aria-hidden="true">{shopRibbonRow("shop-ribbon-b")}</div>
      </div>
      <section className="shop-filter" data-reveal>
        <div><p><SlidersHorizontal size={15} /> {textFor("shop-text-filter-heading", "АНГИЛЛААР ШҮҮХ")}</p><span>{textFor("shop-text-filter-subtitle", "Таны өдөр тутмын хэрэгцээний хэмнэлээр")}</span></div>
        {/* Tom, 2026-09-05: category pills + skin-type pills are now ONE flex
            item (a right-aligned column) instead of 2 separate siblings of
            .shop-filter -- previously the skin-type row's only way to reach
            its own line was `width:100%`, which also flushed it to the far
            LEFT, under the label instead of under the category pills it
            filters within. Grouping them guarantees the skin-type row lines
            up directly under category pills regardless of how much room
            .shop-control-row needs on the line below. */}
        <div className="shop-filter-facets">
          <div className="shop-filter-pills"><button type="button" onClick={() => setCategory("all")} className={category === "all" ? "active" : ""}>{t("Бүгд")}</button>{categories.map(item => <button type="button" key={item} onClick={() => setCategory(item)} className={category === item ? "active" : ""}>{item}</button>)}</div>
          {skinTypes.length ? <div className="shop-filter-pills shop-skin-filter"><button type="button" onClick={() => setSkinTypeFilter("all")} className={skinTypeFilter === "all" ? "active" : ""}>{t("Арьсны төрөл: Бүгд")}</button>{skinTypes.map(type => <button type="button" key={type} onClick={() => setSkinTypeFilter(type)} className={skinTypeFilter === type ? "active" : ""}>{skinTypeLabels[type]}</button>)}</div> : null}
        </div>
        <div className="shop-control-row">
          {/* NEWVISION.md §14 (Phase 2): Isetan's deep faceted filter --
              price range, either bound optional. Text inputs (not
              type="number" state) so an in-progress empty field never
              silently becomes "0" -- see minPrice/maxPrice's own comment. */}
          <div className="price-range-filter"><Wallet size={14} /><input type="number" inputMode="numeric" min={0} step={1000} placeholder={t("Доод")} value={minPrice} onChange={event => setMinPrice(event.target.value)} aria-label="Доод үнэ (₮)" /><span aria-hidden="true">–</span><input type="number" inputMode="numeric" min={0} step={1000} placeholder={t("Дээд")} value={maxPrice} onChange={event => setMaxPrice(event.target.value)} aria-label="Дээд үнэ (₮)" /></div>
          <label className="stock-toggle"><input type="checkbox" checked={inStockOnly} onChange={event => setInStockOnly(event.target.checked)} /><span><PackageCheck size={14} /> Бэлэн нөөцтэй</span></label><label className="sort-control"><ArrowDownUp size={14} /><span>{t("Эрэмбэ")}</span><select value={sort} aria-label={t("Эрэмбэ")} onChange={event => setSort(event.target.value as CatalogSortOption)}><option value="featured">{t("Онцлох")}</option><option value="price-low">{t("Үнэ: багаас")}</option><option value="price-high">{t("Үнэ: ихээс")}</option><option value="name-asc">{t("Нэр: A–Я")}</option></select></label></div>
        {appliedFilters.length > 0 && (
          <div className="shop-applied" role="status" aria-live="polite">
            <span className="shop-applied-label">{t("Сонгосон:")}</span>
            {/* 2026-10-18: чип орох/гарах хөдөлгөөн (UI TripleD-ийн хэв маяг, LazyMotion). `initial={false}` —
                хуудас ачаалахад URL-аас сэргэсэн чипүүд шууд харагдана (feature chunk хүлээхгүй). */}
            <AnimatePresence initial={false}>
              {appliedFilters.map(chip => (
                <m.button type="button" key={chip.key} className="shop-applied-chip" onClick={chip.clear} aria-label={`${chip.label} шүүлтүүрийг хасах`} initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .9 }} transition={{ duration: .16 }}>
                  {chip.label} <X size={14} aria-hidden="true" />
                </m.button>
              ))}
            </AnimatePresence>
            <button type="button" className="shop-applied-clear" onClick={resetControls}>{t("Бүгдийг цэвэрлэх")}</button>
          </div>
        )}
      </section>
      {catalogLoading ? <section className="shop-product-grid" aria-busy="true" aria-label={isSearching ? "Хайж байна" : "Каталогийг бэлдэж байна"}>{Array.from({ length: 8 }, (_, index) => <ProductCardSkeleton key={index} />)}</section> : catalogErrored ? <section className="shop-status-card error"><h2>Каталогийг ачаалж чадсангүй.</h2><p>Интернэт холболтоо шалгаад дахин оролдоно уу.</p></section> : !isSearching && sourceCount === 0 && !forceZeroResults ? <section className="shop-discovery" data-reveal>
        <div className="shop-discovery-heading"><p className="shop-kicker"><span /> {textFor("shop-text-discovery-kicker", `${brandName()} / DISCOVER`)}</p><h2>{discoveryLine1}<br /><em>{discoveryLine2}</em></h2><p>{textFor("shop-text-discovery-description", "Онлайн каталогийг бид салбарын бодит нөөцтэй нь уялдуулан шинэчилж байна. Харин та өөрт ойр салбараас дараах ангиллаар шууд асууж болно.")}</p></div>
        <div className="shop-category-deck">{discoveryCategories.map(item => <div className={`shop-category-card ${item.tone}`} key={item.slug}><span><item.Icon size={18} /></span><div><small>{textFor("shop-text-category-kicker", `${brandName().split(" ")[0]} DAILY CARE`)}</small><h3>{item.name}</h3><p>{item.detail}</p></div><ArrowUpRight size={20} /></div>)}</div>
        <div className="shop-discovery-cta" id="shop-contact"><div><MapPin size={20} /><span><strong>{textFor("shop-text-contact-cta-title", "{N} салбар, нэг өдөр тутмын сонголт.").replace("{N}", String(branchCount))}</strong><small>{textFor("shop-text-contact-cta-subtitle", "Таны хайж буй бүтээгдэхүүнийг ойр салбараас асуугаарай.")}</small></span></div><div><Link href="/#stores">Салбар олох <ArrowUpRight size={16} /></Link><a href={`tel:${contact.phoneHref}`}>{contact.phone} <Phone size={15} /></a></div></div>
      </section> : resultCount ? <><div className="shop-grid-toolbar"><button type="button" className={density === "comfortable" ? "active" : ""} onClick={() => setDensity("comfortable")} aria-pressed={density === "comfortable"} aria-label="Том grid харагдац"><LayoutGrid size={15} /></button><button type="button" className={density === "compact" ? "active" : ""} onClick={() => setDensity("compact")} aria-pressed={density === "compact"} aria-label="Жижиг grid харагдац"><Grid3x3 size={15} /></button></div><section className={`shop-product-grid${density === "compact" ? " is-compact" : ""}`} id="shop-product-grid">{pagedProducts.map((product, index) => (
        // 2026-10-18: Shop-ийн дотоод карт → хуваалцсан ProductCard (grid). Бүх утга нь
        // /admin → Бүтээгдэхүүн-ий багана (брэнд, хуучин үнэ, зураг, нөөц) — карт өөрөө
        // нөөц/хямдралыг shared/product-card.ts-ээр шийднэ (бэлгийн карт үргэлж худалдаанд).
        <ProductCard
          key={product.id}
          product={product}
          variant="grid"
          headingLevel={2}
          imageSizes={SHOP_CARD_SIZES}
          revealDelayMs={Math.min(index * 55, 300)}
          onNavigate={rememberProduct}
          onQuickView={openQuickView}
          wishlist={{ saved: wishlistIds.has(product.id), onToggle: () => onToggleWishlist(product.id) }}
          cart={{ onAdd: () => addProductToCart(product), pending: addToCart.isPending && addToCart.variables?.productId === product.id }}
        />
      ))}</section>{totalPages > 1 ? <ShopPagination page={page} totalPages={totalPages} resultCount={resultCount} onChange={next => { pagerJump.current = true; setPage(Math.min(totalPages, Math.max(1, next))); }} /> : null}</> : <section className="shop-status-card" data-reveal><Search size={26} /><h2>Энэ удаа тохирох бүтээгдэхүүн олдсонгүй.</h2><p>Өөр хайлтын үг хэрэглэж үзэх эсвэл бүх ангиллыг дахин хараарай.</p><button type="button" onClick={resetControls}><RotateCcw size={14} /> Шүүлтүүр арилгах</button></section>}
      {recommended.data?.length ? <RecommendedForYou products={recommended.data} onRemember={rememberProduct} onQuickView={openQuickView} /> : null}
      {/* A premium site doesn't show a "recently viewed" module with nothing
          in it — that reads as an empty placeholder, not a feature. Only
          render this once the shopper has actually looked at something. */}
      {!recentIdsQuery.isLoading && !recentIdsQuery.isError && effectiveRecentIds.length > 0 ? <RecentlyViewed products={recentlyViewed} rememberedCount={effectiveRecentIds.length} onRemember={rememberProduct} onQuickView={openQuickView} /> : null}
    </main>
    <SiteFooter />
    <QuickViewDialog open={Boolean(quickViewProduct)} product={quickViewProduct} onOpenChange={open => { if (!open) setQuickViewProduct(null); }} onAdded={() => setCartOpen(true)} />
    <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
  </div></MotionProvider>;
}
