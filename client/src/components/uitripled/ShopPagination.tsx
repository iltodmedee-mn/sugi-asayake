/*
 * Adapted from UI TripleD "animated-pagination-shadcnui" — https://ui.tripled.work/r/animated-pagination-shadcnui.json
 * Retrieved 2026-10-18, sha256 499559d73f31. Copyright (c) 2026 uitripled. MIT — see THIRD_PARTY_NOTICES.md
 * Өөрчлөлт: бодит хуудас/нийт props-оор (дотоод `totalPages = 5` биш), shared/pagination.ts-ийн
 * 7 нүдтэй цонх, `aria-current="page"`, монгол нэр, `layoutId` (domAnimation-д байхгүй) →
 * идэвхтэй нүдний "орох" хөдөлгөөн, LazyMotion `m.*`, токен өнгө (`sf-pager`).
 */
import { m } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT } from "@/hooks/useLocale";
import { paginationWindow } from "@shared/pagination";

/**
 * /shop-ийн хуудаслалт. Өмнөх/Дараах товч нэрээрээ хэвээр (e2e: `/Дараах|Next/`), дунд нь
 * дугаартай нүднүүд — 42 хуудастай каталогт "1 / 42" гэж зөвхөн дараалан гүйхийн оронд
 * шууд үсрэх боломж. `onChange` нь Shop.tsx-ийн `pagerJump` + `setPage`-ийг дуудна.
 */
export default function ShopPagination({ page, totalPages, resultCount, onChange }: {
  page: number;
  totalPages: number;
  resultCount: number;
  onChange: (page: number) => void;
}) {
  const t = useT();
  const items = paginationWindow(page, totalPages);
  return (
    <nav className="shop-pagination sf-pager" aria-label="Хуудаслалт">
      <button type="button" className="sf-pager-step" onClick={() => onChange(page - 1)} disabled={page === 1}>
        <ChevronLeft size={16} aria-hidden="true" /> {t("Өмнөх")}
      </button>
      <ol className="sf-pager-pages">
        {items.map((item, index) => item === "gap" ? (
          <li key={`gap-${index}`} className="sf-pager-gap" aria-hidden="true">…</li>
        ) : (
          <li key={item}>
            <button type="button" className="sf-pager-page" aria-current={item === page ? "page" : undefined} aria-label={`${item}-р хуудас`} onClick={() => item !== page && onChange(item)}>
              {item === page ? <m.span key={item} className="sf-pager-indicator" aria-hidden="true" initial={{ scale: .7, opacity: .4 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 30 }} /> : null}
              <span className="sf-pager-label">{item}</span>
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="sf-pager-step" onClick={() => onChange(page + 1)} disabled={page === totalPages}>
        {t("Дараах")} <ChevronRight size={16} aria-hidden="true" />
      </button>
      <p className="sf-pager-summary">{`${page} / ${totalPages} хуудас`} <em>{`(${resultCount} бүтээгдэхүүн)`}</em></p>
    </nav>
  );
}
