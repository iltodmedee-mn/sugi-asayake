/**
 * Дугаартай хуудаслалтын цонх (2026-10-18, /shop-ийн ShopPagination). Хуудас 7 ба түүнээс
 * цөөн бол бүгд; олон бол эхний, сүүлийн, одоогийнх ±1 ба завсарт "gap" — мөрийн урт үргэлж
 * 7 тул товчнууд дарахад байрлалаа солихгүй (дараагийн товч хурууны доороос зугтахгүй).
 */
export type PageItem = number | "gap";

const MAX_ITEMS = 7;

export function paginationWindow(current: number, total: number): PageItem[] {
  const pages = Math.max(1, Math.floor(total));
  const page = Math.min(Math.max(1, Math.floor(current)), pages);
  if (pages <= MAX_ITEMS) return Array.from({ length: pages }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "gap", pages];
  if (page >= pages - 3) return [1, "gap", pages - 4, pages - 3, pages - 2, pages - 1, pages];
  return [1, "gap", page - 1, page, page + 1, "gap", pages];
}
