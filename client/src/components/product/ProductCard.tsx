import { Eye, LoaderCircle, ShoppingCart } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "wouter";
import ResponsivePicture from "@/components/ResponsivePicture";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/hooks/useLocale";
import { useProductName } from "@/hooks/useProductName";
import { brandName } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { getCategoryPlaceholderImage } from "@shared/catalog-filter";
import { productCardBrand, productCardPrice, productCardRating, productCardStock } from "@shared/product-card";
import type { NamedProduct } from "@shared/product-name";
import PriceBlock from "./PriceBlock";
import StarRating from "./StarRating";
import WishlistToggle from "./WishlistToggle";

export type ProductCardData = NamedProduct & {
  id: number;
  slug: string;
  brand?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  imageUrl?: string | null;
  priceMnt: number;
  compareAtPriceMnt?: number | null;
  stockQuantity?: number | null;
  kind?: string | null;
  reviewCount?: number | null;
  avgRating?: number | null;
};

type ProductCardProps<T extends ProductCardData> = {
  product: T;
  /**
   * grid — /shop-ийн сүлжээ (хүслийн зүрх, шуурхай харах, сагсны товч; e2e-ийн
   *   `.shop-product-card` / `h2` / `.shop-product-link` дэгээ хэвээр).
   * shelf — нүүр ба PDP-ийн rail: карт бүхэлдээ НЭГ холбоос (дотроо өөр товчгүй).
   * compact — /shop-ийн "Танд" / "Сүүлд үзсэн" жижиг мөр (зураг + текст + шуурхай харах).
   */
  variant: "grid" | "shelf" | "compact";
  /** `sizes` — картны бодит өргөн (ResponsivePicture srcset сонгоно). */
  imageSizes: string;
  headingLevel?: 2 | 3;
  /** Нүүрний "Их зарагддаг" дугаар — ганц text node ("No.1"), орчуулгын толийн "No"-д таарахгүй. */
  rank?: number;
  /** Санал болголтын шалтгаан ("Хуурай арьсанд · Нөхжилт"). */
  reason?: string | null;
  /** /shop-ийн data-reveal шат (мс). */
  revealDelayMs?: number;
  onNavigate?: (productId: number) => void;
  onQuickView?: (product: T) => void;
  wishlist?: { saved: boolean; onToggle: () => void };
  cart?: { onAdd: () => void; pending: boolean };
  /** Профайлын хүслийн жагсаалт: "Сагслах" / "Ирэхээр мэдэгдэх". */
  footer?: ReactNode;
};

/**
 * Сайтын НЭГ барааны карт (2026-10-18, storefront шинэчлэл). Өмнө нь дөрвөн тусдаа
 * хэрэгжүүлэлт байсан: Shop.tsx-ийн дотоод карт, home/ShelfProductCard, RailProductCard,
 * Профайлын хүслийн жагсаалт (сүүлийнх нь латин нэр, `<img>` шууд — дүрмийн зөрчил).
 *
 * Япон эмийн сангийн дэлгүүрийн (drugstore) уламжлал: цагаан дэвсгэр дээрх packshot,
 * брэнд жижиг том үсгээр дээр нь, нэр 2 мөр, үнэ тод, хямдрал/нөөц зураг дээр тэмдгээр.
 * Cosme Kitchen-ийн hairline хүрээ, 4px булан, тайван үед сүүдэргүй — эзний шийдвэрээр
 * (2026-10-18) хэлбэрийн токен хэвээр. Загвар: `client/src/styles/product-card.css`.
 *
 * framer-motion ИМПОРТЛОХГҮЙ: нүүр (eager) энэ картыг зурдаг. Хөдөлгөөн нь CSS.
 */
