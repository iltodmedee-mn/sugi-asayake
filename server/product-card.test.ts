import { describe, expect, it } from "vitest";
import { LOW_STOCK_THRESHOLD } from "../shared/catalog-filter";
import { productCardBrand, productCardPrice, productCardRating, productCardStock } from "../shared/product-card";

describe("productCardStock", () => {
  it("бэлгийн карт нөөц хөндөхгүй тул үргэлж худалдаж авах боломжтой", () => {
    expect(productCardStock({ kind: "gift_card", stockQuantity: 0 })).toEqual({ state: "always_available", remaining: null });
  });
  it("нөөцийн тоо ирээгүй бол худалдах товчийг хаахгүй", () => {
    expect(productCardStock({}).state).toBe("in_stock");
    expect(productCardStock({ stockQuantity: null }).state).toBe("in_stock");
  });
  it("0 ба сөрөг — дууссан, босго хүртэл — цөөн үлдсэн, түүнээс дээш — нөөцтэй", () => {
    expect(productCardStock({ stockQuantity: 0 })).toEqual({ state: "out_of_stock", remaining: 0 });
    expect(productCardStock({ stockQuantity: -2 }).state).toBe("out_of_stock");
    expect(productCardStock({ stockQuantity: 1 })).toEqual({ state: "low_stock", remaining: 1 });
    expect(productCardStock({ stockQuantity: LOW_STOCK_THRESHOLD }).state).toBe("low_stock");
    expect(productCardStock({ stockQuantity: LOW_STOCK_THRESHOLD + 1 }).state).toBe("in_stock");
  });
});

describe("productCardBrand", () => {
  it("брэнд → ангилал → дэлгүүрийн нэр, хоосон зайг алгасна", () => {
    expect(productCardBrand({ brand: " Cocochi ", categoryName: "Арьс" }, "HOUSE")).toBe("Cocochi");
    expect(productCardBrand({ brand: "  ", categoryName: "Арьс арчилгаа" }, "HOUSE")).toBe("Арьс арчилгаа");
    expect(productCardBrand({ brand: null, categoryName: null }, "HOUSE")).toBe("HOUSE");
  });
});

describe("productCardPrice", () => {
  it("хуучин үнэ зөвхөн бодит хямдралтай үед", () => {
    expect(productCardPrice({ priceMnt: 20000, compareAtPriceMnt: 25000 })).toEqual({ priceMnt: 20000, compareAtMnt: 25000, salePercent: 20 });
    expect(productCardPrice({ priceMnt: 20000, compareAtPriceMnt: 20000 })).toEqual({ priceMnt: 20000, compareAtMnt: null, salePercent: null });
    expect(productCardPrice({ priceMnt: 20000, compareAtPriceMnt: 15000 }).compareAtMnt).toBeNull();
    expect(productCardPrice({ priceMnt: 20000 }).salePercent).toBeNull();
  });
});

describe("productCardRating", () => {
  it("сэтгэгдэлгүй бол үнэлгээ харуулахгүй", () => {
    expect(productCardRating({ reviewCount: 0, avgRating: 5 })).toBeNull();
    expect(productCardRating({ reviewCount: 3, avgRating: null })).toBeNull();
  });
  it("дундаж нэг оронтой, од 0–5", () => {
    expect(productCardRating({ reviewCount: 12, avgRating: 4.46 })).toEqual({ average: "4.5", count: 12, filled: 4 });
    expect(productCardRating({ reviewCount: 1, avgRating: 7 })?.filled).toBe(5);
  });
});
