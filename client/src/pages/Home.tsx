/**
 * SUGI ASAYAKE-ийн мэргэжлийн чиглэл: Японы жижиглэн худалдааны нам гүм эрх мэдэл,
 * дулаан цаасан суурь, сахилгатай vermilion өргөлт, editorial зай, тодорхой итгэл /
 * дэлгүүр / зочлох үйлдлүүд. Энэ хуудас хүнд overlay, шинэлэг эффект, template
 * маягийн хэт том бүтцээс санаатай зайлсхийнэ.
 *
 * 2026-09-06 нүүрний нэгтгэл (гадны дизайны шүүмж + Tom-ийн "~6 хэсэг болго"
 * гэсэн шууд шийдвэр — docs/PROJECT-GUIDE.md): хуудас өмнө нь хооронд нь бараг
 * завсаргүй ~9 rail маягийн карусель блок (2 ижил bestseller/recommended rail
 * дараалан, дараа нь ангилал бүрийн 6 хүртэл rail) + давхардсан "яагаад биднийг"
 * итгэлийн 3 тусдаа хэсэг давхарлан харуулдаг байв. ЭНЭ хуудасны render модноос
 * хасагдсан (кодоос биш — компонент, backend, admin CRUD бүгд хэвээр, өөр газар
 * дахин ашиглагдана; зөвхөн JSX түвшний өөрчлөлт): ангилал бүрийн CarouselShelf
 * давталт, SeasonalCampaignCarousel, JournalSection (/journal дээр хэвээр), бие
 * даасан customer-voices-section (бодит сэтгэгдлүүд одоо BrandStorySection дотор
 * нягт зурвасаар). Top Brands мөн түр хасагдаад Tom-ийн "заавал байх ёстой" гэсэн
 * шаардлагаар тэр өдөртөө анхны байрлалдаа, BrandStorySection ба CategoryMasonry-
 * ийн хооронд сэргээгдсэн. Эцсийн бүтэц: Hero -> Quick Stats -> BrandStorySection
 * (хуучин story-section + WhyChooseUs + сэтгэгдлийн зурвас нэгтгэсэн) -> Top Brands
 * rail -> CategoryMasonry -> Bestseller rail -> Recommended rail -> EditorialBanner
 * (хуучин care-section-ийн бодит агуулга, өмнө нь бүтээгдсэн ч ашиглагдаагүй
 * EditorialBanner primitive-ээр) -> StoreLocatorSection -> Footer (хуучин final-cta-г
 * opt-in banner болгон шингээсэн, SiteFooter.tsx).
 */
import { Fragment, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import CartDrawer from "@/components/CartDrawer";
import CommerceHeader from "@/components/CommerceHeader";
import SiteFooter from "@/components/SiteFooter";
import HeroSection from "@/components/home/HeroSection";
import CategoryMasonry from "@/components/home/CategoryMasonry";
import BrandStorySection from "@/components/home/BrandStorySection";
import EditorialBanner from "@/components/home/EditorialBanner";
import StoreLocatorSection from "@/components/home/StoreLocatorSection";
import QuickStatsSection from "@/components/home/QuickStatsSection";
import FeaturedBrandsCarousel from "@/components/home/FeaturedBrandsCarousel";
import KeywordChips from "@/components/home/KeywordChips";
import CarouselShelf from "@/components/home/CarouselShelf";
import ProductCard from "@/components/product/ProductCard";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCategories } from "@/hooks/useCategories";
import { useSiteMedia } from "@/hooks/useSiteMedia";
import { useShopContact } from "@/hooks/useShopContact";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { useSiteText } from "@/hooks/useSiteText";
import { trpc } from "@/lib/trpc";
import { useHomeLayout } from "@/lib/homeLayout";
import { HolidayEffectMount, HolidayOrnamentBand } from "@/components/holiday/HolidayDecor";
import FreeBlock from "@/components/home/FreeBlock";
import { freeBlockMediaSlot, type FreeBlockKey } from "@shared/home-sections";
import type { HomeSectionKey } from "@shared/home-sections";
import { brandName } from "@/lib/brand";

