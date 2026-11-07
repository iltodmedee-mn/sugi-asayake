import { useEffect, useState } from "react";
import { Clock3, FlaskConical, Globe2, Scale, X } from "lucide-react";

/**
 * Product facts as an overlay inside the product photograph (2026-09-14,
 * Tom: "зургийн урд доод зүүн буланд, зурган дотор нь"). Small glass pills
 * for net content, shelf life and origin; the ingredients list -- often
 * long -- opens as a panel over the lower part of the picture instead of
 * pushing the layout around. Renders nothing when the product has no facts.
 *
 * Sits inside the gallery stage (.sf-gallery-stage), whose click opens the lightbox, so
 * every interaction here stops propagation. The zoom button lives in the
 * bottom-right corner; the pills keep to the left and wrap before it.
 */
type Props = { netContent: string | null; countryOfOrigin: string | null; shelfLifeMonths: number | null; ingredients: string | null };

export default function ProductFacts({ netContent, countryOfOrigin, shelfLifeMonths, ingredients }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [ingredients]);
  if (!netContent && !countryOfOrigin && !shelfLifeMonths && !ingredients) return null;
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  return (
    <div className="product-facts-overlay" onClick={stop} onKeyDown={stop}>
      {open && ingredients ? (
        <div className="product-facts-panel" role="dialog" aria-label="Найрлага">
          <div className="product-facts-panel-head">
            <span><FlaskConical size={14} aria-hidden="true" /> Найрлага</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Найрлага хаах"><X size={15} /></button>
          </div>
          <p>{ingredients}</p>
        </div>
      ) : null}
      <div className="product-facts-pills">
        {netContent ? <span className="product-fact-pill"><Scale size={13} aria-hidden="true" /><b>{netContent}</b><small>Хэмжээ</small></span> : null}
        {shelfLifeMonths ? <span className="product-fact-pill"><Clock3 size={13} aria-hidden="true" /><b>{`${shelfLifeMonths} сар`}</b><small>Хадгалах хугацаа</small></span> : null}
        {countryOfOrigin ? <span className="product-fact-pill"><Globe2 size={13} aria-hidden="true" /><b>{countryOfOrigin}</b><small>Гарал үүсэл</small></span> : null}
        {ingredients ? (
          <button type="button" className={`product-fact-pill is-button${open ? " is-open" : ""}`} onClick={() => setOpen(current => !current)} aria-expanded={open}>
            <FlaskConical size={13} aria-hidden="true" /><b>Найрлага</b><small>{open ? "Хаах" : "Харах"}</small>
          </button>
        ) : null}
      </div>
    </div>
  );
}
