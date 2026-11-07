import { describe, expect, it } from "vitest";
import { htmlToPlainText, importSlug, matchCategoryId, normaliseBarcode, planImport, toAsayakeItem, type SugiProductRow, type ZochilProduct } from "../shared/asayake-import";

const zochil = (over: Partial<ZochilProduct> = {}): ZochilProduct => ({
  id: 1,
  name: "TO-PLAN 3 төрлийн коллаген нүүрний маск",
  price: "25200.00",
  sale_price: null,
  stock: 7,
  sku: "4949176021975",
  images: '[{"url":"https://cdn.zochil.shop/a.jpg"},{"url":"https://cdn.zochil.shop/b.jpg"}]',
  description: "<p><strong>Маск</strong> нь чийгшүүлнэ.</p><p>10 ширхэг</p>",
  variants: [],
  ...over,
});

const sugi = (over: Partial<SugiProductRow> = {}): SugiProductRow => ({
  id: 769,
  sku: "4949176021975",
  name: "3 Types of Collagen Face Mask (10 sheets)",
  nameMn: null,
  description: null,
  imageUrl: null,
  priceMnt: 25200,
  compareAtPriceMnt: null,
  stockQuantity: 20,
  variantCount: 1,
  ...over,
});

describe("toAsayakeItem", () => {
  it("үнэ, зураг, тайлбар, кирилл нэрийг хөрвүүлнэ", () => {
    const item = toAsayakeItem(zochil(), { brand: " TO-PLAN ", categoryNames: ["Арьс арчилгаа"] })!;
    expect(item).toMatchObject({ sku: "4949176021975", priceMnt: 25200, compareAtPriceMnt: null, stock: 7, brand: "TO-PLAN", nameMn: "TO-PLAN 3 төрлийн коллаген нүүрний маск" });
    expect(item.imageUrls).toEqual(["https://cdn.zochil.shop/a.jpg", "https://cdn.zochil.shop/b.jpg"]);
    expect(item.description).toBe("Маск нь чийгшүүлнэ.\n\n10 ширхэг");
  });
  it("sale_price < price бол хямдрал: үнэ = sale_price, хуучин үнэ = price", () => {
    expect(toAsayakeItem(zochil({ price: "30000.00", sale_price: "24000.00" }))).toMatchObject({ priceMnt: 24000, compareAtPriceMnt: 30000 });
    expect(toAsayakeItem(zochil({ price: "30000.00", sale_price: "30000.00" }))).toMatchObject({ priceMnt: 30000, compareAtPriceMnt: null });
  });
  it("латин нэр nameMn болохгүй; баркод/үнэгүй бараа алгасагдана", () => {
    expect(toAsayakeItem(zochil({ name: "NEWMO HAIR ESSENCE" }))!.nameMn).toBeNull();
    expect(toAsayakeItem(zochil({ sku: "" }))).toBeNull();
    expect(toAsayakeItem(zochil({ price: "0.00" }))).toBeNull();
  });
  it("images хоосон бол `image` руу буцна, https биш URL-ийг үл тооно", () => {
    expect(toAsayakeItem(zochil({ images: "[]", image: "https://cdn.zochil.shop/c.png" }))!.imageUrls).toEqual(["https://cdn.zochil.shop/c.png"]);
    expect(toAsayakeItem(zochil({ images: '[{"url":"javascript:alert(1)"}]', image: null }))!.imageUrls).toEqual([]);
  });
});

