import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/**
 * 2026-11-07: лаптоп дээрх шинэ pnpm `package.json`-ийн "pnpm.overrides"-ийг уншихаа больсон
 * ("The "pnpm" field in package.json is no longer read") — аюулгүй байдлын override-ууд тэнд
 * үл тоогдох эрсдэлтэй тул pnpm-workspace.yaml-д хуулбар бий; packageManager-ийн 10.4.1 нь
 * package.json-ийг уншина. Нэгийг нь засаад нөгөөг мартвал хоёр pnpm өөр хувилбар суулгана.
 */
const ROOT = join(import.meta.dirname, "..");

describe("pnpm overrides", () => {
  it("package.json ба pnpm-workspace.yaml-ийн overrides яг ижил", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { pnpm?: { overrides?: Record<string, string> } };
    const workspace = parse(readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8")) as { overrides?: Record<string, string> };
    expect(Object.keys(pkg.pnpm?.overrides ?? {}).length).toBeGreaterThan(0);
    expect(workspace.overrides).toEqual(pkg.pnpm?.overrides);
  });
});
