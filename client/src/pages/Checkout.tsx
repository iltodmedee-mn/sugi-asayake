import { Check, CircleAlert, CreditCard, LoaderCircle, MapPin, ShoppingBag, Smartphone, Truck } from "lucide-react";
import { newRequestId } from "@/lib/requestId";
import { useFieldErrors } from "@/hooks/useFieldErrors";
import { isValidEmailInput, isValidPhoneInput, MIN_ADDRESS_LENGTH, MIN_NAME_LENGTH } from "@/lib/clientValidation";
import { trackEvent } from "@/lib/analytics";
import { useDocumentMeta } from "@/lib/useDocumentMeta";
import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import CommerceHeader from "@/components/CommerceHeader";
import OrderConfirmation from "@/components/OrderConfirmation";
import PhoneVerificationStep from "@/components/PhoneVerificationStep";
import SiteFooter from "@/components/SiteFooter";
import ResponsivePicture from "@/components/ResponsivePicture";
import ProgressBar from "@/components/uitripled/ProgressBar";
import { useProductName } from "@/hooks/useProductName";
import "@/styles/routes/checkout.css";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import type { RouterOutputs } from "@/lib/trpc";
import { getStoredTrafficSource } from "@/lib/trafficSource";
import { useStoreSetting } from "@/hooks/useStoreSetting";
import { useSiteText } from "@/hooks/useSiteText";
import { normaliseMongolianMobile } from "@shared/mobile";
import { formatVariantAttributes } from "@shared/catalog-filter";
import { UB_DELIVERY_FEE_MNT } from "@shared/const";
import { computeDeliveryFeeMnt, freeShippingProgress } from "@shared/delivery";
import { isDigitalOnlyBasket } from "@shared/gift-cards";
import { ubDistricts, ubDistrictLabels, type UbDistrict } from "@shared/districts";
import { formatMnt } from "@shared/format";
import { brandName } from "@/lib/brand";

const messageFrom = (error: unknown) => error instanceof Error ? error.message : "Захиалгыг үргэлжлүүлж чадсангүй. Дахин оролдоно уу.";

