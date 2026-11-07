// ESLint (added 2026-09-12 by the forensic audit -- the project had a type
// checker and a test suite but no linter at all). Flat config, deliberately
// small: the TypeScript "recommended" rules plus the two React hooks rules.
// Anything stricter belongs in a separate decision, not here.
//
//   pnpm lint
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  // scripts/load/** нь k6-ийн өөрийн (Node биш) runtime дээр ажилладаг: "k6/http"
  // модулиуд болон `__ENV` глобал нь энэ repo-д хэзээ ч суулгагдахгүй тул
  // ESLint-д зөвхөн худал "no-undef" өгнө.
  // playwright-report / test-results / blob-report (2026-09-20): Playwright нь
  // уналттай run-ий trace-ийг хадгалахдаа trace viewer-ийн minified JS-ээ
  // `playwright-report/trace/`-д хуулдаг. ESLint нь `.gitignore`-ийг уншдаггүй
  // тул `pnpm e2e` уналттай дуусмагц дараагийн `pnpm lint` тэр вендорын
  // bundle-уудаас 3,977 худал алдаа өгдөг байв (аудитын бүтэн E2E run дээр
  // илэрсэн). Гурвуулаа gitignore-д аль хэдийн бий.
  // 2026-09-23: `client/public/**` бүхэлдээ БИШ — сайтын өөрийн гараар бичсэн
  // JS (sw.js, vendor/*-init.js, hero-shell.js) хуудас бүрт ажилладаг тул
  // шалгагдах ёстой; зөвхөн гадны `silktide-consent-manager.js` болон
  // `face-models/` (MediaPipe wasm loader) алгасна. `scripts/**/*.mjs` ч мөн.
  { ignores: ["dist/**", "node_modules/**", "client/public/face-models/**", "client/public/vendor/silktide-consent-manager.js", ".playwright-mcp/**", "scratchpad/**", "scripts/load/**", "playwright-report/**", "test-results/**", "blob-report/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["client/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    // The plugin's newer "recommended" set also ships the React Compiler
    // rules (set-state-in-effect, refs, purity, immutability). Those flag 39
    // places in this codebase that work and are tested; adopting them is a
    // refactor to plan, not a lint setting. The two rules that catch real
    // bugs stay on.
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // 2026-10-18 (storefront шинэчлэл): framer-motion нь зөвхөн LazyMotion + `m.*`-ээр —
      // `motion.*` ба `domMax` нь бүх feature-ийг эхний chunk-д татна (components/motion/).
      "no-restricted-imports": ["error", {
        paths: [
          { name: "framer-motion", importNames: ["motion", "domMax"], message: "LazyMotion + `m` ашигла (client/src/components/motion/MotionProvider.tsx)." },
          { name: "motion", message: "framer-motion-ийн `m` ашигла (нэг багц)." },
          { name: "motion/react", message: "framer-motion-ийн `m` ашигла (нэг багц)." },
        ],
      }],
    },
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["server/**/*.ts", "scripts/**/*.ts", "shared/**/*.ts", "scripts/**/*.mjs"],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["client/public/**/*.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.browser, ...globals.serviceworker } },
  },
  {
    rules: {
      // `_prefixed` is this codebase's convention for a deliberately unused
      // destructured field (e.g. stripping passwordHash off a user row).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_", caughtErrors: "none" }],
      // Empty catch blocks are used deliberately (JSON.parse / localStorage
      // guards) and each carries a comment; the rule would only add noise.
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
);