describe("planImport", () => {
  const item = toAsayakeItem(zochil())!;
  it("таарсан бараа: үнэ/нөөц/зураг дарж, тайлбар/монгол нэрийг хоосон бол л нөхнө", () => {
    const plan = planImport([sugi()], [item]);
    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].changes).toEqual({
      stockQuantity: 7,
      description: "Маск нь чийгшүүлнэ.\n\n10 ширхэг",
      nameMn: "TO-PLAN 3 төрлийн коллаген нүүрний маск",
      imageSourceUrl: "https://cdn.zochil.shop/a.jpg",
    });
  });
  it("sugi-д гараар бичсэн тайлбар, монгол нэрийг дарахгүй", () => {
    const plan = planImport([sugi({ description: "Манай тайлбар", nameMn: "Манай нэр" })], [item]);
    expect(plan.updates[0].changes.description).toBeUndefined();
    expect(plan.updates[0].changes.nameMn).toBeUndefined();
  });
  it("тэргүүлэх 0-тэй баркод таарна", () => {
    expect(planImport([sugi({ sku: "04949176021975" })], [item]).creates).toHaveLength(0);
    expect(normaliseBarcode(" 0 4949-176021975")).toBe("4949176021975");
  });
  it("шинэ, зөвхөн sugi-д, олон хувилбартай, давхардсан баркодыг тус тусад нь ангилна", () => {
    const fresh = toAsayakeItem(zochil({ id: 2, sku: "4900000000001" }))!;
    const multi = toAsayakeItem(zochil({ id: 3, sku: "4900000000002" }))!;
    const plan = planImport(
      [sugi({ id: 1, sku: "4900000000002", variantCount: 3 }), sugi({ id: 2, sku: "4999999999999", name: "Gift card" })],
      [fresh, multi, fresh],
    );
    expect(plan.creates.map(c => c.sku)).toEqual(["4900000000001"]);
    expect(plan.skippedMultiVariant.map(s => s.productId)).toEqual([1]);
    expect(plan.sugiOnly.map(s => s.productId)).toEqual([2]);
    expect(plan.duplicateSkus).toEqual(["4900000000001"]);
    expect(plan.updates).toHaveLength(0);
  });
  it("өмнөх run R2 руу хуулсан зургийг дахин хуулахгүй", () => {
    const plan = planImport([sugi({ nameMn: "x", stockQuantity: 7, description: "d", imageUrl: "/cdn/catalog/products/asayake/4949176021975-ab12cd.webp" })], [item]);
    expect(plan.unchanged).toBe(1);
    expect(planImport([sugi({ imageUrl: "/cdn/catalog/products/769/old.webp" })], [item]).updates[0].changes.imageSourceUrl).toBe("https://cdn.zochil.shop/a.jpg");
  });
  it("нуух жагсаалт: бэлгийн карт ба аль хэдийн нуугдсан бараа орохгүй", () => {
    const plan = planImport(
      [
        sugi({ id: 10, sku: "4900000000010", name: "Хуучин бараа", isPublished: true }),
        sugi({ id: 11, sku: "4900000000011", name: "Бэлгийн карт 50 000₮", kind: "gift_card", isPublished: true }),
        sugi({ id: 12, sku: "4900000000012", name: "Аль хэдийн нуусан", isPublished: false }),
      ],
      [item],
    );
    expect(plan.sugiOnly.map(p => p.productId)).toEqual([10, 11, 12]);
    expect(plan.hide.map(p => p.productId)).toEqual([10]);
  });
  it("шинэ бараа: ангилал таарвал нийтэлнэ, таараагүй бол ноорог (categoryId null)", () => {
    const skin = toAsayakeItem(zochil({ id: 20, sku: "4900000000020" }), { categoryNames: ["Маск", "Арьс арчилгаа"] })!;
    const odd = toAsayakeItem(zochil({ id: 21, sku: "4900000000021" }), { categoryNames: ["Брендүүд"] })!;
    const plan = planImport([], [skin, odd], [{ id: 4, name: "Арьс арчилгаа" }]);
    expect(plan.creates.map(c => [c.sku, c.categoryId, c.publish])).toEqual([["4900000000020", 4, true], ["4900000000021", null, false]]);
  });
  it("бүх зүйл ижил, зураггүй бол өөрчлөлтгүй", () => {
    const same = toAsayakeItem(zochil({ stock: 20, images: "[]", image: null, description: "" }))!;
    const plan = planImport([sugi({ nameMn: "x" })], [same]);
    expect(plan.unchanged).toBe(1);
  });
});

describe("matchCategoryId / importSlug / htmlToPlainText", () => {
  it("ангиллыг том/жижиг үсэг, зай үл харгалзан тулгана", () => {
    const cats = [{ id: 4, name: "Арьс арчилгаа" }, { id: 9, name: "Хүнс" }];
    expect(matchCategoryId(["2026 оны шинэ жилийн баярын бэлэг", "  арьс   АРЧИЛГАА "], cats)).toBe(4);
    expect(matchCategoryId(["Брендүүд"], cats)).toBeNull();
  });
  it("нэр нь ялгаатай ангиллыг alias-аар (Үс арчилгаа → Үс ба бие)", () => {
    const cats = [{ id: 6, name: "Үс ба бие" }, { id: 5, name: "Эрүүл ахуй" }];
    expect(matchCategoryId(["Брендүүд", "Үс арчилгаа"], cats)).toBe(6);
    expect(matchCategoryId(["Шүд арчилгаа"], cats)).toBe(5);
  });
  it("slug нь латин нэр + баркод, кирилл нэрд баркод л", () => {
    expect(importSlug({ name: "NEWMO Hair Essence 75ml", sku: "4541082000756" })).toBe("newmo-hair-essence-75ml-4541082000756");
    expect(importSlug({ name: "Шүдний оо", sku: "4901234567894" })).toBe("asayake-4901234567894");
  });
  it("HTML entity, жагсаалт, хоосон мөр", () => {
    expect(htmlToPlainText("<ul><li>A &amp; B</li><li>C</li></ul>")).toBe("• A & B\n\n• C");
    expect(htmlToPlainText("<p> </p>")).toBeNull();
  });
});
