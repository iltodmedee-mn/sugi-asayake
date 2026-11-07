import { LoaderCircle, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import QuantityStepper from "@/components/product/QuantityStepper";
import ResponsivePicture from "@/components/ResponsivePicture";
import ProgressBar from "@/components/uitripled/ProgressBar";
import { trpc } from "@/lib/trpc";
import { useStoreSetting } from "@/hooks/useStoreSetting";
import { useProductName } from "@/hooks/useProductName";
import { formatVariantAttributes } from "@shared/catalog-filter";
import { UB_DELIVERY_FEE_MNT } from "@shared/const";
import { formatMnt } from "@shared/format";
import { freeShippingProgress } from "@shared/delivery";
import { isDigitalOnlyBasket } from "@shared/gift-cards";

type CartDrawerProps = { open: boolean; onOpenChange: (open: boolean) => void };
const messageFrom = (error: unknown) => error instanceof Error ? error.message : "Сагсыг шинэчилж чадсангүй.";

/**
 * Сагсны drawer. 2026-10-18: нэг урт JSX мөрөөс уншигдахуйц болгож, хуваалцсан
 * QuantityStepper / ResponsivePicture / `.button` класс / ProgressBar (UI TripleD animated-progress-ийн
 * CSS port)-оор — толгой ба BottomNavBar (eager) импортлодог тул ui/button (cva) энд БИШ. Хүртээмжийн нэрс (e2e cart/header-cart/product-variants): "Таны сагс",
 * "`${нэр}` — тоо нэмэх/хасах", "`${нэр}` — сагснаас хасах", "Захиалга үргэлжлүүлэх",
 * "Сагс хоосон байна"; мөрийн `div.border-b` дэгээ хэвээр. Загвар: styles/cart.css.
 */
export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const utils = trpc.useUtils();
  const cart = trpc.cart.current.useQuery(undefined, { enabled: open });
  const update = trpc.cart.updateItemQuantity.useMutation({
    onSuccess: () => utils.cart.current.invalidate(),
    onError: error => toast.error(messageFrom(error)),
  });
  const items = cart.data?.items ?? [];
  const displayName = useProductName();
  const subtotal = items.reduce((sum, item) => sum + item.priceMnt * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  // "Controls everything" admin overhaul (2026-09-08, Phase B): display-only
  // mention here, same admin-editable-with-fallback source as Checkout.tsx.
  const valueForSetting = useStoreSetting();
  const deliveryFeeUbMnt = Number(valueForSetting("delivery-fee-ub-mnt", String(UB_DELIVERY_FEE_MNT)));
  // Үнэгүй хүргэлтийн явц (2026-09-20). Босго нь аль хэдийн тохиргоонд байсан
  // ч худалдан авагчид хэзээ ч харагддаггүй байв — "хэдэн төгрөг дутуу"-г
  // хэлэхгүй бол босго нь худалдан авалтад нөлөөлөхгүй. Тооцоог
  // shared/delivery.ts хийнэ (checkout-ийн бодит төлбөртэй нэг эх сурвалж).
  const freeShipping = freeShippingProgress({
    subtotalMnt: subtotal,
    freeShippingThresholdMnt: Number(valueForSetting("free-shipping-threshold-mnt", "0")),
    digitalOnly: isDigitalOnlyBasket(items),
  });
  // `update` is one shared mutation for every row — without this, changing
  // one item's quantity would disable every +/-/remove button in the list
  // until that single request finishes, not just the row being edited.
  const pendingItemId = update.isPending ? update.variables?.itemId : undefined;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sf-portal sf-cart w-full max-w-md border-l border-border bg-card p-0 sm:max-w-md">
        <SheetHeader className="sf-cart-head">
          <SheetTitle className="sf-cart-title">Таны сагс</SheetTitle>
          {items.length ? <span className="sf-cart-count">{`${itemCount} бараа`}</span> : null}
          <SheetDescription className="sf-cart-description">Захиалгын мэдээллээ шалгаад үргэлжлүүлнэ үү.</SheetDescription>
        </SheetHeader>
        <div className="sf-cart-body">
          {cart.isLoading ? (
            <div className="sf-cart-loading" role="status" aria-label="Ачаалж байна"><LoaderCircle className="sf-spinner" aria-hidden="true" /></div>
          ) : items.length ? (
            <ul className="sf-cart-list">
              {items.map(item => {
                const names = displayName(item);
                const variant = formatVariantAttributes(item.attributesJson);
                const pending = pendingItemId === item.id;
                return (
                  <li key={item.id}>
                    <div className="sf-cart-row border-b">
                      <Link href={`/product/${item.slug}`} onClick={() => onOpenChange(false)} className="sf-cart-thumb" tabIndex={-1} aria-hidden="true">
                        <ResponsivePicture src={item.imageUrl ?? "/product-placeholder.svg"} fullWidth={1600} sizes="80px" alt="" loading="lazy" />
                      </Link>
                      <div className="sf-cart-info">
                        <h3 className="sf-cart-name"><Link href={`/product/${item.slug}`} onClick={() => onOpenChange(false)}>{names.primary}</Link></h3>
                        {names.secondary ? <p className="sf-cart-subtitle">{names.secondary}</p> : null}
                        {variant ? <p className="sf-cart-variant">{variant}</p> : null}
                        <p className="sf-cart-unit">{formatMnt(item.priceMnt)}</p>
                        <div className="sf-cart-controls">
                          <QuantityStepper size="sm" value={item.quantity} itemName={names.primary} disabled={pending} canIncrease={item.quantity < item.stockQuantity} onChange={quantity => update.mutate({ itemId: item.id, quantity })} />
                          <strong className="sf-cart-line">{formatMnt(item.priceMnt * item.quantity)}</strong>
                        </div>
                      </div>
                      <button type="button" className="sf-cart-remove" disabled={pending} onClick={() => update.mutate({ itemId: item.id, quantity: 0 })} aria-label={`${names.primary} — сагснаас хасах`}>
                        <Trash2 size={17} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="sf-cart-empty">
              <ShoppingBag size={28} aria-hidden="true" />
              <p className="sf-cart-empty-title">Сагс хоосон байна</p>
              <p>Танд тохирох бүтээгдэхүүнээ сонгоорой.</p>
              <Link href="/shop" onClick={() => onOpenChange(false)} className="button button-outline button-sm">Дэлгүүр үзэх</Link>
            </div>
          )}
        </div>
        <SheetFooter className="sf-cart-foot">
          {freeShipping && items.length > 0 ? (
            <div className="sf-cart-free">
              <p>{`Үнэгүй хүргэлтэд ${formatMnt(freeShipping.remainingMnt)} дутуу байна.`}</p>
              <ProgressBar ratio={freeShipping.ratio} label="Үнэгүй хүргэлтийн явц" />
            </div>
          ) : null}
          <div className="sf-cart-total">
            <span>Дүн</span>
            <strong>{formatMnt(subtotal)}</strong>
          </div>
          {items.length > 0 ? (
            <Link href="/checkout" onClick={() => onOpenChange(false)} className="button button-primary sf-cart-checkout">Захиалга үргэлжлүүлэх</Link>
          ) : null}
          <p className="sf-cart-note">{`Улаанбаатар хүргэлт: ${formatMnt(deliveryFeeUbMnt)} (эсвэл салбараас үнэгүй авах). Дээрх дүн хүргэлтийн төлбөр орохгүй.`}</p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