export default function Checkout() {
  const textFor = useSiteText();
  const displayName = useProductName();
  useDocumentMeta(textFor("seo-text-checkout-title", `Захиалга баталгаажуулах — ${brandName()}`), null);
  const [checkoutLine1, checkoutLine2] = textFor("checkout-text-heading", "Захиалгаа\nбаталгаажуулах.").split("\n");
  const [delivery, setDelivery] = useState<"delivery" | "pickup">("delivery");
  const [payment, setPayment] = useState<"qpay" | "storepay" | "cash">("cash");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [district, setDistrict] = useState<UbDistrict | "">("");
  const [pickupBranch, setPickupBranch] = useState("");
  // "Controls everything" admin overhaul (2026-09-08, Phase J): replaces a
  // hardcoded 3-branch array that had silently drifted out of sync with the
  // real 4 branches (see locations-data.ts's own comment on branch 04) --
  // this is now the same live query StoreLocatorSection/SiteFooter read.
  const branchesQuery = trpc.content.branches.useQuery();
  const branchOptions = branchesQuery.data ?? [];
  const [qpayInvoice, setQpayInvoice] = useState<{ orderId: number; orderNumber: string; qrText: string | null; urls: Array<{ name?: string; description?: string; link?: string }> } | null>(null);
  /**
   * Захиалга үүссэн ч төлбөрийн нэхэмжлэл/зээл авч чадаагүй тохиолдол
   * (2026-09-23) — доорх `retryPaymentSetup`-ийн тайлбарыг үз.
   */
  const [paymentSetupFailed, setPaymentSetupFailed] = useState<{ orderId: number; orderNumber: string; kind: "qpay" | "storepay" } | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  // Set the instant checkout.createOrder succeeds, for either payment
  // method. Whether it's actually shown as "confirmed" depends on payment
  // method: a cash/pickup order is confirmed immediately, but a QPay order
  // isn't until qpayStatus polling below reports it paid (see
  // isOrderConfirmed) — never for a QPay order still sitting on an unpaid
  // invoice.
  const [placedOrder, setPlacedOrder] = useState<RouterOutputs["checkout"]["createOrder"] | null>(null);
  // 2026-09-27: захиалга үүсмэгц сагс invalidate хийгддэг (доор) тул QPay/
  // StorePay нэхэмжлэл хүлээж буй дэлгэц дээр захиалгын мөрүүд "Сагс хоосон"
  // болж, дүн 0₮ гарч байв — тэр мөчид сагсанд байсныг барьж авна.
  const [placedOrderItems, setPlacedOrderItems] = useState<typeof cartItems>([]);
  const { isAuthenticated, user } = useAuth();
  // Guest checkout phone verification (2026-09-14): the server decides who
  // has to verify (no verified phone on the account, switch on in /admin).
  // 2026-09-27: the server now also requires OTP for a SIGNED-IN shopper
  // typing a phone that differs from their account's verified one -- send
  // the typed number (debounced, trimmed) so that case is detected; omit
  // the input while empty to keep the plain guest behaviour.
  const [debouncedCustomerPhone, setDebouncedCustomerPhone] = useState("");
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedCustomerPhone(customerPhone.trim()), 400);
    return () => clearTimeout(handle);
  }, [customerPhone]);
  // placeholderData: keepPreviousData (2026-09-27) -- the query key changes
  // every time debouncedCustomerPhone changes, and without it `data` went
  // through `undefined` on each refetch, flickering the OTP block open/
  // closed while the shopper was still typing their phone number.
  const otpRequiredQuery = trpc.checkout.guestPhoneVerificationRequired.useQuery(debouncedCustomerPhone ? { customerPhone: debouncedCustomerPhone } : undefined, { placeholderData: keepPreviousData });
  const otpRequired = otpRequiredQuery.data === true;
  const [verifiedPhone, setVerifiedPhone] = useState<{ sessionId: string; phone: string } | null>(null);
  const digitsOf = (value: string) => value.replace(/\D/g, "").replace(/^976(?=\d{8}$)/, "");
  const phoneVerified = Boolean(verifiedPhone && digitsOf(verifiedPhone.phone) === digitsOf(customerPhone));
  const utils = trpc.useUtils();
  const cartQuery = trpc.cart.current.useQuery();
  const qpayAvailability = trpc.payments.qpayAvailability.useQuery();
  // StorePay (2026-09-12): the shop already takes it in all four branches.
  const storepayAvailability = trpc.payments.storepayAvailability.useQuery();
  const createStorepayLoan = trpc.payments.storepayCreateLoan.useMutation();
  const checkStorepayLimit = trpc.payments.storepayLimit.useMutation();
  const [storepayLoan, setStorepayLoan] = useState<{ orderId: number; orderNumber: string; loanId: string } | null>(null);
  // What StorePay says this phone number may borrow. Asked when the option
  // is picked, so a shopper is told BEFORE an order exists -- placing one
  // and only then having the loan refused is a dead end.
  const [storepayLimit, setStorepayLimit] = useState<{ mobileNumber: string; possibleAmountMnt: number | null } | null>(null);
  const savedAddresses = trpc.profile.addresses.list.useQuery(undefined, { enabled: isAuthenticated });
  const createOrder = trpc.checkout.createOrder.useMutation();
  // One random id per checkout ATTEMPT (2026-09-12). Sent with the order so
  // the server can recognise a retry -- a request that timed out after the
  // server had committed, a browser resend, a second tab -- and return the
  // same order instead of placing the basket twice. Rotated only after a
  // success: a failed attempt must keep its id, or the retry would count as
  // a new attempt.
  const checkoutRequestIdRef = useRef(newRequestId());
  const createInvoice = trpc.payments.qpayCreateInvoice.useMutation();
  // Prefill from the profile page once its data arrives, without ever
  // clobbering something the shopper already typed — each effect fires at
  // most once (per field group) and only fills empty fields.
  const contactSeeded = useRef(false);
  useEffect(() => {
    if (contactSeeded.current || !user) return;
    contactSeeded.current = true;
    setCustomerName(current => current || (user.name?.trim() ?? ""));
    setCustomerPhone(current => current || (user.phone?.trim() ?? ""));
    setCustomerEmail(current => current || (user.email ?? ""));
  }, [user]);
  const addressSeeded = useRef(false);
  useEffect(() => {
    if (addressSeeded.current || !savedAddresses.data) return;
    addressSeeded.current = true;
    const defaultAddress = savedAddresses.data.find(item => item.isDefault) ?? savedAddresses.data[0];
    if (defaultAddress) {
      setDeliveryAddress(current => current || defaultAddress.addressLine);
      setDistrict(current => current || (defaultAddress.district as UbDistrict | null) || "");
    }
  }, [savedAddresses.data]);
  const statusInput = useMemo(() => ({ orderId: qpayInvoice?.orderId ?? storepayLoan?.orderId ?? 0 }), [qpayInvoice?.orderId, storepayLoan?.orderId]);
  // 2026-09-20 (P1-3): stops once paid -- the hook stays mounted under the
  // confirmation screen, so the old constant interval polled every 5s for as
  // long as the tab was open, eating the per-IP API budget for nothing.
  const qpayStatus = trpc.payments.qpayStatus.useQuery(statusInput, {
    enabled: Boolean(statusInput.orderId),
    // 2026-09-23: цуцлагдсан/буцаагдсан захиалга дээр ч зогсоно. 2026-09-20-ны
    // засвар зөвхөн "paid"-ийг хамарсан тул өөр табаас цуцалсан QPay захиалга
    // дээр энэ таб 5 секунд тутам мөнхөд асуусаар (цагт 720 хүсэлт, өөрийн
    // IP-ийн хязгаарын эсрэг) байв.
    refetchInterval: query => {
      if (!(qpayInvoice || storepayLoan)) return false;
      // 2026-09-27: алдаатай хариу авсаар байхад 5с тутам мөнхөд дахин
      // оролддог байсан (сүлжээ тасарсан/сервер 500 үед ч зогсдоггүй).
      if (query.state.status === "error") return false;
      const data = query.state.data;
      const settled = data?.paymentStatus === "paid" || data?.orderStatus === "cancelled" || data?.orderStatus === "returned";
      return settled ? false : 5_000;
    },
  });
  // 2026-09-27: дэлгүүрийн зээлээр бүрэн төлөгдсөн (0₮) захиалгыг сервер шууд `paid` болгоно — нэхэмжлэл хүлээхгүй.
  const isOrderConfirmed = Boolean(placedOrder) && ((placedOrder!.paymentMethod !== "qpay" && placedOrder!.paymentMethod !== "storepay") || placedOrder!.paymentStatus === "paid" || qpayStatus.data?.paymentStatus === "paid");
  // PREMIUM-FEATURES.md TIER 4: preview-only — this is the exact same
  // getApplicableRoutineDiscount call checkout.createOrder makes for real,
  // so what's shown here is guaranteed to match what's actually charged.
  const routineDiscount = trpc.cart.applicableRoutineDiscount.useQuery();
  // Manually-entered coupon ("SALE10") — only fetched once the shopper
  // actually clicks "Хэрэглэх" (see applyCoupon below), same
  // never-trust-a-client-amount discipline as the routine/loyalty previews:
  // this is the exact same validateDiscountCode call checkout.createOrder
  // makes for real.
  const couponQuery = trpc.cart.applicableCouponDiscount.useQuery({ code: appliedCoupon }, { enabled: Boolean(appliedCoupon), retry: false });
  // PREMIUM-FEATURES.md TIER 5: loyalty tier discount preview. A real
  // server round-trip (cart.applicableLoyaltyDiscount) — this used to be
  // reimplemented client-side from loyalty.myStatus's raw discountPercent,
  // a second, independent copy of the exact formula
  // getApplicableLoyaltyDiscount already runs server-side, with no
  // guarantee the two would stay in sync if either changed. Guests don't
  // have a membership card, so this is skipped entirely when logged out —
  // the query would 401 anyway (protectedProcedure).
  const loyaltyDiscountQuery = trpc.cart.applicableLoyaltyDiscount.useQuery({ couponCode: appliedCoupon || null }, { enabled: isAuthenticated });
  // "Controls everything" admin overhaul (2026-09-08, Phase I): store
  // credit applies last, against the final payable total (it's cash-
  // equivalent, not a percentage discount that should stack differently).
  // Guests have no account to hold a balance, so this is skipped entirely
  // when logged out — matches loyaltyDiscountQuery's own enabled condition.
  const storeCreditBalanceQuery = trpc.cart.myStoreCreditBalance.useQuery(undefined, { enabled: isAuthenticated });
  const storeCreditBalanceMnt = storeCreditBalanceQuery.data ?? 0;
  const [useStoreCredit, setUseStoreCredit] = useState(false);
  // Memoised so the begin_checkout effect below has a stable dependency
  // rather than a fresh array identity on every render.
  const cartItems = useMemo(() => cartQuery.data?.items ?? [], [cartQuery.data]);
  // GA4/Meta funnel step between add_to_cart and purchase. Fired once, when
  // the cart first has contents on this screen -- without the ref, every
  // quantity change on the checkout page would count as a new checkout.
  const beginCheckoutFiredRef = useRef(false);
  useEffect(() => {
    if (beginCheckoutFiredRef.current || !cartItems.length) return;
    beginCheckoutFiredRef.current = true;
    trackEvent("begin_checkout", { value: cartItems.reduce((sum, item) => sum + item.priceMnt * item.quantity, 0), items: cartItems.map(item => ({ item_id: item.sku, item_name: item.name, price: item.priceMnt, quantity: item.quantity })) });
  }, [cartItems]);
  // Gift cards only (2026-09-14): nothing to deliver, no branch to pick from.
  // The server applies the same rule (shared/gift-cards.ts) and ignores
  // whatever delivery fields it is sent for such a basket.
  const digitalOnly = isDigitalOnlyBasket(cartItems);
  const subtotal = cartItems.reduce((sum, item) => sum + item.priceMnt * item.quantity, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  // "Controls everything" admin overhaul (2026-09-08, Phase B): admin-
  // editable via store_settings, falling back to today's hardcoded
  // UB_DELIVERY_FEE_MNT/no-threshold values -- this is only a preview for
  // display, the real charge is always computed server-side the same way
  // (server/db.ts's createOrderFromActiveCart), so a stale/cached value here
  // is never a billing risk.
  const valueForSetting = useStoreSetting();
  const deliveryFeeUbMnt = Number(valueForSetting("delivery-fee-ub-mnt", String(UB_DELIVERY_FEE_MNT)));
  const freeShippingThresholdMnt = Number(valueForSetting("free-shipping-threshold-mnt", "0"));
  // Audit 2026-09-09: the same shared rule the server charges with
  // (shared/delivery.ts) -- no second hand-copied formula here any more.
  const deliveryFee = computeDeliveryFeeMnt({ deliveryMethod: delivery === "delivery" ? "ub_delivery" : "store_pickup", subtotalMnt: subtotal, deliveryFeeUbMnt, freeShippingThresholdMnt, digitalOnly });
  // Хүргэлт сонгосон үед л утгатай: салбараас авах нь аль хэдийн үнэгүй.
  const freeShipping = delivery === "delivery" ? freeShippingProgress({ subtotalMnt: subtotal, freeShippingThresholdMnt, digitalOnly }) : null;

  // Маягтын алдаа (2026-09-20, хүртээмж): өмнө нь дутуу талбарыг ЗӨВХӨН toast-оор
  // хэлдэг байсан — toast нь хэдхэн секундын дараа алга болдог, аль талбар дутууг
  // заадаггүй, дэлгэц уншигч холбож өгдөггүй. Baymard-ийн validation зөвлөмж ба
  // WCAG 3.3.1 (Error Identification) хоёулаа алдааг ТАЛБАР дээр нь, текстээр
  // шаарддаг. Одоо талбар бүр `aria-invalid` + `aria-describedby`-аар өөрийн
  // алдааны мөртэй холбогдоно; toast нь нэмэлт л болно.
  // 2026-09-21: нэг hook (client/src/hooks/useFieldErrors.tsx) — Login, ForgotPassword,
  // TrackOrder, JobApplicationModal ч ижил загвартай.
  const { errorFor, fieldProps, clearError, showErrors } = useFieldErrors();
  const discountMnt = routineDiscount.data?.discountMnt ?? 0;
  const couponDiscountMnt = couponQuery.data?.discountMnt ?? 0;
  const loyaltyDiscountMnt = loyaltyDiscountQuery.data?.discountMnt ?? 0;
  const totalBeforeStoreCredit = Math.max(0, subtotal + deliveryFee - discountMnt - couponDiscountMnt - loyaltyDiscountMnt);
  const appliedStoreCreditMnt = useStoreCredit ? Math.min(storeCreditBalanceMnt, totalBeforeStoreCredit) : 0;
  const total = totalBeforeStoreCredit - appliedStoreCreditMnt;

  // 2026-09-23: буруу код нь "хэрэглэсэн" хэвээр үлдэж, цонх фокус авах бүрт
  // (staleTime 30 с) дахин асуугдаад ижил toast дахин гарч байв. Алдаа гармагц
  // кодыг хасна — худалдан авагч дахин бичиж чадна, toast нэг л удаа гарна.
  useEffect(() => {
    if (!couponQuery.isError) return;
    toast.error(messageFrom(couponQuery.error));
    setAppliedCoupon("");
  }, [couponQuery.isError, couponQuery.error]);

  const applyCoupon = () => {
    const trimmed = couponInput.trim();
    if (!trimmed) { toast.error("Хямдралын код оруулна уу."); return; }
    setAppliedCoupon(trimmed);
  };
  const removeCoupon = () => { setAppliedCoupon(""); setCouponInput(""); };
  // Both online methods need an account: payments.qpayCreateInvoice and
  // payments.storepayCreateLoan are protectedProcedure. Before 2026-09-12 a
  // guest could pick QPay, have the order created, and only then hit an
  // authorisation error -- so the option is now simply not offered to them.
  const qpayReady = qpayAvailability.data?.configured === true && isAuthenticated;
  const storepayReady = storepayAvailability.data?.configured === true && isAuthenticated;
  const isSubmitting = createOrder.isPending || createInvoice.isPending || createStorepayLoan.isPending;

  const askStorepayLimit = async () => {
    const phone = customerPhone.trim();
    if (!storepayReady || phone.length < 8) { setStorepayLimit(null); return; }
    try {
      setStorepayLimit(await checkStorepayLimit.mutateAsync({ mobileNumber: phone }));
    } catch {
      // Their service being unreachable must not block the checkout: the
      // real limit is enforced when the loan is created either way.
      setStorepayLimit(null);
    }
  };

  /**
   * Захиалга үүссэн ч төлбөрийн нэхэмжлэл/зээл авч чадаагүй тохиолдол
   * (2026-09-23). Сервер тал idempotent (`qpayCreateInvoice` байгаа
   * нэхэмжлэлээ буцаана) тул дахин оролдох нь шинэ захиалга үүсгэхгүй.
   */
  const retryPaymentSetup = async () => {
    if (!paymentSetupFailed) return;
    try {
      if (paymentSetupFailed.kind === "qpay") {
        const invoice = await createInvoice.mutateAsync({ orderId: paymentSetupFailed.orderId });
        setQpayInvoice(invoice);
      } else {
        const loan = await createStorepayLoan.mutateAsync({ orderId: paymentSetupFailed.orderId, mobileNumber: customerPhone.trim() });
        setStorepayLoan(loan);
      }
      setPaymentSetupFailed(null);
      toast.success("Төлбөрийн хүсэлт дахин бэлэн боллоо.");
    } catch (error) {
      toast.error(messageFrom(error));
    }
  };

  const confirmOrder = async () => {
    if (!cartItems.length) { toast.error("Сагс хоосон байна. Бүтээгдэхүүн сонгоод дахин оролдоно уу."); return; }
    const nextErrors: Record<string, string> = {};
    // 2026-09-27: сервер `customerName` ≥2 тэмдэгт, `customerPhone` тодорхой
    // формат + ≥8 орон, `customerEmail` (өгсөн бол) бодит хаяг, `deliveryAddress`
    // ≥8 тэмдэгт шаарддаг (checkout.createOrder-ийн zod) -- эдгээрийг мөндөр
    // хийхгүй бол toast-оор бүдэг алдаа л гардаг байв.
    if (!customerName.trim()) nextErrors.customerName = "Нэрээ оруулна уу.";
    else if (customerName.trim().length < MIN_NAME_LENGTH) nextErrors.customerName = "Нэр хэт богино байна.";
    if (!customerPhone.trim()) nextErrors.customerPhone = "Утасны дугаараа оруулна уу.";
    else if (!isValidPhoneInput(customerPhone)) nextErrors.customerPhone = "Утасны дугаараа зөв оруулна уу.";
    if (customerEmail.trim() && !isValidEmailInput(customerEmail)) nextErrors.customerEmail = "Имэйл хаягаа зөв оруулна уу.";
    if (!digitalOnly && delivery === "delivery" && !deliveryAddress.trim()) nextErrors.deliveryAddress = "Хүргэлтийн хаягаа бичнэ үү.";
    else if (!digitalOnly && delivery === "delivery" && deliveryAddress.trim().length < MIN_ADDRESS_LENGTH) nextErrors.deliveryAddress = "Хаягаа дэлгэрэнгүй бичнэ үү (дор хаяж 8 тэмдэгт).";
    if (!digitalOnly && delivery === "pickup" && !pickupBranch) nextErrors.pickupBranch = "Авах салбараа сонгоно уу.";
    if (showErrors(nextErrors)) {
      toast.error("Захиалга батлахад дутуу мэдээлэл байна.");
      return;
    }
    if (otpRequired && !phoneVerified) { toast.error("Захиалга батлахын өмнө утасны дугаараа баталгаажуулна уу."); return; }
    if (payment === "qpay" && !qpayReady) { toast.message("QPay merchant setup pending", { description: "QPay merchant credentials ороогүй тул бодит төлбөр одоогоор идэвхгүй." }); return; }
    if (payment === "storepay" && !storepayReady) { toast.message("StorePay тохиргоо хүлээгдэж байна", { description: "Мерчантын мэдээлэл ороогүй тул StorePay одоогоор идэвхгүй." }); return; }
    // A limit we have actually been told is short: stop here rather than
    // create an order whose loan StorePay will refuse.
    if (payment === "storepay" && storepayLimit && storepayLimit.mobileNumber === normaliseMongolianMobile(customerPhone) && storepayLimit.possibleAmountMnt !== null && storepayLimit.possibleAmountMnt < total) {
      toast.error("StorePay-ийн боломжит дүн хүрэхгүй байна.", { description: `${formatMnt(storepayLimit.possibleAmountMnt)} боломжтой, захиалга ${formatMnt(total)}. Өөр төлбөрийн хэлбэр сонгоно уу.` });
      return;
    }
    try {
      const order = await createOrder.mutateAsync({ clientRequestId: checkoutRequestIdRef.current, expectedTotalMnt: total, customerName: customerName.trim(), customerPhone: customerPhone.trim(), customerEmail: customerEmail.trim() || null, deliveryMethod: !digitalOnly && delivery === "delivery" ? "ub_delivery" : "store_pickup", deliveryAddress: !digitalOnly && delivery === "delivery" ? deliveryAddress.trim() : null, district: !digitalOnly && delivery === "delivery" && district ? district : null, pickupBranch: !digitalOnly && delivery === "pickup" ? pickupBranch : null, paymentMethod: payment === "qpay" ? "qpay" : payment === "storepay" ? "storepay" : "cash_on_delivery", couponCode: appliedCoupon || null, applyStoreCreditMnt: appliedStoreCreditMnt || undefined, trafficSource: getStoredTrafficSource() ?? null, phoneVerificationSessionId: otpRequired && verifiedPhone ? verifiedPhone.sessionId : null });
      // 2026-09-27: invalidate-аас ӨМНӨ -- доорх мөрүүд одоо байгаа сагсыг
      // хоослох тул QPay/StorePay нэхэмжлэл хүлээж буй дэлгэц дээрх захиалгын
      // мөрүүдийг (зураг/нэр/тоо) харуулахад ашиглана.
      setPlacedOrderItems(cartItems);
      await utils.cart.current.invalidate();
      await utils.cart.applicableRoutineDiscount.invalidate();
      await utils.loyalty.myStatus.invalidate();
      await utils.cart.myStoreCreditBalance.invalidate();
      removeCoupon();
      setUseStoreCredit(false);
      checkoutRequestIdRef.current = newRequestId();
      setPlacedOrder(order);
      trackEvent("purchase", { value: order.totalMnt, transaction_id: order.orderNumber, items: cartItems.map(item => ({ item_id: item.sku, item_name: item.name, price: item.priceMnt, quantity: item.quantity })) });
      // Cash/pickup orders are confirmed the instant they're placed — see
      // isOrderConfirmed above, which renders OrderConfirmation once this
      // is set (no toast needed anymore, the takeover screen IS the
      // confirmation). A QPay order stays on the invoice UI below until
      // qpayStatus polling reports it paid.
      // 2026-09-23: нэхэмжлэл/зээлийн дуудлага ТУСДАА try дотор. Өмнө нь энэ
      // хоёр захиалга үүсгэсэнтэй ижил try дотор байсан тул провайдер timeout
      // болоход зөвхөн toast гарч, сагс хоосорсон, `qpayInvoice` null хэвээр:
      // худалдан авагч "Сагс хоосон байна" гэсэн дэлгэц хараад төлбөрөө ч
      // төлж чадахгүй, захиалгаа ч олж чадахгүй үлддэг байв.
      // Бүрэн төлөгдсөн (0₮) захиалгад провайдерийн хүсэлт хэрэггүй — сервер 0₮-ийн нэхэмжлэлийг татгалзана.
      const needsProviderPayment = order.paymentStatus !== "paid";
      if (payment === "qpay" && needsProviderPayment) {
        try {
          const invoice = await createInvoice.mutateAsync({ orderId: order.id });
          setQpayInvoice(invoice);
          toast.success("QPay нэхэмжлэл бэлэн боллоо.");
        } catch (error) {
          setPaymentSetupFailed({ orderId: order.id, orderNumber: order.orderNumber, kind: "qpay" });
          toast.error(messageFrom(error));
        }
      }
      // StorePay: the request goes to the shopper's own StorePay app, where
      // they approve it; the order stays unpaid until our callback (or the
      // poll above) sees that approval.
      if (payment === "storepay" && needsProviderPayment) {
        try {
          const loan = await createStorepayLoan.mutateAsync({ orderId: order.id, mobileNumber: customerPhone.trim() });
          setStorepayLoan(loan);
          toast.success("StorePay хүсэлт илгээгдлээ — утсаа шалгана уу.");
        } catch (error) {
          setPaymentSetupFailed({ orderId: order.id, orderNumber: order.orderNumber, kind: "storepay" });
          toast.error(messageFrom(error));
        }
      }
    } catch (error) {
      toast.error(messageFrom(error));
      // 2026-09-29: "Үнэ шинэчлэгдлээ" (нийтийн хямдрал дууссан г.м.) — дүнг дахин уншина, эс бөгөөс ижил хуучин дүнгээр дахин татгалзана.
      void utils.cart.current.invalidate();
      void utils.cart.applicableRoutineDiscount.invalidate();
      void utils.cart.applicableCouponDiscount.invalidate();
      void utils.cart.applicableLoyaltyDiscount.invalidate();
    }
  };

  if (isOrderConfirmed && placedOrder) {
    return <div className="min-h-screen bg-muted text-foreground"><CommerceHeader backLabel={`${brandName()} захиалга`} /><OrderConfirmation order={placedOrder} isAuthenticated={isAuthenticated} /><SiteFooter /></div>;
  }

  // 2026-09-27: placedOrder байгаа үед (QPay/StorePay нэхэмжлэл хүлээж буй,
  // дээрх isOrderConfirmed-ийн эрт буцах шатыг давсан) сагс аль хэдийн
  // хоослогдсон тул амьд cartItems/subtotal/... БИШ, тэр мөчид авсан
  // snapshot + серверийн бодит захиалгын дүнг харуулна.
  const summaryItems = placedOrder ? placedOrderItems : cartItems;
  const summarySubtotal = placedOrder ? placedOrder.subtotalMnt : subtotal;
  const summaryDeliveryFee = placedOrder ? placedOrder.deliveryFeeMnt : deliveryFee;
  const summaryDiscountMnt = placedOrder ? placedOrder.discountMnt : discountMnt;
  const summaryCouponDiscountMnt = placedOrder ? placedOrder.couponDiscountMnt : couponDiscountMnt;
  const summaryLoyaltyDiscountMnt = placedOrder ? placedOrder.loyaltyDiscountMnt : loyaltyDiscountMnt;
  const summaryStoreCreditMnt = placedOrder ? placedOrder.storeCreditAppliedMnt : appliedStoreCreditMnt;
  const summaryTotal = placedOrder ? placedOrder.totalMnt : total;
  const summaryLoading = placedOrder ? false : cartQuery.isLoading;

  // 2026-10-18 (storefront шинэчлэл): нэг 24 KB-ийн JSX мөрийг хэсэг хэсгээр уншигдахуйц болгов;
  // төлөв, handler, id (`#customerName` …), шошго, товчны НЭР (e2e: /Салбараас авах/, /Бэлэн мөнгө/,
  // /Захиалга батлах/) өөрчлөгдөөгүй. Сонголтын карт нь `button` + `aria-pressed` (radio биш —
  // checkout.spec role "button"-оор олдог). Загвар: styles/routes/checkout.css (токен л).
  const optionClass = (selected: boolean) => `sf-option${selected ? " is-selected" : ""}`;
  const optionCheck = (selected: boolean) => <span className="sf-option-check" aria-hidden="true">{selected ? <Check size={13} /> : null}</span>;
  const stepHead = (step: string, title: string, extra?: ReactNode) => (
    <div className="sf-step-head">
      <span className="sf-step-index" aria-hidden="true">{step}</span>
      <h2>{title}</h2>
      {extra}
    </div>
  );
  return <div className="sf-checkout-page min-h-screen bg-muted text-foreground">
    <CommerceHeader cartCount={cartCount} backLabel={`${brandName()} захиалга`} />
    <main className="sf-checkout">
      <header className="sf-checkout-head">
        <p className="sf-checkout-kicker">02 / ASAYAKE ORDER DESK</p>
        <h1>{checkoutLine1} <em>{checkoutLine2}</em></h1>
        <p>{textFor("checkout-text-description", "Захиалгын мэдээллээ баталгаажуулаад, хүргэлт эсвэл салбарынхаа сонголтыг хий. QPay зөвхөн merchant тохиргоо дууссаны дараа идэвхжинэ.")}</p>
      </header>
      <div className="sf-checkout-grid">
        <div className="sf-checkout-steps">
          <section className="sf-step">
            {stepHead("01", "Хүлээн авах мэдээлэл", isAuthenticated ? <Link href="/profile" className="sf-step-link">Профайлаас засах</Link> : null)}
            <div className="sf-fields">
              <label className="sf-field" htmlFor="customerName">Нэр
                <input value={customerName} onChange={event => { setCustomerName(event.target.value); clearError("customerName"); }} placeholder="Таны нэр" autoComplete="name" {...fieldProps("customerName")} className="checkout-input sf-input" />
                {errorFor("customerName") ? <span id="customerName-error" role="alert" className="checkout-field-error">{errorFor("customerName")}</span> : null}
              </label>
              <label className="sf-field" htmlFor="customerPhone">Утас
                <input value={customerPhone} onChange={event => { setCustomerPhone(event.target.value); clearError("customerPhone"); }} placeholder="9911 2233" inputMode="tel" autoComplete="tel" {...fieldProps("customerPhone")} className="checkout-input sf-input" />
                {errorFor("customerPhone") ? <span id="customerPhone-error" role="alert" className="checkout-field-error">{errorFor("customerPhone")}</span> : null}
              </label>
              <label className="sf-field sf-field--wide" htmlFor="customerEmail">Имэйл (сонголтоор)
                <input value={customerEmail} onChange={event => { setCustomerEmail(event.target.value); clearError("customerEmail"); }} placeholder="name@email.com" inputMode="email" autoComplete="email" {...fieldProps("customerEmail")} className="checkout-input sf-input" />
                {errorFor("customerEmail") ? <span id="customerEmail-error" role="alert" className="checkout-field-error">{errorFor("customerEmail")}</span> : null}
              </label>
            </div>
            {otpRequired && (phoneVerified
              ? <p className="sf-notice sf-notice--ok">Утасны дугаар баталгаажсан.</p>
              : <div className="checkout-phone-verify sf-verify">
                  <p className="sf-verify-title">Утасны дугаараа баталгаажуулах</p>
                  <p className="sf-verify-text">Хуурамч захиалгаас хамгаалахын тулд захиалга дээрх дугаар таных гэдгийг нэг удаа SMS-ээр баталгаажуулна. Бүртгэлтэй бол нэвтэрч энэ алхмыг алгасна.</p>
                  <PhoneVerificationStep purpose="checkout" compact initialPhone={customerPhone} onVerified={(sessionId, phone) => { setVerifiedPhone({ sessionId, phone }); if (phone.trim()) setCustomerPhone(phone); }} />
                </div>)}
          </section>
          {digitalOnly ? (
            <section className="sf-step">
              {stepHead("02", "Хүргэлт")}
              <p className="sf-notice sf-notice--ok">Сагсанд зөвхөн бэлгийн карт байна — хүргэлт, салбар хэрэггүй. Төлбөр баталгаажмагц картын код профайлын захиалгын түүх, имэйл (өгсөн бол) болон push мэдэгдлээр ирнэ.</p>
            </section>
          ) : (
            <section className="sf-step">
              {stepHead("02", "Хүргэлт")}
              <div className="sf-options" role="group" aria-label="Хүргэлтийн арга">
                <button type="button" aria-pressed={delivery === "delivery"} onClick={() => setDelivery("delivery")} className={optionClass(delivery === "delivery")}>
                  {optionCheck(delivery === "delivery")}<Truck className="sf-option-icon" size={19} aria-hidden="true" />
                  <span><strong>Улаанбаатар хүргэлт</strong><small>24–48 цаг · {formatMnt(deliveryFeeUbMnt)}-с эхэлнэ</small></span>
                </button>
                <button type="button" aria-pressed={delivery === "pickup"} onClick={() => setDelivery("pickup")} className={optionClass(delivery === "pickup")}>
                  {optionCheck(delivery === "pickup")}<MapPin className="sf-option-icon" size={19} aria-hidden="true" />
                  <span><strong>Салбараас авах</strong><small>Тохирох салбарыг дараагийн алхамд сонгоно</small></span>
                </button>
              </div>
              {delivery === "delivery" ? <>
                <label className="sf-field">Дүүрэг (сонголтоор)
                  <select value={district} onChange={event => setDistrict(event.target.value as UbDistrict | "")} className="sf-input"><option value="">Сонгох</option>{ubDistricts.map(key => <option key={key} value={key}>{ubDistrictLabels[key]}</option>)}</select>
                </label>
                <label className="sf-field" htmlFor="deliveryAddress">Хүргэлтийн хаяг
                  <textarea value={deliveryAddress} onChange={event => { setDeliveryAddress(event.target.value); clearError("deliveryAddress"); }} placeholder="Дүүрэг, хороо, байр, орц, тоот, нэмэлт тайлбар" autoComplete="street-address" {...fieldProps("deliveryAddress")} className="checkout-input sf-input sf-textarea" />
                  {errorFor("deliveryAddress") ? <span id="deliveryAddress-error" role="alert" className="checkout-field-error">{errorFor("deliveryAddress")}</span> : null}
                </label>
              </> : (
                <label className="sf-field" htmlFor="pickupBranch">Авах салбар
                  <select value={pickupBranch} onChange={event => { setPickupBranch(event.target.value); clearError("pickupBranch"); }} {...fieldProps("pickupBranch")} className="checkout-input sf-input"><option value="">Салбар сонгох</option>{branchOptions.map(branch => <option key={branch.id} value={branch.name}>{branch.name}</option>)}</select>
                  {errorFor("pickupBranch") ? <span id="pickupBranch-error" role="alert" className="checkout-field-error">{errorFor("pickupBranch")}</span> : null}
                </label>
              )}
            </section>
          )}
          <section className="sf-step">
            {stepHead("03", "Төлбөр")}
            <div className="sf-options sf-options--3" role="group" aria-label="Төлбөрийн арга">
              <button type="button" aria-pressed={payment === "cash"} onClick={() => setPayment("cash")} className={optionClass(payment === "cash")}>
                {optionCheck(payment === "cash")}<span><strong>Бэлэн мөнгө</strong><small>Хүргэлт эсвэл салбарт хүлээн авах үед</small></span>
              </button>
              <button type="button" aria-pressed={payment === "qpay"} disabled={!qpayReady} onClick={() => setPayment("qpay")} className={optionClass(payment === "qpay")}>
                {optionCheck(payment === "qpay")}<span><strong>QPay</strong><small>{qpayReady ? "QR болон банкны апп" : isAuthenticated ? "Merchant тохиргоо хүлээгдэж байна" : "Нэвтэрсэн үед идэвхжинэ"}</small></span>
              </button>
              <button type="button" aria-pressed={payment === "storepay"} disabled={!storepayReady} onClick={() => { setPayment("storepay"); void askStorepayLimit(); }} className={optionClass(payment === "storepay")}>
                {optionCheck(payment === "storepay")}<span><strong>StorePay</strong><small>{storepayReady ? "Хэсэгчилсэн төлбөр — StorePay апп дээрээ зөвшөөрнө" : isAuthenticated ? "Мерчант тохиргоо хүлээгдэж байна" : "Нэвтэрсэн үед идэвхжинэ"}</small></span>
              </button>
            </div>
            {payment === "storepay" && (checkStorepayLimit.isPending
              ? <p className="sf-checkout-pending"><LoaderCircle className="sf-spinner" size={13} aria-hidden="true" />StorePay-ээс боломжит дүнг асууж байна…</p>
              : storepayLimit && storepayLimit.possibleAmountMnt === null
                ? <p className="sf-notice">Зээлийн лимитийг зөвхөн өөрийн бүртгэлтэй дугаараар шалгана. Захиалгаа үргэлжлүүлж болно — бодит лимит StorePay дээр шалгагдана.</p>
                : storepayLimit && storepayLimit.possibleAmountMnt !== null
                  ? <p className={`sf-notice${storepayLimit.possibleAmountMnt >= total ? " sf-notice--ok" : ""}`}>{storepayLimit.possibleAmountMnt >= total ? `${storepayLimit.mobileNumber} дугаарт ${formatMnt(storepayLimit.possibleAmountMnt)} хүртэл боломжтой байна.` : storepayLimit.possibleAmountMnt > 0 ? `${storepayLimit.mobileNumber} дугаарт одоогоор ${formatMnt(storepayLimit.possibleAmountMnt)} л боломжтой байна — энэ захиалгын ${formatMnt(total)}-д хүрэхгүй.` : `${storepayLimit.mobileNumber} дугаарт StorePay-ийн зээл одоогоор боломжгүй байна.`}</p>
                  : null)}
            {!qpayReady && <div className="sf-notice sf-notice--row"><CircleAlert size={17} aria-hidden="true" /><p><strong>QPay одоогоор идэвхгүй.</strong> {textFor("checkout-text-qpay-notice", "Merchant credentials орох хүртэл зөвхөн бэлэн мөнгөний захиалга ажиллана. Bank transfer болон картын төлбөр нь тохиргоогүй тул зориуд харагдахгүй байна.")}</p></div>}
          </section>
        </div>
        <div className="sf-checkout-side">
          <aside className="sf-summary" aria-label="Захиалгын хураангуй">
            <p className="sf-summary-kicker"><ShoppingBag size={16} aria-hidden="true" /> ORDER SUMMARY</p>
            {!isAuthenticated && <p className="sf-summary-guest">Зочноор захиалж болно — <button type="button" onClick={startLogin}>бүртгэлтэй бол нэвтрэх</button></p>}
            {summaryLoading
              ? <div className="sf-summary-loading"><LoaderCircle className="sf-spinner" aria-hidden="true" /></div>
              : summaryItems.length
                ? <ul className="order-summary-scroll sf-summary-items">{summaryItems.map(item => (
                    <li key={item.id}>
                      <span className="sf-summary-thumb"><ResponsivePicture src={item.imageUrl ?? "/product-placeholder.svg"} fullWidth={1600} sizes="56px" alt="" loading="lazy" /></span>
                      <span className="sf-summary-item">
                        <span className="sf-summary-name">{displayName(item).primary}</span>
                        {formatVariantAttributes(item.attributesJson) ? <span className="sf-summary-meta">{formatVariantAttributes(item.attributesJson)}</span> : null}
                        <span className="sf-summary-meta">{`x${item.quantity}`}</span>
                      </span>
                      <span className="sf-summary-price">{formatMnt(item.priceMnt * item.quantity)}</span>
                    </li>
                  ))}</ul>
                : <div className="sf-summary-empty">Сагс хоосон байна.</div>}
            <div className="sf-coupon">
              <input value={couponInput} onChange={event => setCouponInput(event.target.value.toUpperCase())} placeholder="Хямдралын код" aria-label="Хямдралын код" disabled={Boolean(appliedCoupon)} className="sf-input" />
              {appliedCoupon
                ? <button type="button" onClick={removeCoupon} className="button button-outline button-sm">Хасах</button>
                : <button type="button" onClick={applyCoupon} disabled={couponQuery.isFetching} className="button button-outline button-sm">{couponQuery.isFetching ? <LoaderCircle className="sf-spinner" size={14} aria-hidden="true" /> : "Хэрэглэх"}</button>}
            </div>
            {appliedCoupon && couponDiscountMnt > 0 ? <p className="sf-coupon-ok">&ldquo;{appliedCoupon}&rdquo; код хэрэгжлээ!</p> : null}
            {storeCreditBalanceMnt > 0 && <label className="sf-credit"><span><input type="checkbox" checked={useStoreCredit} onChange={event => setUseStoreCredit(event.target.checked)} />Дэлгүүрийн зээл ашиглах</span><span>{formatMnt(storeCreditBalanceMnt)}</span></label>}
            <dl className="sf-summary-lines">
              <div><dt>Барааны дүн</dt><dd>{formatMnt(summarySubtotal)}</dd></div>
              {summaryDiscountMnt > 0 && <div className="is-discount"><dt>Routine хямдрал{routineDiscount.data?.routineName ? ` (${routineDiscount.data.routineName})` : ""}</dt><dd>-{formatMnt(summaryDiscountMnt)}</dd></div>}
              {summaryCouponDiscountMnt > 0 && <div className="is-discount"><dt>Хямдралын код{placedOrder?.couponCode ? ` (${placedOrder.couponCode})` : appliedCoupon ? ` (${appliedCoupon})` : ""}</dt><dd>-{formatMnt(summaryCouponDiscountMnt)}</dd></div>}
              {summaryLoyaltyDiscountMnt > 0 && <div className="is-discount"><dt>Гишүүнчлэлийн хямдрал ({loyaltyDiscountQuery.data?.tierName})</dt><dd>-{formatMnt(summaryLoyaltyDiscountMnt)}</dd></div>}
              {summaryStoreCreditMnt > 0 && <div className="is-discount"><dt>Дэлгүүрийн зээл</dt><dd>-{formatMnt(summaryStoreCreditMnt)}</dd></div>}
              <div><dt>Хүргэлт</dt><dd>{summaryDeliveryFee === 0 ? "Үнэгүй" : formatMnt(summaryDeliveryFee)}</dd></div>
            </dl>
            {!placedOrder && freeShipping ? <div className="sf-summary-free"><p>{`Үнэгүй хүргэлтэд ${formatMnt(freeShipping.remainingMnt)} дутуу байна.`}</p><ProgressBar ratio={freeShipping.ratio} label="Үнэгүй хүргэлтийн явц" /></div> : null}
            <div className="sf-summary-total"><span>Нийт</span><span>{formatMnt(summaryTotal)}</span></div>
            <button type="button" disabled={isSubmitting || (payment === "qpay" && !qpayReady) || (payment === "storepay" && !storepayReady) || !cartItems.length} onClick={confirmOrder} aria-busy={isSubmitting || undefined} className="button button-primary sf-confirm">{isSubmitting ? <LoaderCircle className="sf-spinner" size={17} aria-hidden="true" /> : <CreditCard size={16} aria-hidden="true" />}{payment === "qpay" && !qpayReady ? "QPay setup pending" : "Захиалга батлах"}</button>
            {qpayInvoice && <div className="sf-pay-box">
              <p className="sf-pay-title"><Smartphone size={16} aria-hidden="true" />{`QPay нэхэмжлэл #${qpayInvoice.orderNumber}`}</p>
              <p>Банкны апп сонгон төлнө үү. Callback баталгаажмагц төлөв автоматаар шинэчлэгдэнэ.</p>
              {qpayStatus.data?.paymentStatus === "paid" && <p className="sf-notice sf-notice--ok">Төлбөр баталгаажлаа.</p>}
              {qpayInvoice.urls.length > 0 ? <div className="sf-pay-links">{qpayInvoice.urls.filter(item => item.link).map(item => <a key={item.link} href={item.link} className="button button-outline button-sm">{item.description ?? item.name ?? "Банкны апп"}</a>)}</div> : qpayInvoice.qrText ? <code className="sf-pay-qr">{qpayInvoice.qrText}</code> : null}
            </div>}
            {storepayLoan && <div className="sf-pay-box">
              <p className="sf-pay-title"><Smartphone size={16} aria-hidden="true" />{`StorePay хүсэлт #${storepayLoan.orderNumber}`}</p>
              <p>{customerPhone.trim()} дугаарын StorePay апп дээр хүсэлт очлоо. Апп дээрээ зөвшөөрсний дараа захиалга автоматаар баталгаажна.</p>
              {qpayStatus.data?.paymentStatus === "paid" ? <p className="sf-notice sf-notice--ok">Төлбөр баталгаажлаа.</p> : <p className="sf-checkout-pending"><LoaderCircle className="sf-spinner" size={13} aria-hidden="true" />Зөвшөөрөхийг хүлээж байна…</p>}
            </div>}
            {paymentSetupFailed && !qpayInvoice && !storepayLoan && <div className="sf-notice">
              <strong>Захиалга #{paymentSetupFailed.orderNumber} үүссэн, төлбөрийн хүсэлт л амжилтгүй болсон.</strong>
              <p>Дахин оролдоход шинэ захиалга үүсэхгүй — ижил захиалгын төлбөрийн хүсэлт дахин бэлтгэгдэнэ.</p>
              <button type="button" disabled={isSubmitting} onClick={() => void retryPaymentSetup()} className="button button-outline button-sm">{paymentSetupFailed.kind === "qpay" ? "QPay нэхэмжлэл дахин авах" : "StorePay хүсэлт дахин илгээх"}</button>
            </div>}
            <Link href="/orders" className="sf-summary-orders">Миний захиалга</Link>
          </aside>
          <div className="sf-notice sf-notice--row"><CircleAlert size={17} aria-hidden="true" /><p><strong>Буцаалт, солилцооны нөхцөл:</strong> {textFor("checkout-text-returns-notice", "Нээгдсэн, ашигласан бүтээгдэхүүнийг зөвхөн бодит гэмтэлтэй эсвэл зарласан чанар/шинж чанараа хангаагүй үед л буцаана — таалагдаагүй, санаа өөрчлөгдсөн шалтгаанаар буцаах боломжгүй. Ариун цэврийн лац, савлагаа нээгдсэн эрүүл ахуйн бүтээгдэхүүнийг халдваргүйжлийн шалтгаанаар буцаах, солих боломж хязгаарлагдана.")} Дэлгэрэнгүйг <Link href="/returns">Буцаалт, солилцоо</Link> хуудаснаас үзнэ үү.</p></div>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>;
}