// These have no bundled fallback photo (unlike product shots, there's no
// generic stand-in for real store/lifestyle photography) -- null here
// means "nothing to show until an admin uploads one for this slot", which
// lets the .hero-image/.cat-mosaic-anchor/.editorial-banner-image CSS
// gradient show through instead of a broken <img>. Upload real photos via
// /admin -> Content & Media for slots: home-hero, home-categories,
// home-family.
const assortmentImage = "/product-placeholder.svg";
const familyImage = null;
const symbolImage = "/images/brand/sugi-symbol-256.webp";
/** Нүүрний rail-ийн картын өргөн (index.css `.sugi-site .shelf-card-slot`: 232 → 200 ≤1023 → 176 ≤760 → 168px ≤420). */
const SHELF_CARD_SIZES = "(max-width: 420px) 168px, (max-width: 760px) 176px, (max-width: 1023px) 200px, 232px";

export default function Home() {
  const { user } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  // Серверийн зурсан shell-ийг (server/_core/heroShell.ts) React-ийн ЭХНИЙ
  // зурагдалттай нэг frame-д нуух: layout effect нь DOM өөрчлөгдсөний дараа,
  // paint-аас ӨМНӨ ажилладаг тул хэрэглэгч shell → React солигдохыг харахгүй.
  // Толгой/текстийг устгана (дэлгэц уншигч, SEO-д давхар h1 үлдэхгүй), харин
  // нуусан rail-ийн <img>-үүд үлдэнэ — Lighthouse LCP элементээ (тэр зураг)
  // баримтаас олж чадвал зургийн замаар загварчилна; устгавал олохгүй.
  useLayoutEffect(() => {
    const shell = document.getElementById("hero-shell");
    if (!shell) return;
    shell.hidden = true;
    shell.querySelectorAll(".site-promo-banner, header, .hero-copy").forEach(node => node.remove());
  }, []);
  // NEWVISION.md §8: Home used to have no cart integration in its header at
  // all -- a signed-in shopper browsing the homepage had no way to see
  // their cart without navigating to /shop first. Same trpc.cart.current
  // pattern every other page already uses.
  const cart = trpc.cart.current.useQuery();
  const cartCount = cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const siteMediaQuery = useSiteMedia();
  // matsukiyococokara-online.com's 売れ筋ランキング (bestseller ranking) —
  // adapted as a real-data section, not a curated list. See
  // getBestsellingProducts in server/db.ts.
  const bestsellersQuery = trpc.catalog.bestsellers.useQuery();
  const bestsellers = bestsellersQuery.data ?? [];
  // Preference Profile v2 (2026-09-01): same public, always-populated (guest
  // and never-tagged shoppers get a bestseller-backed fallback server-side,
  // see getRecommendedProducts) endpoint /shop's RecommendedForYou uses --
  // reuses the bestseller rail's own card markup rather than /shop's
  // Recently-Viewed-style interactive card (no quick-view/remember affordance
  // exists on this page), so it reads as one consistent product-rail family.
  // 2026-09-12 (Tom: "bi login hiij account burtguuleegui baij ene tanid
  // sanal bolgoh buteegdehuund garj irj baina"): the rail is headed "Танд
  // санал болгож байна" -- addressed to a person -- so it only runs for a
  // signed-in shopper now. The endpoint stays public (that is /shop's own
  // rail too, and its bestseller-backed fallback is what makes it useful
  // there), but the query does not even fire for a guest here.
  const recommendedQuery = trpc.catalog.recommended.useQuery({ personalOnly: true }, { enabled: Boolean(user) });
  const recommended = recommendedQuery.data ?? [];
  // 2026-09-04 cohesion audit: the hero badge's "800+" used to be hardcoded
  // directly in HeroSection.tsx with no way to update it short of a code
  // deploy -- real count is 937 today. Rounds down to the nearest hundred so
  // it still reads as marketing copy ("900+") rather than an oddly precise
  // number, and can never overstate the real published catalog size. "…+"
  // while still loading, matching this page's other "don't show 0 while
  // fetching" conventions.
  const publishedCountQuery = trpc.catalog.publishedCount.useQuery();
  const productCountLabel = publishedCountQuery.data === undefined ? "…+" : `${Math.floor(publishedCountQuery.data / 100) * 100}+`;
  // "Controls everything" admin overhaul (2026-09-08, Phase J): replaces
  // locations-data.ts's hardcoded array length. Falls back to 4 (today's
  // real, live count) only for the brief instant before this loads, so it
  // never flashes a wrong/zero number -- corrected to the real live count
  // within one render either way.
  const branchesQuery = trpc.content.branches.useQuery();
  const branchCount = branchesQuery.data?.length ?? 4;
  // NEWVISION.md §6: real reviews only, hidden entirely (in BrandStorySection)
  // rather than padding itself with lower-rated/commentless reviews.
  const featuredReviewsQuery = trpc.reviews.featured.useQuery();
  const featuredReviews = featuredReviewsQuery.data ?? [];
  // NEWVISION.md §5 -- restored 2026-09-06 (Tom, same day it was briefly
  // retired during the design-review consolidation): hides entirely when
  // no brands are curated yet, same discipline as every other rail here.
  const featuredBrandsQuery = trpc.catalog.featuredBrands.useQuery();
  const featuredBrands = featuredBrandsQuery.data ?? [];
  const mediaBySlot = useMemo(() => new Map((siteMediaQuery.data ?? []).map(media => [media.slotKey, media.imageUrl])), [siteMediaQuery.data]);
  const imageFor = (slotKey: string, fallbackUrl: string | null) => mediaBySlot.get(slotKey) || fallbackUrl;
  // Only sets an inline background-image when there's an actual URL --
  // omitting the property entirely (rather than pointing it at a known-bad
  // URL) is what lets the CSS gradient fallback on these classes show
  // through until a real photo is uploaded for the slot.
  const bgStyle = (slotKey: string, fallbackUrl: string | null) => {
    const url = imageFor(slotKey, fallbackUrl);
    return url ? { backgroundImage: `url(${url})` } : undefined;
  };
  const textFor = useSiteText();
  const homeLayout = useHomeLayout();
  const contact = useShopContact();
  // The catalogue categories, from the database rather than a hardcoded
  // array -- see useCategories() for how the photo/icon halves are joined.
  const categories = useCategories();
  // The homepage previously relied on index.html's static <title>; it now
  // owns its own so an admin can edit what Google and a shared link show.
  // {N} is the live branch count, never a hardcoded "3".
  useDocumentMeta(
    textFor("seo-text-home-title", `${brandName()} Mongolia — Япон чанарыг гэр бүл бүрт`),
    textFor("seo-text-home-description", `${brandName()} Mongolia — Японоос баталгаат бүтээгдэхүүнүүдийг албан ёсны эрхтэйгээр хүргэж байна. Улаанбаатар хотод {N} салбартай.`).replace("{N}", String(branchCount)),
  );
  const [careHeadingLine1, careHeadingLine2] = textFor("home-text-care-heading", "Багахан итгэл.\nИх халамж").split("\n");
  const [finalCtaHeadingLine1, finalCtaHeadingLine2] = textFor("home-text-finalcta-heading", "Сайн сонголт\nойрхон байна").split("\n");
  // Брэнд студи A3 (2026-10-05): хэсгүүдийн дараалал/нуулт/хувилбар админаас (shared/home-sections.ts).
  // Hero тогтмол эхэнд (hero shell), бусад нь layout-ын дарааллаар.
  const variantOf = (key: HomeSectionKey) => homeLayout.find(entry => entry.key === key)?.variant;
  const freeBlock = (key: FreeBlockKey) => {
    const entry = homeLayout.find(row => row.key === key);
    return <FreeBlock variant={entry?.variant ?? "image-left"} props={entry?.props} imageUrl={imageFor(freeBlockMediaSlot(key), null)} />;
  };
  const sections: Record<HomeSectionKey, ReactNode> = {
    "free-1": freeBlock("free-1"),
    "free-2": freeBlock("free-2"),
    "free-3": freeBlock("free-3"),
    chips: (
      <>
        {/* The reference's popular-keyword box, built from this shop's own
            real categories and featured brands rather than invented terms. */}
        <KeywordChips categories={categories} brands={featuredBrands} />
      </>
    ),
    bestsellers: (
      <>
        {/* matsukiyococokara-online.com's bestseller ranking, adapted:
            real paid-order history via getBestsellingProducts, never a
            curated list. 2026-09-12: the 6-up grid of shadowed cards became
            the reference's own shape -- one horizontal rail of bordered
            cards under a centred heading, each rank set as "No.1" above its
            card. CarouselShelf/ProductCard are the primitives
            ProductDetail already uses, so the site has one product-card
            treatment rather than two. emptyState={null} keeps the existing
            rule: hidden entirely once loaded with zero results. */}
        {variantOf("bestsellers") === "grid" && bestsellers.length > 0 ? (
          // Брэнд студи A3: "сүлжээ" хувилбар — бүх их зарагддаг барааг нэг дор (гүйлгэхгүй).
          <section className="carousel-shelf-section bestseller-grid-section" data-reveal>
            <div className="carousel-shelf-heading"><h2>{textFor("home-text-bestseller-heading", "Их зарагддаг\nбараанууд").split("\n").join(" ")}</h2></div>
            <div className="bestseller-grid">{bestsellers.map((product, index) => <ProductCard variant="shelf" imageSizes={SHELF_CARD_SIZES} product={product} rank={index + 1} key={product.id} />)}</div>
          </section>
        ) : (bestsellersQuery.isLoading || bestsellers.length > 0) && (
          <CarouselShelf
            title={textFor("home-text-bestseller-heading", "Их зарагддаг\nбараанууд").split("\n").join(" ")}
            viewAllHref="/shop"
            viewAllLabel={textFor("home-text-bestseller-all-link", "Бүх бүтээгдэхүүн үзэх")}
            loading={bestsellersQuery.isLoading}
            emptyState={null}
          >
            {bestsellers.map((product, index) => <ProductCard variant="shelf" imageSizes={SHELF_CARD_SIZES} product={product} rank={index + 1} key={product.id} />)}
          </CarouselShelf>
        )}
      </>
    ),
    recommended: (
      <>
        {/* Preference Profile v2 (2026-09-01): the same catalog.recommended
            endpoint /shop's rail uses -- public, and backed by a bestseller
            fallback server-side, so this hides only on a genuinely failed
            request rather than on "no preferences yet". No rank number here:
            a recommendation is not a ranking. */}
        {user && (recommendedQuery.isLoading || recommended.length > 0) && (
          <CarouselShelf
            title={textFor("home-text-recommended-heading", "Танд санал\nболгож байна").split("\n").join(" ")}
            loading={recommendedQuery.isLoading}
            emptyState={null}
          >
            {recommended.map(product => <ProductCard variant="shelf" imageSizes={SHELF_CARD_SIZES} product={product} key={product.id} />)}
          </CarouselShelf>
        )}
      </>
    ),
    brands: (
      <>
        {/* Restored 2026-09-06 (Tom: "we need Top Brands, must have!!"), then
            rebuilt 2026-09-10 against matsuyaginza.com/en's "Featured Brands"
            at Tom's request -- the CarouselShelf/BrandTileCard version was a
            static row of shadowed, rounded tiles with the name overlaid on the
            photo ("zgrl neg durvuljin tegsen shadow edrtei utaggui"). The old
            home-text-brands-eyebrow/-heading slots went with it: Tom asked for
            "Тансаг брэндүүд." to be deleted outright, and the reference has no
            eyebrow at all. See AdminBrandsPanel.tsx for the CRUD side (it now
            takes a brand logo too); #top-brands is the header nav's anchor. */}
        {featuredBrands.length > 0 && (
          <div id="top-brands">
            <FeaturedBrandsCarousel
              brands={featuredBrands}
              heading={textFor("home-text-featured-brands-heading", "Онцлох брэндүүд")}
            />
          </div>
        )}
      </>
    ),
    categories: (
      <>
        {/* Photo precedence (admin upload -> the category's own imageUrl
            -> this codebase's per-slot default -> placeholder) is resolved
            inside useCategories(), so every surface that shows a category
            picture resolves it the same way. */}
        <CategoryMasonry
          categories={categories}
          anchorImageStyle={bgStyle("home-categories", assortmentImage)}
          symbolImage={symbolImage}
        />
      </>
    ),
    story: (
      <>
        <BrandStorySection branchCount={branchCount} productCountLabel={productCountLabel} featuredReviews={featuredReviews} />
      </>
    ),
    stats: (
      <>
        {/* Home redesign Tier 7 -- replaces the old membership-strip promo
            panel (generic "3-10%" prose, no real data) with a real,
            server-authoritative membership summary. See
            client/src/components/home/QuickStatsSection.tsx. */}
        <QuickStatsSection />
      </>
    ),
    editorial: (
      <>
        {/* 2026-09-06: the old hand-rolled .care-section markup (image half +
            text half + a rotated "sun stamp" badge) replaced by the
            already-built-but-previously-unused EditorialBanner primitive
            (NEWVISION.md Tier 2 generalized exactly this split, but nothing
            ever called it) -- same real content (heading/description/3
            points, all still admin-editable via the same site-text slots),
            no decorative circle badge. */}
        {/* 2026-09-11 audit: this band carried three stacked labels above one
            heading -- "03 / FAMILY CARE", then "ГЭР БҮЛИЙН ӨДӨР БҮРТ", then the
            heading itself. The "03" belonged to a section numbering that no
            longer exists, and the eyebrow repeated the heading. One tag now. */}
        <EditorialBanner
          variant={variantOf("editorial") === "image-right" ? "image-right" : "image-left"}
          tag={textFor("home-text-care-tag", "FAMILY CARE")}
          headingLine1={careHeadingLine1}
          headingLine2={careHeadingLine2}
          description={textFor("home-text-care-description", "Бидний сонголт зөвхөн бүтээгдэхүүн биш. Таны гэр бүлийн өдөр тутмын амар тайван байдал, итгэл, халамж юм.")}
          points={[
            textFor("home-text-care-point1", "Баталгаат Япон бүтээгдэхүүн"),
            textFor("home-text-care-point2", "Гэр бүл бүрт зориулсан сонголт"),
            textFor("home-text-care-point3", "24–48 цагийн дотор Улаанбаатарт хүргэнэ"),
          ]}
          imageUrl={imageFor("home-family", familyImage)}
          imageAlt={`${brandName()}-ийн гэр бүлийн арчилгааны бүтээгдэхүүнүүд`}
        />
      </>
    ),
    stores: (
      <>
        <StoreLocatorSection />
      </>
    ),
  };
  return (
    <div className="sugi-site" id="top">
      <CommerceHeader cartCount={cartCount} onCartOpen={() => setCartOpen(true)} marketingNav />

      <main>
        {/* mediaReady: the hero must not paint its row until it knows how
            many photographs there are. Slots 4-6 have no brand default, so
            while this query is in flight the row would be three tiles wide,
            then grow to five and visibly jump (Tom: "refresh hiiheer ehnii 3
            slide ... daraa n suuld nemegdsen slide garj irj baina, lag").
            The hero reserves the exact height meanwhile, so nothing shifts. */}
        <HeroSection imageFor={imageFor} mediaReady={!siteMediaQuery.isLoading} />
        {/* Баярын хээ (Брэнд студи A4) — hero-ийн ДАРАА тул hero shell-тэй зөрөхгүй. */}
        <HolidayOrnamentBand />
        <HolidayEffectMount />

        {homeLayout.filter(entry => entry.visible).map(entry => <Fragment key={entry.key}>{sections[entry.key]}</Fragment>)}
      </main>

      <SiteFooter
        ctaBanner={{
          eyebrow: textFor("home-text-finalcta-eyebrow", "NEED A LITTLE HELP?"),
          headingLine1: finalCtaHeadingLine1,
          headingLine2: finalCtaHeadingLine2,
          phoneLabel: contact.phone,
        }}
      />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
