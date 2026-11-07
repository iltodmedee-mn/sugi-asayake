import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Storefront UI шинэчлэлийн хамгаалалт (2026-10-18) — `client/src/styles/storefront.css`-ийн
 * каскадын гэрээ ба UI TripleD-ээс зөөсөн кодын дүрмийг тулгана. Зөвхөн текст шалгадаг
 * (React render хийхгүй, vitest node орчин).
 *
 * Яагаад: index.css-ийн давхаргагүй ~4000 мөр ба `[class*="-card"]` маягийн шүүрдэлт нь шинэ
 * CSS-ийг чимээгүй дардаг; hex өнгө Брэнд студи/баярын палитрыг тойрно; framer-motion eager
 * модульд орвол үндсэн bundle-д (нүүрний LCP) нэмэгдэнэ.
 */

const ROOT = resolve(import.meta.dirname, "..");
const SRC = join(ROOT, "client/src");
const STYLES = join(SRC, "styles");

function walk(dir: string, match: RegExp): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full, match));
    else if (match.test(name)) out.push(full);
  }
  return out;
}

const rel = (file: string) => relative(ROOT, file);
const stripCssComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

type CssRule = { prelude: string; body: string };

/** Дээд түвшний `prelude { body }` блокууд (`@import …;` мэдэгдлийг алгасна). */
function cssBlocks(css: string): CssRule[] {
  const out: CssRule[] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open < 0) break;
    const prelude = css.slice(i, open).split(";").pop()!.trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") depth -= 1;
      j += 1;
    }
    out.push({ prelude, body: css.slice(open + 1, j - 1) });
    i = j;
  }
  return out;
}

