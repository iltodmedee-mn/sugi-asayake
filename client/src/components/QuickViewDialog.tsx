import { ArrowUpRight, Eye, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import VariantPicker from "@/components/VariantPicker";
import PriceBlock from "@/components/product/PriceBlock";
import QuantityStepper from "@/components/product/QuantityStepper";
import ResponsivePicture from "@/components/ResponsivePicture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { notifyAddedToCart } from "@/lib/addedToCartToast";
import { trpc } from "@/lib/trpc";
import { useLocale } from "@/hooks/useLocale";
import { useProductName } from "@/hooks/useProductName";
import { translateProductText } from "@shared/product-i18n";
import { getCategoryPlaceholderImage, getSalePercent } from "@shared/catalog-filter";
import { brandName } from "@/lib/brand";

export type QuickViewProduct = {
  id: number;
  slug: string;
  name: string;
  /** Монгол нэр (2026-09-20) — харагдах дараалал shared/product-name.ts. */
  nameMn?: string | null;
  /** Санал болголт v3: яагаад санал болгосон ("Хуурай арьсанд", "Нөхжилт"). */
  reasons?: string[];
  brand?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  priceMnt: number;
  compareAtPriceMnt?: number | null;
  stockQuantity: number;
};

type QuickViewDialogProps = {
  open: boolean;
  product: QuickViewProduct | null;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
};

const messageFrom = (error: unknown) => error instanceof Error ? error.message : "Сагсанд нэмж чадсангүй.";

export default function QuickViewDialog({ open, product, onOpenChange, onAdded }: QuickViewDialogProps) {
  const locale = useLocale();
  const [quantity, setQuantity] = useState(1);
  const utils = trpc.useUtils();
  const detail = trpc.catalog.bySlug.useQuery({ slug: product?.slug ?? "catalog-preview" }, { enabled: open && Boolean(product) });
  const addItem = trpc.cart.addItem.useMutation({
    onSuccess: () => {
      utils.cart.current.invalidate();
      // 2026-09-23: `useProductName()`-ээр (PROJECT-GUIDE: storefront барааны
      // нэрийг зөвхөн түүгээр харуулна). Өмнө нь латин `product.name`-ийг
      // шууд уншдаг тул `mn` горимд toast нь худалдан авагчийн дөнгөж уншсан
      // монгол гарчигнаас өөр нэр дуудаж байв.
      notifyAddedToCart(`${namesRef.current || "Бараа"} сагсанд нэмэгдлээ.`);
      onOpenChange(false);
      onAdded();
    },
    onError: error => toast.error(messageFrom(error)),
  });
  const display = detail.data ?? product;
  const displayName = useProductName();
  const names = display ? displayName(display) : { primary: "", secondary: null };
  // `names` нь mutation-ийн ДАРАА тунхаглагдсан тул onSuccess дотор шууд
  // уншиж болохгүй — ref-ээр дамжуулна (2026-09-23).
  const namesRef = useRef(names.primary);
  namesRef.current = names.primary;
  // PHASE 2 of product variants: same "only when there's an actual choice"
  // rule as ProductDetail -- a single-variant product shows no picker here
  // either.
  const variantsQuery = trpc.catalog.variants.useQuery({ productId: product?.id ?? 0 }, { enabled: open && Boolean(product) });
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  useEffect(() => { setQuantity(1); setSelectedVariantId(null); }, [product?.id, open]);
  useEffect(() => {
    if (selectedVariantId !== null) return;
    const variants = variantsQuery.data;
    if (!variants?.length) return;
    // 2026-09-27: default variant дууссан нөөцтэй байвал шууд "Нөөц дууссан"
    // харуулахын оронд эхлээд нөөцтэй default, дараа нь нөөцтэй ямар ч
    // variant сонгоно (ProductDetail.tsx-тэй ижил дараалал).
    const defaultVariant = variants.find(variant => variant.isDefault);
    const preferred = (defaultVariant && defaultVariant.stockQuantity > 0 ? defaultVariant : null)
      ?? variants.find(variant => variant.stockQuantity > 0)
      ?? defaultVariant
      ?? variants[0];
    setSelectedVariantId(preferred.id);
  }, [variantsQuery.data, selectedVariantId]);

  const variants = variantsQuery.data ?? [];
  const hasVariantChoice = variants.length > 1;
  const selectedVariant = variants.find(variant => variant.id === selectedVariantId) ?? null;
  const availableStock = Math.max(0, hasVariantChoice && selectedVariant ? selectedVariant.stockQuantity : display?.stockQuantity ?? 0);
  // 2026-09-23: сонгосон variant (эсвэл түүний нөөц) солигдоход тоог хязгаарт
  // буулгана. Өмнө нь `quantity` зөвхөн `[product?.id, open]` дээр л
  // шинэчлэгддэг тул 20 үлдэгдэлтэй variant дээр 3 болгоод 1 үлдэгдэлтэй
  // variant рүү сэлгэхэд "+" товч хаагддаг ч утга 3 хэвээр үлдэж, "Сагсанд
  // нэмэх" нь серверийн "нөөц хүрэлцэхгүй" алдаанд (production-д ерөнхий
  // INTERNAL мессеж болж маскалагддаг) унадаг байв.
  useEffect(() => {
    setQuantity(current => Math.min(Math.max(1, current), Math.max(1, availableStock)));
  }, [availableStock]);

  const addToCart = () => {
    if (!display) return;
    if (hasVariantChoice && selectedVariant) addItem.mutate({ variantId: selectedVariant.id, quantity });
    else addItem.mutate({ productId: display.id, quantity });
  };

  if (!display) return null;
  const activePriceMnt = hasVariantChoice && selectedVariant ? selectedVariant.priceMnt : display.priceMnt;
  const activeCompareAtPriceMnt = hasVariantChoice && selectedVariant ? selectedVariant.compareAtPriceMnt ?? null : display.compareAtPriceMnt;
  const available = availableStock;
  const description = translateProductText(detail.data?.description ?? display.shortDescription ?? "Японоос албан ёсоор нийлүүлсэн өдөр тутмын арчилгааны сонголт.", locale, display);
  const salePercent = getSalePercent(activePriceMnt, activeCompareAtPriceMnt);

  const stockLabel = available > 0 ? `${available} ширхэг үлдсэн` : "Нөөц дууссан";
  // 2026-10-18: `sf-portal` (Radix портал .sugi-site-ээс гадна), ResponsivePicture, хуваалцсан
  // PriceBlock/Badge/QuantityStepper; утсанд доороос гарч ирэх хуудас (UI TripleD bottom-modal-ийн
  // хэв маяг, CSS-ээр — styles/routes/shop.css). Хүртээмжийн нэр, нөөцийн хязгаар хэвээр.
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sf-portal sf-quick p-0 sm:max-w-3xl" showCloseButton={false}>
      <div className="sf-quick-topline">
        <span><Eye size={14} aria-hidden="true" /> QUICK VIEW</span>
        <button type="button" onClick={() => onOpenChange(false)} aria-label="Хаах"><X size={18} aria-hidden="true" /></button>
      </div>
      <div className="sf-quick-layout">
        <div className="sf-quick-media">
          <ResponsivePicture src={display.imageUrl ?? getCategoryPlaceholderImage(display.categorySlug)} fullWidth={1600} sizes="(max-width: 760px) 90vw, 340px" alt={names.primary} />
          <Badge tone={available > 0 ? "neutral" : "out"} className="sf-quick-stock">{stockLabel}</Badge>
        </div>
        <div className="sf-quick-copy">
          <DialogDescription className="sf-quick-brand">{display.brand ?? display.categoryName ?? brandName()}</DialogDescription>
          <DialogTitle className="sf-quick-title">{names.primary}</DialogTitle>
          {names.secondary ? <p className="sf-quick-subtitle">{names.secondary}</p> : null}
          <p className="sf-quick-description">{detail.isLoading ? "Дэлгэрэнгүй мэдээллийг ачаалж байна…" : description}</p>
          <div className="sf-quick-price">
            <PriceBlock priceMnt={activePriceMnt} compareAtMnt={salePercent ? activeCompareAtPriceMnt ?? null : null} />
            {salePercent ? <Badge tone="sale">-{salePercent}<i>%</i></Badge> : <span className="sf-quick-tax">НӨАТ багтсан</span>}
          </div>
          {hasVariantChoice ? <VariantPicker variants={variants} selectedId={selectedVariantId} onSelect={setSelectedVariantId} className="mb-5" /> : null}
          <div className="sf-quick-actions">
            <QuantityStepper value={quantity} onChange={value => setQuantity(Math.min(Math.max(1, available), value))} canIncrease={quantity < available} />
            <Button className="sf-quick-add" loading={addItem.isPending} disabled={available === 0 || quantity > available} onClick={addToCart}>{addItem.isPending ? null : <ShoppingBag size={17} aria-hidden="true" />}{available === 0 ? "Нөөц дууссан" : "Сагсанд нэмэх"}</Button>
          </div>
          <Link href={`/product/${display.slug}`} onClick={() => onOpenChange(false)} className="sf-quick-detail">Бүтэн мэдээлэл харах <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}