export default function ProductCard<T extends ProductCardData>({ product, variant, imageSizes, headingLevel = 3, rank, reason, revealDelayMs, onNavigate, onQuickView, wishlist, cart, footer }: ProductCardProps<T>) {
  const t = useT();
  const names = useProductName()(product);
  const price = productCardPrice(product);
  const stock = productCardStock(product);
  const rating = productCardRating(product);
  const brand = productCardBrand(product, brandName());
  const href = `/product/${product.slug}`;
  const image = product.imageUrl ?? getCategoryPlaceholderImage(product.categorySlug);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const remember = onNavigate ? () => onNavigate(product.id) : undefined;
  const outOfStock = stock.state === "out_of_stock";

  const flags = (
    <span className="sf-product-flags">
      {price.salePercent ? <Badge tone="sale">-{price.salePercent}<i>%</i></Badge> : null}
      {outOfStock ? <Badge tone="out">{t("Нөөц дууссан")}</Badge> : stock.state === "low_stock" ? <Badge tone="low">{`${stock.remaining} ширхэг үлдсэн`}</Badge> : null}
    </span>
  );
  const picture = <ResponsivePicture src={image} fullWidth={1600} sizes={imageSizes} alt="" loading="lazy" />;
  const title = (
    <>
      <Heading className="sf-product-name">{names.primary}</Heading>
      {names.secondary ? <span className="sf-product-subtitle">{names.secondary}</span> : null}
    </>
  );
  const ratingNode = rating ? <StarRating average={rating.average} count={rating.count} filled={rating.filled} variant={variant === "shelf" ? "stars" : "compact"} /> : null;

  if (variant === "shelf") {
    // Нүүрний rail: карт бүхэлдээ нэг <Link> (дотроо интерактив элементгүй — үүрлэсэн
    // товч нь хүртээмжийн алдаа). Дугаар картын ДЭЭР, хүрээнээс гадна (лавлагааны загвар).
    return (
      <Link href={href} onClick={remember} className={cn("sf-product sf-product--shelf", outOfStock && "is-out")}>
        {rank !== undefined ? <span className="sf-product-rank">{`No.${rank}`}</span> : null}
        <span className="sf-product-frame">
          <span className="sf-product-media">{picture}{flags}</span>
          <span className="sf-product-body">
            <span className="sf-product-brand">{brand}</span>
            {title}
            {ratingNode}
            <PriceBlock priceMnt={price.priceMnt} compareAtMnt={price.compareAtMnt} />
          </span>
        </span>
      </Link>
    );
  }

  if (variant === "compact") {
    return (
      <article className="sf-product sf-product--compact">
        <Link href={href} onClick={remember} className="sf-product-row">
          <span className="sf-product-media">{picture}{price.salePercent ? <span className="sf-product-flags"><Badge tone="sale">-{price.salePercent}<i>%</i></Badge></span> : null}</span>
          <span className="sf-product-body">
            <span className="sf-product-brand">{brand}</span>
            {title}
            {reason ? <span className="sf-product-reason">{reason}</span> : null}
            <PriceBlock priceMnt={price.priceMnt} compareAtMnt={price.compareAtMnt} />
          </span>
        </Link>
        {onQuickView ? (
          <button type="button" className="sf-product-quick" onClick={() => onQuickView(product)} aria-label={`${names.primary} шуурхай харах`}>
            {t("Шуурхай харах")} <Eye size={14} aria-hidden="true" />
          </button>
        ) : null}
      </article>
    );
  }

  const style: CSSProperties | undefined = revealDelayMs !== undefined ? { transitionDelay: `${revealDelayMs}ms` } : undefined;
  return (
    <article className={cn("sf-product sf-product--grid shop-product-card", outOfStock && "is-out")} data-reveal={revealDelayMs !== undefined ? "" : undefined} style={style}>
      <div className="sf-product-media">
        {/* Зургийн холбоос нь картын ЭХНИЙ `.shop-product-link` — e2e (helpers/storefront.ts)
            түүнийг төвөөр нь дардаг тул төв хэсгийг юу ч бүрхэхгүй (тэмдэг булан, товч доод ирмэг). */}
        <Link href={href} onClick={remember} className="sf-product-image-link shop-product-link" tabIndex={-1} aria-hidden="true">{picture}</Link>
        {flags}
        {wishlist ? <WishlistToggle name={names.primary} saved={wishlist.saved} onToggle={wishlist.onToggle} /> : null}
        {onQuickView ? (
          <button type="button" className="sf-product-quick" onClick={() => onQuickView(product)} aria-label={`${names.primary} шуурхай харах`}>
            <Eye size={14} aria-hidden="true" /> {t("Шуурхай")}
          </button>
        ) : null}
      </div>
      <div className="sf-product-body">
        <span className="sf-product-brand">{brand}</span>
        <Link href={href} onClick={remember} className="sf-product-title shop-product-link">{title}</Link>
        {ratingNode}
        <div className="sf-product-foot">
          <PriceBlock priceMnt={price.priceMnt} compareAtMnt={price.compareAtMnt} layout="stacked" />
          {cart ? (
            <button type="button" className="sf-product-cart" disabled={outOfStock || cart.pending} onClick={cart.onAdd} aria-label={outOfStock ? `${names.primary} — нөөц дууссан` : `${names.primary}-г сагсанд нэмэх`}>
              {cart.pending ? <LoaderCircle className="sf-spinner" size={18} aria-hidden="true" /> : <ShoppingCart size={18} aria-hidden="true" />}
            </button>
          ) : null}
        </div>
        {footer}
      </div>
    </article>
  );
}