/** Таслалаар салгана — `:where(a, b)` доторх таслалыг биш. */
function splitSelectors(prelude: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of prelude) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === "," && depth === 0) { parts.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const SCOPED_SELECTOR = /^(html\[data-storefront-theme="dark"\]\s+)?\.(sugi-site|sf-portal)(?![\w-])/;
const SWEEP_SUBSTRINGS = ["-card", "-panel", "-dialog", "-section", "shadow-", "rounded-"];

function cssViolations(file: string): string[] {
  const css = stripCssComments(readFileSync(file, "utf8"));
  const problems: string[] = [];
  const visit = (rules: CssRule[]) => {
    for (const { prelude, body } of rules) {
      if (/^@(media|supports)\b/.test(prelude)) { visit(cssBlocks(body)); continue; }
      if (/^@keyframes\s+sf-/.test(prelude)) continue;
      if (prelude.startsWith("@")) { problems.push(`${rel(file)}: зөвшөөрөгдөөгүй at-rule "${prelude}"`); continue; }
      for (const selector of splitSelectors(prelude)) {
        if (!SCOPED_SELECTOR.test(selector)) problems.push(`${rel(file)}: хамрах хүрээгүй сонгогч "${selector}" (.sugi-site / .sf-portal-оор эхлэх ёстой)`);
        for (const [, cls] of selector.matchAll(/\.(sf-[\w-]+)/g)) {
          const bad = SWEEP_SUBSTRINGS.find(part => cls!.includes(part));
          if (bad) problems.push(`${rel(file)}: класс "${cls}" нь "${bad}" агуулна (index.css-ийн [class*=] шүүрдэлтэд баригдана)`);
        }
      }
      for (const [, prop] of body.matchAll(/(?:^|[;{\s])--([\w-]+)\s*:/g)) {
        if (!prop!.startsWith("sf-")) problems.push(`${rel(file)}: "--${prop}" — шинэ хувьсагч зөвхөн --sf-* (токен index.css :root-д)`);
      }
    }
  };
  if (/#[0-9a-f]{3,8}\b/i.test(css)) problems.push(`${rel(file)}: hex өнгө — var(--token) ашигла`);
  if (/\b(rgba?|hsla?)\(/i.test(css)) problems.push(`${rel(file)}: rgb()/hsl() өнгө — var(--token) эсвэл color-mix ашигла`);
  if (/:root\b/.test(css)) problems.push(`${rel(file)}: :root блок — токен зөвхөн index.css-д (theme-tokens.test.ts)`);
  if (/(^|[\s,])\.dark\b/.test(css)) problems.push(`${rel(file)}: .dark — storefront харанхуй горим нь html[data-storefront-theme="dark"]`);
  if (/font-family\s*:(?!\s*var\(--font-(body|display)\)\s*[;}])/.test(css)) problems.push(`${rel(file)}: font-family — зөвхөн var(--font-body)/var(--font-display) (Брэнд студийн фонт)`);
  visit(cssBlocks(css));
  return problems;
}

/** UI TripleD-ээс зөөсөн ба шинэ хуваалцсан бүрэлдэхүүн. */
function guardedComponentFiles(): string[] {
  const uiNew = ["button.tsx", "badge.tsx", "input.tsx", "label.tsx"].map(name => join(SRC, "components/ui", name)).filter(existsSync);
  return [
    ...walk(join(SRC, "components/uitripled"), /\.tsx?$/),
    ...walk(join(SRC, "components/product"), /\.tsx?$/),
    ...walk(join(SRC, "components/motion"), /\.tsx?$/),
    ...uiNew,
  ];
}

const ALLOWED_MOTION_IMPORTS = new Set(["m", "LazyMotion", "MotionConfig", "AnimatePresence", "domAnimation", "useReducedMotion", "useInView", "type Variants", "type Transition"]);

function componentViolations(file: string): string[] {
  // Тайлбарыг хасна — эх сурвалжийн URL, хуучин hex-ийн түүх тайлбарт байж болно.
  const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const problems: string[] = [];
  const checks: Array<[RegExp, string]> = [
    [/\bdark:/, "Tailwind `dark:` — storefront харанхуй горим нь .dark биш"],
    [/hsla?\(var\(/, "`hsl(var(--x))` — токен hex тул хүчингүй өнгө"],
    [/rgba?\(var\(/, "`rgba(var(--x))` — токен hex тул хүчингүй өнгө"],
    [/--card-bg/, "`--card-bg` — UI TripleD docs-ийн хувьсагч, энд байхгүй"],
    [/unsplash/i, "Unsplash зураг — бодит бараа/брэнд зураг л"],
    [/#[0-9a-f]{3,8}\b(?![\w-])/i, "hex өнгө — var(--token)"],
    [/(["'`\s])(rounded|shadow)-[\w[\]]/, "`rounded-*`/`shadow-*` utility — index.css-ийн шүүрдэлт дарна; sf- класс + токен ашигла"],
  ];
  for (const [pattern, message] of checks) if (pattern.test(code)) problems.push(`${rel(file)}: ${message}`);
  for (const match of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']framer-motion["']/g)) {
    for (const name of match[1]!.split(",").map(part => part.trim()).filter(Boolean)) {
      if (!ALLOWED_MOTION_IMPORTS.has(name)) problems.push(`${rel(file)}: framer-motion "${name}" — зөвхөн m/LazyMotion/MotionConfig/AnimatePresence/useReducedMotion/useInView`);
    }
  }
  return problems;
}

/** main.tsx-ээс эхэлсэн СТАТИК import граф (`import()` / lazyRetry-г алгасна). */
function eagerGraph(): { files: Map<string, string[]>; packages: Map<string, string[]> } {
  const files = new Map<string, string[]>();
  const packages = new Map<string, string[]>();
  const resolveLocal = (from: string, spec: string): string | null => {
    const base = spec.startsWith("@/") ? join(SRC, spec.slice(2))
      : spec.startsWith("@shared/") ? join(ROOT, "shared", spec.slice(8))
      : spec.startsWith(".") ? resolve(dirname(from), spec)
      : null;
    if (!base) return null;
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
      if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    }
    return null;
  };
  const queue = [join(SRC, "main.tsx")];
  while (queue.length) {
    const file = queue.pop()!;
    if (files.has(file)) continue;
    const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const specs = [
      ...[...code.matchAll(/^\s*import\s+(?!type\s)[^;]*?\bfrom\s*["']([^"']+)["']/gm)].map(m => m[1]!),
      ...[...code.matchAll(/^\s*import\s*["']([^"']+)["']/gm)].map(m => m[1]!),
      ...[...code.matchAll(/^\s*export\s+(?!type\s)[^;]*?\bfrom\s*["']([^"']+)["']/gm)].map(m => m[1]!),
    ];
    files.set(file, specs);
    for (const spec of specs) {
      if (/\.css(\?.*)?$/.test(spec)) continue;
      const local = resolveLocal(file, spec);
      if (local) queue.push(local);
      else if (!spec.startsWith(".") && !spec.startsWith("@/") && !spec.startsWith("@shared/")) {
        const list = packages.get(spec) ?? [];
        list.push(rel(file));
        packages.set(spec, list);
      }
    }
  }
  return { files, packages };
}

describe("storefront UI шинэчлэлийн гэрээ", () => {
  it("styles/**/*.css: хамрах хүрээтэй, токентой, sf- нэрс шүүрдэлтээс зайлсхийнэ", () => {
    const cssFiles = walk(STYLES, /\.css$/);
    expect(cssFiles.length).toBeGreaterThan(0);
    expect(cssFiles.flatMap(cssViolations)).toEqual([]);
  });

  it("UI TripleD / product / motion / шинэ ui файлууд: demo өгөгдөл, хүчингүй өнгө, шүүрдэлтэд өртөх utility байхгүй", () => {
    expect(guardedComponentFiles().flatMap(componentViolations)).toEqual([]);
  });

  it("framer-motion eager bundle-д орохгүй; CSS-ийг eager графаас зөвхөн main.tsx импортлоно", () => {
    const { files, packages } = eagerGraph();
    expect(files.size).toBeGreaterThan(20);
    const motionImporters = [...packages.entries()].filter(([spec]) => spec === "framer-motion" || spec.startsWith("framer-motion/") || spec === "motion" || spec.startsWith("motion/")).flatMap(([, importers]) => importers);
    expect(motionImporters).toEqual([]);
    const cssImporters = [...files.entries()]
      .filter(([file, specs]) => !file.endsWith(join("client", "src", "main.tsx")) && specs.some(spec => /\.css(\?.*)?$/.test(spec)))
      .map(([file]) => rel(file));
    expect(cssImporters).toEqual([]);
  });
});
