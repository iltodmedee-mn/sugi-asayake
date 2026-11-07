import { describe, expect, it } from "vitest";
import { paginationWindow } from "../shared/pagination";

describe("paginationWindow", () => {
  it("7 хүртэл хуудас — бүгд", () => {
    expect(paginationWindow(1, 1)).toEqual([1]);
    expect(paginationWindow(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
  it("эхэн, дунд, төгсгөлд мөрийн урт үргэлж 7", () => {
    expect(paginationWindow(1, 42)).toEqual([1, 2, 3, 4, 5, "gap", 42]);
    expect(paginationWindow(4, 42)).toEqual([1, 2, 3, 4, 5, "gap", 42]);
    expect(paginationWindow(5, 42)).toEqual([1, "gap", 4, 5, 6, "gap", 42]);
    expect(paginationWindow(39, 42)).toEqual([1, "gap", 38, 39, 40, 41, 42]);
    expect(paginationWindow(42, 42)).toEqual([1, "gap", 38, 39, 40, 41, 42]);
    for (let page = 1; page <= 42; page += 1) expect(paginationWindow(page, 42)).toHaveLength(7);
  });
  it("хүрээнээс гарсан / бутархай утгыг хязгаарлана", () => {
    expect(paginationWindow(0, 10)[0]).toBe(1);
    expect(paginationWindow(99, 10).at(-1)).toBe(10);
    expect(paginationWindow(2.7, 3)).toEqual([1, 2, 3]);
    expect(paginationWindow(1, 0)).toEqual([1]);
  });
});
