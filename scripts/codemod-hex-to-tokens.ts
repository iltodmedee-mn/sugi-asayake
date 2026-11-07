/**
 * Брэнд студи A5 (2026-10-05): storefront-ийн кодонд хатуу бичсэн брэнд өнгийг токен болгоно —
 * эс бөгөөс Брэнд студид үндсэн өнгө солиход тэр газрууд хуучин улаан хэвээр үлдэнэ.
 *
 *   pnpm exec tsx scripts/codemod-hex-to-tokens.ts           # dry-run: юу солигдохыг тоолно
 *   pnpm exec tsx scripts/codemod-hex-to-tokens.ts --write   # бичнэ
 *
 * Дүрэм: зөвхөн `BASE_THEME`-ийн утгатай ЯГ тэнцүү hex (үндсэн загварт харагдах байдал 0 өөрчлөлт),
 * `rgba(223, 31, 61, a)` → `color-mix(... var(--primary) a%, transparent)`. Алгасна: SVG attribute
 * (`fill=`/`stroke=` — `var()` presentation attribute-д найдваргүй), `url(` агуулсан мөр (data URI),
 * токенийг өөрийг нь тодорхойлдог мөр (`--primary: #df1f3d`). Хамгаалалт: server/theme-hex-guard.test.ts.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { DARK_TOKEN_KEYS, LIGHT_TOKEN_KEYS } from "../shared/theme-tokens";

export const HEX_TO_TOKEN: Record<string, string> = {
  df1f3d: "--primary",
  bc1732: "--primary-hover",
  c81b34: "--primary-strong", // index.css-д --primary-аас бодогддог (color-mix), Брэнд студид тусдаа сонгогдохгүй
  b01729: "--primary-text",
  fffaf5: "--primary-foreground",
  f0b52d: "--accent",
  "28537a": "--sky",
  dae0da: "--background",
  f2f5f2: "--card",
  ced5cf: "--secondary",
  e4e8e4: "--muted",
  b7beb9: "--border",
  d3dad4: "--surface-tint",
  "545958": "--muted-foreground",
  "7a6318": "--ck-gold",
};

const ROOT = process.cwd();
const SKIP_DIRS = ["admin", "inventory", "ui", "icons"];
const SKIP_FILES = /^(Admin[A-Z]\w*|ContentMediaPanel|ContentTextPanel|FaceHandoff\w*|IntegrationConnectCard)\.tsx$/;

export function storefrontFiles(): string[] {
  const out: string[] = [join(ROOT, "client/src/index.css"), join(ROOT, "server/_core/heroShell.ts")];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) { if (!SKIP_DIRS.includes(name)) walk(full); continue; }
      if (/\.(tsx|ts)$/.test(name) && !SKIP_FILES.test(name)) out.push(full);
    }
  };
  walk(join(ROOT, "client/src/pages"));
  walk(join(ROOT, "client/src/components"));
  // 2026-10-18: storefront шинэчлэлийн CSS (index.css-ийн дараа ачаалагдана) — мөн брэнд hex-гүй.
  const walkCss = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walkCss(full);
      else if (name.endsWith(".css")) out.push(full);
    }
  };
  walkCss(join(ROOT, "client/src/styles"));
  return out;
}

const HEX_RE = new RegExp(`#(${Object.keys(HEX_TO_TOKEN).join("|")})(?![0-9a-f])`, "gi");
const RGBA_RE = /rgba\(\s*223\s*,\s*31\s*,\s*61\s*,\s*(0?\.\d+|1|0)\s*\)/gi;
// Брэнд студийн токен бүрийн ТОДОРХОЙЛОЛТ hex хэвээр (theme-tokens.test.ts index.css ↔ BASE_THEME тулгана).
const TOKEN_DEF_RE = new RegExp(`(^|[{;])\\s*--(${[...LIGHT_TOKEN_KEYS, ...DARK_TOKEN_KEYS, "primary-strong"].join("|")})\\s*:`);
// SVG presentation attribute: `fill="#…"` ба `fill={x ? "#…" : "none"}` (шалгагчийн олдвор 2026-10-06 — Safari-д var() найдваргүй).
const SVG_ATTR_RE = /\b(fill|stroke|stopColor|stop-color)=(\{[^}]*#|["'][^"']*#)/i;

export function transformLine(line: string): string {
  if (line.includes("url(") || TOKEN_DEF_RE.test(line) || SVG_ATTR_RE.test(line)) return line;
  return line
    .replace(RGBA_RE, (_m, alpha: string) => `color-mix(in srgb, var(--primary) ${Math.round(Number(alpha) * 100)}%, transparent)`)
    .replace(HEX_RE, (_m, hex: string) => `var(${HEX_TO_TOKEN[hex.toLowerCase()]})`);
}

function main() {
  const write = process.argv.includes("--write");
  let total = 0;
  for (const file of storefrontFiles()) {
    const before = readFileSync(file, "utf8");
    const after = before.split("\n").map(transformLine).join("\n");
    if (after === before) continue;
    const changed = before.split("\n").filter((line, i) => line !== after.split("\n")[i]).length;
    total += changed;
    console.log(`${write ? "wrote" : "would change"} ${String(changed).padStart(3)} lines  ${relative(ROOT, file)}`);
    if (write) writeFileSync(file, after);
  }
  console.log(`${total} lines ${write ? "changed" : "to change"}`);
}

if (process.argv[1] && /codemod-hex-to-tokens/.test(process.argv[1])) main();
