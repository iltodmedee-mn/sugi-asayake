// Ердийн spinner-ийн оронд агуулгын хэлбэртэй ачааллын placeholder —
// spinner нь "ямар нэг зүйл болж байна" гэдгийг л хэлдэг бол бодит агуулгатай
// ижил хэмжээ/хэлбэртэй skeleton нь ЮУ, ХААНА ачаалагдахыг ойролцоогоор
// харуулдаг тул өгөгдөл ирэхэд хуудас үсрэхгүй.
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/**
 * ProductCard-ийн хэлбэр (зураг + брэнд + 2 мөр нэр + үнэ). 2026-10-18: `.shop-product-card`
 * классыг ЗОРИУД авахгүй — e2e тэр классаар "бараа зурагдсан"-ыг хүлээдэг тул skeleton
 * дээр шууд давчихдаг байв; мөн байхгүй `.shop-product-image` класс зурагны хайрцгийг
 * өндөргүй болгодог байсан.
 */
export function ProductCardSkeleton() {
  return (
    <div className="sf-product sf-product--skeleton" aria-hidden="true">
      <div className="sf-product-media"><Skeleton style={{ position: "absolute", inset: 0, borderRadius: 0 }} /></div>
      <div className="sf-product-body">
        <Skeleton className="skeleton-line" style={{ width: "40%", height: "9px" }} />
        <Skeleton className="skeleton-line" style={{ width: "85%", height: "15px", marginTop: "10px" }} />
        <Skeleton className="skeleton-line" style={{ width: "60%", height: "11px", marginTop: "6px" }} />
        <Skeleton className="skeleton-line" style={{ width: "35%", height: "22px", marginTop: "19px" }} />
      </div>
    </div>
  );
}

/** A single text line placeholder, width customizable via style. */
export function LineSkeleton({ width = "100%", height = "13px", style }: { width?: string; height?: string; style?: React.CSSProperties }) {
  return <Skeleton className="skeleton-line" style={{ width, height, ...style }} />;
}
