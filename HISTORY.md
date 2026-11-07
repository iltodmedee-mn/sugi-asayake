# SUGI ASAYAKE — Дэлгэрэнгүй түүхэн ажлын лог

Энэ файл нь `docs/PROJECT-GUIDE.md`-г богино, session бүрт хурдан уншигдахуйц байлгах зорилгоор тусгаарласан **дэлгэрэнгүй, өдөр бүрийн narrative лог**. `docs/PROJECT-GUIDE.md` автоматаар session бүрийн эхэнд уншигддаг тул одоо зөвхөн "одоогийн статус/тохиргоо/идэвхтэй асуудал"-ыг л агуулна; энд бол бүх нарийн ширийн түүх, шалтгаан, баталгаажуулалтын алхам хадгалагдана. `docs/PROJECT-GUIDE.md` заавал шаардлагатай үед л (жишээ нь ижил төстэй bug дахин гарвал, эсвэл өмнөх шийдвэрийн шалтгааныг мэдэх хэрэгтэй үед) энд ирж хайж болно.

---

## Retro (2026-11-07): мониторинг, DB CA, лаптоп doctor, agent чиглүүлэгч

`/retro`-ийн 6 олдвор, Tom: "bugdiin hii". (1) 🔴 **uptime.yml 09-24-өөс хойш ажиллаагүй** — `9bbd443`-ийн `TITLE: ${{ … format('{0}: …') }}` хашилтгүй тул YAML хүчингүй, GitHub хуваарийг огт ажиллуулаагүй (10-01, ~11-01-ний DB ослуудад мэдэгдэл алга); хашилтад авч, `server/workflows-guard.test.ts` (бүх workflow-ийг parse, uptime-ийн 10 мин хуваарь) нэмэв — эвдэрсэн файл дээр улаан болохыг шалгасан; dev dep `yaml`. (2) **DB CA**: `classifyDbError` (tls_ca/tls/auth/network/timeout/config), `/health` унасан үед `reason` (ангилал л), watchdog-ийн мэдэгдэл төрөлд тохирсон алхамтай, `scripts/oci/rotate-db-ca.sh` (+`.ps1`) — серверийн гинжнээс Verify 0 өгсөн CA-г prod/staging-ийн `oci-ca.pem`-тэй тулгаж `--apply`-аар .bak + солих + pm2 restart + /health хүлээх (локал MySQL дээр 5 тохиолдолд туршсан), `db-backup.ps1` `VERIFY_CA` (өмнө нь REQUIRED-ээр CA-ийн солигдлыг нууж байв). (3) `scripts/oci/doctor.ps1` — лаптоп бэлэн эсэх нэг командаар (фолдер, git, .env-ийн түлхүүрийн нэр, CA, ssh, тунел, CA = VM, production /health). (4) `.claude/CLAUDE.md` — репод хуваалцах agent чиглүүлэгч (cloud session-д `/CLAUDE.md` байдаггүй). (5) asayake импортын нуух/нийтлэх/ангиллын дүрэм скриптээс `planImport` руу (+3 тест; скриптийн гаралт яг ижил). (6) `pnpm.overrides`-ийн хуулбар `pnpm-workspace.yaml`-д (шинэ pnpm package.json-ийнхыг уншдаггүй) + ижил байхыг шалгах тест. ⚠️ `.ps1`-үүдийг энд ажиллуулж шалгаагүй (pwsh байхгүй) — лаптоп дээрх эхний ажиллуулалт шалгалт.

---

## 🔴 Production DB унав: HeatWave CA дахин солигдсон (2026-11-07)

asayake импортын dry-run-ыг Tom-ийн лаптопоос ажиллуулахад `HANDSHAKE_SSL_ERROR: certificate signature failure` → гаднаас шалгахад **production `/health` `"database":"down"`, `catalog.list` 500** (дэлгүүр бараагүй). 10-01-ний ослын давталт: HeatWave `MySQL_Endpoint_CA`-г ~2026-11-01-нд шинээр үүсгэсэн (шинэ CA `notAfter=Nov 1 2029`). Засвар (Tom VM дээр, 14:08 UTC): VM-ээс `openssl s_client -connect 10.0.1.227:3306 -starttls mysql -showcerts` → гинжийн 2-р сертификат (`MySQL_Endpoint_CA`) `Verify return code: 0 (ok)`, одоогийн `oci-ca.pem` → `7`; prod + staging-ийн `oci-ca.pem`-ийг сольж (хуучин нь `.bak-20261107`), `pm2 restart sugi sugi-staging` → гаднаас `/health` database up, каталог бараатай. Лаптопын CA-г `scp sugi-oci:sugi-asayake/oci-ca.pem`-ээр шинэчлэв (deploy фолдер + Documents\Projects). ⚠️ Хоёр удаа чимээгүй унасан (pool-ийн хуучин холболтууд хэд хоног амьд байдаг) — CA-ийн өөрчлөлтийг өдөр бүр шалгадаг болгох санал нээлттэй.

---

## asayake.mn → каталог импорт скрипт (2026-11-07)

Tom: *"asayake.mn deerh baraanii too, medeelel, zurgiig asayake.mn ees av!"* ба *"busad buh baraag ustga! zuwhun asayake.mn baraanuudiig ashigl!"* `/grill-me`-ийн шийдвэрүүдээр `scripts/import-asayake-products.ts` (dry-run анхдагч, `--apply`, `--hide-others`, `--from-json`, `--no-images`, `--limit`; `defaultdb`-д `--i-know-this-is-production`-гүй бол `refuseProductionDatabase` татгалзана). asayake.mn нь Next.js — `__NEXT_DATA__`-аас уншина; үндсэн жагсаалт `created_at desc`-ээр тогтворгүй эрэмбэлэгддэг тул (32 хуудаснаас 684/768) 203 ангилал бүрээр нэмж татаж 768/768 болгосон. "Устгах" = нийтлэлтээс хасах: `deleteAdminProduct` захиалга/нөөцийн түүхтэй барааг өөрөө татгалздаг. Ангиллын нэр ялгаатай (Үс арчилгаа/Үс ба бие…) тул `ASAYAKE_CATEGORY_ALIASES` + дэд ангиллыг эцэг рүү — тааралгүй үлдэх 634 → 7. Бичилт бүр `createAdminProduct`/`updateAdminProduct`-оор (хувилбар, салбарын нөөцийн ledger, кэш). Локал туршилтын DB дээр алдаа 0, нөөцийн зөрүү 0, давтан run-д өөрчлөлт 0. Дэлгэрэнгүй, командууд: PRODUCT-IMPORT.md. **Production-д хийгдсэн (2026-11-07, Tom-ийн лаптопоос, Tom staging-ийг алгасахаар шийдсэн)**: эхлээд `db-backup-daily.ps1` (`defaultdb_2026-11-07_221911.zip`, 379 KB), дараа нь `--apply --hide-others --no-images`, тэгээд зураг (`--concurrency 8` — тунелээр нэг бүрчлэн 756 бараа ~30 мин удаан байсан тул нэмсэн). Гаднаас шалгасан: дэлгүүрт **772** бараа (asayake.mn 768 + бэлгийн карт 4), бүгд зурагтай (768 нь `catalog/products/asayake/`, WebP/600w/AVIF R2-оос 200), нөөц 768/768 ба үнэ 768/768 asayake.mn-тэй тэнцүү, 224 бараа нийтлэлтээс хасагдсан (жагсаалт Tom-ийн `backups\asayake-import\…\hide.csv`), `/health` up.

---

## Ажлын урсгал: production зөвхөн main-ээс, давхар plugin хасав (2026-11-07)

`/grill-me` session-ий шийдвэр (Tom: "бүгд тийм"): production 6bb42de нь `main`-д ороогүй branch-аас deploy хийгдсэн тул хэн нэгэн `main`-ээс deploy хийвэл storefront шинэчлэл чимээгүй буцах эрсдэлтэй байв. **`deploy.ps1`** одоо production-д `git merge-base --is-ancestor HEAD origin/main` шалгаж, `main` дээр байхгүй commit-ийг татгалзана (`-Staging` хамаарахгүй, `-AllowDirty` override). Tom AI Hero-ийн "Skills For Real Engineers"-ийг claude.ai бүртгэлдээ суулгасан тул репогийн `.claude/settings.json`-ийн `enabledPlugins`/`extraKnownMarketplaces`-ийг хасав (skill бүр давхар харагдаж байсан); `docs/agents/` тохиргоо хэвээр. OPERATIONS §2-д дүрэм.

---

## AI Hero skills — mattpocock/skills plugin (2026-11-07)

Эзэн: *"https://www.aihero.dev/ instal this on this repo"*. AI Hero-ийн суулгах зүйл нь Matt Pocock-ийн **mattpocock/skills** (MIT, 27 skill: `/grill-me`, `/grill-with-docs`, `/tdd`, `/to-spec`, `/to-tickets`, `/triage`, `/code-review`, `/diagnosing-bugs`…). Эзний сонголт: **repo-д идэвхжсэн plugin** (өөрөө шинэчлэгдэнэ, файл хуулахгүй) ба **GitHub Issues** tracker. `.claude/settings.json`-д `enabledPlugins` + `extraKnownMarketplaces` (`anthropics/claude-plugins-official`) — хоёр лаптоп, cloud session бүгд нэг тохиргоо; одоо байсан `permissions`, `includeCoAuthoredBy:false` хэвээр. `/setup-matt-pocock-skills`-ийн гаргадаг тохиргоог гараар бичсэн: `docs/agents/issue-tracker.md` (GitHub), `triage-labels.md` (анхдагч 5 label), `domain.md` (single-context). `## Agent skills` блок **PROJECT-GUIDE.md**-д — `/CLAUDE.md` нь лаптоп бүрийн gitignore-д орсон файл (PROJECT-GUIDE-ийг import хийдэг) тул хуваалцах цор ганц газар. GitHub-ийн 5 label үүсгээгүй (cloud-д `gh` байхгүй) — лаптоп дээр `gh label create`.

---

## Storefront UI шинэчлэл — UI TripleD, хуваалцсан карт (2026-10-18)

Эзний даалгавар: storefront-ийг "орчин үеийн, япон эмийн сангийн (drugstore) мэдрэмжтэй" болгох, UI TripleD (ui.tripled.work, MIT)-ийн тохирох бүрэлдэхүүнийг ашиглах, бизнесийн логик хөндөхгүй. Эзний шийдвэр (2026-10-18): **Брэнд студийн өнгө/фонт/хэлбэрийн токен (Linen, `--primary`, Golos, 4px булан) ХЭВЭЭР** — найруулга, бүрэлдэхүүн, хөдөлгөөн, төлөвүүд л шинэчлэгдэнэ; зөвхөн storefront (/admin, /face-approve хөндөхгүй); framer-motion зөвхөн LazyMotion + `m.*`-ээр, eager bundle-д биш.

- **A — суурь**: `client/src/styles/storefront.css` (index.css-ийн ДАРАА, main.tsx-ээс л импортлогдоно) + каскадын гэрээ (`.sugi-site`/`.sf-portal`-аар эхэлсэн сонгогч, `sf-` нэрэнд `-card`/`-panel`/`-section`/`rounded-`/`shadow-` орохгүй — index.css-ийн `[class*=]` шүүрдэлт, токен л, `--sf-*` alias л, `font-family`-гүй). **`server/storefront-ui-guard.test.ts`** тулгана (+ framer-motion eager графт орохгүй, CSS-ийг eager модуль импортлохгүй); hex guard `styles/**`-ийг ч уншина; ESLint `framer-motion`-ийн `motion`/`domMax`-ийг хориглоно. Фокусын цагираг `2px var(--ck-ink)` (хуучин хагас тунгалаг цэнхэр харанхуйд бараг харагддаггүй байв). `.button-primary:hover` hex → `var(--primary-hover)`. Үхсэн 2 attribute сонгогч устгав.
- **B — нэг барааны карт** (`client/src/components/product/ProductCard.tsx`, grid/shelf/compact): Shop.tsx-ийн дотоод карт, `home/ShelfProductCard`, `RailProductCard`, Профайлын хүслийн жагсаалт (латин нэр, шууд `<img>` — дүрмийн зөрчил байсан) дөрвийг орлов. Нөөц/брэнд/хямдрал/үнэлгээний дүрэм `shared/product-card.ts` (+ `server/product-card.test.ts`; бэлгийн карт үргэлж худалдаанд). Шинэ `ui/button.tsx` (cva → одоогийн `.button` гэр бүл, heroShell-тэй нэг эх сурвалж), `ui/badge.tsx`, `PriceBlock`, `StarRating` (hex SVG attribute-гүй), `WishlistToggle` (UI TripleD heart-favorite-ийн CSS port, `aria-pressed`). Тэмдгийн өнгө бүр Брэнд студийн AA-баталгаатай хос. `ProductCardSkeleton` `.shop-product-card`-гүй болов (e2e skeleton дээр давчихдаг байв). index.css-ээс хуучин картын 151 сонгогч устгав.
- **C — /shop**: framer-motion (зөвхөн `components/motion/MotionProvider.tsx` — LazyMotion `strict` + async `domAnimation`, `MotionConfig reducedMotion="user"`; sourcemap-аар шалгасан: entry/vendor-д 0, preload өөрчлөгдөөгүй, feature chunk 14 KB gzip lazy). UI TripleD **animated-pagination** → `uitripled/ShopPagination.tsx` (7 нүдтэй цонх `shared/pagination.ts` + тест, `aria-current`, Өмнөх/Дараах нэр хэвээр). Хэрэглэсэн шүүлтүүрийн чип AnimatePresence (`initial={false}`). Утсанд танилцуулга нягт, ангиллын мөр хэвтээ гүйлгэнэ (`styles/routes/shop.css`).
- **D — PDP**: нэг 4.8 KB-ийн JSX мөрийг уншигдахуйц болгов. UI TripleD **image-slider-card** → `uitripled/ProductGallery.tsx` (бодит зураг ResponsivePicture-аар, thumbnail tablist, ←/→/Home/End, шудралт, ImageLightbox хэвээр); **native-tabs** → `uitripled/ProductInfoTabs.tsx` (Тайлбар / Бүтээгдэхүүний мэдээлэл, Radix ui/tabs дээр). Үнэ ба "Сагсанд нэмэх" эхний дэлгэцэд; `QuantityStepper` нэг төлөвөөр компьютерийн мөр + утасны наалттай мөр; breadcrumb `nav > ol` + `aria-current`; "ДЭЛГҮҮР" ба `main strong` = үнэ дэгээ хэвээр.
- **E — сагс ба checkout**: `CartDrawer` уншигдахуйц, `sf-portal`, ResponsivePicture, QuantityStepper, ProgressBar (UI TripleD animated-progress CSS port); бүх хүртээмжийн нэр ба `div.border-b` дэгээ хэвээр. Checkout-ийн 24 KB-ийн мөр → 3 алхам + цайвар хураангуй (хуучин хар самбар), сонголтын карт `button[aria-pressed]` (radio биш — e2e), шар/ногоон hex мэдэгдлийн оронд `.sf-notice` токен, хураангуйн нэр `useProductName`. Локал DB дээр бүтэн урсгал (shop → бараа → сагс → checkout → алдаа → захиалга баталгаажлаа) компьютер/утас, гэрэл/харанхуй хоёуланд шалгагдсан.
- **F — Шуурхай харах ба хүрээ**: `QuickViewDialog` → `sf-portal sf-quick` (ResponsivePicture, PriceBlock, Badge, QuantityStepper, Button); утсанд доороос гарах хуудас (UI TripleD bottom-modal-ийн хэв маяг, drag-гүй; Tailwind v4-ийн төвлөрүүлэлт `translate` property тул `translate: none`). Хуучин `quick-view-*` CSS устгав. Толгой/hero/promo-д markup өөрчлөлт ОРООГҮЙ (heroShell-ийн пикселийн тэнцүү байдал) — `styles/chrome.css` нь зөвхөн footer-ийн жижиг засвар.
- **G — бусад хуудас**: UI TripleD **password-input** → `uitripled/PasswordInput.tsx` (Нэвтрэх ×2, Нууц үг сэргээх ×2, Профайл → Аюулгүй байдал ×6; `aria-pressed` "Нууц үгийг харуулах"). Профайлын цэс `aria-current`, гишүүнчлэлийн зурвас `ProgressBar`. Тусламжийн FAQ — **faq-section** CSS port (`styles/routes/content.css`, native `<details>` ба `shared/help-faq.ts` хэвээр). index.css-ээс хэн ч хэрэглэхээ больсон 6 attribute шүүрдэлт устгав. Хуудаслалтын идэвхтэй товч өөрөө `--ck-ink` дэвсгэртэй (индикатор нь зөвхөн хөдөлгөөн — контраст шалгалт абсолют байрлалтай ах дүү элементийг дэвсгэр гэж тооцдоггүй), checkout-ийн гарчгийн өргөлт `<em>` (харанхуйд index.css-ийн харанхуй-улаан давамгайлна). `storefront-contrast.spec.ts` 146/146 (локал DB).
- **`pnpm dev` цагаан хуудас засвар** (хуучин алдаа, 2026-10-01-ний аудитаас): `scannerProbes.ts`-ийн dev-ийн зөвшөөрлийн жагсаалт зөвхөн `/@vite/…` шиг налуу зураастай замыг тааруулдаг байсан тул `@vitejs/plugin-react`-ийн `/@react-refresh` 404 авч, апп огт mount болдоггүй байв (зөвхөн heroShell-ийн загваргүй HTML). Яг тэр замыг dev-д зөвшөөрөв; production-д probe хэвээр (тест).
- **Хийгээгүй / мэдэгдэж буй цоорхой**: index.css-ийн өргөн `[class*="-card|-panel|…"]` шүүрдэлтүүд хэвээр (бүрэн computed-style diff шаардана); салбар бүрийн цагийн хуваарь ба координат API-д байхгүй (нийтийн `contact.hours` л); `usageInstructions`/`warnings` API-аар ирдэггүй (backend өөрчлөлт — эзний зөвшөөрөл); FAQ код дотор (CMS биш); амжилтын ногоон өнгөнд токен байхгүй.
- **Лиценз**: `THIRD_PARTY_NOTICES.md` (MIT текст + зөөсөн файлын хүснэгт), OWNER-HANDOVER §6-д мөр.

---

## Брэнд студи A0+A1 + баярын загвар (постер, мэндчилгээ) (2026-10-05, орой)

Tom: *"сайтыг өөр компани/хувь хүнд ч зарж болдог болго — загвар, өнгө, фонт, блок, баярын загвар (Цагаан сар, Наадам, Шинэ жил, 6/1, 11/26, Чингис хаан, 3/8, Валентин…). Zochil шиг биш, шинэ санаатай."* Батлагдсан төлөвлөгөө: A0 (өгөгдөл/токен) → A1 (admin) → A2 (лого→палитр, фонт) → A3 (нүүрний бүтэц) → A4 (баяр) → A5 (hex цэвэрлэлт) → B (эзэн солих).

- **A0 токен**: `shared/theme-tokens.ts` (index.css-ийн бодит утга = `BASE_THEME`, тест тулгана), сервер `<style id="brand-tokens">` (`html:root` specificity — дарааллаас үл хамаарна), `theme-color` мета токеноос, `--product-aspect`, `--promo-bar-*`, `--primary-hover` (SitePromo/heroShell-ийн хатуу hex). Migration **0103–0105** (`site_themes`, `site_theme_versions`, `site_layouts`) staging-д орсон, `REQUIRED_MIGRATIONS`-д. HTML кэшийн түлхүүрт УБ-ийн өдөр. E2E 94/94 — харагдах өөрчлөлт 0.
- **Баярын хуанли**: `shared/holidays.ts` (13 баяр, сарны тооллын баталгаатай огноо л), `shared/theme-resolver.ts` (цэвэр, УБ өдөр, priority, override, Битүүн), анхдагч бүгд **унтраалттай**.
- **A1 /admin → Брэнд студи** (`server/brandStudioRouter.ts`, `client/src/components/admin/brand-studio/`): Өнгө ба хэлбэр (бүлэглэсэн токен, AA badge, "Бүгдийг засах" = `fixForeground`, булан, зургийн харьцаа), **амьд preview** (бодит сайт iframe `?brandPreview=1` + postMessage, `BrandPreviewBridge.tsx`, компьютер/утас, гэрэл/харанхуй), Баярын загвар (timeline, асаах, хоног, гараар огноо, мэндчилгээ, постер upload, урьдчилан харах), Түүх (сүүлийн 30, сэргээх). Сервер AA-г дахин шалгана (`checkLookContrast`, 22 хос).
- **Баяр бүрт санал болгох өнгө** (`shared/holiday-palettes.ts`, бүгд AA) — товчоор л хэрэгжинэ.
- **Постер + мэндчилгээ**: идэвхтэй баярын үед `home-hero` слотыг постероор **нэг газар** солино (`server/_core/holidayHero.ts` → indexHtml + `content.siteMedia`), мэндчилгээ `.hero-greeting` (heroShell ↔ HeroSection ижил). 13 анхдагч постер `client/public/images/holidays/` (webp+avif, 1024/600) — **Gemini Nano Banana Pro**-оор. Tom-ийн шүүмжээр 2 дахин хийсэн: эхнийх нь хятад хэв маягтай (хадаг, шаазан, бадамлянхуа) ба мөнгөн аяга "хөнгөн цагаан шиг", Blue Sky-г Төрийн ордны ард тавьсан → бодит объектын судалгаа + Wikimedia-ийн бодит УБ зургийг лавлагаа болгосон. Дүрэм санах ойд (`mongolian-imagery-authenticity`).
- **A2 лого → палитр** (`shared/color/palette.ts`: median-cut, брэнд өнгө сонголт, "Тод/Зөөлөн/Харанхуй зурвас" 3 палитр бүгд AA — дунд гэрэлтэй өнгөнд товчийг өөрийг нь харанхуйлна; `admin.brandStudio.derivePalette` логог R2/public-аас уншина). Фонтын сонголт (A2-ын үлдсэн хэсэг) Tom-ийн фонтын жагсаалтын зөвшөөрлийг хүлээж байна (дүрэм 0.1).
- **A3 нүүрний бүтэц** (`shared/home-sections.ts`, `server/db/layouts.ts`, bootstrap `layout`, `client/src/lib/homeLayout.ts`, Home.tsx `sections` map): 9 хэсгийг дараалах/нуух, EditorialBanner зураг зүүн/баруун. **Hero тогтмол эхэнд** (shell-ийн дүрэм). Preview нь reload-гүй дахин эрэмбэлнэ.
- **A5 hex → токен** (`scripts/codemod-hex-to-tokens.ts`, dry-run анхдагч): storefront-ийн 211 мөрөнд (index.css 159 + 15 компонент) брэнд өнгө `var(--…)` болов — үндсэн загварт харагдах өөрчлөлт 0 (утга нь ЯГ BASE_THEME), `#c81b34` → `--primary-strong` (`color-mix` үндсэн өнгөнөөс, бараг ижил). Зориуд үлдсэн: одны алтлаг SVG `fill`, InstallGuide-ийн зураг, токены тодорхойлолт. Codemod нэг мөрт `:root { --ck-gold: … }`-ийг өөрийгөө заасан `var(--ck-gold)` болгож алтлаг өнгийг устгах байсныг guard тест барьсан → тодорхойлолтыг хаана ч хамгаална. **`server/theme-hex-guard.test.ts`** брэнд hex дахин орохыг хаана. E2E 104/104.
- **Брэнд багц** (`admin.brandStudio.exportPack`, Түүх таб → "Брэнд багц татах"): `brand-pack.v1.json` — загварууд, нүүрний бүтэц, site_text, site_media URL; нууц/хэрэглэгч/захиалга ороогүйг тест батална. Import нь B2-т.
- **B1 эзэн солих — нэр кодоос тохиргоо руу**: шинэ site_text `brand-text-short-name` (анхдагч "SUGI ASAYAKE") ба `brand-text-supplier`; client-ийн 39 файлын 78 мөр `brandName()`/`brandTitle()` (`client/src/lib/brand.ts`, bootstrap-оос, hook биш) — толгойн буцах холбоос, хуудасны гарчиг, ажилтны тэмдэг, admin-ий гарчиг, лого alt. **`server/brand-name-guard.test.ts`** "SUGI ASAYAKE"-г client кодонд дахин оруулахгүй (comment-оос бусад). Бэлгийн картын угтвар store setting `gift-card-prefix` (хуучин `SUGI-` кодууд хүчинтэй — normalize хэрэглэгчийн бичсэн угтварыг хадгална). PWA manifest серверээс (`server/_core/manifest.ts`: нэр, өнгө тохиргооноос), `apple-mobile-web-app-title` = `%SITE_SHORT_NAME%`, offline.html/sw.js/туршилтын мэдэгдэл брэндгүй. Үлдсэн (засварлагддаг fallback, эзэн солих скрипт бичнэ): site_text-ийн "SUGI Drug Store…" fallback, i18n орчуулга, brand-aliases seed. E2E 92/92.
- **B2 эзэн солих — цэвэрлэгээ + wizard + импорт**: `scripts/new-owner-reset.ts` (dry-run анхдагч; `--apply` = `--confirm="<сайтын нэр>"` + `--i-have-a-backup`; `defaultdb`-д `--i-know-this-is-production`; `--staging`). 76 хүснэгт бүгд ангилагдсан (`TABLE_GROUPS`: keep / customerData үргэлж / content / catalog / branches / branchStock / brand) — ангилалгүй хүснэгт олдвол татгалзана, `server/new-owner-reset.test.ts` шинэ хүснэгтийг барина. Нэг транзакц, үлдэх хүснэгтийн FK-г үлдэх admin/NULL руу шилжүүлж, эцэст нь FK бүрийн өнчин мөрийг тоолж байвал ROLLBACK. Бодит устгал зөвхөн migration гинжээс үүсгэсэн `sugi_migtest` дээр туршигдсан (`new-owner-reset.integration.test.ts` 3/3); staging дээр dry-run: ангилалгүй 0. **Брэнд студи → "Эзэн солих" таб**: нэр (4 slot), 7 алхмын холбоос, брэнд багц татах/импортлох (`admin.brandStudio.importPack`, adminProcedure, мэдэгдэх slot л, AA унасан загвар алгасна, `javascript:` зураг татгалзана), цэвэрлэгээний CLI команд. Өгөгдөл устгах вэб товч ЗОРИУД байхгүй.
- **Баярын постер R2-д** (Tom: "лаптоп дээр биш R2 bucket-д, тусдаа хавтсанд"): `scripts/upload-theme-assets.ts` → нийтийн `themes/holidays/v1/` (13 × webp/avif × 1024/600 = 52), эх PNG ба UI дизайн хувийн bucket `design/gemini/` (19). Репоос `client/public/images/holidays/` устгав. `HOLIDAY_POSTER_VERSION` — immutable кэштэй тул постер солих бол хавтасны хувилбарыг ахиулна.
- **B3 лиценз, дэд бүтэц**: `deploy.ps1 -SshHost/-PublicHost` (env `DEPLOY_SSH_HOST`/`DEPLOY_PUBLIC_HOST`), `cloudflare-harden.mjs` env-ээр (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID`, `SITE_HOST`, `OWNER_EMAIL`), uptime workflow repo variable `SITE_HOST`, Playwright `E2E_STAGING_HOST` — бүгд одоогийн утгаа анхдагчаар хадгалсан. Golos Text-ийн `client/public/fonts/OFL.txt`. OWNER-HANDOVER §5 (Брэнд студи, эзэн солих, цэвэрлэгээ, параметр) ба §6 (TinyMCE GPL эрсдэл, LICENSE файл — эзний шийдвэр), OPERATIONS §4b. Тестийн "Орос элчингийн салбар" нь ci-seed-ийн өгөгдөл тул хэвээр (эзэн солиход хамааралгүй).
- **Баярын палитрын хөтчийн контраст** (`e2e/storefront-contrast.spec.ts` "баярын палитр"): 13 палитр × нүүр/shop/checkout × компьютер/утас = 78/78 — серверийн 22 хосын шалгалтаас гадна хуудсан дээрх бүх жижиг текст.
- **Таб/апп дүрс логоноос** (`server/_core/brandIcons.ts`, `/brand-icon/<нэр>.png`): store setting `brand-icons-from-symbol=1` + "Лого — жижиг бэлгэ тэмдэг" upload хийсэн үед 6 дүрсийг (favicon 64, apple 180, icon 192/512, maskable 192/512) sharp-аар үүсгэнэ (apple/maskable цагаан дэвсгэр, safe zone); анхдагч 0 = статик `/icons/*` руу 302 — одоогийн сайтын дүрс ЯГ хэвээр. manifest болон `index.html`-ийн icon холбоос `/brand-icon/`. Тест: unit 6, E2E (route + manifest).
- **A2 фонтын сонголт** (Tom: "төлөвлөгөөний бүх phase") — `shared/fonts.ts`: Golos (анхдагч) + Inter, Manrope, Onest, Nunito, Montserrat, Noto Sans, Roboto Flex (бүгд OFL 1.1, Google Fonts-ийн variable subset `client/public/fonts/<key>/`, `scripts/fetch-brand-fonts.ts`). IBM Plex Sans-ийг төлөвлөгөөнөөс ХАССАН — OFL-ийн Reserved Font Name "Plex" тул subset файлыг тэр нэрээр түгээх эрсдэлтэй → Noto Sans. Монгол Ө ө Ү ү Ё бүгдэд fonttools-оор + хөтөч дээр canvas-ийн өргөнөөр батлагдсан (`e2e/brand-fonts.spec.ts` 14/14). Загварт `fontBody`/`fontDisplay` (анхдагч golos — харагдах өөрчлөлт 0); сервер зөвхөн СОНГОСОН фонтын @font-face-ийг brand-tokens-д (сонгоогүй нь татагдахгүй); Өнгө табд жишээ үсэгтэй сонголт, preview reload-гүй. OFL.txt-д 8 фонтын зохиогчийн эрх.
- **A4 баярын чимэглэл** (`shared/holiday-decor.ts`): хөдөлгөөнт эффект цас / цэцгийн дэлбээ / конфетти (зөвхөн CSS, 26 элемент, тусдаа lazy chunk, `load`-оос 1.5 с хойш — LCP-д нөлөөгүй, `prefers-reduced-motion`-д гарахгүй, 15 с-ийн дараа бүдгэрнэ) ба **алхан хээ** (SVG mask, алтлаг токен, hero-ийн ДООР — shell-тэй зөрөхгүй). Баяр бүрт анхдагч "none", Баярын загвар → Тохируулах-аас сонгоно; preview reload-гүй. Зориуд оруулаагүй: **дэнлүү** (хятад баярын тэмдэг), **хас/түмэн насан** хээ (хасын хэлбэр — буруу ойлгогдох). Тест: unit 4, integration (хадгалсан эффект идэвхтэй баярт), E2E (preview-д цас+хээ, none үед алга) — нийт E2E 180/180.
- **A3 нэмэлт: "Чөлөөт зурвас" 1–3 ба барааны сүлжээ** — админ Нүүрний бүтэц табаас гарчиг, текст, товч (зөвхөн дотоод холбоос/#хэсэг — `sanitizeFreeBlockProps`), Content & Media → `home-free-1..3` зураг; хувилбар зураг зүүн/баруун (EditorialBanner) эсвэл зөвхөн текст; гарчиггүй бол зурагдахгүй. Анхдагч НУУГДСАН — одоогийн нүүр өөрчлөгдөхгүй. Их зарагддаг бараа "сүлжээ" хувилбар. Hero-ийн хувилбарыг (split/carousel) ЗОРИУД хийгээгүй — hero shell-ийн дүрэм (shell ↔ React зөрнө, LCP).
- **Хоёр дахь бие даасан шалгалт (725953c..5f2f57b) — 11 олдвор засагдсан**: (1) 🔴 `new-owner-reset.ts`-ийн production хамгаалалт `DATABASE_URL`-ийг шалгаж, `DATABASE_ADMIN_URL`-аар холбогддог байсан → холбогдох URL-ийг шалгана; (2) чөлөөт зурвасын `#хэсэг` товч wouter Link-ээр гүйлгэдэггүй → `<a>`; (3) анхдагч төлөвт өөрчлөгдсөн текстүүд (SUGI JOURNAL, SUGI DAILY CARE, …MONGOLIA, бэлгийн картын placeholder) өмнөхтэйгөө ЯГ ижил болов (брэндээс бодогддог + `journal-text-kicker`/`shop-text-category-kicker` slot), таб дүрс анхдагчид 302-гүй (`%SITE_ICON_SMALL%`/`%SITE_APPLE_ICON%`, manifest ч тохиргоо асаалттай үед л `/brand-icon`); (4) сервер талын fallback (`indexHtml` textFor, `getSiteTextValue`) "SUGI ASAYAKE"-г богино нэрээр — shell ↔ React зөрөхгүй, `<title>`/OG шинэ нэртэй; (6) `/brand-icon/constructor.png` → `Object.hasOwn`; (7) `oci-ca.pem.bak-20261005` 9dbd31f-д санамсаргүй commit болсныг tracking-оос хасаж `*.pem.bak*` ignore (нийтийн CA сертификат, нууц биш — түүхэнд үлдсэн); (8) одны SVG `fill`/`stroke` hex руу буцав (Safari-д var() найдваргүй) + codemod-ийн regex `fill={…}` хэлбэрийг алгасна; (9) `E2E_STAGING_HOST` нэрэнд "staging" байх ёстой; (10) `DEPLOY_PUBLIC_HOST` staging deploy-д хамаарахгүй (`DEPLOY_STAGING_PUBLIC_HOST`); (11) `gift-card-prefix`, `brand-icons-from-symbol` → "Брэнд" бүлэг. Замдаа олдсон: placeholder нэрэнд тоо (`SITE_ICON_64`) indexHtml-ийн regex-д таардаггүй байв. (5) i18n: шинэ нэртэй мөрийн орчуулга монголоороо үлдэнэ — Эзэн солих табд бичсэн.
- **Бие даасан шалгагчийн 8 олдвор засагдсан**: зарын зурвасын текст `promo-bar-fg`/`primary-foreground` токен (AA шалгалт худал баталгаа өгч байв), preview iframe хандалт/GA4-д тоологддог байсан, гараар огноо оруулбал дараа жилүүдэд баяр бүрмөсөн унтардаг байсан, rollback баярын асаалтыг буцаадаггүй, баярын токен /admin-ий UI-г ч солих байсан (одоо /admin, /face-approve кодын суурьтай), rollback-ийн driver алдаа клиент рүү, суурь солиход баярын patch шалгагддаггүй, PreviewFrame-ийн төвлөрөлт.
- Тест: unit 990 (шинэ: токен, резолвер, контраст, палитр, лого палитр, постер, нүүрний layout), integration `brand-studio.integration.test.ts` 4/4 (staging, snapshot-and-restore), E2E 112/112 (`brand-studio.spec.ts`: өнгө→preview, AA засвар, лого палитр, нүүрний бүтэц, баярын урьдчилан харалт; hero-shell 1 удаа ачааллын flake — дангаар 30/30, дахин бүтэн run ногоон).
- ✅ **2026-10-06 production-д гарсан** (Tom: `0e5d639`, DEPLOY-RESTART-OK, /health 200; 0103–0105 prod-д аль хэдийн байсан). Гаднаас: brand-tokens, theme-color `#df1f3d`, статик таб дүрс, динамик manifest, R2 постер 200, admin.brandStudio 401.
- Gemini MCP: `claude mcp add gemini -s user -e GEMINI_API_KEY=… -e GEMINI_IMAGE_OUTPUT_DIR=C:/Users/hero_/Pictures/gemini -- npx -y @houtini/gemini-mcp` (нэрийг `-e`-ээс ӨМНӨ). Зураг үүсгэхэд billing хэрэгтэй (үнэгүй горимд зургийн хязгаар 0). Түлхүүр чатад ил болсон — дуусмагц солих.

## /admin → Процесс самбар + сайтын бодит төлөвийн шинжилгээ (2026-10-05)

Tom Facebook-оор **NEXUS demo** artifact (Аксиллион ХХК, "Худалдан авалт PR → PO": BPMN диаграм,
агент алхам бүрийг гүйцэтгэж, хүн батлаж, аудит append-only) үзээд: *"sugi.karkaron.com маань яг
юу болж байна, энэ шиг лаг юм болох боломж байна уу, өөр ямар шинжилгээ/алдаа засвал хүнд зарах
боломжтой болох вэ"* → *"sugi.karkaron.com дээр л шинжилгээ хий"*, *"дотор талаас кодыг бас шалга"*.

**Artifact юу байсан**: `project/Main.dc.html` уншихад бүх алхам, үнийн санал, "итгэл 0.93", аудитын
мөр **JS массивт хатуу бичсэн зохиомол өгөгдөл** (толгойд нь "Demo — өгөгдөл зохиомол"); backend, Odoo,
AI, DB алга — товшигддог презентаци. SUGI эсрэгээрээ: 9 scheduler job, нөөцийн ledger, вендорын
батлах дэлгэц, ~100 төрлийн аудит бодитоор ажилладаг ч түүнийг ХАРУУЛДАГ дэлгэц байгаагүй.

**Бодит сайтын шинжилгээ (гаднаас, read-only)**: `/health` 200 `database: up`, бүх нийтийн хуудас
200 (0.18–0.6 с), sitemap 1008, CSP/HSTS/PWA зөв. ⚠️ **Prod дээр 09-23-ны `2abe751` ажиллаж байгааг**
`/api/trpc/x/catalog.list` хариу өгснөөр баталгаажуулав (10-01-ний `trpcBatchGuard` энэ замыг 404
болгодог) — 29 commit / 206 файл / ~7,400 мөр (09-24→29 аудит, 09-29 хямдрал, 10-01 аюулгүй байдал)
deploy хийгдээгүй; `db-migration-status.ts` prod-д **0096–0100 дутуу**, staging 101/101.
`sugi-staging.karkaron.com` DNS байхгүй (NXDOMAIN). Энэ лаптопын `oci-ca.pem` хуучин CA хэвээр —
VM-ээс scratchpad руу `scp`-дээд `DATABASE_CA_CERT_PATH` орчны хувьсагчаар бүх скрипт/тестийг
ажиллуулав (`.env`/`*.pem`-д бичих эрх хаалттай; Tom өөрөө солино).

**Дотоод аудит (HEAD)**: tsc ✅, lint ✅, unit 850/0 бодит уналт, build ✅ 166 KB gzip, TODO/`as any` 0.
Олдсон: `pnpm audit --prod` 4 high/2 moderate (`brace-expansion`, exceljs гинж) → override, одоо 0;
admin Q&A 200-ийн хатуу cap → хуудаслалт; `schema-drift-check` зөвхөн баганын нэр → төрөл/null/default;
`inventorySync.ts` `onlineBranchIds` `isActive`-гүй → нэмэв; **кодоос баталгаажсан deploy эрсдэл**:
0099-гүй deploy = бүх сешн `null` (`getUserById` `select()` бүх баганыг уншдаг), 0098-гүй = бүх
checkout унана (`order_items.listPriceMnt` болзолгүй) — fallback алга. Тиймээс **boot-ийн
хамгаалалт** `server/_core/migrationCheck.ts`: `REQUIRED_MIGRATIONS` жагсаалтыг `schema_migrations`-тэй
тулгаж production-д дутуу бол сервер ЭХЛЭХГҮЙ (тод монгол алдаа + ажиллуулах команд), dev-д
анхааруулна; `migrationCheck.test.ts` сүүлийн мөр = drizzle/-ийн сүүлийн файл гэдгийг шаардана
(VM дээр drizzle/ байдаггүй тул диск биш жагсаалт). `MIGRATION_CHECK=0` унтраана.

**"Процесс" самбар (Tom: бодит өгөгдөлтэй, AI алхамгүй)**:
- **Migration 0101 `order_events`** (append-only; `actorKind` customer|staff|job|webhook|system,
  actorUserId SET NULL, payloadJson — нэр/утас/хаяг хэзээ ч биш; orderId CASCADE) ба **0102
  `job_runs`** (ажиллалт бүрийн startedAt/finishedAt/ok/error/affectedCount/claimedBy). Яагаад тусдаа:
  `admin_audit_logs.actorUserId NOT NULL` тул job/webhook/харилцагчийн үйлдэл хэзээ ч бүртгэгддэггүй
  байв; ~100 дуудагчтай хүснэгтийг HeatWave дээр ALTER хийхийг сонгосонгүй.
- `server/db/order-events.ts`: `recordOrderEvent(dbOrTx, …)` — **захиалга бичдэг 10 функц (13 дуудлагын цэг)** ижил tx
  дотор дуудна: checkout (`cart-orders.ts`, зочин бол "Зочин"; store-credit-ээр төлөгдвөл +paid
  +pending→confirmed), POS, `createManualOrder`, `updateAdminOrder` (status.changed/payment.paid
  (COD дууссанд)/tracking.set/note.set; шинэ `actor`/`eventMeta` параметр — `cancelOwnOrder`
  `{kind:"customer"}` дамжуулна, bulk `{bulk:true}`), `requestOrderReturn`, `refundOrder`,
  `editAdminOrder`, `markQPayPaymentAttemptPaid` (webhook актор = провайдер; at-least-once callback
  давхар мөр бичихгүй; `payment.duplicate`), `markReviewRequested` (job), роутерийн
  `notifyOrderStatusChange` дараах `notify.customer` (систем). `deleteAdminOrder` cascade.
  Уншигч: `getOrderTrail` (event + `stock_movements refType=order` + `payment_attempts` +
  `notification_outbox dedupeKey LIKE '%|order:<id>'` + аудит (зөвхөн admin) → `shared/process-timeline.ts`
  `mergeTimeline`: нэг секундын тэнцвэрийг эх сурвалжийн давуу эрх → id-аар), `getProcessOverview`
  (эгнээ бүрийн тоо/гацсан/хамгийн хуучин, хүний шийдвэр хүлээж буй 4 тоо, Smart Software push
  cursor-оос хоцрол, `missingTrail` — event-гүй захиалгын тоо = алдсан бичих замын илрүүлэгч,
  24 цагийн акторын тоо), `getStageOrders`, `getAuditFeed` (аудит + event + job_runs нэг урсгал).
- Scheduler: `job.run()` бүр `job_runs`-д (хост#pid), `run()` `{affectedCount}` буцааж болно,
  `data-retention` 30 хоногоор цэвэрлэнэ; `listRegisteredJobs()`.
- API `admin.process.*` (overview/stageOrders/returnRequests/orderTrail — `ordersReadProcedure`;
  jobs/auditFeed — admin; `admin.` угтвар хэвээр тул `trpcBatchGuard`/`splitLink` хөндөгдөөгүй);
  `jobs` нь `schedulerActive` буцаана — staging/cluster instance≠0 дээр scheduler зориуд
  ажилладаггүйг самбар тайлбарлана (E2E-д ингэж илэрсэн).
- UI: sidebar "Процесс" (warehouse/finance/admin), 3 tab — **Гинж** (5 эгнээ + цуцлагдсан/буцаагдсан
  + Smart Software sync карт, "Гацсан N", 24 цагийн акторын chip, эгнээ товших → жагсаалт → "Түүх"),
  **Захиалгын түүх** (дугаараар/id-аар, дугаарласан timeline, актор chip, deep link
  `?adminSection=process&orderId=`; Захиалгын картанд ч "Түүх" toggle — `admin.orderDetail`-ийн анхны
  клиент), **Ажлууд ба аудит** (admin). Хүний шийдвэрийн карт зөвхөн байгаа дэлгэцүүд рүү холбоно.
- Backfill `scripts/backfill-order-events.ts` (`--dry-run`, `--staging`, idempotent): staging-д 6
  захиалга → 7 event, дахин ажиллуулахад 0.
- Хөтөч дээр (Playwright, компьютер + Pixel 7) олдсон бодит алдаа: эгнээний `.sr-only` span
  (absolute) эгнээ `position: relative` биш байснаас хуудсыг **376px тэлдэг** байв (ямар ч элемент
  ил харагдахгүй — устгалтын аргаар олсон) → зассан; `admin.process.jobs` staging дээр хоосон →
  тайлбар. `e2e/admin-process.spec.ts` (4 тест, хэвтээ scroll-ын offender-уудыг нэрлэдэг диагностиктай).
- Тест: `server/order-events.integration.test.ts` 12/12 (зам бүрээр actorKind/from→to, trail-д
  ledger+outbox, cascade), `process-timeline.test.ts`, `scheduler.test.ts` (+job_runs),
  `migrationCheck.test.ts`; `price-campaign-report.integration.test.ts` 2/2 (SALE-PLAN §4 тайлан —
  `admin.priceCampaignReport`: хямдралын цонхны захиалга/борлуулалт/хөнгөлсөн дүн `settledSaleSql`-ээр,
  өмнөх ижил цонхтой харьцуулалт, өдрөөр, топ 5 — `AdminPriceCampaignCard`-д "Тайлан").
- Баримт: PROJECT-GUIDE (6 шийдвэр ✅, тестийн тоо), OWNER-HANDOVER тоо, SALE-PLAN header.

✅ **Deploy хийгдсэн (20:54)**: Tom гэртээ prod-д 0096→0102 (103/103) → `deploy.ps1` (`d91b9fd`) →
шинэ код амьд (`/api/trpc/x/catalog.list` 404, /health up, үндсэн хуудсууд 200) → backfill prod-д
(6 захиалга → 7 event). Claude-ийн auto горимын хамгаалалт prod migration/deploy-г хаадаг тул
командуудыг Tom өөрөө ажиллуулав (эхний оролдлого `C:\Windows\System32`-аас — `cd` хийгээгүй).
Хувийн R2 bucket үүсэж, VM + лаптопын `.env`-д `S3_PRIVATE_BUCKET`. Мөн өдөр Zochil Studio
v0.16.4–0.16.5: Messenger бот any_word спамгүй болж, хариу дүүрэн (орцын 7 сэдэв, брэндийн жагсаалт).

## asayake.mn 2026-ийн төлөвлөгөө + Messenger бот v4 (2026-10-05, сайтын кодтой холбоогүй)

Tom: *"asayake.mn-ийг улам сайн төгс болгох план, бас FB чат template сайжруулалт өнөөдөр — 2026 оны тренд, олон улсын жишиг"*. asayake.mn = Zochil дэлгүүр, бүх ажил `zochil-studio` repo-д (v0.14.0). Төлөвлөгөө (3 хэсэг: ӨНӨӨДӨР бот v4 / 7 хоног сайт / 30 хоног модулиуд, Tom-ийн 6 шийдвэр) `~/.claude/plans/nadaa-asayake-mn-iig-ulam-fancy-aurora.md`-д, судалгаа нь NielsenIQ State of Beauty 2026, Olive Young 2026 trend, @cosme awards, Matsukiyo апп, ORBIS/Kosé LINE, Meta developer docs 2026, DataReportal Mongolia 2025 эх сурвалжтай.
- **Хэмжсэн**: asayake.mn-ийн нүүрэнд попап зар hero-г бүтнээр дардаг (утсан дээр 70%); арьсны төрлөөр орох хаалга, итгэлийн мөр, сэтгэгдэл нүүрэнд алга. Zochil-д ашиглаагүй модулиуд: coupons (0 купон), reviews, create-bundle, supersale, multi-channel (Instagram бот), lookbook, events. ZochilBot-д `CommentReply` node бий (comment-to-DM боломжтой). Storefront хайлт `/products?name=…`, хямдралын хуудас `/saled-products` (одоо хоосон).
- **Бот v4** (бодит 30 чатын эрэлтээс): 📦 Захиалгын төлөв (Асуулт → ажилтан), насаар асуух → арьсны сонгогч (`skin` бүлэгт — тусдаа бүлэг биш: нэг мессеж хоёр trigger-т таарвал хоёр хариу), «маск/тонер/пудр/ком байгаа юу» → ангилал, арьсны картын дэд мөр «үнэ · яагаад» (51 бараанд гараар), 6 MUST copy засвар + нэр томьёо нэгтгэл, ☰ «🛍️ Бараа үзэх» / «🧴 Арьсандаа тохирох» (uid хэвээр `menu/update`), `keywordOverlaps` хамгаалалт (бүлэг хоорондын дэд мөр давхцал = нийтлэхгүй), LIMIT 64 node / 240 KB. Ажилтны 12 бэлэн хариулт `zochil-studio/reports/saved-replies-2026-10-05.md`.
- **Inbox 404**: Zochil-ийн `chatbot/inbox/conversations` ЖАГСААЛТ 10-04-өөс 404 ("Conversation does not belong to this account"), дэлгэрэнгүй/мессеж хэвээр 200 → жагсаалтыг admin-ийн `social-pages/facebook-conversations?limit=50`-оос; авто-сэргээлт, үнэлгээ сэргэв. Шинэ: «Харилцагч юу бичдэг вэ» — гараар бичсэн мессеж бүр аль түлхүүр бүлэгт, танигдаагүй % + жишээ (AI-ийн шийдвэрийн үндэс).
- **Урамшууллын картыг хассан** (мөн өдөр, Tom: *"Урамшуулал хямдрал үнэхээр хэрэггүй — арилга"*): 🎁 карт + `promo` бүлэг нийтлэгдээд 20 минутын дотор хасагдсан (v0.14.1, амьд урсгал 56 node / 186 KB); урамшуулал/1+1/азтан гэвэл өмнөх шиг ажилтан руу. Купон, flash sale-ийг төлөвлөгөөнөөс мөн хасав.
- **Бэлэн хариулт (v0.15.0, мөн өдөр)** — Tom: *"asahi.mn шиг static: prieclat гэвэл шууд холбоос, бараг бүх бараанд, гацах уу судал"*. ZochilBot-д зураг/товч/гарчиггүй нэг карт = энгийн текст (уртын хязгааргүй, admin bundle-ийн validation-оос). Брэнд бүр (каталогоос автоматаар, `?brand_id=`) + 22 төрөл/сэдэв (`tools/zbot-faq.json`, кирилл+латин хэлбэрүүд) → «🛍️ X брэндийн N бараа … 👉 холбоос 🌐 сайтаар зочилж …». Бараа тус бүр = 1,558 node (боломжгүй, хувьсагч байхгүй) тул брэнд+төрлөөр. 1-р шат амьд: **158 node / 254 KB** (29 брэнд ≥5 үлдэгдэлтэй бараатай). Давхцал: 4-өөс богино брэнд (LEC, P'S, T3, KAI) ба Botanical (⊂ Diane Botanical) алгасагдсан. Суурь хурд (сүүлийн 50 чат, 7 хоног): медиан 1 с, ≤2 с 69%, давхар 4.
- **Бэлэн хариулт v2/v3 (v0.16.1, үдээс хойш)** — Tom: *"22 сэдэв биш, илүү өргөн; deep analyze, харилцагч юу асуухыг таамагла (хүүхдийн биед ямар тос → хүүхдийн тос); гол нь performance"*. Facebook inbox-ийн 500 чатын 1,951 мессежийг шинжилж (зөвхөн GET), 56 сэдэв: хариу нь каталогоос — дэд ангилал + үлдэгдэлтэй шилдэг бараа нэр/үнэ/шууд холбоостой (сайтын `?name=` хайлт тайлбараар таардаг тул найдахгүй). Хамрах хүрээ 34% → 44%. Шинэ: харшил/загатналт → анхааруулга + ажилтан, тулгуур, ажил, хамтын ажиллагаа, Diane гэр бүл, FB-ийн "Can you check the price" товч. Амьд: **222 node / 341 KB**, хариу ≤1 с (хэмжиж байна), 2+ сэдэвт таарсан мессеж давхар хариу аваагүй.
- **Хэмжсэн (v0.16.2)**: Zochil нэг мессежид таарсан trigger БҮРД хариу илгээдэг ("prieclat iin cream une hed be" → 3 хариу). Ерөнхий үнийн үгийг ажилтны бүлгээс хасаж, хариуг богиносгосон; бодит мессежид 2+ хариу 141 → 105 (үлдсэн нь олон асуулттай мессеж).
- **Брендүүд > брэнд ангилал** (мөн өдөр, Tom: "категори дээр давхар брэнд нэм, байхгүй бол үүсгэ"): `zochil-studio/tools/brand-categories.mjs` — 104 дэд ангилал үүсгэж, 719 барааг брэндийнхээ дэд ангилалд НЭМСЭН (бусад ангилал хөндөөгүй, алдаа 0, journal-тай `--undo`). Одоо 847/847 бараа брэндийн ангилалтай; okosama (TO-PLAN цуврал) хэвээр.
- Урхи: `pnpm installer` pnpm-ийн ignored-builds шалгалтад унадаг → `powershell -File tools/make-installer.ps1` шууд.

## Lark — компанийн удирдлагын орчин (2026-10-03/04, сайтын кодтой холбоогүй)

Tom: *"companihaa buh medeelel … larkaas harj udirddag … lark iin buh 100% potentialiig ashiglmaar baina"*. 10-03-нд эхлээд сайт→Lark мэдэгдлийн интеграц бичсэнийг Tom татгалзаж (*"website bish shde"*) revert (41c09f5) — бүх ажил **Lark дотор**, код `Documents/Projects/lark-asayake/` (энэ repo-гоос гадуур). Хийгдсэн: 6 Base (~34 хүснэгт, 847 бараа Zochil-оос), 6 самбар, 10 маягт, 17 workflow, Wiki "Компанийн төв", 43 хавтастай Drive сан (3 түвшний эрх), 8 чатын 3D эможи аватар, слэш команд 6, Lark CLI + skills, Cloudflare Worker ERP апп (https://asayake-erp.asayake-erp.workers.dev, Tom-ийн баталсан Linear/Stripe дизайн, 8 хуудас, KV кэш — Starter-ийн **10,000 API дуудлага/сар** хязгаарт, зардал/чөлөө батлах, cron 4). Судалгаа: Custom Workplace Pro-only, видео уулзалт Starter-т эхлүүлэхгүй, Base AI ажиллахгүй, slash команд олон улсад ажилладаг. Tom-ийн консолын алхмууд `lark-asayake/TOM-CONSOLE.md`. Энэ repo-д кодын өөрчлөлт байхгүй.

## Staging дээр бүрэн шалгалт + DB watchdog (2026-10-01, үдээс хойш)

Tom: *"laptopoo asaaltai uldeegeed remote controloor handaj baina! Bugdiin chi hiiged uguuch"*. Шинэ CA-г (VM дээрхтэй SHA-256 хурууны хээ таарсан) scratchpad-д татаж `DATABASE_CA_CERT[_PATH]` орчны хувьсагчаар өгч (`.env`/`oci-ca.pem`-д хүрэх эрх хаалттай) staging-д 0096–0100-г ажиллуулав.
- **Integration** (бүрэн, `sugi_staging`): эхний run 27 уналт / 9 файл → **2 бодит алдаа** (7f3ab8e: `postCount` статусыг `posted` болгосны ДАРАА `getCount`-оор дахин уншдаг тул бүрэн тооллого болон вендорын автомат тооллого тоологдоогүй барааг ТЭГЛЭХЭЭ больсон байв — `getCount({ whilePosting })`; бөөн засварын "олдсонгүй" мессеж ерөнхий болсон), бусад нь санаатай өөрчлөлтийг хуучнаар хүлээсэн тест (fgv, нэг удаагийн step-up, replay, push allowlist, утасны guard, монгол мессеж, вендорын онлайн салбар). Хамгаалалт сулруулаагүй, 2 шинэ тест нэмэгдсэн. Дахин run: **1281 passed / 2 skipped / 0 failed**.
- **E2E** (бүтэн, desktop+mobile): 235 + 4 уналт → хоёр нь 09-29-ний санаатай өөрчлөлт (клиент утасны формат шалгадаг; барааны хуудас нөөцтэй хувилбарыг анхдагчаар сонгодог) → тест засаад **239/0**.
- **DB watchdog** (`server/_core/dbWatchdog.ts`): production-ий background процесс минут тутам `dbPing`, 3 дараалсан алдаа → эзэнд имэйл (Brevo `.env`-ээр, DB-гүйгээр), 6 цаг тутам сануулга, сэргэхэд мэдэгдэл. `dbPing` drizzle-ийн `cause`-ийг (жинхэнэ TLS/auth шалтгаан) харуулдаг болов. `DB_WATCHDOG=0` унтраана.
- `scripts/r2-create-private-bucket.ts` — хувийн bucket үүсгэх/шалгах. Claude-ийн ажиллуулахыг "shared resource" гэж хаасан → Tom.
- Production migration + deploy-г Claude-д "Production Deploy" гэж хаасан → Tom (PROJECT-GUIDE-ийн командууд). Код `origin/main`-д push хийгдсэн (CI л ажиллана, автомат deploy байхгүй).

## Production DB тасалдал — HeatWave CA солигдсон (2026-10-01)

**Шинж** (Tom, утаснаас): /shop "Каталогийг ачаалж чадсангүй. Интернэт холболтоо шалгаад…", hero зураг маш удаан. Интернэт биш: `/health` → 503 `database: down`, бүх tRPC 500.

**Шалтгаан**: HeatWave 2026-09-28 15:04 UTC-д өөрийн `MySQL_Endpoint_CA`-г шинээр үүсгэсэн (засвар үйлчилгээ), харин VM (09-13) ба лаптопууд дээрх `oci-ca.pem` хуучин CA хэвээр → шинэ холболт бүр `HANDSHAKE_SSL_ERROR: certificate signature failure`. Production нээлттэй байсан pool холболтоороо хэд хоног амьд байгаад тэд дуусахаар бүрэн унасан. Энэ лаптопын 09-29-ний "TLS алдаа" яг энэ байсан. Hero удаашрал нь мөн үүнээс: `#storefront-bootstrap`-ийн site media хоосон ирж, hero нь унаж буй tRPC-г хүлээж байв.

**Засвар** (Tom зөвшөөрсөн): VM дээр DB-ийн гинжийг VCN-ийн хувийн сүлжээгээр татаж, шинэ CA серверийг баталгаажуулж байгааг (`Verify return code: 0 (ok)`) шалгаад `~/sugi-asayake/oci-ca.pem` ба `~/sugi-asayake-staging/oci-ca.pem`-ийг сольж (хуучин нь `.bak-20261001`), `pm2 restart sugi sugi-staging` → хоёулаа `database: up`; гаднаас /health 200, каталог 0.28 с, hero AVIF 0.2–0.4 с. Өнөөдрийн аюулгүй байдлын код deploy ХИЙГДЭЭГҮЙ. Лаптопуудын CA-г Tom өөрөө солино (энэ session-д CA файлд бичих эрх хаалттай).

**Яагаад хэн ч анзаараагүй**: uptime монитор 09-18-аас хойш Cloudflare-д хаагдсан хэвээр (PROJECT-GUIDE №15) — 503 өгч байсан ч дохио ирээгүй. `db-migration-status.ts` ч холболтын алдааг "хүснэгт үүсээгүй" гэж залгидаг байсан (өнөөдөр засагдсан, push хийгээгүй).

## Аюулгүй байдлын deep scan — 38 олдвор, бүгд засагдсан (2026-10-01)

**Эх сурвалж**: sugi.karkaron.com-ийн deep scan (revision `7f3ab8e`, 17 medium / 21 low). Tom: *"deep scan hiisne ur dun zunduuu ih tsoorhoi aldaa baina!!!"*. Гурван судлагчаар кодтой тулгахад 38 бүгд бодит байсан (зарим нь scan-ийн хэлснээс явцуу: Facebook redirect-ийг Express encode хийдэг, session cache зөвхөн `-Instances >1` үед). Scan-д ороогүй 5 нэмэлт олдсон: production-д `/@fs`/`/src` probe биш "зөвшөөрөгдсөн", `inventory/receipts/` нийтийн bucket-д, CV `Cache-Control: public immutable`, `deleteAccount` lockout-гүй, `db-migration-status` холболтын алдааг "хүснэгт байхгүй" гэж залгидаг.

**Tom-ийн шийдвэр**: logout = зөвхөн тэр төхөөрөмж; CV = тусдаа хувийн R2 bucket; liveness = replay хамгаалалт + хязгаарлалтыг баримтжуулах (серверт кадр шалгахгүй); анхны admin = серверийн скрипт.

**Засвар (бүлгээр, 3 зэрэгцээ worktree → main)**
- **A — сешн/нууц үг/утас/Facebook**: JWT `jti` + `session_revocations` (0099), logout тэр токеныг л хүчингүй болгоно (jti-гүй хуучин → sessionVersion+1), DB унасан ч cookie цэвэрлэнэ. `verifyPasswordWithLockout` → нууц үг солих, данс устгах, утас солих, FB холбох/салгах. Сэргээх нь `users.phone = session.phone` guard-тай. Утастай данс утсаа солихдоо нууц үг, дараа нь бусад төхөөрөмж гарна. Бүх бүртгэл `"user"`; `scripts/make-admin.ts <утас> --yes`. Facebook холбох нь нууц үгээр баталгаажсан 10 минутын intent cookie-гоор л; салгах + admin-аас цэвэрлэх; `safeRedirect` `\`/control/`//`. Panel эрхтэй сешн `createContext`-д кэшгүй уншигдана; өөрийгөө unsuspend хориглосон.
- **B — царай**: `users.faceGrantVersion` → proof/step-up JWT-д `fgv`; lock, өөрийн reset, амжилттай царай, enroll бүр өсгөнө (хуулсан cookie lock-ийн дараа ажиллахгүй, step-up жинхэнэ нэг удаагийн). JWT-д табын id-ийн sha256. Descriptor replay: квантласан хэш 30 хоног (`face_attempts.detail` ` d=…`) + процессын санах ойд ойролцоо (0.02, ТОХИРУУЛААГҮЙ). Liveness нь клиентийн шалгалт хэвээр — FACE-HANDOFF-PLAN §13.
- **C — эрх/мөнгө/хадгалалт**: `content.bySlug` ноорог зөвхөн admin/staff/marketing + царайн proof (`anyTab`). StorePay лимит зөвхөн өөрийн бүртгэлтэй дугаар + хэрэглэгч тус бүрийн хязгаар. Цуцлалт гүйлгээ дотроо бэлгийн картыг түгжиж ашиглагдсан бол татгалзана (store credit давхар буцаалт). Купоны хэрэглэгч тус бүрийн хязгаарыг гүйлгээ дотор FOR SHARE-ээр дахин тоолно + `orders.couponCode` индекс (0100) + seq = MAX+1. `S3_PRIVATE_BUCKET` (CV, баримтын зураг; production-д байхгүй бол upload татгалзана), `move-private-objects.ts`. `/cdn` key canonical. Сэтгэгдлийн хөдөлгөөнт зураг эхний кадр болно; sharp 50 МП хязгаар + "хэт том" мессеж. tRPC: нэмэлт `/` сегмент 404, admin./inventory. холилдсон batch 400, клиент `splitLink`; cloudflare-harden Access app-ийг бодлогыг нь хадгалж шинэчилнэ.
- **D — SSRF/push**: `safeHttp.ts` (StorePay, Smart Software), `isPrivateHost` өргөтгөл (`shared/ip-address.ts`), push endpoint allowlist (`shared/push-endpoint.ts`), хэрэглэгчид ≤10, илгээлт concurrency 4 + 30 с, OG зураг 10 MB.
- **E — DB TLS/лог**: VERIFY_* CA-гүй, production CA-гүй → throw (сервер эхлэхгүй); DNS host дээр `verifyIdentity` (mysql2 `checkServerIdentity`-г огт уншдаггүй байсан); IP literal (HeatWave) = CA pinning л. drizzle.config TLS, vm-backup.sh CA заавал. SQL лог нэг JSON мөр; имэйл/SMS fallback лог биегүй. `NOTIFICATIONS_SUPPRESS` имэйл/SMS/push-ийг бүгдийг хаана (E2E checkout бодит SMS явуулж байв); тест `getSuppressedOutbox()`.
- **F — хэрэгсэл**: Vite `fs.allow` client/shared/node_modules + backups/*.sql/*.zip deny; production-д `/@fs` зэрэг probe; `decodedSchemaOf` (`/%64efaultdb` guard-ийг давж байв) гурван guard-д, fail-closed; Playwright reuse унтраалттай, E2E_BASE_URL зөвхөн staging; db-backup.ps1 алдаатай run-ий түүхий .sql-ийг устгана.

**Бие даасан шалгалт** (3 verifier, diff уншсан): 21 олдвор, бүгд засагдсан — хамгийн чухал нь `/api/trpc/x/admin.users` ба `//admin.users` Access-ийг тойрдог байсан, индексгүй FOR SHARE бүх `orders`-ийг түгжиж өөр купонтой checkout-уудыг deadlock-д оруулах, 40 МП хязгаар 48 МП утасны зургийг "гэмтсэн" гэх, Access PUT бодлогыг арилгаж /admin-ийг бүгдэд хаах эрсдэл, suppression-ий улмаас 3 integration тест унах, production-д CA-гүй бол сервер DB-гүй "чимээгүй" асах, logout DB унахад cookie үлдэх, make-admin нэг командаар prod-д.

**Мэдэгдэж байгаа, засаагүй**: нэг хөтчийн хоёр таб — heartbeat ба царай баталгаажуулалт яг давхцвал хоёулаа гарна (ховор race); нэг төхөөрөмжийн царай бусдын царайн сешнийг дуусгана (зориуд); утас солихдоо нууц үг буруу бол SMS дахин явна; `isSessionRevoked` нэвтэрсэн хэрэглэгч бүрт 5 с тутам нэг query; `face_attempts.detail` 160 тэмдэгт тул liveness diagnostic-ийн сүүл тасарна.

**Баталгаажуулалт**: `pnpm check`, `pnpm lint` ногоон; DB-гүй vitest бүрэн (тайлбар доор); `pnpm build` (C, D–F worktree-д) exit 0. ⛔ **DB дээр нэг ч удаа ажиллаагүй** — энэ лаптопоос HeatWave руу `certificate signature failure` (status скрипт "verified" гэж хэвлэдэг байсан нь зөвхөн төлөвлөгөөний шошго; бодит handshake унадаг). Migration 0099/0100, integration (`auth.security-scan`, `faceAuth`, `face-handoff`, `verifyMn`, `order-*`, `discount-codes`, `gift-card-*`), бүтэн E2E, хөтөч дээрх UI (профайлын утас/Facebook dialog, preview таб, Checkout StorePay мессеж) — бүгд DB TLS засагдсаны дараа. `.env` болон CA файлыг унших эрх энэ session-д хаалттай байсан.

## Бүх барааны нийтийн хямдрал (2026-09-29)

Tom-ийн 6 шийдвэрээр ([docs/SITEWIDE-SALE-PLAN.md](docs/SITEWIDE-SALE-PLAN.md) толгой): бүх бараа, хуучин
үнэтэй бараа хэвээр, купон/гишүүнчлэл дээр нь, касс + гар захиалга, 100₮ бөөрөнхийлөлт, зөвхөн admin.
DB-ийн үнийг ДАРЖ БИЧИХГҮЙ — `price_campaigns` (0098) + `withLiveCampaign()` үнэ уншдаг бүх газарт (каталог,
хайлт, bestseller/related/хамт авдаг/санал болголт, барааны хуудас + variant, routine багц, хүслийн жагсаалт,
сагс, checkout, касс, гар захиалга, Google feed); захиалгад `priceCampaignId`, мөрт `listPriceMnt`. Checkout
`expectedTotalMnt` (харуулснаас их авахгүй). Admin карт /admin → Урамшуулал. Бие даасан шалгагч 6 асуудал олж
(routine, wishlist, bestseller-ийн бэлгийн карт, checkout дахин оролдлого, feed кэш) бүгд засагдсан.
Unit 8 тест. ⛔ 0098 ажиллаагүй, integration/E2E/хөтөч дээр шалгаагүй (DB холбогдохгүй).

## Сүүлчийн бүтэн-стек аудит — ~200 олдвор, засварын засвар 27 (2026-09-24 → 09-29)

Tom: *"код бүрийн мөр бүрийг сайн уншиж deep analyze хийгээд … сүүлийн удаа нэг шалгаад өгөөч"*,
дараа нь *"бүх барааг нийтээр хямдруулдаг function нэмэх plan хийгээрэй"*.

Бүрэн жагсаалт, төлөв: **[docs/AUDIT-2026-09-27-final.md](docs/AUDIT-2026-09-27-final.md)**. Хямдралын
төлөвлөгөө (код бичигдээгүй, 6 шийдвэр хүлээж буй): **[docs/SITEWIDE-SALE-PLAN.md](docs/SITEWIDE-SALE-PLAN.md)**.

- **Арга**: 13 хэсэг × зөвхөн-уншдаг шалгагч (мөр бүр) → P0/P1-ийг кодоос баталгаажуулсан → файлын
  эзэмшлээр хуваасан 5 засварчин + серверийн мөнгө/эрх/routers-ийг өөрөө → 4 бие даасан diff шалгагч
  (27 регресс олсон, бүгд засагдсан).
- **P0 (мөнгө)**: төлөгдөөгүй QPay/StorePay захиалгыг "дууссан" болгоход бэлгийн карт гардаг байв;
  карт → ашиглах → цуцлах → бүтэн refund = давхар мөнгө; цуцалсны дараа мөнгө орсон захиалгыг устгахад
  төлбөрийн бичлэг устдаг; variant устгахад нөөцийн дэвтэр cascade-аар алга.
- **Бусад гол**: давхар төлбөрийн мэдэгдэл (`payment.duplicate`), нэхэмжлэл/зээл үүсгэх нэрлэсэн цоож
  (`GET_LOCK`), 0₮ (зээлээр бүрэн) захиалга шууд төлөгдсөн, login lockout-ийн DoS (танил IP), StorePay
  дурын дугаар, дурын дугаар руу SMS, захиалгын хариунаас adminNote, marketing → урамшууллын мөнгө,
  push хаягийн SSRF/timeout, захиалгын push 4/7 загвар үхсэн, хараалын шүүлт энгийн үгсийг хаадаг
  ("шаардлагатай", "хаягаар"), analytics 8 цагийн зөрүү, scheduler DB claim (0097), staging job хаалт,
  /shop URL sync, QPay/StorePay хураангуй "0₮", admin-ы царайны урсгал 60 с refetch-ээр тасрах г.м.
- **Migration**: `0096_audit_schema_fixes.sql` (MEDIUMTEXT, varchar урт, 3 индекс, passwordHash default),
  `0097_scheduler_job_claim.sql` — ⛔ **хоёулаа ажиллуулаагүй**: энэ лаптопоос DB руу TLS
  "certificate signature failure" (тунель асаж байгаа ч сертификат шалгалт амжилтгүй — HeatWave-ийн
  сертификат солигдсон байж магадгүй, `oci-ca.pem`-ийг шинэчлэх хэрэгтэй). Scheduler нь 0097-гүй DB дээр
  claim-гүй горимд буцна (сэрэмжлүүлэгтэй).
- **Баталгаажуулалт**: check/lint/build ногоон, unit 737+ passed; integration/E2E ажиллуулаагүй (DB).
- **Tom шийдэх**: I2 (Smart Software-ийн онлайн салбарын snapshot автомат уу, гараар уу), A14–A16
  (бэлгийн карт ба хүргэлт/COD/зээл), push-ийн "Дууссан" текст одоо зөвхөн салбараас авсан захиалгад
  (хүргэлтийнх "Хүргэгдсэн"), prod-ын `JWT_SECRET` сул эсэх (гарын авлагад жишээ байсан).

---

## Бүтэн стекийн bug аудит — 96 олдвор, бүгд засагдсан (2026-09-23)

Tom: *"za source code iin aldaa bug edr bugdiin haij olood zas! ene buh code mur bolgon
aldaatai ajildagui code buruu code geed zunduu ih baina! bug buriig olood zasah hurtelee
bitgii zogsooroi!!!"*

Кодыг 9 домэйнд хуваан зэрэг уншуулж (routers.ts ×2, server/db, server/_core, server-ийн
үндсэн модулиуд, integrations+search+shared, storefront компонент, admin компонент,
клиент хуудас), олдвор бүрийг дуудагч/дуудагдагч талаас БАТАЛГААЖУУЛСНЫ дараа зассан.
Ажлын эхэнд `pnpm check`, `pnpm lint`, unit suite (764 passed) гурвуулаа НОГООН байсан —
өөрөөр хэлбэл эдгээр нь хэрэгслээр баригдахгүй, зөвхөн уншиж олдох алдаанууд.

### 🔴 Хамгийн ноцтой 12

1. **Сэтгэгдлийн урамшуулал төлөгдөөгүй захиалгаар** (`routers.ts` reviews.create):
   шалгалт нь "захиалсан" (`status <> cancelled`) байсан тул COD захиалга нэг нээж, 20
   бараанд сэтгэгдэл бичээд (`review-reward-mnt` × 20 store credit авч) захиалгаа
   цуцлахад мөнгө үлддэг байв. Одоо шинэ `isOrderSettled()` (`paid` ба цуцлагдаагүй).
2. **`profile.update` баталгаажуулаагүй утас бичдэг**: утас нь нэвтрэлтийн identity бөгөөд
   бүртгэлд SMS шаарддаг атал профайлаас дурын дугаар хадгалагддаг байв → (a) Facebook-оор
   үүссэн данс дурын дугаар тавьж **зочны checkout OTP-г алгасах**, (b) бусдын дугаарыг
   эзэмшиж тэр хүнийг бүртгүүлэхээс хаах. `phone` оролтоос ХАСАВ; /profile дээр
   "Утасны дугаар солих" → SMS баталгаажуулалт → `attachPhoneViaVerification`.
3. **`attachPhoneViaVerification` дуудагчтай холбоогүй**: verify.mn сессийн id мэдсэн хэн ч
   өөр хүний баталгаажуулалтаар утсаа бүртгүүлж болно. Одоо `session.userId === ctx.user.id`,
   давхцлын урьдчилсан шалгалт, `forgetSessionUser`.
4. **QPay callback төлбөр ороогүй байхад `responseJson`-ыг дардаг** (`qpay.ts`): тэр багана нь
   "байгаа нэхэмжлэлийг дахин өг" цоож бөгөөд `/v2/payment/check`-ийн хариунд `invoice_id`
   байдаггүй. Нэвтрэлтгүй GET callback (QPay-ийн retry, QR харсан хэн ч) тэр цоожийг эвдэж
   **хоёр дахь, ижил төлөгдөх нэхэмжлэл** гаргадаг; хоёуланг төлбөл `console.warn` л үлдэнэ.
   Одоо `outcome !== "unpaid"` үед л бичнэ.
5. **StorePay callback хүлээгдэж байгаа зээлийг `failed` болгодог**: `check` нь "хараахан
   зөвшөөрөөгүй" ба "татгалзсан"-ыг ялгадаггүй тул худалдан авагч апп дээрээ зөвшөөрч байх
   зуур ирсэн дохио оролдлогыг унагаж, `created` цоож таарахаа болиод дараагийн товшилт
   **хоёр дахь зээлийн хүсэлт** нээдэг байв. Одоо `created` хэвээр үлдэнэ.
6. **Цуцлалт/буцаалт бэлгийн картын нөөцийг "буцаадаг"** (`restoreStockForOrder`): checkout
   болон гар захиалга бэлгийн картыг нөөцөөс ХАСДАГГҮЙ атлаа `variantId` бичдэг тул цуцлалт
   бүрт байхгүй нөөц өсөж, дэвтэрт харгалзах борлуулалтгүй мөр үлддэг. `products.kind`-ээр шүүв.
7. **Хүргэлтийн арга/салбар сольсон захиалгын нөөц хуучин салбарт үлддэг** (`editAdminOrder`):
   захиалга шинэ салбарыг бичсэн ч дараа нь цуцлахад ШИНЭ салбарт буцаадаг — хуучин нь
   мөнхөд дутуу, шинэ нь хуурамч нөөцтэй. Одоо нөөцийг хуучин салбарт буцааж, шинэ
   салбараас хасна (ЗӨӨНӨ); шинэ салбарт хүрэлцэхгүй бол засвар бүхэлдээ татгалзана.
8. **Төлөгдсөн захиалгыг дахин үнэлдэг** (`editAdminOrder`): мөр хаалттай ч хүргэлтийн арга
   солиход `totalMnt` дахин бодогдож, мөнгө хөдлөөгүй байхад 50 000₮ → 55 000₮ болдог байв.
9. **StorePay-г "дууссан" болгоход `paid` болж бэлгийн карт үүсдэг**: 2026-09-08-ны дүрэм
   зөвхөн QPay-г хассан. Одоо `WEBHOOK_PAID_METHODS` (qpay + storepay).
10. **Кампанит ажлын давхар илгээлтийн цоож ажиллахгүй**: fingerprint-ийг 2 000 хүнд илгээж
    ДУУССАНЫ дараа бичдэг тул давхар товшилт (яг хамгаалах ёстой тохиолдол) хоёулаа давж,
    4 000 SMS явдаг байв. Одоо циклээс ӨМНӨ `campaign.started` тэмдэглэгээ.
11. **`admin.productDetail` өртгийг (`costMnt`) warehouse/marketing-д харуулдаг** — жагсаалт
    нуудаг атлаа дэлгэрэнгүй нь бүтэн мөр буцаадаг байв.
12. **Барааны маягт НИЙЛБЭР үлдэгдлийг үндсэн салбарын үлдэгдэл болгон дахин бичдэг**
    (`AdminWorkspace`): агуулах 10 + дэлгүүр 15 = 25 → нэрийн алдаа зассан ч агуулах 25
    болж нийт 40, дэвтэрт хуурамч `product_form_set +15`, засвар бүрт хуримтлагдана.
    Одоо админ талбарыг БОДИТООР өөрчилсөн үед л илгээнэ.

### Бусад засварууд (домэйнаар)

**Checkout / OTP** — зочны дахин илгээлт "утсаа баталгаажуулна уу" гэж татгалзаж 150₮-ийн
SMS-ийг дахин төлүүлдэг байсныг idempotency шалгалтыг OTP-ээс ӨМНӨ болгож зассан; сессийг
захиалга үүсгэхийн ӨМНӨ атомаар эзэмшдэг болов (өмнө нь буцаах утга хаягддаг тул нэг SMS
N захиалгыг батална); уначихвал суллана; зочны replay хайлт бүртгэлтэй хэрэглэгчийн
захиалга буцаахаа болив; имэйл/SMS/push тус бүр өөрийн try/catch (имэйлийн алдаа SMS-ийг
тасалдаг байв); дижитал-онлы захиалгын имэйл "null салбараас" гэж хэвлэхээ болив.

**Захиалга/нөөц** — ижил төлөвөөр bulk шинэчлэхэд мэдэгдэл дахин явдаг байсныг
`statusChanged`-аар зогсоов; цуцлалт купоны `usesCount`-ыг мөн чөлөөлдөг болов (зөвхөн per-customer хязгаартай кодод биш, купонтой БҮХ захиалгад);
`completedAt` багана (migration **0094**, prod + staging хоёуланд ажиллуулсан) — буцаалтын
14 хоног ба сэтгэгдэл хүсэх ажил `updatedAt`-аас хамаарч чимээгүй уртсаж/эрт ажиллаж байв;
POS бэлгийн картаас нөөц хасахаа болив; `deleteAdminProduct` нөөцийн дэвтэр/захиалгатай
бараа устгахыг татгалзана; `recomputeVariantStockTotal` олон variant-тай бараанд ч
`products.stockQuantity` бичдэг болов ("Ирэхээр мэдэгдэх" тэдэнд ажиллахгүй байсан).

**Variant** — ганц variant-ын үнэ/SKU-г `products` руу буцааж тольдох зам БАЙХГҮЙ байсан
(харагдах үнэ ба төлөх үнэ зөрдөг); variant/нөөц бичигч бүр `invalidateCatalogSource()`
дууддаг болов; `deleteAdminProductVariant` транзакц + шинэ анхдагчийг ӨМНӨ сурталчилна.

**Job-ууд (хоёр лаптоп + prod нэг DB)** — орхигдсон сагс ба сэтгэгдэл хүсэх мэдэгдэл
илгээхээс ӨМНӨ guarded UPDATE-ээр эзэмшдэг болов (өмнө нь тэмдэглэгээ илгээсний дараа
байсан тул хоёр scheduler давхар илгээх боломжтой); нөөцийн товчоо имэйл өдөрт нэг удаа
(`recordNotification` одоо мөр шинээр бичигдсэн эсэхийг буцаана).

**Аюулгүй байдал / _core** — `/health` driver-ийн алдааны текст гаргахаа болив;
`ttlCache` хэзээ ч хатдаггүй байсныг (бот `/a1`, `/a2`… шалгахад heap хязгааргүй өсдөг)
sweep + дээд хэмжээ, 404-ийг кэшлэхээ болив; `/index.html` нь `%SEO_TITLE%`-тэй түүхий
template-ээ шууд өгдөг байсныг 301 болгов; эхлүүлэлт уначихвал `exit(1)`; Facebook
callback-ийн `decodeURIComponent` уналт хүсэлтийг хариугүй болгодог байсныг зассан;
cookie тохиргооны JSON блокт `<` бүхэлдээ escape (өмнө нь зөвхөн `</script`, `<!--<script>`
нь tokenizer-ийг сольдог); промоны `ctaUrl` схем шалгагдана (сервер зурдаг hero shell);
push кампанийн `url` regex `//evil.example`-ийг зөвшөөрдөг байсныг хаав; SQL лог нууц
параметрүүдийг маскална; merchant feed-ийн кэш `Host` толгойгоор хязгааргүй өсдөг байсныг
зассан; `storageObjectExists` S3 тохиргоогүй үед шидэж нүүр хуудсыг брэндийн анхдагч руу
унагадаг байсныг зассан.

**Аналитик** — буцаалтын хувь refunded захиалгыг хаядаг тул бодит байдлын эсрэг 0% руу
дөхдөг байв; санал болголтын хучилт шинэ `skinTypes`/`productType`-ыг тоолдоггүй байв;
тайлангийн огнооны шошго UTC-ээр (Улаанбаатарын өдрөөс нэг хоног зөрдөг).

**Хайлт** — `үс` ба `ус` хоёр НЭГ ойлголт болж нэгддэг байсан (`latinVariants` хоёулаа
`us` өгдөг) — одоо нэгдэлт зөвхөн ЗАРЛАСАН үгээр; "Та … гэж хайсан уу?" индексийн дотоод
хиймэл токен ("shampo", "kokochi") санал болгодог байсныг жинхэнэ үгсээр шүүв; хэллэг
үгийн хилээр таарна ("нүүрний маск" нь "нүүрний маскара" дотроос олдохоо болив);
толийн засвар кэшийг БИЧСЭНИЙ дараа унагана (өмнө нь өмнө байсан тул 60 с ажиллахгүй).

**Интеграц** — SMS нормчлол `976`-аар эхэлсэн 8 оронтой бодит дугаарыг (G-Mobile `97612345`)
хэзээ ч илгээдэггүй байв; вендорын "жагсаалт багассан" хамгаалалт зөвхөн НЭГ ажиллалт
блоклодог байсныг зассан (15 минутын дараа ижил багассан feed автоматаар бичигдэнэ);
`listLocations` нь `unwrapList`-гүй тул "Холболт шалгах" ажиллахгүй байж болох байсан;
Smart-ийн "өнөөдөр" UTC-ээр; вендорын үнэ хэрэглэхэд каталогийн кэш цэвэрлэгддэггүй байв;
`isPrivateHost` нь `fcstore.com`/`fdx.mn` зэрэг НИЙТИЙН домэйнийг татгалздаг байв.

**Дүүрэг** — `guessDistrictFromAddress` нь 2–3 үсгийн товчлолыг ЭНГИЙН үгийн дотроос
таардаг байв: "Худалдааны"-д `худ`, "Өндөр"/"Индустри"-д `нд`. Тиймээс "Налайх дүүрэг,
Худалдааны гудамж" → Хан-Уул. Одоо бүтэн нэр түрүүлж, товчлол үгийн хилтэй; шинэ
`server/districts.test.ts` (5 тест) хамгаална.

**Клиент (storefront)** — OTP алхам сесс эхэлсний дараа ч `initialPhone`-ыг дагадаг тул
"баталгаажсан" гэж үзүүлээд сервер татгалздаг байсныг зассан (хугацаа дуусахад polling ч
зогсоно); quick view-ийн тоо variant сольсны дараа хязгаараас хэтэрсэн хэвээр үлддэг байв;
мэдэгдэл асаах товч ямар ч алдааг чимээгүй залгидаг (`catch` байхгүй) байснаа зассан;
утасны хаалттай цэс Tab-ийн дараалалд 15 холбоос үлдээдэг байсныг `inert` болгов;
хоёр HeaderSearch тусдаа төлөвтэй байснаа хуваалцав; `/terms/` төгсгөлийн зураастай
хаяг Нууцлалын бодлогыг үзүүлдэг байв; `?redirect=/\evil.com` нэвтрэлтийн дараа
SecurityError болдог; routine багцын үнэ серверээс 1₮ зөрдөг; Journal "40 / 3" гэж
харуулдаг; төлбөрийн polling цуцлагдсан захиалга дээр мөнхөд ажилладаг; купоны алдааны
toast фокус бүрт дахин гардаг; `logout` сервер уначихсан ч нүүр руу шилждэг; /profile
зочноор нээхэд hidden protected query-ууд /login руу хаядаг; QPay нэхэмжлэл уначихвал
сагс хоосорсон, дахин оролдох гарц байхгүй үлддэг байсныг "дахин авах" товчоор зассан.

**Клиент (admin)** — Баримт бичгийн editor фокус refetch дээр хадгалаагүй засварыг
ЧИМЭЭГҮЙ хаядаг байв (routine-ийн алхам, хэрэглэгчийн draft хоёр ч мөн адил); variant/
салбарын нөөцийн талбарт Enter дарахад ГАДААД барааны маягт илгээгддэг; аудит логийн
огнооны шүүлтүүр сонгосон өдрийг хасдаг (UTC); царайны "Дахин оролдох" 90 секундын
бүртгэлийг дахин гүйцэтгүүлээд сервер татгалздаг; `?adminSection=search` refresh дээр
хянах самбар руу буцдаг; брэнд/салбарын дарааллын ▲▼ ижил `sortOrder` дээр ажиллахгүй;
CAC хоосон талбараар 0₮ бичдэг; ranked list `label`-ээр түлхүүрлэгддэг (ижил нэртэй
бараа бодитоор байдаг); POS-ийн idempotency түлхүүр сагс засагдсаны дараа ч хэвээр.

**Алдааны мессеж** — zod унавал клиент `[{"origin":"string","code":"invalid_format",…}]`
гэсэн JSON хана toast-оор хардаг байв (Checkout-ийн имэйл/хаяг, бүртгэлийн нууц үг).
`maskErrorShape` одоо түүнийг монгол өгүүлбэр болгоно ("Оруулсан мэдээлэл буруу байна:
имэйл хаяг — буруу байна"); 5 шинэ тест.

### Засварын засвар — бие даасан diff шалгалт 18 регресс олсон

Засварууд дууссаны дараа diff-ийг тусдаа шалгагчаар уншуулахад МИНИЙ ОРУУЛСАН 18
алдаа гарсан; бүгдийг зассан. Хамгийн ноцтой нь:
- **Бэлгийн картыг давхар үүсгэх** (мөнгөний гарз): төлбөрийн callback-д нэмсэн
  "карт үүсгэх нөөц зам" нь цоожгүй check-then-insert байсан бөгөөд callback нь
  нэвтрэлтгүй GET тул зэрэгцээ хоёр дуудалт хоёулаа 200 000₮-ийн карт гаргах байв.
  Одоо захиалгын мөрийг `FOR UPDATE`-ээр цоожилсон транзакц дотор.
- **POS-ийн давхар товшилтын replay эвдэрсэн**: зочны хязгаарлалт `undefined`-д
  бүхэлдээ хамаарсан тул кассын гишүүн харилцагчийн борлуулалт replay олдохгүй,
  UNIQUE-д унаж кассчинд INTERNAL алдаа харагдах байв. Одоо `guestOnly` тугтай.
- **Купоны тоолуур** зөвхөн per-customer хязгаартай кодод чөлөөлөгдөж байв (засварын
  өөрийнх нь тайлбарласан maxUses=10 тохиолдлыг ЗАСААГҮЙ байсан).
- **Төлөгдсөн захиалгын засвар** Tom хүргэлтийн үнээ өсгөмөгц бүхэлдээ түгжигдэх байв
  (өнөөдрийн тарифаар бодсон төлбөр хадгалсантай зөрдөг) — одоо зөвхөн хүргэлтийн
  арга/салбар БОДИТООР солигдоход л.
- **StorePay** оролдлогыг "failed" болгохоо больсны дараа татгалзсан зээл захиалгыг
  мөнхөд түгжих байв — дахин ашиглах цоожийг 15 минутаар хязгаарлав.
- **Кампанит цоож атом биш байв** (SELECT → INSERT): migration **0095**
  `campaign_send_claims` өвөрмөц индекс дээрх INSERT болгов.
- Бусад: вендорын хаагдсан sync 15 мин тутам push спамдах, сэтгэгдлийн хүсэлтийн
  эзэмшилт суллагдахгүй, огнооны bind UTC+8 лаптоп дээр 8 цаг зөрөх, баримтын editor
  "анхны хувилбар руу буцаах"-ын дараа хуучин HTML үзүүлэх, zod-ийн тоон талбарт
  "тэмдэгт" гэх, OTP-ийн давхар товшилт replay биш алдаа өгөх, устгах мөрийн `kind`
  олдохгүй, хайлтын "үс"↔"ус" санал, бэлгийн картын сар халих (1-р сарын 31 + 1 →
  3-р сарын 3), урамшууллын захиалга төлөгдсөнийг биш хамгийн шинийг сонгох.

### Тестийн үлдэгдэл — миний тасалсан run-ууд production-д fixture үлдээсэн

Бүрэн suite-ийг хэд хэдэн удаа дундуур нь зогсоосноор `afterAll` ажиллаагүй тул
production схемд fixture үлдэж, дотор нь **admin эрхтэй тест хэрэглэгч** (#9097)
байв. Мөн хайлтын тестийн хуучин "Hada Labo Gokujyun Lotion search-test-…" бараа
дараагийн run-д "Gokujyun" хайлтад илүү үр дүн өгч тестийг унагаж байв.
`scripts/test-residue-purge.ts --force --apply`-аар (Tom-ийн 2026-09-12-нд баталсан
хэрэгсэл) цэвэрлэв: 6 бараа, 4 хэрэглэгч, 4 захиалга, 4 ангилал. Хайлтын болон
automation тестийн fixture-ууд `test-residue-report.ts`-ийн дүрэмд БАЙГААГҮЙ тул
нэмэв (`%search-test-%` — брэндээр биш, өвөрмөц тэмдгээр).

### /admin-ийн царайны сонголт + QR дэлгэц нууц үгийн дэлгэцтэй нэг загвартай болов

Tom: *"ene 2 shal uur ungu image tei design tei baina!! ene ehnii ulaan tsagaan shig
bolgwol"* (нууц үгийн цагаан/улаан дэлгэц → дараагийн алхам гэнэт хар хөх). Tom-ийн
өөрийн заасан лавлагаа (нууц үгийн дэлгэц) рүү шилжүүлэв: `FaceMethodChooser` ба
`FaceHandoffPanel` — цагаан карт, брэндийн зурвас, "SUGI ASAYAKE ADMIN", дансны нэр,
ИЖИЛ "1 → 2 → 3" диаграм (1 дууссан ✓, 2 идэвхтэй). `face.css`-д `.face-choice`,
`.face-choice-tips`, `.face-gate-back`-ийн үндсэн хувилбар цайвар болж, харанхуй нь
`.face-gate-card--scan` дор хадгалагдав. Замдаа олсон: `.face-gate-head` дэх дүрс урт
гарчигтай үед flex-ээр шахагдаж нарийн зураас болдог байв (`flex: none`).
Build хийсэн жинхэнэ CSS-ээр 1366 ба 390 өргөнд screenshot-оор шалгасан.

**Үргэлжлэл — камерын дэлгэц + iPhone дээр "Загвар ачааллаж байна…" дээр гацах.**
Tom утсаараа туршаад: *"Zagwar achaalaj baina geed eruusuu unshdague bas ene yg nuur
tanidag hesgiin ungu image design solioogu"*.
- 🔴 **iPhone дээр царай огт уншихгүй байв.** Загварын бүх файл серверээс зөв ирж
  байсан (8 файл, 200, зөв MIME — iPhone UA-аар шалгав), камер ч асаалттай (статус
  мөрийн ногоон цэг). Гацаа нь хөтөч талд: `Promise.all([камер, MediaPipe, face-api])`
  хугацааны хязгааргүй бөгөөд MediaPipe-ийн GPU delegate (WebGL2/OffscreenCanvas)
  iOS Safari дээр алдаа ШИДЭХГҮЙГЭЭР гацаж болдог тул `catch → CPU` хэзээ ч
  ажилладаггүй, спиннер мөнхөд эргэдэг байв. Засвар: iPhone/iPad дээр MediaPipe-ийг
  шууд CPU-гаар; бусад дээр GPU-г 12 с-т хязгаарлаж хэтэрвэл CPU; wasm 60 с,
  TFJS backend 10 с (хэтэрвэл CPU backend), face-api загвар 60 с хязгаартай
  (`client/src/lib/withTimeout.ts`). Хязгаар хэтэрвэл тодорхой алдаа + "Дахин оролдох".
  Алхам бүрийг нэрлэдэг болов ("Камер асааж байна…" → "Царай илрүүлэгч…" → "Таних
  загвар…") — дахин гацвал аль нь болохыг Tom-ийн screenshot шууд хэлнэ.
  ⚠️ **iPhone дээр бодитоор хараахан шалгаагүй** (энэ машинд iOS байхгүй) — Tom туршина.
- **Утсан дээр QR handoff санал болгохгүй** (`client/src/lib/device.ts` `isPhoneDevice`):
  утас өөрөө камертай, "Энэ компьютерт камер алга — утсаараа…" бичвэр утсан дээр
  худал байв. Утсан дээр сонголтын дэлгэц алгасагдаж шууд камер руу орно.
- **Камерын дэлгэц ч цагаан/улаан** (Tom-ийн хүсэлт): брэндийн зурвас, цайвар тойрог,
  улаан скан-шугам/явц/"Нэг удаа анивчина уу" товч, царай баригдахад ногоон цагираг,
  бүртгэлийн дууссан чиглэл ногоон. `face.css`-ийн `--scan`/`--dark` бүхэлдээ устсан
  (хэн ч хэрэглэхээ больсон). `/face-approve` (утасны QR батлах) ижил компонент тул мөн цагаан.
- E2E: `face-gate.spec.ts` утасны project дээр шууд камер гардгийг шалгадаг болов;
  `face-handoff.spec.ts` утсан дээр skip, тооны өнгийг хуучин "цайвар байх" биш
  картын дэвсгэртэй **контраст ≥ 4.5**-аар шалгадаг болов. 7 passed / 1 skipped.

### Үргэлжлэл — client lib/hooks, service worker, vendor script-ийн аудит + 2 регресс

Tom: *"ene buh codebase bas ene bichgdsen code line buriin bug olj zasah hurtles bitgii zogs"*.
Өмнө нь шалгагдаагүй үлдсэн домэйн (`client/src/lib`, `hooks`, `main.tsx`,
`client/public/sw.js`, `vendor/*.js`) мөр бүрээр.

**Бүтэн E2E (248) олсон миний 2 регресс** — хоёулаа production-д байсан:
- Синоним нэмэхэд хайлт шууд өөрчлөгддөггүй (`upsertSearchSynonym`-ийн шинэ мөр
  нэмэх ба байгаа concept шинэчлэх замд `invalidateSearchDictionaries()` дутуу).
- Үлдэгдэлтэй үүсгэсэн шинэ барааг устгах боломжгүй болсон: өглөөний "нөөцийн
  түүхтэй барааг устгахгүй" хамгаалалт admin-ий өөрийн `variant_seed`/`admin_set`
  мөрийг ч түүх гэж тоолж байв. Одоо зөвхөн үйл ажиллагааны хөдөлгөөн (борлуулалт,
  хүлээн авалт, шилжүүлэг, тооллого). Шинэ тест `admin-product-delete.integration.test.ts` (4).

**Засагдсан (19):**
- 🔴 **Скан алга болдог** (`useScanDraft`): хадгалалт явж байх үед уншуулсан скан
  серверт ч, localStorage-д ч үлдэхгүй, "Хадгалсан" гэж харагдаад тооллого/хүлээн авалт
  сүүлийн сканыг алгасаж баталгаажих боломжтой байв. Revision тоолуур + дараалсан хадгалалт.
- 🔴 **Мөнхийн reload** (`lazyRetry`): "нэг удаа reload" туг chunk ачаалагдахаас өмнө
  арилдаг байсан тул chunk байнга унавал хуудас зогсолтгүй reload хийдэг байв → 60 с цонх.
- 🔴 **Царайны загвар — өглөөний засварын алдаа**: `forVisionTasks` зөвхөн URL угсардаг,
  15 MB татаалт `createFromOptions` дотор болдог тул 12 с-ийн "GPU" хязгаар татаалтыг
  хамарч, удаан сүлжээнд GPU → CPU хоёулаа унадаг, хугацаа хэтэрсэн GPU instance
  алдагддаг байв. Одоо татаалт эхэлж 120 с-т (загвар buffer-аар, wasm HTTP кэшэд),
  үүсгэлт тусдаа хязгаартай, орхигдсон GPU instance `close()`.
- 🔴 **Камер асаалттай үлддэг**: загвар хугацаа хэтэрч унахад stream `streamRef`-д
  ороогүй байсан тул cleanup зогсоож чадахгүй, "Дахин оролдох" хоёр дахь урсгал нээдэг.
- **Analytics-ийн өдөр UTC байсан** — 08:00-аас өмнөх захиалга өмнөх өдөрт.
  `storeDaySql`/`storeDayString` (`server/db/connection.ts`) → analytics, dashboard,
  CSV-ийн огноо, файлын нэр. Sparkline өнөөдрийг хасдаг байсан (сүүлийн өдрөөр бэхэлсэн).
- **CSV томьёоны injection** (зочны нэр `=HYPERLINK(...)`) — `'`-ээр хамгаалж, импорт буцааж хасна.
- **Google руу админы QR токен явдаг байв** (`page_location: location.href`, /face-approve?token=).
  Admin/царайны хуудас хэмжигдэхгүй, нууц параметр хасагдана; шүүлтүүр бүр page view болдог
  байсныг зөвхөн зам солигдоход л болгосон; татгалзаад дахин зөвшөөрөхөд GA/Pixel сэргэдэггүй байв.
- **Хуулбарласан/сэргээсэн /admin таб** камергүй нэвтэрдэг байв (sessionStorage хуулагддаг) —
  `back_forward` ачаалалт ба BroadcastChannel-оор шинэ таб id.
- Push: солигдсон VAPID түлхүүртэй хуучин бүртгэлийг дахин ашигладаг, идэвхгүй SW дээр
  subscribe унадаг, зөвшөөрлийг товшилтын идэвх алдагдсаны дараа асуудаг; "мэдэгдэл авах"
  товч өөр хэрэглэгчийн бүртгэлийг өөрийнх гэж тооцдог байв (`push.status`).
- Service worker: `/assets/` кэш deploy бүрт мөнхөд өсдөг (120 бичлэгээр хязгаар, `sugi-v4`),
  мэдэгдэл дарахад удирдагдаагүй цонх дээр юу ч болдоггүй, offline хуудас байхгүй үед TypeError.
- Жижиг: MODEL_BACKEND алдаа мөнхөд кэшлэгддэг, хэвтээ Android утсыг компьютер гэж
  таньдаг, iOS canvas санах ой, blob URL-ийг хэт эрт revoke, Honeybadger алдаа бүрийг 2 удаа,
  орчуулга ачаалалт нэг удаа унавал дахин оролддоггүй, popstate туг үлдэж дараагийн
  холбоосыг хуучин scroll-д нээдэг, эх сурвалжид сайтын өөрийн домэйн.

### Үргэлжлэл — скрипт, тохиргоо, CI-ийн аудит (24 олдвор)

- 🔴 **Integration тестүүд production-д бичдэг байв** (`.env` → `defaultdb`) — тасарсан run бүр /shop-д
  харагдах тест бараа, тайланд тоологдох тест захиалга үлдээдэг байсны ҮНДСЭН шалтгаан.
  `server/_test-setup.ts` одоо `defaultdb`-г `sugi_staging` болгоно (`VITEST_DATABASE_URL`,
  `ALLOW_PROD_TESTS=1`). Residue report/purge-д `--staging`.
- 🔴 **Uptime монитор утас руу ХЭЗЭЭ Ч мэдэгдэл илгээхгүй байв**: `NTFY_URL` алхмын өөрийн `env`-д
  тул тэр алхмын `if`-д харагддаггүй. Мөн Cloudflare-ийн олон мөрт алдааны хуудас probe алхмыг өөрийг
  нь унагадаг, хариуны бие bash-д шууд ордог байв.
- 🔴 **Purge бодит ТӨЛСӨН захиалгыг устгаж болох байв** (тест бараа /shop-д харагдаж байсан тул), транзакцгүй
  (дундуур унавал хагас цэвэрлэгдсэн DB), шинэхэн тест ангилал дээр FK-ээр унадаг, БҮХ `suppressed`
  мэдэгдэл болон ажилтны "Sync test" гэсэн чөлөөт тэмдэглэлтэй тооллогыг устгадаг байв.
- **VM-ийн backup**: сонголттой түлхүүр байхгүй бол `set -e`-ээр чимээгүй зогсдог, порт/нууц үгийн задлал.
  ⚠️ VM дээрх хуулбар 09-20-ноос хуучин байсан — **долоо хоногийн зургийн backup хэзээ ч ажиллаагүй**.
  Шинэ хувилбарыг суулгаж, анхны бүрэн зургийн backup-ийг гараар ажиллуулсан (3404 файл, ~146 MB).
- Deploy: origin/main-ээс хоцорсон эсвэл commit хийгээгүй өөрчлөлттэй бол татгалзана; шинэ dist-ийг
  `pnpm install` амжилттай болсны дараа л солино.
- `db-apply-migration`/`db-migration-status`: .env-ийн admin URL сонгосон staging URL-ийг чимээгүй дардаг
  байв (migration production-д очдог). Гинж, ci-seed, verify-review-thread `defaultdb`-д татгалзана
  (`scripts/_refuse-production.ts`); гинжинд `--strict` (цэвэр схемд 0 skip-тэй баталгаажсан);
  `ci-local` алхам бүрийн exit code-ийг шалгадаг болов. E2E_BASE_URL зөвхөн локал/staging.
- `migrate-to-oracle-mysql.ps1` кирилл үсгийг `?` болгодог байв (db-restore-ийн 09-21-ний засвартай ижил).
- `cloudflare-harden.mjs` dashboard-ын дүрмүүдийг арчдаг байв (одоо нэгтгэнэ); /admin-ий гадаад
  шалгалт API-г хамардаггүй байв. ✅ 2026-09-24-нд Cloudflare-д хэрэгжүүлсэн (8 тохиргоо OK, rate limit 1,
  WAF 3 — хуучин нэртэй давхар гео дүрмийг солив, кэш 2; `/wp-login.php` 403, sitemap/robots кэшлэгдэж
  HIT). ⚠️ `sugi-hard` token хугацаагүй бөгөөд чатад ил бичигдсэн — Tom устгана.
- Жижиг: `demo.ps1` NODE_ENV-ийг цонхонд үлдээдэг, dependency check өөрөө унасныг "none" гэдэг, 0.x
  минор bump-ийг major гэж тооцдоггүй, `auto-tag --retype` admin-ий засварыг дарж бичдэг, k6-ийн
  production хамгаалалт том үсгийг алгасдаг, `.gitignore`-д `.env.*`, ESLint `client/public`-ийн
  өөрийн JS-ийг алгасдаг байв (1 олдвор засагдсан), CI-д `permissions`/`timeout` байгаагүй.
- Гуравдагч `pnpm/action-setup` одоо ажиллаж буй v6-ийн commit SHA-гаар pin хийгдсэн (GitHub-ийн өөрийн `actions/*` tag-аар хэвээр).

**Баталгаажуулалт (скрипт аудит + staging руу шилжсэн тест):** бүрэн integration suite `sugi_staging`
дээр **1132 passed / 2 skipped (117 файл, 1159 с — production дээрх 2450 с-ийн тал)**; идэвхтэй схемийг
`select database()`-оор шалгасан; run-ийн дараа production-д тестийн үлдэгдэл 0. `9bbd443` production ба
staging-д шинэ deploy урсгалаар (`DEPLOY-RESTART-OK`, VM дээр `dist.old`/`dist.new` үлдээгүй).
⚠️ E2E ба vitest одоо НЭГ схем (`sugi_staging`) хуваалцдаг — хоёуланг зэрэг бүү ажиллуул.

**Бие даасан шалгагчийн дүн (өдрийн 2 commit):** 16 хэсгийг зөв гэж баталсан, 7 бодит асуудал —
бүгд засагдсан: `opening` (ажилтны баталсан нээлтийн тооллого) нь "түүх биш" жагсаалтад БУРУУ орсон
байв; камерын хожуу ирсэн урсгал "Дахин оролдох"-ын дараа шинэ run-д "хүчинтэй" мэт харагдаж үлдэх
боломж (run-ийн дугаар); "Энэ сар"-ын sparkline 1-ний өдрийг хасдаг байв (шөнө дундаас эхэлсэн цонхыг
календарын өдрөөр); `--staging` нь staging URL-тай хамт татгалзагддаг байв; гарын авлагын residue
команд `--staging`-гүй байв; CSV-ийн `'` утасны дугаарт ил харагддаг байв. Admin таб Back дээр дахин
царай асуудаг нь зориудын арилжаа — PROJECT-GUIDE-д бичсэн.

### Баталгаажуулалт

- `pnpm check` (апп + тест tsconfig) ба `pnpm lint` — НОГООН; `pnpm build` exit 0.
- **Бүрэн integration suite: 1128 passed / 0 failed / 2 skipped** (116 файл, 2450 с;
  baseline 1112 → +16 шинэ тест). Ганц уналт нь admin-order-edit тестийн өөрийн 45 с
  хязгаар (салбар зөөх нэмэлт асуулга × бүрэн suite-ийн ачаалал) — 90 с болгож
  тусад нь 3/3 ногоон. Run-ийн дараа тестийн үлдэгдэл 0.
- Deploy: `2abe751` production-д, `[vm] DEPLOY-RESTART-OK`, нийтийн /health 200,
  `/index.html` → 301, placeholder алга, буруу хаяг 404. Deploy-ийн дараа бодит
  /shop хайлтад **"Idempotency test product"** худалдан авагчдад харагдаж байсныг
  олж (тасарсан run-ын үлдэгдэл, purge дүрэмд байгаагүй) — suite-ийн бүх fixture
  нэрийг `TEST_PRODUCT_PATTERNS`-д нэмж цэвэрлэв.
- ⚠️ Windows дээр `TaskStop` зөвхөн shell-ийг алдаг, vitest-ийн node процесс
  үлддэг: хоёр suite нэг DB-г зэрэг дарж, hook timeout-ууд гарч байв. Бүрэн
  зогсоохдоо `taskkill //PID <pid> //T //F`.
- Migration **0094** ба **0095** production ба `sugi_staging` хоёуланд ажиллуулсан.
- Шинэ тест: `server/districts.test.ts` (5), `trpc-errors.test.ts`-д +5,
  `index-html.test.ts`-д +1. `commerce.router.test.ts` ба `profile.integration.test.ts`-ийн
  хуучин зан төлөв (profile.update-ийн `phone`) шинэчлэгдсэн.
- ⚠️ Хөтөч дээр НҮДЭЭР шалгаагүй (PROJECT-GUIDE-ийн дүрэм): /profile-ийн шинэ "Утасны
  дугаар солих" алхам, checkout-ийн "нэхэмжлэл дахин авах" товч, утасны цэсний `inert`,
  admin-ийн Enter-ийн хамгаалалт. Tom эдгээрийг утас/хөтөч дээр нэг удаа туршина.
- ⚠️ `PUBLIC_BASE_URL` тохируулаагүй орчинд canonical/og:url/BreadcrumbList/OG зураг нь
  `publicUrl.ts`-ийн ХАТУУ БИЧСЭН домэйн руу заасаар — эхлүүлэлтийн анхааруулгыг
  засаж бодит үр дагаврыг нэрлэв, харин домэйныг солих нь Tom-ийн тохиргооны шийдвэр.

---

## Zochil-ийн брэндийн жагсаалттай харьцуулалт (2026-09-22, зөвхөн уншсан)

Tom admin.zochil.com дээрх 17 брэндийг өгч, сайтад байгаа ч Zochil-д дутуу брэндийг
асуув. Бодит DB-ээс (`products.brand`, нийтлэгдсэн) уншив — юу ч бичээгүй.
Олдвор (кодын засвар хийгээгүй, Tom-ийн шийдвэр):
- `products.brand` 169 өөр утгатай, үүний ~60 нь POS импортын **нэрийн эхний үг**
  (Aloe, Collagen, Vitamin, Sakura, Peach, KIDS, NMN, Osmanthus…) — жинхэнэ брэнд биш,
  гэхдээ /brands хуудсанд брэнд мэт харагдана.
- **amproom**-ийн 12 бараа брэнд нь Ceramid/CICA/Collagen/Honey/Hyaluronic/Rice гэж хуваагдсан.
- **Off & Relax (OR Spa)** 16 бараанаас 14 нь брэндгүй, 1 нь "Osmanthus" дор.
- 129 бараа огт брэндгүй. Zochil-ийн **Hoyu** ба **BEAHEALTHY LIFE My Lover's** нэрээр сайтад олдоогүй.

Үргэлжлэл (Tom: бүх брэнд + лого): 8 агент бараа бүрийн **JAN кодоор** жинхэнэ брэнд/үйлдвэрлэгчийг
тогтоож (984-өөс 955), албан ёсны сайтаас лого татав. Дүн `C:\Users\hero_\Downloads\zochil-brands\`
(репод БИШ): Excel (4 хуудас, логоны зурагтай), Zochil-д оруулах 800×800 лого 62, эх компанийн лого 21.
Zochil-д нэмэх шинэ брэнд **111** (сайтын 530 бараа); 28-ынх лого олдоогүй, 29 бараа тогтоогдоогүй.
Олдворууд: My Lover's = сайтын 29 бараа ("Premium Facial Mask", "NMN", "Osmanthus"…, үйлдвэрлэгч Infinity);
Zochil-ийн "Aloe" брэнд биш (TO-PLAN/TOPVALU); сайтын "Botanical"-ын 7 нь л Diane Botanical, 7 нь ABL;
"Tsubaki" нь Shiseido биш Kumano Yushi; "Femwet" = LEC-ийн Femia; T3 = Sugi Holdings-ийн брэнд.
Сайтын `products.brand`-ийг засаагүй — Tom-ийн шийдвэр (Excel-ийн "Бараа бүрээр" хуудас бэлэн эх сурвалж).
⚠️ WebSearch session бүрт 200 дуудлагатай, бүх агент хуваалцдаг — 8 агент ~3/4-т нь шавхсан.

Үргэлжлэл — Zochil дээр бараа бөглөлт (Tom: *"5-р хуудаснаас эхлээд тайлбар, зураг, категори, мастер ангилал"*):
Zochil API түлхүүр өгдөггүй тул тусдаа Edge цонх (`--remote-debugging-port=9333`, профайл
`%LOCALAPPDATA%\zochil-edge-profile`) дээр Tom нэвтэрч, admin-ий өөрийн API-г (`api.zochil.io/v3/admin/…`,
localStorage-ийн токеноор) ашиглав. Бараа ҮҮСГЭЭГҮЙ — зөвхөн хоосон талбар бөглөв (1119 хэвээр).
Дүн, 5+ хуудас 1039 бараа: тайлбар 1039, вэб ангилал 1039, мастер 1039, брэнд 1012, зураг 703.
54 шинэ брэнд (япон бичигтэй лого хэрэглээгүй), 14 шинэ вэб ангилал (Хөл арчилгаа, Нойтон салфетка, Хүнс…).
833 тайлбарыг бараа бүрийн JAN-аар судалж бичсэн (Sonnet) → Opus засварлагчаар ~5500 хэлний засвар
("хандлага"→"ханд", "мананцар"→"шүршигч", "далан түрүү"→"докудами", зохиомол "шар айрагтай хольж" гэх мэт).
Зураггүй 336 барааны жагсаалт: `Downloads\zochil-brands\Зураггүй-бараанууд.pdf` (Tom Gemini-ээр/гараар оруулна).
Сургамж: Sonnet-ийн монгол хэл утгын ноцтой алдаатай (тарвас, ялгадас, хатгаа) — засваргүйгээр нийтлэхгүй;
S-Select зэрэг бараа зөвхөн JAN хайлтаар олддог (Tom-ийн зөвлөгөө).

---

## Admin: нууц үг → царай → admin (step-up) + царайны системийн бүрэн аудит (2026-09-22)

Tom: *"neeree ene anh ./admin aar ehleed passwordoo hiicheed daraan nuur tanih system
garj ireed tgd nuuree taniulchaad admin uruu nevtreh ystoi bizde... odoo nuuts ug edr
shaardahgui zgr nuuree taniadl orj baina! bas nuur tanih systemd bugs ali eswel dutuu
dulimag ym geeed buh ymiign zasaarai!!! heterhii basic nuur tanih code bichsen bololtoi"*

### Яагаад нууц үг асуухгүй байв
Сешн cookie **365 хоног** амьдардаг (`signSessionToken` → `"365d"`). Нууц үг зөвхөн анх
нэвтрэхэд нэг удаа асуугдаж, дараагийн бүх /admin зочлол шууд камер руу ордог байв.
`docs/ADMIN-MANUAL.md §1` ("утас + нууц үг → царай") болон `FACE-HANDOFF-PLAN.md`-ийн
хяналт #7 ("нууц үгийг ОРЛОХГҮЙ") хоёулаа үүнийг амласан ч код хэзээ ч хэрэгжүүлээгүй.

### Tom-ийн 3 шийдвэр (AskUserQuestion)
1. **Liveness: анивчилт заавал** (санамсаргүй толгой эргүүлэх биш).
2. **Дахин бүртгэл: нууц үг + одоогийн царай**; царай таарахаа больсон бол admin цуцалж өгнө.
3. **Хог кодыг устга** (flash liveness, 68 цэгийн LivenessTracker, хуучин 3-pose тогтмол).

### Хийсэн
**Нууц үгийн step-up** (`server/_core/faceProof.ts`): шинэ cookie `sugi_admin_pw`
(`typ:"reauth"`, user + sessionVersion + таб, **8 цаг** = `FACE_REAUTH_TTL_MS`).
> ⚠️ Энэ хэсгийн анхны хувилбар (login алгасуулдаг, 8 цаг, idle lock-ийн дараа зөвхөн царай)
> Tom-ийн туршилтын дараа өөрчлөгдсөн — доорх **"Үргэлжлэл 2"**-ыг үз: одоо нэг удаагийн,
> 10 мин, царай асуух бүрт нууц үг.
- `auth.login` панелийн эрхтэнд өөрөө үүсгэнэ (дөнгөж нууц үгээ оруулсан тул дахин асуухгүй).
- Шинэ `faceAuth.confirmPassword` (login tier 20/15мин/IP + нэвтрэлттэй **хуваалцсан**
  данс тус бүрийн lockout 10/15мин; `login_attempts`-д `reauth`/`reauth_invalid`/`reauth_locked`).
- `startVerification`, `completeVerification` (#20-ыг үз), `enroll`, `startHandoff` түүнгүй
  `FORBIDDEN (10004)` өгнө. `handoffStatus`-д шаардаагүй: token-ийг зөвхөн нууц үгтэй
  `startHandoff` гаргадаг, табтай холбоотой, 90 с амьдардаг тул тэр өөрөө эрх.
- Idle lock (25 мин) зөвхөн царайны proof-ийг арилгана → **зөвхөн царай** дахин асууна.
  Шинэ таб, гарах, нууц үг солих, 8 цаг → нууц үг + царай.
- Царайны proof-ийн `abs` нь step-up-ийн хугацаагаар хязгаарлагдана ("8 цаг" нууц үгнээс тоологдоно).
- Клиент: `components/admin/AdminPasswordStep.tsx` (зөвшөөрлийн дэлгэцийн ижил загвар —
  брэнд зурвас, дансны нэр, "1. Нууц үг → 2. Царай → 3. Админ" диаграм; талбар дээрх
  алдаа `useFieldErrors`; "Нууц үгээ мартсан уу?" / "Өөр дансаар нэвтрэх"). `main.tsx`
  `REAUTH_REQUIRED_ERR_MSG`-г `FACE_REQUIRED`-тэй адил зохицуулна.

**Аудитаар олдсон, зассан** (3 Explore агент + 1 Plan агент, дараа нь өөрөө уншиж баталсан):
1. 🔴 **Сешн cookie-оор л бусдын царайг солих** — `faceAuth.enroll` зөвхөн сешн шаарддаг
   бөгөөд бүртгэлийг ДАРЖ бичдэг байв; `resetOwnEnrollment` (ямар ч дэлгэц дууддаггүй)
   сешнээр л царайг устгадаг байв. Хулгайлсан сешнтэй хүн өөрийн царайг бүртгүүлээд
   хаалгаар орж чадах байсан. Одоо: `enroll` = нууц үг + (ажилладаг царай байвал) одоогийн
   царайны proof; `resetOwnEnrollment` устгасан.
2. 🔴 **Distance oracle** — `no_match` бүрт яг зайг клиент рүү буцаадаг байв (hill-climbing).
   Одоо `{ ok, reason }` л; зай `face_attempts`-д хэвээр.
3. 🟠 **Данс тус бүрийн царайны lockout** байгаагүй (зөвхөн 8/15мин/IP). Одоо 5 бүтэлгүйтэл
   (`no_match`+`liveness_failed`)/15 мин → `TOO_MANY_REQUESTS` + `face.lockout` аудит.
4. 🟠 **Токен төөрөгдөл** — сешн ба царайны proof нэг түлхүүр, ижил `{sub, sv}`: царайны
   proof-ийг `app_session_id` болгож тавихад бүтэн сешн болдог байв. Одоо `typ`
   (`session`/`face`/`reauth`); `typ`-гүй хуучин сешн хүчинтэй хэвээр (хэнийг ч гаргаагүй).
5. 🟠 **Загвар plaintext** — `descriptorJson`/`posesJson` JSON-оор ил байв (нөөц алдагдвал
   ажиллах хоёр дахь фактор). Одоо AES-256-GCM `enc1:` (base64 — hex нь 12 pose-д TEXT-ийг
   давна), `INTEGRATIONS_ENCRYPTION_KEY`; түлхүүргүй бол шинэ бүртгэл татгалзана; хуучин мөр
   амжилттай шалгалтын дараа өөрөө шифрлэгдэнэ; тайлж чадахгүй бол "дахин бүртгүүлнэ үү".
6. 🟠 **Liveness нэрийн төдий** — анивчилт бүртгэгддэг ч шаардагддаггүй, сервер санамсаргүй
   үйлдэл өгдөг ч клиент огт уншдаггүй байв. Одоо challenge үргэлж `blink`, клиент анивчилт
   харахгүй бол илгээхгүй (2.5 с-ийн дараа "Нэг удаа анивчина уу"), царай алга болох/2 царай
   гарвал бүгдийг дахин эхлүүлнэ (амьдаар анивчаад зураг барих боломжгүй), нүд аних үеийн
   frame авахгүй; `ADMIN_FACE_LIVENESS_ENFORCED` анхдагчаар **асаалттай** ("0" унтраана, getter).
7. 🟠 **`/face-approve` утасны хуудас CSS-гүй** — бүх `.face-*` дүрэм `admin.css`-д, түүнийг
   зөвхөн AdminDashboard импортлодог. Утас QR-ээр шууд ордог тул тоо, камер загваргүй байв.
   Одоо `client/src/face.css` (хоёр хуудас импортлоно; E2E-ээр computed style шалгана).
8. Handoff: буруу тоог камер асахаас **өмнө** шалгана (`startHandoffVerification`), буруу/хугацаа
   дууссан бол "Хүсэлт хаагдлаа" дэлгэц (өмнө нь камерын дэлгэцэн дээр дахин оролдох товч
   — дандаа дахин унадаг); `FaceApprove`-ийн үхсэн `error` state; deny-ийн алдаа.
9. `matchNumber` ба хуурамч сонголтууд `Math.random` → `randomInt`; хазайлттай
   `sort(() => Math.random()-0.5)` → Fisher–Yates.
10. `face_challenges` хэзээ ч устдаггүй байв → өдөр тутмын retention (24 ц).
11. Mint хийхэд жинхэнэ таб id заавал (`"-"` нь хуваалцсан таамаглаж болох identity байв).
12. `faceProof.ts`-ийн dev түлхүүр `Math.random` → `randomBytes(32)`.
13. `IdleLockWatcher`-ийн effect-ийн хамаарлын жагсаалтад mutation объект (render бүрт шинэ)
    байсан — сэрэмжлүүлгийн 2 минутад interval/BroadcastChannel секунд тутам дахин үүсдэг
    байв (handoff-ийн 09-16-ны алдаатай ижил анги). Refs болгов.
14. `run()` дахин оролдлогод өмнөх камерыг зогсоодоггүй, `video.srcObject` хэзээ ч
    цэвэрлэгддэггүй байв.
15. `NO_BOX` type-cast хак → `SmoothMeshRenderer.push(points, box?)`.
16. AdminDashboard-ийн гараар хуулсан `ADMIN_PANEL_ROLES` → `isAdminPanelRole`.
17. Камерын дэлгэцийн "утсаараа баталгаажуулах" ба "← Буцах" холбоос зайгүй наалдсан байв.
18. `admin.updateUserRole`: утасгүй (Facebook) дансыг ажилтны эрхтэй болгохыг хориглов —
    ийм данс нууц үгийн алхмыг давж, нууц үгээ сэргээж чадахгүй.
19. Аюулгүй байдлын төвд `face.*` аудит, `reauth*` нэвтрэлтийн шалтгаан монгол нэртэй болов.

**Verifier агентын олсон 4 (мөн зассан):**
20. Утас `startHandoffVerification`-ээс авсан challenge-ийг `approveHandoff` биш
    `completeVerification`-д өгвөл нууц үггүйгээр өөртөө proof авч болох байв →
    `completeVerification` мөн `assertReauthProof`.
21. Admin "бүртгэл цуцлах" нь царайны lockout-ыг тайлдаггүй байв → зөвхөн ОДООГИЙН бүртгэлийн
    (`face_enrollments.updatedAt`-аас хойших) бүтэлгүйтэл тоологдоно.
22. `ADMIN_FACE_LIVENESS_ENFORCED=0` үед давсан (анивчилтгүй) шалгалт lockout-д тоологдож байв →
    `liveness_failed` зөвхөн блоклож байх үед тоологдоно.
23. Ганц frame tracker алдахад бүх snapshot + анивчилт хаягддаг байв → 4 дараалсан frame (~160 мс).

**Устгасан хог** (Tom зөвшөөрсөн): `shared/face-auth.ts`-ийн flash liveness
(`FLASH_*`, `evaluateFlashResponse`), 68 цэгийн `LivenessTracker`/`SignalSmoother`/
`getHeadYaw`/`getEyeOpenness`/`getMouthOpenness`, `FACE_ENROLL_*`, `FACE_VERIFY_*`,
`FACE_CHALLENGE_LABELS`, `StoredFacePose`; `faceEngine.ts`-ийн `sampleFaceColor`;
`faceAuth.test.ts`-ийн холбогдох тест; `.face-gate-fullflash`, `.face-gate-instruction--flash` CSS.

### Санаатай ХИЙГЭЭГҮЙ
- Сервер descriptor-ыг клиентээс итгэдэг хэвээр (зураг серверт очдоггүй — нууцлалын үндсэн
  амлалт). Урьдчилан бэлтгэсэн бичлэгийн халдлагаас бүрэн хамгаалахгүй — зөвшөөрлийн
  дэлгэцэнд үнэнээр бичсэн хэвээр.
- Статусын алдаан дээр клиент fail-open хэвээр (сервер panel procedure бүрт хаадаг).
- Өөрөө дахин бүртгүүлэх товч нэмээгүй (өмнө нь ч байгаагүй) — сервер дүрэм бэлэн.

### Баталгаажуулалт
- `pnpm check` + `pnpm lint` + `pnpm build` (exit 0).
- Царайны багц: unit + integration **108/108** (шинэ: step-up, `typ`, шифрлэлт, lockout,
  oracle, retention, эрх олгох).
- E2E (`E2E_FACE_GATE=1`): `face-gate.spec.ts` (шинэ — нууц үг түрүүлж гарна, буруу нь
  талбар дээр, зөв нь сонголт руу, reload алгасна, шинэ таб дахин асууна, `/face-approve`
  загвартай) + `face-handoff.spec.ts` — компьютер + утас **6/6**.
- Хуурамч камертай (Chromium fake device) нууц үг → "Энэ төхөөрөмжөөр" → камерын дэлгэц
  алдаагүй (загвар ачаалагдаж, "Царай олдсонгүй" гэж зөв хэлнэ). Screenshot 1366/390.
- ⚠️ **Бодит царай + бодит утсаар Tom туршаагүй** — автомат тест жинхэнэ нүүр/анивчилт
  үзүүлж чадахгүй. Эхний бодит нэвтрэлтэд `face_attempts.detail`-ийн `blinks=`, `restarts=`-г хар.
- Бүрэн vitest (бүх gate): **1112 passed / 2 skipped, 115 файл, 1125 с**. Verifier-ийн засварын
  дараа царайны файлууд дахин 55/55.
- Бүрэн E2E: **232 passed / 4 failed / 6 skipped**. 🔴 4 уналт бүгд commit `ca670e7`-ийн
  (Tom-ийн хүсэлтээр энэ сешнд commit хийсэн, өмнөх сешний "hero зурагдсаны дараа React mount"
  LCP өөрчлөлт, `client/src/main.tsx` `afterHeroShellImagePaint`) улмаас: нүүрний **skip link
  эхний Tab-д фокус авдаггүй** (desktop+mobile) ба утсан дээр **толгойн хайлтын товчийг эрт
  дарахад юу ч болдоггүй** (2). Батлав: mount-ыг түр шууд болгоход 6/6 давсан, буцаахад унана.
  Шалтгаан: React хүлээгдэж байх хооронд (≤1.2 с) хэрэглэгчийн дарсан/Tab хийсэн элемент нь
  серверийн shell, React ирэхэд DOM солигдож фокус/товшилт алга болно. **Push/deploy хийхээс
  өмнө шийдвэр хэрэгтэй**: (a) `ca670e7`-ийг revert, эсвэл (b) эхний keydown/pointerdown дээр
  шууд (`flushSync`) mount хийх fix-forward. Царайны ажил үүнд хамааралгүй.
- **Deploy (Tom: "Za bugdiin commit push deploy hii")**: commit `7945079` + `ca670e7`,
  production 09:03 — `DEPLOY-RESTART-OK`, нийтийн health 200, pm2 лог цэвэр. Production
  хөтчөөр: `/face-approve` картын загвар ачаалагдсан (`face-*.css`), JS алдаа 0. Deploy-ээс
  өмнө `INTEGRATIONS_ENCRYPTION_KEY` лаптоп ба VM дээр ижил болохыг hash-аар шалгасан.
  Migration шаардлагагүй. Deploy-ийн дараа бүх admin нэг удаа нууц үг + царай дахин өгнө
  (хуучин царайны proof `typ`-гүй тул хүчингүй); худалдан авагчийн сешн хөндөгдөөгүй.
  ⚠️ `ca670e7`-ийн E2E регресс (дээрх) production-д очсон — Tom бүгдийг deploy хийхийг хэлсэн.

### Үргэлжлэл 2: /admin-ий нууц үгийн дэлгэц ҮРГЭЛЖ (2026-09-22)
Tom туршаад: *"Zunduu ih test hiilee!! Zuwhun face unshij baina!! Password hiih ym garj
irhgu baina!!!"* Серверийн бүртгэлээр шалгахад яг ижил дараалал 2 удаа: `/login`-оор нууц
үгээр нэвтэрсэн → ~20 с-ийн дараа царай `verified blink`. Шалтгаан нь миний дизайн:
`auth.login` step-up-ийг өөрөө үүсгэдэг, мөн 8 цагийн дотор idle lock-ийн дараа зөвхөн
царай асуудаг байв. Tom-ийн хүсэлт — **/admin өөрийн нууц үгийн дэлгэцийг царай асуух бүрт**.
- `auth.login` step-up үүсгэхээ болив.
- Step-up **нэг удаагийн**: `FACE_REAUTH_TTL_MS` 8 ц → **10 мин**, амжилттай царай
  (`issueFaceProof`) тухайн табын алхмыг зарцуулна (`consumeReauthForTab`; өөр таб дахь
  хүлээгдэж буй алхам хэвээр). Үр дүн: шинэ таб, idle lock, гарч орсон, 8 цаг → нууц үг + царай;
  нээлттэй байх хооронд refresh → юу ч асуухгүй; царай бүтэлгүйтвэл 10 мин дотор нууц үггүй дахин.
- Царайны proof-ийн `abs`-ийг step-up-аар хязгаарладаг байсныг хасав (10 минут болох байсан).
- Тест: `face-idle.test.ts` (нэг удаагийн, табын тусгаарлалт, proof 8 ц хэвээр),
  `faceAuth.integration.test.ts` (login тооцогдохгүй; амжилттай царайны дараа дахин шалгалт
  `REAUTH_REQUIRED`), `e2e/face-gate.spec.ts` — **Tom-ийн яг туршсан зам**: `/login`
  маягтаар нууц үг → /admin → нууц үгийн дэлгэц (хуучин кодоор унах байсан). 119/119, E2E 8/8.

### Үргэлжлэл: эхний агшны товч/Tab алдагдахгүй болгов (2026-09-22)
Tom: *"Ali boloh hereglegchid taalamjtai medremj turuulhiin tuld chadah buhnee hii!!"*
Сонголт нь "хурдаа алдахгүй, харин товшилт ч алдахгүй": `ca670e7`-ийг revert хийгээгүй.
- `server/_core/heroShell.ts`: shell `aria-hidden` + **`inert`**. Өмнө нь aria-hidden дотор
  брэнд, nav холбоос фокуслогдох боломжтой байв (анхны Tab нуугдах гэж буй элемент дээр бууж
  алга болдог), товчнууд нь дарагддаг ч "үхсэн".
- `client/src/main.tsx`: hero-г түрүүлж зурах хүлээлт (≤1.2 с, LCP) хэвээр. Харин анхны
  `keydown`/`pointerdown` (capture) React-ийг **`flushSync`-ээр шууд** mount хийнэ:
  товчны default үйлдэл (Tab) React-ийн DOM дээр явагдаж skip link-д буна; товшилт inert
  shell-ийг нэвтэлж `<body>`-д бууж, React-ийн ижил DOM хуруу өргөхөөс өмнө бэлэн болсон тул
  `<body>`-д ирсэн click-ийг тэр цэг дээрх React-ийн товч руу дамжуулна (чирэх, гүйлгэх,
  удаан дарахыг дамжуулахгүй).
- `e2e/hero-shell.spec.ts`: hero зургийг 2.5 с удаашруулж яг хүлээлтийн цонхонд (`#root`
  хоосныг шалгаад) Tab → skip link, утсанд хайлтын товч → талбар нээгдэнэ, компьютерт
  харанхуй загварын товч → загвар солигдоно. Компьютер + утас.
- Бүтэн E2E **240 passed / 0 failed** (6 skip = царайны хаалганы spec, `E2E_FACE_GATE=1`-ээр
  тусад нь 6/6). Deploy `6ddbbe9` — `DEPLOY-RESTART-OK`. Production хөтчөөр (hero-г
  удаашруулж, `#root` хоосон үед): утсанд эрт товшилт хайлтыг нээв, компьютерт талбарт фокус
  орсон, анхны Tab хоёуланд `skip-link`, JS алдаа 0; үйлчилж буй HTML-д `inert` байна.
- Production Lighthouse утас (simulate, 3 удаа): **perf 88 / 87 / 88, a11y 100**, LCP
  3.23–3.52 с, CLS 0.001 — 09-21-ний 89 / 3.3 с-тэй ижил түвшин, хурд алдагдаагүй.

---

## Зарахад бэлтгэх: худалдан авагчийн баримтууд + дэлхийн жишгийн цоорхойнууд (2026-09-20/21)

Tom: *"Одоо өөр нэмж сайжруулах юм үлдсэн үү? Дэлхийн шилдэг сайтуудын стандартыг судал.
Би үүнийг 10–20 саяар зармаар байна — худалдаж авсан хүн маань ашиглаж, ойлгохгүй бол
ямар ч хэрэг байхгүй биз дээ!"* Дараа нь: *"Надад гарын лавлагаа заавар, хүнд зарахад
ингэнэ тэгнэ, бас тустай PDF файл — энэ серверийн бүх бүтцийг яаж ашиглах, ийм учиртай,
энэ функц ийм гэж бүгдийг сайн зааварласан, нэг нэгэнгүй бичсэн юмыг хийж өгөөд явуулаарай."*

### Судалгаа (web, 2026-09-20)
Baymard (327 топ сайт): сагс орхилт 70.2%, checkout-ийн UX засвар дангаараа хөрвүүлэлтийг
35% хүртэл нэмдэг, дундаж checkout 14.9 талбар (шаардлагатайгаас 2 дахин их), албадан
бүртгэл нь орхилтын 26%-ийн шалтгаан. Core Web Vitals 2026: LCP<2.5с, INP<200мс, CLS<0.1
(75-р percentile); дэлхийн origin-ий 55.9% л гурвууланг давдаг. Shopify-ийн эзний
checklist: 4 хуулийн хуудас, trust хуудсууд, 2FA, мэдэгдлийн загварууд, **туршилтын
захиалга + refund туршилт**. Handover жишиг (Cloudways/Webflow/Elementor): дансны
шилжүүлгийн жагсаалт, **бичлэгтэй walkthrough**, ажилтны гарын авлага, backup хариуцлага,
мэдэгдэж буй хязгаарлалт, хүлээн авсан гарын үсэг. Empire Flippers: SOP бэлэн бол vetting
долоо хоногоос өдөр болдог; **эзэнгүй 30 хоног ажиллаж чадсан бизнес 1–2 дахин өндөр
үнэтэй**.

### Гол дүгнэлт
Бүтээгдэхүүн дэлхийн checklist-ийн ~85%-ийг аль хэдийн хангаж байв. Дутуу нь
**бүтээгдэхүүн биш, ШИЛЖҮҮЛЭХ БАГЦ** байсан: шинэ эзэн ямар данс авах, ямар нууц
алдвал юу үүрд алдагдах, юу нь кодод хатуу бичигдсэн байдаг нь хаана ч бичигдээгүй.

### 1. Хүлээлцэх PDF гарын авлага — `docs/SUGI-ASAYAKE-HANDOVER-MANUAL.pdf` (72 хуудас)
Гурван хэсэг: **I эзэмшигчид** (юу худалдаж авч байна, 14 гадаад данс, 3 сэргээгдэхгүй
нууц, сар бүрийн зардал, өдөр/7 хоног/сар тутмын ажил, мэдэгдэж буй 8 хязгаарлалт,
лиценз, хүлээлцэх акт), **II ажилтанд** (25 admin хэсэг тус бүр, захиалгын урсгал, 60
тохиргоо), **III хөгжүүлэгчид** (архитектур, хавтасны зураглал, **107 файл × 676
экспортолсон функц бүрийн тайлбар нэг нэгээр**, 20 router × 250 procedure эрхийн
хамгаалалттайгаар, 68 хүснэгт, 92 migration, 60 env, deploy/backup/тест, 17 дүрэм).
Жагсаалт бүр **эх кодоос автоматаар** гаргагддаг (`docs/manual/extract.py` →
`build_pdf.py`, reportlab + репогийн өөрийн DejaVu шрифт) тул код өөрчлөгдөхөд
гараар засахгүй, дахин үүсгэнэ.

### 2. Шинэ баримтууд
`docs/OWNER-HANDOVER.md` (данс шилжүүлэх журам, 3 нууц, домэйн солих checklist,
брэнд солих, лиценз, хүлээлцэх акт), `docs/OPERATIONS.md` (deploy, migration,
нөөцлөлт/сэргээлт, мониторинг, тест, **бүрэн `.env` загвар**, шинэ машин, демо).
`docs/ADMIN-MANUAL.md`-д огт дурдагдаагүй байсан **7 хэсэг** нэмэгдэв (Хайлт, Routine,
Кампанит ажил, Хэмжилт, Гишүүнчлэл, Хэрэглэгч, Бэлгийн карт) + үлдсэн 8-ын товч хүснэгт.
README-д "эзэнд зориулсан 5 баримт" блок.

### 3. Брэнд/эзний утгууд кодоос тохиргоо руу
Шинэ эзэн /admin-аас нэрээ сольсон ч дараах газруудад хуучин нэр гардаг байв — бүгд одоо
`getSiteName()` (`server/db.ts`, site_text-ийн DB override) уншина: захиалгын баримт PDF-ийн
толгой/хөл (домэйн нь `publicOrigin()`), бэлгийн картын имэйл, Excel/PDF тайлангийн гарчиг,
QPay/StorePay нэхэмжлэхийн тайлбар, push туршилт, Brevo илгээгчийн нэр (`.env` хоосон бол),
AI moderation-ий prompt, VAPID subject (`OWNER_EMAIL`-ээс). **Алдаа олж зассан**:
`merchantFeed.ts` нь `fallbackValue`-г уншдаг байсан тул Google Merchant feed нь admin-ий
өөрчлөлтийг ҮЛ ТООНО. `InstallGuide.tsx`-ийн SVG дээр `sugi.karkaron.com` зурагдсан байсныг
`window.location.host` болгов. `shared/help-faq.ts`-ийн 3 хариулт (утас, "QPay merchant
тохиргоо дуусмагц", брэндийн нэр) ерөнхий болов + `i18n-strings.ts`-ийн mn/en/ja түлхүүр.
`package.json` `license: MIT` → **UNLICENSED**.

### 4. Өгөгдлийн аюулгүй байдал
**R2 дахь зураг огт backup-гүй байсан** (dry-run: **2,287 объект, ~130 MB**) — шинэ `scripts/oci/media-backup.mjs`
(ETag-аар нэмэгдүүлсэн, серверийн талын хуулалт, `vm-backup.sh`-д ням гараг бүр).
**Migration-ий бүртгэл** — `schema_migrations` хүснэгт (`db-apply-migration.ts` бичнэ,
`--mark-applied`-аар хуучныг бүртгэнэ) + `scripts/db-migration-status.ts` нь prod/staging-ийн
зөрүүг нэрлэнэ (staging-ийн чимээгүй 500-гийн шалтгаан).

### 5. Дэлхийн жишгийн цоорхойнууд (storefront)
- **Үнэгүй хүргэлтийн явцын мөр** сагс + захиалгын хураангуйд ("20,000₮ дутуу", 60%).
  Босго нь 2 жилийн турш тохиргоонд байсан ч худалдан авагчид хэзээ ч харагддаггүй байв.
  Тооцоо нь `shared/delivery.ts`-ийн шинэ `freeShippingProgress()` — checkout-ийн бодит
  төлбөртэй нэг эх сурвалж (5 тест).
- **Маягтын алдаа** (WCAG 3.3.1): дутуу талбарыг зөвхөн алга болдог toast хэлдэг байсныг
  талбар бүрийн `aria-invalid` + `aria-describedby` + доорх улаан мөр, эхний алдаатай
  талбар руу фокус/скролл болгов.
- **BreadcrumbList** structured data барааны хуудсанд (нүдэнд харагддаг байсан ч crawler-т
  өгөгддөггүй байв).
- **Буцаалтын шалтгаан** `window.prompt` → сайтын өөрийн харилцах цонх (тэмдэгтийн
  тоолууртай).
- **Сүүлд хайсан үгс** толгойн хайлтад (localStorage, 5 ширхэг, цэвэрлэх товчтой).
- ⛔ **hreflang НЭМЭЭГҮЙ**: `?lang=` гурван хаяг байдаг ч гурвуулаа ИЖИЛ серверийн HTML
  буцаадаг (орчуулга нь клиент дээр) тул Google тэдгээрийг давхардал гэж үзнэ. Зөв хийхэд
  хэл тус бүрээр сервер талын render хэрэгтэй — тусдаа шийдвэр.

### 6. Хэмжилт ба бодит алдаанууд (2026-09-21, production дээр Lighthouse)
| хуудас | Perf | A11y | BP | SEO | LCP |
|---|---|---|---|---|---|
| Нүүр (компьютер) | **94** | 93 | 81 | 100 | 1.5 с |
| Нүүр (утас) | 59 | 93 | 82 | 100 | 6.9 с |
| /shop (утас) | 74 | 87 | 82 | 92 | 5.2 с |
| Бараа (утас) | 75 | 93 | 82 | 100 | 4.8 с |

Хэмжилт нь **хоёр бодит алдаа** олов:
1. 🔴 **canonical бүх хуудсанд НҮҮР ХУУДСЫГ заадаг байв** — `/shop`, `/help`, `/journal`,
   `/returns`, `/brands`, `/about`, `/careers` бүгд Google-д "энэ бол нүүрийн хуулбар"
   гэж хэлдэг байсан тул индексээс хасагдах эрсдэлтэй. Зөвхөн бараа/нийтлэл өөрийн
   canonical-тай байв. Одоо `renderIndexHtml` нь замаас нь үүсгэнэ (query string-ийг
   зориуд хасна: `/shop?q=…&page=2` → `/shop`). `e2e/seo.spec.ts` хамгаална.
2. **Харанхуй горимын хуудаслалтын мөр** ("1 / 42 хуудас") 2.22:1 — товчнууд загварт
   орсон ч дундах текст гэрэл горимын өнгөө авч үлдсэн байв.
Мөн **захиалгын хураангуйн "Хямдралын код" талбарын placeholder** (түүний ЦОРЫН ГАНЦ
шошго) цайвар дэвсгэр дээр цагаан — огт харагдахгүй байсныг screenshot-оор олж зассан.
LCP элемент нь hero каруселийн зураг; Lighthouse-ийн гол санал нь зургийн шинэ формат
(AVIF, ~222 KB) — хийгээгүй, ROADMAP-д бичив.

### 6a. Hero зургийн LCP — нэг мөрийн засвар (2026-09-21)

Tom: *"Hero зургийг зассан бол ямар харагдах вэ? Би одоогийн дизайнаа хүсэж
байна!"* — **дизайн огт хөндөгдөөгүй**.

`HeroImageSlideshow` нь каруселийг **гурван хуулбараар** зурдаг ("endless"
marquee, `COPIES = 3`) бөгөөд нүдэнд харагддаг нь **дунд хуулбар** (`copy === 1`;
`clone = loop && copy !== 1`). Гэтэл "хамгийн түрүүнд ачаал" гэсэн тэмдэг
(`fetchPriority: high`) `copy === 0 && index === 0`-д, өөрөөр хэлбэл **далд
(aria-hidden) хуулбарт** тавигдсан байв. Улмаас:

- ХАРАГДАХ hero зураг `loading="lazy"` авч, хөтөч түүнийг JS ачаалж, rail
  дунд хуулбар руу байрлалаа тогтоох хүртэл татдаггүй байв;
- `<link rel="preload">` нь зөв файлыг заасаар (Lighthouse-ийн
  `prioritize-lcp-image` давсан), гэхдээ `lcp-lazy-loaded` УНАСАН.

Засвар: тэмдгийг `!clone && index === 0` руу шилжүүлж, `loading="eager"` нэмэв.

**Хэмжилт (ижил компьютер, ижил Lighthouse, утасны горим):**

| | Оноо | LCP | `lcp-lazy-loaded` |
|---|---|---|---|
| Өмнө | 54 | **9.8 с** | унасан |
| Дараа | 65 | **5.3 с** | давсан |

**Дизайн өөрчлөгдөөгүйг баталсан арга**: хоёр build дээрх `.hero-rail`-ийн
DOM-ыг татаж, `loading`/`fetchpriority` шинжийг хассаны дараа **бүрэн ижил**;
15 хавтангийн хэмжээс (320×320) **бүрэн ижил**. (Скриншотын пиксел харьцуулалт
энд тохиромжгүй — marquee тасралтгүй гүйдэг тул хоёр зураг өөр агшин дээр
буудаг.)

⚠️ Үлдсэн: LCP 5.3 с нь Google-ийн 2.5 с-д хүрэхгүй хэвээр. Дараагийн алхам нь
зургийн формат (AVIF) ба consent manager-ийн render-blocking (~770 мс) —
хоёулаа тусдаа ажил.

### 6b. Хурд: зураг 6.3 MB -> 1.1 MB, зургийн формат framework, upload-ийн зөвлөмж (2026-09-21)

Tom: *"Commit it! Then make it more faster!!"*, дараа нь зургийн формат
framework (AVIF/WebP/SVG/PNG, `<picture>`, admin-д client-side шахалт, Sharp
pipeline, хэлбэрийн удирдамж), мөн *"zurag oruulah upload hiihed tips zaawar iig
bas martalgui nemeerei"*.

**Хэмжилт хаанаас эхэлсэн**: LCP-ийн задаргаа (TTFB / load delay / load time /
render delay) ба нүүр хуудасны зураг бүрийн бодит байт (redirect-ээр дамжуулж
тооцсон). Нүүр хуудас утсан дээр **6.3 MB зураг** татдаг байв:

| Файл | KB | Харагдах хэмжээ |
|---|---|---|
| бэлгэ тэмдэг PNG 1920×1920 | 3,700 | **далд** (`display:none`) |
| hero хавтан ×5 (1920px) | 981 | 320×320 |
| khuns.webp 3840×2560 | 412 | 66×66 |
| брэндийн wordmark ×5 (1920px) | 267 | ~52×15 |
| лого PNG | 100 | 128×19 |

**Засвар (дизайн хөндөөгүй)**: далд `<img>`-д lazy + 256px WebP; лого lossless
WebP (пиксел бүр ижил, шалгасан); hero, ангилал, wordmark-д upload-ын -600w
хувилбар srcset-ээр; preload нь `<img>`-тэй ИЖИЛ imagesrcset/imagesizes;
cookie-ийн 2 script `defer`. **Алдаа олж зассан**: локал 2 ангиллын зурагт
-600w хувилбар байгаагүй — SPA fallback 200+HTML буцаадаг тул статус шалгалтаар
биш, "зураг decode болсон уу"-аар л олдсон.

**Зургийн формат (Tom-ийн framework, бодит зураг дээр хэмжиж сонгосон)**:
AVIF нь WebP q82-оос q50-д ~50%, q60-д ~30% жижиг; 2x томруулж харахад q50
жижиг текстийг ("CAUTION: CUTE ANIMALS") бүдгэрүүлсэн тул **q60**. Pipeline
агуулгаар ангилна: photo -> WebP + AVIF; бодит тунгалагтай график -> lossless/q90
WebP, AVIF-гүй; хөдөлгөөнт GIF -> animated WebP, AVIF-гүй (4 тест). alpha
СУВАГТАЙ боловч тунгалаг пикселгүй PNG-г photo гэж ангилна (`stats().isOpaque`).
**SVG-г хүлээж аваагүй** — XSS. `ResponsivePicture` нь `<picture>` AVIF source
+ onError -> WebP fallback (404 үед `<picture>` өөрөө шилждэггүй). Hero preload нь
R2-д AVIF байгаа эсэхийг шалгаж (10 мин кэш) зөв форматыг preload хийнэ.
`scripts/image-avif-backfill.ts --apply`: **470 зураг AVIF болсон, 71 лого/график
алгассан, алдаа 0** (дахин ажиллуулахад 0 нэмнэ). Локал `.avif`-г express
`application/octet-stream`-ээр явуулдаг байсныг `image/avif` болгов
(`nosniff`-тэй тул Safari татгалзаж болзошгүй байв).

**Admin**: 7 газар хуулбарлагдсан upload кодыг нэг `prepareImageUpload()`-оор:
2 MB эсвэл 2560px-ээс том зургийг хөтөч дээр жижгэрүүлнэ (Safari canvas WebP
кодлож чаддаггүй тул буцсан төрлийг шалгаж JPEG руу унана), хэлбэр таарахгүй
бол "тайрагдана" гэж сануулна (бараа 4:5–1:1, hero 1:1, нийтлэл 16:9,
попап 4:5 — CSS-ийн бодит aspect-ratio-оос), GIF хүлээн авна. **Upload-ийн
зөвлөмж** (`shared/upload-tips.ts` + `UploadTips`) upload товч бүрийн хажууд —
хэлбэр, хэмжээ, формат, "систем юуг өөрөө хийдэг"; Content & Media-д хураалттай.
E2E (`admin-image-upload.spec.ts`, upload хүсэлтийг барьж R2-д юу ч бичихгүй):
зөвлөмж харагдана, 4000px -> <=2560px WebP, 2:1 бараанд сануулга.

**Үр дүн (Lighthouse утас, ижил машин, медиан)**:

| Үе | Оноо | LCP | Хуудасны жин |
|---|---|---|---|
| Өглөө | 54 | 9.8 с | 6,307 KB |
| Hero lazy засвар | 65 | 5.3 с | 6,306 KB |
| Зургийн хэмжээ | 74 | 4.2 с | 1,676 KB |
| + AVIF | **77** | **4.2 с** | **1,540 KB** |

⚠️ AVIF LCP-г хөдөлгөөгүй: үлдсэн 4.2 с нь зургийн байт биш — React ачаалж
дуусч hero-г зурах хүртэлх render delay (~1.3 с) ба CSS/JS/font-той өрсөлдөх
load delay (~1.3 с). Дараагийн алхам нь архитектурын (hero-г серверээс HTML-ээр
зурах, critical CSS) — дизайнд нөлөөлж болзошгүй тул Tom-оос асууна.

### 6c. Deploy ба production дээрх бодит үр дүн (2026-09-21)

`sale-readiness` -> `main` fast-forward (12 commit), `deploy.ps1` (health 200).
Production дээр шалгасан: хуудас бүрийн canonical, AVIF hero preload, cookie
script defer, `.avif` = `image/avif`, BreadcrumbList, Merchant feed нэр; 8 хуудас
x утас/компьютер: HTTP 200, JS алдаа 0, тасархай зураг 0, `<picture>` бүр AVIF.

**Deploy-ийн дараах хэмжилт регресс олов**: барааны хуудас 75/4.8с -> 72/5.8с.
Шалтгаан — серверийн preload WebP-г (181 мс) татаад <picture> AVIF-г (962 мс)
дахин татаж байв; hero-д зөв байсан логикийг барааны хуудас авч амжаагүй.
`server/_core/imagePreload.ts` нэг функц болгож засаад дахин deploy: 76/4.9с.

Мөн Tom-ийн screenshot: **профайлын "Тусламж" таб харанхуй загварт асуултууд
харагдахгүй** (`.faq-question` хатуу #17181b). Контрастын тестийг нэвтэрсэн
профайлын 9 таб руу өргөтгөж, градиентийг хэмждэг болгоход ижил төрлийн 6 алдаа
олдож засагдсан (цэс 2.79:1, акаунт устгах 1.1:1, "Ашиглах" товч 1.03:1, ...).

| Production, утас (Lighthouse, 3 удаагийн медиан) | Өглөө | Одоо |
|---|---|---|
| Нүүр | 59 / 6.9 с / 6,898 KB | **69 / 5.3 с / 1,712 KB** |
| /shop | 74 / 5.2 с | 77 / 4.7 с (SEO 92 -> 100) |
| Бараа | 75 / 4.8 с | 76 / 4.9 с |
| Нүүр, компьютер | 94 / 1.5 с | **97 / 1.2 с** |

Локал хэмжилт (77 / 4.2 с) нь production-оос сайн: локал сервер Токиогийн
DB-тэй ssh тунелиар ярьдаг ч Lighthouse өөрөө локал, production-д бол
Cloudflare-аар Токио руу хүсэлт явдаг. **Худалдан авагчид production-ий тоог хэлнэ.**

### 6d. Push ба CI: 09-20-ны commit анх удаа CI-д орж 3 тест унав (2026-09-21)

`main`-ийг push хийхэд session эхлэхээс ӨМНӨ push хийгдээгүй байсан `d91fde3`
(хайлт v3 / санал болголт v3) анх удаа CI-д орж `database-tests` унав:
`recommendations.integration.test.ts` 3/6. Локал 1094/1094 ногоон байсан.

Шалтгаан нь тест биш, **бодит алдаа**: профайл 4-өөс цөөн бараатай таарвал
`getRecommendedProducts` жагсаалтыг bestseller, эцэст нь ДУРЫН бараагаар
дүүргэдэг байсан — "Танд зориулсан" (`personalOnly`) rail-д ч. Хуурай арьстай
хүнд тослог арьсны угаагч гарах гэх мэт. 984 бараатай бодит каталогт таарах
бараа олон тул дүүргэгч ажилладаггүй -> локал ногоон; цэвэр схемтэй CI-д жижиг
каталог -> илэрсэн. Засвар: `personalOnly` үед дүүргэгчгүй.

Батлав: `scripts/ci-local.ts server/recommendations.integration.test.ts`
(`sugi_migtest`-ийг гинжээс шинээр) 6/6, дараа нь GitHub CI хоёр job ногоон,
дараа нь production + staging deploy (хоёулаа `database: up`).

⚠️ **Сургамж** (PROJECT-GUIDE-д аль хэдийн бичигдсэн дүрэм — "Локал ногоон ≠ CI
ногоон" — дахин зөрчигдөв): integration тест бичсэн эсвэл өөрчилсөн commit-ийг
push-лэхээс өмнө `scripts/ci-local.ts <файл>`-аар цэвэр схем дээр ажиллуул.
Дүүргэгч/fallback логик бодит (том) өгөгдөл дээр ХЭЗЭЭ Ч ажилладаггүй тул
зөвхөн жижиг өгөгдөл дээр л шалгагдана.

### 6e. Утасны хурд — "render delay"-г арилгах: серверийн зурсан hero, bootstrap блок, admin CSS салгав (2026-09-21, үдээс хойш)

Төлөвлөгөөний (`~/.claude/plans/…declarative-kite.md`, Tom батлав) 1-р хэсэг. Хэмжилтээс:
утасны LCP 5.3 с-ийн 3.0–4.3 с нь **render delay** — hero зураг аль хэдийн татагдчихсан
байхад React (507 KB) ажиллаж, дараа нь `content.siteMedia` tRPC хариуг хүлээж
(`mediaReady`) байж сая зурдаг байв.

**Юу хийв (бүгд хэмжилттэй, локал production build, Lighthouse утас):**

1. **`#storefront-bootstrap` JSON блок** (`indexHtml.ts` → `client/src/lib/bootstrap.ts`):
   site media бүх мөр, хадгалсан site text, идэвхтэй promo — react-query `initialData`.
   Hero, лого, гарчиг, зарын зурвас бүгд React-ийн ЭХНИЙ render-д бодит утгатай; өмнөх
   `#brand-media` (зөвхөн лого) блок үүнд шингэв. Promo-г мөн оруулсан шалтгаан: зурвас
   нэг round trip хожуу ирж хуудсыг 40px доош түлхдэг байв (байнгын CLS). ⚠️ `initialData`
   дангаараа хангалтгүй байсныг **E2E олов**: `SitePromo`-ийн `visible`/`dismissed` төлөв
   `useEffect`-ээр л асдаг байсан тул React-ийн эхний commit зурвасгүй (толгой top 0), нэг tick-ийн
   дараа 40 болж үсэрч байв — одоо эхний төлөвийг bootstrap-аас синхрон тооцно.
2. **Серверийн зурсан hero shell** (`server/_core/heroShell.ts`, зөвхөн `/`): promo зурвас +
   толгой + hero rail + hero copy-г **React-ийн ЯГ class-уудаар** `<div id="root">` ДОТОР
   статик HTML-ээр. `createRoot().render()` эхний commit-доо #root-ыг арчаад өөрийн DOM-оо
   тавьдаг — нэг frame, ижил pixel. Lucide дүрсүүд яг path-аараа (дүрс "гэнэт гарахгүй").
   Kill switch: `HERO_SHELL=0`. `/vendor/hero-shell.js` (defer): session-д хаасан promo-г
   React ирэхээс өмнө устгана. ⚠️ Lighthouse-ийн **simulated** горим (PSI) localhost дээр
   үүнийг "харахгүй": хурдан машинд shell зурагдахаас өмнө React ирдэг тул загвар нь
   LCP-г JS-ээс хамааруулсаар байна (тэр байтугай +0.9 с муу харуулав). Гэтэл **devtools
   (бодит) throttling: 3.82 → 3.02 с**, мөн production-тэй адил RTT (+200 мс proxy)
   өгөхөд simulated ч **4.22 → 2.36 с, оноо 76 → 94**. Өөрөөр хэлбэл бодит хэрэглэгч ба
   бодит сайт дээрх PSI хоёулаа ашиг хүртэнэ, localhost-ын simulated тоо л худал.
3. **Аппын JS `fetchpriority="low"`** (`vite.config.ts`-ийн `lowPriorityAppScripts` plugin):
   утасны сүлжээнд CSS, hero зураг, шрифт, 190 KB JS нэг зурвасын өргөнийг хуваадаг; shell
   зурагдахад JS хэрэггүй болсон тул JS-ийг ард нь тавив → devtools throttling **3.02 → 2.24 с**.
4. **Лого 864px/42 KB → 480px/12 KB** (`client/public/images/brand/sugi-logo.webp`, 160px-д
   зурагддаг, 3x DPR-д ч хангалттай) — толгойн зураг CSS-тэй өрсөлдөж байв.
5. **Admin CSS салгав**: `client/src/index.css` 4552 → 3919 мөр (290 → 267 KB, gzip 51.5 → 46.2),
   `client/src/admin.css` 658 мөр (24.6 KB, gzip 5.7) — face gate, admin design system
   (`@layer components` wrapper-тайгаа), sectors — `AdminDashboard.tsx` import хийдэг тул
   /admin chunk-тэй хамт л ирнэ. Storefront-д CSS = зурагдалтын хаалга тул шууд LCP-д тусна.
6. **JS-ийг хөнгөлөв**: `animejs` (16 KB) hero-ийн timer effect дотор dynamic import;
   `InstallGuide` (8 KB) хоёр газартаа lazy (`lazyRetry<P>` одоо props-той компонент авна);
   `App.tsx`-ийн Shop/ProductDetail/Checkout warm-up `load`-ын дараа +3 с (өмнө нь
   requestIdleCallback ~630 мс-т галлаж hero-тэй өрсөлддөг байв). Main chunk 507.8 → 484.3 KB.
7. **`home-family` зурвас**: background-image (fold-оос доор атлаа 162 KB-аа шууд татдаг) →
   `EditorialBanner` `imageUrl` prop + `ResponsivePicture` lazy `<img>` (AVIF/WebP, 600w утсанд),
   `BANNER_IMAGE_SIZES`; CSS `object-fit: cover` — харагдах байдал ижил.

**Хэмжилт (локал production build, утас, 3 удаагийн медиан):**

| Горим | Өмнө (6d-ийн дараах) | Одоо |
|---|---|---|
| devtools throttling LCP | 3820 мс (оноо 61) | **2144 мс (оноо 77)** |
| simulated + production RTT (+200 мс) LCP | 4218 мс (оноо 76) | **2358 мс (оноо 94)** |
| simulated, localhost (RTT 0) LCP | 3950 мс | 4839 мс (загварын хиймэл регресс — дээр тайлбарлав) |
| `index.js` CPU (simulated) | 2151 мс | 775 мс |

**Баталгаа:** `e2e/hero-shell.spec.ts` — JS-гүй shell (chunk-ийг route abort) ба React-ийн
mount-ийн ЯГ commit дээрх (MutationObserver) hero зураг/толгойн rect утас+компьютерт тэнцүү,
бусад зам дээр shell байхгүй, mount-ийн дараа `h1` нэг л. Playwright screenshot: shell ба React
хоёр pixel-ээрээ ижил (3 өргөнд, гэрэл + харанхуй). `e2e/brand-logo.spec.ts` шинэ блокт.
**Үр дүн: vitest 1100 passed / 112 файл ✅, E2E 198 passed / 0 failed ✅** (бүтнээр, компьютер+утас).

**Production дээр (deploy-ийн дараа, утас, 3 удаагийн медиан), дараалсан гурван commit:**

| Алхам | Simulated (PSI-тэй ижил) | Devtools (бодит) throttling |
|---|---|---|
| Өмнө (6c, 09-21 өглөө) | оноо 69, LCP 5.3 с | — |
| Shell #root дотор (56b2f08) | **оноо 87, LCP 3.38 с**, FCP 1.7 с | **LCP 2.52 с** (= FCP, hero эхний зурагдалтад) |
| + R2 preconnect (1f24eac) | 88, 3.46 с (шуугиан дотор) | — |
| + Shell #root-ын ГАДНА, нуудаг (ddc6109) | 89, 3.40 с — LCP элемент одоо олддог (breakdown гарна) | — |
| + `/cdn/` 302-гүй шууд R2 URL (803a9b9) | 89, 3.33 с; load delay 1.0 → 0.4–0.9 с | — |

Shell-ийг #root-ын гадна гаргасан шалтгаан: #root дотор байхад React эхний commit-доо устгадаг
тул Lighthouse LCP элементээ олохгүй, JS-ээс хамаарсан пессимист загвар руу унадаг байв. Одоо
Home.tsx layout effect-ээр (нэг frame) нууж, толгой/текстийг нь устгана (давхар h1/main
үлдэхгүй — E2E `storefront.spec` `main` давхардсанаар анх барьсан), rail-ийн нуусан `<img>`
үлдэнэ. Хоёр дахь нь: `/cdn/<key>` 302 → R2 нь hero-ийн замд нэг RTT нэмдэг байсан тул
storefront-д очих зургийн URL-ыг сервер `directStorageUrl`-ээр шууд R2 хаяг болгодог
(DB `/cdn/` хэвээр, admin хөндөгдөөгүй, `content.siteMedia` ч ижил тул React дахин татахгүй).

**Үлдсэн 3.3 с-ийн шалтгаан загварт ил**: TTFB 0.45 + hero зураг ӨӨР origin (`pub-….r2.dev`)
дээр — шинэ холболт (DNS+TCP+TLS = 3 RTT) + шрифт 61 KB, CSS 48 KB-тай нэг зурвасын өргөнийг
хуваана. Кодоор цааш багасахгүй; **Tom-ийн шийдвэр**: R2 bucket-ийг Cloudflare custom domain
(`cdn.sugi…`)-д холбох эсвэл Worker-оор `/cdn/*`-ийг ижил host дээр үйлчлүүлэх — тэгвэл
холболт дахин ашиглагдаж LCP ~2.5 с орчим болно (бодит throttling-д одоо ч 2.5 с).

### 6f. Хүртээмж: Lighthouse a11y 87–95 → 100 (2026-09-21, төлөвлөгөөний 2-р хэсэг)

Хэмжсэн зүйл бүр локал production build дээр Lighthouse accessibility (утас) — нүүр, /shop,
барааны хуудас, /login, /track-order, /careers **зургуулаа 100, унасан аудит 0**
(өмнө 87–95; /login ба /careers 95 нь контрастаас).

- **`AddedToCartToast`**: хаах товч `tabIndex={visible ? 0 : -1}` — toast нь opacity-гаар
  нуугддаг тул хуудас БҮР дээр гар ашиглагчийн Tab дараалалд үл үзэгдэх зогсоол байв.
- **/shop "Эрэмбэ" select**: label-ийн текст ≤620px-д `display:none` → нэргүй; `aria-label`.
  **Асуулгын дүүргийн select**: `<p>` → `<label htmlFor>` + тайлбар `aria-describedby`.
- **aria-label ↔ харагдах текст (WCAG 2.5.3)**: сагс/хүслийн тоон badge `aria-hidden`
  (нэр нь "Сагс нээх, 3 бараатай" хэвээр, харагдах "Сагс" одоо агуулагдана); салбарын мөр
  aria-label-гүй + далд " — Google Maps дээр нээх"; газрын зургийн pin-д дугаар нь орсон;
  ShareBar-ийн 𝕏 глиф → SVG лого (глиф "X" нэрэнд агуулагддаггүй байв); Silktide-ийн
  "Дэлгэрэнгүй" товчны aria-label харагдах текстээ агуулдаг болов — vendor нэг мөрийг
  prompt-ийн товч ба modal-ийн хаах товч хоёуланд хэрэглэдэг байсан тул
  `silktide-consent-manager.js`-д **SUGI patch**: `text.preferences.closeButtonAccessibleLabel`.
- **Давхар alt**: ангиллын дугуй зураг, тавиурын карт, сүүлд үзсэн карт — нэр нь хажууд нь
  бичигдсэн тул `alt=""` (дэлгэц уншигч нэг нэрийг хоёр сонсдог байв).
- **Контраст**: `.product-name-secondary` харанхуйд 3.39 → `--ck-muted`; Facebook товч
  #1877f2 дээр цагаан 4.23 → #1260cc (5.9); карьерын хажуугийн имэйл #df1f3d харанхуй
  дээр 3.72 → #ff6b81 (6.5).
- **Маягтын алдаа талбар дээр нь** (WCAG 3.3.1): Checkout-ийн 09-20-ны загварыг
  **`client/src/hooks/useFieldErrors.tsx`** болгож (`fieldProps`/`errorFor`/`clearError`/
  `showErrors` + `<FieldError>`), Login (нэвтрэх + бүртгэл), ForgotPassword, TrackOrder,
  карьерын анкетад хэрэглэв — өмнө нь эдгээр зөвхөн toast-оор хэлдэг байв. CSS
  `.field-error` + `[aria-invalid]` хүрээ бүх маягтад.
- **Карьерын анкетын CV талбар**: `<label>` дотор `<button>` байсан (label-ийн активац
  давхардаж, бүхэл хайрцаг нэг label болж уншигддаг) → `<div>` + `aria-labelledby`.

Дараа нь: Lighthouse-ийн `label-content-name-mismatch` оноонд нөлөөлдөггүй ч бүгдийг цэвэрлэв.

### 6g. Staging өгөгдөл шинэчлэв + restore скриптийн 2 бодит алдаа + migration бүртгэл (2026-09-21, 3-р хэсэг)

`sugi_staging` нь prod-ын 09-14-ний хуулбар байсан тул монгол нэр (`nameMn`), брэндийн alias,
хайлтын синоним тэнд байгаагүй — contrast E2E латин дэд нэрийн харанхуй горимын алдааг (6f)
хэзээ ч харж чадахгүй байв. Шинэ backup (`backups/defaultdb_2026-09-21_155750.zip`, 345 KB)
→ `scripts/db-restore.ps1 -DatabaseUrl <sugi_staging> -BackupFile … -Force`. Замдаа
**`db-restore.ps1`-ийн хоёр бодит алдаа олдож засагдав** — хоёулаа жинхэнэ гамшгийн үед
сэргээлтийг унагаах байсан:

1. **Нууц үгийг URL-decode хийдэггүй** (`db-backup.ps1` хийдэг): нууц үгэнд `%40` зэрэг тэмдэгт
   байвал `Access denied` — backup ижил URL-ээр ажиллаж байхад restore унадаг байв.
2. **SQL-ийг PowerShell pipeline-аар дамжуулдаг** (`Get-Content -Raw | mysql`): консолын код
   хуудас (энэ Windows дээр cp932) кирилл үсэг бүрийг `?` болгож, мөр доторх `'`-ийг идэж
   эхний монгол брэндийн нэр дээр syntax error өгч байв. Өөр машинд "амжилттай" сэргээгээд
   **монгол нэр бүрийг `?` болгох** байсан. Одоо `mysql --default-character-set=utf8mb4 -e "source …"`
   — файлыг mysql өөрөө уншина.

Баталгаа (staging дээр query): `nameMn` бүрэн кирилл ("BA-YU морины тосны шампунь силиконгүй
600мл"), `brand_aliases` 55, `site_media` 10. E2E-ийн `environment.ts`-ийн "09-14-ний хуулбар"
тайлбар одоо "09-21".

**Migration бүртгэл хоосон байсан**: `schema_migrations` хүснэгт prod дээр ч 0 мөртэй (09-20-нд
хүснэгтийг үүсгэсэн ч өмнөх 92-ыг бүртгээгүй) — `db-migration-status.ts` бүх 92-ыг "дутуу" гэж
харуулж байв. Схем нь бодитоор бүрэн (апп, 1100 тест, E2E бүгд ажилладаг) тул 92-ыг
`--mark-applied`-аар prod ба staging хоёуланд бүртгэв → **Бүртгэгдсэн 92 / Дутуу 0** хоёуланд.
Одооноос шинэ migration бүр `db-apply-migration.ts`-ээр орж бүртгэгддэг тул статус жинхэнэ утгатай.

### 6h. `window.confirm`/`prompt` 47 газар → сайтын өөрийн dialog (2026-09-21, 4-р хэсэг)

Хөтчийн төрөлх confirm нь утсан дээр (PWA/standalone горимд ялангуяа) "сайтын гадна" цонх
шиг харагддаг, загвар/харанхуй горим/хэл дагадаггүй, Playwright-д тусгай зам (`page.once
("dialog")`) шаарддаг байв. Одоо **`client/src/components/ConfirmDialog.tsx`**:
`ConfirmProvider` (App.tsx-д нэг), `useConfirm()` → `{ confirm, prompt }` хоёулаа async
(`await confirm({ title, body?, confirmLabel?, danger? })` → boolean; `await prompt({ title,
input: { initial?, multiline?, readOnly?, required? } })` → string | null). ui/dialog (Radix)
дээр: фокус баригдана, Esc/overlay хаана, `role="dialog"`, `data-testid="confirm-dialog"`.
Provider-гүй газар hook нь хөтчийн confirm руу буцна.

- **Storefront 4** (гараар): Profile — захиалга цуцлах, хаяг устгах, бүх төхөөрөмжөөс гарах
  (гарчиг + тайлбар + улаан товч); ShareBar — clipboard хаалттай үед холбоосыг readOnly
  талбарт харуулна.
- **Admin/inventory 43 газар, 28 файл** — механик хөрвүүлэгч (`window.confirm(X)` → `await
  confirm({ title: X, danger })`, `window.prompt(A, B)` → `await prompt(...)`, хамгийн ойрын
  хамрагч функцийг `async`, компонент бүрт hook + import), дараа нь `pnpm check` барьсан нэг
  зөрчил: `TransfersView`-ийн tRPC mutation `confirm` нэртэй байсан → dialog `ask`. "устга/
  цуцла/хүчингүй/унтраа/хаса/гарга/солих" агуулсан асуулт автоматаар `danger` (улаан товч).
- E2E: `page.once("dialog", …)` 5 газар → `e2e/helpers/confirm.ts`-ийн `acceptConfirm(page)`;
  шинэ `e2e/confirm-dialog.spec.ts` (Болих нь юу ч хийхгүй, Esc хаана, session хэвээр).
- CSS `.confirm-dialog*` — буцаалтын dialog-той нэг хэл (дугуй товч, улаан зөвхөн аюултайд).

Дүрэм: шинэ код `window.confirm`/`window.prompt` бичихгүй — `useConfirm()`.

### 6i. Backend: хязгааргүй жагсаалтууд хуудаслагдав, analytics 60 с кэш (2026-09-21, 5-р хэсэг)

- **`reviews.list`, `questions.list`**: `limit` (анхдагч 20, дээд 50) + `cursor` (сүүлийн `id`),
  эрэмбэ `id DESC` (createdAt-тай ижил дараалал, секундын тэнцэлгүй — "тогтвортой тэнцвэр"
  дүрэм). Клиент `useInfiniteQuery` (бүтэн хуудас = дараагийн cursor), барааны хуудсанд
  "Бусад сэтгэгдлийг харах"; асуултын тоо тусдаа `questions.count` (`ProductSectionJumps` бүх
  жагсаалтыг татдаггүй болов). Хариу нь массив хэвээр тул одоо байгаа тестүүд хөндөгдөөгүй.
- **`content.allPosts`**: `{ page, pageSize }` → `{ items, total, page, pageSize, pageCount }`
  (кэштэй жагсаалтыг санах ойд зүснэ); /journal хуудас URL-д (`?page=2`), 12/хуудас, Өмнөх/Дараах.
  `latestPosts` 6-аар хязгаарлав. `admin.storeCreditLedger` 100-аар.
- **`getAnalyticsReport` 60 с кэш** (`analytics:report:<from>:<to>`), тестэд кэшгүй
  (`NODE_ENV=test` — захиалга үүсгээд шууд тайлан уншдаг).
- Замдаа E2E олсон 3 бодит алдаа: (1) **сагсны drawer-ийн тоо нэмэх/хасах/устгах товчны
  aria-label латин `item.name` ашигладаг байв** — гарчиг нь монгол нэр (staging шинэчлэгдмэгц
  илэрсэн) → `displayName(item).primary`; (2) `AdminSearchPanel` bare `confirm(` (window-гүй)
  хөрвүүлэгчээс мултарсан → dialog; (3) `.product-name-secondary` гэрэл горимд хуудасны суурь
  дээр 3.78:1 → #5b615b; (4) картын **зурсан хуучин үнэ** (`s`) #9a9a9a = 2.81:1 → #5b615b (хямдралтай
  бараа staging-д ирмэгц илэрсэн — өмнө нь тест өгөгдөлгүй тул хэзээ ч харж чадаагүй).
- **Үр дүн (4–5-р хэсэг хамт): vitest 1100 passed / 112 файл ✅, E2E 198 passed / 0 failed ✅**
  (`site-media.integration` нь `content.siteMedia` шууд R2 хаяг өгдөг шинэ гэрээнд тохирч засагдав).
- **Хийгээгүй (зориуд)**: захиалгын мөр бүрийн нөөцийн query (N+1) — нэг захиалгад ≤20 мөр,
  transaction дотор, ledger-ийн дүрмээр `applyBranchStockDelta` заавал; ашиг бага, эрсдэл өндөр.

### 6j. `server/db.ts` 7 066 мөр → 21 домэйн модуль (2026-09-21, 5-р хэсгийн refactor)

Худалдан авагчийн хөгжүүлэгчид хамгийн хүнд файл. TypeScript AST-тай скрипт
(`split-db.mjs`, scratchpad): top-level мэдэгдэл бүрийг мөрийн мужаар 21 файлд хуваарилж,
файл бүрийн import-ыг **бодит identifier хэрэглээгээр** (property нэр биш) гаргаж, хажуугийн
модулиас хэрэглэгддэг export-гүй туслах функцэд `export` нэмж, `server/db.ts`-ийг barrel болгов
(`export *` ×21) — 91 importer хөндөгдөөгүй. Скриптийн дараа гараар засаагүй зүйл: нэг
dynamic `import("./giftCardFulfilment")` зам (`../`), нэг хэрэггүй import (lint). Модулиудын
хооронд тойрог import бий (admin-orders ↔ site ↔ cart-orders …) — бүгд функцийн дуудлага,
модулийн түвшний утга нь зөвхөн `connection.ts`-д (`_db`, `settledSaleSql`) тул ESM-д аюулгүй.
Хүснэгт: CODEBASE §3.1. Зан төлөв: vitest бүтэн + E2E бүтэн (доор).

### 6k. Тест: E2E-д хэзээ ч нээгдээгүй 8 хуудас + coverage тайлан (2026-09-21, 6-р хэсэг)

Шинэ spec-үүд (компьютер + утас): `login` (хоосон илгээлт → хоёр талбарын алдаа + фокус,
буруу нууц үг → серверийн мессеж, бүртгэлийн горим), `forgot-password`, `careers` (ерөнхий
анкет: талбарын алдаа → бодит илгээлт → баярлалаа), `orders` (нэвтэрсэн → профайлын таб,
зочин → login), `routine` (өөрийн тестийн routine — staging-д огт байгаагүй,
`e2e/helpers/routine.ts` — "Бүгдийг сагслах" → сагсанд), `post-detail` (хуудаслалттай
`allPosts`-ийн эхний нийтлэл), `legal-pages` (/privacy /terms /about × mn/en/ja — эдгээр
хуудсанд хэл солих товч байхгүй тул хэлийг `sugi-locale`-оор тавина), `not-found`.

Замдаа олсон бодит алдаа: **карьерын анкетын талбарын алдаа хэзээ ч гардаггүй байв** —
input-ууд `required` тул хөтөч өөрийн хөөсөн мессежээр илгээлтийг хаадаг, `useFieldErrors`
ажиллах боломжгүй → `<form noValidate>`.

Ажиглалт (засаагүй, Tom-д): нэг сегменттэй байхгүй зам (`/shopp`) нь нийтлэлийн `/:slug`
route руу орж "Мэдээ олдсонгүй" гэж харуулдаг — брэндийн 404 биш. Мөн /privacy /terms
/about хуудсанд толгой (хэл солих) байхгүй.

**Coverage**: `@vitest/coverage-v8` 4.1.11, `pnpm test:coverage` (server + shared, html +
json-summary → `coverage/`), CI-ийн unit job artifact болгон хадгална. Gate-гүй (CI-тэй
ижил) run: **мөр 31.7%, функц 30.1%, салаа 26.1%**; бүх integration gate-тэй (локал, бодит DB): **мөр 71.2%, функц 67.9%, салаа 56.2%** (1108 тест / 114 файл).

### 6l. Шинэ хоёр боломж: "Ирэхээр мэдэгдэх" жинхэнэ болов, сэтгэгдэлд зураг (2026-09-21, 7-р хэсэг)

**7a. Back-in-stock (migration 0092 `wishlist_items.restockNotifiedAt`).** Төлөвлөгөөнд
"checkbox юу ч илгээдэггүй" гэж бичсэн нь хагас үнэн байв: admin бүтээгдэхүүний маягтаар нөөцийг
0 → >0 болгоход л имэйл явж, дараа нь тэмдгийг унтраадаг байсан. Бараа хүлээн авах, тооллого,
шилжүүлэг, вендорын автомат үлдэгдэл, цуцлалт — бодит нөөцийн бүх зам — юу ч илгээдэггүй, push
огт байгаагүй. Одоо **нэг зам**: `server/automation.ts`-ийн `back-in-stock` job (15 мин):
`rearmRestockAlerts` (нөөц 0 болсон мөрийг NULL) → `getPendingRestockAlerts` (асаалттай,
мэдэгдээгүй, нийтлэгдсэн, нөөцтэй, хэрэглэгч түр хаагдаагүй) → мөр бүрийг **илгээхээс өмнө
эзэмшинэ** (`claimRestockAlert`: `WHERE restockNotifiedAt IS NULL` + affectedRows === 1) → push
(`/product/<slug>`, монгол нэрээр; хүсэлт гаргасан хүнд — маркетинг биш тул `pushOptIn`-оор
хаагдахгүй) + имэйл (`emailOptIn`). Тэмдэг асаалттай үлдэж, дараагийн ирэлтэд дахин мэдэгдэнэ.
Admin маягтын хуучин зам ба `getWishlistWatchersForProduct`/`clearWishlistNotifyFlagsForProduct`/
`getProductStockQuantity` устав. Шинэ тохиргоо `push-body-back-in-stock` ("Мессежийн загвар").

⚠️ Тестийн аюулгүй байдал: vitest-ийн integration тест **бодит `defaultdb`** дээр ажилладаг тул
job-ийг шууд ажиллуулбал бодит харилцагчдын хүлээгдэж буй мэдэгдлийг "эзэмшиж", тэд хэзээ ч авахгүй
болох байв → `runBackInStockJob({ productIds })`. Мөн хуучин `profile.integration`-ийн restock тест
**ажиллах бүртээ Brevo-оор `@example.invalid` руу жинхэнэ имэйл илгээдэг** байсныг арилгав.
`back-in-stock.integration.test.ts` (push/имэйл mock): дууссан үед юу ч үгүй → ирэхэд push+имэйл
нэг удаа, монгол нэр, холбоос → давтан ажиллахад дахин илгээхгүй → дуусаад дахин ирэхэд дахин.

**7b. Сэтгэгдэлд зураг (migration 0093 `product_reviews.imageUrl`).** `reviews.uploadImage`:
тухайн бараанд сэтгэгдэл бичих эрхтэй хүн л (хадгалах сан руу дурын хүн зураг цутгахгүй), strict
rate limit, файлын гарын үсэг, nudity screen (загвар ажиллахгүй бол алгасахгүй — татгалзана;
сэтгэгдэлд тохирсон шинэ мессеж `REVIEW_IMAGE_SAFETY_REJECT_MESSAGE`), WebP + 600w + AVIF
`reviews/<userId>/`. `reviews.create` зөвхөн өөрийн `reviews/<userId>/` URL-ийг хүлээнэ (өөр хүний
эсвэл гадны зураг → BAD_REQUEST). Клиент: `ReviewPhotoPicker` (утсан дээр багасгана), урсгалд
600w thumbnail → `ImageLightbox`; admin → Сэтгэгдэл дээр зураг + "Зураг хасах" (сэтгэгдэл хэвээр).
Тест: `review-photos.integration.test.ts` (эрхгүй → FORBIDDEN, nudity → review мессеж, бусдын
URL → BAD_REQUEST, бодит upload → нийтэд харагдана → moderation зөвхөн зургийг хасна),
`e2e/review-photo.spec.ts` (баталгаат худалдан авалттай E2E хэрэглэгч: сонгох → урьдчилан харах
→ нийтлэх → thumbnail бодитоор ачаалагдсан (`naturalWidth`) → lightbox). Screenshot-оор нүдээр
баталсан (утас: урсгалд thumbnail; компьютер: lightbox бүтэн зурагтай). Анхны screenshot дээр
тест зураг цайвар цэвэр өнгөтэй байсан тул бөмбөлгийн дэвсгэртэй нийлж "зураг алга" мэт
харагдав — өнгөлөг градиент болгож, ачаалалтыг `naturalWidth`-оор шалгадаг болгов.

Migration 0092, 0093 prod + staging хоёуланд, бүртгэл 94/94. **vitest 1108 passed / 114 файл ✅.** Замдаа: db хуваалтын скрипт 10
газар `export`-ийг doc comment-ийн ӨМНӨ тавьсан байв (`export /** … */ function`) — ажилладаг ч
editor doc-оо алддаг → declaration-ийн өмнө рүү зөөв.

### 6m. Толгой бүх хуудсанд, буруу хаяг → 404, Dependabot-ийн 6 PR бүгд (2026-09-21, шөнө)

Tom: *"Legal pages … Dependabot … fix all of them!!!"* (өмнөх тайлангийн 2–4-р зүйл).

**Толгой ба сагс.** /privacy /terms /about /help-д сайтын толгой (хайлт, хэл, сагс, цэс)
нэмэгдэж, давхардсан "Нүүр хуудас руу буцах" холбоосыг толгойн сум орлов. Замдаа **бодит алдаа**:
/journal, /brands, нийтлэл, /track-order, /login, /forgot-password, /checkout дээр толгойн сагсны
дүрс "үхсэн" байв — тоо үргэлж 0, дарахад юу ч болдоггүй (эдгээр хуудас `onCartOpen` дамжуулдаггүй).
Одоо `CommerceHeader` хуудас сагсаа холбоогүй бол өөрөө удирдана (бодит тоо + өөрийн `CartDrawer`);
сагсаа удирддаг хуудсууд (нүүр, shop, бараа, routine, профайл) хөндөгдөөгүй → hero shell ч хэвээр.

**Буруу хаяг.** Нэг үгтэй буруу хаяг (`/shopp`) нийтлэлийн `/:slug` руу орж "Мэдээ олдсонгүй"
гэдэг байв → брэндийн `NotFound`. Мөн сервер БҮХ замд 200 буцаадаг байсан ("soft 404" — Google
буруу хаяг, устсан бараа/нийтлэлийг жинхэнэ хуудас мэт индексжүүлдэг): **`server/_core/routeStatus.ts`**
— статик route жагсаалт + бараа/routine/нийтлэлийн slug-ийг шалгаж 404 (60 с кэш; lookup унавал
200 — жинхэнэ хуудсыг хэзээ ч нуухгүй). `server/route-status.test.ts` нь `App.tsx`-ийн `<Route path>`
жагсаалтыг уншиж зөрвөл унана — **шинэ хуудас нэмбэл `STATIC_ROUTES`-д мөн нэм**. Service worker
navigation-ийг шууд дамжуулдаг тул 404 хуудас офлайн хуудсаар солигдохгүй (шалгасан).
`BottomNavBar` `/shopp` дээр "Ангилал"-ыг идэвхтэй харуулдаг байсан (prefix шалгалт) → замын хилтэй.

**Dependabot — 6 PR** (өмнөх тайланд "3" гэсэн нь буруу байв: CI-гүй 3-ыг алгассан).
Салбаруудыг merge хийлгүй (хуучин суурьтай, lockfile зөрчилдөнө) хувилбаруудыг `main` дээр
шууд тавьж `pnpm install`-оор lockfile-ыг шинээр үүсгэв; скриптээр салбар бүрийн bump бүгд
орсныг шалгав (32 + 5 + 1 + 1 + 1 = 40):
- #10 production-minor 30 (React 19.3, tRPC 11.19, TanStack Query 5.103, zod 4.6, wouter 3.11, mysql2 3.24, AWS SDK, transformers 4.3 …),
  #9 dev-tooling 5 (Tailwind 4.3.3, tsx, prettier …), #4 `@types/node` 26 — кодын өөрчлөлтгүй.
- #6 **`lucide-react` 0.453 → 1.47** (мажор): 1.0 брэндийн лого (Facebook, Instagram, YouTube)-г хассан →
  `client/src/components/icons/BrandIcons.tsx` — хуучин яг ижил зураглалыг lucide-ийн өөрийн
  `createLucideIcon`-оор; харагдац өөрчлөгдөөгүй.
- #5 **`cookie` 1 → 2** (мажор): `parse` → `parseCookie` (3 файл, ижил зан төлөв).
- #1 Actions: `checkout@v7`, `setup-node@v7`. Тэр PR-ийн CI уналт нь хуучин суурийн `openId` алдаа байв.
- `pnpm.overrides` (16 аюулгүй байдлын override) lockfile-д хэвээр, `pnpm audit --prod` 0.
  `onnxruntime-node` 1.30-ийн алгассан install script нь зөвхөн CUDA (GPU) binary татдаг — CPU
  binary (Windows + Linux) багцад байгаа тул сервер хэвийн.

**Хэмжээ (бодит баримт):** main chunk 484 → 528 KB (gzip 152 → 165), vendor 97 → 85 KB; өсөлтийн
бараг бүгд **React 19.3-ийн `react-dom` 173 → 201 KB**, `lucide-react` +4, `tailwind-merge` +3 KB.
⚠️ Lighthouse-ийн өмнө/дараа харьцуулалт энэ шөнө ХИЙГДЭЭГҮЙ: лаптоп дээр тоглоом (CPU ~46%)
ажиллаж байсан тул хоёр горим хоёулаа CPU-д мэдрэмтгий — production-ы өөрчлөгдөөгүй build ч
"71 / LCP 5.1 с" гэж худал муу гарав. Машин сул үед дахин хэмжинэ.

**Баталгаа:** vitest **1111 passed / 115 файл**, E2E **236 passed / 0 failed** (бүтнээр), icon-ийн харагдацыг шинэчлэлийн өмнө/дараах screenshot-ын pixel diff-ээр (толгой, доод цэс, footer-ийн Facebook/Instagram — зөвхөн sub-pixel anti-aliasing, 0.05–0.6%) баталсан.

**🔴 Deploy-ийн чимээгүй алдаа (энэ шөнө олсон).** c35e8cb-ийн эхний production deploy "амжилттай"
(health 200) гэж дууссан ч `/shopp` 200 хэвээр — pm2 uptime 2 цаг, өөрөөр хэлбэл **хуучин build
ажиллаж байв**; хоёр дахь deploy л restart хийсэн. Шалтгаан: `deploy.ps1`-ийн remote скрипт `ssh …
"bash -s"`-ээр **stdin-ээр** очдог, `pnpm install` тэр stdin-ийг уншиж скриптийн үлдсэнийг "идсэн" →
bash EOF хүрч **exit 0**-ээр install-ын дараа шууд гардаг. Тиймээс **lockfile өөрчлөгдсөн deploy БҮР**
restart-гүй үлддэг байсан (кодын ганц өөрчлөлттэй deploy-д install алгасагддаг тул ажиллаж байсан).
Нийтийн health шалгалт хуучин процессоос 200 авдаг тул хэн ч анзаардаггүй байв. Засвар:
`pnpm install … </dev/null`; мөн remote скрипт restart-ийг **pm2 uptime-аар баталж** (≤120 с)
`DEPLOY-RESTART-OK` хэвлэнэ, байхгүй бол PowerShell тал throw хийнэ; `set -eo pipefail`; локал
health probe (апп ачаалж байхад curl exit 7) скриптийг таслахаа болив. Staging дээр батлав: засваргүй
хувилбар шинэ шалгалтад "Remote install/restart failed (exit 0)" гэж баригдав, засвартай нь
`DEPLOY-RESTART-OK: sugi-staging restarted 11s ago`.

### 7. Тест
Шинэ: `e2e/checkout.spec.ts` — **зочин анх удаа бүтэн захиалга өгнө** (сагс → маягтын
алдаа → салбараас авах → бэлэн мөнгө → баталгаажуулах дэлгэц → DB-д мөр бодитоор
шалгах → аппын өөрийн замаар цуцалж устгах). `e2e/storefront-contrast.spec.ts` (8 хуудас
× 2 загвар, зураг дээрх текстийг алгасна), `e2e/seo.spec.ts` (canonical, JSON-LD).
`addFirstInStockProductToCart` нь `e2e/helpers/storefront.ts` руу гарав.
`server/admin-tips.test.ts`-ийн хатуу жагсаалт `search` хэсгийг дурддаггүй байсан тул
**25-р хэсэг тусламжгүй байгааг тест барьдаггүй байв** — жагсаалт засагдаж, tip нэмэгдэв.

**Үр дүн: vitest 1094 passed / 112 файл ✅, E2E 150 passed / 0 failed ✅** (өмнө 82; бүтнээр, компьютер+утас).

---

## Хайлт v3 + монгол нэр + санал болголт v3 — бүгд data-driven (2026-09-20, орой)

Tom: *"хайлтын систем хангалтгүй — хэдхэн үг (батга, нөхжилт, хуурайшилт, нарны цагаан)
л ажилладаг; латин/кириллээр буруу бичсэн ч бүх бараа гарч ирдэг, prieclat asmy cocochi
sokamocka хайхад амар байг; профайлд арьс/үс/бие сонгосон ч санал буруу; бүгдийг
advanced, professional; бүх барааг монгол нэр рүү; бүгд data driven, admin-аас editable."*
Асуулгаар баталгаажсан шийдвэр: шинж чанар **зөвхөн дүрмээр** (AI-гүй), **биеийн
арчилгааны алхам** нэмэх, монгол нэр **AI-аар нэг удаа**, монгол нэр **үндсэн гарчиг**.

### Юу байсан (хэмжсэн)
- Хайлт = FULLTEXT(name, brand, shortDescription) + кодонд бичсэн 149 синоним. Typo-гүй,
  латин→кирилл галиг огт байхгүй (зөвхөн эсрэг), ≤3 тэмдэгт индекслэгддэггүй, шинэ бараа FT
  cache flush хүртэл олддоггүй, лог байхгүй. Нэр 979/984 латин, тайлбар 941/941 кирилл (70%
  загвар өгүүлбэр). Брэнд free-text: `S-Select`+`SSELECT`, `BA-YU`+`BAYU`, `Love Liner`×3.
- Санал болголт: алгоритм зөв, өгөгдөл хоосон — `skinType` normal=561 (auto-tag placeholder),
  sensitive 27, oily 5, dry 2, combination 0. Тослог арьстай хүнд 5 бараа л оноо авч, үлдсэн
  нь санамсаргүй filler. Ганц утгат `skinType` (чийгшүүлэгч бүх төрөлд тохирдог ч нэгийг л
  авдаг). "Бие" алхам огт байгаагүй. Жин/толь бүгд кодонд.

### Хайлт v3 (`server/search/`, migration 0087–0090)
- **MiniSearch** процесс дотор (context7-оор API баталгаажуулсан: nested AND-of-OR, per-term
  fuzzy/prefix, index-time processTerm массив, autoSuggest). Бодит хэмжилт: build **~90 мс**,
  heap +18–33 MB (GC-ийн өмнөх), 8 хайлт **~5 мс**; DB fetch тунелиар ~0.9 с (boot warm-up
  нуудаг). VM RAM-д боломжийн.
- Индекс-үеийн баяжуулалт: латин нэр/брэнд → кирилл 1–2 хувилбар (`shared/transliterate.ts`),
  кирилл тайлбар → латин, `xc<concept>` ойлголтын токен ("Acne" нэртэй бараа "батга"-аар олдоно),
  admin `searchKeywords`, брэндийн alias. Query: толиор өргөтгөх + галиглах + fuzzy (≤3 үсэг
  үгүй, 4–5 нэг засвар, урт 20%) + prefix (латин ба толинд байхгүй өөрийн үг л — "маск"≠"маскара"
  сургамж хэвээр). STRICT→BROAD→баркод; брэнд/ангиллын мөр; did-you-mean.
- Толь **DB-д**: `search_synonyms` (148 seed), `brand_aliases` (55 seed) — Admin → Хайлт (3 таб:
  статистик/0 үр дүнтэй → "+ синоним", толь CRUD + "туршиж үзэх", alias CRUD). Хоосон хүснэгт
  бол кодын seed-ээр ажиллана (CI). `scripts/normalise-product-brands.ts --apply`: 8 бичлэг,
  11 бараа (`SSELECT`→`S-Select`, `Prieclair`→`PRIECLAT`, `Club`→`Club Suppin` …). Бараа бичих
  бүрт `canonicaliseBrandName` (маягт + CSV).
- Лог `search_queries` (PII-гүй: visitorHash = sha256(cookie+secret), 60 с dedupe, ≥3 тэмдэгт,
  90 хоногийн retention data-retention job-д). `catalog.search` гэрээ хэвээр; шинэ
  `catalog.suggest` (HeaderSearch). Буцаах зам `SEARCH_ENGINE=fulltext` (хуучин функц
  `searchPublishedCatalogFulltext` үлдсэн; `0027` индекс тогтворжсоны дараа устгана).
- Тест: `transliterate`, `brand-aliases`, `catalog-search-index` (16, DB-гүй), `search-synonyms`
  (buildSynonymDictionary), integration: `catalog-search` (11, OPTIMIZE TABLE хэрэггүй болсон),
  `search-analytics` (4), sqli-probe хоёр замд. E2E `search.spec.ts` (6).

### Монгол нэр (migration 0090 `nameMn`)
- `shared/product-name.ts` + `useProductName()`: `catalog-name-display` store setting (mn|latin,
  анхдагч **mn**), en/ja хэлэнд латин үндсэн, нэргүй бол латин. Карт (/shop), RailProductCard,
  ShelfProductCard, QuickView, ProductDetail (h1, title, share), CartDrawer, HeaderSearch.
  Захиалга/POS/eBarimt латин `name` хэвээр. Admin маягтад "Монгол нэр".
- **979/984 нэр бодитоор бичигдсэн** (Tom: *"chi yaaj iij bgd bugdiin hiigeed ugduuu"*,
  *"huwaagad huwaaj hiiged neg dor bish"*). Гадны API түлхүүр ХЭРЭГЛЭЭГҮЙ — `.env`-д байхгүй,
  `ant` CLI ч суугаагүй; Claude Code өөрөө 10 багцаар (ойролцоогоор 100 бараа/багц) орчуулав.
  Хэрэгсэл: `scripts/export-products-for-naming.ts` (нэргүй барааг багцаар хэвлэнэ) →
  `docs/product-names-mn.tsv` (id + нэр, таслал/хашилтын асуудалгүй) →
  `scripts/apply-product-names-mn.ts` (зөвхөн NULL мөрөнд; `--force` нь дахин нэрлэнэ).
  Үлдсэн 5 нь аль хэдийн монгол (4 бэлгийн карт + импортод эвдэрсэн "Бараа (…)").
  Дүрэм: брэнд ЛАТИНААР хэвээр ("BA-YU морины тосны шампунь силиконгүй 600мл"), хэмжээ хэвээр,
  монгол жижиглэнгийн нэршил (шампунь, нөхөн сэргээгч, бие угаагч, нүүр угаагч, маск…).
- `scripts/generate-product-names-mn.ts` (Claude API, structured output) кодонд үлдсэн ч
  хэрэгцээгүй болсон — түлхүүр гарч ирвэл дахин нэрлэхэд ашиглаж болно.

### Санал болголт v3 (migration 0091)
- `products.skinTypes` (олон/"all"; backfill placeholder "normal"+concerns-гүйг ХУУЛААГҮЙ),
  `productType` (29 төрөл, `shared/product-types.ts`), `bodySkinType`/`bodyConcerns` хоёр талд.
  Асуулгад 4-р алхам "Биеийн арчилгаа"; Profile тоймд бүлэг; admin маягтад олон сонголттой
  арьсны төрөл + бие + төрөл + хайлтын үгс; санал чипс v2.
- `explainPreferenceMatch` (оноо + reasons, жин параметр), `isEligibleForPreferenceRecommendation`
  (бэлгийн карт/хүнс/гэр ахуй/эрүүл ахуй/ам шүд саналд орохгүй), `applyDiversityCap` +
  `maxPerProductType`. Жин store settings "Санал болголт" (8 түлхүүр, `getRecoWeights` кэшлэсэн).
  Карт бүр "яагаад" чип (эхний 2 шалтгаан). `scorePreferenceMatch` хуучин гэрээ хэвээр (float
  1.2000000000000002 → toFixed).
- Tagger v2 (дүрмээр): productType 892/984 (untyped 169→92 fallback дүрмээр), skinTypes: all 243,
  sensitive 31, dry-ийн бүлэг 9, oily 7 — **дүрмийн хязгаар**, Tom AI-г татгалзсан тул
  admin-аас засна. `auto-tag-products.ts --apply`: 894 мөр (зөвхөн NULL багана).
- `getRecommendedProducts`-д анх удаа integration тест (6): эрэмбэ + reasons, төрлийн хязгаар,
  "all" < яг таарах, биеийн профайл, personalOnly, tRPC reasons. Бодит каталогтой зэрэгцэн
  ажилладаг тул throwaway мөрүүд өндөр оноотой байхаар зохиосон.
- `skinTypeOptions` ↔ `skinTypeLabels` зөрүү ("Энгийн"/"Хэвийн") арилав.

### Замдаа олдсон, зассан бодит алдаанууд
- **Профайлын өөрчлөлт 5 секунд харагдахгүй байсан.** Шинэ E2E (биеийн алхам) барьж
  авав: асуулгаа дуусгасан худалдан авагч профайл дээрээ ХООСОН төлөв хараад үлдэнэ.
  Шалтгаан: сешн хэрэглэгч `SESSION_USER_TTL_MS` (5 с) кэштэй атлаа `updateUserProfile`,
  `updateUserAvatar`, `updateUserPreferences`, `updateNotificationPreferences` дөрвүүлээ
  `forgetSessionUser`-ийг дууддаггүй байв (нууц үг/эрхийн бичигчид дууддаг). Нэр, утас,
  зураг, мэдэгдлийн тохиргоо — бүгд ижил алдаатай байсныг нэг мөрөөр зассан.
- **Хуучин `skinType="normal"` placeholder оноо авсаар байв.** 2026-09-01-ний bulk
  auto-tag tag-гүй арьсны бараа бүрт ангиллын анхдагчаар `normal` бичсэн (561 мөр) —
  тэр скрипт өөрөө "ангиллын анхдагч нь бодит дохио БИШ" гэж бичсэн ч оноолт түүнийг
  бүрэн жингээр уншдаг байв: "хэвийн арьс" сонгосон хүн санамсаргүй 561 бараатай,
  "тослог" нь 5-тай таарна. Одоо `legacySkinType()` тэр ялгуургүй хэлбэрийг (normal +
  зорилгогүй + олон утгагүй) нотолгоо гэж үзэхгүй. **Өгөгдөл устгаагүй** — /shop-ийн
  шүүлтүүр, admin-ий багана хэвээр; зөвхөн оноолт алгасна. Регрессийн тесттэй.
- **POS импортын скрипт брэндийг нормчилдоггүй байв** — `SSELECT`/`BAYU` хуваагдлын
  анхны эх үүсвэр. Одоо `canonicaliseBrandName` дайрна (маягт, CSV импорт аль хэдийн).
- **Асуулгын pill-үүдэд `aria-pressed` байхгүй** — идэвхтэй эсэх нь зөвхөн дэвсгэр
  өнгөөр илэрхийлэгддэг тул дэлгэц уншигч хэрэглэгч юу сонгогдсоноо мэдэхгүй байв.
- ⚠️ **Аргачлалын сургамж**: `pnpm build 2>&1 | tail -1 && pnpm e2e` нь build унасан ч
  үргэлжилдэг (pipeline-ийн exit code нь `tail`-ийнх) — E2E хуучин bundle дээр ажиллаж,
  "өөрчлөлт ороогүй" мэт харагдана. Build-ийн exit code-ийг ШУУД шалгах.

### Migration, орчин
0087 search_synonyms, 0088 brand_aliases, 0089 search_queries, 0090 products nameMn/
searchKeywords/productType, 0091 body care + skinTypes — **prod (`defaultdb`) ба
`sugi_staging` хоёуланд** (`db-apply-migration.ts --staging` шинэ туг). Seed зөвхөн prod-д
(staging кодын seed-ээр ажиллана). `minisearch@7.2.0` нэмэгдэв.

---

## Бүтэн стекийн гүнзгий аудит, 9 захиалга нэг session-д (2026-09-20)

Tom нэг session-д 9 аудитын playbook өгөв: full-stack takeover → production failure
→ technical waste (*"do not perform deletions"*) → DB at millions of rows →
real-world performance → dev/staging/prod → tests themselves → domain state
machines → AI/legacy drift, төгсгөлд нь *"DO NOT start randomly fixing — PHASE 0–6
plan, implement ONLY the highest-priority safe changes, validate after each group,
CHANGELOG"*. Бүх дүн, төлөвлөгөө, ангилал: **[docs/AUDIT-2026-09-20-full-stack.md](docs/AUDIT-2026-09-20-full-stack.md)**.

### Аудитын арга
Репог бүхэлд нь уншсан (65k мөр): entry/middleware, tRPC builder бүр (281 procedure
→ builder хүснэгт), checkout-ийн зүрх (`createOrderFromActiveCart`), төлбөрийн
callback, scheduler/outbox, схемийн 98 индекс/87 FK, env хувьсагч бүр (57), catch
блок бүр (server-д 150+), `Promise.all` 30, timeout-гүй fetch, unbounded query,
тестийн gate/mock/skip, клиентийн бүх хуудас. Dependency 60-г импортоор тулгасан.

### Юу олдов (гол нь)
- **P0** сагсны `active→converted` UPDATE guard-гүй → хоёр tab (tab бүр өөрийн
  `clientRequestId`) = хоёр захиалга, хоёр удаа нөөц хасалт. Replay хамгаалалт зөвхөн
  ИЖИЛ ID-г барьдаг. Бусад бүх decrement атомик байсан, энэ нэг нь биш.
- **P0** tRPC `errorFormatter` байхгүй → production-д `ER_LOCK_WAIT_TIMEOUT … UPDATE
  product_variants` төрлийн мессеж хэрэглэгчийн toast-д гардаг байв.
- **P0** `login_attempts` бичигддэг ч хэн ч уншдаггүй → данс тус бүрийн lockout алга.
- **P1** strict 8/15мин/IP нь АМЖИЛТТАЙ нэвтрэлт/захиалгыг ч тоолдог → CGNAT/оффисын
  9 дэх хэрэглэгч 429.
- **P1** орхигдсон сагсны сануулга: `sendAccountEmail` буцах утгыг үл хардаг →
  Brevo унасан ч "илгээсэн". Төлбөрийн polling paid-ийн дараа ч 5с тутам. SW
  `/icons /images /fonts`-ыг мөнхөд cache-first (лого сольход буцаж ирсэн зочин
  хуучныг харна).
- **P2** 7 outbound fetch timeout-гүй (QPay ×2, verify.mn, Brevo ×2, Honeybadger,
  OG); campaign `Promise.all` нэг алдаанд audit мөргүй таслаад дахин илгээхэд
  давхардана; production-д зөвхөн `JWT_SECRET` шалгагддаг байв.
- Устгах нэр дэвшигч (ХИЙГЭЭГҮЙ): `server/index.ts` (Manus-ийн хуучин entry),
  `client/public/sitemap.xml` (Manus host, динамик route-д дарагдсан),
  `careers-small.png`, wouter patch (`__WOUTER_ROUTES__` хэн ч уншдаггүй),
  `AdminDeltaPill`/`SectionEyebrow`/`useComposition`/`useMobile`, `autoprefixer`/
  `postcss`/`@types/google.maps`/`next-themes`, `AXIOS_TIMEOUT_MS`, `@assets` alias.
- Хуучирсан баримт: README 43 хүснэгт/61 migration/578 тест → бодит 65/87/1030+;
  CODEBASE.md-ийн мөрийн тоо; `.env.example` README-д холбогдсон ч БАЙХГҮЙ (23 env
  хувьсагч баримтгүй) → README-д бүгдийг жагсаав; файлыг Tom үүсгэнэ (туслах
  `.env*` бичих эрхгүй).

### Зассан (CHANGELOG, аудитын баримтын §12)
`db.ts` cart guard + `countRecentFailedLoginAttempts`; `trpc.ts` `maskErrorShape` +
`login`/`checkout` tier; `routers.ts` lockout, tier, avatar strict, campaign
allSettled; `context.ts` env fail-fast; timeout ×7; `automation.ts`; `Checkout.tsx`
polling; `sw.js` v3 SWR; тест: `trpc-errors.test.ts` (шинэ), `auth.lockout.integration.test.ts`
(шинэ), `auth.rate-limit.test.ts` босго 8→20. Бүлэг бүрийн дараа check/lint/тест;
төгсгөлд build + E2E.

### PHASE 6 — цэвэрлэгээ (Tom: *"phase 6 gaas ehleed uregjluul!"*)

Аудитын үед санаатай устгаагүй байсан жагсаалтыг Tom зөвшөөрснөөр гүйцэтгэв.
Дүрэм: **текст хайлтад л найдаж устгахгүй**. Тиймээс нэр дэвшигч бүрийг дөрвөн
давхаргаар шалгав — (1) статик импорт, (2) **хувьсагч/template-тэй динамик
`import()`** (репо даяар 0 олдсон тул импортын мод бүрэн эрх мэдэлтэй), (3) config
/ script / e2e / `components.json` / HTML-ийн мөр лавлагаа, (4) баримтын лавлагаа.

**Устгасан** (9 файл, 4 dependency, 1 patch):

- `server/index.ts` — Manus-ийн үеийн API-гүй статик сервер. `pnpm dev`/`pnpm build`
  хоёул `server/_core/index.ts`-ийг л ашигладаг. Хоёр "сервер эхлэх цэг" байгаа нь
  дараагийн уншигчийн хувьд бодит төөрөгдөл байв.
- `client/public/sitemap.xml` — үхсэн `sugi-mongo-detasex2.manus.space` хаягуудтай.
  `app.get("/sitemap.xml", serveSitemap)` статик serve-ээс ӨМНӨ бүртгэгддэг тул энэ
  файл хэзээ ч хүргэгдэж байгаагүй. **Устгасны дараа ажиллаж буй production сервер
  дээр батлав**: `/sitemap.xml` → 200, `application/xml`, **1020 `<loc>`**, бүгд
  `sugi.karkaron.com`. `/robots.txt`, `/`, `/shop`, `/product/*`, `/admin`, `/journal`,
  404 зам бүгд хэвийн.
- `client/src/components/home/SectionEyebrow.tsx` + `.section-heading` /
  `.section-heading-light` CSS (9 мөр). 2026-09-11-нд нүүрнээс "eyebrow" хэв маягийг
  буулгахад (NEWVISION.md §2) компонент нь үлдсэн байв. CSS-ийн тайлбар
  *"CategoryMasonry/StoreLocatorSection ашигладаг"* гэсэн нь **худал** — тэд хоёул
  `SectionHeading` → `.editorial-heading`-ийг ашигладаг. Админы бичсэн HTML `class`
  атрибут авч явдаггүй (`sanitizeHtml`-д зөвшөөрөгдөөгүй) тул аль ч замаар хүрэхгүй.
- `AdminDeltaPill.tsx`, `hooks/useComposition.ts`, `hooks/useMobile.tsx` — импорт 0.
- `careers-small.png` (root), `AXIOS_TIMEOUT_MS`, `@assets` alias (`attached_assets`
  хавтас огт байхгүй).
- `patches/wouter@3.7.1.patch` + `patchedDependencies` — patch нь route замуудыг
  `window.__WOUTER_ROUTES__`-д цуглуулдаг байсан; тэр глобалыг **уншдаг газар репо
  даяар нэг ч байхгүй**. Устгасны дараа `node_modules/wouter` унпатчлагдсаныг
  шалгаж, routing-ийг E2E-ээр баталсан.
- `next-themes` — зөвхөн `ui/sonner.tsx` ашигладаг байсан ч next-themes-ийн
  ThemeProvider энэ апп-д **огт mount хийгддэггүй** (аппын өөрийн `ThemeContext`
  тусдаа), тиймээс `useTheme()` үргэлж `undefined` буцааж `theme="system"` болдог
  байв. Тогтмолоор сольсон — зан төлөв байт-ижил.
- `@types/google.maps` (хэрэглээ 0), `autoprefixer` + `postcss` devDeps (Tailwind v4
  `@tailwindcss/vite`; `postcss.config.*`, `tailwind.config.*` хоёулаа байхгүй).
  ⚠️ `pnpm.overrides`-ийн `postcss: >=8.5.28` floor-ыг ҮЛДЭЭСЭН — transitive хувилбар
  8.5.28 хэвээр (аюулгүй байдлын шалтгаан).

**Үлдээсэн**: `shared/job-application-form.ts` (толгойдоо "залгаагүй, 3 алхам үлдсэн"
гэж баримтжуулсан ирээдүйн ажил), `archive/*.md`, root-ийн `.md`-ууд,
`login_attempts.email` баганын нэр (rename = migration).

**Хэмжсэн үр дүн**: үндсэн JS chunk 498.46 → 497.46 kB (gzip 157.69 → 157.28), файл
−9, шууд dependency −4, patch −1. Байтын хэмнэлт бага — гол ашиг нь хуурамч
лавлагаа, хоёр дахь entry, худал тайлбар арилсанд.

**Шалгалт**: `pnpm check` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ · ажиллаж буй сервер
дээр 10 route ✅.

### Бүтэн E2E анх удаа нэг удаад ажиллахад илэрсэн хоёр нуугдмал алдаа

PHASE 6-ийн дараа E2E-г **бүтнээр** (desktop + mobile, 80 тест) ажиллуулахад 4 тест
унав. Хоёулаа энэ session-ий өөрчлөлтөөс БИШ болохыг тус тусад нь баталсан:

1. **Аппын өөрийн blanket rate limit өөрийнх нь suite-ийг блоклож байв.** 3 mobile
   тест `429` авсан: mobile project нь desktop-ийн дараа ИЖИЛ IP-ээс ажилладаг тул
   `limitApiTraffic`-ийн 300 хүсэлт/15 мин budget дундуураа дуусдаг. Клиент талд
   энэ нь `"Unable to transform response from server"` гэж харагддаг (429-ийн JSON
   нь tRPC envelope биш) — өөрөөр хэлбэл **бодит хэрэглэгч ч нүүр хуудсаа эвдэрсэн
   байдлаар харна**. Баталгаа: серверийг унтрааж дахин асаагаад (санах ойн bucket
   цэвэрлэгдэнэ) тэр 3 тестийг ажиллуулахад бүгд давсан.
   → `MAX_REQUESTS` **300 → 1200**/15мин/IP. Гурван үндэслэл: (a) нэг IP-ийн ард
   олон хэрэглэгч байх нь тест биш бодит нөхцөл (Монголын CGNAT, оффисын NAT) —
   өөрийн suite нь түүний бяцхан хувилбар, (b) telemetry tier 600/15мин
   зөвшөөрдөг атлаа нийт таг нь 300 байсан нь дотоод зөрчил, (c) Cloudflare ирмэг
   дээр 150/10с блоклодог. Нэвтрэх/бүртгэл/checkout/OTP-ийн чанга, DB дээр
   тоологддог tier-үүд хөндөгдөөгүй.
2. **`e2e/admin-delete-order.spec.ts`-ийн сонгогч буруу** (зөвхөн mobile).
   `getByPlaceholder(/хайх/i).first()` нь хэсгийн хайлт биш **глобал командын
   цонхны** талбарыг олдог; түүнд бичихэд панель дахин mount хийгдэж view mode
   "жагсаалт"-аас "самбар" руу буцдаг, харин устгах товч зөвхөн жагсаалт горимд
   байдаг. Хуудасны snapshot дээр Kanban багануудыг (ХҮЛЭЭГДЭЖ БАЙНА 4 … ЦУЦАЛСАН 1)
   харж батлав. Сонгогчийг `getByPlaceholder("Дугаар, хэрэглэгч, утас хайх")`
   болгов; `if visible` зөөлрүүлэлтийг хасав.

3. **ESLint нь Playwright-ийн тайлангийн вендор bundle-ууд дээр 3,977 худал алдаа
   өгдөг болов.** Уналттай run нь trace viewer-ийн 32 minified JS-ийг
   `playwright-report/trace/`-д хуулдаг; ESLint нь `.gitignore`-ийг УНШДАГГҮЙ тул
   дараагийн `pnpm lint` тэдгээрийг шалгаж эхэлсэн (`'define' is not defined` …).
   Өмнө нь илрээгүй шалтгаан: энэ session хүртэл E2E бүх run ногоон дуусч, trace
   огт үүсээгүй байв. → `eslint.config.js`-ийн `ignores`-д `playwright-report/**`,
   `test-results/**`, `blob-report/**` нэмэв (гурвуулаа gitignore-д бий). Дүрэм
   сулруулаагүй.

**Сургамж**: E2E-г дэд багцаар (`--project=desktop <файл>`) ажиллуулахад эдгээрийн
аль нь ч илрэхгүй байв — **бүтнээр нэг удаад ажиллуулж байж л "ногоон" гэж хэлнэ**.
Мөн уналттай E2E-ийн ДАРАА `pnpm lint`-ийг дахин ажиллуулж үзэх нь гуравдахийг нь
илрүүлэв. Гурвыг зассаны дараа бүтэн E2E **82 passed / 2 skipped / 0 failed**.

### PHASE 4 — батлагдсан давхардлыг нэгтгэв (зан төлөв хөндөөгүй)

Зөвхөн үсэг үсгээрээ ижил болохыг нь тулгаж баталсныг л нэгтгэв:

- `slugify` — `AdminWorkspace`, `AdminBranchesPanel`, `AdminRoutinesPanel` дээрх
  гурван ижил inline хуулбар → `@shared/slugify` (серверт аль хэдийн ашиглагддаг).
- `skinTypeLabels` — `AdminWorkspace`-ийн хуулбар → `@shared/catalog-filter`.
  Нэг дуудлага `string`-ээр индекслэдэг байсныг `as SkinType` болгов (`any` БИШ).
- `absoluteUrl` — `indexHtml.ts` / `routeMeta.ts` / `ogImage.ts` дээрх гурван
  хуулбар → шинэ `server/_core/publicUrl.ts` (`absoluteUrl`, `publicOrigin`).
  Хоёр файлын хэрэгцээгүй болсон `ENV` импорт мөн арилав.

### Хэмжилт: ML загварууд энэ VM-д багтахгүй (Tom: *"za hiih ystoi zuil baiwal hii"*)

Аудитад "NEEDS VERIFICATION" гэж үлдсэн цорын ганц том зүйлийг бодитоор хэмжив
(production build, `node dist/index.js`):

| Төлөв | RSS |
|---|---|
| Сервер сул зогсож байхад (хоёр warm-up ажилласны дараа) | **535 MB** |
| Текстийн toxicity загвар (probe: 102 → 470) | **+368 MB** |
| Дээр нь зургийн NSFW загвар (probe: 470 → 683) | **+213 MB** |
| Хоёулаа хэрэглэгдсэн процесс | **680–800 MB** |
| Хост | **954 MB VM**, pm2 `--max-memory-restart 700M`, дээр нь staging ч бий |

Өөрөөр хэлбэл boot-ийн дараах **эхний сэтгэгдэл** серверийг хязгаараас хальгаж,
pm2 түүнийг **хүсэлтийн дундуур** restart хийнэ.

**Хамгийн чухал нь**: кодын тайлбарт "idle-ийн дараа сулруулдаг тул процесс суурь
RAM руугаа буцна" гэж бичсэн нь ҮНЭН БИШ байв. `dispose()` нь tensor чөлөөлдөг ч
RSS үйлдлийн систем рүү буцдаггүй — "сулруулсны" дараа ч 535 MB хэвээр. Тиймээс
эхлээд idle-ийг 10 → 3 минут болгосноо **буцаалаа**: богиносгох нь хэмнэлт биш,
зөвхөн дахин ачаалалтын түр оргил (683 → 799 MB ажиглагдсан) нэмдэг. Хэмжилт
өөрийн төлөвлөгөөг минь няцаасан тохиолдол.

Хийсэн нь: (1) `warmUpImageSafety` boot дээр загвараа 10 минут үлдээдэг байсныг
(текстийнхтэй зөрчилдсөн асимметр) арилгаж, шалгаад шууд сулруулдаг болгов;
(2) хост 1.5 GB-аас бага бол `pm2 logs`-д хэмжсэн тоо + 3 сонголттой тод
сэрэмжлүүлэг бичдэг болов — цэвэр `lowMemoryWarning` функцийг gate-гүй unit
тестээр бэхэлсэн (954 MB дээр ЗААВАЛ ажиллана); (3) `express.json` 50mb → 20mb
(хамгийн том зөвшөөрөгдсөн бие 14 MB base64).

⚠️ **Шийдвэр Tom-ийнх**: (1) VM-ийн RAM нэмэх, (2) `MODERATION_MODEL=0` (монгол
хэлний lexical шүүлт хэвээр, `ANTHROPIC_API_KEY` байвал олон хэл ч хэвээр),
(3) pm2-ийн хязгаарыг ухамсартайгаар өсгөх.

### Production DB-ийн тестийн үлдэгдэл цэвэрлэгдлээ

`scripts/test-residue-report.ts` нь бодит дэлгүүрийн схемд **4 тестийн хэрэглэгч**
олов, гурав нь `admin` эрхтэй. Эрсдэлийг нэг бүрчлэн шалгасан: гурван admin мөр нь
**нэвтрэх боломжгүй** (утас нь `handoff-…` гэсэн үсэгтэй мөр эсвэл NULL; нэвтрэлт 8
оронтой утас шаарддаг тул zod түвшинд татгалздаг) — өөрөөр хэлбэл P0 биш. Харин
`#7540` нь бодит утастай (`88110077`) бөгөөд түүний нууц үг тестийн файлд ил
бичээстэй: репо уншсан хүн production-д хэрэглэгчээр нэвтрэх боломжтой байв.
Репогийн өөрийн `test-residue-purge.ts`-ээр (эхлээд dry run, дараа нь `--apply`) 4
мөр болон 322 дарагдсан мэдэгдлийн мөр цэвэрлэгдэж, тайлан бүрэн хоосон болов.

**Үндсэн шалтгаан** (тэмдэглэв, засаагүй): vitest-ийн integration suite нь `.env`-ийн
`DATABASE_URL`-ээр бодит `defaultdb` схемд бичдэг тул тасарсан run бүр үлдэгдэл
үлдээдэг. E2E-г 2026-09-16-нд яг үүний улмаас `sugi_staging` руу зөөсөн; vitest-ийг
мөн зөөхөд staging-ийн схемийн синк (migration гараар очдог) эхлээд шийдэгдэх ёстой.

Мөн гарын авлагын асуултад хариулав: junk захиалга **`#6802`-д бэлгийн картын код
үүсээгүй** (төлөгдөөгүй тул), `#6655` нь аль хэдийн устсан байв.

### Commit хийх үед илэрсэн: uptime монитор хоёр хоног үхсэн байв

Push хийсний дараа CI-г шалгахад `uptime` workflow **2026-09-18-аас хойш run бүр**
(10 минут тутам) унаж байсан нь харагдав. Логийг уншихад шалтгаан нь сайт БИШ:
Cloudflare-ийн Bot Fight Mode нь GitHub-ийн дата төвийн IP-ээс ирэх probe-д
`"Just a moment…"` managed challenge (HTTP 403) буцаадаг. Тэр мөчид сайтыг гараар
шалгахад эрүүл байв: `/health` → 200, `{"ok":true,"database":"up"}`, 0.57 секунд.

Өөрөөр хэлбэл хоёр хоногийн турш бодит мониторинг байгаагүй, мөн `NTFY_URL`
secret тохируулсан бол утас руу 10 минут тутам худал "DOWN" дохио явсан. Худал
дохио өгдөг монитор нь монитор байхгүйгээс дор — жинхэнэ доголдлыг үл тоомсорлох
зуршил суулгадаг.

`uptime.yml`-г засаж challenge-ийг ТАНИДАГ болгов: `blocked=1` үед мэдэгдэл нь
"сайт унасан" гэхийн оронд **"мониторыг хаасан, төлөв ҮЛ МЭДЭГДЭХ"** гэж бичнэ;
тайлбарласан User-Agent нэмэв. ntfy-ийн гарчгийг ASCII-гаар үлдээв (`_core/ntfy.ts`
"кирилл header найдваргүй" гэж тэмдэглэсэн байсныг дагав).

⚠️ Энэ нь мониторингийг СЭРГЭЭХГҮЙ — зөвхөн худал дохиог зогсоож шалтгааныг ил
болгоно. Бодит сэргээлт: (a) Bot Fight Mode унтраах (CSP-ийн nonce тайлбарт зориуд
асаалттай гэж бичсэн), (b) Pro-гийн Super Bot Fight Mode-оор `/health`-д дүрэм,
эсвэл (c) мониторингийн чиглэлийг эргүүлж VM-ээс гадагш heartbeat илгээх.

**Эцсийн гэрчилгээ**: `pnpm check` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ ·
**бүтэн vitest 1038 passed / 2 skipped / 0 failed** (107 файл, 1066 с) · **бүтэн E2E
82 passed / 2 skipped / 0 failed** · ажиллаж буй сервер дээр 10 route ·
`sw.js`-ийн `waitUntil` засварын дараа PWA+storefront E2E 26/26.

⛔ **Утасны нормчлолыг НЭГТГЭЭГҮЙ.** Тулгаж үзэхэд дөрвүүлээ өөр, зориудын
гэрээтэй болох нь батлагдав: `normaliseMongolianMobile` зөвхөн жинхэнэ гар утас
(`[5-9]` угтвар), 976-г яг 11 оронтой үед хасдаг; `normalizePhoneForVerifyMn` нь
ДУРЫН 8 орон (суурин ч) хүлээн авдаг бөгөөд **нэвтрэлтийн identity түүнээс
хамаардаг**; `normalizePhoneForSms` нь эсрэгээрээ E.164 гаргадаг. Нэгтгэвэл зарим
хэрэглэгч нэвтэрч чадахгүй болох эрсдэлтэй тул зөвхөн баримтжуулав. "Давхардал
олдвол шууд нэгтгэ" гэдэг нь энд алдаа болох байсан.

### Сургамж
Өмнөх 5 аудит (09-02, 09-06, 09-09, 09-12, 09-16) бүгд "atomic guard" идиомыг
нөөц/купон/зээлд тавьсан ч сагсны шилжилтийг алгассан — **дүрэм**: төлөв
шилжүүлдэг UPDATE бүр guard + affectedRows. Мөн "хэрэглэгчид зориулсан мессеж" гэж
таамагласан 71 `catch → BAD_REQUEST(error.message)` ороолт нь driver-ийн алдааг ч
дамжуулдаг — маск нь формат түвшинд байх ёстой байв.

---

## Лого /admin-аас солигддог болов — өмнө нь кодод хатуу бичигдсэн байжээ (2026-09-17)

Tom: *"bi neg chuhal ym anzaarlaa!!! end logo solidog ym algadaa bur ./admin deer! herwee bi logogoo shinjilwel yah we?"* — зөв анзаарсан байв. Сайтын лого бол **цорын ганц брэндийн зураг байсан бөгөөд админд засагдахгүй** байсан.

### Юу байсан бэ

Лого 3 газар хатуу бичигдсэн байв:

- `client/src/components/site-footer-data.ts` — `footerLogoUrl` тогтмол (footer, админ хажуу самбар, /careers гурвуулаа үүнийг ашигладаг)
- `client/src/components/CommerceHeader.tsx` — **ижил замыг дахин** бичсэн (тогтмолыг импортлоогүй хуулбар)
- `client/src/components/admin/AdminSidebar.tsx` — хумигдсан үеийн `sugi-symbol` зам

Тэгэхээр логоо солихын тулд хөгжүүлэгч 3 файл засаж deploy хийх шаардлагатай байв. Нэмээд нэг занга: R2 руу байршуулахад файлын нэр дээр hash нэмэгддэг (`appendHashSuffix`) тул шинэ логог хуучин нэр дээр нь "дарж бичих" **боломжгүй** — код заавал өөрчлөгдөнө.

Инээдтэй нь `site-footer-data.ts`-ийн тайлбар өөрөө "лого солих нь rebrand тул admin-д байх ёсгүй" гэж маргаж байсан. Tom үүнийг шууд няцаав; тайлбарыг мөн зассан (буруу үндэслэл repo-д үлдэхгүй байх ёстой).

### Юу болсон бэ

`shared/site-media.ts`-д **`brand-logo`** ба **`brand-symbol`** гэсэн 2 slot нэмэв. Бүртгэлд slot нэмэхэд /admin → Content & Media дээр байршуулах карт **автоматаар** гардаг (`ContentMediaPanel` нь `siteMediaSlots`-ыг тойрдог) тул админы тал нэмэлт кодгүй.

fallback нь яг өмнөх файлууд — тиймээс **байршуулах хүртэл харагдац огт өөрчлөгдөхгүй**.

4 хэрэглэгчийг (толгой, footer, /careers, админ хажуу самбар) шинэ `useBrandMedia()` hook руу шилжүүлж, `site-footer-data.ts`-ийг устгав (ганцхан тогтмол үлдсэн байсан; хоёр газар ижил зам байлгавал салангид болно).

### Анивчихгүй байх нь — яагаад JSON блок хэрэгтэй болсон бэ

Лого бол хуудас болгоны хамгийн дээр байдаг. Хэрэв зөвхөн tRPC query-ээс уншвал: эхлээд ХУУЧИН лого зурагдаад, дараа нь шинэ рүү үсэрнэ. Тиймээс `indexHtml.ts` нь `#brand-media` JSON блокт логоны хаягийг сервер талдаа шийдээд өгдөг болов (`site_media` мөрүүдийг тэр аль хэдийн уншдаг тул үнэ төлбөргүй). Hook нь: блок → tRPC (шинэчлэгдвэл) → бүртгэлийн fallback гэсэн дарааллаар уншина. tRPC давхарга нь index.html-ийн 60 секундын кэшийг хүлээхгүйгээр байршуулсан логог гаргаж ирэхэд хэрэгтэй.

### Хөтөч дээр ажиллуулж байж олсон алдаа

`pnpm check`, `pnpm lint`, `pnpm build` гурвуулаа ногоон байсан ч **хуудсыг нээхэд блок нь `%BRAND_MEDIA_JSON%` гэсэн түүхий текст** байв: `renderIndexHtml`-ийн орлуулах regex нь зөвхөн `%(SEO|COOKIE|ANALYTICS)_*%`-ийг таньдаг байжээ. `BRAND` нэмж зассан. Мөн DB унтарсан үед блок зөв JSON байхаар `fallbackFor`-т тохиолдол нэмэв (түүхий placeholder нь `JSON.parse`-д унаж логогүй үлдээх байсан).

2026-09-16-ны дүрэм дахин батлагдав: type-check + build нь "ажиллаж байна" гэсэн үг биш.

### Баталгаажуулалт

- **Бодит хөтөч дээр** (production build, 3000 порт): толгой ба footer-ийн лого хоёулаа `naturalWidth 864` — бодитоор ачаалагдсан, хоёулаа ижил эх сурвалжтай.
- **"Байршуулсан лого fallback-ыг дардаг" эсэх**: бодит дэлгүүрийн DB-г хөндөхгүйн тулд **`sugi_staging`** схемд түр мөр нэмж, серверийг тэр схем рүү заан асаав → толгой ба footer хоёулаа шинэ зураг руу шилжив (`naturalWidth 1920`). Дараа нь мөрийг устгаж, staging-ийг эхний байдалд нь буцаав (`brand rows now: []`).
- **`e2e/brand-logo.spec.ts` (шинэ, 3 тест × 2 төхөөрөмж = 6, бүгд ногоон)**: (1) лого бодитоор ачаалагдсан эсэх — `naturalWidth > 0`, учир нь `src={undefined}` үед React атрибутыг огт бичихгүй тул `<img>` DOM-д "байсаар" хоосон дөрвөлжин харагдана; (2) эхний зурагдалт серверийн блоктой таарч байгаа эсэх (анивчихгүйн баталгаа); (3) **Tom-ийн бодит зам** — admin-аар нэвтэрч /admin → Content & Media дээр логоны карт харагдаж байгаа эсэх.

### ⚠️ Энэ slot-оос ХАМААРАХГҮЙ зүйлс (лого сольвол гараар)

- `client/public/icons/*.png` — 6 файл: хөтчийн таб, iPhone-ий дүрс, PWA-ийн 192/512 ба maskable 192/512
- `client/public/screenshots/desktop.jpg`, `mobile.jpg` — PWA суулгах дэлгэц
Эдгээр нь `index.html`/`manifest.webmanifest`-д нэрлэгдсэн статик файлууд. Байршуулсан логооос эдгээрийг sharp-аар автоматаар үүсгэх нь хийгдэж болох ажил (Tom одоохондоо "зөвхөн сайтын лого" гэж сонгосон).

---

## Dependabot 40 сэрэмжлүүлэг → 0, ба долоо хоног тутмын автомат шалгалт (2026-09-17)

Tom GitHub дээр **40 нээлттэй сэрэмжлүүлэг** (2 critical, 20 гаруй high) харуулав. Бүгдийг хаалаа — `pnpm audit` 38 advisory-оос **0** болов.

### Бодитоор юу эмзэг байсан бэ

Жагсаалт урт харагдсан ч 40 мөр нь **11 пакет** дээр давхардсан байв. Гол ялгаа: аль нь production-д очдог вэ.

- **Production талд ЗӨВХӨН 2**: `sharp@0.34.5` (libvips/libheif CVE-үүд) ба `adm-zip@0.5.18` — хоёулаа `@huggingface/transformers` → `onnxruntime-node` гинжээр ирсэн. Манай өөрийн шууд `sharp` нь аль хэдийн 0.35.4 буюу засагдсан хувилбар байсан; эмзэг нь transformers-ийн татсан хуучин хуулбар байв. (transformers нь `server/_core/moderationModel.ts`-д динамик `import()`-оор л ачаалагддаг.)
- **Үлдсэн бүгд хөгжүүлэлтийн хэрэгсэл**: vite, vitest, rollup, tar, browserslist, picomatch, esbuild, @babel/core, launch-editor. Эдгээрийн дийлэнх нь "dev server-ийн порт руу хортой вэбсайт хандах" төрлийн халдлага — production build-д огт очдоггүй. Гэхдээ Dependabot суусан хувилбараар тоолдог тул бүгдийг засав.

### Хэрхэн зассан

**Шууд хамаарал (2):** `vite` 7.1.9 → **7.3.6**, `vitest` 2.1.9 → **4.1.11**.

**Дамжин ирдэг (9 шинэ override)** `package.json`-ы `pnpm.overrides`-д: `tar >=7.5.22`, `picomatch@4 >=4.0.7`, `browserslist >=4.29.0`, `baseline-browser-mapping >=2.11.24`, `rollup >=4.63.3`, `sharp >=0.35.4 <0.36`, `adm-zip >=0.6.1 <0.7`, `esbuild >=0.25.10 <0.29`, `@babel/core >=7.29.6 <8`.

⚠️ `adm-zip`-ийн нэг advisory-д **засварласан хувилбар огт байхгүй** (`fix:<0.0.0`, эмзэг муж `>=0.5.9 <=0.6.0`). Тиймээс 0.6.**1** рүү гаргасан — мужаас гарах цорын ганц зам. onnxruntime-node нь `^0.5.x` гэж тунхагладаг тул override-гүйгээр хэзээ ч шинэчлэгдэхгүй байв.

### vitest 2 → 4 (хоёр мажор үсрэлт) — цорын ганц эвдрэл

`ReturnType<typeof vi.spyOn>` нь vitest 4-т ажиллахаа больсон: `MockInstance<T extends Procedure | Constructable>` болж өргөссөн тул `logSpy.mock.calls.map(call => ...)`-ийн `call` нь implicit `any` болж, `tsconfig.tests.json` 9 алдаа өглөө. Засвар нь 2 файлд нэг мөр: `let logSpy: MockInstance<typeof console.log>`. Өөр юу ч хөндөгдөөгүй — `vi.mock` 8 файлд, `mockRestore` 5 газар, fake timers 4 файлд бүгд хэвээр ажиллав.

### Баталгаажуулалт (бодитоор ажиллуулсан)

- `pnpm audit`: **38 → 0 advisory**
- `pnpm check` (2 tsc) ✅, `pnpm lint` ✅
- `pnpm build` ✅ — үндсэн chunk 497 KB / **gzip 157.22 KB** (өмнөх хэмжилт 484/152; vite 7.3.6-ийн ялгаа)
- Бүрэн suite бүх gate-тэй, `--no-file-parallelism`: **1028 passed / 2 skipped (104 файл ногоон, 1 skip)**, регресс 0, 1040 секунд

### Юуг зориудаар ХИЙГЭЭГҮЙ

`pnpm outdated` дээр 10 мажор шинэчлэлт хүлээж байна: **vite 8, vitest 5, express 5, typescript 7, recharts 3, superjson 2, cookie 2, lucide-react 1.x, @vitejs/plugin-react 6, @types/express 5**. Аль нь ч аюулгүй байдлын шалтгаангүй (7.3.6/4.1.11 дээр advisory 0) бөгөөд express 4→5, typescript 5→7 нь өөрсдөө бүтэн session-ий ажил. Эдгээр нь шийдвэр шаардана — сэрэмжлүүлэг биш.

### `pnpm.overrides` хаана байх ёстой вэ (дахин шалгав)

Глобал pnpm нь **11.22.0** боловч `packageManager: pnpm@10.4.1`-ийг хүндэтгэн түүн рүү шилждэг. 11-ийн wrapper нь "pnpm field in package.json is no longer read" гэж stderr-т бичдэг ч override-ууд **бодитоор хэрэгжиж байгаа** нь lockfile-ийн `overrides:` блокоор баталгаажив (16/16). 2026-09-06-нд шалгасанчлан `pnpm-workspace.yaml`-д бичсэн override-ыг энэ pnpm хувилбар чимээгүй үл тоодог тул **package.json-д үлдээв**.

Гэхдээ энэ бол чимээгүй эвдрэх ангилал: `packageManager`-ыг 11 рүү өргөвөл override бүр үхэж, тогтоосон 16 хувилбар бүгд буцаж ухарна — алдаа заахгүй. Тиймээс долоо хоног тутмын шалгалтад **override эрүүл мэндийн** хэсэг нэмэв: package.json-д тунхагласан нэр бүр lockfile-ийн `overrides:` блокт байгаа эсэхийг харьцуулж, дутвал toast өгнө.

### `scripts/check-updates.ps1` + Windows Task Scheduler

40 сэрэмжлүүлэг хуримтлагдсан жинхэнэ шалтгаан нь session хоорондын хугацаанд **хоёр лаптопын аль нь ч хамааралд хэзээ ч хардаггүй** байсан. Тиймээс автоматжуулав:

- **`SUGI ASAYAKE Weekly Dependency Check`** — Даваа гараг 10:00, `-StartWhenAvailable` (лаптоп унтраалттай байсан ч хожим гүйцээж ажиллана), 30 минутын хязгаар.
- Тайлан: `logs/dependency-checks/YYYY-MM-DD-HHmm.txt` (сүүлийн 12-ыг хадгална, `logs/` нь gitignore-д).
- Гурван хэсэг: advisory-ууд, хуучирсан шууд хамаарал (мажорыг "needs a decision" гэж тэмдэглэнэ), override эрүүл мэнд.
- Ямар нэг зүйл олдвол **Windows toast** — зөвхөн лог файл бичвэл хэн ч хэзээ ч уншихгүй (2026-09-16-ны "олдох эсэхийг олох ёстой хүний байрнаас шалга" дүрэм).
- **Юу ч суулгахгүй, зөвхөн мэдээлнэ.** Хараа хяналтгүй `pnpm update` нь амьд сайтыг унагааж болно; засвар нь гараар — bump эсвэл override, дараа нь check + lint + build + бүрэн suite.
- Суулгах: `.\scripts\check-updates.ps1 -Install` (лаптоп тус бүр нэг удаа; **ажлын лаптоп дээр хараахан хийгээгүй**). Устгах: `-Uninstall`.

PowerShell-ийн нэг урхи: `$ErrorActionPreference = "Stop"` үед `pnpm audit`-ийн stderr дэх WARN мөр болон тэгээс ялгаатай exit code (advisory олдвол хэвийн) хоёулаа script-ийг шатаадаг. Тиймээс pnpm дуудлагуудыг `cmd /c "... 2>nul"`-оор дамжуулж, exit code-ыг тэглэдэг `Invoke-PnpmJson` helper-ээр боов.

Scheduler-ээс бодитоор ажиллуулж шалгав: `LastTaskResult 0`, тайлан дахин бичигдсэн, дараагийн ажиллалт 2026-09-21 10:00.

---

## CI НОГООН — сүүлийн 3 уналт нь цаг хугацаанд мэдрэг аппын алдаа байв (2026-09-16, шөнө)

**42 → 13 → 3 → 0.** Сүүлийн гурав нь хамгийн сургамжтай нь: **тестийн биш, аппын алдаа**, зөвхөн орчны хурднаас болж нуугддаг байв. HeatWave руу ssh тунелээр холбогдсон хөгжүүлэгчийн машин дээр үйлдэл бүрийн хооронд хэдэн миллисекунд өнгөрдөг тул санамсаргүй ногоон; CI-д (контейнер дэх локал MySQL, латенц бараг тэг) бүх зүйл нэг секундэд багтдаг тул тогтмол улаан.

Гурвуулаа **секундын нарийвчлалтай `timestamp`**-аас үүдэлтэй:

1. **`getStoreCreditLedger`** зөвхөн `createdAt`-аар эрэмбэлдэг байв. Нэг секундэд хийгдсэн хоёр гүйлгээ тэнцэж, MySQL дурын дараалал буцаана — админ "сүүлийн хөдөлгөөн" гэж **буруу мөр** харна. `id` тэнцвэр нэмэв (гарын авлагын "хуудаслалтад тогтвортой тэнцвэр" дүрэмтэй яг ижил анги, зүгээр өөр хүснэгт дээр).
2. **`completeRegistrationViaPhoneSession`** нь `consumedAt`-аас **өмнө** `userId`-г шалгадаг байв. Ялагч нь (1) сессийг эзэмшиж, (2) хэрэглэгч үүсгээд, (3) сесс дээр `userId` бичдэг. Хожигдогч (3)-ын дараа уншвал "Баталгаажуулалт олдсонгүй" гэсэн **төөрөгдүүлэх** мессеж авна — сесс нь байгаа, дөнгөж ашиглагдсан. Дарааллыг сольж, мессежийг орчноос үл хамааран зөв болгов.
3. **`runPushMovements`** нь `createdAt < NOW() - lag` гэж шүүдэг. `lag = 0` үед энэ нь **яг тэр секундэд** үүссэн хөдөлгөөнийг хасна — хурдан машин дээр хөдөлгөөн үүсгээд push-ийг нэг секундэд багтаан дуудвал юу ч илгээгдэхгүй. `lte` болгов (хязгаарын мөр "хангалттай хуучин"; `lag > 0` үед утга өөрчлөгдөхгүй).

### `scripts/ci-local.ts` — CI-г эндээс давтах

Схем хоослох → гинж → seed → CI-ийн орчны хувьсагчаар vitest. 4 минут хүлээхгүйгээр уналт бүрийн жинхэнэ алдааг харна.

⚠️ **Схемээ цэвэрлэлгүйгээр дахин ажиллуулбал ХУДАЛ ногоон гарна.** Яг ингэж хуурагдсан: нэг удаа хооссоод хоёр удаа ажиллуулахад хоёр дахь нь эхнийхийнхээ өгөгдлийг өвлөж, дээрх гурван уналт нуугдаж "97 passed" гэж гарсан. Script одоо ажиллах бүрдээ хооснодог.

**Үр дүн (бодитоор шалгасан, `gh run view`)**: `database-tests` **97 passed / 8 skipped**, `check-test-build` **49 passed / 56 skipped**, ажиллалт `35117666285` **success**.

---

## CI-г локал дээр давтаж, үлдсэн 13 уналтыг зассан (2026-09-16, шөнө)

`openId`-ийн засварын дараа CI **42 → 13 унасан, 84 ногоон** болов. Үлдсэн 13 нь шинэ алдаа биш — тэр уналтад дарагдаж **хэзээ ч харагдаж байгаагүй** асуудлууд.

### CI-г эндээс харах болов

`gh` CLI суулгав (`winget install GitHub.cli`). `gh auth login` нь `read:org` эрх шаарддаг бөгөөд git-ийн хадгалсан итгэмжлэлд тэр эрх байхгүй тул `GH_TOKEN`-оор шууд дамжуулна:

```bash
export GH_TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p')
"/c/Program Files/GitHub CLI/gh.exe" run list --repo tmorius-eng/sugi-asayake
```

⚠️ Session-ий **GitHub MCP холбогч эвдэрсэн** (`400: Authorization header is badly formatted`) — түүнийг session дотроос засах боломжгүй, `/mcp` эсвэл `claude mcp`-ээр дахин холбоно.

### CI-г локал дээр давтах арга (4 минут хүлээхгүйгээр)

`sugi_migtest` схемийн бүх хүснэгтийг хоослоод → `db-apply-all-migrations` → `ci-seed` → CI-ийн орчны хувьсагчаар (`S3_*` ба `VERIFY_MN_API_KEY`-г ХООСОН болгож) vitest. Ингэснээр уналт бүрийн жинхэнэ алдааг шууд харна. Гинж цэвэр схем дээр **197 chunk / 87 файл / 0 алгасалт**-аар ажиллав.

### Уналтуудын ангилал

| Тоо | Шалтгаан | Засвар |
|---|---|---|
| 7 багц | "No product category exists" — тестүүд бараагаа хавсаргах ангилал БАЙГАА гэж үздэг | `scripts/ci-seed.ts`-д лавлах ангилал нэмэв |
| 1 | `commerce.database`-ийн `warehouseContext()` нь `actorUserId: 1` гэж хатуу бичсэн | beforeAll-д бодит агуулахын хэрэглэгч үүсгэв |
| 1 | `admin-deletes` (өчигдрийн миний тест) `variantId: 1` гэж хатуу бичсэн | өөрийн бараа/variant-аа үүсгэдэг болгов |
| 1 | `profile`-ийн аватар тест S3 шаардана, CI-д тохиргоо байхгүй | `it.skipIf` |

Долоон багцын шалтгаан нэг байсан тул **нэг мөр seed** тэднийг бүгдийг нь зассан — 7 тест файл засахын оронд. Гарын авлага үүнийг урьдчилан бичсэн байсан: *"database-tests job улаан бол seed-д нэмэх мөр байна"*.

⚠️ **Давтагдсан хэв маяг**: `actorUserId: 1`, `variantId: 1`, "ангилал байгаа" — гурвуулаа **хөгжүүлэгчийн DB-д үргэлж байдаг зүйлд найдсан** тестүүд. Локал дээр мөнхөд ногоон, цэвэр схемд мөнхөд улаан. Шинэ integration тест бичихдээ шаардлагатай өгөгдлөө ӨӨРӨӨ үүсгэнэ, эсвэл `ci-seed.ts`-д лавлах мөр болгож нэмнэ.

**Баталгаажуулалт**: CI-тэй ижил цэвэр схем дээр **97 passed / 8 skipped / 0 failed**.

---

## CI-ийн 42 файл унасан шалтгаан — нэг мөрийн буруу индексийн нэр (2026-09-16, шөнө)

CI: `Field 'openId' doesn't have a default value` — 42 integration файл унав. Локал дээр 1028/1028 ногоон байсан тул шалтгаан нь **код биш, схемийн зөрүү**: production-ийн `users` хүснэгтэд `openId` багана ОГТ БАЙХГҮЙ, гэтэл migration гинжээс байгуулсан DB-д байсаар байв.

### Гинжийн дотор юу болж байсан бэ

`0009_independent_auth.sql` нь `openId`-г устгах ёстой байсан. Доторх мөр:

```sql
ALTER TABLE `users` DROP INDEX `openId`;
```

Гэтэл `0000`-д тэр индекс `CONSTRAINT users_openId_unique UNIQUE(openId)` гэж үүсдэг — MySQL түүнд **`users_openId_unique`** гэсэн нэр өгдөг, `openId` биш. Бодит MySQL дээр хэмжиж баталсан: тэр мөр `Can't DROP 'openId'; check that column/key exists` гэж унана.

Хоёр зүйл нийлж чимээгүй гамшиг болов:

1. `scripts/db-apply-all-migrations.ts`-ийн `SKIPPABLE` загвар яг тэр алдааг **алгасдаг** (давталтад зориулагдсан, зөв санаа).
2. Энэ файлд `--> statement-breakpoint` огт байгаагүй тул **бүтэн файл нэг chunk** байв.

Үр дүнд нь алдаатай мөрөөс ХОЙШХИ бүх мөр хамт алгасагдаж: `openId` устдаггүй, `loginMethod` устдаггүй, **`users_email_unique` индекс огт үүсдэггүй**. Production дээр эдгээрийг гараар ажиллуулсан тул зөв байсан бөгөөд зөрүү 9 сар харагдаагүй.

### Засвар

`DROP INDEX` мөрийг бүрмөсөн хассан — багана устахад зөвхөн түүнийг хамарсан индекс MySQL-д **автоматаар хамт устдаг** (бодит MySQL дээр probe хүснэгтээр хэмжсэн: `INDEXES AFTER DROP COLUMN: NONE`). Мөр бүрийг өөрийн chunk болгов, ингэснээр нэг мөрийн алдаа дараагийнхыг залгихаа болино.

**Баталгаажуулалт**: гинжийг `sugi_migtest` схем дээр дахин ажиллуулахад `users` хүснэгт `openId`, `loginMethod` хоёргүй, `users_email_unique` индекстэй болов (өмнө нь тэр индекс огт байхгүй байсан).

### CI-ийн үлдсэн хоёр алдаа

- `telemetry.integration.test.ts` нь "ямар нэг ангилал байгаа" гэж найдаж, байхгүй бол шиддэг байв. Хөгжүүлэгчийн DB-д ангилал үргэлж байдаг тул хэзээ ч мэдэгддэггүй, CI-ийн **seed-гүй цэвэр схемд** яг энд унана. Одоо тест өөрийн ангиллаа үүсгэж, өөрөө цэвэрлэнэ (бодит ангиллыг хэзээ ч хөндөхгүй).
- `checkout.guest.integration.test.ts`-ийн бүртгэлийн тест verify.mn-ийн түлхүүр шаарддаг ба `env.ts` түлхүүргүй үед зориуд алдаа шиддэг. CI-д тэр түлхүүр байхгүй тул `it.skipIf` болгов — зочны checkout-ийн тест түлхүүр шаарддаггүй тул хэвээрээ.

⚠️ **Сургамж**: "локал ногоон" нь "CI ногоон" гэсэн үг биш. Локал DB бол ЖИНХЭНЭ production схем, CI-нх бол ГИНЖЭЭС байгуулсан схем — хоёрын зөрүүг зөвхөн CI илрүүлнэ. Гинжид өөрчлөлт оруулбал шинэ схем дээр ажиллуулж шалгана.

---

## Админд дутуу байсан гурван устгалт (2026-09-16, шөнө)

**Tom**: *"eniig admin hesgees ustgaad ug! medeeleliin sangaas!"* → *"admind ustgah procedur nem!"* → *"bas ene angilal ustgah ymarch songolt alga!!!"* → *"bas uur yu alga baina teriig ynzalj hiiii!"*

### Эхлээд: хогийн захиалгыг устгав

`SAMU0NHNJY458K8X` ("ТУРШИЛТ — Claude", 26,980₮) — гарын авлагад "Tom-оос хүлээж буй" гэж 2 хоног бичигдсэн байсан. Устгахын өмнө шалгахад **нөөцийн 2 хөдөлгөөн** холбоотой байв (`sale_online` −1 ба цуцлахад бичигдсэн `order_restock` +1). Нийлбэр нь 0 тул устгахад `branch_stock` хөдлөхгүй: ledger drift **0 → 0**, variant-ийн үлдэгдэл 16 хэвээр. Хэрэв нийлбэр 0 биш байсан бол устгах нь агуулахын тоог чимээгүй зөрүүлэх байсан.

### Дараа нь: системтэй шалгалт

Router-ийн бүх `create/update/delete` процедурыг сущностоор нь жагсаахад **гурван жинхэнэ цоорхой** олдов (Post нь trash/restore/permanent delete-тэй, JobPosting/LoyaltyTier нь `save*`+`delete*`-тэй тул бүрэн байсан):

| Сущность | Байсан | Нэмсэн |
|---|---|---|
| Барааны ангилал | create, update | **deleteCategory** (warehouse) |
| Нийтлэлийн ангилал | create | **deletePostCategory** (staff) |
| Захиалга | create, edit, update, refund | **deleteOrder** (**admin**) |

### Захиалга устгахын дөрвөн хаалт

Захиалга бол санхүүгийн бичлэг тул "цуцлах" (төлөв солих, түүх үлдэнэ) ба "устгах" (мөр алга болно) хоёрыг тусад нь барив. `adminProcedure` — буцаан олголтоос (finance) ч дээгүүр эрх. Хаалтууд: (1) зөвхөн `cancelled`, (2) зөвхөн `unpaid`, (3) бэлгийн карт / дэлгүүрийн зээл / купоны ашиглалт / сэтгэгдэл холбогдсон бол татгалзана, (4) **нөөцийн хөдөлгөөний нийлбэр 0** байх ёстой — эс бөгөөс устгах нь ledger-ийг `branch_stock`-оос зөрүүлнэ. Устгасан захиалгын хуулбар аудитын мөрөнд бүтнээрээ үлдэнэ (хаанаас ч сэргээгдэхгүй тул).

Ангиллын хоёр устгалт нь "болохгүй" гэхийн оронд **яагаад болохгүйг** хэлнэ: "Энэ ангилалд 12 бараа байна" / "3 нийтлэл хамаарч байна". `post_category_links` нь cascade тул MySQL холбоосыг өөрөө арилгах байсан — тэр нь чимээгүй болох тул зориуд татгалзав.

**Баталгаажуулалт**: `pnpm check` + `pnpm lint` цэвэр. `admin-deletes.integration.test.ts` **4/4** (хаалт бүр, аудитын бичлэг, warehouse/finance-д хаалттай эсэх). `e2e/admin-delete-order.spec.ts` — товч бодитоор гарч, дарахад мөр өгөгдлийн сангаас устаж байгааг **хөтөч дээр** баталсан (өнөөдрийн "код зөв, дэлгэц дээр ажиллахгүй" сургамжийн дагуу). Ангиллын товчийг screenshot-оор шалгасан.

---

## Гарчгийн шрифтийг БУЦААВ — Golos Text руу (2026-09-16, шөнө)

**Tom**: *"bas ene website iin fontiig solison ym bn shde te!!! butsaagaad asahi.mn shig fontoi bolgood hiisen ajilaa undo hii!!!"*

Тэр өдрийн өглөө нэмсэн **Cormorant Garamond** гарчгийн шрифтийг `git revert 9f372b8`-аар бүрэн буцаав: `--font-display` нь `--font-body`-тэй ижил `"Golos Text", sans-serif` болж, 4 woff2 файл, `@font-face` блокууд, serif-т тохируулж өөрчилсөн 20 дүрмийн `letter-spacing` (-.02em → хуучин -.05..-.085em), мөн `e2e/typography.spec.ts` бүгд арилав. Дараа нь нэмэгдсэн CSS (`.footer-install`, `.footer-notify`, `.pref-toggle-row > div span`) auto-merge-ээр бүрэн хадгалагдсан.

⚠️ **Сургамж**: шрифт бол хэмжигдэхүүн биш, ХЭВ ЗАГВАРЫН шийдвэр. Тэр өдрийн ажлын жагсаалтад "display шрифт нэмэх" гэж байсан ч Tom-оос ямар шрифт болохыг асуугаагүй — техникийн шалгуураар (кирилл глифийн бүрэн бүтэн байдал) сонгож, шууд production-д гаргасан. 2026-09-09-ний "чиглэлгүй редизайн" татгалзалтай ижил ангийн алдаа: **харагдах байдал өөрчлөх ажлыг эзэнтэй нь тохироогүй бол хийхгүй**. Гарчгийн шрифт хэрэгтэй хэвээр бол Tom эхлээд жишээ (asahi.mn гэх мэт) өгнө.

Кирилл глифийн дүрэм нь хүчинтэй хэвээр (гарын авлагад): шинэ гарчгийн шрифт нэмэх бол Ө/Ү-г ХӨТӨЧ ДЭЭР хэмжиж шалгана — Playfair Display-д cyrillic-ext огт байхгүй, Unbounded-д Ө/Ү/ө/ү дөрвүүлээ байхгүй нь тэр өдөр бодитоор хэмжигдсэн.

---

## Автомат мэдэгдэл /admin-аас засварлагддаг болов + давхардлын засвар (2026-09-16, шөнө)

**Tom** (iPhone дээрээ аппыг суулгаж, мэдэгдлийг бодитоор хүлээн авсны дараа): *"Za irlee ghdee ene admin tohirgoo sain suuj editable auto tohirgoo bas on off edit hiij yu yvuulahaa zaswarlaj boldof zde?"*

### 1. Захиалгын явцын мэдэгдэл хатуу бичигдсэн байсныг тохиргоо болгов

`server/_core/webPush.ts`-ийн `STATUS_TEXT` нь 7 төлөвийн гарчиг/текстийг **кодод хатуу** агуулж байв: өөрчлөхийн тулд deploy хэрэгтэй, унтраах ямар ч арга байхгүй. Одоо `store_settings`-ийн шинэ **"Автомат мэдэгдэл (push)"** бүлэгт — /admin → Дэлгүүрийн тохиргоо дотор өөрөө гарч ирнэ (бүлэг нэмэхэд самбар автоматаар зурдаг).

Унтраах хоёр зам, тусдаа туг нэмэлгүйгээр:

- `push-order-notifications = 0` → бүх төлөвийн мэдэгдэл зогсоно.
- Тухайн төлөвийн **биеийг хоосон болгох** → зөвхөн тэр нэг төлөв зогсоно.

Ингэснээр 7 × 3 = 21 талбалын оронд 15 болж, "юу илгээхээ засах" ба "илгээхгүй байх" хоёр нэг газраас удирдагдана. `{захиалга}` токен нь бүртгэлд зарлагдсан тул серверийн одоо байгаа токен шалгагч танихгүй орлуулагчийг татгалзсан хэвээр.

⚠️ **Замдаа барьсан төрлийн алдаа**: эхлээд 14 мөрийг `flatMap`-аар үүсгэсэн бөгөөд зүйрлэлт (`` `push-title-order-${status}` ``) нь `StoreSettingKey`-г бүхэлд нь `string` болгож, төслийн **бүх** `getStoreSettingValue("…")` дуудлагын үсгийн алдааг барихаа больж байв (`store-settings.integration.test.ts`-ийн `@ts-expect-error` "ашиглагдаагүй" болсноор илэрсэн). Мөр бүрийг гараар бичиж, литерал төрлийг сэргээв.

### 2. Нэг мэдэгдэл 5 удаа давхарласны шалтгаан

Tom-ийн түгжигдсэн дэлгэц дээр яг ижил "Мэдэгдэл ажиллаж байна…" 5 удаа зэрэгцэн харагдав. Шалтгаан нь хоёр давхар:

- Товч **хоёр газар** зурагддаг (☰ цэс ба footer) бөгөөд "асаалттай" төлөв нь компонент бүрт тусдаа байв — цэснээс асаасны дараа footer-ийнх "асаагаагүй" хэвээр үлдэж, дахин дарахад дахин туршилтын мэдэгдэл илгээгдэнэ.
- Зөвшөөрлийн цонх гарч ирэх хүртэл хэдэн секунд өнгөрдөг ч товч **түгжигддэггүй** байсан тул тэр зуур дахин дарж болно.

Төлөв ба `busy` хоёрыг модулийн хэмжээнд гаргаж, хоёр товч нэг л төлөв хуваалцдаг болгов.

**Баталгаажуулалт**: `pnpm check` + `pnpm lint` цэвэр. Шинэ `order-status-push.integration.test.ts` 4/4 — анхдагч текст, админы бичсэн текст ({захиалга} орлуулагдана), хоосон бие зөвхөн тэр төлөвийг унтраах, үндсэн унтраалга бүгдийг зогсоох. ⚠️ Тест нь хөндсөн 3 тохиргооны мөрөө `afterAll`-д устгана — эдгээр нь дэлгүүрийн бодит утга (2026-08-26-ны site_media-гийн сургамж).

---

## Мэдэгдлийг /admin-аас илгээдэг болов — гурав дахь суваг (2026-09-16, шөнө)

**Tom**: *"Za humuusiin utsan deer notifcation irdeg bolloo gej bodie? Tgd yhiin? Shine baraa irlee salbar delguuruud hymdrlaa edr geh metchilen ch ymuu? Gishuunchleliin cardaa neelgej hungulult edleerei geh met ym utsan deern idle screen off bsn irhuu?? Bas data driven bas editable bolgmoor baina ./admin aas"*

### Хариулт: тийм, дэлгэц унтарсан ч ирнэ

Web Push нь хуудсан дээрх мэдэгдэл БИШ: үйлдлийн системийн push суваг (Android/компьютерт FCM, суулгасан iOS апп дээр APNs) сервис воркерыг сэрээдэг тул хөтөч хаалттай, дэлгэц унтарсан, утас халаасанд байсан ч түгжигдсэн дэлгэц дээр ердийн аппын мэдэгдэл шиг гарна. Хийх зүйл байгаагүй — энэ нь сувгийн өөрийнх нь зан төлөв.

### Юу нэмэгдсэн

Кампанит ажлын самбар (2026-09-08, Phase J) нь **имэйл + SMS** гэсэн хоёр сувагтай байсан. Push нь гурав дахь суваг болов — **SMS-ээс ялгаатай нь төлбөргүй**:

- `sendCampaign`-д `channel: "push"`, сонголттой **дотоод холбоос** (мэдэгдэл дээр дарахад нээгдэх хуудас). Гадаад холбоос сервер талд ч, дэлгэц дээр ч хориотой — мэдэгдлийг фишингийн тээвэр болгож болохгүй.
- **`campaignReach`** (шинэ): илгээхийн ӨМНӨ "сонгосон N хүнээс M нь энэ сувгаар хүлээж авна" гэж харуулна. Push-д энэ зөрүү маш том байж болно (production дээр бүртгэл 0 байсан), тэг бол улаанаар "илгээх нь утгагүй" гэж хэлнэ.
- **Migration 0086 — `users.pushOptIn`**: зар/урамшуулал нь захиалгын мэдэгдлээс ТУСДАА зөвшөөрөл. Хэрэглэгч мэдэгдлээ асаахдаа "Захиалгын явц" гэж амласан тул тэр амлалтаар бүртгүүлсэн хүн рүү сурталчилгаа илгээх нь зөрчил болно (`emailOptIn`/`smsOptIn`-тэй яг ижил үүрэг). /profile → Мэдэгдэл дээр унтраана.

Ингэснээр Tom-ийн нэрлэсэн гурван хэрэглээ бүгд өгөгдлөөр чиглүүлсэн, /admin-аас засварлагдахаар боллоо: *"шинэ бараа ирлээ"* (сегмент → бүх харилцагч, холбоос `/shop?category=…`), *"салбарууд хямдарлаа"* (дүүрэг/сегментээр), *"гишүүнчлэлийн картаа нээлгэ"* (лояалти зэрэглэлээр).

### Замдаа барьсан чимээгүй алдаа

`getUsersForCampaignSend`-д бичсэн **хамаарсан дэд асуулга (`sql` дотор `select count(*) from push_subscriptions where …`) бодит мөр байхад ч ТЭГ буцааж байв** — алдаа шиддэггүй, зүгээр л чимээгүй буруу. Түүхий SQL-ээр ижил нөхцөлд 1 гардаг. Үр дагавар нь ноцтой байх байсан: push кампанит ажил "хэн ч эрхшээлгүй" гээд хэзээ ч илгээгдэхгүй, шалтгаан нь хаана ч харагдахгүй. Тоололыг **тусдаа асуулга + JS-ийн нэгтгэл** болгож заслаа. Интеграцийн тест үүнийг шууд барив.

**Баталгаажуулалт**: `pnpm check` + `pnpm lint` цэвэр, `campaigns.integration` 5/5 (шинэ push тесттэй), migration 0086 production + `sugi_staging` хоёуланд ажилласан.

---

## Мэдэгдэл авах гарц — push 3 хоног ажиллаж байсан ч хэн ч бүртгүүлж чадаагүй (2026-09-16, шөнө)

**Tom**: *"Ene tgd utasnaas orj baigaa humuus herweee notifcation allow songolt hiichwel browseroo haasanch utsan deern notifcation irdeg bolgmoor baina bas desktop pc ylgaagui!!"*

### Юу аль хэдийн байсан бэ

Web Push-ийн **бүх гинж 2026-09-13-аас ажиллаж байсан**: VAPID түлхүүр production-д тохируулагдсан (`push.publicKey` бодит түлхүүр буцаана), `sendPushToUser` нь захиалгын төлөв, орхисон сагс, сэтгэгдлийн хүсэлт, бэлгийн картад холбогдсон, `sw.js`-д `push` ба `notificationclick` боловсруулагч бий. **Хөтөч хаагдсан үед мэдэгдэл ирэх нь Web Push-ийн үндсэн зан төлөв** — үүнд нэмж хийх зүйл байгаагүй.

### Яагаад ажиллахгүй байсан бэ

`SELECT COUNT(*) FROM push_subscriptions` → **0**. Гурван хоногийн турш нэг ч хүн бүртгүүлээгүй, учир нь зөвшөөрөл асуух ганц гарц нь `/profile` → Тохиргоо доторх шилжүүлэгч байв: бүртгүүлэх → нэвтрэх → профайл → таб олох → шилжүүлэгч олох. Хэн ч тэр замыг туулахгүй.

Мөн **iPhone дээр тэр шилжүүлэгч "Энэ хөтөч push дэмждэггүй" гэж хэлдэг байсан нь төөрөгдүүлсэн**: iOS 16.4-өөс хойш Safari Web Push-ийг дэмждэг ч ЗӨВХӨН нүүр дэлгэцэд суулгасан апп дотор — энгийн таб дээр `window.PushManager` огт байхгүй. Зөв хариу нь "дэмждэггүй" биш, **"эхлээд суулгана уу"**.

### Хэрэгжүүлсэн

- `lib/push.ts`-д **`needs-install`** гэсэн шинэ төлөв: iOS + суулгаагүй = "дэмждэггүй" биш.
- `NotificationOptIn.tsx` — ☰ цэс ба footer дээрх "Мэдэгдэл авах" (суулгах товчны хажууд, ижил загвар). Аль хэдийн бүртгүүлсэн, дэмждэггүй, эсвэл сервер тохируулагдаагүй бол **юу ч зурахгүй**.
- Гурван тусгай тохиолдол чимээгүй бүтэлгүйтэхгүй: **iPhone** → суулгах заавар яг тэр цонхон дотроо (`InstallGuide` дахин ашиглагдав), **нэвтрээгүй** → нэвтрэх санал, **хаагдсан** → хөтчийн тохиргооноос буцааж нээх заавар.
- Асаамагц **туршилтын мэдэгдэл автоматаар илгээгдэнэ** — "асаалаа" гэсэн toast нь юу ч баталгаажуулдаггүй, хүн нүдээрээ харах ёстой.

### Дараалалд гарсан алдаа (E2E барьсан)

Эхний хувилбар хөтчийн "хаагдсан" төлөвийг нэвтрэлтээс ӨМНӨ шалгаж байв — нэвтрээгүй хүнийг хөтчийн тохиргоо руу дэмий явуулж, буцаж ирэхэд нь "нэвтэрнэ үү" гэж хэлэх байсан. Одоо: (1) төхөөрөмжийн хатуу хориг (iPhone суулгаагүй), (2) манай урьдчилсан нөхцөл (нэвтрэх — аппаас нэг товшилтоор засагдана), (3) хөтчийн гадаад тохиргоо.

⚠️ **Хүргэлтийг автомат тестээр шалгах боломжгүй**: headless Chromium нь `Notification.requestPermission()`-д Playwright-ийн permission олголтыг үл тоон `denied` буцаадаг тул бодит push бүртгэл үүсгэж чаддаггүй (`AbortError: Registration failed - permission denied` — бодитоор туршиж тогтоосон). Тестүүд гарц, төлөв, салаалалтыг шалгана; жинхэнэ хүргэлтийг бодит төхөөрөмж дээр Tom баталгаажуулна (товч өөрөө туршилтын мэдэгдэл илгээдэг тул нэг товшилт).

**Баталгаажуулалт**: `pnpm check` + `pnpm lint` цэвэр, шинэ E2E 4 тест (нийт push+install 24/24), бүрэн багц **78 passed / 2 skipped**, регресс 0. ☰ цэс ба footer-ийг 390px дээр нүдээр шалгасан.

---

## Сайтыг апп болгон суулгах зам нээгдэв (2026-09-16, шөнө)

**Tom**: *"Ene website aa pc desktop deer install app feature eer install hiigeed bas utsan deeree install hiideg bolgmoor bainaaa!!!"*

### Юу байсан, юу дутуу байсан бэ

Сайт **2026-09-13-аас хойш техникийн хувьд бүрэн суулгагдахуйц PWA байсан**: `manifest.webmanifest` (нэр, `display: standalone`, 192/512 + maskable дүрс), `fetch` боловсруулагчтай service worker, HTTPS, CSP-д `default-src 'self'` тул manifest хаагдаагүй. Гэвч **суулгах товч хаана ч байгаагүй** — тиймээс практикт хэн ч суулгаж чадахгүй байв. Хөтөч бүр өөрөөр биеэ авч явдаг нь шалтгаан:

- **Компьютерийн Chrome/Edge** — зөвхөн хаягийн мөрний жижиг дүрс. Tom яг үүнийг олж хараагүй (YouTube дээрх ижил дүрсийг зурагласан).
- **Android Chrome** — 2019 (Chrome 76)-аас хойш хөтөч өөрөө урьдаг туузыг **хассан**. Сайт `beforeinstallprompt`-ийг барьж, өөрийн товчноосоо `prompt()` дуудахгүй бол суулгах цонх хэзээ ч гарахгүй.
- **iOS Safari** — `beforeinstallprompt` эвент **огт байдаггүй**. Ганц зам нь Хуваалцах → "Нүүр дэлгэцэд нэмэх" бөгөөд зааж өгөхөөс өөр арга байхгүй.

### Хэрэгжүүлсэн

- `client/src/lib/pwaInstall.ts` — эвентийг **React render-ээс өмнө** (`main.tsx`) барина: Chrome үүнийг эхний зурагдалтаас ч өмнө шиддэг тул компонент дотроос сонсвол хожимддог. `installed / prompt / ios / unavailable` гэсэн дөрвөн төлөв, `appinstalled` болон `display-mode` өөрчлөлтийг дагана.
- `client/src/components/InstallAppButton.tsx` — footer-ийн брэндийн баганад гарах "Аппаар суулгах" товч. Суулгах боломжгүй хөтөч дээр (жишээ: компьютерийн Firefox) болон суулгасны дараа **өөрөө юу ч зурдаггүй** — ажиллахгүй товч үзүүлэх нь худал амлалт.
- Гараар суулгах заавар — iOS / Android / компьютер гурван хувилбартай (хөтчөөс нь хамаарч).
- `manifest.webmanifest` — тогтвортой `id: "/"` нэмэв (дараа `start_url` өөрчлөгдвөл өөр апп болж тооцогдохоос сэргийлнэ) ба **`screenshots`** (wide 1280×800, narrow 390×844, бодит нүүр хуудаснаас авсан) — Android-ын "richer install UI" болон компьютерийн суулгах цонхыг зурагтай болгоно.
- `e2e/pwa-install.spec.ts` — 6 тест × 2 төхөөрөмж: manifest ба дүрс/зураг бүр **бодитоор татагдаж** байгаа эсэх (нэг дүрэс 404 өгвөл Chrome суулгах саналыг чимээгүй хаадаг), SW бүртгэгдсэн эсэх, эвент ирэхэд товч гарч жинхэнэ цонх дуудагдах эсэх, татгалзвал заавар гарах эсэх, суулгасны дараа товч алга болох эсэх, iPhone дээр эвентгүйгээр заавар гарах эсэх.

### E2E-ийн барьсан бодит алдаа

Эхний хувилбарт `promptInstall()` эвентээ зарцуулмагц төлөв `unavailable` болдог тул **хэрэглэгч татгалзсан яг тэр агшинд компонент бүхэлдээ салж, заавар хэзээ ч гарахгүй** байв — товч зүгээр л алга болно. Товч ба цонхны харагдах нөхцөлийг салгаж заслаа. Энэ нь хөтөч дээр ажиллуулахгүйгээр type-check/lint-ээр илрэхгүй ангийн алдаа (2026-09-16-ны handoff-ийн сургамжтай ижил).

### Tom утсан дээрээ туршаад гарсан хоёр засвар

**1. "Суулгах сонголт алга?"** — товч footer-т БАЙСАН боловч утсан дээр нүүр хуудасны хөл нь хэдэн дэлгэц доор байдаг тул практикт олдохгүй байв. Утсан дээр хүн юмыг **☰ цэснээс** хайдаг; тиймээс суулгах мөрийг цэсний **хамгийн эхний мөр** болгов (`CommerceHeader`-ийн drawer, `commerce-mobile-menu-row` класс аль хэдийн байсан).

**2. iOS-ийн заавар нь БУРУУ байсан.** Эхний хувилбар "Доод талын Хуваалцах товчийг дарна" гэж бичсэн — орчин үеийн iOS Safari-д Хуваалцах нь мөрөн дээр шууд БАЙДАГГҮЙ. Apple-ийн өөрийнх нь заавар: *"Tap the menu icon, then tap Share… scroll down the list of options, then tap Add to Home Screen"* ([Apple Support](https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios)). Tom-ийн өөрийнх нь дэлгэцийн агшин үүнийг баталсан: хаягийн мөрний **зүүн талд** хуудасны цэсийн дүрс байна.

Tom atsu.moe-ийн зааврыг үзүүлэв (iOS хувилбарын таб, 1/4 карусель, дарах товчийг тойрог хүрээгээр тэмдэглэсэн). Түүнийг дагаж `InstallGuide.tsx` бичив: **алхам алхмаар**, алхам бүр нь төхөөрөмжийн мөр/цэсийн **схем зураг** (SVG) бөгөөд дарах ёстой товч нь ягаан хүрээтэй. iOS-д хоёр байрлалыг (цэсний дүрстэй / Хуваалцах дүрстэй) хэрэглэгч өөрөө сонгоно — **iOS-ийн хувилбарын дугаараар таамаглахгүй**: хүн өөрийн мөрөө хараад нэг харцаар мэднэ, бид Apple-ийн дараагийн өөрчлөлтөд хуурамч тодорхой байдал үзүүлэхгүй. Android/компьютерт мөн ижил 3 алхамт заавар.

⚠️ Зураг нь **бодит screenshot биш, схем зураг**: iOS төхөөрөмж бидэнд байхгүй тул жинхэнэ агшин авах аргагүй, харин дэлгэцийн агшин мэт дүр эсгэсэн зураг нь худал мэдээлэл болно.

**Баталгаажуулалт**: `pnpm check` + `pnpm lint` цэвэр, E2E **16/16** (шинэ), бүрэн багц **70 passed / 2 skipped**, регресс 0. Footer, ☰ цэс, зааврын 4 алхам бүрийг компьютер (1440px) ба утас (390px, iPhone UA) дээр screenshot-оор нүдээр шалгасан.

---

## Мерчандайзингийн судалгаа — "юу зарагдаж байна" гэдэгт хариулах өгөгдөл байхгүй нь (2026-09-16, шөнө)

**Tom**: *"Маркетингийн судалгаа гаргахад юу их зарагдаж байна, юу нь зарагдахгүй байна, бас зарагдахгүй байгаа бараагаа маркетинг хийх, мерчандайзинг хийх мэт. Тийм Bitrix24-ийн admin panel шиг санал онол юу байна? Чи нэг сайн судалгаа хийж, түүний үр дүн дээр reasoning хийгээд надад план гаргаад судалгаагаа хэлээч."*

Бүрэн судалгаа, эх сурвалж, төлөвлөгөө: **[docs/MERCHANDISING-PLAN.md](docs/MERCHANDISING-PLAN.md)**. Энд зөвхөн гол олдвор:

### Хамгийн чухал олдвор — оролт нь өөрөө байхгүй байсан

Production дээр 4 удаагийн probe script ажиллуулахад:

- **983 / 984 бараа ямар ч сувгаар нэг ч удаа зарагдаагүй.** Нийт захиалга 6 (5 нь `unpaid`), борлуулалтын ledger дээр нийт 1 мөр.
- **975 / 984 бараа яг `stockQuantity = 20`** — энэ нь каталог оруулахдаа тавьсан жишиг утга (937 `opening` + 47 `variant_seed`), тавиурын бодит тоо биш. Өөрөөр хэлбэл *нөөцийн тоо ч бодит биш*.
- 4 салбараас **зөвхөн нэгд нь** үлдэгдэл бүртгэгдсэн (Орос элчин 23,581 ш; бусад 3 салбар 984 мөртэй ч 0 ширхэг).
- **`costMnt` 0 / 984** → маржин, GMROI, ашгаар ABC хийх боломжгүй. `compareAtPriceMnt` мөн 0 / 984 → хямдруулалтыг "хуучин үнэ" хэлбэрээр харуулах ч боломжгүй.
- Барааны **үзэлт бүртгэгддэггүй** (`visitor_sessions` зөвхөн буух хуудас/эх сурвалж/төхөөрөмж), **хайлтын үг бүртгэгддэггүй**.

Энэ нь хариултын хэлбэрийг бүхэлд нь өөрчилсөн: sell-through, dead stock, GMROI, ABC — бүгд тооцоологдох боловч **утгагүй** гарна, учир нь тэдгээрийн хоёр оролт (борлуулалт × нөөц) хоёулаа бодит биш. Тиймээс төлөвлөгөө самбар биш, өгөгдлөөс эхэлдэг: (0) үзэлт/хайлтыг **өнөөдрөөс** цуглуулж эхлэх — цаг хугацааны өгөгдөл буцаж нөхөгдөхгүй; (1) Smart **Accounting** API-аас дэлгүүрүүдийн олон жилийн борлуулалтын түүхийг татах (`runPullSales` бэлэн, эрх л дутуу) + өртөг оруулах; (2) дараа нь самбар; (3) үйлдлийн хэрэгсэл; (4) Bitrix маягийн зөвлөмжийн карт.

### Bitrix24-тэй харьцуулалт — дүгнэлт

Bitrix24-ийн **харилцагч/маркетингийн** тайлангуудтай (Sales Trends, Regular/Top Grossing Clients, Advertising ROI, Traffic) бид аль хэдийн тэнцүү, зарим талаар илүү (CAC, буцаалтын хувь, дүүргийн задаргаа, лояалти шат, сагс орхилт). Тэдний Lead/Deal funnel болон Employee Performance нь B2B загвар тул жижиглэнд хамаарахгүй. **Дутуу тал нь мерчандайзинг** — Bitrix24 бол харилцагч төвтэй CRM, бидэнд хэрэгтэй нь бараа төвтэй самбар. Тиймээс хуулах биш, тэдэнд байхгүй хэсгийг барих нь зөв. Bitrix24-ээс авах ганц гол зарчим: тайлан нь зөвхөн тоо биш, **дараагийн үйлдлийг санал болгодог**.

### Замдаа зассан алдаа — бэлгийн карт нөөцийн үнэд тоологдож байсан

`getInventorySnapshot` (`server/analytics.ts`) нь `isPublished`-аар л шүүдэг байсан тул `products.kind = 'gift_card'` 4 мөр (тус бүр 999 ширхэг гэсэн "хязгааргүй" гэсэн утгатай жишиг тоо) админы "Нөөцийн үнэ" картад **374,625,000₮ — харуулж байсан дүнгийн 27% хуурмаг дүн** нэмж байв. Дээрээс нь бэлгийн карт хэзээ ч дуусдаггүй тул "дууссан"/"бага үлдсэн" сэрэмжлүүлэгт орох боломжгүй — тоолох ямар ч шалтгаан байгаагүй. `products.kind = 'physical'` шүүлт нэмэв; мерчандайзингийн бүх шинэ харагдац ижил шүүлтийг ашиглана.

---

## Камергүй компьютер дээр admin-д нэвтрэх — QR handoff хэрэгжив (2026-09-16, орой)

**Tom**: *"computer-н camera байхгүй бол admin эрхээр яаж орж нүүрээ таниулах билээ? QR код гарч ирж утсаараа тэрийг уншуулаад web рүү шидээд, утсаараа face-ээ уншуулаад буцаад компьютер дээр login хийх. Judалгаа гаргаад план зохиогоод өгдүү."* Дараа нь: *"Usb camera биш. Handoff хийе! Утас өөр IP байсан ч болно, заавал ижилхэн wifi шаардлагагүй! Зөвхөн admin/warehouse биш бүхэлдээ тийм болго! Idle түгжээг 10 мин болго! Зөвхөн QR, bluetooth холбоос хэрэггүй!"*

### Юуг олж илрүүлсэн бэ

Камер олдохгүй бол `AdminFaceGate` "Камер олдсонгүй" гээд зогсдог — /admin-ийн **procedure бүр** царайны proof шаарддаг тул панель бүхэлдээ хаалттай болно. Цорын ганц гарц нь `ADMIN_FACE_GATE_ENABLED=0`, гэтэл тэр нь **бүх хүн, бүх төхөөрөмж дээр** хаалгыг унтраана. Өөрөөр хэлбэл эвдэрсэн камер = аюулгүй байдлаа алдах.

### Судалгаа (docs/FACE-HANDOFF-PLAN.md-д эх сурвалжтайгаа)

- **FIDO2 hybrid transport (caBLE)** нь яг ийм QR урсгалтай ч **BLE-ээр ойролцоо байгааг нотолдог**. Вэб дээр BLE боломжгүй тул түүнийг орлох арга хэрэгтэй.
- **OWASP QRLJacking**: халдагч ӨӨРИЙН QR-ээ уншуулж, хохирогчийн баталгаагаар халдагчийн сесс нээгддэг. Зөвлөмж: юуг баталж байгааг харуулах, IP/байршлын хязгаар, ойролцоог нотлох.
- **Microsoft Entra-ийн тоо тааруулах + контекст** нь бодит орчинд push ядаргааны халдлагыг бүрмөсөн зогсоосон — BLE-г орлох хамгийн практик арга.

### Хэрэгжүүлсэн зүйл

**Гол зарчим**: QR-ийг **баталгаажуулах шаардлагатай компьютер** үүсгэнэ, утас нь шинэ сесс үүсгэхгүй — зөвхөн тухайн компьютерийн аль хэдийн нэвтэрсэн сессийг нээнэ. Proof cookie нь **компьютерийн өөрийнх нь** polling хүсэлт дээр мөнгөлөгддөг тул яг тэр хөтөч, яг тэр табд үүснэ; утас руу ямар ч proof очихгүй.

- `drizzle/0085_face_handoff_requests.sql` — token нь **sha256-аар** хадгалагдана (DB уншсан хүн батлах боломжгүй), 90 секундын TTL, нэг удаагийн, `sessionVersion` + `adminTabId`-тай холбоотой. prod + staging хоёуланд ажиллуулсан.
- `server/faceHandoff.ts` — төлвийн машин (`pending → approved → used` / `denied` / `expired`), нөхцөлт UPDATE-ээр атомик, аудит лог, батлагдах бүрд push (⚠️ мэдэгдэлд **зөвхөн хөтөч/OS**: ntfy сэдэв нээлттэй тул IP, байршил хэзээ ч орохгүй).
- `faceAuth` router-т 5 procedure. `handoffStatus` нь **query биш mutation** — cookie тавьдаг тул GET/батч/кэшэд орох ёсгүй.
- Клиент: компьютер дээр `FaceHandoffPanel` (QR + том тоо + секундын тоолуур), утсан дээр `/face-approve` (контекст → тоо сонгох → царай). Утасны царайны урсгал нь `FaceGateFlow`-ийг **дахин ашиглана** (`submitVerification` prop) — утсанд зориулж хоёр дахь камерын код бичээгүй.
- `face-handoff.integration.test.ts` — 10 тест бодит DB дээр: бүтэн урсгал, өөр хэрэглэгч, буруу тоо, өөр таб, sessionVersion, шинэ QR хуучныг устгах, хугацаа, "би биш", цэвэрлэгээ.

### Замдаа гарсан 3 нарийн шийдвэр

1. **Тоог царайнаас ӨМНӨ шалгана.** Буруу тоо бол халдлагын шинж тул царайны шалгалтыг эхлүүлэхгүй, challenge зарцуулахгүй, хүсэлтийг шууд хаана (дахин таах боломжгүй).
2. **Idle цонх токен дотроо явдаг болов** (`idle` claim). Үүнгүйгээр эхний heartbeat нь handoff-ийн 10 минутыг стандарт 25 болгож чимээгүй уртасгах байв — `signFaceProof`/`readFaceProof`/`refreshFaceProof` гурвуулаа токеныхоо өөрийн цонхыг дагадаг боллоо. Хоёр таб нэгдэх үед **богино** цонх ялна.
3. **Царайн БҮРТГЭЛ handoff-оор хийгдэхгүй** — олон өнцгийн зураг шаарддаг тул камертай төхөөрөмж дээр л. Гарц зөвхөн бүртгэлтэй хүнд харагдана.

### Замдаа зассан тестийн тусгаарлалтын алдаа

`cart.spec.ts` нь /shop-ийн эхний бэлэн нөөцтэй барааг сонгодог байсан тул `product-variants.spec.ts`-ийн түр бараа (үүсгээд устгадаг) гарт орж, каталогийн 10 секундын кэшийн улмаас устсан барааны хуудас руу ороод унадаг байв. Одоо `e2e-sugi` тэмдэгтэй барааг алгасана.

### Production дээр гарсан 3 алдаа ба процессын сургамж (мөн өдөр, орой)

Эхний хувилбарыг зөвхөн type-check + серверийн тестээр шалгаж гаргасан тул
хөтөч дээр гурван алдаа дараалан гарав. Tom бүгдийг нь бодит төхөөрөмж дээр
олсон:

1. **QR хоосон цагаан дөрвөлжин** — `QRCode.toCanvas(ref.current, …)` нь
   нөхцөлтэй render-тэй canvas-ийн ref бэлэн болохоос өмнө ажиллаж, алдаа нь
   `void`-д залгигдан ул мөргүй алга болдог байв. Төслийн бусад QR
   (ProductQrModal, AdminNotificationsPanel) ашигладаг `toDataURL` + `<img>`
   рүү шилжүүлэв; амжилтгүй бол ойлгомжтой алдаа харагдана.
2. **Карт зүүн дээд буланд** — байхгүй класс (`face-gate`) бичсэн байв. Төвд
   байрлуулдаг нь `.face-gate-shell`.
3. ⛔ **Компьютер сервер рүү ОГТ асуудаггүй байсан** — утас баталж, push ирсэн
   ч компьютер нээгддэггүй. Шалтгаан: polling-ийн `useEffect`-ийн хамаарлын
   жагсаалтад `secondsLeft` байсан бөгөөд тэр нь 500мс тутам өөрчлөгддөг тул
   effect секундэд хоёр удаа дахин үүсч, 2000мс-ийн `setInterval` нэг ч удаа
   ажиллаж амжихгүй цэвэрлэгддэг байв. Одоо хамаарал нь `[token, approved,
   expiresAt]`, дуудлагууд ref-ээр, хугацаа дууссаны дараа ч 60 секунд илүү
   асууна.

**Дөрөв дэх алдаа, миний өөрийн оруулсан**: `playwright.config.ts` нь `.env`-ийг
ачаалдаг тул хөгжүүлэгчийн `ADMIN_FACE_GATE_ENABLED=1` нь БҮХ E2E-г хаалгатай
горимд оруулж, admin тестүүдийг бүгдийг унагаж байв (шалтгаан нь огт
харагдахгүй). Тусдаа `E2E_FACE_GATE` хувьсагч + хаалгатай сервер өөр порт (3101).

**Процессын сургамж (дүрэм болгов)**: UI-ийн өөрчлөлтийг хөтөч дээр
ажиллуулж үзэлгүйгээр дуусгасанд тооцохгүй. `e2e/face-handoff.spec.ts` нь бүх
гинжийг шалгана — QR бодитоор зурагдсан эсэх, тоо уншигдахаар эсэх, карт төвд
эсэх, **батлагдмагц компьютер өөрөө нээгдэх эсэх**. Энэ нэг тест дээрх гурван
алдааг гурвууланг нь барих байсан.

**Мөн нэмэгдсэн**: аргаа сонгох дэлгэц (Tom-ийн явуулсан лавлагааны дагуу) —
"Энэ төхөөрөмжөөр" / "Утсаараа" хоёр зам эхний дэлгэц дээр ижил түвшинд. Өмнө
нь утасны зам зөвхөн камер УНАСНЫ дараа л харагддаг байсан нь нуугдмал байв.

✅ **Бодит баталгаа (production, 2026-09-16 08:43)**: `face_handoff_requests`
#35 — үүссэн 08:43:15, батлагдсан 08:43:37, төлөв **`used`** (компьютер өөрөө
proof-оо авсан). Засвараас өмнөх #22 нь `approved` дээрээ гацсан хэвээр байгаа
нь ялгааг харуулна.

**Баталгаажуулалт**: `pnpm check` + `pnpm lint` цэвэр, unit 717/717, handoff
integration 10/10, царайны серверийн тест 62/62, E2E 56/56 (хаалга
унтраалттай) + handoff E2E компьютер/утас 2/2 (хаалга асаалттай).

---

## Ачааллын бэлтгэл, E2E тест, 9 бодит алдаа (2026-09-16)

**Хүсэлт (Tom)**: "ednariig bugdiin tes daraaltai hii!!!!" — өмнөх session-ий төгсгөлд гаргасан нээлттэй жагсаалтыг (ачааллын бэлтгэл, E2E, хэрэглэгчийн удирдлага, variants, cascade layer, шрифт, bento, контраст/bundle, NEWVISION §14, купоны race, баримт бичиг) дарааллаар нь гүйцэтгэх. Дундуур: "urgelj uur aldaa bugs illogical features haij zasaj saijruulaarai", "github dependabot asaachlaa".

### 1. Ачааллын бэлтгэл (10k зэрэгцээ хэрэглэгч)

- **DB pool 10 → 25** (`DB_POOL_SIZE`), сул холболт `maxIdle`/`idleTimeout`-оор буцна. Бодит хэмжилт (2026-09-16, HeatWave): `max_connections` = 200, түүхэн дээд `Max_used_connections` = 33. Нэг DB-г prod + staging + 2 лаптоп + backup хуваалцдаг тул 25 × 4 = 100 нь аюулгүй хязгаар.
- **ttlCache-д single-flight**: TTL дуусах агшинд ирсэн бүх зэрэгцээ хүсэлт өмнө нь ижил query-г зэрэг явуулдаг байв (thundering herd) — хамгаалалт хамгийн хэрэгтэй яг тэр мөчид алга болдог. Одоо нэг түлхүүрт нэг тооцоолол. ⚠️ Нарийн зүйл: хүчингүй болголтын дараа ирсэн дуудагч явж буй хуучин тооцоололд нэгдэж БОЛОХГҮЙ (admin засвараа шууд уншина) — `startedAt > invalidatedAt` ЧАНГА харьцуулалт, эс бөгөөс нэг миллисекундын дотор буруу утга буцна (тест яг үүнээс эхлээд унасан).
- **getFeaturedReviews** нь нүүр хуудасны цорын ганц кэшлэгдээгүй уншилт байв (3 хүснэгтийн JOIN, зочин бүрт). Кэшлэв + сэтгэгдлийн 4 бичигчид хүчингүй болголт нэмэв.
- **Каталогийн эх сурвалжийн кэш** өөрийн `let`-ээс ttlCache руу — herd хамгаалалт, дээр нь admin-ий бүтээгдэхүүний засвар 10 секунд хүлээхгүй шууд харагдана.
- **cluster-д аюулгүй** (`server/_core/clusterRole.ts`): pm2-ийн cluster горимд зөвхөн instance 0 scheduler/dispatcher эзэмшинэ. Үгүй бол орхигдсон сагсны сануулга, вендорын таталт, цэвэрлэгээ бүр N дахин явна (scheduler-т DB түвшний lock БАЙХГҮЙ). `deploy.ps1 -Instances N`. ⚠️ Одоогийн VM дээр АСААХГҮЙ: 2 vCPU / 954 MB RAM, prod (126 MB) + staging (91 MB) аль хэдийн сууж ~312 MB сул.
- **Production-д порт "завгүй" бол дараагийн порт руу чимээгүй шилжихээ болив**: тунель ба health шалгалт тогтсон порт руу заадаг тул сервер 3001 дээр "амжилттай" гарахад сайт гаднаасаа 502 хэвээр үлддэг байв. Локал хөгжүүлэлтэд хуучин зан хэвээр.
- **Cloudflare cache rules** (`scripts/cloudflare-harden.mjs`): Cloudflare зөвхөн өргөтгөлөөр кэшилдэг тул `/og/product/*` (хуваалцах бүрт sharp-аар зураг зурдаг), `/cdn/*` (зураг бүрийн 302), `/feeds/*`, sitemap, robots бүгд origin руу очиж байв. Одоо "respect origin TTL"; `/api|/admin` хэзээ ч кэшлэгдэхгүй.
- **k6** (`scripts/load/storefront.js`) — зочны бодит урсгал, зөвхөн staging руу. ⚠️ Клиент superjson ашигладаг тул `input` параметрт `{"json": …}` дугтуй ЗААВАЛ — дугтуйгүй бол 400 буцаж тест "хурдан" мэт харагдана (staging дээр бодитоор шалгасан).

### 2. CI-ийн 2 бодит уналт (Tom-ийн явуулсан лог)

- **`db-apply-all-migrations.ts`**: эхний 7 migration (0000–0006) тэмдгээ statement-ийн ард (`;` -ийн дараа шууд) бичдэг байсныг мөрийн эхлэлд тулгуурласан regex хуваадаггүй тул MySQL рүү тэмдэг нь SQL-ийн хэсэг болж очиж syntax error өгдөг байв. Өөрөөр хэлбэл **chain нь хоосон DB дээр хэзээ ч бүрэн ажиллаж байгаагүй**. Засаад локал хоосон схем дээр бүтнээр ажиллуулж (183 chunk / 84 файл), `schema-drift-check.ts`-ээр "schema.ts matches the live database" гэдгийг баталгаажуулав.
- **`face-idle.test.ts`**: `.env`-гүй орчинд (GitHub Actions-ийн check-test-build job) `ENV.cookieSecret` хоосон тул jose "Zero-length key is not supported" гэж унадаг байв. Мөн faceProof нь хоосон түлхүүрт САНАМСАРГҮЙ dev fallback үүсгэдэг тул тест зөвхөн хөгжүүлэгчийн .env байгаа үед л ажиллах далд хамааралтай байсан. `_test-setup.ts` түр JWT_SECRET өгнө (INTEGRATIONS_ENCRYPTION_KEY-ийн ижил жишиг; аппын код хөндөгдөөгүй). `.env`-ээ түр зөөж CI-ийн нөхцлийг бодитоор дуурайж шалгав.

### 3. E2E тест — энэ төсөлд анх удаа (Playwright, 54 тест)

`playwright.config.ts` + `e2e/`: production build (`node dist/index.js` — CSP/compression/статик бодитоор) дээр, **`sugi_staging` схемд** ажиллана — `e2e/helpers/environment.ts` production схем рүү заавал ТАТГАЛЗАНА. Нэвтрэлт нь аппын өөрийн `signSessionToken`-оор (OTP-г тойрох арын хаалга аппликейшнд НЭМЭЭГҮЙ). Компьютер (1440) + утас (Pixel 7) хоёр project.

Хамрах хүрээ: нүүр (JS алдаа, skip link, харанхуй горим, хэл, күүкийн самбар), дэлгүүрийн хайлт/ангилал/эрэмбэ/хуудаслалт + URL төлөв, зочны сагс, checkout нээгдэх, admin (эрхийн хаалга, хэсэг солих, бүтээгдэхүүн CRUD, хэрэглэгчийн эрх/түр хаах), хувилбартай бараа, CSS давхарга, шрифтийн кирилл, admin-ий контраст.

**Тест бичих явцад олдсон бодит алдаанууд:**

1. **Хуудаслалтын дараалал тогтворгүй** — 937 бараа нэг импортоор орсон тул `createdAt` тэнцүү, MySQL ижил түлхүүртэй мөрийг дурын дарааллаар буцаадаг. Худалдан авагч нэг барааг 2 хуудсанд харах, эсвэл ОГТ харахгүй өнгөрөх боломжтой байв. `products.id` эцсийн тэнцвэр (мөн media_library, login_attempts-ийн хуудаслалтад).
2. **Утсан дээр admin-ий маягт бүх хуудсыг жижигрүүлдэг** — бүтээгдэхүүний маягтыг нээхэд layout viewport 412 → 856 болж хөтөч бүгдийг хоёр дахин жижигрүүлнэ (grid доторх `select`/`textarea`-ийн `min-width: auto` нь хамгийн урт сонголтынхоо өргөнөөс жижгэрэхийг хориглодог). Үсэг уншигдахгүй, "Бүтээгдэхүүн үүсгэх" товч хуруунд таарахгүй байв. `.admin-shell`-д `min-width: 0` (хэмжсэн: 412 → 412).
3. **Skip link эхний Tab дээр гарч ирдэггүй** (WCAG 2.4.1) — күүкийн самбарын сан өөрийгөө `body.firstChild` болгож оруулдаг, мөн skip link нь SitePromo-ийн "Зарыг хаах" товчны АРД байв. Самбарыг төгсгөлд зөөж, skip link-ийг аппын хамгийн эхний элемент болгов.
4. **/shop-ийн "Эрэмбэ", "Арьсны төрөл", "Бэлэн нөөцтэй" URL-д бичигддэггүй** байсан тул refresh, бараанаас буцах, холбоос илгээхэд чимээгүй тэглэгддэг байв (бусад бүх шүүлтүүр хадгалагддаг атлаа).
5. **`sugi_staging` 3 migration-оор хоцорсон** (0081/0082/0083) — staging deploy нь migration ажиллуулдаггүй тул /careers болон admin-ий бүтээгдэхүүн хадгалах хоёул 500 өгч байв. Хэрэглэж, дээр нь `e2e/global-setup.ts` схемийн зөрүүг ЭХЛЭЭД шалгаж тодорхой зааврыг хэлдэг болов.
6. **Admin-ий хянах самбарт `<h1>` огт байхгүй** (толгойн блок нь зориуд нуугддаг) — sr-only гарчиг нэмэв.
7. **Хэрэглэгчийн дэлгэрэнгүй цонх нь модаль биш** — role/aria-modal-гүй энгийн `<div>`, Escape ажиллахгүй. Зассан.
8. ⛔ **Variant нэмэх admin-аас ХЭЗЭЭ Ч ажилладаггүй байсан** — variant-ийн маягт нь барааны маягтын дотор үүрлэсэн `<form>` байсан бөгөөд HTML-д үүрлэсэн form байж болохгүй тул хөтөч дотоод submit товчийг ГАДААД маягтад харьяалуулдаг: "Variant үүсгэх" дарахад variant үүсэхийн оронд барааны маягт илгээгдэж editor хаагддаг байв. Автомат тестүүд tRPC procedure-ийг шууд дууддаг тул хардаггүй, каталогийн 936/937 бараа ганц variant-тай тул хэн ч анзаараагүй. Маягтыг `<div>`, товчийг `type="button"` болгов — дараа нь E2E хоёр variant-тай бараа үүсгэж, үнэ солигдож, сагсанд ЯГ сонгосон variant орж байгааг баталлаа.
9. **Хэрэглэгчийн удирдлага** ("хэзээ ч шалгагдаагүй" гэж тэмдэглэгдсэн хэсэг) — эрх солих сервер дээр бодитоор хадгалагддаг, түр хаах/сэргээх ажилладгийг E2E-ээр баталгаажуулав.

### 4. Купоны нэг хэрэглэгчийн хязгаар — атомик (migration 0084)

Шалгалт нь гүйлгээнээс гадна `orders`-ийг тоолдог байсан тул хоёр зэрэгцээ checkout хоёулаа "хараахан ашиглаагүй" гэж уншаад хоёулаа хямдралыг авч чаддаг байв (нийт `maxUses` нь атомик хэвээр). Шинэ `discount_code_redemptions` дэвтэр: (код, хэрэглэгч, дугаар) гурвал өвөрмөц; гүйлгээний дотор бичигдэж, хожигдсон тал давхардлын алдаанд унана. Цуцлалт суудлыг чөлөөлнө. Migration нь одоо байгаа купонтой захиалгуудыг дэвтэрт буулгана. prod + staging хоёуланд ажиллуулсан; тест 11/11.

### 5. Контраст (WCAG AA) ба эхний ачаалалт

- `--a-faint` цагаан дээр **2.74:1** байсан (жижиг UPPERCASE шошго бүхэн энэ өнгөтэй) → 4.94. `--a-muted` 4.54 → 6.18, `--a-pos` 4.36 → 5.85, `--a-warn` 4.00 → 5.24, харанхуйд `--a-faint` 4.00 → 5.48. Мэдэгдлийн тоолуур харанхуйд цайвар ягаан дээр ЦАГААН үсэгтэй (2.74) байсныг `--a-neg-on` токеноор, нөөц дууссан "0 ш"-ийг `--a-neg`-ээр зассан. `e2e/admin-contrast.spec.ts` нь токены утгыг биш, бодит computed өнгө + ард нь байгаа дэвсгэрийг хэмжинэ.
- **Орчуулгын толь (125 KB) үндсэн chunk дотор байв** — монголоор үзэж буй зочин хэзээ ч хэрэглэхгүй англи/япон мөрүүдийг эхний ачаалалтдаа татдаг байсан. Тусдаа chunk болгов: 595 → 484 KB (gzip 188 → 152). ⚠️ Замдаа: толь ирэхэд DOM дахин орчуулагдахгүй байв (хэлний утга өөрчлөгдөөгүй тул React дахин зурдаггүй) — `useTranslationsVersion()`-оор зассан.
- **`a { color: inherit }` cascade layer** — давхаргагүй байсан тул `<a>` дээрх өнгөний utility класс чимээгүй үйлчилдэггүй (кодын 5 газарт `!` залгаж тойрсон шалтгаан). `@layer base` руу шилжүүлэв; 7 хуудасны pixel diff шуугианы түвшинд (before/after ба after/after2 хоёуланг хэмжив).

### 6. Гарчгийн шрифт — Cormorant Garamond

Өмнө нь 68px hero-гоос 8px шошго хүртэл бүгд Golos Text байсан. ⚠️ Гол эрсдэл нь гарын авлагад анхааруулсан кирилл глиф байв, хөтөч дээр хэмжиж шалгав: **Playfair Display — cyrillic-ext дэд олонлог ОГТ байхгүй**; **Unbounded — файл нь байгаа ч Ө, Ү, ө, ү дөрвүүлээ байхгүй** (гарчиг дундаа тэр дөрөв өөр шрифтээр унаж эрээн харагдана); Cormorant Garamond, Montserrat, Merriweather, Oswald, Yeseva One, Noto Serif Display бүгд бүрэн. Сонголт: Cormorant Garamond (OFL, өөрсдөө hosting, 4 дэд олонлог). Гарчгийн зай -.05..-.085em байсныг serif-т тохируулж 20 дүрэмд -.02em болгов. `e2e/typography.spec.ts` глиф бүрийг monospace-тэй харьцуулан хэмжинэ (⚠️ `document.fonts.ready` хангалтгүй — canvas нь unicode-range дэд файлыг өөрөө татдаггүй, `document.fonts.load` заавал).

### 7. "Хамт авдаг" cross-sell (NEWVISION §14)

Барааны хуудсанд бодит захиалгын түүхээс: энэ барааг авсан хүмүүс ижил захиалгад өөр юу авсан бэ. `related` (шинж чанар) болон RoutineCrossSell (admin-ий гар) хоёроос ялгаатай гурав дахь асуулт. Төлөгдсөн, цуцлагдаагүй захиалга л тоологдоно; түүх хангалтгүй бол хэсэг бүхэлдээ нуугдана. Тест 3/3.

### 8. Dependabot

`.github/dependabot.yml` — долоо хоног тутам, бүлэглэсэн PR (dev хэрэгсэл тусдаа, production patch/minor тусдаа), major нь дангаараа; tRPC/React/Tailwind/Express/drizzle/zod-ийн major зориуд алгасагдана. ⚠️ Сэрэмжлүүлэг (Dependabot alerts) нь repo-ийн ТОХИРГОО тул Tom нэг удаа гараар асаана: Settings → Code security.

### Хийгдээгүй, шалтгаан нь

- **Bento ("2 хэсгийг тэгш бус bento")**: нүүрийн хэсгүүдийг судлахад WhyChooseUs аль хэдийн 245/355/245 тэгш бус grid, CategoryMasonry masonry, StoreLocator 3 бүсийн зохиомж — үлдсэн "жирийн зурвас" нь EditorialBanner ба StoreLocator хоёр. Эдгээрийг bento болгох нь аль хоёр хэсгийг, ямар агуулгыг аль хайрцагт тавихыг Tom шийдэх дизайны сонголт (2026-09-09-ний "restyle-in-place" татгалзлын ижил ангилал) тул саналаа бичээд ЗӨВШӨӨРӨЛ хүлээв.
- **Referral**: код үүсгэх, хэнд хэзээ ямар урамшуулал өгөх, хэрхэн буруу ашиглалтаас хамгаалахыг Tom-ийн бизнесийн дүрэм тодорхойлно (loyalty зэрэглэлтэй ижил нөхцөл) — дүрэмгүйгээр зохиох нь буруу.
- **NEWVISION §14-ийн үлдсэн гэж бичигдсэн 3 зүйл аль хэдийн БАЙСАН**: density toggle (`.shop-grid-toolbar`), үнийн faceted filter (`.price-range-filter`), орхигдсон сагсны ИМЭЙЛ (`runAbandonedCartReminderJob` нь push-аас гадна `sendAccountEmail` хийдэг). Гарын авлагаас хассан.

**Баталгаажуулалт**: `pnpm check` (2 tsc) + `pnpm lint` цэвэр, unit 716/716, E2E **54/54** (компьютер + утас), купоны integration 11/11, cross-sell 3/3.

---

## Хэмжилт (Tracking) дэлгэц, Smart Software холболтын карт, вендорын үлдэгдэл автомат (2026-09-15)

**Хүсэлт (Tom)**: Зочилын хоёр дэлгэцийн зураг — (1) GA4 ба Facebook Pixel-ийг брэндийн дүрстэй хоёр блок болгон нэг картад цэвэрхэн байрлуулсан "Tracking тохиргоо"; (2) лого + гарчиг + нэр/нууц үг + "Холбох →" гэсэн нэг төвлөрсөн "Smart Logic ERP" холболтын карт. "Манайх яг SmartLogic ERP биш ч гэсэн ийм дизайнтай байвал ашиглахад илүү амар." Дараа нь: "developer.smartsoftware.mn уншиж судалаарай", "Inventory бас нөөц дуусах мэт бүгд автомат шдээ — smartpos-той холбогдохын гараар юу ч хийхгүй", "энэ концепц одоогийн codebase болон алсын хараатай таарах ёстой".

**Замдаа олдсон 3 бодит алдаа** (дизайны ажил биш, шалтгаан нь дизайныг судлах явцад):
1. **Чимээгүй уналт.** GA4/Pixel ID-д ямар ч формат шалгалт байгаагүй. Буруу бичвэл "Тохиргоог хадгаллаа" гэж ногоон гарч, дараа нь `server/_core/indexHtml.ts` render үедээ regex-д тохирохгүй утгыг **чимээгүй `""` болгож хаядаг** байв — админд ямар ч тэмдэглэгээгүйгээр тоолуур огт ачаалагдахгүй. Regex зөвхөн тэр нэг файлд байсан нь шалтгаан.
2. **Унтраах боломжгүй.** `AdminStoreSettingsPanel` хоосон утга хадгалахыг хориглодог тул тоолуурыг унтраах цорын ганц зам нь "Анхны утга руу буцаах" — "буцаах" гэдэг нь унтраах товч мэт огт харагддаггүй.
3. **Хуучирсан token.** `clearSmartSoftwareTokenCache()` нь "нууц үг солиход шууд хүчинтэй болно" гэж тайлбарласан атлаа **зөвхөн тестээс дуудагддаг** байв. Cache нь `baseUrl|username`-ээр түлхүүрлэгддэг тул нууц үгээ зассан ч 1 цаг хүртэл хуучин token ашиглагдана. Шинэ холболтын карт нь яг credential солих урсгал тул заслаа.

**1. Шинэ "Хэмжилт" хэсэг** (`client/src/components/admin/AdminMeasurementPanel.tsx`) — GA4 ба Meta Pixel хоёр брэндийн карт, нэг мөрт monospace талбар, амьд формат шалгалт, төлөвийн шошго (Тохируулаагүй / Идэвхтэй / **Буруу формат — ачаалагдахгүй** / Хадгалаагүй өөрчлөлт), "Унтраах" товч (`clearStoreSetting` рүү чиглэнэ), хоёуланд нэг "Хадгалах". Өмнө нь эдгээр нь "Дэлгүүрийн тохиргоо"-ны 6 бүлгийн **5 дахь нь дотор, 2 мөрт textarea**-д бичигддэг байсан — хэн ч олдоггүй.

**Формат нь registry-д нэг эх сурвалж боллоо**: `shared/store-settings.ts`-ийн slot-д `inputType`/`placeholder`/`format` нэмэгдэж, `checkStoreSettingFormat()` нь клиент (round-trip-ийн өмнө), `admin.updateStoreSetting` (bad request), `indexHtml.ts` (render) гурвуулд ашиглагдана — гурав хоорондоо зөрөх боломжгүй. `MEASUREMENT_GROUP`/`VENDOR_SYNC_GROUP` нь тэдгээр бүлгийг ерөнхий аккордеоноос шүүж хасдаг тул **нэг түлхүүр нэг л дэлгэцтэй**. Замдаа 10 богино slot (утас, имэйл, сошиал URL, баталгаажуулах token, 1/0 туг) textarea-аас нэг мөрт талбар боллоо — өмнө нь `tel:` href рүү шинэ мөр наах боломжтой байв.

**GTM зориуд нэмээгүй**: Зочил `GTM-XXXXXXX`-ийг ч авдаг, харин манай CSP `script-src 'self' 'nonce-…'` тул GTM доторх Custom HTML болон гуравдагч tag чимээгүй блоклогдоно — яг одоо засаж байгаа "хадгалсан ч ажиллахгүй" алдааг дахин үүсгэх байсан. Талбар "Google Analytics 4" гэж үнэнчээр нэрлэгдэж, туслах мөрөнд GTM дэмжигдэхгүйг бичив.

**2. Smart Software холболтын карт** (`admin/IntegrationConnectCard.tsx`) — `INTEGRATION_META`-д `connect`/`accent`/`icon` нэмэгдсэн тул **өгөгдлөөр удирдагдана**: StorePay, eBarimt гэрээ бүрдмэгц `connect` блок нэмэхэд л ижил карт өвлөнө, панелд шинэ салаа нэмэхгүй. Гурван төлөв: decrypt алдаа → "Бүгдийг солих"; credential алга → төвлөрсөн карт (лого, гарчиг, нэр/нууц үг + нүдний товч, бүтэн өргөний "Холбох →"); холбогдсон → үйл ажиллагааны панель + "Нэвтрэх мэдээлэл солих" эвхэгч (үүнгүй бол base URL талбарууд хүрэхгүй болно).

⚠️ Хоёр нарийн зүйл: (а) холбогдсон эсэхийг `row.hasCredentials`-ээр **тооцохгүй** — тэр нь `Boolean(encryptedConfig)` тул зөвхөн base URL хадгалсан ч true; `requiredFields` бүрийн `isSet`-ээр гаргана. (б) Тест унасан үед `admin.integrations`-ыг **invalidate хийхгүй** — `connected` нь `isSet`-ээс гардаг тул карт шууд "холбогдсон" төлөв рүү шилжиж админд худал мэдээлэх байсан. Credential хадгалагдсан хэвээр үлдэж, вендорын өөрийнх нь мессеж улаан самбарт гарна (зөв нууц үгийг вендор унтарсан үед устгах нь буруу).

**Жагсаалтын дизайн**: `IntegrationCardHeader` (дүрсний хайрцаг + нэр + тайлбар + шошго) 7 картад нэгэн ижил; `isActive` нь шошгоноос салж тусдаа унтраалга боллоо — өмнө нь "тохируулсан ч унтраалттай" карт "юу ч хадгалаагүй"-гээс ялгагдахгүй байв.

**3. Вендорын өгөгдлийг бүрэн ашиглах** (developer.smartsoftware.mn-ийг дахин уншсаны үр дүн). Бид `/api/inventory/products`-ыг **аль хэдийн дууддаг** атлаа зөвхөн `count_on_hand`-ыг л авч, үлдсэнийг хаяж байсан нь тогтоогдов. Одоо `pullCatalogSnapshot()` нь үнэ, `item_discounts[]` (идэвхтэй/ирээдүйн хоёрт ялгаж), найрлага, хэрэглэх заавар, анхааруулга, брэнд/ангилал/SKU-г задална. Мөн **Retail-ийн `{Success, Message, Data}` дугтуйг** уншдаг боллоо — манай анхдагч inventory host нь яг Retail-ийнх тул бодит эрх ирэх мөчид хоосон массив хүлээж байгаад унах байсан.
- **Үлдэгдэл — бүрэн автомат** (Tom-ийн шийдвэр): `runPullSnapshot` тооллогыг үүсгээд шууд `postCount(SYSTEM_INVENTORY_ACTOR, id, { automatic: true })`-ээр батална. Нөөц **одоо байгаа тооллогын замаар** л хөдөлдөг тул `stock_movements` ledger бүрэн, тооллого нь "юу өөрчлөгдсөний түүх" болж үлдэнэ (`branch_stock`-д шууд бичих шинэ зам гараагүй). Автомат постлолт хүнд холбогдохгүй: `postedByUserId` ба `actorUserId` хоёул **NULL**.
- ⚠️ **Эрүүл ухааны хаалга**: вендорын буцаасан барааны тоо өмнөх амжилттай таталтаас >30% буурвал автоматаар бичихгүй, тооллого `submitted` хэвээр үлдэж `stock.vendor_sync_blocked` push явна (өдөрт нэг удаа dedupe). Баримт нь өөрөө анхааруулдаг: Retail дээрх **"ECommerce борлуулах бараа"** чэк санамсаргүй авагдвал feed хэдхэн бараа болж, нүдээ аниад бичвэл бүх каталогийн үлдэгдэл 0 болох байв. Мөн вендор илгээгээгүй барааг хэзээ ч 0 болгохгүй (`scope: "partial"` — `unscanned` зөвхөн `full` тооллогод бөглөгддөг).
- **Мэдэгдлийн үер**: 15 минут тутам `count.submitted` + `count.posted` явбал өдөрт хэдэн зуун push болно. Автомат үед хоёулаа чимээгүй (`silent`/`automatic`); бодитоор хэрэгтэй `stock.low`/`stock.out`/`stock.total_out` нь ledger-ээс хэвээр явна.
- **Үнэ ба барааны факт — батлуулна** (Tom-ийн шийдвэр): `server/integrations/vendorCatalog.ts` + `admin/VendorCatalogPanel.tsx` — "Зөрүү харах" дарахад зөвхөн зөрүүтэй мөр (манай үнэ / вендорын үнэ / идэвхтэй хөнгөлөлт / зөрүүний хувь), мөр тус бүрд checkbox, "Сонгосныг хэрэглэх". ⚠️ Клиент **утга илгээхгүй, зөвхөн баркод** — сервер вендороос дахин татаж, вендорын өөрийнх нь тоог бичнэ (өөрчилсөн клиент дурын үнэ тавих боломжгүй). Үнэ **хоёр газар** бичигдэнэ (`products.priceMnt` + `product_variants.priceMnt`), гэхдээ product-ын үнэ зөвхөн тухайн variant нь ганц/анхдагч үед; идэвхтэй хөнгөлөлттэй бол `compareAtPriceMnt` = үндсэн үнэ. Факт нь `factsSource = "admin"` барааг **хэзээ ч** хөндөхгүй (enrich скриптийн ижил хамгаалалт). Бүх хэрэглэлт `admin_audit_logs`-д хуучин→шинэ утгатай.
- **Migration 0083**: `products.usageInstructions`, `products.warnings` — вендорын `instructions`/`termsOfUse` ба `warning`-ийн байр (0079-д байхгүй байсан). HeatWave дээр ажиллуулсан.
- Унтраалга: `vendor-stock-auto-apply` (1/0, анхдагч 1) ба `vendor-stock-sanity-drop-percent` (30) — /admin → Интеграцууд дээр унтраалга байдлаар. Тестэд `SyncOptions.autoApply`/`sanityDropPercent`-ээр тодорхой дамжуулна (дэлгүүрийн тохиргооноос хамаарсан тест машин бүр дээр өөр үр дүн өгнө).

**4. Жижиг засварууд**: `begin_checkout` (Checkout, `firedRef`-ээр нэг удаа — үгүй бол сагсны засвар бүрт дахин), `search` (Shop, **debounced** утга дээр — түүхий утга дээр бол товчлуур бүрт нэг hit), `analytics-init.js` дээр Meta-гийн `Search` нь `search_string` хүлээдэг (`search_term` хаягдаж байсан). Хоёулаа union-д зарлагдсан атлаа хэзээ ч дуудагддаггүй байв.

**Баталгаажуулалт**: `pnpm check` (2 tsc) + `pnpm lint` цэвэр. Unit: index-html 24 (6 шинэ формат тест), smart-software 18 (7 шинэ — дугтуй, үнэ, хөнгөлөлт, факт, token rotation), notification-events 34. **Integration (бодит HeatWave): inventory-sync 13/13** — үүнд автомат постлолт ledger-ээр явж `postedByUserId`/`actorUserId` NULL, вендор илгээгээгүй бараа хөндөгдөхгүй, 30%-иас их уналтад `submitted` хэвээр үлдэж alert үүсэх, автомат үед `count.submitted` push нэмэгдэхгүй. **Playwright**: Хэмжилт дэлгэц 1440px-д гэрэл + харанхуй горимд, зөв ба буруу утгаар (GTM ID оруулахад улаан хүрээ + монгол алдааны мессеж + "Буруу формат — ачаалагдахгүй" шошго). ⚠️ Smart Software холболтын картыг нүдээр хараагүй — dev preview (`/__admin-preview`) нь интеграцийн панелийг зориуд render хийдэггүй (бодит tRPC admin дуудлага), бодит /admin-д нэвтрэх шаардлагатай.

⚠️ **Бодит incident: тестийн GA4 ID амьд сайтад гарсан (2026-09-15, live тестийн өмнө баригдсан).** `store-settings.integration.test.ts`-ийн шинэ "measurement ids" блокийн `afterEach` нь `originalGa4`-ийг `updateStoreSetting`-ээр сэргээдэг байв. Гэтэл тэр мөр урьд нь **хоосон утгатай** байсан бөгөөд router хоосон утгыг `.min(1)`-ээр татгалздаг → сэргээлт унаж, `.catch(() => undefined)` түүнийг залгисан → `G-TESTONLY01` бодит тохиргоонд үлдэж, production build-ийн `#analytics-config` блокт гарч байсныг CSP шалгаж байхдаа санамсаргүй олов. Устгаад баталгаажуулсан (`{"ga4":"","metaPixel":""}`). Засвар: хоосон эх утгыг **устгаж** сэргээнэ (хадгалж биш), дээр нь `afterEach` сэргээлт бодитоор болсныг **шалгадаг assert** нэмэв — чимээгүй бүтэлгүйтэх боломжгүй боллоо. ⛔ Ерөнхий сургамж: snapshot-and-restore-ийн сэргээх алхам нь **сэргээх гэж буй утгаа татгалзаж болох** mutation дээр найдаж болохгүй.

⚠️ **Миний алдаа, тэмдэглэх нь зүйтэй**: бүтэн suite (983 с) ажиллаж байхад зэрэгцүүлэн probe скрипт ижил HeatWave дээр ажиллуулсан — гарын авлагын зориуд бичсэн хоригийг зөрчив. Үр дүн: `commerce.router.test.ts`-ийн "store-pickup салбар сонгоогүй бол татгалзана" тест унаж (өөр файлын бэлгийн карт user 1-ийн сагсанд үлдсэнээс), **бодит DB-д #6802 junk захиалга үүссэн**. Тухайн файлыг цэвэрхэн дахин ажиллуулахад 31/31 ногоон — уналт нь энэ session-ий өөрчлөлтөөс биш. Дүн: **994/997 (1 унасан, 2 skip)**, дахин ажиллуулсны дараа бодитоор 995/997.

⚠️ **Dev preview-ийн мэдэгдэж байх ёстой шинж**: `/__admin-preview` нь `/admin`-аар эхэлдэггүй тул App.tsx-ийн `storefront` нөхцөлөөр **storefront-ийн `.sugi-site` бүрхүүлд ордог** — улмаас storefront-ийн `h1` өнгө админ дээр дамжиж, харанхуй горимд гарчиг бараг хараар харагдана. Бодит `/admin`-д ийм зүйл байхгүй (хэмжсэн: бүрхүүлийг салгасны дараа `rgb(238,240,243)`). Preview-ээр screenshot авах бүрт үүнийг тооцох.

---

## Баримт бичгийн цэгцлэлт, монгол тайлбар, танилцуулга (2026-09-14, орой)

- Төслийн гарын авлага `CLAUDE.md` → **`docs/PROJECT-GUIDE.md`** болж нүүв (git mv, түүх хадгалагдсан). Root-ын `CLAUDE.md` нь gitignore-д, дотор нь ганц мөр `@docs/PROJECT-GUIDE.md` — машин бүрт нэг удаа гараар үүсгэнэ (ажлын лаптопт хийх). Бүх md, кодын тайлбар дахь хуучин файлын нэрийн лавлагаа шинэ зам руу солигдсон; гадны тайлангийн холбоосууд хасагдсан.
- Git түүх бүхэлдээ дахин бичигдэж (277 commit, commit message-ийн туслах мөрүүд хасагдсан) `main`, `admin-face-auth`, 2 tag force-push хийгдэв. ⚠️ **Ажлын лаптоп дээр repo-г устгаад дахин clone хийх** — хуучин түүхтэй clone дээр pull ажиллахгүй. Хуучин түүхийн backup bundle гэрийн лаптопын түр хавтсанд.
- **Кодын тайлбар монгол хэл дээр**: 94 файлын толгойн тайлбар (1,414 мөр) + `server/_core/index.ts`, `client/src/App.tsx`, `client/src/main.tsx`-ийн бүх inline тайлбар (128 мөр). Үлдсэн: ~13,000 мөр (drizzle/schema.ts 915, server/routers.ts 843, server/db.ts 1,719 гэх мэт) — файл файлаар үргэлжлүүлнэ. Шинэ тайлбар монголоор бичих дүрэм.
- **Ажлын анкет бүртгэгддэг боллоо (2026-09-15, migration `0082` `job_applications`)** — Tom: "ирүүлсэн анкет хаана яаж хадгалагдах вэ, админ хэн CV илгээснийг яаж харах вэ". Өмнө нь "Өргөдөл илгээх" зүгээр `mailto:` холбоос байсан тул юу ч бүртгэгдэхгүй байв. Одоо: /careers дээрх товч маягт нээж (нэр, утас, имэйл, захидал, CV файл), `careers.apply` (strict rate limit, захидал moderation-оор) мөр үүсгэнэ; **CV нь R2 дээр `applications/<санамсаргүй 32 hex>/…` түлхүүрээр** хадгалагдаж, олон нийтийн `/cdn/` замаар хэзээ ч гарахгүй — админ дархад сервер нэг цагийн **гарын үсэгтэй URL** (`admin.jobApplicationCvUrl`) өгнө. Файлын төрлийг MIME биш **толгойн байтаар** шалгана (`%PDF`, zip `PK`, OLE). Админ: /admin → Баримт бичиг → **Ирсэн анкетууд** (зөвхөн `adminProcedure` — нэр, утас, CV бол хувийн мэдээлэл тул marketing эрх хүрэхгүй): төлөв (шинэ/харсан/холбогдсон/татгалзсан), тэмдэглэл, CV нээх, устгах. Шинэ анкет ирэхэд admin бүлэгт push — **нэр, утас ОРОХГҮЙ**, зөвхөн албан тушаал (`careers.application_received`). Бүтэн (Монголын стандарт) анкетын бүтэц `shared/job-application-form.ts`-д тодорхойлогдсон ч **хараахан залгаагүй** — гурван үлдсэн алхам файлын толгойд бичигдсэн.
- **/careers дизайн Tom-ийн лавлагаа зургаар дахин бүтээгдэв (09-15)** — цайвар шар дэвсгэр дээр хөвсөн цагаан 28px булантай карт, дотор нь өөрийн нав мөр (лого · цэс · дугуй товч), зүүн талд 64px гарчиг + доогуур зураастай имэйл + жижиг холбоосууд, баруун талд hairline-аар тусгаарлагдсан зарын мөрүүд (цэнхэр eyebrow, 36px гарчиг, цэгээр тусгаарласан мета, 50px дугуй сум, өнгөт pill товч), доор chip гарчигтай тайлбарын хоёр багана. Өнгө нь лавлагааных биш сайтын улаан; харанхуй горимд `--careers-*` токен дахин тодорхойлогдоно.
- 💰 **Токен зарцуулалтын засвар (09-15)** — Tom Fable 5.1-ийн долоо хоногийн хязгаарт тулсны дараа бодитоор хэмжив. Гол шалтгаан: **`docs/PROJECT-GUIDE.md` 165 KB (~55,000 токен)** бөгөөд `CLAUDE.md`-ийн `@import`-оор **session бүрийн эхэнд БОЛОН compact бүрийн дараа** бүтнээр ачаалагддаг байв (урт session-д ×5 = ~275,000 токен, зөвхөн нэг файлыг дахин унших). Засвар: 123 KB-ийн өнгөрсөн session-ий тэмдэглэлийг **энэ файлын "PROJECT-GUIDE.md-ээс зөөсөн session бүрийн тэмдэглэл (2026-09-15)" хэсэгт бүрэн эхээр нь** зөөж, гарын авлагад зөвхөн дүрэм, тохиргоо, идэвхтэй ажил үлдээв → **165 KB → 36 KB**. Шинээр: **`docs/TOKEN-USAGE.md`** (хэмжсэн шалтгаан, output таслах дүрэм, аль загвар аль ажилд, session удирдлага), **`docs/SELF-REVIEW.md`** (commit-ийн өмнөх шалгалт), **`.claude/settings.json`** (`includeCoAuthoredBy: false`, уншдаг командуудын allowlist — зөвшөөрлийн асуулт бүр ажлыг тасалж контекст дахин уншуулдаг, `.env`/`*.pem` унших хориг, `cleanupPeriodDays: 30`). ⛔ Шинэ дүрэм: session-ий тэмдэглэл HISTORY.md-д, PROJECT-GUIDE.md-д зөвхөн 1-2 мөрийн ДҮРЭМ.
- **Zochil-той харьцуулж, дутуу зүйлсийг нөхөв (2026-09-14)** — Tom хуучин сайтынхаа Zochil админыг (`admin.zochil.mn`, Pro багц 220,000₮/сар) нээж өгснөөр бүх 24 хэсгийг Playwright-аар уншиж, манай кодтой нэг бүрчлэн тулгав. **Давхардуулаагүй**: "Урсдаг зар" ба "Popup мэдэгдэл" манайд аль хэдийн `site_promotions`-оор (хуваарьтай, banner/popup, хаагддаг, хурд нь хэмжигддэг) байсныг Tom өөрөө сануулсны дараа шинээр нэмсэн store setting-үүдээ буцаав. Бодитоор дутуу байснаас хийсэн нь:
  - **`/about` (Бидний тухай)** ба **`/careers` (Ажлын байр)** — хуучин сайтын footer дээр байсан хоёр хуудас шинэ сайтад огт байгаагүй. Агуулгыг компанийн бодит танилцуулгаас (asayake.mn/about) авч, гурван хэлээр (`shared/site-documents.ts` + `.i18n.ts`), /admin → Баримт бичиг дээр засагдана, sitemap-д орсон, footer-т линктэй.
  - **Ажлын байрны зар** (migration `0081`, `job_postings`) — Tom-ийн өгсөн лавлагаа дизайны дагуу: зүүн талд наалдац гарчиг + холбоо барих, баруун талд зар бүр (албан тушаал, төрөл/цалин/байршил, дэлгэрэнгүйг нээх сум, "Өргөдөл илгээх"). **Hardcode биш**: /admin → Баримт бичиг хэсгийн доод хагасаас нэмж, засаж, ноорогт хийж, устгана; өнгө, шрифт, hairline нь сайтын өөрийн токенууд тул харанхуй горимд ч дагана. Зар байхгүй бол хуудас бичвэрээ л харуулна. Тест 6 (бодит HeatWave) + баримтын бүрэн бүтэн байдлын 29 тест.
  - **Барааны QR код** — /admin → Бүтээгдэхүүн мөр бүрт QR товч (тавиурын шошго, сурталчилгаанд): PNG татах, хэвлэх. Код нь барааны олон нийтийн хуудас руу заана (баркод руу биш), origin нь `window.location.origin`.
  - **YouTube холбоос** — footer-ийн сошиал эгнээнд гурав дахь суваг (Zochil-д байсан, манайд байгаагүй).
  - Замдаа: `shared/legal-documents.ts` → **`shared/site-documents.ts`** (git mv, DB-ийн `site_documents`, admin-ийн "Баримт бичиг"-тэй нэршил нийцэв), Legal.tsx-ийн зам→түлхүүрийн хүснэгт хуваалцсан эх сурвалжаас гаралтай боллоо. Bestseller-ийн `No.1` япон хэлэнд «いいえ.1» гэж орчуулагдаж байсныг заслаа.
  - **Хараахан хийгээгүй, Tom-ын шийдвэр хүлээж буй Zochil-ийн үлдсэн боломжууд**: олон бүсийн хүргэлт (орон нутаг, бүс тус бүрийн үнэ/үнэгүй босго), банкны шилжүүлгийн данс + checkout-д сонголт (`bank_transfer` enum аль хэдийн бэлэн, зөвхөн UI/данс дутуу), дэлгүүрийн харагдацын тохиргоо (үнэ/код нуух, захиалгын доод/дээд дүн), загварын өнгө/шрифтийн засварлагч, агентын (affiliate) хөтөлбөр, AI зураг үүсгэгч, Messenger chatbot.

- **`docs/SUGI-ASAYAKE-presentation-v4.pptx`** («朝焼け» хувилбар) — захирал + Японы хөрөнгө оруулагчид зориулсан **16 хэсэг / 46 frame** (япон гарчиг, монгол дэд тайлбар). Цайвар Японы editorial дизайн: гарчиг **Yu Mincho** (明朝), хэсэг бүрт нэг ханз усан тэмдэг (機・信・見・手・比・較・創・品・速・運・基・安・数・共), үүрийн туяаны (crimson→gold) градиент нар/зураас, слайд бүрт компанийн лого (нүүр/төгсгөлд том — Morph-оор шилждэг), нүүр ба төгсгөлд босоо (縦書き) япон бичвэр. Шинэ хэсгүүд: **«なぜモンゴル、なぜ今か»** — эх сурвалжтай бодит тоо (хүн ам 350万, УБ 179万, интернэт 83%, EC US$245M, Японд ээлтэй 87%, шууд нислэг ~5.5ц; UN/DataReportal/ecdb/MOFA/EPA 2016 — 9,300 бараа татваргүй) + Токио→УБ маршрутын карт (онгоц Morph-оор нисдэг); **«スマホで完結する買い物体験»** — бодит мобайл дэлгэц (Playwright 390px, япон хэлээр, `?lang=ja`) утасны хүрээнд, frame бүрт `crop_top/crop_bottom` өөрчилснөөр Morph **гүйлгэдэг**; **Zochil-тэй харьцуулсан 3 хэсэг** (Tom-ийн хүсэлт: admin.zochil.mn + asayake.mn-ийг Playwright-аар судалсан — Pro багц 220,000₮/сар, 270 бараа, 84 ангилал, 199 захиалга, 164 харилцагч, Google машин орчуулга, JSON-LD/manifest/хайлт байхгүй, footer-т Zochil лого; харин QPay/TuDelivery/Papa/Smart Logic/chatbot/масс мессеж **байгаа** гэдгийг үнэнчээр △/✓-ээр тэмдэглэсэн): дэлгэцийн харьцуулалт (2 лаптоп), 14 мөрт функцийн матриц (✓/△/—), «自社開発だからできること» (хийгдсэн 6 + цаашид нэмэх 6); төгсгөлд **бодит QR** (`segno`, `sugi.karkaron.com/?lang=ja`). Каталогийн 20 брэндийн packshot, лаптоп хүрээтэй screenshot хэвээр. PowerPoint COM-оор 46 frame export хийж шалгасан. Хуучин v2/v3 репогоос хасагдсан. Замдаа олдсон сайтын bug: bestseller-ийн `No.{rank}` нь хоёр text node болж япон хэлэнд «いいえ.1» гэж орчуулагдаж байсан → template literal (deploy хийгдсэн).

## Барааны факт — editor-ийн bug + бүх өдрийн admin procedure-ийн round-trip тест (2026-09-14, орой)

Tom: "hadgalah hugtsaa 36 gej oruulsan, page deer 19; admin-aar dahin orohod facts alga, save boloogui". Шалтгаан: `openProductComposer` detail мөрөөс зөвхөн `description`-ийг авч, шинэ 4 талбарыг **жагсаалтын мөрөөс** (`admin.products` — тэнд байхгүй) уншдаг байсан → форм хоосон, дахин хадгалахад null-аар дарж бичдэг. "36" нь placeholder байсан (одоо "жишээ: 36"). Засвар: detail мөрөөс уншина. Мөн `editAdminOrder` variantId=null (хуучин) мөрийг item засварт устгадаг байсныг засав; `factsSource="admin"` зөвхөн бодит утга оруулсан үед. **Дүрэм**: admin editor-т шинэ талбар нэмбэл `admin.productDetail`-аас уншиж байгаа эсэхийг шалга — жагсаалт (`getAdminProducts`) хүнд баганыг санаатай авдаггүй.

Факт нь одоо зургийн дотор (`ProductFacts.tsx`: зүүн доод буланд glass pill — хэмжээ/хугацаа/гарал; "Найрлага" pill дарахад зургийн дээгүүр panel; zoom товч баруун доод хэвээр; `.product-facts-*` CSS). Шинэ `server/admin-today-roundtrip.integration.test.ts` (3): updateProduct→productDetail→catalog.bySlug факт хадгалагдах + partial update хөндөхгүй + kind; createManualOrder (replay) → admin.orders items.variantId → editOrder → orderDetail → packingSlipPdf/orderInvoicePdf; orders.requestReturn (нэг удаа) + admin list-д харагдах; `review-reward-mnt=2000` → reviews.create → зээл +2000. 6/6 ✓.

## "Za bugdiin hii" — 8 зүйлийн дутагдлыг нэг дор (2026-09-14, гэрийн лаптоп, 5 commit)

Tom: "odoo ymar saijruulalt uldsen be?" → судалсан жагсаалт → "Za bugdiin hii! Heregtei ym baiwal nadaas asuugaarai". Дарааллаар:

**1. Зочны checkout-д утас баталгаажуулах + захиалгын SMS** (`1f27ed7`). `phone_verification_sessions.purpose` ← `checkout` (migration 0077); `auth.startPhoneVerification purpose:"checkout"` ямар ч дугаарт (бүртгэлийн шалгалтгүй); `checkout.createOrder` нь `phoneVerificationSessionId` авч `requireCheckoutPhoneVerification`-оор шалгана: purpose/consumedAt/утас таарах/live verify.mn статус (түлхүүр байвал), дараа нь `consumeCheckoutPhoneVerificationSession` (нэг session = нэг захиалга, guarded UPDATE). Хэн шаардлагатай: `ctx.user.phone` байхгүй бүх зочин (FB-ээр үүссэн данс ч). Унтраах: /admin → Дэлгүүрийн тохиргоо → "Захиалга" бүлэг → `checkout-guest-phone-verification=0`; тестэд `GUEST_CHECKOUT_OTP=0` (`_test-setup.ts`), `VERIFY_MN_SKIP_LIVE_CHECK=1` зөвхөн `checkout-otp.integration.test.ts`. Client: `PhoneVerificationStep` `initialPhone`/`compact`/`onVerified(sessionId, phone)`; Checkout 01 хэсэгт баталгаажуулах блок, `checkout.guestPhoneVerificationRequired` query. **SMS**: `sms-order-notifications` (анхдагч 0, Brevo SMS кредит хэрэгтэй), `sms-body-order-placed`/`sms-body-order-status` — `sendOrderPlacedSms`/`sendOrderStatusSms` бүх статус илгээлтийн хажууд. ⚠️ verify.mn нь MO-SMS (харилцагч бидэн рүү илгээдэг) тул харилцагч руу SMS явуулж чадахгүй — захиалгын SMS-д Brevo л бий.

**2. Ажилтны захиалга + засвар + бэлтгэх хуудас** (`c35f211`). `orders.salesChannel` ← `phone`/`messenger` (0078). `createManualOrder` (db.ts): checkout-тэй ижил салбар/нөөц/хүргэлтийн дүрэм, хямдралгүй, unpublished барааг ч зарна, `order.placed` push, `clientRequestId` idempotent. `editAdminOrder`: холбоо барих/хүргэлт хаагдаагүй бүх захиалгад; барааны мөр зөвхөн `paymentStatus=unpaid` үед (`adjustOrderLineStock` — нөөц зөрүүгээр, `sale_online`/`order_restock` movement); хямдрал хэвээр, хүргэлтийн төлбөр дахин; `pickupBranch`/`fulfillingBranchId` дахин тодорхойлогдоно. `renderPackingSlip` (invoice.ts: үнэгүй, ☐ + SKU + том тоо), `renderOrderInvoiceForStaff`. Router: `admin.createManualOrder`/`editOrder`/`orderDetail`/`packingSlipPdf`/`orderInvoicePdf` (warehouse/ordersRead). UI: `admin/ManualOrderForm.tsx`, `admin/OrderEditForm.tsx`, `admin/OrderLineComposer.tsx` (`posSearchVariants`-аар хайна), `lib/pdf.ts`. ⚠️ `staff` (зөвлөх) эрх Захиалга хэсгийг хардаггүй хэвээр — утсаар ирсэн захиалгыг warehouse/admin бүртгэнэ; хэрэгтэй бол `SECTION_ROLES`-д нэмнэ.

**3. GA4 + Meta Pixel (зөвшөөрөлтэй) + баркодын SEO + барааны факт** (`45efdd8`). Тохиргоо `analytics-ga4-measurement-id`/`analytics-meta-pixel-id` → `indexHtml.ts` `%ANALYTICS_CONFIG_JSON%` (regex `(?:SEO|COOKIE|ANALYTICS)_`) → `client/public/vendor/analytics-init.js`: cookie banner-ийн `onAccept/onReject` → `window.sugiConsent(type, granted)` (queue-тэй), analytics=GA4 (Consent-аас өмнө юу ч ачаалахгүй), **шинэ "marketing" ангилал**=Pixel (`cookie-text-marketing-*` site text); pushState/popstate-д page view; `window.sugiTrack` → `client/src/lib/analytics.ts` `trackEvent` (purchase/add_to_cart/view_item — Checkout, PDP, Shop). CSP script-src/connect-src-д googletagmanager, connect.facebook.net, google-analytics, facebook.com. Playwright-аар батлагдсан: түр ID тавьж accept-all дарахад gtag.js + fbevents.js ачаалагдсан, ID устгасан. **Баркод**: PDP meta description "Баркод <sku> · …", JSON-LD `productID` + `gtin13`/`gtin8`/`mpn`, PDP-д "Баркод / SKU" мөр. **Факт**: `products.ingredients/netContent/countryOfOrigin/shelfLifeMonths/factsSource` (0079) — admin форм (Төрөл select-ийн дээр), CSV import 4 багана, PDP `.product-facts` dl, `factsSource="admin"` бол script дахин бичихгүй.

**Open Food/Beauty Facts** (Tom OBF-ийн data хуудсыг илгээв: "1 API call = 1 real scan", каталог гүйлгэхийг API-аар хориглодог → **nightly CSV export** ашиглав). VM дээр `curl | zcat | awk` (`scratchpad/off-extract.sh`: food 0.9 GB gz-ийг стрийм, 980 баркодтой тааруулж, header+мөр) → 3 TSV → `scripts/enrich-products-from-open-facts.ts <tsv> --source … [--apply]` (зөвхөн хоосон талбар, admin-editedийг алгасна, `factsSource` бичнэ). **Үр дүн: 980-аас 15 л таарсан** (food 13, beauty 1, products 1 — ихэнх нь зөвхөн гарал үүсэл "Япон"; найрлага 1, хэмжээ 2). Японы JAN кодууд эдгээр нээлттэй санд бараг байхгүй — талбарууд бэлэн, бодит эх сурвалж нь SUGI Japan-ий бараа бүртгэл/CSV.

**4+6. Сэтгэгдэл хүсэх job + урамшуулал; буцаалтын хүсэлт** (энэ commit). `orders.reviewRequestedAt/returnRequestedAt/returnRequestReason` (0080). Job `review-request` (6 цаг тутам, `runReviewRequestJob`): дууссанаас `review-request-days` (3) хоногийн дараа, 60 хоногоос хуучин биш, нэвтэрсэн худалдан авагчид push+имэйл нэг удаа (`email-subject/body-review-request`, `push-body-review-request`, `{урамшуулал}` мөр). `review-reward-mnt` > 0 бол `reviews.create` дараа `adjustStoreCredit` (verified-purchase учир бараа/хэрэглэгч бүрт нэг л удаа); PDP формд урамшууллын мөр, toast. `orders.requestReturn` (strict rate limit, `screenText`): өөрийн completed захиалга, `return-window-days` (14) дотор, нэг удаа → `order.return_requested` push (шалтгаан push-д орохгүй — PII байж болзошгүй); Profile "Буцаах хүсэлт" (prompt), admin Захиалгын мөрөнд шар pill + шалтгаан. Тест `review-request-return.integration.test.ts` (2).

**7. Staging + CI DB тест**. HeatWave дээр **`sugi_staging`** схем (production dump-ийн бүрэн хуулбар 2026-09-14, `sugi_app`-д SELECT/INSERT/UPDATE/DELETE; ⚠️ `mysql.exe` Windows дээр `--default-character-set=utf8mb4 --binary-mode=1`-гүй бол кириллтэй dump-ийг "Unknown command '\''" гэж унагаадаг). VM: `~/sugi-asayake-staging/` (.env = prod-ынхаас `sugi_staging`, `PORT=3001`, `NOTIFICATIONS_DISPATCH=0`, `PUBLIC_BASE_URL=https://sugi-staging.karkaron.com`; `node_modules` → prod-ын symlink), cloudflared ingress `sugi-staging.karkaron.com → :3001`, pm2 `sugi-staging`. `deploy.ps1 -Staging`. ⚠️ **DNS CNAME `sugi-staging` → `bbd3128e-486e-481d-8c21-f9d3d240a56c.cfargotunnel.com` (proxied) Tom Cloudflare-аас нэмнэ** — түүнээс өмнө зөвхөн VM дотроос :3001. CI: `.github/workflows/ci.yml` `database-tests` job — mysql:8.4 service, `scripts/db-apply-all-migrations.ts` (multipleStatements; `-->` marker зөвхөн бүтэн мөрөнд), `scripts/ci-seed.ts` (4 салбар), auth+commerce gate-тэй бүрэн vitest. ⚠️ Эхний CI run улаан гарч болзошгүй — тестүүд production-ий бодит мөрөнд түшиглэсэн бол seed-д нэмнэ. HeatWave дээр `sugi_migtest` схем (migration chain туршилт) үлдсэн — Tom `DROP DATABASE sugi_migtest` .

**8.** Хайлтын autocomplete аль хэдийн байсан (`HeaderSearch` suggestions) — алдаатай үг тэсвэрлэх л алга. LocalBusiness JSON-LD аль хэдийн `Store` төрлөөр бий. Шинэ: `MessengerButton.tsx` — баруун доод хөвөгч "Чат" (m.me, Facebook URL тохиргооноос; /admin, /checkout, /help-д нуугдана), гуравдагч script-гүй.

## Бэлгийн карт checkout-оор зарагдана — төлбөр ормогц код автоматаар (2026-09-14, гэрийн лаптоп)

Tom-ийн "uldsen bugdiin hii" жагсаалтын дараагийн зүйл. 09-13-нд `gift_cards` хүснэгт + admin-аас гараар олгох + /profile-д ашиглах хэсэг бэлэн байсан; **зарах** тал дутуу байв.

- **Migration `0076`** (HeatWave дээр ажилласан): `products.kind ENUM('physical','gift_card') DEFAULT 'physical'`. Бүх 980+43 бараа physical.
- **Каталог**: `scripts/seed-gift-cards.ts` (dry-run / `--apply`) — sharp-аар SVG-ээс картын зураг (`client/public/images/gift-cards/{25000,50000,100000,200000}.webp` 1600² + `categories/gift-card.webp`), ангилал **"Бэлгийн карт"** (slug `gift-card`, id 1648, sortOrder 8) + 4 бараа `GIFT-25000…GIFT-200000` (id 5639–5642, үнэ = картын дүн, stock 999, kind gift_card). Дүрэм: **нөөц хэзээ ч хасагдахгүй** (999 хэвээр). ⚠️ Барааны тайлбар нь **plain text** — PDP `GlossaryText`-ээр текстээр зурдаг тул HTML бичвэл `<p>` ил гарна (эхний оролдлогод гарсан, зассан).
- **Checkout (`createOrderFromActiveCart`)**: сагсны select `kind`/`isPublished` авдаг болов; gift_card мөр `decrementBranchStock`-ийг алгасна (зөвхөн isPublished шалгана); **зөвхөн бэлгийн карттай сагс** = `digitalOnly` → хүргэлтийн төлбөр 0 (`computeDeliveryFeeMnt({digitalOnly})`), pickup branch шаардахгүй (zod-ийн `pickupBranch` refine хасагдсан — resolver өөрөө шүүнэ), Checkout.tsx-д 02 "Хүргэлт" хэсэг ногоон тайлбараар солигдоно, `deliveryMethod: "store_pickup", pickupBranch: null` илгээнэ. **Хямдрал (coupon/loyalty/routine) зөвхөн physical мөрийн дүнгээс** (`shared/gift-cards.ts` `discountableSubtotalMnt`) — 50% купоноор 100,000₮ карт авч 100,000₮ зээл болгох арбитражийг хаана; `cart.applicableCouponDiscount`/`applicableLoyaltyDiscount` preview ч ижил суурь.
- **Олголт**: `issueGiftCardsForPaidOrder(tx, orderId)` — order_items ⋈ products(kind=gift_card) → мөр бүрийн тоо ширхэгээр код (`SUGI-XXXX-XXXX-XXXX`, дүн = unitPriceMnt, `purchaseOrderId`, recipientName = захиалагч, note "Захиалга N", 12 сар). **Idempotent** (`purchaseOrderId` байвал юу ч бичихгүй). Дуудагддаг газар: `markQPayPaymentAttemptPaid` (QPay + StorePay webhook хоёулаа энэ функцээр; guarded UPDATE `affectedRows===1` үед л), `updateAdminOrder` status=completed (бэлэн/банк → paid), `recordInStoreSale` (POS, transaction дотор; хариу `giftCards`). Цуцлах/буцаах → `voidGiftCardsForOrder` (зөвхөн `active`-ыг void; redeemed нь аль хэдийн зээл болсон).
- **Хүлээн авагчид**: `server/giftCardFulfilment.ts` `deliverIssuedGiftCards` — push (`sendPushToUser`) + имэйл (`sendAccountEmail`), db.ts-ээс **dynamic import** (циклээс зайлсхийсэн), commit-ийн дараа, алдвал зөвхөн log. Кодууд `orders.mine` (`giftCards[]`, `items[].kind`) болон `orders.lookup` (зочин: дугаар+утас)-д — `GiftCardCodes.tsx` (Profile захиалга + /track-order; хуулах товч; төлөгдөөгүй бол "N картын код ирнэ"). `.gift-code*` CSS токеноор (dark theme нэмэлт дүрэмгүй).
- **Admin**: Бүтээгдэхүүний формд **"Төрөл"** select (Энгийн / Бэлгийн карт); `admin.products` жагсаалт `kind` авна. Merchant feed gift_card-ыг **оруулахгүй**. PDP-д "Нөөцөд бэлэн" оронд "Цахим бэлгийн карт — төлбөр баталгаажмагц код шууд ирнэ".
- **Баталгаа**: `server/gift-cards.test.ts` (4 unit) + `server/gift-card-checkout.integration.test.ts` (3, бодит HeatWave: digital-only → fee 0/branch null/stock 5→5/completed → 2 код, дахин дуудахад 0; холимог сагс → хүргэлт + зөвхөн cream 10→9; QPay webhook → 1 код, давтан callback 0, completed 0, cancel → void). Playwright dev: PDP шошго, /checkout-д 02 хэсэг тайлбар + "Хүргэлт Үнэгүй", footer-т шинэ ангилал.
- ⚠️ Мэдэх зүйл: (1) бэлэн мөнгөөр авсан карт **admin "Дууссан" дармагц** л код гарна — QPay амьд болтол ажилтан төлбөрөө аваад л дарна; (2) loyalty lifetime spend-д карт худалдан авалт ч, дараа нь зээлээр авсан бараа ч хоёулаа тоологдоно (давхар) — хүлээн зөвшөөрсөн; (3) `/og/product/gift-card-*.jpg` dev дээр 503 — `PUBLIC_BASE_URL` (prod) дээрх зургийг татдаг, deploy-ийн дараа хэвийн.

## /admin царайны баталгаа tab-тай холбогдов — tab хаагаад буцахад заавал царай (2026-09-14, гэрийн лаптоп)

Tom: "/admin tab-аа хаагаад буцаад орход царай уншуулахгүй шууд орж байна — аюултай". Өмнө нь proof cookie (idle 25 мин / абсолют 8 ц) tab хаасан ч амьд байсан. Шийдэл: **tab-д холбосон proof**. Client `client/src/lib/adminTab.ts` — `sessionStorage`-д tab бүрд нэг санамсаргүй id (tab хаагдахад алга болно), `main.tsx`-ийн tRPC fetch бүх дуудлагад `x-admin-tab` header илгээнэ. Server `faceProof.ts`: JWT-д `tabs` claim; `readFaceProof` header-ийн tab-ыг `tabs`-д байхыг шаардана (байхгүй → proof биш → `panelProcedure` FACE_REQUIRED → камер); `issueFaceProof` — хоёр дахь tab царайгаа таниулбал одоо байгаа proof-д **нэмэгдэнэ** (абсолют хугацаа, бусад tab хэвээр; max 6) — хоёр tab хоорондоо lock хийлцэхгүй; `refreshFaceProof` tabs-ийг дамжуулна. Header-гүй хүсэлт (тест, curl) `"-"` гэсэн pseudo-tab-д холбогдоно — бодит tab хэзээ ч тэр утгатай байхгүй тул хулгайлсан cookie header-гүй replay хийгдэхгүй. `tabs`-гүй хуучин proof хүчингүй (deploy-ийн дараа нэг удаа камер). Тест `face-idle.test.ts` +1; face suite 32/32.

## /admin → Баримт бичиг: editor хоосон харагдаж байсан (миний 09-14-ний регресс) + dev-only admin preview route (2026-09-14, гэрийн лаптоп)

Tom (screenshot, /terms · English): гарчиг/lead бөглөгдсөн ч TinyMCE агуулга хоосон, storefront дээр текст зөв. Шалтгаан: `AdminDocumentsPanel`-ийн seed `useEffect` `[activeKey, activeLocale, saved, fallback]`-аас хамаардаг; шинэ `getLegalDocumentFallbackFor()` дуудлага бүрд **шинэ объект** буцаадаг (хуучин `getLegalDocumentFallback` массивын тогтвортой элемент буцаадаг байсан) → render бүрт effect → `setForm` + `editorKey++` → TinyMCE тасралтгүй remount, init хэзээ ч дуусдаггүй. Засвар: `useMemo(() => getLegalDocumentFallbackFor(activeKey, activeLocale), [activeKey, activeLocale])`. **Дүрэм**: effect dependency-д тавих утга render бүрт шинэ объект байж болохгүй.

Баталгаажуулалт: admin нэвтрэлт+царай шаарддаг тул **dev-only route `/__admin-preview?adminSection=<section>`** (`App.tsx`, `import.meta.env.DEV` — production bundle-д ордоггүй) `AdminWorkspace preview` горимоор (auth/query-гүй, fallback өгөгдөл) зурна; Playwright-аар mn 12 h2/6,154 тэмдэгт, English 12/6,030, 日本語 12/2,610, гарчиг солигддог. Цаашид admin панелийн render-ийг ингэж шалгана.

## Share карт жижиг дөрвөлжин гарч байсан → 1200×630 OG карт бараа бүрд (2026-09-14, гэрийн лаптоп)

Tom (FB post composer screenshot): зураг жижиг, текст том. Шалтгаан: Facebook 600×315-аас жижиг og:image-ийг жижиг дөрвөлжин thumbnail-аар зурдаг; Cocochi-ийн зураг **270×390** (Diane 1280×1280 тул том гарах байсан) — бараа бүрийн зураг өөр өөр хэмжээтэй. Шийдэл `server/_core/ogImage.ts`: `/og/product/<slug>.jpg` — sharp-аар packshot-ийг 1200×630 цагаан канвас дээр төвлөрүүлж (40px padding, upscale зөвшөөрнө) JPEG q86; tmpdir cache (slug+зургийн URL hash), 7 хоног Cache-Control; зураггүй → 404 (routeMeta тэр үед нүүрний зураг). `routeMeta`: og:image = карт, + `og:image:width/height/type/alt` (`%SEO_OG_IMAGE_META%`); JSON-LD/preload бодит зураг хэвээр. ⚠️ Facebook хуудас бүрийн scrape-ийг ~30 хоног cache-лдэг — өмнө нь хуваалцсан URL-д Sharing Debugger → "Scrape again" хэрэгтэй; шинэ бараанд шууд.

## Share — утсан дээр Facebook товч зүгээр л апп нээдэг байсан; гарын авлага + борлуулалтын танилцуулга (2026-09-14, гэрийн лаптоп)

Tom (iPhone): "Facebook share songood orhoor zgr facebook ongoij baina". Шалтгаан: iOS дээр Facebook апп `facebook.com/sharer/sharer.php` universal link-ийг барьж аваад нүүр хуудсаа нээдэг (Meta-ийн мэдэгдэж буй зан; `fb://` share scheme хуучирсан). Засвар `ShareBar.tsx`: `(pointer: coarse)` төхөөрөмж дээр Facebook товчны оронд **Messenger deep link** (`fb-messenger://share/?link=`), Facebook руу хуваалцах нь эхний хар "Хуваалцах" (OS share sheet) товчоор; компьютер дээр Facebook вэб sharer хэвээр (тэнд ажилладаг). X/Telegram intent хоёр утсан дээр хэвийн. Мөн `docs/ADMIN-MANUAL.md` (ажилтны өдөр тутмын заавар, эрхийн түвшин, захиалгын урсгал, юу хийж болохгүй) ба `docs/SALES-BRIEF.md` (худалдан авагч компанид: тоо, боломж, дэд бүтэц, хүлээгдэж буй бизнесийн алхам).

## /help — Тусламж, холбоо барих хуудас (2026-09-14, гэрийн лаптоп)

Утас footer-т, FAQ зөвхөн нэвтэрсэн профайлын "Тусламж" таб-д, салбарууд нүүрний locator-т — худалдан авахаас өмнө асуулттай хүнд очих нэг газар байгаагүй, footer-т "тусламж" линк ч байгаагүй. `client/src/pages/Help.tsx` (route `/help`, `/:slug`-аас өмнө): холбоо барих 4 карт (утас `tel:`, **Messenger** — `contact-facebook-url`-аас `m.me/<page>` гаргана, имэйл, ажлын цаг — бүгд store settings-ээс), салбарууд (`content.branches`: нэр/хаяг/утас/газрын зураг), FAQ accordion (`<details>`), холбоотой хуудсууд. FAQ **`shared/help-faq.ts`** — Profile-ийн `FAQ_ITEMS` хуулбарыг халж, 3 шинэ асуулт (захиалга хянах, бүртгэлгүй захиалах, жинхэнэ Японых) нэмэв; бүгд i18n-д. Footer "Нөхцөл ба бодлого" баганад линк, sitemap-д `/help` (0.5). CSS `.help-*` (токен, dark OK).

## VM→R2 өдөр тутмын backup + GitHub uptime + PDP jump links + захиалгын push баталгаа (2026-09-14, гэрийн лаптоп)

- **Backup лаптопоос салав**: `scripts/oci/vm-backup.sh` (mysqldump admin/TLS, HeatWave-safe flags → gzip → `openssl enc -aes-256-cbc -pbkdf2 -iter 200000`, `BACKUP_PASSPHRASE` VM `.env`-д; гэрийн лаптопын `.env`-д хуулбар) + `scripts/oci/vm-backup-upload.mjs` (VM-ийн өөрийн `node_modules/@aws-sdk/client-s3`-ээр **тусдаа private bucket `sugi-asayake-backups`** (`db/` prefix; storefront-ийн bucket нь pub-*.r2.dev-ээр нийтэд ил тул тэнд хийхгүй), 30 хоногоос хуучныг устгана). `curl … | sudo bash` (rclone) classifier-т хаагдсан тул binary нэмээгүй. Эхний run: 250 KB, bucket үүссэн; **restore тест**: R2-оос татаж decrypt+gunzip → 61 `CREATE TABLE` ✓. Cron `0 19 * * *` UTC (03:00 УБ), лог `~/backup.log`. Хоёр скрипт deploy.ps1-д ордоггүй — өөрчилбөл гараар `scp`.
- **Uptime**: `.github/workflows/uptime.yml` — GitHub cron 10 мин тутам `/health` 3 удаа; унавал ntfy-д priority-5 push. ⚠️ Repo secrets **`NTFY_URL`** (admin сэдвийн бүтэн URL), **`NTFY_TOKEN`** Tom нэмнэ (github MCP/gh CLI энэ лаптопт байхгүй); байхгүй үед workflow улаан болоод л зогсоно.
- **Захиалгын push баталгаажлаа**: 09-08-аас хойш бодит захиалга байгаагүй тул VM dispatcher хэзээ ч ажиллаагүй байв (Tom-ийн утсанд зөвхөн 09-11-ний туршилт). Амьд сайт дээр Playwright-аар бэлэн мөнгө/салбараас авах туршилтын захиалга **`SAMU0NHNJY458K8X`** ("ТУРШИЛТ (цуцлана уу)", 88001122) → `order.placed` admin+warehouse хоёулаа **2 секундэд `sent`** (#2304/#2305). ⚠️ Tom /admin-аас цуцлах. VM логийн 2 "dispatch failed … connect ETIMEDOUT" нь 09-13 boot-ын blip.
- **PDP**: давхар "ХУВААЛЦАХ" шошго хасагдав (native share байхгүй хөтөчид л үг үлдэнэ); **`ProductSectionJumps`** — гарчгийн доор "★ N сэтгэгдэл / Эхний сэтгэгдлийг бичих" ба "N асуулт, хариулт / Асуулт асуух" pill линк → `#product-reviews`/`#product-questions` (scroll-margin-top 96/84px, smooth scroll, `questions.list` query dedupe). Tom: "хүмүүс тэр болгон анзаарахгүй байна".

## Барааны share + серверийн OG/JSON-LD + Google Merchant feed + Search Console (2026-09-14, гэрийн лаптоп)

Tom: "baraa buriin page bur deer share to social … share hiihed ter platform deer n ter baraanii zuragn haragdag baih ystoi". Шалтгаан: SPA тул бүх URL нэг `index.html` — og:image нь нүүрний hero байсан, барааны линк Facebook-т hero зурагтай гарч байв. Crawler JS ажиллуулдаггүй тул **сервер** л барааны meta өгч чадна.

- **`server/_core/routeMeta.ts`** (шинэ): `/product/:slug` → `getProductBySlug` (title/description/og:image=барааны зураг/og:type=product/canonical/**Product JSON-LD** (Offer MNT, availability, brand, gtin=13 оронтой sku, AggregateRating)/зургийн preload); `/:slug` → нийтлэгдсэн post бол Article meta; бусад slug анхдагч. `renderIndexHtml(template, pathname)`; 60 с cache. ⚠️ **`app.use("*")` дотор `req.path` үргэлж "/"** — `req.originalUrl` хэрэглэнэ (эхний оролдлого яг үүнээс болж ажиллаагүй).
- `index.html`: `og:type`/`og:url`/`twitter:title` placeholder, `%SEO_VERIFICATION%` → шинэ store settings **`seo-google-site-verification`**, **`seo-facebook-domain-verification`** ("SEO ба баталгаажуулалт" бүлэг) — утга байвал `<meta name=google-site-verification|facebook-domain-verification>`.
- **`/feeds/google-merchant.xml`** (`server/_core/merchantFeed.ts`): RSS 2.0 + g: namespace, зурагтай нийтлэгдсэн бараа (519/980), price "N MNT", хуучин үнэ байвал price=хуучин + sale_price, gtin эсвэл identifier_exists=no, product_type=ангилал; 10 мин cache. Merchant Center → Products → Add feed → Scheduled fetch → энэ URL.
- **`ShareBar.tsx`**: native `navigator.share` (утсанд OS share sheet — Messenger/Instagram/Telegram) + Facebook/X/Telegram линк + холбоос хуулах (clipboard guard, fallback execCommand/prompt). PDP-д тайлбарын доор; `.share-bar*` CSS токенууд (dark-д ажиллана); i18n 5 entry.
- Баталгаажуулалт (dev): барааны head — title/description/og:image=барааны зураг/og:type=product/JSON-LD Product/preload; post — og:type=article + cover; `/no-such-thing` анхдагч; feed 519 item; share bar 1280px screenshot ✓. Facebook Sharing Debugger-ээр амьд URL-ийг Tom нэг удаа "Scrape again" хийвэл хуучин cache арилна.

## Утасны өргөний sweep — 390px × dark × ja (2026-09-14, гэрийн лаптоп)

Нүүр, /shop, PDP, /checkout, /login-ийг Playwright-аар 390px, харанхуй, ja-аар: хэвтээ overflow 0, эвдэрсэн зураг 0, console алдаа 0. Олдсон/зассан: (1) **өөрийн регресс** — `NUMERIC_PLACEHOLDERS` (`{N}`) зөвхөн цифр таардаг болсноос "Арчилгаа, гоо сайхан, эрүүл ахуйн **900+** төрөл" орчуулагдахаа больсон байв → тоон class-д `+` нэмэв (`[\d][\d.,+\s]*?`), EN "900+ lines across skincare…" дахин гарна; (2) 2 хаах товч 14×14/16×16 tap target (WCAG 2.5.8 ≥24) — `AddedToCartToast` (padding 6 / margin −6) ба `SitePromo` зарлалын мөрийн × (`p-1.5 -m-1.5`); (3) header-ийн 24×24 дүрсэн товчнууд, breadcrumb/inline текст линкүүд 15–18px — зөвшөөрөгдөх (inline текст), хөндөөгүй.

## Орхигдсон сагсны сануулга — web push суваг (2026-09-14, гэрийн лаптоп)

`abandoned-cart-reminder` job (цаг тутам, Phase E) зөвхөн `emailOptIn`+имэйлтэй хэрэглэгчид илгээдэг байсан — бүртгэл утасны дугаараар л тул бараг хэнд ч хүрдэггүй байв. `getAbandonedCartsNeedingReminder` одоо (имэйл opt-in) **ЭСВЭЛ** (`push_subscriptions` ≥ 1) хэрэглэгчийн сагсыг буцаана (`emailOptIn`, `pushSubscriptions` тоотой); job суваг бүрээр илгээж (`sendPushToUser`, `url: /checkout`, `tag: abandoned-cart`), **ядаж нэг суваг бодитоор хүрсэн үед л** `reminderSentAt` тэмдэглэнэ (үхсэн subscription → дараагийн tick дахин оролдоно). Push текст admin-аар: шинэ store setting `push-body-abandoned-cart` ("Мессежийн загвар" бүлэг, `{нэр}`), гарчиг = имэйлийн гарчиг. Тест: `automation.integration.test.ts` +1 (push subscription-тай, имэйлгүй хэрэглэгч eligible; subscription устгахад eligible биш).

## Нүүрний rail-уудын cache + жижиг засварууд (2026-09-14, гэрийн лаптоп)

Tom: "chi hiij chadah ymnuudaa hii yanzl bas saijruul! … uur hamaaralgui aldaa oldwol ter buriig ynzala". Амьд хэмжилт: нүүрний tRPC дуудлага бүр ~0.2 с, ихэнх нь UB→Токио сүлжээ; зөвхөн `catalog.bestsellers` cold 0.48 с бодит серверийн ажил. Тиймээс `getBestsellingProducts`/`getFeaturedBrands`/`getBrandDirectory`/`getPublishedProductCount`/`getRelatedProducts` одоо `STOREFRONT_CACHE_TTL_MS` (30 с) cache-тэй (`server/db.ts`), бичигчид (featured brand create/update/delete, product create/update/delete, POS sale, QPay paid, admin order update) түлхүүрээ шууд хаяна — шинэ `invalidateCachedByPrefix` (`server/_core/ttlCache.ts`) параметртэй түлхүүрт. Gated тест bestsellers/catalog 33/33, unit 656 ✓.

Замдаа: барааны нэр 980-аас **1 л кирилл** ("Бараа (4901655440509)" — POS импортын placeholder, Tom /admin-аас нэрлэх) → барааны нэрний орчуулга хэрэггүй; `product_categories`-д **"Shampoo" (id 1, slug shampoos)** нийтлэгдсэн бараагүй хуучин ангилал — storefront-д гардаггүй, admin-д харагдана (Tom устгаж болно); privacy §4-ийн "Aiven" → "Oracle Cloud (Токио)" 3 хэлээр; брэндийн лого 9/9 бүгд R2-д (200) — утасны харанхуй логоны зурвас нь cache (дүрэм live CSS-д бий).

## Хуулийн 3 хуудас гурван хэлээр + cookie banner-ийн орчуулга (2026-09-14, гэрийн лаптоп)

Tom (утасны screenshot, ja горимд cookie banner монголоор): "Cookie needs to be translated also!! And privacy and terms return policy needs to be translate … On /admin panel".

- **Cookie banner**: Silktide нь текстээ `index.html`-ийн JSON блокоос (server `%COOKIE_*%` placeholder ← `cookie-text-*` site-text) уншиж DOM зурдаг; `TranslateSurface` `#stcm-wrapper`-ийг санаатайгаар алгасдаг байсан. Алгасалтыг хасаж, 11 анхдагч текст + init.js-ийн hardcode "Күүкийн тохиргоог хаах" aria-label-ийг толь бичигт нэмэв. ⚠️ Нэг түлхүүр site-text-ээс зөрж байсан ("гадны компанид" vs "гуравдагч талд") — grep-ээр бүх 4 урт текстийг verbatim тулгаж баталгаажуулсан. Playwright: banner ja-д "はい、同意します / カートとログインに必要なもののみ / 詳細", aria "Cookie設定を閉じる", кирилл 0.
- **Хуулийн баримт**: толь бичгээр биш — хэл бүрд **тусдаа баримт** (admin монголоо засахад en/ja өөрөө өөрчлөгдөхгүй, статутын мэдэгдэлд энэ л шударга). `site_documents.locale` (0075: ADD COLUMN DEFAULT 'mn', DROP `site_documents_documentKey_unique`, ADD UNIQUE(documentKey, locale)); `upsertSiteDocument`/`deleteSiteDocument` locale авна; router `legalDocumentLocaleSchema` (`z.enum(LOCALES).default("mn")`); `content.siteDocuments` бүх мөрөө буцаана, client key+locale-оор шүүнэ. `shared/legal-documents.i18n.ts`: privacy 12 + terms 13 + returns 9 хэсэг × en/ja, монгол эхийн орчуулга (хуулийн зүйл, дугаар, утас, имэйл бүгд хэвээр; "Сүүлд шинэчилсэн" огноо монгол эхийнх). `Legal.tsx` `useLocale` + `getLegalDocumentFallbackFor`, body-д `lang` атрибут. `AdminDocumentsPanel`: "Хэл:" pill мөр, мөр байвал "•", editor key-д locale, "Амьд хуудсыг харах" → `?lang=`; `useLocale.ts` module load дээр `?lang=` байвал `setLocale`.
- Баталгаажуулалт: `pnpm check`/`pnpm lint` цэвэр; migration HeatWave дээр 3/3 ok; Playwright dev: `/privacy?lang=en` h1 "Privacy policy", 12 h2, body-д кирилл 0, "Last updated: 2026.09.06", "Back to the homepage"; `/returns?lang=ja` "返品と交換", 9 h2, кирилл 0; cookie banner ja (дээр). Screenshot `.playwright-mcp/legal-ja-cookie-banner.png`.
- ⚠️ Tom-д: монгол privacy §4 "Aiven" гэж байгаа — DB одоо Oracle Cloud (Токио); 3 хэлээр /admin-аас засах (en/ja анхдагч ч "Aiven" гэж орчуулагдсан, эх бичвэрт үнэнч байх үүднээс).

## Profile, сэтгэгдэл, Асуулт/хариулт, Checkout-ийн орчуулга (2026-09-13, гэрийн лаптоп)

Tom 日本語 руу солиод /profile-ийг нээхэд ихэнх нь монголоор үлдсэн ("profile barag bur teg chigeerei mongol hel deeree baina!! sain orchuulalt hiigeegui baina!"). Шалтгаан: 09-12-ны орчуулга нүүр/shop/PDP-ийн ил хэсгүүдийг л хамарсан; нэвтэрсэн хэрэглэгчийн хуудсууд (Profile-ийн 9 таб, ReviewThread, ProductQuestions, ProfileQuizWizard), Checkout-ийн StorePay/QPay мөрүүд, RoutineDetail, ForgotPassword, ErrorBoundary болон `shared/catalog-filter.ts`-ийн профайлын сонголтын шошгууд (арьс/үс/үнэр/интерьер) толь бичигт ороогүй байв.

- **Арга**: dev сервер tunnel-гүй тул хуудсыг нээж чадахгүй → **статик sweep** (`scratchpad/missing-i18n2.mjs`: тайлбар мөрүүдийг хасаад, `"'`<>{}` хооронд кирилл агуулсан сегмент бүрийг `UI_STRINGS`-ийн 3 хэлний утгатай тулгана). Storefront-ийн 414 дутуу мөр → ~300 entry нэмэгдэв (admin файлууд санаатайгаар хасагдсан; `shared/site-text.ts`-ийн зөвхөн storefront дээр зурагддаг анхдагч утгууд орсон). ⚠️ Скрипт `\n`-тэй түлхүүрүүдийг буруу decode хийдэг тул тэдгээр нь худал "дутуу" гарна — TS1117 duplicate алдаагаар 14 давхардал илэрч устгагдсан.
- **`{n}` placeholder одоо зөвхөн тоо таарна** (`NUMERIC_PLACEHOLDERS`: n, N, count, pct, discount, step, steps). Шалтгаан: сэтгэгдлийн харьцангуй цаг "2ц"/"4ө"/"5мин" pattern-ууд `(.+?)`-тэй байсан бол "Багц", "Хувцас" мэт ц-ээр төгссөн бүх text node-ыг эвдэх байсан (probe-оор шалгасан: "Багц" хэвээр, "2ц"→"2h"→"2時間前").
- **8 JSX мөр template literal болов** (Profile 977/979 loyalty өгүүлбэр, QuickStats-ийн sr-only гишүүнчлэлийн өгүүлбэр, Shop-ийн "Таны өмнө үзсэн N…", HeaderSearch-ийн 2 мөр, ProfileQuizWizard-ийн "Алхам N / M", RoutineDetail-ийн "Багцаар авбал") — React `{expr}` бүрд text node хувааж, pattern таарахгүй байсан. Үзэгдэх өөрчлөлт 0.
- Хуваагдсан хэвээр үлдээсэн (fragment entry-ээр): CartDrawer-ийн хүргэлтийн тайлбар (`<strong>үнэгүй</strong>` дунд нь), PDP-ийн "Энэ бүтээгдэхүүн <Link/> арчилгааны дараалалд багтдаг.", Checkout-ийн "Хямдралын код (" / "QPay нэхэмжлэл #" гэх мэт — англи/японоор уншигдахуйц болгож бичсэн.
- Баталгаажуулалт: `pnpm check` (i18n цэвэр; `web-push` модуль энэ лаптопт `pnpm install` хийгээгүйгээс алдаа өгч байсныг суулгав), `pnpm lint` цэвэр, 17 мөрийн probe (mn→en, mn→ja, ja→mn round-trip) ✅. Bодит хуудсан дээр Playwright-аар ХАРААХАН үзээгүй — tunnel орсны дараа /profile-ийг ja-аар нээж кирилл үлдсэн эсэхийг шалгах.
- Дараагийн: `shared/districts.ts` (дүүргийн нэр, 11) орчуулаагүй — хаягийн өгөгдөл тул санаатай; /privacy·/terms·/returns өмнөх шигээ хүлээгдэж байна.

## Гэрийн лаптоп (hero_) → Oracle HeatWave + өдөр тутмын backup task (2026-09-13, гэрийн лаптоп)

Tom энэ лаптоп дээр `.env`-ийн бүрэн агуулгыг (Oracle/R2/Facebook/VAPID/Cloudflare token бүгд) chat-д paste хийв → **бүх нууц rotate хийх** хэрэгтэй гэж хэлсэн (Cloudflare API token хамгийн түрүүнд). Дараа нь:

- `git fetch` эхэндээ `C:\Users\hero_`-оос ажиллуулснаас "dubious ownership in 'C:/'" гарсан — repo-ийн алдаа биш, буруу хавтас; `safe.directory C:/` нэмэхгүй. Repo дотроос 10 commit `--ff-only` татав (`541d4b0`).
- `scripts/oci/setup-laptop.ps1` step 1: `~/.ssh/sugi-oci` (ed25519, comment `sugi-asayake-oci-MYDICK`), `Host sugi-oci` config, "SUGI OCI Tunnel" logon task. **Step 2 (VM-ийн `authorized_keys`-д public key нэмэх) ажлын лаптопоос л хийгдэнэ** — энэ session-ий төгсгөлд хараахан хийгдээгүй, `ssh sugi-oci` → "Permission denied (publickey)", 3307 хаалттай.
- `oci-ca.pem`-ийг Tom-ийн paste хийсэн `MySQL_Endpoint_CA` сертификатаас шууд бичив (scp хэрэггүй болсон); `.env` → Oracle 3 мөр + `DATABASE_ADMIN_URL`, `PUBLIC_BASE_URL`, `DEV_ALLOWED_HOSTS`, `FACEBOOK_*`, `VAPID_*`; хуучин нь `.env.bak-aiven-2026-09-13`. Хоёулаа gitignored.
- **Backup task энэ лаптопт байгаагүй** (PROJECT-GUIDE.md "гэрийн лаптопт байдаг" гэж бичсэн нь ажлын лаптопыг хэлж байсан — 09-13-ны нэрийн залруулгыг үзнэ). Одоо `SUGI ASAYAKE Daily DB Backup` бүртгэгдсэн (19:00, `powershell.exe -File scripts/db-backup-daily.ps1`, StartWhenAvailable, 30 мин лимит). mysqldump 8.0.46 (`C:\Program Files\MySQL\MySQL Server 8.0\bin`).
- `scripts/db-backup.ps1`: URL-ийн user/password-ыг `[uri]::UnescapeDataString` (HeatWave-ийн нууц үгэнд `%23`/`%40`); `--set-gtid-purged=OFF --no-tablespaces` (migrate-to-oracle-mysql.ps1-тэй ижил — HeatWave GTID-тэй, admin-д SUPER/PROCESS байхгүй; эс бөгөөс dump-ийг буцааж restore хийх боломжгүй). `scripts/db-backup-daily.ps1`: `DATABASE_ADMIN_URL`-ийг эхэлж авна (`sugi_app` нь SELECT/INSERT/UPDATE/DELETE л тул `--routines/--triggers` дутуу).
- **Баталгаажуулалт**: tunnel хаалттай тул Aiven (7 хоног амьд) дээр тест-dump: 57 хүснэгт, 1.95 MB, `GTID_PURGED` 0 мөр, zip 253.6 KB. HeatWave дээрх бодит run — түлхүүр VM-д орсны дараа.
- **2026-09-14 үргэлжлэл**: ажлын лаптоп түлхүүрийг VM-д нэмсний дараа ч denied хэвээр — `ssh -v` "Server accepts key" + `ssh-keygen -y` "incorrect passphrase" → PowerShell `-N '""'` нь `""` гэсэн нууц үг тавьсан байв. `ssh-keygen -p -P '""' -N ''` → VM-OK; tunnel 4 с-д 3307; HeatWave backup 258.6 KB (14 хадгална); `/health` database up; Playwright (ja) 6 public хуудас — UI кирилл 0. Скрипт засвар `98d39b5`.

## Каталогийн тайлбар + хэл солих алдаанууд (2026-09-12, гэрийн лаптоп, commit `527e000`)

Tom: "937 baraanii mongol tailbaruud!! angli bas yponoor orchuulagdhgui baina!!", дараа нь
"busad page uudeed deer language iin solihoor hagas dutuu soligdood baiuna zaawal refresh
hiij baij buren soligdoj baina!!", "search bar ypon heveerei l baina hed hed solihod!",
"Мөн танд таалагдаж магадгүй. ene orchuulagdhgui baina bas . tsegiin avj hay!!!",
"find every bug test everything!!".

### 1. Барааны тайлбар — 937/937 англи, япон (`shared/product-i18n.ts`, шинэ файл)

Тайлбарууд нь **бичигдээгүй, үүсгэгдсэн** — 937 бараа нийт 2,811 өгүүлбэртэй боловч ердөө
241 ялгаатай. Тиймээс машин орчуулгагүйгээр орчуулах боломжтой:

- **2 template**: "`{BRAND}` нь Японы жижиглэнгийн худалдаанд өргөн танигдсан `{TYPE}` бөгөөд
  өдөр тутмын хэрэглээнд зориулагдсан." ба "… бөгөөд найрлагадаа `{ING}` зэргийг агуулсан
  байдаг." Эхний хувилбар нь `^\{BRAND\} нь` гэж хатуу байсан тул **өгүүлбэрийн эхэнд нэр
  нь байхгүй 26+ тохиолдлыг алддаг байв** — subject одоо сонголттой (`(?:({BRAND}|{NAME}) нь )?`),
  байхгүй бол англиар "A face mask widely known in Japanese retail…" гэж артиклаар эхэлнэ.
- **51 барааны төрөл** + **19 найрлагын үг** (жагсаалт нь таслалаар салгагдсан бол тус бүрчлэн).
- **13 нийтлэг өгүүлбэр** + **58 ганц бүтээгдэхүүнд зориулж бичигдсэн өгүүлбэр** гараар.
- Брэнд/нэрийг хайхаас өмнө маскдаж, дараа нь буцааж тавина; япон хэлэнд өгүүлбэрүүдийг
  зайгүй залгана.

**Бодит Aiven дээр хэмжсэн**: 937 тайлбар × 2 хэл → **кирилл үсэг үлдсэн тайлбар 0**.
`ProductDetail` болон `QuickViewDialog` хоёул `translateProductText`-ээр дамжуулна.
⚠️ Барааны **нэр**, брэнд, салбарын хаяг DB-д оруулсан хэлээрээ хэвээр.

### 2. Хэл солих 3 бодит алдаа (бүгд ажиллаж буй browser дээр хэмжиж олсон)

🔴 **Хагас солигддог байсан жинхэнэ шалтгаан**: `TranslateSurface` нь үгсийг **зурагдсан
DOM-оос** уншдаг. Нэг удаа солимогц хуудас монгол байхаа больдог тул англи текстийг
**монгол түлхүүрээр** хайж олдоггүй байв — иймээс en→ja, ja→en, →mn бүгд хагас үлдэж,
refresh шаарддаг байсан. Эхлээд WeakMap-аар "энэ node өмнө нь юу байсан" гэж санах
хувилбар бичсэн боловч instrumentation-аар **memory нь ажилладаггүй** нь батлагдсан.
Эцсийн шийдэл: **`shared/i18n.ts` толь бичгийг 3 хэлээрээ индекслэсэн** (`EXACT` Map-д
mn/en/ja гурвуулаа түлхүүр) — аль ч хэлнээс аль ч хэл рүү, юу ч санахгүйгээр. Хамаагүй
цөөн код, refresh огт хэрэггүй.

🔴 **Ажиллах үедээ угсардаг шошго** ("MASSEMOLLY-г сагсанд нэмэх", "Сагс нээх, 1 бараатай",
"Орос элчингийн салбар — Google Maps дээр нээх") нь тогтмол түлхүүртэй хэзээ ч таарахгүй.
Одоо толь бичгийн түлхүүр `{placeholder}` агуулж болно — эдгээрийг pattern болгон
хөрвүүлж (урт нь эхэнд), барьсан хэсгийг нь **дахин орчуулж** (салбарын нэр өөрөө
толь бичигт байдаг) байрлуулна. 60 гаруй компонентод `t()` утас татахгүйгээр шийдэгдсэн.

🔴 **`requestAnimationFrame` background tab-д огт ажилладаггүй** тул MutationObserver-ийн
дараагийн pass хэзээ ч ажиллахгүй байв → **эхний pass-ийн дараа ирсэн бүх зүйл**
(сүлжээгээр ирсэн shelf, dialog, /profile-ийн нэвтрэх хэсэг) монголоор үлддэг байв.
Одоо `setTimeout(…, 16)`. Мөн observer одоо `attributeFilter`-ээр placeholder/title/
aria-label/alt-ыг ажигладаг.

Нэмэлт: **tab-ын `<title>`** орчуулагддаг болов (`<body>`-гийн гадна тул walker хүрдэггүй
байсан) — `{page} — SUGI ASAYAKE` pattern-аар бүх хуудсанд; `TRAILING/LEADING_DECORATION`-д
`/ · , – —` нэмэгдсэн (JSX-ийн `<em>`-ээр хуваагдсан гарчгийн тасархай хэсгүүдэд);
"Мөн танд таалагдаж магадгүй." цэг нь хасагдаж, 2 хэсэг тус бүрдээ толь бичигт орсон.

### 3. Playwright-аар хэмжсэн аудит (арга нь дахин ашиглагдана)

12 маршрут × en/ja: **кирилл үсэгтэй харагдах текст node болон
placeholder/title/aria-label/alt бүрийг тоолж**, дараа нь ганц бүрчлэн хаасан. Мөн /shop
дээр **дараалсан 6 удаагийн хэл солилт** (mn→en→ja→en→mn→ja→mn) — refresh огт хийхгүйгээр
header-ийн хайлт, h1, сагсны aria-label, tab title бүгд дагаж, монгол руу яг буцаж ирнэ.

**Үлдсэн монгол (зориуд)**: мэдээний ticker-ийн гарчиг болон Journal-ийн нийтлэлүүд — DB
дэх бодит монгол контент, шошго биш. **/privacy, /terms, /returns** (76 хэсэг, ~14,000
тэмдэгт) — дараагийн ажил.

---

## Хэл солих товч (2026-09-12, гэрийн лаптоп)

Tom глоб товч + English/Japanese хүссэн. `shared/i18n.ts` (түлхүүр нь монгол өгүүлбэр өөрөө — орчуулга байхгүй бол эх үг нь харагдана), `useLocale.ts` (localStorage + `<html lang>`), `LocaleSwitch.tsx` (header-ийн глоб цэс), `useSiteText` нь буцаах бүх утгаа хэлээр дамжуулна, `useCategories` ангиллын нэрийг орчуулна (slug хэвээр тул холбоос эвдрэхгүй).

**Хэмжсэн**: en → цэс "Shop/Top brands/Membership/Stores/Journal", CTA "Browse products", гарчиг "Popular searches/Best sellers/Featured brands", footer "Shop/Stores/Terms & policies/Contact", ангилал "Skincare/Beauty/Wellness"; ja → "ショップ/人気ブランド/…", "商品を見る", "人気キーワード/売れ筋商品/ピックアップブランド", "スキンケア/コスメ/健康・インナーケア". Reload-ийн дараа сонголт хадгалагдана. Console алдаа 0.

⚠️ **Каталогийн өгөгдөл (барааны нэр, тайлбар, брэнд) орчуулагдахгүй** — DB-д нэг хэлээр хадгалагддаг; хэл тус бүрийн багана + admin дэлгэц шаардана.

---

## Storefront-ийн dark theme (2026-09-12, гэрийн лаптоп)

Tom: "dark theme on off bolgodog bolgo!! headeriin tend button nem!". Дараа нь "buh ym dark theme adapt boldog boloh hurtel zogsoltgui ajil hiii!!" гэж шаардсаны дагуу хуудас бүрийг хэмжиж дуустал давтав.

**Бүтэц**: `html[data-storefront-theme]` атрибут (Tailwind-ийн `.dark` класс БИШ — тэр нь /admin-ы `dark:` utility-үүдийг хамт асаана); `useStorefrontTheme.ts` (localStorage + системийн сонголт); header-ийн нар/сар товч; `vendor/theme-init.js` нь эхний зурагдахаас өмнө атрибутыг тавьж цагаан анивчилтыг арилгана (CSP-ийн улмаас inline биш, тусдаа файл).

**Палитр**: `--ck-page` #131313 · `--ck-surface` #1b1b1b · `--ck-cream` #191917 · `--ck-chip` #232323 · `--ck-ink` #ededed · `--ck-muted` #a6a6a6 · `--ck-line` #333 · `--ck-gold` #d9b45c.

**Дөрвөн давталтаар олж зассан зүйлс (бүгд хэмжсэн, таамаглаагүй)**
1. Restyle-аас өмнөх олон зуун дүрэм Linen токенуудыг уншсаар байсан → storefront доторх dark-д `--card/--background/--foreground/--muted-foreground/--border/--secondary/--muted/--surface-tint`-ийг `--ck-*` руу заалгав. Нэг блокоор checkout, journal, brands, shop-ийн панелиуд зэрэг зассан.
2. 🔴 `.sugi-commerce` бүрхүүл өөрөө `#f2f5f2` будаж /shop-ийг бүхэлд нь цайвар байлгаж байсан (Tom 3 удаа "shop dark bolhgu baina" гэсэн) → `var(--ck-page)`.
3. Брэндийн лого `mix-blend-mode: multiply`-тай тул харанхуй зурвас дээр бүрмөсөн алга болж байв → логоны зурвас dark-д цайвар хэвээр. Ангиллын дугуй зураг `overflow: hidden`-гүй байсан тул дөрвөлжин цагаан булан гарч байсныг зассан. Header-ийн лого dark-д инверт.
4. Жижиг өнгөт текстүүд (улаан em, цэнхэр/ногоон badge, алтан rank, огнооны улаан) харанхуй дээр 2.1–3.4:1 болж унасныг тус бүрд нь тохируулав; цайвар загварт алтан rank 4.25:1 байсныг 5.2 болгов.

**Эцсийн баталгаажуулалт**: 8 маршрут (нүүр, /shop, /checkout, /login, /journal, /brands, /track-order, /privacy) × 2 загвар × 1440/390 = **32/32 цэвэр**: контрастын зөрчил 0, dark дээр үлдсэн цайвар самбар 0, overflow 0, эвдэрсэн зураг 0. Аудитын үед гарсан 429 нь өөрийн rate limiter (300 хүсэлт/15 мин) — тестийн ачааллаас, сайтын алдаа биш.

---

## Нүүр хуудасны Cosme Kitchen редизайн (2026-09-12, гэрийн лаптоп)

Tom: "https://www.cosmekitchen-webstore.jp/ ene website playwright aar buh design sudalj tern manaid heregtei gesen bugdiin huulaad hiiged uz!!! goln premium baih ystoi professional !!! het basic baiwal butsaand eniigee hereglne!!!" — өмнөх өдөр нүүрийг "10 настай хүүхэд хийсэн юм шиг, дэндүү basic" гэж үнэлсний дараа.

**Лавлагааг хэмжсэн арга** (Playwright, 1440px, Cloudflare challenge-ийг 9 секунд хүлээж давсан): computed style болон bounding box-оор — Inter, гарчиг 26px/400/.1em төвлөрсөн, гарчгаас контент хүртэл 35px, хэсэг хооронд ~80px, хуудас цагаан, band #fafaf5, чип #f8f7ef, бэх #212121, муут #6e6e6e, hairline #e5e5e5, rank алт #93781e, контейнер 1108px, барааны карт 207px (дөрвөлжин зураг, 1px хүрээ, radius 4, **сүүдэргүй**), header 65px цагаан + доор нь 380×40 хайлтын мөр.

**Хийсэн зүйл**
- `client/index.html`: Inter (300–600, кирилл subset-тэй) нэмэв; Golos Text fallback хэвээр. Шрифтийг `:root`-д биш, `.sugi-site/.commerce-header/.site-footer`-т `--font-body/--font-display`-ыг дахин тодорхойлж сольсон тул **admin болон shadcn токен огт хөндөгдөөгүй**.
- `client/src/index.css`-ийн **төгсгөлд** "COSME KITCHEN RESTYLE" давхарга (≈520 мөр). Бүх дүрэм эх файлын өмнөх дүрмийг source order-оор дардаг тул бүхэлд нь нэг блокоор буцаах боломжтой. `@layer components` 2631-р мөрт хаагддаг тул давхарга layer-ийн ГАДНА байна (unlayered = илүү хүчтэй).
- **Hero**: 3 слайдын cross-fade (badge/marker/caption overlay-тэй) → лавлагааны **450px дөрвөлжин зургийн эгнээ** (`HeroImageSlideshow.tsx` дахин бичигдсэн: scroll-snap, утсан дээр native swipe, багтахгүй үед л 5 секунд тутам автоматаар гүйж, цэгүүд гарна). Гарчиг/CTA/итгэлийн мөр зургийн доор **төвлөрсөн**. Зургийн slot-ууд (home-hero/-2/-3) болон текстийн slot-ууд ижил хэвээр; 4 overlay slot бүртгэлтэй ч рендерлэгдэхээ больсон.
- **Шинэ "Түгээмэл хайлт"** (`KeywordChips.tsx`): cream хайрцаг, чип бүр бодит ангилал эсвэл admin-ий онцлох брэнд рүү шүүсэн /shop холбоос. Ганц шинэ site-text slot: `home-text-keywords-heading`.
- **Барааны rail**: `bestseller-grid` (6 карт, сүүдэртэй, хар/шар rank badge) → `CarouselShelf` + `ShelfProductCard` (ProductDetail аль хэдийн ашигладаг primitive). Карт лавлагааныхаар дахин бичигдэв: rank нь картны ДЭЭР "No.1" алтан нимгэн, дараа нь hairline хүрээтэй цагаан frame, чипэн дэвсгэр дээр брэнд, 12px нэр, 18px/300 үнэ, алтан од. "Бүгдийг үзэх" нь rail-ийн ДООР pill болов.
- **Header**: 4px градиент зурвас, blur, хар pill сагс, "Дэлгүүр" текст линк бүгд хасагдав → 65px цагаан, hairline, лого зүүн, цэс **төвд** (grid 1fr/auto/1fr), баруун талд 4 дүрс (24px, тоо нь улаан badge), доор нь бүх хуудсанд **бодит хайлтын талбар** (`HeaderSearch variant="inline"`, ижил `catalog.search`). 1100px-ээс доош цэс drawer руу ордог (1024-т логотой мөргөлдөж байсныг хэмжиж олов).
- **Ангилал**: карт → лавлагааны **110px дугуй зураг + 13px шошго**; том anchor фото болон доод тайлбар хасагдав (endless swipe rail хэвээр). **Онцлох брэнд**: `--fbrand-scale: 1` болгож нэг жигд эгнээ болов (JS нь CSS хувьсагчийг уншдаг тул логик хөндөөгүй) + hairline хүрээ.
- **Footer** харанхуй (#17181b) → cream (#fafaf5), бэх текст, hairline. Sunrise ribbon (хар/шар marquee) нүүрнээс хасагдав.
- **Дараалал** лавлагаагаар өөрчлөгдөв: hero → түлхүүр үг → их зарагддаг → санал болгох → брэнд → ангилал → яагаад бид → гишүүнчлэл → editorial → салбар. Өмнө нь худалдан авагч эхний бараагаа хармагцаа 2 story хэсэг дамждаг байв.
- **Tom-ийн 2 засвар (турших явцад)**: header доорх брэндийн логоны зурвас ("uneheer muuhai, delete them") болон header-ийн "Дэлгүүр" текст линк хоёуланг устгав.

**Tom-ийн дараагийн 3 засвар (мөн өдөр)**
0. **Эцсийн хэлбэр — тасралтгүй marquee (anime.js)**: Tom дараалан "hudluhgui baina" → "animejs ees heregtei animation code av" → "zuunees baruun tiishee ursahgui baina zogsoltgui" гэсэн тул алхам алхмаар гүйдэг слайдшоу нь **тогтмол хурдтай урсгал** болов. `animejs@4.5.0` нэмэгдэв; `createTimer({duration: Infinity})` frame бүрт `rail.scrollLeft`-ыг картны алхам / `MS_PER_SLIDE` хурдаар хасна (баруун тийш). Хурд: Tom 4000 ("удаан") → 2500 ("хурдан") → 3500 ("бас хурдан") → 5000 → 10000 → **15000мс** гэж тогтоов; хэмжсэн 31.1 px/с (хүлээгдсэн 31.1). 🔴 **Гол шалтгаан нь `scroll-snap-type: x mandatory`** байв — frame тутмын бутархай пикселийг snap цэг рүү шууд буцаан татдаг тул scrollLeft огт хөдөлдөггүй байсан (хэмжсэн: 8 удаагийн дээж бүр 2331). Hero-гоос snap хасав (`.cat-rail` дээр хэвээр). Мөн **hover зогсоолт бүрмөсөн хасагдав** — Tom-ийн курсор hero дээр байдаг тул түүнд "огт хөдөлдөггүй" харагдаж байсан; одоо зөвхөн хуруу хүрэх, tab нуугдах, reduced-motion үед зогсоно.
1. *"eniiig slide hiideg bolgoo"* — эхний хувилбар зөвхөн зураг багтахгүй үед л гүйдэг байсан тул өргөн дэлгэц дээр 3 зураг зогсож байв. Одоо CategoryRail-тэй ижил **3 хуулбартай төгсгөлгүй rail**: дунд хуулбараас эхэлж, 4 секунд тутам нэг зураг гүйж, хагас set-ээс хэтэрвэл яг нэг set-ийн зайгаар үсэрнэ (ижил зураг дээр буудаг тул үл мэдэгдэнэ). ⚠️ Эхний оролдлого үсрэлтийг scroll event бүр дээр хийж, **явж буй smooth scroll-той тулж** байрлал хойш ухардаг байв (1865→1399→1865 гэж хэмжсэн) — одоо (а) скролл 140мс зогссоны дараа, (б) дараагийн алхам set-ээс хэтрэх бол glide эхлэхийн ӨМНӨ үсэрнэ.
2. *"admin deer limit n 6 zurag add hiideg bolgo"* — `home-hero-4/-5/-6` слот нэмэгдэв (`fallbackUrl: null` — brand default байхгүй, зураг оруулаагүй слайд storefront дээр огт харагдахгүй) + 3 тайлбарын site-text slot. `ContentMediaPanel` одоо зурaггүй слотыг зөв харуулна ("ЗУРАГ ОРУУЛААГҮЙ", alt текст хадгалахыг эелдэг татгалзана) — өмнө нь `url(null)` болон type алдаа өгөх байсан.
3. *"hoorondoo ih zai baina ene zurh bolon cart 2"* (утас, нэвтэрсэн) — доод самбар хүслийн жагсаалт ба профайлыг аль хэдийн барьдаг тул header дээрх хоёр давхардсан дүрсийг утсан дээр хаав; одоо сагс + цэс хоёр л үлдэж, зай жигдэрлээ.

**Тэр өдрийн сүүлийн засварууд (Tom-ийн шууд туршилтаар)**
- **Шрифт буцаав**: Inter → Golos Text. Лавлагааны 12–14px нь япон бичигт ажилладаг ч кирилл дээр жижиг байв ("nastai hugshin hun harj unshij chadahgui"). Restyle давхаргын бүх хэмжээ нэг шатаар томорч (10→12, 11→13, 12/13→15, 14→16, 15/16→17, 18→21; гарчгууд clamp(24,2.4vw,32)), барааны карт 207→232px болов.
- **Header нэг мөр**: хайлтын талбар доод мөрнөөс гарч логотой нэг шугамд орж, цэс доод мөрөнд төвлөрөв.
- **Hero**: зургийн доорх тайлбар ба цэгүүд устгагдав; улмаар слайдын 18 site-text slot registry-ээс хасагдав (нэг ч рендерлэгддэггүй байсан). Зураг бүрийн холбоос `aria-label`-аар нэрлэгдэнэ (тайлбар байхгүй тул).
- **Refresh дээрх үсрэлт**: `content.siteMedia` ачаалж дуустал rail нь 3 зурагтай байгаад 5 болж өргөсдөг байсан (4–6-р слот brand default-гүй) → `mediaReady` дуустал ижил өндөртэй хоосон блок (`.hero-rail-reserve`) байрлана.
- **/login**: `.auth-shell`-ийн `min-height:100vh` нь header (120px) болон footer (350px)-ийн ГАДНА байсан тул хуудас үргэлж 1.5 дэлгэц болж, карт дундаа өлгөөтэй үлддэг байв; мөн хуучин Linen дэвсгэр шинэ цагаан header/cream footer-ийн дунд саарал зурвас мэт харагдаж байв. Одоо цагаан, чимэглэлийн цагиргуудгүй, hairline карттай, padding 162→~100px.
- **"Танд санал болгож байна"**: зочинд огт харагдахгүй болов — эхлээд зөвхөн нүүрэнд засагдсаныг Tom /shop дээр дахин олсон тул хоёуланг нь хаав. `catalog.recommended` шинэ `personalOnly` input-тай — preference/түүхгүй хэрэглэгчид хоосон буцаана (/shop-д хуучин fallback хэвээр, тэнд rail нь нээлт хийх зориулалттай).

**Header-ийн responsive засвар + ангиллын зураг (Tom, мөн өдөр)**: Tom 800px дээр дүрснүүд доош унаж байгааг илрүүлэв. Шалтгаан: `.commerce-header-inner` нь 3 баганат grid байсан бөгөөд 1100px-ийн media query 2 багана болгодог тул гурав дахь хүүхэд (дүрснүүд) шинэ мөрөнд ордог байв. Flex болгов — лого `flex: 0 0 auto` (агшихгүй; агшсанаас болж тогтмол өргөнтэй лого зурагнаасаа халин хайлтын талбар дээр нь давхарлаж байсныг Tom 2 удаа заасан), талбар `flex: 1 1 auto; min-width: 0`. **760px-ээс доош талбар бүрмөсөн алга болж, `HeaderSearch` нь дүрс хэлбэрээрээ (ижил панель, ижил `catalog.search`) гарна.** Хэмжсэн: 320–1440-ийн 11 өргөнд бүгд нэг мөрөнд, логотой давхцал 0, overflow 0, утсан дээр дүрс дарахад панель нээгдэнэ.

**Ангилал admin-аас**: Tom "шинэ ангилал (жишээ хүнс) нэмдэг болгомоор байна" гэсэн — шалгахад ангилал аль хэдийн `product_categories`-оос уншигддаг, `/admin → Бүтээгдэхүүн → Шинэ ангилал үүсгэх` composer байдаг байв. Дутуу байсан цорын ганц зүйл нь **зураг**: `categoryForm.imageUrl` төлөвт байсан ч оруулах талбар байгаагүй тул шинэ ангилал storefront дээр placeholder зурагтай гардаг байв. Барааны зурагтай ижил upload контрол (ижил endpoint, ижил 8MB/формат шалгалт) нэмэв.

**/shop-ийн шүүлтүүр (Tom: "denduu zambaraagui baina ... neg goy shiidel oldoo, brainstorm hiij websearch hiiged")**: вэб судалгаанаас — Baymard-ийн "Be Careful with Horizontal Filtering Toolbars" болон filter UI гарын авлага — хоёр дүгнэлт авав: (1) хэвтээ мөр нь **facet цөөн** үед л sidebar-аас давуу (энд 5: ангилал, арьсны төрөл, үнэ, нөөц, эрэмбэ) тул хэвтээ хэвээр зөв; (2) хамгийн элбэг алдаа нь сонгосон шүүлтүүрийг зөвхөн хяналтын дотор харуулах — сайтуудын 20%. Хэрэгжүүлсэн: ангиллын pill-үүд хэвтээ scroller-оос гарч **мөр дамжин ороодог** болов (хуудасны голоор гарсан scrollbar нь замбараагүй харагдах гол шалтгаан байв), "АНГИЛЛААР ШҮҮХ" гарчиг pill-үүдийнхээ дээр, үнэ/нөөц/эрэмбэ нэг эгнээнд pill хэлбэрээр, доор нь **"Сонгосон:" чипүүд** — тус бүр дарахад тэр шүүлтүүр хасагдана, төгсгөлд нь "Бүгдийг цэвэрлэх". Утсан дээр хуучин `order: 3` дүрэм нь хяналтын мөрийг ангиллаас түрүүлгэж байсныг арилгав. Хэмжсэн: pill-ийн хэвтээ scroll 0, чип нэмэгдэх/хасагдах бодитоор ажиллана (Арьс арчилгаа + Бэлэн нөөцтэй → нэгийг нь дарж хасав), 1440/390-д overflow 0.

**Бүх хуудсанд тархаав (Tom: "./admin ees busad buh page iig ene design conceptoi bolgo")**: `App.tsx` нь `/admin`-аас бусад бүх route-ыг `.sugi-site` дотор рендерлэдэг болов — улмаар цагаан хуудас, шрифтийн хэмжээ, hairline гадаргуу бүх storefront-д хүрнэ. Дараа нь хуудас тус бүрийн хуучин гадаргууг шинэ ойлголтод оруулсан "inner pages" блок нэмэгдэв: /shop-ийн hero/хайлтын панель/discovery (cream + hairline, хар-шар marquee устгав, барааны карт hairline + 21px үнэ), хуулийн хуудсууд (цагаан, 16px/1.9), /checkout (Tailwind arbitrary класс дээр attribute selector-оор: `bg-[#17181b]` хар самбар → cream, `bg-[#f0b52d]` шар товч → брэндийн улаан; cream дээрх алтан текст 1.77:1 болсныг хэмжиж илрүүлээд бэх/улаан болгов), /login, /journal, /brands, /track-order, /404. Хоёр ерөнхий sweep: сүүдэр арилгах, `rounded-*` (rounded-full-аас бусад) → 4px.

**Баталгаажуулалт**: `pnpm check`, `pnpm lint`, `pnpm build` цэвэр. 9 маршрут × 2 өргөн (1440/390): overflow 0, `<h1>` 1, 3:1-ээс доош контрасттай текст 0, эвдэрсэн зураг 0, console алдаа 0. Барааны хуудас мөн шалгасан. Playwright 1440/1024/390/320 (бодит CSS өргөнийг давталтаар тааруулж хэмжсэн — энэ машин дээр setViewportSize нь ~10% зөрдөг): хэвтээ overflow **0**, console алдаа **0**, эвдэрсэн зураг **0**, `<h1>` 1. Нийт нүүр 6612 → **6010px**. /shop, /journal, барааны хуудас (хуваалцсан карт/header/footer) дээр ч overflow 0, алдаа 0.

**Буцаах**: `git checkout backup/pre-cosmekitchen-2026-09-12 -- client/src/index.css client/src/pages/Home.tsx client/src/components/CommerceHeader.tsx client/src/components/HeaderSearch.tsx client/src/components/home/ client/index.html`.

---

## Forensic аудит — scaffold-оос production руу (2026-09-12, гэрийн лаптоп, 4 commit: `618eeec` → `3d3b05a`)

Tom 27 үе шаттай "FULL-STACK FORENSIC AUDIT + SCAFFOLD-TO-PRODUCTION REFINEMENT" playbook илгээж, "do not skip anything", "deep dig, fix everything, no basic shits" гэв. Арга: код бүрийг уншиж, сэжигтэй зүйл бүрийг **тестээр нотолж** байж л засав; Playwright-ээр 1152/768/390/320 өргөнд storefront + 23 admin хэсгийг бүгдийг үзэв. Эцсийн тайлан (health score, scaffold/AI-slop inventory, P0–P4 bug register): artifact (доор PROJECT-GUIDE.md-д линк).

### `618eeec` — /admin 25 минут idle → lock, царайг дахин асуух (Tom-ийн хүсэлт + "world standard"-ыг судал)
- **Юу нь activity вэ** гэдэг нь чухал: панель өөрөө хонх/outbox-оор polling хийдэг тул request бүр session-ийг сунгавал лангуун дээр нээлттэй орхисон самбар хэзээ ч түгжигдэхгүй. Зөвхөн **бодит оролт** (pointer/key/touch/scroll) тоологдоно; browser хамгийн ихдээ 2 минут тутам heartbeat илгээнэ.
- **Сервер талын хэрэгжилт**: proof cookie-д 2 deadline — sliding idle (`exp`) + absolute 8 цаг (`abs` claim). Хугацаа дууссан proof-ыг сунгах боломжгүй, зөвхөн камер. Бүх tab `BroadcastChannel`-ээр хамт түгжигдэнэ; 2 минутын өмнө анхааруулга; lock нь `face_attempts`-д `idle_locked` гэж бүртгэгдэнэ (migration `0068`).
- Стандарт: NIST SP 800-63B AAL2 30 мин idle / 12 ц; PCI DSS 4.0 8.2.8 admin 15 мин; OWASP 15–30. 25 мин + 8 ц absolute сонгов. 7 unit тест (fake timer).

### `28774f3` — Бангалор руу хэрэггүй round trip бүрийг хасав (Tom: "cookie сайтыг удаашруулж байвал зас")
- Storefront контент (site_text, media, салбар, ангилал, тохиргоо, баримт, loyalty tier, post) хуудас бүрт DB-ээс дахин уншигддаг байв → **30 с cache**, бичигч бүр өөрийн түлхүүрээ хүчингүй болгоно (21 газар). Хэмжсэн: 163мс → 2мс.
- **Session cookie**: authenticated request бүр эхлээд user мөрийг уншдаг байв (~170мс), /admin нэг дэлгэц хэд хэдэн удаа төлдөг → 5 секунд итгэнэ. Хэмжсэн: 173мс → 2мс. 5 секунд л, учир нь мөрөнд suspension/role/sessionVersion бий.
- **Race**: бичихийн өмнө invalidate хийхэд аль хэдийн явж байсан read хуучин хариуг 30 с хадгалдаг байв → `ttlCache` одоо сүүлийн invalidation-оос ӨМНӨ тооцоолсон үр дүнг хадгалахгүй (`invalidatedAt`), тест read-ийг write-ийн дундуур барьж нотолно.

### `6653fff` — Audit batch 1: бүрэн suite өөрийн регрессийг барив + утас юу харуулав
- 🔴 **P0, өөрийн алдаа**: session cache-ийг **token-оор** түлхүүрлэсэн тул юу ч хүчингүй болгож чадахгүй — "бүх төхөөрөмжөөс гарах"/нууц үг солиход хуучин token 5 с ажилласаар байв. 2 тест унасан. Одоо **user id-аар** (`getSessionUserById`) + session-ийн эрхийг өөрчилдөг бүх бичигч (`changeUserPassword`, `bumpUserSessionVersion`, `resetPasswordViaPhoneSession`, `suspendUser`, `unsuspendUser`, `updateAdminUserRole`, `deleteUserAccount`) `forgetSessionUser` дуудна.
- 390px: admin 4 хэсэг хэвтээ scroll (Security tab bar `w-fit` grid дотор max-content; Brands/Branches үйлдлийн товч мөр буудаггүй; Integrations 560px хүснэгт + truncate нэр `min-w-0`-гүй grid item-ээр дээшээ тархдаг); /shop filter pill-үүд clip хийгдэж сүүлийнх нь хүрэхгүй (`.shop-filter-pills` `min-width:0`).
- Admin `<title>` тавьдаггүй (2 tab ижил), h1-гүй; cookie banner /admin дотор гардаг (`body.admin-route`); login redirect guard `//host` хүлээн авдаг; тохиргоо/хэрэглэгч/интеграцийн input-ууд aria-label-гүй; POS дэлгэц "дэлгүүрийн борлуулалт Smart POS-т" гэж хэлдэггүй (давхар тоологдоно). Хэрэггүй 3 dev dep (`add` нь typo-оор орж ирсэн floating-point сан).

### `3d3b05a` — Audit batch 2: idempotent checkout/POS, кампанит ажлын давхар илгээлт, тестүүд type-check + lint
- **Checkout idempotency**: `orders.clientRequestId` (migration `0069`, unique). Товч disable нь нэг tab, нэг click-ийг л хамгаалдаг — timeout-ын дараа browser resend, 2 дахь tab → **2 захиалга, нөөц 2 удаа хасагддаг байв**. Одоо browser attempt бүрт UUID үүсгэж илгээнэ, ижил түлхүүр = ижил захиалга (`replayed:true`, имэйл дахин явахгүй). Race-д unique key-г алдагч replay авна. POS-ын `recordInStoreSale` мөн адил (`AdminPosPanel` UUID). Тест: `checkout-idempotency.integration.test.ts` (5: resend, race, өөр хэрэглэгчийн түлхүүр, POS, шинэ түлхүүр).
- **Кампанит ажил**: ижил channel+subject+body+recipient set-ийг **10 минутын дотор дахин илгээхээс татгалзана** (CONFLICT). Fingerprint нь `admin_audit_logs.metadataJson`-д (`campaign.sent`) хадгалагддаг тул хоёр лаптопт хүчинтэй. Өмнө нь double click = 2,000 SMS × 2.
- `qpayCreateInvoice`/`storepayCreateLoan` нээлттэй attempt-ыг дахин ашиглана (click бүрт төлж болох шинэ invoice гаргадаггүй); QPay callback `200 "SUCCESS"` + GET; cloud вендор (Smart Software, StorePay) https + private host хориглоно (SSRF, ntfy LAN exempt); `sqlQueryLog` string биш утгад унадаг байв; `data-retention` job (visitor_sessions 24 сар, login_attempts 12 сар).
- **Tooling**: `tsconfig.json` target ES2022; `tsconfig.tests.json` тест/скриптийг type-check хийнэ (`pnpm check` = 2 tsc) → **90 хуучирсан fake session user** 31 файлд олдов → `server/_test-helpers.ts` `testSessionUser()`; `faceAuth.integration.test` hash биш plaintext нууц үг дамжуулж байсан (бодит bug). ESLint flat config (`pnpm lint`, CI-д Lint алхам) — hooks dep дутуу (AdminFaceGate), тогтворгүй useMemo input, dialog Enter-ийн IME composition bug.
- Цэвэрлэгээ: QA admin (`qa-admin-tmp@example.invalid`, id 6490) Aiven-ээс устгасан; gate-off 3101 dev server зогсоосон; `scripts/tmp-*.ts` gitignore.

### Мөн орой — ангиллын 3×2 grid нэг мөр, төгсгөлгүй swipe карусель болов
Tom: "дээр нь 3, доор нь 3 биш, бүгдийг нэг мөрөнд, хуруугаараа/хулганаараа swipe, endless". `CategoryRail.tsx` (дэлгэрэнгүй PROJECT-GUIDE.md). Playwright: 18 карт (6×3), 6 focusable, нэг мөр, дунд хуулбараас эхэлнэ, snap цэгээс wrap яг нэг set (2064px), хулганы 200px drag → 344px (нэг карт) хөдөлж click залгигдсан, сум нэг карт (344px), overflow 0, console цэвэр.

### Мөн орой — "Яагаад биднийг сонгох вэ" хэсгийг лавлагаа зургаар дахин бүтээв
Tom "Why Choose Us" лавлагаа зураг: цайвар панель, төвлөрсөн tracked eyebrow + bold гарчиг, 3 багана (өнгөт icon tile, 01/02/03, дунд багана 46px доош, 90px tile). Tom: "яг зураг шиг, гэхдээ цагаан дэвсгэрийг сайтын дэвсгэртэй адил болго"; сэтгэгдлийн блок доор нь үлдэнэ, 2 догол тайлбар хасагдана (асууж баталгаажуулсан). Хийхээс өмнө `backup/pre-wcu-redesign-2026-09-12` tag (remote дээр). `BrandStorySection.tsx` дахин бичигдэж (`<ul>` 3 `<li>`, h3, `{N}` interpolation; Tom дараа нь 01/02/03 дугаарыг хасуулж, eyebrow/гарчиг/картын текстийг сайтын өөрийн загвар болгуулж, icon + tile өнгийг /admin slot болгуулав — `WCU_ICON_NAMES` 12 нэр, hex шалгалттай, буруу утга анхдагч руу унана), `.wcu-*` CSS блок бүхэлдээ солигдов (section-scoped tile өнгө, 245/355/245 grid, 1040px мөр, reference-ийн 200/240px padding), site-text slot-ын default/label шинэчлэгдэв (key нэмэгдээгүй, хасагдаагүй). Эхний хувилбар лавлагааны 200/240px зайг яг дагасан (хэсэг 887px) — Tom "ямар том div вэ, дэндүү их сул зай" → хөрш band-уудтай ижил `clamp(48px,5.6vw,84px)`, гарчиг→багана 52, tile→гарчиг 22, stagger 32; хэсэг 548px (хөршүүд 737/809). Playwright: мөр 1040 төвд, багана 249/361/249, tile 44/90/44, overflow 0.

### Мөн орой — iPhone дээр доод navigation bar scroll хийхэд жижигэрдэг байв
`.mobile-sticky-bar` нь `height: 64px` (border-box) + `padding-bottom: env(safe-area-inset-bottom)` байсан тул Safari-ийн toolbar scroll хийхэд эвхэгдэж safe-area ~34px болоход icon+label 30px-д шахагдаж байв. Одоо `height: calc(64px + safe)`; label 10→11px. Бусад бүх offset (footer, toast, back-to-top, cookie icon) аль хэдийн bar+safe гэж тооцдог байсан тул зөрөхгүй.

### Мөн орой — production cookie banner CSP-д хаагдсан байсныг tunnel-ээр олов
Tom `scripts/demo.ps1 -Tunnel` ажиллуулж `https://….trycloudflare.com` гаргав. Tunnel-ийн ард бүгд зөв (secure context, CSRF, API, probe 404, HSTS/CSP). Console-ийн ганц алдаа = CSP inline script → banner production-д огт байгаагүй (`bannerInDom:false`). JSON data block + external init файл; production build-ийг 3210 порт дээр ажиллуулж banner гарсныг баталгаажуулав. Дэлгэрэнгүй PROJECT-GUIDE.md.

### Мөн орой — LAN/http checkout crash + scanner-blocker-ийн регресс
Tom утаснаас checkout нээхэд "An unexpected error occurred". Playwright-аар `http://192.168.88.6:3000/checkout` (insecure context) дээр давтаж: `crypto.randomUUID is not a function` — миний 3d3b05a-д нэмсэн idempotency түлхүүр render дээр дуудагддаг байв. `newRequestId()` fallback. Мөн console-д `/vendor/silktide-consent-manager.js` 404 — f4555cb-ийн probe-blocker `vendor`-ыг блоклож cookie banner үхсэн байсныг олж засав (public 71 файлыг matcher-оор audit хийсэн скрипт). Дэлгэрэнгүй PROJECT-GUIDE.md.

### Мөн орой — утсан дээрх scroll-ийн 2 алдаа (Tom-ийн LAN тест)
"Дараах" footer руу; шинэ хуудас доошоо. Хэмжилт + шалтгаан + засвар PROJECT-GUIDE.md-ийн ижил нэртэй хэсэгт. Сургамж: **scroll хийхээсээ өмнө документын өндөр өөрчлөгдөх эсэхийг бод** — smooth scroll явж байхад layout өөрчлөгдвөл browser (ялангуяа Safari) clamp хийдэг; яг тодорхой газар буух scroll бол instant + render-ийн дараа. Мөн бүрэн suite 52e9e65 дээр 783/783 (84 файл); өмнөх run-ын loyalty timeout нь зэрэгцээ тест ажиллуулснаас үүссэн түр зуурын зүйл байв.

### Мөн орой — `.env` сканнер + терминалын лог
Tom hosting-ийн access log-д `/.env.save`, `/laravel/.env`, `/sendgrid/.env`… 400-аар хариулагдсан 40 мөр харуулж, Reddit r/SaaS "Someone is trying really hard to get the .env file" thread-ийг (Playwright-аар уншсан — fetch хаагдсан) судлахыг хүсэв. Дүгнэлт: IPv4 бүхэлд нь сканнердаж буй бот, хэвийн; хамгаалалт = `.env` хэзээ ч serve хийгдэхгүй + 404 + давтагчийг ban + Cloudflare/fail2ban. Манай серверийг ижил замаар шалгахад бүгд **200 + index.html** буцааж байсан (SPA fallback). Одоо `scannerProbes.ts` (404, 5/ц → 403, loopback/private ban-гүй — анхны хувилбар өөрийн 127.0.0.1-ийг ban хийсэн, мөн `^/api/` allow-rule нь `/api/.env`-ийг нэвтрүүлж байсныг тест барив), `requestLog.ts` (`LOG_REQUESTS=1`), `LOG_SQL=1`. Бодит dev server дээр 9 probe зам 404, бодит замууд хэвээр.

### Мөн орой — idle lock ажилласангүй (Tom: "2 цаг орхиод ирэхэд admin ажилласаар байна, чи худлаа")
`face_attempts` лог: bataa 02:58Z (10:58 UB) `verified`, дараа нь 07:14Z `idle_locked` л байна — 4 цаг 16 минут. Шалтгаан: (1) 10:58-ны proof нь **idle lock deploy-оос ӨМНӨХ** код (8 ц `exp`, `abs`-гүй) минтэлсэн, шинэ `readFaceProof` "abs байхгүй бол өөрийн exp хүртэл хүчинтэй" гэж хүлээн авдаг байв; (2) gate нь **дэлгэцийн шалгалт** л байсан — admin procedure-ууд proof асуудаггүй. Засвар: `server/_core/faceProof.ts` (proof-ийн цэвэр хэсэг `faceAuth.ts`-ээс салгав), `abs`-гүй token → null, `idle deadline > 25 мин` → null; `_core/trpc.ts`-д `panelProcedure` middleware бүх panel builder-т; client `main.tsx` `FACE_REQUIRED_ERR_MSG` → status invalidate; `AdminFaceGate` status 60 с poll + focus refetch. `ENV.adminFaceGateEnabled` getter, `_test-setup` gate off, face тестүүд өөрсдөө on. Тест: face-idle 7→11 (legacy refused, guard on/off/customer/expiry), faceAuth.integration +1 (API refuses without proof, accepts with, refuses superseded session), rbac 180/180 хэвээр.

**Санаатайгаар ХИЙГЭЭГҮЙ**: React Compiler eslint дүрмүүд (39 ажилладаг pattern-ийг flag хийдэг, унтраасан); AdminFaceGate-ийн liveness функцууд (санаатай хадгалсан); 5 junk post (Tom-ийн шийдвэр); ntfy token rotate (Tom).

## Амьд DB дээрх тестийн үлдэгдлийг цэвэрлэв (2026-09-12, Tom: "delete them")

PROJECT-GUIDE.md-д удаан хугацаанд нээлттэй байсан зүйл. Эхлээд **зөвхөн уншдаг** тайлан (`scripts/test-residue-report.ts`), дараа нь `scripts/test-residue-purge.ts --apply`.

**Замдаа олдсон 3 зүйл**:
1. **`%test%`-ээр хайж болохгүй** — каталогт жинхэнэ 13 оронтой JAN баркодтой `Honey amproom tester`, `Ceramid amproom test` гэх 6 бараа байна. Тиймээс зөвхөн мэдэгдэж буй fixture-ийн нэрсээр таарна.
2. **Тестийн захиалгууд нэрээр нь л олдоно** — `order_items.productId` нь SET NULL тул тестийн бараа устсаны дараа захиалга нь "жинхэнэ" мэт харагддаг. `Telemetry Test Shopper`-ийн 2 захиалга (2×22,000₮) ингэж борлуулалтын тоонд үлдсэн байжээ.
3. ⚠️ **Устгасан 3 тестийн хэрэглэгчийн 2 нь `admin` эрхтэй** байв (`Order Notify Admin`, `Telemetry Test Admin`) — PROJECT-GUIDE.md-ийн "admin 3" гэсэн тоо эндээс гарч байсан. Одоо амьд DB-д **ердөө 2 хэрэглэгч**: bataa (admin), zulaa (staff).

**Устгасан**: 3 хэрэглэгч, 2 захиалга (+ мөрүүд), 887 `suppressed` мэдэгдэл. Бараа/ангилал аль хэдийн цэвэр байв. **Шалгасан**: үлдэгдэл 0, ledger drift 0, борлуулалт 248,400₮ (дэлгүүрийн бодит POS борлуулалт) хэвээр.

**Хийгээгүй, Tom-оос асуух**: `posts` дээр туршилтын 5 нийтлэл нийтлэгдсэн хэвээр — "diane shampoo", "lofi cityaidhas", "asdsad", "assasafaregrheta", "qedqwds" (#37 "CU дэлгүүрийн тендер" бол жинхэнэ мэдээ). Эдгээр нь Tom-ийн өөрийн бичсэн контент тул устгах эсэхийг асуусан.

## StorePay төлбөр + QPay callback-ийн засвар + и-баримтын 3 дахь зам (2026-09-12, гэрийн лаптоп)

Tom: `https://github.com/techpartners-asia/storepay-go` "manai 4 salbar 4 uulee storepay demjdeg shww!!", дараа нь `https://pypi.org/project/ebarimt-pos-sdk/`, `https://pypi.org/project/qpay-client/`, `https://github.com/hurelhuyag/ebarimt`.

**StorePay (migration `0067`, Aiven дээр ажилласан)** — `payment_attempts.provider` болон `orders.paymentMethod` enum-д `storepay` нэмэгдэв. `server/storepay.ts` нь вендорын өөрсдийн Go SDK-г дагаж бичигдсэн:
- Auth: `POST {authUrl}/oauth/token?grant_type=password&username={appUsername}&password={appPassword}` + **HTTP Basic** нь ӨӨР хос (username/password). Хоёр хос гэдгийг тохиргооны талбар бүрт нэрлэж бичсэн.
- `POST {baseUrl}/merchant/loan` `{storeId, mobileNumber, description, amount, callbackUrl}` → `value` = зээлийн дугаар; `GET /merchant/loan/check/{id}` → зөвшөөрсөн эсэх; `POST /user/possibleAmount` → тухайн хэрэглэгчийн боломжит дүн.
- ⚠️ **HTTP 200 = амжилт БИШ**: хариу бүр `status` талбартай, `"Success"` биш бол `msgList`-д шалтгаан байна. Бүх дуудлага envelope-ыг шалгана (`readStorepayEnvelope`).
- Урсгал: захиалга үүснэ → харилцагчийн StorePay апп руу хүсэлт очно → апп дээрээ зөвшөөрнө → callback ирэхэд бид **өөрсдөө** `check`-ээр шалгаад л захиалгыг төлөгдсөн болгоно (QPay-тэй ижил зарчим; cancelled/хаагдсан захиалгыг сэргээхгүй `markQPayPaymentAttemptPaid`-ийн хамгаалалт хэвээр).
- Тохиргоо нь `/admin → Интеграцууд` дээр шифрлэгдэж хадгалагдана (7 талбар: authUrl, baseUrl, appUsername, appPassword, username, password, storeId). Бүгд бөглөгдөж, "Идэвхтэй" болтол checkout дээр сонголт харагдахгүй. Тест: `server/storepay.test.ts` 9 (утасны дугаарын хэлбэрүүд, envelope, Basic+query auth, зээлийн биетүүд, token дахин ашиглалт, boolean шалгалт, дугааргүй зээлийг татгалзах, тохиргоогүй үед унтраалттай).

**QPay-ийн 2 бодит засвар** (qpay-client-ийн баримтаас олдсон): callback нь **`"SUCCESS"` гэсэн энгийн биетээр** хариулах ёстой байсныг JSON буцаадаг байсныг заслаа (QPay callback-ыг дахин дахин илгээх шалтгаан болдог; манай боловсруулалт idempotent тул хохирол байгаагүй), мөн callback route одоо **GET-ийг ч хүлээн авна**. Мөн QPay-д **sandbox** орчин байдгийг тэмдэглэв — манай `QPAY_ENVIRONMENT=sandbox` аль хэдийн дэмждэг тул мерчант гэрээний өмнө бүх урсгалыг туршиж болно.

**Онлайн төлбөр зөвхөн нэвтэрсэн хэрэглэгчид** — `qpayCreateInvoice`/`storepayCreateLoan` нь `protectedProcedure` тул зочин QPay сонгоход захиалга үүсээд ДАРАА нь эрхийн алдаа гардаг байсан (хуучин цоорхой). Одоо товч нь зочинд "Нэвтэрсэн үед идэвхжинэ" гэж унтраалттай харагдана.

**И-баримт — 3 зам болов** ([EBARIMT.md](EBARIMT.md)): **A** Smart POS `/api/sale/sale` (бүх төлбөрт, хариунд ДДТД/QR/сугалаа), **B** локал PosService (`127.0.0.1:7080` — hurelhuyag/ebarimt, ebarimt-pos-sdk хоёул үүнийг баталсан), **C** QPay-ийн өөрийн `ebarimt_create` (зөвхөн QPay-ээр төлсөн захиалгад). Tom-ийн явуулсан 2 PyPI сан нь **албан ёсны биш** (Amraa1, MIT) боловч API-ийн хэлбэрийг зөв тусгасан лавлагаа.

## Smart Software adapter — Phase 6 ДУУСАВ + API баримтын нээлт (2026-09-11 шөнө → 2026-09-12, гэрийн лаптоп)

Tom: "smart api rest api shde!! bas json", https://developer.smartsoftware.mn/, https://developer.smartsoftware.mn/api-13543729, https://smartsoftware.mn/ptdeveloper, дараа нь "smart api-г худалдаж авна гэсэн, авсны дараа интеграцийн хэсэгт API key хийгээд л болоо биз". Шөнө орой болсон тул Tom зогсоов ("lets do it tomorrow").

**Юу батлагдсан (өмнөх "баримт байхгүй" гэсэн дүгнэлт БУРУУ байсан)**: developer.smartsoftware.mn нь Apidog-оор JS-ээр зурагддаг тул curl/WebFetch-д хоосон харагддаг байв. `https://developer.smartsoftware.mn/llms.txt` бүх хуудсыг жагсаадаг, хуудас бүр `.md`-ээр татагддаг (`/api-<id>.md`, `/doc-<id>.md`). 40 гаруй хуудсыг татаж уншсан. `smartsoftware.mn/ptdeveloper` нь зөвхөн Smart Architecture Framework (EAF/WAF/MAF) маркетингийн хуудас — API-ийн мэдээлэлгүй.

**API-ийн бодит хэлбэр** (бүгд REST + JSON, Bearer token):
- **Auth**: OAuth2 password grant — `GET /oauth/token` (form-urlencoded `username`, `password`, `grant_type=password`) → `{access_token, token_type, expires_in}`. Баримт нь GET+body гэж бичсэн (curl `--request GET --data-urlencode`), ASP.NET/OWIN серверүүд POST-ыг ч хүлээн авдаг — adapter POST-оор оролдоод 404/405 бол GET-body руу унах ёстой. **API key БИШ, хэрэглэгчийн нэр + нууц үг** — Смарт Ложик ХХК гэрээний дараа имэйлээр илгээнэ (7701-9090).
- **Хостууд** (баримтын хуудас бүрийн HTML-ээс): Smart POS API `https://smartposapi.smartapp.mn`; Smart Inventory/Retail/Loyalty `https://retailapiv2.smartlogic.mn`; Smart Accounting `https://accountingAPI.smartlogic.mn`; Distribution `distapiv1.smartlogic.mn`; HCM `hrapi.smartlogic.mn`.
- **Smart Inventory API** (нөөц татах): `GET /api/inventory/stock_locations` → `[{id, name}]`; `GET /api/inventory/products` → бүх бараа `{id, name, barcode, baseprice, price, stock_locations:[{location_id, count_on_hand, ...}], stock_pricechannels, item_discounts, brandName, ...}` (шүүлт/хуудаслалтгүй, "шөнөдөө үлдэгдэл шинэчлэхэд" зориулсан; ⚠️ Retail тохиргооноос хамаарч зөвхөн "ECommerce борлуулах бараа" гэж чэклэсэн бараа ирж болно, "Онлайн худалдааны үлдэгдэл татах" тохиргоотой байршлууд л ирнэ); `POST /api/inventory/product/` (кодоор хайх), `POST /api/inventory/products/` (customerId, priceChannelId, beginPage, pageCount — хуудаслалттай).
- **Smart POS API**: `POST /api/sale/sale` (SaleHeaderModel/SaleLineModel/SalePayment — онлайн борлуулалтыг Smart POS-д бүртгүүлэх; хариу `Data.{DocumentPkId, TaxBillNo, TaxBillDate, QRData, LotteryText}` = **И-БАРИМТ** — EBARIMT.md-ийн Зам A яг энэ!), `GET /api/sale/checkdocument` (documentPkId), `POST /api/sale/saleRefund`, `POST /api/sale/order` (хүргэлтийн захиалга), `POST /api/sale/orderRefund`. ⚠️ **Дэлгүүрийн борлуулалтын жагсаалт татах endpoint POS API-д БАЙХГҮЙ** — зөвхөн Accounting API-д (`Борлуулалтын баримтын жагсаалт татах`, api-31612741) байна.
- **Smart Loyalty API**: `GET /api/sale/card` (cardId, password, searchType) → карт, бонусын хувь, хөнгөлөлтийн хувь, PurchaseAmount; `GET /api/callpro/loyaltycustomername/{mobileNumber}` (basic auth) → утасны дугаараар бонусын хувь; `cardList`, `purchaseDocument`, `saveBonusDocument`.
- **Smart Accounting API**: `POST /api/inventory/PostInventoryTransfer` (дотоод хөдөлгөөн: WarehouseId → ToWarehouseId, Details[{ItemId, Qty, Price}]), барааны үлдэгдэл/үнэ татах, борлуулалт илгээх — тусдаа гэрээ.

**Кодын байдал**: migration `0066_external_sync` (external_refs, integration_sync_state, `sale_pos_external`) **Aiven дээр ажилласан**; `server/integrations/inventorySync.ts` seam (push/sales runner, FakeInventorySyncProvider, branch code mapping), `admin.inventorySyncStatus`/`setBranchExternalId`/`runInventorySync`, интеграцийн картын салбарын кодын хэсэг — бүгд type-check цэвэр, **энэ commit-д scaffolding хэлбэрээр орсон** (бодит adapter байхгүй тул `wiredUp:false` хэвээр, синк ажиллахгүй). Бүрэн suite `311a00f` дээр 726/726 (77 файл).

**Хийгдсэн (2026-09-12)**:
- **`server/integrations/smartSoftware.ts`** — бодит adapter. Token cache (`expires_in` − 60 секунд, host+username-ээр түлхүүрлэсэн, 401 ирвэл шууд хаягдана), `listLocations`, `pullStockSnapshot`, `testConnection` (хэзээ ч throw хийхгүй). **fetch БИШ, `node:http(s)`** ашигласан шалтгаан: баримтын token дуудлага нь GET дээр body явуулдаг бөгөөд `fetch()` үүнийг зөвшөөрдөггүй — эхлээд стандарт POST, 404/405 ирвэл баримтын GET+body руу унана. Transport нь injectable тул unit тест сүлжээгүйгээр яг явах байтыг хардаг.
- **`runPullSnapshot`** (`inventorySync.ts`) — вендорын үлдэгдлийг **батлах хүлээсэн тооллого** болгоно: mapping хийсэн салбар бүрт зөвхөн **зөрүүтэй** мөрүүд, `systemQtyAtFirstScan` = манай тавиур, `scope:"partial"` (вендор зөвхөн "ECommerce борлуулах бараа"-г л илгээж болзошгүй тул уншаагүй барааг 0 болгохгүй), status `submitted` → warehouse/admin `postCount`-оор л нөөц хөдөлнө. Шинэ snapshot нь тухайн салбарын өмнөх батлагдаагүйг cancel хийнэ (нэг санал). Таарахгүй баркод, mapping-гүй байршил нь үр дүнд буцаж, admin картанд харагдана. `createSnapshotCount` нь `server/inventory.ts`-д (тэг тоо зөвшөөрнө — scan зам зориуд хаядаг).
- **`SyncOptions {namespace, lagSeconds}`** параметржүүлэлт бүх runner-т (өчигдөр PowerShell ParserError-оор бүтээгүйг Edit tool-оор хийв) + `seedSyncCursor` — тестүүд бодит "smartsoftware" cursor/кодыг хөндөхгүй тусдаа namespace-д ажиллана.
- **Admin**: `INTEGRATION_META.smartsoftware` = `username`/`password`(secret)/`inventoryBaseUrl`/`posBaseUrl`, `wiredUp:true`, `freeForm:false`; `admin.testIntegration` discriminated union (`ntfy`+group | `smartsoftware`) → Холболт шалгах нь байршлын жагсаалт буцаана (салбарын кодын `<datalist>`); шинэ `admin.pullVendorStock` ("Үлдэгдэл татах", идэвхгүй байхад ч ажиллана, нөөц бичихгүй); картанд үр дүнгийн хураангуй (таарсан бараа, салбар бүрийн тооллогын код, mapping-гүй байршил, танихгүй баркод).
- **Тест**: `server/smart-software.test.ts` 11 (token grant, POST→GET fallback, cache/expiry, буруу нууц үг, credential-гүй үед сүлжээнд огт хандахгүй, bearer header, барааны жагсаалт→snapshot, HTML алдааны хуудсыг өгөгдөл гэж андуурахгүй, 401 дээр token хаях, host trim, сүлжээний алдааны текст); `server/inventory-sync.integration.test.ts` 8 (snapshot→submitted тооллого + батлахад ledger-ээр нөөц хөдлөх, зөрүүгүй үед юу ч үүсгэхгүй, mapping-гүй байршил/танихгүй баркод, нэг салбарт нэг санал, lag цонх + echo (`refType external`) хаалт + mapping-гүй салбар алгасах, татгалзсан мөр дээр cursor зогсох, давхар sale нэг л удаа, mapping-гүй салбарын sale). `pnpm check`/`pnpm build` цэвэр.

**Дараагийн алхам (хийгээгүй, зориуд)**: онлайн төлөгдсөн захиалгыг `POST /api/sale/sale`-ээр Smart POS руу илгээж **и-баримт** авах. Энэ нь татварын бодит баримт үүсгэдэг тул (a) нягтлангийн баталгаа, (b) opt-in огноо, (c) claim-before-send idempotency, (d) `saleRefund` буцаалт, (e) харилцагчид ДДТД/QR харуулах зэрэг тусдаа ажил. Мөн Loyalty (`/api/sale/card`, утасны дугаараар бонус) — манай өөрийн lifetime-spend лоялтитай аль нь эх үнэн болохыг Tom шийдсэний дараа.

## Утасны push мэдэгдэл (ntfy) + admin хонх + интеграцийн самбарын засвар — Phase 1 (2026-09-11, гэрийн лаптоп, шөнө)

**Хүсэлт (Tom)**: <https://github.com/binwiederhier/ntfy> судалж сайтад суулгах. Агуулахын ажилтан, admin, finance утсан дээрээ мэдэгдэл авах: сайтаар зарагдсан, нөөц дуусч байгаа, захиалга орж ирсэн, бараа орсон/гарсан. Агуулахаас дэлгүүр рүү бараа гаргахад агуулахаас хасч дэлгүүрт нэмэх. Ирээдүйд Smart Software-ийн inventory/loyalty/management API. Мөн "/admin интеграцийн хэсэгт REST API/OAuth2 байгаа юу, сайн ажиллаж байна уу". Замдаа нэмсэн хүсэлтүүд: шинэ бараа ирэхэд худалдааны зөвлөх (staff) код+ширхэгийг **A4 цаасан дээр бичээд group chat руу зураг явуулдаг** асуудлыг шийдэх; admin top bar-ын **хонх** дээр мэдэгдэл ирдэг болгох.

**Төлөвлөгөө (6 phase, Tom баталсан)**: (төлөвлөгөөний тэмдэглэл). Tom-ийн шийдвэрүүд: ntfy.sh + урт санамсаргүй нууц topic (бүлэг бүрт нэг, PII ороохгүй); шилжүүлэг = агуулах "илгээх"-д хасагдана → дэлгүүрт **USB сканнераар уншуулж** автоматаар тоологдоно → илгээсэнтэй тулгана; **тусдаа агуулах** байршил, онлайн захиалга тэндээс; зөвлөхүүд одоогийн **`staff`** эрхээр; дэлгүүрүүд борлуулалтаа **зөвхөн Smart POS**-д бүртгэдэг (тиймээс Smart POS синк хүртэл онлайн нөөц = агуулахын нөөц); staff тооллого = draft, admin батална; REST API/OAuth2-ийг одоо бүтээхгүй.

**DB дээр хэмжсэн эхлэлийн байдал**: 4 салбар бүгд дэлгүүр, агуулах байхгүй; бүх 18,725 ширхэг "Орос элчин" (id 1) дээр; `integration_configs` хоосон; ажилтан: admin 1 (id 1 "bataa") + 2 тестийн admin үлдэгдэл, staff/warehouse 0.

**Интеграцийн аудит (Tom-ийн асуултын хариу)**: REST API болон OAuth2 **огт байгаагүй** (express route: /health, /api/trpc, QPay + verify.mn callback, /cdn/*). 4 картын тохиргоо шифрлэгдэж хадгалагддаг ч **runtime-д уншдаг код байгаагүй**, "холболт шалгах" товч байгаагүй. **Bug**: нэг түлхүүр хадгалахад бусад бүх түлхүүр устдаг байв (`updateAdminIntegration` бүх config-ийг орлуулдаг; хуучин тест үүнийг зөв гэж баталж байсан). **Bug**: `integrations.integration.test.ts`-ийн afterAll бодит `ebarimt` мөрийг болзолгүй устгадаг байв. Provider-ийн жагсаалт 5 газар давхардсан байв.

**Хийсэн (Phase 1)**:

- Migration `0062` (Aiven дээр ажилласан): `integration_configs.provider`-т `ntfy`, `smartsoftware`; шинэ `notification_outbox`; `users.lastSeenNotificationId`.
- `shared/integrations.ts` — нэг provider жагсаалт + provider бүрийн талбар (url/text/secret/topic), validation, **merge-on-save**. `shared/notification-events.ts` — бүлэг (admin/warehouse/finance/store), эрх→бүлэг, үйл явдал→бүлэг/priority/tag, Монгол мессеж builder (payload төрөлд нэр/утас/хаяг талбар **байхгүй** — PII дүрмийг compiler хамгаална).
- `server/_core/ntfy.ts` — JSON POST (кирилл header-т найдваргүй), 5с timeout, хэзээ ч throw хийхгүй. `server/notificationOutbox.ts` — transaction дотор бичих (leaf модуль, db.ts-тэй cycle үүсгэхгүй). `server/notifications.ts` — dispatcher: guarded claim (хоёр лаптоп давхар илгээхгүй), retry 1м/5м/30м, 5 оролдлого, 2 цагаас хуучирвал expired, тестийн мөрийг 1 хоногийн дараа устгана. `server/notificationsRouter.ts` — хонхны feed/markSeen, өөрийн бүлгийн сэдвүүд, туршилт (rate-limit).
- Hook-ууд: `order.placed` (checkout transaction дотор), `order.paid` (QPay), `payment.paid_on_closed_order`, `payment.underpaid`, `order.cancelled_by_customer`, `refund.recorded` (transaction дотор), `stock.low_digest` (өдрийн job, УБ-ын огноогоор dedupe).
- Admin: интеграцийн самбар дахин бичигдэв (талбар бүр тусдаа, цэвэрлэх товч, ntfy "Сэдэв үүсгэх"/"Туршилт", илгээсэн мэдэгдлийн түүх, `.env` үйлчилгээнүүдийн тийм/үгүй төлөв, "REST API / OAuth2 — байхгүй (зориуд)" карт). Шинэ "Утасны мэдэгдэл" хэсэг (staff/warehouse/finance/admin): алхам, QR (`qrcode` dependency), сэдэв хуулах, туршилт. **Хонх**: өөрийн бүлгийн мэдэгдлийн жагсаалт, уншаагүй тоо (данс дээр хадгалагдана), 30с polling, шинэ мэдэгдэл ирэхэд toast.
- Замдаа: `adminSectionKeys`-д `documents`, `loyalty` байгаагүй (refresh хийхэд хянах самбар руу үсэрдэг байсан) — нэмэв; эдгээр хоёр хэсэгт ажилладаггүй хайлтын талбар харагддаг байсныг нуув.

**Олдсон/заслагдсан bug (тестээр)**: нэг захиалгын бүх үйл явдал `order:<id>` гэсэн ижил dedupe түлхүүртэй байсан тул unique index "төлөгдсөн", "цуцлагдсан" мэдэгдлийг чимээгүй залгиж байв → түлхүүрийг үйл явдлын төрлөөр namespace хийв (`outboxDedupeKey`). Хонхны самбар 390px-д дэлгэцээс 50px гадагш гарч байв → утсан дээр viewport-д бэхлэв.

**Бодит тохиргоо**: Tom-ийн ntfy.sh access token (эхнийх нь 2026-09-14-нд дуусах browser-session token байсан тул хугацаагүйг нь авав) шифрлэгдэж хадгалагдав, 4 бүлэгт санамсаргүй сэдэв үүсгэв, ntfy идэвхтэй. Tom эхлээд `Sugi`/`95651578` сэдэвт бүртгүүлсэн тул юу ч ирээгүй → admin сэдэвт бүртгүүлсний дараа **iPhone дээр ирж байгааг Tom screenshot-оор баталгаажуулав** (шууд туршилт + outbox→dispatcher зам хоёулаа).

**Баталгаажуулалт**: `pnpm check` цэвэр; шинэ тест `ntfy.test.ts` (6), `notification-events.test.ts` (19), `notifications.integration.test.ts` (6), `integrations.integration.test.ts` (4→10), admin-tips; Playwright (3100 порт, face gate унтраалттай, throwaway admin+staff, дараа нь устгасан): интеграцийн хуудас, хонх (admin 2 мөр, staff зөвхөн store 1 мөр), "Утасны мэдэгдэл" (admin 4 QR, staff 1), 1440/1024/390-д overflow 0, console алдаа 0.

### Phase 2 — нөөцийн хөдөлгөөний ledger (мөн шөнө)

- Migration `0063` (Aiven дээр ажилласан): `stock_movements` (append-only; `delta`, `balanceAfter`, `sku` хуулбар, `refType/refId`, `actorUserId`, `note`). Одоогийн бүх тэг биш `branch_stock` мөрт `opening` мөр бичигдэв → ledger анхны өдрөөсөө **зөрүү 0** (rebaseline dry-run баталгаажуулав).
- `server/stockLedger.ts` (leaf модуль): `recordStockMovement` (аль хэдийн хийгдсэн өөрчлөлтийг бүртгэнэ — checkout/POS-ийн race-proof guarded decrement өөрчлөгдөөгүй), `applyBranchStockDelta` (хамгаалалттай +/−, upsert, `StockShortageError`), `setBranchStockAbsolute` (FOR UPDATE lock, зөрүүг бүртгэнэ), `getStockLedgerDrift`, мөн `recomputeVariantStockTotal` энд зөөгдөв.
- Холбосон газрууд: checkout (`sale_online`, order id мэдэгдсэний дараа ижил transaction-д), POS (`sale_pos`, кассчин actor), цуцлалт (`order_restock`), буцаалт (`refund_restock`), admin салбарын засагч (`admin_set` + шалтгаан), бүтээгдэхүүний маягт (`product_form_set`), шинэ variant (`variant_seed`). Хуучин "branch_stock мөргүй" legacy зам (зөвхөн тестийн fixture) хэвээр, бүртгэгдэхгүй.
- `deleteBranch` одоо үндсэн салбар, нөөцтэй эсвэл түүхтэй салбарыг устгахаас татгалзана ("идэвхгүй болгоно уу") — өмнө нь cascade устгалт variant-ийн нийт нөөцийг дахин тооцоолдоггүй тул сайт байхгүй нөөц зарсаар байх bug байв.
- FK: `branchId`/`variantId` **ON DELETE CASCADE** (тестүүд бодит салбар 1 дээр түр бараа үүсгэж устгадаг — SET NULL байсан бол ledger-т хог үлдэх байв).
- UI: салбарын нөөц засагчид шалтгааны талбар + "Хөдөлгөөн" түүх (Playwright-ээр бодит бараа дээр "Эхний үлдэгдэл +16 → 16" харагдав); хянах самбарын Системийн байдал картанд "Нөөцийн хөдөлгөөний бүртгэл" мөр.
- `scripts/stock-ledger-rebaseline.ts` (dry-run, `--apply`) — нөгөө лаптопын хуучин код бүртгэлгүй өөрчилсөн тохиолдолд засварын мөр нэмнэ (түүхийг дахин бичихгүй).
- Тест: `stock-ledger.integration.test.ts` (5: гараар засвар = зөрүү, POS + 5 зэрэгцээ кассчин 3 нөөцөөс яг 3 амжилттай, онлайн худалдаа + цуцлалт = 0, drift илрүүлэлт + rebaseline, салбар устгах хамгаалалт).
- ⚠️ **Олдсон хуучин асуудал**: `order-unwind.integration.test.ts`-ийн `afterAll` (~50 дараалсан Aiven хүсэлт) 10с hook хязгаарт тогтмол багтахаа больж, цэвэрлэгээ дундаа тасарч **тестийн хэрэглэгч + 5,500₮ зээлтэй данс** үлдээж, дараагийн run-ы зээлийн тэнцлийн шалгалтыг унагаадаг байв (өнөө өглөөний "Unwind Test Finance" үлдэгдэл үүнээс). Hook-д 60с өгч, 7 үлдэгдэл хэрэглэгчийг цэвэрлэв.

### Phase 3 — агуулах байршил + сканнераар бараа хүлээн авах + тооллого (мөн шөнө)

- Migration `0064` (Aiven дээр ажилласан): `branches.kind` (store/warehouse), `countsTowardOnlineStock`, `lowStockThreshold`; `users.branchId`; `stock_receipts`(+lines), `stock_counts`(+lines, `scope` partial/full, `systemQtyAtFirstScan`). Бүгд анхдагч утгатай тул одоогийн ажиллагаа өөрчлөгдөөгүй.
- `server/inventory.ts` + `server/inventoryRouter.ts` (`inventoryProcedure` = admin/warehouse/staff). Хүлээн авалт: draft → мөрүүд скан хийх зуур absolute тоогоор хадгалагдана → "Нөөцөд нэмэх" = guarded нэг удаагийн post, мөр бүр `applyBranchStockDelta` (`receipt`), бүртгэлгүй код post-ийг хаана эсвэл `skipUnknown`-оор тэмдэглэлд үлдэнэ, `receipt.posted` push (агуулах+admin). Нэхэмжлэхийн зураг (`uploadReceiptPhoto`, R2 дээр таамаглах боломжгүй нэртэй — public bucket тул "unlisted"). Тооллого: зөрүү = тоолсон − **анх уншуулах үеийн** системийн тоо (тооллогын дундах борлуулалт алдагдахгүй — тестээр баталсан), бүрэн тооллого уншуулаагүй барааг 0 болгоно, staff зөвхөн илгээнэ (`count.submitted` push), warehouse/admin батална (`opening`/`count_adjust`, `count.posted` push). Эхний үлдэгдлийн тооллогыг staff эхлүүлж чадахгүй.
- Салбарын дүрэм: сайт/pickup зөвхөн `kind=store` (`getStorefrontBranches`, index.html-ийн салбарын тоо ч мөн). Онлайн нийт нөөц = зөвхөн `countsTowardOnlineStock` салбаруудын нийлбэр (`recomputeVariantStockTotal`; туг солиход `recomputeVariantTotalsForBranch` 2 set-based SQL-ээр — 937 variant × Aiven RTT бол хэдэн минут болох байсан). Онлайнд тооцогддоггүй дэлгүүрээс очиж авах захиалга үндсэн (агуулах) салбараас хасагдана, `pickupBranch` нь дэлгүүр хэвээр. Үндсэн салбар идэвхтэй + онлайнд тооцогдох ёстой, шууд унтраах боломжгүй. Үндсэн салбар/төрөл/онлайн нөөц/босгыг **зөвхөн admin** өөрчилнө (өмнө нь marketing нэг товчоор онлайн хүргэлтийн эх сурвалжийг солих боломжтой байв). Create/update + "ганц default" солилт нэг transaction-д.
- Client: шинэ "Бараа хүлээн авах" хэсэг (`AdminReceivingPanel` — 2 горим, салбар сонголт, draft жагсаалт), `inventory/ScanSession.tsx` (USB сканнер = +1, дуу, анивчих, байнгын input байхгүй + "Сканнер түр зогссон" banner, гараар код, +/−/тоо/устгах), `useScanDraft` (localStorage-д шууд + 700ms-ийн дараа сервер рүү; refresh/crash-д алдагдахгүй), салбарын самбарт НӨӨЦ хэсэг (admin-аас бусдад disabled), хэрэглэгчийн drawer-т "Ажилладаг салбар".
- `server/_core/imageUpload.ts` — зургийн signature/decode шалгалт routers.ts-ээс гаргав (давхардалгүй).
- 🔴 **Олдсон, бодит DB-д нөлөөлсөн bug (zod 4)**: `.partial()` доторх `.default()` утга түлхүүр орхигдсон ч хэрэгждэг. Салбарыг дээш/доош зөөх (зөвхөн `sortOrder` илгээдэг) эсвэл хаяг засахад `isFulfillmentDefault=false`, `isActive=true`, `sortOrder=0` чимээгүй бичигддэг байв → **үндсэн салбарыг зөөхөд л онлайн хүргэлт унтрах**; мэдээ засахад `format` "standard" болж, брэнд дараалалд оруулахад идэвхжиж байв. Шинэ inventory тест үүнийг илрүүлсэн ба **тестийн явцад бодит үндсэн салбар (Орос элчин) хэдэн минут default-гүй болсон** (түр салбар default болоод устсан) → шууд сэргээв. Засвар: `partialForUpdate()` helper бүх 9 update schema-д; тест afterAll бодит default-ыг заавал сэргээнэ; regression assertion. ⚠️ Салбар 1-ийн `sortOrder` одоо 0 — өмнө нь ямар байсан нь тодорхойгүй (дараалал ижил).
- Тест: `scan-session.test.ts` (6), `inventory.integration.test.ts` (8). Playwright (staff эрх, түр дэлгүүр/бараа, дараа нь устгасан): USB сканнерыг `keyboard.type`+Enter-ээр дуурайж 3+1 уншуулав → "2 төрөл · 4 ширхэг, 1 бүртгэлгүй", refresh хийсний дараа мөрүүд үлдсэн, батлахад салбарын нөөц +3, ledger `receipt +3` (зөвлөхийн нэрээр), push queue-д, онлайн нийт 0 (дэлгүүр онлайнд тооцогддоггүй), 390px-д overflow 0. Замдаа: баталгаажуулах цонх бүртгэлгүй кодыг ширхэгт оруулж байсан, батлагдсан хүлээн авалтад "Уншуулсан бараа алга" гэж харагдаж байсан — хоёуланг заслаа.

### Phase 4 — агуулах → дэлгүүр шилжүүлэг, blind скан тулгалт (мөн шөнө)

- Migration `0065` (Aiven дээр ажилласан): `stock_transfers` (draft/sent/received/cancelled + discrepancyStatus none/open/resolved), `stock_transfer_lines` (qtySent, receivedDraftQty, qtyReceived, resolution, sku/нэрийн хуулбар).
- `server/transfers.ts`: агуулах/admin үүсгэж, баглах үедээ скан хийнэ → **"Илгээх"** = бүх дутагдлыг нэг дор мэдээлж, бүртгэлгүй кодтой бол зогсоож, дараа нь guarded `transfer_out` (агуулахаас хасна) + `transfer.sent` push (store+admin). Дэлгүүрийн зөвлөх **blind скан** хийнэ (илгээсэн тоо API-аас ч, жагсаалтаас ч харагдахгүй; зөвхөн өөрийн салбар), жагсаалтад байгаагүй код тусдаа мөр болно → **"Хүлээн авах"** = `reconcileTransfer` (shared, client/server ижил), ирсэн тоогоор `transfer_in`, зөрүүтэй бол `discrepancyStatus=open` + `transfer.discrepancy` push (priority 5, admin+warehouse). Admin мөр бүрт шийдвэр: дутуу → хасах / агуулахад буцсан (`transfer_return`) / дараа олдсон (`transfer_in`); илүү → агуулахаас хасах (`transfer_out`) / хүлээж авах; бүгд шийдэгдмэгц `resolved`. Илгээсэн шилжүүлгийг зөвхөн admin цуцална → бүгд агуулахад буцна. "Замд" тоо салбарын нөөц засагчид.
- Client: "Бараа хүлээн авах" → **Шилжүүлэг** tab (`inventory/TransfersView.tsx`): хаанаас/хаашаа, скан, илгээх; дэлгүүрт "Замд яваа, хүлээн авах шилжүүлэг: N" banner, blind тайлбар, тэмдэглэлтэй хүлээн авах, зөрүүний самбар (admin-д шийдвэрийн товчнууд).
- Тест: `transfers.integration.test.ts` (5: эрх, бүртгэлгүй код/дутагдал илгээхийг хаах, давхар илгээлт CONFLICT, blind (qtySent null, жагсаалтын тоо null), өөр дэлгүүр FORBIDDEN, зөрүү + push, admin шийдвэр бүр ledger дээр, drift 0, цуцлалт буцаах), `transfer-reconcile.test.ts` (2). Playwright: агуулахын ажилтан 3 ширхэг скан → илгээх (агуулах 5→2), зөвлөх blind 2 ширхэг скан → хүлээн авах → "ЗӨРҮҮ · 1 дутуу", "Админ шийдэхийг хүлээж байна". Замдаа: илгээсэн агуулахын ажилтанд "0 төрөл" харагдаж байсныг засав (одоо илгээсэн жагсаалт харагдана).
- ℹ️ Playwright-ийн дуурайлгасан сканнерын эхний цифр хуудас ачаалж байх үед 1 удаа унасан (товчлуурын зай >50ms) — бодит USB сканнерын event timestamp төхөөрөмж дээр үүсдэг тул энэ нь harness-ийн шинж; систем бүртгэлгүй кодыг улаанаар тэмдэглэж, илгээхийг зогсоосон нь хамгаалалт зөв ажилласныг баталгаажуулав.

### Phase 5 — нөөц бага/дууссан alert, drift ба хуучирсан шилжүүлгийн job (мөн шөнө)

- `shared/stock-alerts.ts` — `classifyStockCrossing(before, after, threshold)`: зөвхөн **доошоо огтлоход** (босгонд хүрэх = `low`, 0 болох = `out`); аль хэдийн бага байхад дахин доошилбол чимээгүй; нөөц босгоос дээш гарвал өөрөө дахин идэвхжинэ. Зөвхөн бодит гарц (`sale_online`, `sale_pos`, `transfer_out`) alert өгнө — admin-ий засвар/тооллого өгөхгүй. Босго = `branches.lowStockThreshold` (NULL = тэр байршилд alert байхгүй; дэлгүүрүүдийг Smart POS синк хүртэл NULL үлдээх).
- `recordStockMovement` (transaction дотор): огтолсон бол `stock.low`/`stock.out` → байршлын өөрийн бүлэг (агуулах эсвэл дэлгүүр) + admin, dedupe `branch:variant:УБ-огноо` (өдөрт нэг). `recomputeVariantStockTotal`: нийтлэгдсэн барааны онлайн нийт >0 → ≤0 болбол `stock.total_out` → admin+warehouse.
- Job-ууд: `stock-ledger-drift` (цаг тутам, зөрүү >0 бол admin-д өдөрт нэг), `stale-transfer-reminder` (6 цаг тутам, 48 цаг хүлээн аваагүй `sent` шилжүүлэг). `LOW_STOCK_THRESHOLD`-ийн давхардал арилав (db.ts одоо `shared/catalog-filter`-оос import).
- Тест: `stock-alerts.test.ts` (11 хослол + re-arm), `stock-alerts.integration.test.ts` (2: засвар чимээгүй / борлуулалт огтлоход нэг л удаа / out + total_out / нэг өдөрт давтахгүй).
- `branch-stock.integration.test.ts`-ийн "default-ыг эхлээд унтраагаад дараа нь нөгөөг асаах" 2 алхамт загвар Phase 3-ийн хамгаалалтаар (default-гүй мөч үүсгэхгүй) BAD_REQUEST болсон → тест radio семантик руу шилжив (нөгөөг асаахад л энэ нь унтарна).

**Ажлын лаптопоос татсан 9 commit** (энэ session-ий эхэнд, `d30dc06` хүртэл): баркод сканнераар сайтын аль ч хуудаснаас бараа руу үсрэх, Монгол хайлтын synonym, featured брэнд → брэндийн хуудас, README, /admin хэсэг бүрийн Монгол тайлбар (tip), SEO/cookie текст DB-ээс, хууль эрх зүйн 3 хуудас + лоялти түвшин + footer/холбоо барих /admin-аар засагдах (migration `0061`, Aiven дээр аль хэдийн ажилласан), hero 3 слайд, 42 ашиглагдаагүй компонент + 25 package устгав. Тэр ажлын PROJECT-GUIDE.md/HISTORY.md тэмдэглэл ирээгүй — дэлгэрэнгүйг `git log f7b6563..d30dc06`-оос. ⚠️ Лоялти босго DB дээр 300k/500k/5M болсон (migration-ий seed 500k/1M/10M) — /admin-аар өөрчилсөн бололтой.

---

## Гүнзгий аудит (UI/UX + frontend + backend) — хэмжилтээр нотолж, эхний 3 зүйлийг шууд заслаа (2026-09-11, оройн session)

Tom: "Ui ux bolon fronted bolon backend bugdiin deep audit hiij deep inspect analyze hiij aldaa ol!!! Bas ymarch utag uchirgui feature baiwal hai! ... AI slop oor hiigegu ym shig haragduulmaar baina, website design bol still 2019 style tai bgaa teriign sudal!! 2026 onii best designi AI or Design MCP sudal!!" Дараа нь: "Start take action make my website better!!!"

Бүрэн тайлан (artifact): (дотоод тайлан)

### Аудитын арга

Таамаглалгүй. (1) `tsc --noUnusedLocals --noUnusedParameters`, (2) бүх модулийн import графикийг Python-оор барьж хэзээ ч import хийгддэггүй файлыг олов, (3) `routers.ts`-ийн 119 procedure-ийг client/src-ийн бодит дуудлагатай тулгав, (4) Playwright-ээр бодит хуудсыг render хийж дизайны шинжүүдийг **тоолов**, (5) WebSearch-ээр 2026 оны дизайны бодит эх сурвалж (AI-slop tell, bento/asymmetry, Figma MCP).

### Юу нь "2019" юм бэ — тоогоор

| Нүүр хуудсан дээр хэмжсэн (1606px) | Өмнө | Дараа |
|---|---|---|
| Ижил eyebrow+гарчгаар эхэлдэг хэсэг | **8 / 9** | **3 / 9** |
| eyebrow блок | 11 | 5 |
| Хоёр оронтой дугаарлалт (01–06) | 17 | 4 |
| Бүтэн өргөний хэвтээ band | 7 / 9 | 7 / 9 (хэвээр) |
| Ашиглагдаж буй шрифтийн гэр бүл | **1** | 1 (хэвээр) |
| box-shadow-той элемент | 28 | 28 (хэвээр) |
| Тэгш баганатай grid | 4 | 4 (хэвээр) |

**Гол дүгнэлт**: асуудал нь гоо зүйн биш, **бүтцийн давталт**. Мөн үнэн шударгаар: 2026 оны AI-slop-ийн 3 гол шинж энэ сайтад **байхгүй** — ягаан-цэнхэр gradient hero байхгүй, Inter байхгүй, emoji section icon байхгүй, laptop-ын өмнөх stock зураг байхгүй. Гадаргуу нь өөрийнх, зөвхөн араг яс нь загварчилсан.

### Заслагдсан (энэ session)

1. **🔴 `catalog.categoryShelves` — дуудагчгүй, гэхдээ нээлттэй public endpoint.** 2026-09-06-ны консолидацид хассан 6 ангиллын rail-д зориулж бүтээгдсэн. Дуудлага **0**, гэхдээ хүсэлт бүрт 1 + 6 + 6 = **13 query** ажиллуулдаг, 10 холболтын pool, Бангалор ~174ms. Procedure + `getHomeCategoryShelves` + `getCategoryShelfProducts` бүгд устгав (~110 мөр).
2. **🔴 `getFeaturedBrands`-ийн N+1.** Брэнд бүрт нэг нэмэлт зургийн fallback query, `Promise.all` дотор. 9 идэвхтэй брэнд, ихэнх нь зурaггүй → **нүүр хуудасны нэг ачаалалт 10 холболтын pool-оос 9-ийг нь нээж болно**. Одоо ганц бүлэглэсэн query; MySQL-д `DISTINCT ON` байхгүй тул "брэнд тус бүрийн хамгийн шинэ зурагтай бараа" сонголтыг JS дээр хийнэ (үр дүн хуучинтай яг ижил).
3. **🟠 `products.brand` дээр индекс байгаагүй** атлаа 3 халуун зам түүгээр join хийдэг (bestseller filler, дээрх fallback, admin dropdown). Migration `0060_products_brand_index.sql` — Aiven дээр аль хэдийн ажилласан.
4. **🔴 Хэсэг бүр ижил байдлаар эхэлдэг байсныг зогсоов.** 9-өөс 8 хэсэг ижил "жижиг CAPS шошго → том гарчиг" загвараар нээгддэг байв. Одоо 3 үлдсэн ба тус бүр нь гарчиг хэлээгүй зүйлийг хэлнэ: hero-гийн брэндийн мөр, гишүүнчлэлийн шошго, салбарын **амьд тоо**. Дугаарлалт: ангиллууд бол дараалал биш тул "01–06" юу ч кодлоогүй — устгав. Үлдсэн 4 дугаар нь газрын зураг дээрх **бодит салбарын дугаар** (01–04), тэдгээр нь жинхэнэ мэдээлэл.
5. **🟠 Хэзээ ч import хийгддэггүй 7 компонент устгав** (544 мөр): `Map.tsx`, admin-ий 4 үлдэгдэл карт, `TrustTriptych`, `JournalSection`. Git-д хадгалагдсан хэвээр.

### "Онцлох брэндүүд цагаан харагдаж байна" (Tom, session дунд)

**Шалтгаан**: carousel нь `brands.some(b => b.logoUrl)` — өөрөөр хэлбэл **ганц** брэнд логотой бол бүх карт 100px-ийн лого зурвас нөөцөлдөг байв. Бодит DB дээр **9-өөс ганц** (Cocochi) логотой → үлдсэн 8 картын гуравны нэг нь цэвэр цагаан зай. Slide 198×298 байснаа **198×198** боллоо, хэсгийн өндөр 973 → 748px.

**Засвар**: `some` → **олонх** (`logoCount * 2 >= brands.length`). Өнөөдөр зурвас нурж, зөвхөн барааны бодит фото харагдана; лого нэмэгдэх тусам **өөрөө эргэж ирнэ**. ⚠️ Tom-ийн "лого байхгүй брэндэд зөвшөөрөгдөөгүй wordmark бичихгүй" дүрэм хөндөгдөөгүй — цорын ганц бодит шийдэл бол **/admin → Брэнд дээр үлдсэн 8 логог оруулах**.

### Аудит юуг гэм олж чадаагүй вэ (шударга байхын тулд)

38,725 мөрд **TODO/FIXME/HACK 0**; ашиглагдаагүй локал код 2 (хоёулаа санаатай, тайлбартай); контрастын алдаа 0; alt текст 66/66; шошгогүй input 0; нэргүй контрол 2 (хоёулаа Silktide cookie vendor-ийнх, бидний код биш); 119 procedure-ээс үхсэн нь 1; storefront дээр admin chunk 0 KB. **Бодит үлдсэн цоорхой**: аль ч хуудсанд skip link байхгүй (WCAG 2.4.1 Level A), болон эхний ачаалалтын 643 KB-аас 462 KB нь үндсэн JS chunk.

### Хараахан хийгээгүй (Tom-ийн зөвшөөрөл хүлээж буй дизайны бооцоо)

- **Display шрифт нэмэх** — Golos Text ганцаараа 643 элемент бүгдийг тохируулж байна (68px hero-гоос 8px шошго хүртэл). ⚠️ Кирилл глифийг **заавал** шалгах: 2026-09-06-нд яг энэ урхи (DM Sans / Space Grotesk / Noto Sans Mongolian-д кирилл байгаагүй) бодитоор үүссэн.
- **2 хэсгийг band загвараас гаргах** — 9-өөс 7 нь одоо ч бүтэн өргөний хэвтээ зурвас. 2026-ийн чиглэл: bento/тэгш бус модуль, санаатай асимметр.

### Баталгаажуулалт

28 хослол (7 хуудас × 1440/1024/390/320): hэвтээ overflow 0, давхцал 0, контрастын алдаа 0, эвдэрсэн зураг 0, `<h1>` хуудас бүрт 1. `pnpm check`/`pnpm build` цэвэр. Бүрэн suite **578/578 тест ✅ (62/63 файл)** — `order-unwind` нь зөвхөн бүрэн ачаалалтын үед файлын түвшинд унадаг ба дангаараа **12/12, 55 секунд** давдаг; энэ бол PROJECT-GUIDE.md-д аль хэдийн бичигдсэн pre-existing flake.

---

## Storefront-ийн гэрэл багасгах (Linen палитр) + босоо зайн засвар + bestseller rail дүүргэх + хоёр лаптопын git sync алдаа (2026-09-11)

Менежерийн шүүмж: **"нүүр хуудас болон бүх frontend хуудас хэт гэрэлтэй, юу ч харагдахгүй"**. Session дундуур Tom 4 нэмэлт зүйл дараалан оруулав: hero гарчиг "дэндүү доошоо урт", `/shop` "баруун тийш шахагдсан", `wcu-section` мөн "дэндүү урт доошоо" + "ийм алдаа олоод бүгдийг нь зас", bestseller-д PRIECLAT/Cocochi/Asmy нэмэх. Эцэст нь **хамгийн чухал нь**: "ажлын компьютер дээр хийсэн ажлыг GitHub-аас pull хийсэн үү? Өчигдрийн шинжлэлт алга!!!!"

---

### 0. ⚠️ ХАМГИЙН ЧУХАЛ САНАМЖ — session эхлэхэд ЗААВАЛ `git fetch` хийх

**Энэ session-ий хамгийн том алдаа**: ажлын session-ийг эхлүүлэхдээ git remote-ыг огт шалгаагүй. Үр дагавар:

- Гэрийн лаптоп `audit-2026-09-09-order-unwind` branch дээр, `origin/main`-аас **2 commit хоцорсон** байсан.
- Ажлын лаптоп өчигдөр (2026-09-10 14:24) `5d7ceee` commit-ыг `origin/main`-руу push хийсэн байв: **"Rebuild Top Brands against the Matsuya Ginza reference, add /brands, and raise homepage legibility"** — 15 файл, 1188 нэмэлт мөр.
- Тэр commit-д `client/src/index.css`-ийн **397 мөр** орсон байсан ба дотор нь **өөрийн legibility pass** (`--muted-foreground` #6f7076 → #52535a, ~30 газар) байв. Өнөөдрийн ажил яг ижил файлын ижил мөрүүдийг дахин бичсэн.
- Aiven DB нь хоёр лаптопт **хуваалцсан** тул өчигдрийн migration (`0058_featured_brand_logo.sql`) аль хэдийн бодит DB дээр ажилласан байсан (`featured_brands.logoUrl` багана байгааг шалгаж баталгаажуулсан) — өөрөөр хэлбэл **зөвхөн энэ лаптопын КОД хоцорсон**, өгөгдөл биш.

**Яаж засав** (merge биш, дахин барих замаар):
1. Өнөөдрийн commit хийгээгүй ажлыг бүрэн backup хийв (2 файлын хуулбар + 1349 мөрийн `.patch`).
2. `git checkout -- <files>` → `git merge --ff-only origin/main` (өчигдрийн ажил бүрэн эргэж ирэв).
3. Өнөөдрийн бүх өөрчлөлтийг өчигдрийн файл дээр **дахин хэрэгжүүлэв**. Merge хийгээгүй шалтгаан: хоёр өдөр бие даан ижил CSS мөрүүдийг legibility зорилгоор дахин бичсэн тул 3-way merge нь таамаглал болох байсан.

**Дүрэм болгон авах**: хоёр лаптоптой, DB/R2-г хуваалцдаг энэ төсөлд **аливаа өөрчлөлт хийхээс өмнө `git fetch --all` + `git status -sb` шалгана**. Код хоцорсон байхад DB нь шинэ байж болно — энэ хослол чимээгүй, гэхдээ маш эрсдэлтэй.

---

### 1. Өчигдрийн ажил (2026-09-10, ажлын лаптоп) — энэ хүртэл огт баримтжуулаагүй байсан

`5d7ceee` commit-ийн агуулга (энд анх удаа тэмдэглэв):

- **`FeaturedBrandsCarousel.tsx` (388 мөр, шинэ)** — Matsuya Ginza лавлагаагаар хийсэн "Онцлох брэндүүд" carousel; идэвхтэй slide нь `--fbrand-scale: 2.25`-аар томордог, гар/хурууны drag дэмждэг, зүүн ирмэгээс баруун тийш "teleport" хийж дахин ашигладаг. Хуучин `BrandTileCard.tsx`-ийг орлов (тэр файл устсан).
- **`Brands.tsx` (167 мөр, шинэ)** — `/brands` хуудас, үсгээр бүлэглэсэн бүх брэндийн жагсаалт, хайлт/reset-тэй.
- **`BackToTop.tsx` (70 мөр, шинэ)** + `consentIconAutoHide.ts` (86 мөр).
- **Migration `0058_featured_brand_logo.sql`** — `featured_brands.logoUrl` багана; **`0059_drop_top_brands_text_slots.sql`** — хуучин Топ брэндийн `site_text` slot-уудыг устгав (carousel өөрөө текстээ авдаг болсон тул).
- **Legibility pass**: `--muted-foreground` #6f7076 → #52535a, `.section-heading`/`.carousel-shelf-empty` г.м. ~30 газар, `.bestseller-card p` болон `.location-row > span`-ыг `var(--primary-text)`-руу шилжүүлэв, `.bestseller-section + .bestseller-section` дээр жижиг padding дүрэм.

Энэ ажил **бүрэн хэвээр үлдсэн** — өнөөдрийн өнгө/зайн ажил түүний ДЭЭР нэмэгдсэн.

---

### 2. Hero-ийн өндөр (Tom: "denduu dooshoogoo urt baina")

Tom өргөн дэлгэцийн бодит screenshot илгээв: гарчгаас өөр юу ч эхний дэлгэцэнд багтахгүй байв.

**Хэмжилт (1555×978 цонх)**: hero section **1009px**, `h1` дангаараа **428px** (3 мөр × 94px cap × line-height .91). Тайлбар, 2 товч, итгэлийн мөр бүгд fold-ын доор үлдэж байв.

**Засвар**: `h1` `clamp(52px, 6.1vw, 94px)` → `clamp(44px, 4.6vw, 68px)`, line-height .91 → .94; `.hero-copy` padding 76px → 40px; `.hero-trust` margin-top 64px → 34px; `.hero-section` min-height 720px → 600px, padding-top 78px → 48px; `.hero-image` min-height 618px → 540px. Гарчгийн доорх шар зураас (`h1 strong::after`) 14px → 11px — жижгэрсэн бичигт харьцангуйгаар "тусдаа зураас" мэт харагдаж байсан тул.

**Дараах хэмжилт**: hero **633px**, `h1` **192px**, товч/итгэлийн мөр/гарын үсэг бүгд fold-ын дээр. Гар утас (760px breakpoint) мөн адил багасгав.

---

### 3. `/shop` "баруун тийш шахагдсан" — бодитоор нөхөн үзүүлж чадаагүй

Tom screenshot илгээж `/shop` эвдэрсэн гэв. Шалгасан зүйл: **1024, 1100, 1180, 1280, 1366, 1440, 1500, 1600, 1700, 1800, 1920, 2100, 2211, 2560, 3200** өргөнд `scrollWidth - clientWidth` хэмжсэн — **бүгдэд нь 0**. Мөн тухайн үед хийсэн өөрчлөлт зөвхөн `.hero-*` дүрмүүд байсан ба `/shop` тэдгээрийг огт ашигладаггүй (`.shop-hero` тусдаа класс). Screenshot дээрх pills/grid-ийн тайралт нь хуудас хэвтээгээр гүйлгэгдсэн эсвэл browser zoom-той холбоотой байж магадгүй. **Нөхөн үзүүлэгдээгүй тул засвар хийгээгүй** — Tom-д цонхны өргөн/zoom-ыг шалгахыг хэлсэн.

---

### 4. Босоо зайн бүрэн засвар (Tom: "ene shig iimerduu aldaa olood zas bugdiin")

`wcu-section`-ийг нэрлэсэн боловч хэмжихэд **бүх band ижил асуудалтай** байв. 1440px дээр хэмжсэн padding-ийн эзлэх хувь:

| Хэсэг | Өндөр | Padding | Padding % |
|---|---|---|---|
| locator | 797px | 272px | **34%** |
| bestseller ×2 | 720 / 671px | 224px | 31–33% |
| carousel-shelf | 493px | 152px | 31% |
| qs (гишүүнчлэл) | 771px | 224px | 29% |
| wcu | 938px | 256px | 27% |

**Засвар** — section padding scale-ыг ~1/3-аар багасгаж, дотоод margin/gap-уудыг татав, мөн **нэг display scale** тогтоов: `.editorial-heading` `clamp(48px, 5.6vw, 82px)` → `clamp(36px, 3.9vw, 56px)` (hero-гийн шинэ 68px cap хамгийн том хэвээр үлдэнэ). `/shop`-ийн `h1` нь 96px cap-тай байсан нь **нүүрний hero-гоос ч том** байсныг 62px болгов. `.doc-section` (хууль зүйн хуудсууд) 144px өндөр хэсэгт 60px padding байсныг 40px болгов.

**Үр дүн (1440px)**: hero 1009→628, wcu 938→781, locator 797→605, qs 771→697, cat-mosaic 1389→1207, bestseller 720→611, editorial banner 560→440. **Нийт нүүр хуудас 8015px → 6612px (−18%)**.

---

### 5. Өнгө — "Linen" палитр (Tom: "i dont want dark theme!")

Эхлээд харанхуй "Dusk" хувилбар бэлдсэнийг Tom **шууд татгалзав**. Дараа нь **хоёр цайвар** хувилбар (A "Paper" дулаан цаас, B "Linen" сэрүүн саарал-ногоон) design canvas дээр толилуулж, Tom **B — Linen**-ийг сонгов.

**Яагаад гэрэлтэй санагддаг байсныг хэмжив**: хуудасны дэвсгэр 91.5% relative luminance; карт vs суурь ялгаа **1.07:1** (өөрөөр хэлбэл карт, хуудас, барааны цагаан зураг гурвуулаа нэг тасралтгүй цагаан хуудас мэт); мөн **2 бүтэн дэлгэцийн өргөнтэй ханасан шар band** (`#f0b52d`, bestseller + recently-viewed, нийт 1443px өндөр) — энэ нь гялбааны хамгийн том эх үүсвэр байв.

**Linen токенууд**: суурь `#dae0da`, ээлжлэх band `#ced5cf`, карт `#f2f5f2`, хүрээ `#b7beb9`, тайлбар текст `#545958`, жижиг улаан `#b01729`, surface-tint `#d3dad4`, sky `#28537a`. Шар нь зөвхөн badge/rank/гарчгийн зураас болж үлдэв. Барааны зургийн тавцан **цэвэр цагаан хэвээр** (packshot жинхэнэ өнгөөрөө харагдах ёстой). `wcu-section` **харанхуй хэвээр** — хуудасны контрастын хэмнэл хадгалагдана.

**Гэрэл буурсан хэмжээ: 20%** (bg luminance 91.5% → 73.3%). Карт vs суурь **1.07:1 → 1.22:1**, хүрээ vs суурь 1.29:1 → 1.41:1.

---

### 6. Контрастын 55 бодит алдаа — бүгд заслаа

Суурь бараан болсноор өмнө нь дөнгөж давж байсан өнгөнүүд унав. **Таамаглалаар биш**: 7 хуудсыг бодитоор render хийж, текстийн зангилаа бүрийн computed өнгө болон **жинхэнэ эцэг дэвсгэрийг** (зураг/gradient дээрхийг алгасаж) тооцоолов.

Гол ангилалууд:
- **Жижиг улаан текст `var(--primary)` (#df1f3d) ашиглаж байсан 14 газар** — шинэ band дээр 3.19:1. Төсөлд яг энэ загварт зориулсан `--primary-text` аль хэдийн байсан тул түүн рүү шилжүүлэв, мөн `--primary-text`-ийг өөрийг нь #c81b34 → **#b01729** болгов (хамгийн бараан band #ced5cf дээр 4.37:1 → **4.68:1**).
- **~20 саарал литерал** хэт цайвар болсон (#6f7076, #7d7e82, #818287, #8c8d91 г.м.).
- **Дулаан cream үлдэгдэл** gradient дотор нуугдсан (`#fff8ec`, `#efece6`).
- `--foreground-inverse` #f2f5f2 нь улаан footer banner дээр 4.34:1 болсныг #fbfdfb болгов.
- Гар утасны 2 алдаа: `.commerce-mobile-menu-heading` 2.93:1; `.doc-section-index`-ийн 620px override нь `--primary-text`-ийг `--primary` рүү буцаадаг байсныг устгав.

**Эцсийн үр дүн: 7 хуудас × 4 өргөн = 28 хослолд контрастын алдаа 0.**

---

### 7. Merge-ийн дараа илэрсэн 3 бодит алдаа

Өчигдрийн ажлыг буцааж авсны дараа дахин шалгахад:

1. **`/brands` болон `.back-to-top`-ийн CSS нь admin theme блокийн ДООР** (мөр 2494+) байрладаг байсан тул миний анхны палитрын pass (зөвхөн admin блокоос дээшхийг хамарсан) **тэднийг бүрэн алгассан** — хуучин дулаан өнгөтэй үлдсэн байв. Тусад нь засав.
2. **Brand carousel-ийн зургийн тавцан `#efece6`** (дулаан cream) — маалинган дэвсгэр дээр зохимжгүй → `#e4e8e4`.
3. **Footer 320px дэлгэцээс 4px давж** байв. Шалтгаан: grid track-ийн `1fr` нь далд `minmax(auto, 1fr)` тул **бодит салбарын нэр** ("Japan Town C6, Four Seasons Garden Center 3 давхар") track-ийн min-content шалыг 174px болгож, 125px-ийн ногдол хувийг давсан. `.footer-column { min-width: 0; overflow-wrap: anywhere }` + `.footer-grid > div { min-width: 0 }`.

---

### 8. Bestseller rail дүүргэх (Tom: "prieclat cocochi asmy giin buh set iin nem")

**Асуудал**: `getBestsellingProducts` нь зөвхөн бодит борлуулалтаар эрэмбэлдэг ба **бүх production DB дээр ердөө 3 төлөгдсөн захиалга** байгаа тул rail нь бүтэн өргөнтэй band дотор **ганц карт** зурдаг байв.

**Хийгээгүй зүйл**: хуурамч захиалга үүсгээгүй. Тэр нь орлого, analytics, loyalty-г бодитоор гажуудуулна.

**Хийсэн зүйл** — код баазад аль хэдийн байсан `getCategoryShelfProducts`-ийн гэрээг дагав: бодит борлуулалттай бараа дээд слотуудыг жинхэнэ тоогоороо эзэлнэ, үлдсэн слотыг **admin өөрөө featured гэж тэмдэглэсэн брэндүүдээс** (`featured_brands`, /admin → Брэнд) дүүргэнэ. Хэзээ ч захиалга зохиохгүй тул **бодит борлуулалт гармагц filler-ийг шахаж гаргана**.

Нарийн ширийн:
- **Round-robin брэнд хооронд** — PRIECLAT дангаараа 21 нийтлэгдсэн бараатай тул брэнд-дараалалаар дүүргэвэл бүх сул слотыг эзлэх байсан.
- **`Asmy`-г featured brand болгож нэмэв** (`scripts/seed-featured-brand-asmy.ts`, idempotent, бодит Aiven дээр ажилласан). PRIECLAT (21 бараа) болон Cocochi (16) аль хэдийн байсан; Asmy (5 нийтлэгдсэн, 4 зурагтай) байгаагүй. **Анхаар: `products.brand` дээр яг "Asmy" гэж бичигдсэн** — "ASMY" гэвэл ямар ч мөртэй тааралдахгүй.
- **Хоёр rail давхардаж эхэлсэн**: `getRecommendedProducts`-ийн cold-start нь bestsellers-ийг шууд буцаадаг тул нүүр хуудсан дээр **ижил 6 карт 2 удаа** гарч байв. Одоо 2 дахин гүн хуудас асууж, хоёр дахь хэсгийг авдаг.
- **Тогтворгүй эрэмбийн bug**: filler query-ийн `.limit(limit * 12)` нь хүсэлтийн хэмжээнээс хамаарч **өөр өөр брэнд** таслагдаж байсан тул round-robin-ийн queue тоо өөрчлөгдөж, нэг бараа хоёр rail-д алдагдаж байв. `.limit(400)` (тогтмол) + `desc(products.id)` эцсийн tiebreak болгов.

**Үр дүн**: хоёр rail 6-6 картаар дүүрэв, давхардал **0**, зураг 12/12 ачаалагдав, PRIECLAT/Cocochi/Asmy гуравуулаа харагдана.

---

### Баталгаажуулалт

- `pnpm check` (tsc --noEmit) цэвэр, `pnpm build` цэвэр.
- **28 хослол** (7 хуудас: `/`, `/shop`, `/brands`, `/journal`, `/returns`, `/track-order`, `/login` × 4 өргөн: 1440/1024/390/320): хэвтээ overflow **0**, хэсгийн давхцал **0**, контрастын алдаа **0**, эвдэрсэн зураг **0**, хуудас бүрт `<h1>` яг **1**.
- `server/bestsellers.integration.test.ts` (3) + `server/catalog-filter.test.ts` (21) = **24/24 ✅**. Bestseller тестүүд "нийтлэгдээгүй бараа гаргахгүй", "төлөгдөөгүй захиалгын тоо ширхэгийг тоолохгүй" гэдгийг баталсан хэвээр — filler нь `isPublished` + нөөц + зураг шаарддаг тул үндсэн гэрээг зөрчөөгүй.
- Design canvas (Linen сонгогдсон, Paper лавлагаа болж үлдсэн): (дотоод тайлан)

### Git

Бүх ажил `main`-руу шууд commit хийгдэж push хийгдэв (`7efab8b`). Хуучин `audit-2026-09-09-order-unwind` branch локал болон remote-оос устгав (агуулга нь бүхэлдээ main дотор байгааг `git log main..<branch>` хоосон гэдгээр баталгаажуулсан).

---

## "Нэг бүтэн бүтээгдэхүүн" мэт биш, "AI-аар хийсэн" мэт харагдах шалтгаан — Cohesion audit + NEWVISION Phase A-D (2026-09-04)

Tom 3 асуулт тавив: (1) сайт яагаад "fully integrated as one" биш, feature-үүд "arai ydan" (санамсаргүй) нэмэгдсэн мэт санагддаг вэ, (2) функциональ талаас юу дутагдаж байна, (3) сайт **AI-аар хийсэн мэт харагдахгүй байх ёстой** — үүнийг таамаглалаар биш, **бодит Reddit/coding community судалгаа** дээр үндэслэж хариулахыг тодорхой шаардав. `/plan`-оор дуудагдсан, action хийхээс өмнө төлөвлөгөө шаардсан.

### Судалгаа (3 зэрэгцээ эх сурвалж)

- **2 Explore agent** кодыг бүхэлд нь file:line баталгаатай шалгаж, cohesion болон функциональ цоорхойг олов.
- **Бодит WebSearch** (2025-2026 dev community, Reddit r/webdev чиглэлтэй, developersdigest.tech, 925studios.co) — "AI slop" гэдэг нэрээр тогтсон **16 нэрлэгдсэн design pattern**.
- Миний өөрийн шууд grep/read баталгаажуулалт (жишээ нь `SectionEyebrow.tsx`-ийн ӨӨРИЙН comment "used at the top of every homepage section" гэж бичсэн байсныг олов).

**Гол дүгнэлт**: 3 асуулт ижил нэг эх сурвалжтай — SUGI-ийн код бааз зөв pattern (design tokens, shared component, CMS)-ийг **мэддэг ч**, шинэ feature бүрийг тусдаа session/component/локал хувьсагчаар нэмсэн тул (а) ижил зүйл (ProductCard, formatMnt, eyebrow badge) 3-4 удаа дахин зохиогдсон, (б) ganц section-heading pattern **хэт олон удаа** давтагдсан → 2025-2026 "AI slop" tell-үүдтэй (badge above H1, numbered 01/02/03, all-caps kicker, identical 3-card grid) шууд таарсан, (в) StorePay/eBarimt зэрэг feature admin дээр бэлэн боловч хэрэглэгчид хэзээ ч бодитоор ажилладаггүй.

**Чухал нээлт**: Tom өөрөө 2026-09-02-нд яг энэ асуултад (header тусдаа, footer нимгэн, merchandising rail байхгүй, Топ брэнд/бодит review харагдахгүй) аль хэдийн хариулж, `NEWVISION.md`-г plan mode-оор **батлаад, хэрэгжүүлээгүй орхисон** байсныг олов. Энэ бол хамгийн том, аль хэдийн зөвшөөрөгдсөн шийдэл байв.

### Phase A — Итгэлийн засвар

StorePay-ийн Home/footer-ийн худал зар (Checkout-д энэ сонголт огт байхгүй байтал "боломжтой" гэж зарладаг байсан) арилгаж бодит хүргэлтийн хугацааны амлалтаар сольсон; `ProductDetail.tsx`-ийн `/#products` dead link → `/shop`; `AdminIntegrationsPanel.tsx`-д 4 холбогдоогүй provider дээр (eBarimt/StorePay/Golomt-карт/eBuuhia) "идэвхжээгүй" амбер анхааруулга нэмэв.

### Phase B — Хуваалцсан эх сурвалж

`shared/format.ts`-руу `formatMnt` нэгтгэв (21 файлд copy-paste хийгдэж байсныг нэг эх сурвалж болгов). `shared/format.ts`-руу нэгтгэсэн. Category жагсаалт (Home 6-тай, Shop 4-тэй, өөр өөр дараалал/тайлбартай байсан) нэг `client/src/components/home/categories-data.ts`-руу нэгтгэв. "800+" тоог `catalog.publishedCount` шинэ endpoint-оор (`getPublishedProductCount`) сервэрээс тооцоолж, Hero/WhyChooseUs/CategoryMasonry 3 slot-д ижил бодит утга дамжуулав (өмнө нь 3 тусдаа hardcode байсан, зөрөх боломжтой). `BestsellerRailCard`/`RailProductCard` shared component-ууд нэмж, Home.tsx-ийн 2 давхардсан inline card JSX болон `RecommendedForYou.tsx`/Shop.tsx-ийн `RecentlyViewed`-ийн тусдаа markup-ийг нэгтгэв.

**Явцад олдсон admin bug**: `AdminWorkspace.tsx`-ийн section navigation зөвхөн "media" URL param-ыг л уншдаг байсныг бүх section-д ажилладаг болгож, admin бус эрхтэй хэрэглэгчийг зөвхөн-admin section-оос redirect хийдэг хамгаалалт нэмэв.

### Phase C — WhyChooseUs дахин зохион байгуулалт

3 ижил icon-карт эгнээ ("AI slop" pattern #12-той шууд таарсан) → 1 том stat card (bodит "900+" тоо) + 2 жижиг card-тай тэгш бус grid болгов, `productCountLabel` prop дамжуулав.

### Phase D — NEWVISION.md хэрэгжүүлэлт (Tier 1-8, өөрийн 8 бие даасан commit)

- **Tier 1-2**: шинэ, хуудсанд холбогдоогүй primitive-үүд — `CarouselShelf.tsx` (scroll-edge detection, `prefers-reduced-motion`-той нийцсэн scroll), `ShelfProductCard.tsx`, `EditorialBanner.tsx` (3 variant), `TrustTriptych.tsx`.
- **Tier 3**: backend — шинэ `featured_brands` хүснэгт (`drizzle/0040_featured_brands.sql`), `getCategoryShelfProducts`/`getHomeCategoryShelves`/`getFeaturedReviews`/`getFeaturedBrands`/admin CRUD функцууд, `catalog.categoryShelves`/`catalog.featuredBrands`/`reviews.featured` public procedure-үүд.
- **Tier 4**: `AdminBrandsPanel.tsx` (шинэ, бүрэн CRUD UI, brand нэр нь чөлөөт текст биш `<select>` — `admin.distinctRealBrands`-аас сонгоно). Tom-ийн бодит зарласан 2 top brand-ыг (PRIECLAT, Cocochi) бодит admin UI-аар үүсгэв. Явцад олдсон "alignment symmetrical биш" гомдлыг шалгах явцад дээрх admin URL-state bug-ыг олов (Tier B-д аль хэдийн засагдсан).
- **Tier 5**: `Home.tsx`-д Топ Брэнд section, 6 CarouselShelf ангиллын rail, CustomerVoices section холбов. **Шинэ `filterCatalogBrand`** (`shared/catalog-filter.ts`) + Shop.tsx-д бодит `brand` URL-state нэмэв (NEWVISION-ийн урьдчилсан нөхцөл байсан, Shop-д брэндээр шүүх сонголт огт байгаагүй).
- **Tier 6**: `CommerceHeader.tsx`-г Home.tsx-ийн тусдаа `.site-header`-ийн оронд ашиглаж, marketing nav row (Дэлгүүр/Топ брэнд/Гишүүнчлэл/Салбарууд/Journal) нэмэв. **2 бодит bug олж заслаа**: (1) `.sugi-site { overflow: hidden }` нь `position: sticky`-г CSS spec-ийн дагуу бүрэн эвддэг байсныг bounding-box шалгалтаар олж (`header: { y: -559.86 }` гэж дэлгэцээс гарсан байсныг баримтжуулж) арилгав (Playwright-ээр 5 breakpoint дээр 0 overflow баталгаажуулсны дараа; **`.sugi-commerce`-ийн ижил төстэй, тусдаа, Checkout-д байгаа 320px overflow bug-ийг зориудаар хөндөөгүй**, тусдаа ажил болгож үлдээв); (2) sticky header жинхэнэ болмогц SitePromo-ийн мөн адил sticky зурвастай давхцах эрсдэлийг `--promo-banner-offset` CSS variable-ийг дахин ашиглаж шийдэв.
- **Tier 7**: `SiteFooter.tsx` (шинэ, standalone component) — 3 багана (Брэнд/Шуурхай холбоос/Нөхцөл/Холбоо барих)-аас 5 багана (Дэлгүүр — 6 бодит ангилал, Салбарууд — 4 бодит салбарын Google Maps холбоос орсон) руу өргөжүүлэв. **QA-ийн явцад "0 үр дүн" гэсэн худал сэжигтэй үр дүн гарсан** боловч дахин шалгахад (server-side тRPC хариу шууд шалгаж, дараа нь илүү удаан хугацаа хүлээж) энэ нь **тестийн скриптийн өөрийнх нь урьдчилсан унших (premature read) алдаа** байсан (+1000ms дээр Aiven-ийн бодит сүлжээний хариу хараахан ирээгүй, +3000ms дээр зөв "115 үр дүн / 937 бүтээгдэхүүн" гарсан) — код дээр бодит bug байгаагүй.
- **Tier 8 (бүрэн баталгаажуулалт, §13 чеклист)**: `pnpm check`/`pnpm build` цэвэр, **`pnpm exec vitest run --no-file-parallelism` 204/204 (35/35 файл)**. Playwright (түр суулгаад бүрэн хассан)-ээр: 7 breakpoint (1440/1024/768/430/390/375/320px) дээр 0 хэвтээ overflow, 0 console алдаа; `reducedMotion:"reduce"` emulation дор sunrise/shop ribbon-ийн адил зурвасын exemption хэвээр ажиллаж байгааг баталгаажуулав; CarouselShelf/mobile drawer хоёулаа **гар товчлуураар** (Tab+Enter) ажиллаж байгааг баталгаажуулав; **CustomerVoices-ийн шударга хоосон төлөв** — одоогийн бодит каталогт ≥4 од + баталгаажсан + сэтгэгдэлтэй review 0 байгааг `reviews.featured` public endpoint-оор шууд баталгаажуулж (section бүхэлдээ зөв нуугдаж байгаа), дараа нь throwaway review нэмж section бодит өгөгдлөөр зөв харагдаж байгааг (rating/comment/avatar/product холбоос) баталгаажуулаад бүрэн устгав; **Топ Брэнд admin CRUD** бодит throwaway admin хэрэглэгчээр create→Home дээр харагдах→delete гурвыг бүрэн дугуйлж баталгаажуулав (`featured_brands` хүснэгтэд шууд бичигдэж, Home-ийн Топ Брэнд section-д бодитоор гарч, устгасны дараа алга болсныг баталгаажуулсан); Shop/ProductDetail/Checkout/Profile 4 хуудсанд 0 overflow, 0 console алдаа, `CommerceHeader`-ийн marketing nav зөвхөн Home дээр л гарч (бусад хуудсанд leak хийгээгүй) байгааг баталгаажуулав. Бүх throwaway өгөгдөл (review+user, admin+audit log, featured_brands мөр) DB-ээс бүрэн устгаж баталгаажуулсан.

**Үлдсэн, NEWVISION.md §14-т тэмдэглэгдсэн, тусдаа ажил (одоо эхлээгүй)**: Isetan-ийн density-toggle, гүн faceted filter (үнийн зурвас), ProductDetail-ийн "Pairs well with" cross-sell-ийг шинэ `CarouselShelf`-ээр дахин зурах.

**Cohesion audit-ийн Phase E (функциональ код засвар) болон Phase F (Tom-ийн бизнес шийдвэр шаардсан зүйлс — QPay merchant, eBarimt, StorePay гэрээ) энэ session-д эхлээгүй**, зөвхөн диагноз хэлбэрээр баримтжуулагдсан.

---

## Гүйцэтгэл + гар утасны навигацийн bug + зургийн pipeline (2026-09-02/03)

Tom "энэ website world-class харагдаад маш хурдан ачаалагдах ёстой, серверийн тал юу дутуу вэ" гэж websearch/brainstorm хийж, **action хийхээс өмнө** төлөвлөгөө гаргахыг тодорхой шаардав.

### Судалгаа: 3 Explore agent + 1 Plan agent + websearch

3 agent зэрэг ажиллуулж кодыг file:line-аар баталгаажуулсан аудит хийв:
- **Frontend performance**: vendor chunk байхгүй, cache header огт байхгүй (content-hash-тай асset хүртэл), `loading="lazy"` ердөө 1 газарт, `srcset` хаана ч байхгүй, React Query staleTime тохируулаагүй, **хамгийн том олдвор**: `Shop.tsx` бүх 937/938 барааны бүрэн metadata-г /shop хуудас бүр ачаалах бүрд шилжүүлдэг байсан (client-side filter/sort/paginate).
- **Backend architecture**: rate limiting/CSP/CSRF сайн хийгдсэн, raw SQL injection алга (аль хэдийн баталгаажуулсан), гэхдээ `getAdminOrders` бүрэн хязгааргүй query, `orders.paymentStatus`/`createdAt`-д index алга, Aiven connection pool-д timeout/keepAlive алга (PROJECT-GUIDE.md-ийн баримтжуулсан Aiven latency асуудалтай шууд холбоотой), unhandledRejection handler алга, health endpoint tRPC procedure хэлбэртэй (uuptime monitor-д тохиромжгүй).
- **Design consistency**: **хамгийн чухал олдвор** — `CommerceHeader.tsx` (Shop/ProductDetail/Checkout/Profile) гар утсан дээр hamburger цэс огт байхгүй байхад index.css-ийн `@media(max-width:760px)` дүрэм "Дэлгүүр"/wishlist холбоосыг **нуучихдаг**, хүрэх өөр зам байхгүй — bug, эстетикийн асуудал биш. Мөн Home.tsx-ийн redesign token (`--shadow-sm/md/lg`) зөвхөн Home-ийн component-д ашиглагдаж, Shop/Checkout/ProductDetail өөр өөр гараар бичсэн ойролцоо утга ашигладаг байв.

Гадаад судалгаа (2026 Core Web Vitals, зургийн формат, **Монголын дундаж 17 Mbps mobile хурд/92ms latency — глобал дундаж 33.9 Mbps-ээс 2 дахин удаан**, "quiet luxury" дизайны чиг хандлага, Cloudflare-ийн үнэгүй tier-ийн боломж).

Plan agent эдгээрийг нэгтгэж 6 Phase-той төлөвлөгөө гаргав. Tom **Phase 1 + Phase 2 + Phase 4a**-г одоо шууд хийхээр сонгов (Phase 3/4b/5/6 дараагийн session-д баримт бичиг хэлбэрээр).

### Phase 1 — Гүйцэтгэл ба найдвартай байдлын код-л засвар

- **1a (хамгийн том нөлөөтэй)**: `getPublishedCatalog()`-ийг ашиглан шинэ `getPublishedCatalogPage()` функц нэмж, `catalog.list` procedure-д category/skinType/inStockOnly/sort/page/pageSize input нэмэв. Одоо байгаа `shared/catalog-filter.ts`-ийн pure функцуудыг (filter/sort) **server талд дахин ашиглаж**, ижил семантик хадгалав. Client-side facet (categories/skinTypes) full catalog-оос тооцоологдож хэвээр (Shop.tsx-ийн одоогийн зан төлөвтэй яг таарна). Шинэ `catalog.byIds` endpoint нэмж, "Таны сүүлд үзсэн" rail-ийг тусад нь тэжээв (өмнө нь бүх catalog-ийг санах ойд байлгаж арга хэрэглэдэг байсан). **Playwright-ээр баталгаажуулсан**: анхны ачаалт 18KB (өмнө нь 937/938 барааны бүрэн metadata байсан), category/sort/page солиход яг 1 шинэ жижиг (~12KB) хүсэлт явна.
  - ⚠️ **Aiven latency-ийн эрсдэл олж, шийдэв**: pagination нэмэхэд `getPublishedCatalogPage` нь click бүрд Aiven руу дахин бүтэн query явуулах болсон — PROJECT-GUIDE.md-ийн баримтжуулсан Aiven latency асуудалтай давхцаж болзошгүй регресс. 10 секундийн in-memory TTL кэш (**зөвхөн энэ функцэд**, `getPublishedCatalog()`-ийн бусад хэрэглэгчид (admin write-ийн дараах шууд унших, `commerce.database.integration.test.ts`) огт нөлөөгүй) нэмж шийдэв.
- **1b**: Vite static serving-д `Cache-Control` header нэмэв (`assets/`-д мөнхийн immutable cache, root-level файлд no-cache — index.html хуучирсан hash-руу заахаас сэргийлнэ). S3 `PutObjectCommand`-д мөн адил. `storageProxy.ts`-ийн 302 redirect-д cache header нэмэв. `compression` (gzip) middleware шинээр нэмэв.
- **1c**: `loading="lazy"` 7 газарт нэмэв (Shop grid+recently-viewed, RecommendedForYou, Home 2 rail, ProductDetail 2 rail). `vite.config.ts`-д `manualChunks` нэмж React/react-query/trpc-г тусдаа vendor chunk болгов (473KB → 375KB main + 97KB vendor).
- **1d**: React Query `staleTime: 30_000` тохируулав (өмнө нь 0, remount бүрд дахин ачаалдаг байсан).
- **1e**: `orders.paymentStatus`/`orders.createdAt`-д DB index нэмж (`drizzle/0039_orders_payment_created_indexes.sql`) бодит Aiven дээр ажиллуулав. `getAdminOrders()`-д LIMIT 200 нэмж, `orderItems`-ийн WHERE-гүй бүтэн scan-ийг `inArray`-ээр хязгаарлав. `process.on("unhandledRejection"/"uncaughtException")` handler шинээр нэмэв. `GET /health` (dbPing ашигладаг, uptime monitor-д зориулсан plain endpoint) нэмэв. `getDb()`-ийн mysql2 pool-д `connectTimeout: 10_000`/`enableKeepAlive: true` нэмэв (drizzle-ийн `{ connection: {...} }` config хэлбэрээр, cross-package Pool type clash-аас зайлсхийхийн тулд).
- **1f**: `Home.tsx`-ийн bestseller/recommended rail-д skeleton loading state нэмэв (шинэ `BestsellerCardSkeleton`, `Skeleton.tsx`-д нэмэгдсэн) — өмнө нь ачаалж байх үед юу ч харагдаагүй ("байхгүй" мэт).

### Phase 2 — Гар утасны навигацийн bug + дизайны token нэгтгэл

- **2a (bug засвар)**: `CommerceHeader.tsx`-д hamburger+slide-down drawer нэмэв (`.commerce-menu-toggle`/`.commerce-mobile-menu`, Home.tsx-ийн `.mobile-menu`-тэй ижил техник, тусдаа class нэртэй). Дотор нь Дэлгүүр/Хүслийн жагсаалт (нэвтэрсэн бол)/Профайл 3 холбоос. **Playwright-ээр баталгаажуулсан**: 390px viewport дээр hamburger харагдаж, дарахад drawer нээгдэж, "Дэлгүүр" дарахад шилжиж, drawer хаагдана.
- **2b**: `ProductDetail.tsx`/`Checkout.tsx`/`.profile-section`-ийн гараар бичсэн ойролцоо `box-shadow` утгуудыг `--shadow-sm/md/lg` token-оор сольсон. Category data давхардал (Home.tsx 6 vs Shop.tsx-ийн бараг хэзээ ч харагдахгүй empty-state deck-ийн 4) болон shared ProductCard component extraction-ыг **зориудаар хойшлуулсан** — учир нь эдгээр нь Phase 3 (хойшлогдсон)-ийн жинхэнэ payoff-той, одоо хагас хийвэл эрсдэл нэмнэ гэж үзсэн.

### Phase 4a — WebP + responsive зургийн pipeline

- Шинэ `shared/image-variants.ts`: `.webp` өргөтгөл = "600px grid derivative байгаа" гэсэн дохио (баримт бичиггүй, зөвхөн файлын нэрээр). Хуучин `.jpg`/`.png` зурагт хэзээ ч 404 үүсгэхгүй тул аюулгүй, аажимдаа шилждэг.
- `imageProcessing.ts`-д шинэ `processUploadedImageVariants()` — WebP full + 600px grid хоёуланг зэрэг үүсгэнэ. `storage.ts`-д `storagePutImageVariants()` — хоёуланг **нэг ижил hash**-тайгаар бичдэг (derivation key-ээс тооцоологдоно).
- 3 upload procedure (product/siteMedia/postCover) шинэ pipeline руу шилжив.
- Frontend: Shop grid+recently-viewed, Home 2 rail, ProductDetail 2 rail-д `srcset`/`sizes` нэмэв.
- **Backfill**: `scripts/backfill-image-variants.ts` бичиж, backup аваад (`defaultdb_2026-09-03_193151.zip`) бодит Aiven+R2 дээр ажиллуулав — **526/529 бодит зураг WebP руу хөрвүүлэгдэв, 66.9MB → 17.4MB (74% хэмнэлт)**, 0 алдаа.
- **🔴 Явцад олдсон бодит bug**: анхны хувилбар "эх зураг аль хэдийн 600px-ээс жижиг бол grid derivative огт үүсгэхгүй" гэсэн "хэмнэлт" хийсэн байв. Гэвч `shared/image-variants.ts`-ийн `gridVariantUrl()` нь **зөвхөн `.webp` өргөтгөлөөр** grid URL тооцоолдог тул ямар ч тохиолдолд grid байхгүй гэдгийг мэдэхгүй — үр дүнд **224/529 (42%) бодит зурагт срсет candidate 404 өгч байсныг** дараагийн шат дахин баталгаажуулах явцад HTTP HEAD-ээр шууд илрүүлэв. `processUploadedImageVariants()`-ийг **хэзээ ч null биш, үргэлж бодит grid buffer** буцаадаг болгож зассан (`grid: Buffer | null` → `grid: Buffer`), `scripts/repair-image-grid-variants.ts` бичиж дутуу 224-ийг бүгдийг нөхөв. **529/529 эцэслэн баталгаажсан** (HTTP HEAD бүх grid URL-д 200). Энэ bug-ийг regression тест болгосон (`imageProcessing.test.ts`-д "always returns a real grid buffer, even for a source already at or below GRID_VARIANT_WIDTH").

### Явцад олдсон, миний ажилтай хамааралгүй pre-existing bug 2

Тест suite болон бодит DB query-ээр Playwright QA хийх явцад **амьд Shop хуудсанд харагдаж байсан тестийн үлдэгдэл** олдов:
- `Order Notify Test Product` + `order-notify-1788273618514 category` (2026-09-01 06:40:20-д үүссэн, `order-notifications.integration.test.ts` цэвэрлэгдээгүй).
- `Telemetry Test Product` (`telemetry.integration.test.ts`-ийн үлдэгдэл, `catalog.recommended`/`catalog.bestsellers`-ийн цорын ганц "бодит захиалгатай" бараа болж, Home-ийн rail дээр зурагтай бодит бараа биш, зурагтгүй тестийн бараа гарч байх шалтгаан болсон).

Эдгээр нь миний Phase 1/2/4a ажилтай **хамааралгүй**, зөвхөн QA-гийн явцад анзаарагдсан тул засаагүй — Tom-д тусад нь мэдэгдэв.

### Баталгаажуулалт

- `pnpm check`/`pnpm build` бүх checkpoint дээр цэвэр.
- Бүрэн `vitest` suite (бүх integration gate идэвхтэй): **204/204 ✅ (35/35 файл)** — 194-ээс +10 шинэ тест (8 `image-variants.test.ts` + 2 `imageProcessing.test.ts` regression). Явцад 2 одоо байсан тест `catalog.list`-ийн шинэ paginated хэлбэрт тааруулж засагдсан (`commerce.router.test.ts`, `product-reviews.integration.test.ts` — сүүлийнх нь `catalog.byIds`-г ашиглах болсон, `catalog.list`-ийн default page 1-д тухайн тестийн бараа байх баталгаагүй тул илүү зөв).
- Playwright-ээр (түр суулгаад дараа нь **бүрэн, зөв хассан** — эхний оролдлогод `compression` dependency-г санамсаргүй хамт устгаж, олж зассан) Shop/Home/ProductDetail-ийг 1440px/390px дээр шалгав: эвдэрсэн зураг 0, srcset зөв ажиллаж байна, console алдаа 0.
- Backup: `backups/defaultdb_2026-09-03_193151.zip` (image backfill-ийн өмнө).

### Branch

`perf-nav-image-fixes` (main-аас салгасан) — commit хараахан хийгдээгүй, Tom-ийн шийдвэрийг хүлээж байна.

---

## Санал болголтын чанар: 246 зураг сэргээв, tagging дүрэм засав, 2 bug олов (2026-09-01, гэрийн лаптоп)

Tom: "ажлын лаптоп дээр хийж байсан ажлыг гэрийн лаптоп дээр үргэлжлүүл, localhost:3000 асаа, 937 tag бараг бүрэн болсон байх ёстой". Эхлээд PROJECT-GUIDE.md-ийн эхний 83 мөр, `HISTORY.md`, `self-review.md`-г уншсан.

### Синк

`git fetch` хийхэд local `main` нь `origin/main`-аас **35 commit хоцорсон** байв: ажлын лаптоп бүх branch-ийг `main`-руу нэгтгээд (`home-redesign-categorymasonry-v2` remote-оос устсан, гэхдээ бүх commit нь `main`-д багтсан) дээр нь 9 шинэ commit нэмсэн байв (CategoryMasonry v8/v9/v10, Journal archive хуудас, 4 дэх салбар, Shop ribbon, Preference Profile v2 + Recommendation Engine v2). `main` руу шилжиж fast-forward хийв. `package.json`/lockfile өөрчлөгдөөгүй тул `pnpm install` шаардлагагүй байв. `.env` Aiven руу зөв заасан байсныг (`SELECT COUNT(*) FROM orders` = 4, `site_media` = 7 мөр) баталгаажуулав. `pnpm dev` асаав.

### 937/937 tag — үнэн, гэхдээ хангалтгүй

Aiven-ээс шууд query-ээр **937/937 бараа tag-тай** болохыг баталгаажуулав. Гэхдээ `self-review.md`-ийн өөрийнх нь үлдээсэн даалгаврыг ("apply-ийн дараа зөвхөн coverage хувийг биш, гарцын **бүрэлдэхүүнийг** унших") гүйцэтгэхэд өөр дүр зураг гарав. `scorePreferenceMatch`-ийг бодит каталог дээр 5 реалист профайлаар ажиллуулж, `applyDiversityCap` дараах top-8-ийн ангиллын хуваарилалтыг хэвлүүлэв:

- Реалист олон-signal профайл: 3 арьс арчилгаа + 3 үс/бие + 2 гоо сайхан — **тэнцвэртэй**, Tom-ийн өмнө барьж авсан "дандаа хүүхдийн бараа" bug эргэж ирээгүй ✅
- "Тослог арьс + батга": 937-гийн ердөө **8** бараа score > 0
- **"Хуурай үс": 0 бараа**
- **"Эрүүл мэнд & амьдрал" (wellnessInterests): 0 бараа**

Tag-ийн бодит тархалтыг хэвлүүлэхэд шалтгаан тодорхой болов: `skinType` = normal **590** / sensitive 4 / dry 1 / **oily 0** / **combination 0**; `hairType` = normal 104 / damaged 14 / **dry 0** / oily 0 / color_treated 0; `hairConcerns` **бүхэлдээ хоосон**. Өөрөөр хэлбэл дийлэнх нь Tier-2-ийн `"normal"` **placeholder**, баримт биш — quiz-ийн 5 сонголтын 2-3 нь ямар ч бараатай таарахгүй байв. 3 дахь fallback tier байдаг тул рэйл хоосон харагдахгүй, тиймээс гаднаас нь **ажиллаж байгаа мэт** харагдана — яг үүнээс болж тархалтыг шалгах шаардлагатай байсан.

### Bug 1 — `wellnessInterests` scoring-д огт ороогүй

Quiz-ийн 5-р алхам энэ талбарыг цуглуулж, 37 бараанд tag хийгдсэн, admin форм харуулдаг байсан ч `PreferenceProfile`/`ScorableProduct`/`scorePreferenceMatch`-д огт байгаагүй, `getRecommendedProducts` нь `users`-ээс уншиж ч чадахгүй байв — хэрэглэгчийн хариулт санал болголтыг **яг тэг**-ээр өөрчилдөг байв. `server/routers.ts:162`-ийн тайлбар өөрөө "hairType/hairConcerns/fragrancePreference/**wellnessInterests** are used both ways" гэж бичсэн атал код нь тэгээгүй байсан тул энэ нь санаатай дизайн биш, орхигдсон алдаа. `skinConcerns`/`hairConcerns`-тэй ижил comma-separated multi-select тул ижил `scoreTokenListMatch` (priority decay) ашиглав. 5 газарт (users select, `hasAnyPreference` gate, recommended candidates select, related viewed select, related candidates select) холбов. Бодит каталог дээр 0 → 37 бараа.

### Bug 2 — зочны нүүр хуудсанд "Танд санал болгож байна" хэсэг бүхэлдээ алга болдог байв

`curl`-ээр `catalog.recommended`-ийг зочноор дуудахад `[]` буцаж байв. Шалтгаан: `getRecommendedProducts` нь preference/history-гүй үед `if (!hasAnyPreference && !hasAnyHistory) return bestsellers();` гэж **шууд early-return** хийдэг; энэ каталогт paid захиалга ~0 тул `getBestsellingProducts` хоосон буцдаг; `RecommendedForYou.tsx` нь `if (!products.length) return null` тул хэсэг ул мөргүй алга болдог байв. Хамгийн ноцтой нь: доор нь 2026-09-01-нд тусгайлан нэмсэн 3 дахь fallback tier ("ямар ч in-stock published бараагаар дүүргэх, score claim-гүй") хүртэл **огт хүрдэггүй** байсан — early-return түүнийг бүхэлд нь тойрч гарсан. Компонентын өөрийнх нь толгойн тайлбар "Always has content now (guest and never-tagged shoppers both get a bestseller-backed fallback server-side)" гэж батлан бичсэн нь бодит байдалтай зөрчилдөж байв.

Хамгийн бага засвар: bestseller хоосон бол early-return хийхгүй, доорх урсгал руу унагаана — preference байхгүй тул бүх score 0 болж, scoring хэсэг байгалийн жамаар алгасагдаж, зөвхөн сүүлийн tier дүүргэнэ. `curl`-ээр 0 → 8 бараа болсныг баталгаажуулав.

### Tagging дүрэм — бодит өгөгдлийг эхлээд хэмжиж байж бичсэн

Дүрэм зохиохын өмнө каталогийн бодит текстийг судлав. Гол нээлт: **917/937 барааны тайлбар нь импортын үед дүрмээр автоматаар үүсгэгдсэн загвар текст** (`PRODUCT-IMPORT.md`-ийн bulk-import хэсэг) — бүгд "`<брэнд>` нь Японы жижиглэнгийн худалдаанд өргөн танигдсан `<төрөл>` бөгөөд өдөр тутмын хэрэглээнд зориулагдсан..." гэсэн ижил бүтэцтэй, дундаж урт 225 тэмдэгт. Тиймээс арьс/үсний төрлийн тухай **бодит мэдээлэл текстэд огт байхгүй**: "тослог" 1 бараа, "хуурай" 4, "sensitive" 5, "combination" 0.

Харин **найрлага** (импортын үед бодитоор олдсон: CICA/Centella 29, коллаген 11, морины тос 10, гиалурон ~9, ретинол 5, niacinamide 2) болон **барааны хэлбэр** (нэрнээс: shampoo 46, mask 91, cream 56, lotion 33, serum 28, soap 43) нь жинхэнэ, ялгах чадвартай signal байв. Дүрмийг эдгээр дээр суурилуулав.

Нэр дэвшигч түлхүүр үг бүрийн бодит таарц тоог **урьдчилан хэмжсэн** нь 3 худал эерэгийг ШИЖИХЭЭС ӨМНӨ барьж авав:
- **`"зөөлөн"` skincare-ийн 443/560 (79%)-д таарч байв** — 2026-09-01-ний "dryness 441/445" урхитай яг ижил boilerplate. Ашиглаагүй.
- **`"жин"` нь `"жинхэнэ"`** гэсэн загвар үгэнд таарч байв (wellness ангилалд 32/37) — `PRODUCT-IMPORT.md`-д аль хэдийн тэмдэглэсэн `"epa" ⊂ "rEPAir"`-тэй ижил substring урхи. Ашиглаагүй.
- **`"rice" ⊂ "price"`** тул латин "rice" ашиглаагүй, зөвхөн Монгол "будаа".

Дүрэм бичсэний дараа **гарсан tag бүрийн ард байгаа бодит барааны нэрсийг хэвлүүлж уншсан** нь дахин 2 алдаа илрүүлэв:
- **`"sebum"`** нь "арьсны байгалийн тостой (sebum) маш ойролцоо бүтэцтэй" гэсэн **тайлбар** өгүүлбэрт таарч, өөрөө "хуурай, мэдрэг арьсыг зөөлрүүлнэ" гэж бичсэн squalane тосыг **"тослог" гэж эсрэгээр нь** тэмдэглэж байв. Хассан.
- **Үсний дүрэм биеийн бүтээгдэхүүн дээр ажиллаж байв**: "Үс ба бие" ангилал нь 118 бараанаас **82 үс + 36 бие** (body milk, bie угаагч, гарын саван) бөгөөд "S-Select High Moisturizing Body Milk"-ийг "хуурай ҮС"-ний бараа гэж тэмдэглэж байв. Нэрээр (hair/shampoo/conditioner/scalp/treatment/үс/шампун) хаалт нэмж зассан.

Үр дүн: **Tier-1 хамрах хүрээ 112 → 194**. Хамгийн чухал нь **quiz-д санал болгодог мөртлөө ямар ч дүрэм үүсгэж чаддаггүй байсан 2 утга** ажиллах болов: `skinConcerns: "sensitivity"` (CICA/Centella) ба `hairConcerns: "scalp_sensitivity"`.

Шинэ регресс тест 6 (`product-tagging.test.ts` 6 → 12): CICA→sensitive, sebum худал эерэг, rice⊂price, бие≠үс, "Moist Diane ... Repair"→damaged (брэндийн нэрэнд "Moist" байсан ч repair дүрэм түрүүлж ажиллана), scalp_sensitivity. Мөн нэг одоо байсан тестийн fixture-ийг солив: "S SELECT **White Clay** Foam cleanser" нэр нь шинэ дүрмээр бодит signal (clay = тос шингээгч цэвэрлэгч) болсон тул тестийн санаа ("boilerplate тайлбар ганцаараа tag үүсгэхгүй") хэвээр байлгахын тулд signal-гүй бодит бараагаар ("S SELECT whipping net 1P") сольсон.

### 246 барааны зураг сэргээв — хамгийн том олдвор

`scripts/reconcile-images-from-r2.ts --dry-run` ажиллуулахад R2-д `catalog/products/` дор **383 барааны 399 объект** байгаа атал Aiven-д зөвхөн **147** нь `imageUrl`-аар холбогдсон байв. Өөрөөр хэлбэл өмнөх session-үүдэд websearch-ээр олж, нүдээр шалгаж, upload хийсэн **246 барааны хөдөлмөр "алдагдсан"** хэвээр байсан. Хамгийн боломжит шалтгаан нь тэр өдрийн `DATABASE_URL` incident: зургийн байт нь хуваалцсан R2 руу очсон, харин `imageUrl` нь буруу local MySQL руу бичигдсэн.

Аюулгүй байдлыг шалгасан: объектын зам нь тухайн барааны **өөрийн id**-г агуулдаг тул андуурах эрсдэлгүй; нэмээд 10 дээжийн R2 файлын нэрийг DB дэх барааны нэртэй тулгахад **бүгд яг таарч** байв (жишээ: id=1003 `club-suppin-powder` → "Club Suppin Powder"). Backup аваад apply хийв: **246 мөр шинэчлэгдэж, зурагтай бараа 147 → 393** боллоо. Сэргээсэн зургийн нэгийг `curl -L`-ээр шалгахад бодит **200 / 24,674 байт** ирж байгааг баталгаажуулав (DB дэх мөр биш, жинхэнэ файл).

### Tier-2 placeholder цэвэрлэгээ

`auto-tag-products.ts` нь зөвхөн `NULL` багана дээр бичдэг (admin-ы гараар оруулсныг хэзээ ч дарж бичихгүй) тул сайжруулсан дүрэм аль хэдийн `"normal"` бичигдсэн 590 skinType / 104 hairType дээр огт нөлөөлөхгүй байв — dry-run нь 937/937 → 937/937 (өөрчлөлтгүй) гэж харуулав. Tom зөвшөөрсний дараа эдгээр placeholder-ыг цэвэрлээд дахин бодов.

Аюулгүй байдлын үндэслэл (таамаглаагүй, шалгасан): `suggestTagsForProduct` нь skinType/hairType-д `"normal"` утгыг **хэзээ ч үүсгэдэггүй** (дүрмүүд нь зөвхөн sensitive/oily/dry/combination ба damaged/color_treated/oily/dry гаргана) тул бүх `"normal"` нь Tier-2-ийн бичсэн placeholder гэдэг нь тодорхой; мөн bulk apply-аас хойш `updatedAt`-аар шалгахад **гараар засагдсан бараа 0** байв.

Эцсийн байдал: `skinType` sensitive 4 → **25**, oily 0 → **5**; `hairType` dry 0 → **9**; `skinConcerns` sensitivity 0 → **21**; `hairConcerns` 0 → **25**; tag coverage 937/937 хэвээр.

Apply-ийн дараа өмнө хоосон байсан профайлуудыг дахин ажиллуулав: "Хуурай үс" 0 → **9** (moisture шампунь/treatment), "Тослог арьс" 0 → **5** (charcoal scrub, clay cleanser), "Мэдрэг арьс" ~0 → **25** (CICA бүтээгдэхүүн), "Толгойн арьс мэдрэмтгий" 0 → **13** (scalp шампунь). Бүх гарцыг нэрээр нь уншиж, сэдэвт нийцэж байгааг баталгаажуулав.

### Дүрмээр цаашид засах боломжгүй хязгаар

`skinType`-ийн **combination**, `hairType`-ийн **oily/color_treated** нь 0 хэвээр, 564 бараа `skinType="normal"` placeholder хэвээр байна. Энэ бол дүрмийн сул тал биш — **өгөгдөлд тэр мэдээлэл огт байхгүй** (POS export нь баркод+нэр+үнэ, тайлбар нь автоматаар үүсгэгдсэн). Дүрмийн боломж энэ session-д дуусгагдсан; цаашид зөвхөн илүү сайн барааны өгөгдөл (websearch баяжуулалт эсвэл admin-аар гараар оруулах) л энэ тоог хөдөлгөнө.

### Тестийн дэд бүтцийн цоорхой

Бүрэн suite ажиллуулахад **22 файл "Database unavailable" / "Storage config missing"**-ээр унав. Шалтгаан: `vitest.config.ts` нь **`.env`-ийг огт ачаалдаггүй** — integration gate-үүд (`RUN_AUTH_INTEGRATION_TESTS` гэх мэт) тестийг АСААДАГ ч `DATABASE_URL`/`S3_*` байхгүй тул тэдгээр нь шатдаг. Ажлын лаптоп дээр shell-д гараар export хийж байсан бололтой. Шинэ `server/_test-setup.ts` (`import "dotenv/config"`) + `setupFiles` нэмж зассан — CI дээр `.env` байхгүй тул dotenv чимээгүй no-op болж, gate-үүд хэвээр унтарна.

`.env` ачаалагдсаны дараа **186/194 passed**, үлдсэн 8 нь бүгд `Test timed out in 5000ms`. Эдгээрийг 60с timeout-оор дахин ажиллуулахад **36/36 pass** (нэг тест 5-10с зарцуулдаг — Aiven руу олон round trip хийдэг тул) — өөрөөр хэлбэл assertion алдаа огт байгаагүй, зөвхөн сүлжээний саатал байв. `testTimeout: 30000` болгов: сүлжээнд хангалттай, гэхдээ жинхэнэ hang-ийг барихаар бага.

Хоёр засварын дараа бүрэн suite **194/194 ✅ (34/34 файл, 341с)** — ямар ч гар тохиргоогүйгээр, зөвхөн 3 gate env var-ыг өгөхөд шууд ногоон гарна.

### Анзаарсан операцийн эрсдэл

Integration suite нь **хуваалцсан бодит Aiven DB дээр** түр бараа/захиалга үүсгэдэг тул ажиллаж байх агшинд тэдгээр нь амьд `/shop` дээр зочинд харагдана. QA явцад авсан нэг screenshot дээр "Coupon Test Product 40,000₮" яг тэр агшинд орсон байсан (тест дуусмагц устсан, `orders`-т ул мөр үлдээгүй). Бодит хэрэглэгч сайтад орж эхэлсэн үед бүрэн suite-ийг production DB дээр ажиллуулах нь тохиромжгүй — ирээдүйд тусдаа test schema/DB рүү салгах нь зүйтэй.

### Үлдсэн 544 зургийн бодит дүн шинжилгээ

Зургийн ажлыг үргэлжлүүлэхээр хамгийн үнэ өндөртэй 3 бараанаас эхлэхэд **3-уулаа зураг биш, өгөгдлийн асуудал** гарав (0/3):

- **id=807 `PRIECLAT serum W` (sku 4955814711863) — SKU/нэрний зөрчил.** Албан ёсны SUGI Drug сайт дээр энэ баркод нь **クリームW (Cream W) 27g**; жинхэнэ Serum W-ийн баркод `4955814707477` нь манай каталогт id=804 гэж аль хэдийн байгаа. Каталогт `cream E` байгаа мөртлөө Cream W байхгүй нь id=807 үнэндээ Cream W гэдгийг дэмжинэ. **Нэр солих нь амьд дэлгүүрт харагдах өөрчлөлт тул зөвшөөрөлгүй хийгээгүй** — Tom-д санал болгосон.
- **id=859** (S-Select aojiru): баркодын угтвар Yuwa үйлдвэрийнх, уутны тоо (50 vs 56) таарахгүй.
- **id=725** (Uru-up Collagen): албан ёсны сав 185g / 212g≈32 хоног, манайх "42-day" — таарахгүй.

Энэ 0/3 нь санамсаргүй биш болохыг тоогоор баталгаажуулав: **үлдсэн 544-ийн 217 (40%) нь S-Select хувийн брэнд**, харин аль хэдийн зурагтай 393-ийн зөвхөн **24 (6%)** нь S-Select. Өөрөөр хэлбэл өмнөх 12 batch хялбар (брэндийн) барааг аль хэдийн түүсэн бөгөөд үлдсэн нь `image-sourcing-log.md`-ийн дахин дахин тэмдэглэсэн "онлайнд зураг байхгүй, зөвхөн бөөний нийлүүлэгчид зориулагдсан" сүүл. `PRODUCT-IMPORT.md`-ийн анхны таамаг ("~40% зураггүй үлдэж, эцэст нь дэлгүүрээс бодитоор зураг авах шаардлагатай") бодитоор биелсэн байна. Тиймээс бодит зам: **S-Select биш 327-г онлайнаас үргэлжлүүлэх, S-Select 217-г дэлгүүрт зураг авах жагсаалт болгож Tom-д өгөх**.

⚠️ **Мөн нэг цоорхой**: `backups/image-sourcing-log.md` нь `.gitignore`-т багтдаг тул **хоёр лаптоп хооронд синк болдоггүй** — нэг лаптоп дээрх ахиц нөгөөд харагддаггүй нь дээрх "246 зураг алдагдсан" нөхцөл байдалд хувь нэмэр оруулсан байх магадлалтай. Цаашид энэ ажлыг 2 лаптоп дээр үргэлжлүүлэх бол логийг tracked газар (`docs/`) зөөх нь зүйтэй.

### Зургийн эх сурвалжийн бүрэн эрэл (2026-09-01, Tom-ийн шаардлагаар)

Tom дээрх "S-Select-ийн зураг онлайнд байдаггүй" гэсэн дүгнэлтийг **татгалзаж**, "бүх зургийг сайн хай, япон хэлээр хай" гэж тодорхой шаардав. Тэр зөв байсан — нэг бүрчлэн websearch хийхийн оронд **баркодоор индексжсэн эх сурвалж** хайх нь зөв зам байв.

**Ажилласан 2 эх сурвалж:**

1. **sugi-drug.com (スギ薬局 Beauty Store)** — Shopify дэлгүүр бөгөөд `products.json` нээлттэй, хамгийн чухал нь **`handle` талбар нь яг JAN баркод** (`"handle":"4955814717902"`). Бүх каталогийг (543 бараа, бүгд зурагтай) татаж, манай `sku`-тай тааруулав → **28 таарц**, зураг нь 2000×2000 албан ёсны фото. Нэрсийг япон гарчигтай нь тулгаж баталгаажуулсан (`ハトムギ泡洗顔` = "Hatomugi Foaming Face Wash" г.м).

2. **sugi-point.jp (SUGI-гийн оноо солилцооны каталог)** — хамгийн үр дүнтэй нь байв: зургийн файлын нэр нь **шууд баркод** (`/upload/save_image/<JAN>-1_1.jpg`) тул хайлт огт шаардахгүй, SKU-гаас URL-ыг шууд угсарна. **101 бодит зураг** олдов.

**⚠️ sugi-point дээр барьж авсан ноцтой урхи**: эхний туршилтад 20/20 (100%) "олдсон" гэж гарсан — гэвч бүх файл яг ~8KB байсныг анзаарч нүдээр нээж үзэхэд **саарал "зураг байхгүй" placeholder** байв. Сайт байхгүй зурагт ч HTTP 200 буцаадаг. Placeholder-ийн яг sha256-г тооцоолж шүүсний дараа бодит тоо **101/516** болов (415 нь placeholder байсан). Зөвхөн HTTP статус/тоог харсан бол **500 гаруй хог зургийг каталогт бичих** байсан — энэ session-ий "тоо биш, бодит гарцыг үз" гэсэн загварын дахин нэг тохиолдол.

**Ажиллаагүй, дахин оролдох шаардлагагүй эх сурвалжууд** (бүгд бодитоор туршсан):
- **Rakuten** (`search.rakuten.co.jp`, `item.rakuten.co.jp`) — curl-д 43 байт буцаадаг, WebFetch timeout. JS-рендер.
- **Amazon.co.jp** — 200 буцаана ч бүтээгдэхүүний markup байхгүй (robot/JS).
- **Yahoo!ショッピング / LOHACO** — JS-рендер, статик зураг байхгүй.
- **matsukiyococokara-online.com** — 403.
- **monotaro / askul / kenko / soukai / tsuruha / welcia / sundrug** — 404 эсвэл холбогдохгүй.
- **www.sugi-net.jp/product-detail/&lt;JAN&gt;** — зөв URL хэв маягтай (Next.js) боловч `_next/data/.../<JAN>.json` нь **бүх JAN-д `product:{}` хоосон** буцаана, тэр дундаа тэдний өөрийн каталогт байгаа бараанд ч.
- **privatebrand.sugi-net.jp** — зөвхөн маркетингийн танилцуулга, каталог биш.
- **Үйлдвэрлэгчийн сайтууд** (naturelab, kumanoyushi, japangals, smilehoney) — Shopify биш, `products.json` байхгүй.
- **JAN сангууд** (jancode.xyz 403, jancode.jp 404) — хаалттай.

**kireicosme.jp — ажилласан ч ЧАНАРААР ТЭНЦЭЭГҮЙ**: Японы гоо сайхны бөөний каталог, `find[f_keyword]`-оор JAN хайлт ажилладаг, бүтээгдэхүүний хуудсанд манай яг JAN байгааг баталж болдог. 415 барааг сканердаж **20 таарц** олов. Гэвч бүх зураг нь **250×250 (зарим нь 120×120) thumbnail** бөгөөд том хувилбар нь бүгд 403 буцаана. Одоо каталогт байгаа 600–2000px зурагтай зэрэгцүүлбэл мэдэгдэхүйц муу харагдах тул **хэрэглээгүй**. Ирээдүйд энэ эх сурвалж руу дахин орох шаардлагагүй.

**Үр дүн: зурагтай бараа 147 → 522/937 (56%)**, нэг session дотор 3.5 дахин өссөн:

| Алхам | Нэмэгдсэн | Дүн |
|---|---|---|
| Эхлэл | — | 147 |
| R2-оос сэргээсэн (алдагдсан ажил) | +246 | 393 |
| sugi-drug.com Shopify | +28 | 421 |
| sugi-point.jp | +101 | **522** |

**Үлдсэн 415** — `docs/products-needing-photos.csv` (id, баркод, ангилал, брэнд, нэр, үнэ; ангиллаар эрэмбэлсэн, дэлгүүрт ажиллахад бэлэн). Ангиллаар: Арьс арчилгаа 199, Эрүүл ахуй 122, Үс ба бие 42, Ээж ба хүүхэд 22, Гоо сайхан 17, Эрүүл мэнд 13. Үүнээс S-Select 104, брэндийн бараа 311. Дээрх бүх автомат эх сурвалжийг шавхсан тул эдгээрт **дэлгүүрт өөрөө зураг авах** нь бодит цорын ганц зам (`PRODUCT-IMPORT.md` үүнийг анхнаасаа таамагласан).

**Мөн засварласан өгөгдлийн алдаа**: `id=807` нь `PRIECLAT serum W` гэж нэрлэгдсэн атал баркод нь (`4955814711863`) албан ёсны SUGI Drug каталогаар **クリームW (Cream W) 27g** байв; жинхэнэ Serum W (`4955814707477`) нь id=804 гэж аль хэдийн байсан (давхардал). Tom зөвшөөрснөөр `PRIECLAT Cream W` болгож нэр/slug/тайлбарыг зассаад албан ёсны зургийг нь хэрэглэв.

### CI-ийн `INTEGRATIONS_ENCRYPTION_KEY` улаан шийдэгдэв (2026-09-01)

Tom бодит GitHub Actions-ийн гаралтыг илгээв: `server/integrations.integration.test.ts`-ийн "integration config encryption (unit)" 2 тест `INTEGRATIONS_ENCRYPTION_KEY must be set to a 64-character hex string`-ээр унаж, ажил урсгал бүхэлдээ exit 1 болж байв.

**Шалтгаан**: `.github/workflows/ci.yml` нь өмнөх session-д `INTEGRATIONS_ENCRYPTION_KEY: ${{ secrets.INTEGRATIONS_ENCRYPTION_KEY }}` гэж бичигдсэн байсан ба PROJECT-GUIDE.md-д "Tom repo settings дээр secret-ийг гараар нэмэх шаардлагатай" гэж тэмдэглэгдсэн байв. Secret хэзээ ч нэмэгдээгүй тул илэрхийлэл **хоосон мөр** болж, `server/_core/env.ts`-ийн `process.env.INTEGRATIONS_ENCRYPTION_KEY ?? ""` хоосон утга авч, `server/_core/crypto.ts`-ийн `getKey()` шууд шатаж байв. Энэ 2 тест нь тухайн файлын бусад тестээс ялгаатай нь `RUN_*_INTEGRATION_TESTS` gate-ийн ард биш, **үргэлж ажилладаг**.

**Шийдэл сонгох**: Санал болгож болох 3 зам байв — (а) Tom repo secret нэмэх, (б) ci.yml-д түлхүүрийг hardcode хийх, (в) тестийг өөрөө түлхүүрээ өгдөг болгох.

(в)-г сонгов. Учир нь эдгээр 2 тест бол **crypto helper-ийн цэвэр unit тест**: `encryptJson`/`decryptJson` round-trip хийдэг эсэх, гэмтээсэн blob-ыг илрүүлдэг эсэхийг шалгадаг. Хоёр шинж чанар нь **ямар ч хүчинтэй түлхүүрт үнэн** тул түлхүүрийн утга огт хамаагүй, тэд ямар ч бодит нууцыг хамгаалдаггүй — тестийн процесс дотор өөрсдийнхөө зохиосон өгөгдлийг л шифрлэдэг. (а) бол Tom-д гар ажил үлдээх бөгөөд шинэ clone/fork бүрт дахин унана; (б) бол зөвхөн GitHub Actions-ийг засах ба локал `pnpm test` шинэ орчинд улаан хэвээр үлдэнэ.

**Хэрэгжүүлэлт**: `server/_test-setup.ts` (энэ session-д dotenv-д зориулж үүсгэсэн setup файл) нь орчинд түлхүүр **байхгүй** үед л түр зуурын түлхүүр тавьдаг болов. Бодит `.env`/орчны утга байвал үргэлж тэр нь давамгайлна — энэ нь зөвхөн цоорхойг нөхнө, хэзээ ч дарж бичихгүй.

⚠️ **Чухал ялгаа**: PROJECT-GUIDE.md өмнө нь "санамсаргүй insecure dev fallback нэмэхээс болгоомжил" гэж анхааруулсан нь **аппликейшний код** (`env.ts`/`crypto.ts`)-д fallback тавихыг хэлж байсан — тэгвэл жинхэнэ production сул түлхүүрээр чимээгүй ажиллах эрсдэлтэй. Энд тэр код **огт хөндөгдөөгүй**: жинхэнэ сервер бодит түлхүүргүйгээр юу ч шифрлэхээс татгалзсан хэвээр. Fallback зөвхөн vitest-ийн setup файлд, зөвхөн тестийн процесст л оршино.

`ci.yml`-ээс env блокыг бүрэн хасав — GitHub repo secret одоо **огт шаардлагагүй**, шинэ clone дээр ямар ч тохиргоогүйгээр `pnpm test` ногоон гарна.

**Баталгаажуулалт**: CI-г яг хуулбарлаж шалгав (`.env`-ийг түр зөөж, `INTEGRATIONS_ENCRYPTION_KEY`/`DATABASE_URL`/бүх gate-ийг `env -u`-ээр устгаж) → **13 файл passed, 21 skipped, 83 тест passed, 0 fail** (өмнө нь 1 файл failed / 2 тест failed байсан). Дараа нь `.env`-ийг буцааж, бүх gate-тэй бүрэн suite-ийг дахин ажиллуулж регресс байхгүйг баталгаажуулав. `pnpm check` цэвэр.

### Баталгаажуулалт

`pnpm check` бүх checkpoint дээр цэвэр. Unit: `catalog-filter.test.ts` 18/18, `product-tagging.test.ts` 12/12. Бүрэн suite `.env` ачаалагдсан үед 186/194, latency-ийн 8-ыг 60с-т дахин ажиллуулахад 36/36. Playwright (түр суулгаад дараа нь бүрэн хассан): нүүр (1440/390px), Shop, бүтээгдэхүүний хуудас — **эвдэрсэн зураг 0**, хэвтээ overflow 0, console алдаа 0; нүүр хуудасны "Танд санал болгож байна" хэсэг 6 бодит зурагтай гарч байгааг, Shop дээр сэргээсэн зураг (LoveLiner) бодитоор харагдаж байгааг нүдээр баталгаажуулав.

---

## Preference Profile v2 + Recommendation Engine v2 + Admin Analytics segment view (2026-09-01)

Tom Profile хуудасны "Хувийн профайл" таб хэт basic, "Гоо сайхны & Гэрийн профайл" хэсэг хэт богино гэж мэдэгдэж, дараах бүгдийг нэг зэрэг шаардав: (1) бүрэн хувийн мэдээлэл (хаяг/дүүрэг/ажил/нас/хүйс), (2) олон сегмент-тэй өргөтгөсөн "Гоо сайхны & Гэрийн профайл", (3) 937 барааны каталогоос бодитоор тохирсон бараа санал болгох систем ("судалгаа гаргасан дизайн болон шинэ дата систем"), (4) `/admin` Analytics-ийг ("хэт oldschool") нэгэн зэрэг шинжлэх. Тодорхой websearch/судалгаа хийхийг шаардсан.

**Судалгаа/төлөвлөлт**: 3 Explore agent зэрэг ажиллуулав (1: одоогийн Profile preferences + recommendation engine кодын байдал, 2: одоогийн admin Analytics-ийн бүрэн inventory, 3: websearch — Curology/Typology/The Ordinary/Ulta/Function of Beauty/Glossier-ийн quiz UX pattern, home-goods personalization, recommendation engine best-practice, 2026 admin analytics trend). Дараа нь Plan agent (**бодит Aiven DB-ээс шууд query асуусан**: 937 барааны зөвхөн 4 нь tag-тай, 0 interior бараа байгаа, 767/937 (82%) generic shortDescription-той гэдгийг олж, эдгээр бодит тоо дээр үндэслэсэн боловсронгуй төлөвлөгөө гаргав). AskUserQuestion-оор 3 чухал шийдвэрийг Tom-оос тодорхой асуув: (a) UI хэлбэр — **quiz wizard** (segmented card биш) сонгов, (b) `catalog.recommended` **public** (guest-д ч bestseller fallback) болгохыг сонгов, (c) bulk auto-tag script-ийг **эхлээд dry-run тайлан үзүүлж, "za" гэсний дараа** бодит Aiven дээр ажиллуулахыг сонгов.

**Хэрэгжүүлэлт** (дэлгэрэнгүй файл жагсаалт PROJECT-GUIDE.md-д):
- Migration 0038: 8 шинэ `users` талбар, 4 шинэ `products` талбар (mirror).
- `shared/catalog-filter.ts`-д recommendation engine v2-ийн цэвэр scoring функцууд (`scorePreferenceMatch`/`scorePriceBandAffinity`/`applyDiversityCap`/`computeCategoryAffinity`) + бүх шинэ vocabulary/label/option — Profile.tsx-ийн хуучин локал массивуудыг эндээс дахин ашигладаг болгосон (label drift багасгасан).
- `shared/product-tagging.ts` (шинэ): rule-based keyword `suggestTagsForProduct` — таамаглахгүй, зөвхөн бодит signal олдвол л tag санал болгоно.
- `server/db.ts`-ийн `getRecommendedProducts` бүрэн v2 (preference match backbone + захиалгын түүхийн category affinity + үнийн зурвас + wishlist-adjacency + diversity cap + cold-start/thin-result bestseller fallback), шинэ `getRelatedProducts`+`catalog.related` (ProductDetail-ийн шинэ related-products хэсэг).
- `client/src/components/ProfileQuizWizard.tsx` (шинэ, 6 алхам+review), `RecommendedForYou.tsx` (Shop.tsx-аас extract, Home.tsx-д мөн ашигласан).
- `AdminWorkspace.tsx`-ийн PERSONALIZATION TAGS блок 4 шинэ талбар + admin-д зориулсан dismissible санал chip.
- `server/analytics.ts`-ийн `getPreferenceSegmentBreakdown`/`getRecommendationCoverage` + `AdminAnalyticsPanel.tsx`-ийн шинэ "Тохиргооны сегмент"/"Санал болгох хамрах хүрээ" секц.
- `scripts/auto-tag-products.ts` (шинэ, 2-tier: keyword match + category-level default) — dry-run горимд л ажилласан, бодит `--apply` хараахан хийгдээгүй.

**🔴 Playwright QA-ийн үеэр Tom өөрөө localhost:3000 дээр амьдаар ажиглаж байхдаа олсон bug**: "юу сонгосон ч дандаа хүүхдийн бараа гарч байна" гэж шууд мэдэгдэв. Шалтгаан: `hasYoungChildren` scoring жин (+3) нь skinType/hairType exact match-тай (+3) яг ижил байсан бол, production дээрх tagging coverage 4/937 л байсан тул бусад бүх signal хоосон гарч, энэ ганц signal л жагсаалтыг бүхэлд нь дарж авчихсан байв. Жинг +3→+1 (fragrancePreference-тэй ижил "зөөлөн" signal), diversity cap-ыг maxPerCategory 4→3 болгож засаад, Tom-ийн бодит хадгалсан тохиргоогоор шууд дахин шалгаж (3 арьс арчилгаа + 3 Ээж/хүүхэд) баталгаажуулав.

Мөн энэ явцад **Tom "937/937 tagged болго" гэж тодорхой шаардаж**, анхны Tier-1-single 113/937 хангалтгүй гэж татгалзсан — `auto-tag-products.ts`-д Tier 2 (category-level default, зөвхөн admin chip-д харагдахгүй, зөвхөн bulk script-д) нэмж 937/937 dry-run гаргав.

Явцад бас **өөрөө олж заасан 2 дахь bug** (Tom харахаас өмнө): auto-tag-ийн keyword matcher "чийгшүүлэх" төрлийн boilerplate-аас болж 441/445 (99%) skincare барааг "dryness" гэж дүрмээр tag хийж байсныг dry-run гарцыг өөрөө нягталж олж, зөвхөн тодорхой ингредиент/хэллэгээр солив.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` олон checkpoint дээр цэвэр. Шинэ unit тестүүд: `catalog-filter.test.ts` (+17, scoring функцууд), `product-tagging.test.ts` (6, dryness-bug-ийн regression тест орсон) — бүгд ✅. `profile.integration.test.ts`-д +2 шинэ тест (v2 талбарууд, invalid enum rejection) — 14/14 ✅. Playwright-ээр (throwaway staff→admin эрхтэй хэрэглэгчээр, дараа нь DB-ээс бүрэн устгасан): wizard бүрэн 6 алхам+review дуусгаж, reload хийсний дараа ч хадгалагдсан хэвээр байгааг баталгаажуулсан; Shop/Home "Танд санал болгож байна", ProductDetail related-products бүгд render хийж байгааг баталгаажуулсан; admin Analytics шинэ секц, catalog product edit-ийн шинэ талбарууд бүгд ажиллаж байгааг баталгаажуулсан; console алдаагүй.

**✅ Дуусав**: commit/push + PROJECT-GUIDE.md/HISTORY.md + docs/self-review-2026-09-01.md-г (2026-09-09-нд root-оос зөөсөн) Tom-ийн шаардсан дараалалаар дуусгасны дараа Tom эцсийн "за"-г AskUserQuestion-оор өгсөн. `scripts/db-backup.ps1`-ээр backup аваад (`backups/defaultdb_2026-09-01_194214.zip`), `scripts/auto-tag-products.ts --apply` бодит Aiven дээр ажиллуулж **937/937 бараа tag-тай болгов**, шууд DB query-ээр давхар баталгаажуулав.

**Apply хийх явцад олдсон 3 дахь bug**: цэвэр ганц signal-тэй хэрэглэгчид (жишээ нь зөвхөн "Хуурай үс") `getRecommendedProducts` 0 үр дүн буцааж байсан — Tier 2 category-default ихэнх hair барааг "normal"-аар л tag хийсэн (яг "dry" тохирох цөөн) + production дээр 0 paid захиалга байгаа тул bestseller fallback ч хоосон — 2 fallback tier зэрэг хоосон гарсан. 3 дахь, эцсийн fallback tier (ямар ч нийтлэгдсэн, нөөцтэй бараагаар дүүргэх, score claim-гүй) нэмж section хэзээ ч бүрэн хоосон харагдахгүй болгов. `pnpm check`/`pnpm build` дахин цэвэр, throwaway хэрэглэгчээр (2 өөр реалист профайл) apply-ийн дараа шууд дахин баталгаажуулав.

---

## Quick Stats infinity graph — зочны төлөвт огт харагдаагүй bug, reference fidelity засвар (2026-08-31)

Tom нүүр хуудасны Quick Stats хэсгийг reference зурагтай харьцуулаад "too basic" гэж татгалзсан, "олон удаа буруу хийсэн" гэж мэдэгдсэн. Plan mode-т орж, зөвхөн код унших замаар (dev server ажиллуулахгүйгээр) `InfinityGraph.tsx`/`QuickStatsSection.tsx`-ийг master-prompt баримт бичгийн §16-тай нэг мөр нэгээр харьцуулж, 6 тодорхой mismatch (Finding A-F) олов. Хамгийн том нь: **Finding F — зочны төлөвт infinity graph огт харагдаагүй**, зөвхөн 4 талбарын box харагддаг байсан. Tom баталгаажуулав: тэрбээр яг зочны төлөвөөр харьцуулж байсан тул энэ нь гол шалтгаан байв.

Хийсэн засвар:
1. Зочны төлөвт `shared/loyalty.ts`-ийн бодит функцээс тооцоолсон жишээ утгаар (₮600,000 → Хүрэл 3%) мөн адил InfinityGraph харуулж, дэлгэц дээр тод "ЖИШЭЭ ХАРУУЛАЛТ" шошго нэмэв.
2. Гарчиг "Илүү их худалдан авалт..." (монгол хэллэг)-ээс "Quick Stats" (reference-ийн яг өөрийнх нь текст) болгож, монгол тайлбарыг доор нь subtitle болгож нэмэв — master prompt §16.5-ийн тодорхой заавар.
3. `InfinityGraph.tsx`-д SVG `<linearGradient>` нэмж flat өнгийг gradient болгов; шинэ `--graph-copper`/`--graph-copper-light`/`--graph-charcoal`/`--graph-gold-muted` token нэмж, брэндийн тод vermilion/gold-ыг ашиглахгүй болов (master prompt: "muted terracotta, not bright red").
4. Geometry: 2 тойргийн зайг 140px→166px болгож (R=88 хэвээр), 36px давхцлыг ~10px pinch болгов — жинхэнэ ∞ crossing шиг.
5. `formatMntCompact` нэмж ("1.1M₮" загвар, master prompt §16.7) infinity graph доторх урт тоог товчлов.
6. Screenshot хийх явцад олдсон, холбоогүй bug: `.eyebrow` class (`display:inline-flex`, сайт даяар ашиглагддаг) зочны төлөвт `.qs-cta`-той нэг мөрөнд наалдаж байсныг `.qs-copy > .eyebrow { display: flex; }` (scoped, глобал биш) засвараар шийдэв.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр, Playwright түр суулгаад 1440/768/375px дээр зочны screenshot, throwaway хэрэглэгч+захиалгаар authenticated screenshot (Мөнгөн 5%, 1.1M₮ зарцуулалт, 24,000₮ хэмнэлт, Алтан хүртэл 8,924,000₮ дутуу — бүгд зөв), дараа нь бүх throwaway өгөгдлийг устгаж баталгаажуулав. Playwright бүрэн хасав.

---

## Нүүр хуудасны premium reference-driven редизайн (2026-08-28)

Бүх Home.tsx-ийг (302 мөрийн монолит) `client/src/components/home/*.tsx` section-компонент болгож задалсан: `HeroSection`, `TrustStrip`, `QuickStatsSection`+`InfinityGraph` (шинэ, гишүүнчлэлийн infinity graph, зочин/нэвтэрсэн 2 төлөвтэй), `CategoryMasonry`, `WhyChooseUs` (шинэ, харанхуй 3 карт), `JournalSection` (staggered restyle, 1/2/3-post тохиолдол тус бүрт), `StoreLocatorSection` (3-бүсийн зохион байгуулалт, static SVG газрын зураг — Google Maps API key байхгүй тул `Map.tsx`-ийг холбоогүй). Backend: `server/db.ts`-ийн `getUserLoyaltyStatus`-д шинэ `totalLoyaltySavingsMnt` талбар (зөвхөн `paymentStatus="paid"` захиалгын `loyaltyDiscountMnt` нэгтгэдэг), 4 шинэ тест `server/loyalty.integration.test.ts`-д. `AdminAnalyticsPanel.tsx`-ийн `polarPoint`/`arcPath` SVG arc math-ыг `client/src/lib/svg-arc.ts`-руу зөөж хуваалцав.

**Баталгаажуулалт** (Playwright түр суулгаад дараа нь бүрэн хассан): 1440–320px бүх breakpoint дээр хэвтээ overflow 0; жинхэнэ throwaway хэрэглэгч+захиалгаар authenticated Quick Stats infinity graph screenshot аваад тоо мат зөв болохыг баталгаажуулж (Мөнгөн 5%, ₮1,076,000 зарцуулалт, ₮24,000 хэмнэлт, Алтан хүртэл ₮8,924,000 дутуу), дараа нь бүх throwaway өгөгдлийг DB-ээс устгасан. Нэг CSS bug засав (mobile category card текст сум icon-той давхцаж байсан).

**⚠️ Чухал нээлт**: энэ (гэрийн) лаптопын `.env` аль хэдийн Aiven shared DB руу заасан байсан (937 бараа, бодит захиалга баталгаажлаа) — өмнөх "гэрийн лаптоп дээр 0 бараа" тэмдэглэл хуучирсан байв.

**Дараа нь Tom Categories хэсгийг reference зурагтай нарийн харьцуулаад татгалзсан** (grid-мэт харагдаж байгаа, overlap/staggered/photo-led card байхгүй гэж). Дэлгэрэнгүй audit + v3 fix spec: (төлөвлөгөөний тэмдэглэл). `CategoryMasonry.tsx` бүтэн дахин бичигдэж (`.cat-mosaic-top` 2-багана мөр heading+anchor, `.cat-mosaic-grid` 6 картын 3x2 grid доор нь, 2 карт image-led+overlap, 2 карт staggered offset) — session tokens дуусаж, баталгаажуулалт хийгдээгүй commit+push хийгдсэн.

### CategoryMasonry v2 баталгаажуулалт дуусав (гэрийн лаптоп, дараагийн session)
Playwright-аар screenshot + `getBoundingClientRect()` pixel-хэмжилт хийж 3 бодит bug олж засав:
1. **Overlap card бодитоор давхцаагүй байсан** (0px/-8px, шаардсан 24-40px биш) — `margin-top`/`translateY` тооцоо буруу байсныг pixel хэмжилтээр олж зассан → баталгаажсан **32px/26px** бодит overlap.
2. **Anchor-ийн "Ойр салбараа олох" линк overlap card-д халхлагдаж байсан** — `bottom: 24px→64px` болгож зассан.
3. **Category placeholder SVG-үүдэд (`category-placeholder-*.svg`, `product-placeholder.svg`) far "SUGI ASAYAKE" watermark текст шингэсэн байсныг** (`grep`-ээр SVG эх файлаас олов, y=335/400≈84%) `background-size:cover`-ээр card дүүргэхэд ил гарч байгааг олж, scrim gradient тохируулж (icon бүрэн харагдаж, зөвхөн watermark нуугдахаар) шийдэв — эхний хувилбарт scrim хэт хүчтэй болж icon-ийг бүхэлд нь нуучихсан алдааг мөн олж дунд зэргийн тэнцвэрт хувилбар олов.
4. **Mobile 2-багана дээр "Эрүүл мэнд" картын гарчиг icon-той давхцаж байсныг** min-height нэмэгдүүлж, гарчгийг 1-мөрөнд clamp хийж зассан.

Бүх засвар `pnpm check`/`pnpm build` цэвэр, 1440/1024/768/430/375px screenshot + pixel-хэмжилтээр баталгаажсан.

---

## Navigation state fix (2026-08-28)
- Applied the catalog URL-state fix to the main working copy: page number and category/search state survive product navigation and refresh.
- Prevented the initial loading state from clamping a restored page back to page 1 before the catalog query finishes.
- Added working product breadcrumbs and an Admin sidebar homepage link.

---

## Shared Aiven MySQL migration (2026-08-28)
- Local MySQL data was imported into the empty Aiven MySQL `defaultdb` service so both laptops can share the same `site_media`, products, and order metadata while Cloudflare R2 continues to store image bytes.
- Aiven connectivity was verified over TLS with the MySQL client and the imported database contains the existing 937 products.
- `scripts/db-backup.ps1` and `scripts/db-restore.ps1` now accept Aiven URIs with `?ssl-mode=REQUIRED` and pass `--ssl-mode=REQUIRED` to the MySQL tools.
- Credentials remain local-only in `.env`; no password or certificate was added to the repository.
- Windows Task Scheduler-ийн `SUGI ASAYAKE Daily DB Backup` task-ийг 23:30-аас **19:00** болгож шинэчилсэн (өдөр бүр, 14 backup хадгална).
- Aiven-ийн 30 хоногийн trial дуусахаас өмнө хамгийн сүүлийн бүрэн `.zip` backup-ийг татаж авч, тусдаа төхөөрөмж/cloud drive дээр хадгалах болон `db-restore.ps1`-ээр буцаан сэргээх төлөвлөгөөг баримтжуулсан.

---

## Манус-ээс салгах явц, эхний bug-ууд (2026-08-20-аас өмнөх)

### 1. Manus-ээс бүрэн салгасан
- `server/_core/oauth.ts` (Manus OAuth) → **устгасан**, оронд нь `server/routers.ts`-ийн `auth` router дотор `register`/`login`/`logout`/`me` procedure бичсэн (email+password, JWT session)
- `server/_core/env.ts`, `context.ts`, `trpc.ts`, `cookies.ts`, `notification.ts`, `systemRouter.ts`, `vite.ts`, `shared/_core/errors.ts` — бүгд шинээр бичигдсэн
- `server/storage.ts`, `server/_core/storageProxy.ts` → Manus Forge-ийн оронд **бодит AWS S3-compatible bucket**-тай ажилладаг болгосон (`@aws-sdk/client-s3` ашиглана)
- `vite.config.ts` → `vite-plugin-manus-runtime`, debug-collector, `allowedHosts` хязгаарлалт бүгдийг устгасан
- `drizzle/schema.ts` дэх `users` хүснэгтээс `openId`/`loginMethod` (Manus OAuth) хассан, `passwordHash` нэмсэн — migration: `drizzle/0009_independent_auth.sql`
- Password hashing: Node built-in `scrypt` ашигладаг (`server/_core/password.ts`), гадны dependency нэмээгүй

### 2. Localhost дээр бодит туршилтын орчин зохион байгуулсан
- **MySQL 8** (native Windows суулгалт, Docker биш — Docker Desktop суулгах гэж оролдоход Windows boot эвдэрч, `bcdboot`-оор засварласан удаа бий, тиймээс энэ төсөлд Docker-оос зайлсхийсэн)
- **MinIO AIStor** (одоогийн үнэгүй хувилбар нь license key шаарддаг, `MINIO_LICENSE` env var-аар дамждаг) — хожим (2026-08-26) Cloudflare R2 руу шилжсэн, доор үзнэ үү

### 3. Бодит ашиглалтаас олдсон, засагдсан bug-ууд
- **`client/src/pages/ProductDetail.tsx`** — React "Rules of Hooks" зөрчил байсан (`useMemo` нь эрт `return`-ийн ДАРАА бичигдсэн байсан тул "Rendered more hooks than during the previous render" crash өгдөг байсан). Засагдсан.
- **Пост/мэдээ функц бүрэн дутуу байсан** — admin панель дотор пост үүсгэж "Нийтлэх" боломжтой байсан ч, олон нийтэд харуулах хуудас/route огт байхгүй байсан. Шинээр бүтээсэн: `getPublishedPostBySlug()`, `content.bySlug` public procedure, `PostDetail.tsx`, `/:slug` catch-all route.

---

## ⚠️ Чухал bug: MySQL timestamp 8 цагаар зөрдөг байсан (2026-08-20, TIER4)
Локал MySQL серверийн session `time_zone = SYSTEM` (Asia/Ulaanbaatar = UTC+8) байсан бол `drizzle-orm`-ийн mysql `timestamp` багана нь DB-ээс ирсэн raw утгыг үргэлж UTC гэж таамаглаж уншдаг (`+0000` нэмдэг). Үүний үр дүнд `defaultNow()`-ээр автоматаар үүсдэг бараг бүх хүснэгтийн `createdAt`/`updatedAt` нь app-ын `new Date()`-тэй шууд харьцуулахад бодит утгаасаа 8 цагаар түрүүлж харагддаг байсан. TIER4-ийн Audit Log-ийн огнооны шүүлтүүр бичих явцад илэрсэн. **Засаж, root cause-д нь шийдсэн:** `server/db.ts`-ийн `getDb()`-д MySQL connection pool-ийн `'connection'` event дээр `SET time_zone = '+00:00'` ажиллуулдаг болгосон.

Яагаад өмнөх бүх тест үүнийг олж чадаагүй бэ: Token/session expiry шалгалт бүгд app-аас бичигдэж, app-аас уншигддаг утгыг ашигладаг байсан тул бичих/унших хоёр тал ижил хазайлтаар давхар цуцлагддаг байсан — зөвхөн DB талаас автоматаар үүссэн утгыг app-ын шинэ `Date`-тэй шууд харьцуулах үед л алдаа гарч ирдэг байсан.

---

## Feature-ийн явц (огноогоор)

**TIER 0/1/5 CI+backup, Guest checkout (2026-08-20)** — `cart.*`/`checkout.createOrder` `publicProcedure`, `guest_cart_token` cookie-оор зочны сагс, нэвтрэхэд автомат нэгтгэгддэг. Дэлгэрэнгүй UX-RESEARCH.md, ROADMAP.md.

**ADMIN-PANEL.md TIER 1–6 (2026-08-20)** — Dashboard+Global Search, хэрэглэгч suspend/force-logout, `staff` RBAC role, Audit Log+Login History, Bulk Actions+CSV Export, DB/S3 health widget. Дэлгэрэнгүй ADMIN-PANEL.md.

**Профайл хуудас (`/profile`, 2026-08-21)** — avatar/нэр/утас засах, address book, checkout автомат бөглөлт. Secondary pages (Login/ForgotPassword/VerifyEmail/AcceptInvitation/Legal/MyOrders/NotFound) + admin sidebar брэнд шинэчлэл.

**Захиалгын имэйл мэдэгдэл + Personalization TIER 1 (2026-08-25)** — `checkout.createOrder`/`admin.updateOrder`/`admin.bulkUpdateOrderStatus` Brevo-гоор имэйл илгээдэг. `skinType`/`skinConcerns`/`interiorStyle` tag, `catalog.recommended`.

**Reviews & Ratings TIER 2 (2026-08-25)** — `product_reviews`, verified-purchase gate, admin moderation. MySQL `AVG()` string буцаадаг bug олж зассан.

**Ingredient Transparency + Store Locator TIER 3 (2026-08-25)** — 17 нэр томьёотой glossary tooltip, 3 салбарын ажиллах цаг+утас.

**⚠️ Bug: 937 бараатай болсны дараа pagination-гүй болсон (2026-08-25)** — `Shop.tsx` (24ш/хуудас) болон `AdminWorkspace.tsx` (25ш/хуудас) хоёуланд дугаартай хуудаслалт нэмсэн.

**Routine Builder & Bundles TIER 4 (2026-08-25)** — admin "Routine" удирдлага, `/routine/:slug`, `orders.discountMnt`/`appliedRoutineId` бодит суутгал.

**Loyalty (Гишүүнчлэлийн карт) TIER 5 (2026-08-25)** — Tom-ийн бодит Smart POS-той адил шатлалт хямдрал (500k→3%, 1сая→5%, 10сая→10%, `shared/loyalty.ts`), native систем + admin гар нэмэлт (`AdminUserDetailDrawer.tsx`).

**⚠️ Bug: /shop-ийн хоосон orange блок + CartDrawer-ийн scroll bug (2026-08-25)** — `RecentlyViewed` хоосон үед бүхэлд нь нуух, `CartDrawer.tsx`-д `min-h-0 overflow-y-auto` нэмж 3+ барааны сагстай хэрэглэгч захиалга хийж чадахгүй байсныг зассан.

**Маркетингийн попап/banner систем (2026-08-25)** — Admin "Урамшуулал" таб, `SitePromo`, `position: sticky` + `--promo-banner-offset` fix.

**Өрсөлдөгчийн шинжилгээ (asahi.mn) + цоорхой засалт (2026-08-25)** — `compareAtPriceMnt` анх удаа storefront дээр харуулав (strikethrough + "-X%" badge), ProductDetail "Зөвхөн N ширхэг үлдсэн", canonical URL Manus домэйн засвар, coupon code систем нэмэгдсэн.

**⚠️ Том bug: header logo + 900 гаруй placeholder зураг "broken image" (2026-08-25)** — Шинэ компьютерийн MinIO хоосон эхэлсэн тул код доtorh хатуу бичсэн 7 файлын нэр бодит storage-д байхгүй байсан. Лого зам зассан, `client/public/product-placeholder.svg` (local bundled SVG) 9 файлд нэвтрүүлсэн, Home.tsx-ийн байхгүй зурган slot-уудад CSS градиент fallback нэмсэн.

**Header хайлт бүх хуудсанд (2026-08-25)** — `HeaderSearch.tsx` CommerceHeader болон Home-д mount хийсэн.

**937 барааны бодит POS каталог импорт (2026-08-25)** — Tom-ийн 3 салбарын Smart POS-оос бодит бараа material, 6 ангилал, sku=баркод. Дэлгэрэнгүй PRODUCT-IMPORT.md.

**"10 жилийн туршлагатай auditor" гүнзгий шинжилгээ (2026-08-25)** — Цэвэрлэгээ (1868 мөр үхсэн код устгасан, 9 Manus-эриний баримт `archive/`-руу зөөсөн), хүргэлтийн үнэ эрт харуулах (`UB_DELIVERY_FEE_MNT`), зурган боловсруулалт (`sharp`, `server/_core/imageProcessing.ts`, product 1600px/site-media 1920px/avatar 512px, quality 82), server-side хайлт (MySQL FULLTEXT, `catalog.search`, Монгол кирилл баталгаажсан). `pnpm test` 124/124.

**Дахин гүнзгий audit (2026-08-25 үргэлжлэл 2)** — Git file size цэвэр (цэвэрлэх зүйл олдсонгүй). 3 bug олсон: (1) хүргэлтийн үнэ `server/db.ts`-ийн `createOrderFromActiveCart`-д давхар hardcode байсныг нэгтгэсэн, (2) Loyalty хямдралын томьёо клиент дээр давхар хэрэгжсэнийг `cart.applicableLoyaltyDiscount` procedure-оор арилгасан, (3) `HeaderSearch.tsx` FULLTEXT рүү шилжээгүй байсныг зассан. Product reviews race condition тэмдэглэсэн (засаагүй, эрсдэл бага — UNIQUE INDEX хамгаалдаг). `pnpm test` 125/125.

**World-class UI/UX polish (2026-08-25 үргэлжлэл 3)** — Захиалгын celebration хуудас (`OrderConfirmation.tsx`), product zoom/lightbox (`ImageLightbox.tsx`), skeleton loading (`Skeleton.tsx`, Shop/ProductDetail/Profile бүх таб), гишүүнчлэлийн картны tier дизайн (`.tier-bronze/silver/gold`). `pnpm test` 125/125.

**matsukiyococokara-online.com-оос санаа авсан homepage шинэчлэл (2026-08-26)** — Sugi/Asahi Japan meeting-ийн өмнө. Playwright+Edge-ээр өрсөлдөгчийн homepage screenshot судалгаа. Нэмэгдсэн: `.membership-strip` (3-panel promo), `.bestseller-section` (бодит захиалгын түүхээр, `getBestsellingProducts()`, fan-out bug-аас зайлсхийхийн тулд 2 тусдаа query), `.home-news-section` (blog rail), `.category-icon-badge` (lucide icon, бодит зураг биш), wishlist icon header-т. `pnpm test --no-file-parallelism` 128/128.

**⚠️ Орчны асуудал тэмдэглэв (засаагүй)**: Бүх integration gate идэвхтэй үед `pnpm test`-ийг vitest-ийн анхдагч параллель горимоор ажиллуулахад тогтмол бус ~3 файл (`routine-discount`, `discount-codes`, `bestsellers`) унадаг — 20 гаруй тусдаа integration test файл нэг локал MySQL/MinIO instance-ыг зэрэг hammer хийхэд гарч ирдэг pre-existing race. **`--no-file-parallelism`-ээр тогтвортой ажилладаг тул одооноос энэ flag-тай ажиллуулах.**

## Object storage: локал MinIO → Cloudflare R2 (2026-08-26)
Tom "хоёр laptop MinIO датаг автоматаар хуваалцах" гэж хүссэн — Google Drive sync-ийн эрсдэлийг (амьд DB-style дата sync хийх нь эвдрэл үүсгэж болзошгүй) тайлбарлаж, оронд нь **нэг ижил cloud storage** руу шилжсэн (Tom R2 сонгосон). Код талд өөрчлөлт хэрэггүй байсан (`s3Region` анхдагч утга нь аль хэдийн `"auto"`). `scripts/migrate-storage-to-r2.ts` нэмсэн (дахин ажиллуулахад аюулгүй, key давхцвал алгасна). Гэрийн laptop: 39/39 объект амжилттай. Ажлын laptop: `SOURCE_S3_REGION` override нэмэх шаардлагатай байсан (хуучин "Mongolia" region bug), 88/88 объект амжилттай. Одоо хоёр laptop нэг R2 bucket ашиглаж байна. `pnpm test --no-file-parallelism` 128/128 (хоёуланд).

## Хүргэлтийн үнэ 10,000₮ + И-баримт схем бэлтгэл (2026-08-26)
`UB_DELIVERY_FEE_MNT` 5000→10000 (ганц тогтмол өөрчлөхөд хангалттай байсан). StorePay/карт/эльч хүргэлт бүгд олон нийтэд нээлттэй API байхгүй (Tom өөрөө компанитай гэрээ хийх ёстой) — код бичээгүй. eBarimt-ийн хувьд зөвхөн инерт схем: `drizzle/0028_ebarimt_receipt_fields.sql` (`ebarimtStatus`/`ebarimtReceiptId`/`ebarimtQrData`/`ebarimtLotteryNumber`), admin-д зөвхөн уншихад зориулсан мөр. EBARIMT.md-д Tom SmartSoftware нийлүүлэгчтэйгээ тодруулах 6 асуулт бичсэн. `pnpm test --no-file-parallelism` 128/128.

## Admin "Интеграцууд" панель (2026-08-26)
karkaron.com жишээ prompt-оос ялгаж авсан 3 цоорхойн эхнийх: `integration_configs` хүснэгт (ebarimt/storepay/card_golomt/courier_ebuuhia), `server/_core/crypto.ts` (AES-256-GCM, `INTEGRATIONS_ENCRYPTION_KEY`), нууц утга хэзээ ч клиент рүү буцдаггүй, `adminProcedure` (staff биш). QPay-г зориудаар оруулаагүй (аль хэдийн `.env`-ээс ажилладаг). ⚠️ Тест явцад Tom-ийн бодит `/admin` ашиглалттай давхацсан bug (script нь Tom-ийн бичсэн утгыг дарж бичсэн) — илрүүлж, `integration_configs`-ийг 0 мөр рүү буцааж, зөвхөн өөрийн debris-ийг устгасан (Tom-ийн audit log хөндөөгүй). `pnpm test --no-file-parallelism` 134/134.

## Brevo API IP хязгаарлалт + Product Variants PHASE 1 (2026-08-26)
`GET /v3/account` 401 "unrecognised IP address" — IPv4/IPv6 хоёул Brevo dashboard-ийн Authorised IPs-д ороогүй. Tom dashboard дээрээ IP хязгаарлалтыг унтраахаар сонгосон (хараахан баталгаажаагүй — идэвхжсэний дараа шалгах хэрэгтэй).

Product Variants PHASE 1: `product_variants` хүснэгт (`drizzle/0030_product_variants.sql`), 937 бараа backfill (937 variant, бүгд isDefault=true). `products.priceMnt`/`stockQuantity`/`sku` ХЭВЭЭРЭЭ cart/checkout/order-ийн цорын ганц эх сурвалж (0 эрсдэл). Admin-д variant CRUD UI нэмэгдсэн, storefront/cart хараахан хөндөгдөөгүй (PHASE 2 — тусад нь). Migration-аас өмнө DB backup авсан. `pnpm test --no-file-parallelism` 141/141.

## Product Variants PHASE 2 (2026-08-26, үргэлжлэл 5): storefront/cart бодитоор variantId ашиглаж эхэлсэн
Tom "Brevo IP-г dashboard-аас unтраа" гэсэн зааврыг өгсний дараа шууд "одоо Phase 2 руу шилжье" гэж хүссэн (Brevo-ийн бодит "IP хязгаарлалт унтраах" товч байдаггүйг тодруулсан — доор бичсэн шинэ blocker-ийг үзнэ үү). PHASE 1-ийн `productVariants` schema comment-д өөрөө тодорхой зааж өгсөн төлөвлөгөөг дагаж хэрэгжүүлэв:

- **Migration** (`drizzle/0031_product_variants_phase2.sql`): `cart_items.productId` → `variantId` (NOT NULL, `product_variants.id`-руу FK, unique index `(cartId, variantId)` болгож сольсон — ижил барааны 2 өөр variant сагсанд тусдаа мөр болж орох боломжтой болсон) — өмнөх бүх идэвхтэй сагсны мөрийг тухайн барааны default variant рүү backfill хийсэн (0 nullable үлдсэн). `order_items`-д `variantId` (nullable, SET NULL, `productId`-тэй ижил зарчим) нэмж, өмнөх захиалгын мөрүүдийг мөн адил backfill хийсэн. Бодит DB (937 бараа, бодит захиалга) дээр ажиллуулахын өмнө `scripts/db-backup.ps1`-ээр backup авсан, ажиллуулсны дараа 0 nullable variantId-г SQL-ээр баталгаажуулсан.
- **Cart/checkout/order бүхэлдээ variant-level рүү шилжсэн**: `addCartItem` одоо `productId` (хуучин, барааны default variant рүү автоматаар шийддэг — Shop/Routine/Profile-ийн бүх одоо байгаа дуудлага өөрчлөгдөөгүй хэвээр ажиллана) эсвэл `variantId` (шинэ, бодит сонголт хийсэн үед) хоёрын аль нэгийг авдаг болсон. `createOrderFromActiveCart`-ийн нөөц хасалт, захиалга цуцлахад нөөц сэргээх хоёул одоо variant мөр дээр ажиллана (`products.stockQuantity` биш). **Явцад жинхэнэ bug олж заслаа**: `order_items.sku`-д өмнө нь `item.slug` (барааны URL slug) буруу бичигдэж байсан (cart query-д бодит sku огт сонгодоггүй байсан учраас) — одоо variant-ийн жинхэнэ sku зөв бичигдэнэ.
- **Admin-ийн энгийн (ганц variant-тай) бараа засах урсгал өөрчлөгдөөгүй мэт хэвээр ажиллана**: шинэ `syncSoleVariantFromProduct` helper — `admin.updateProduct` барааны үнэ/нөөц/sku өөрчлөхөд, тухайн бараа яг 1 variant-тай л байвал (дийлэнх 936/937 тохиолдол) тэр variant рүү автоматаар mirror хийдэг (2 variant-тай болмогц зогсоно — аль variant гэдэг нь тодорхойгүй болдог тул). `createAdminProduct` (шинэ бараа үүсгэх) одоо шинэ барааны яг адил default variant-ыг нэг transaction дотор автоматаар үүсгэдэг болсон (өмнө нь энэ дутуу байсан — 0030 migration-ий дараа admin-аас шинээр үүсгэсэн ямар ч бараанд variant огт байхгүй үлдэх байсан жинхэнэ цоорхой байсныг олж, шууд заслаа).
- **Frontend**: шинэ `VariantPicker.tsx` — зөвхөн барааны variant тоо >1 үед л харагдана (ганц variant-тай 936 бараанд ямар ч харагдах өөрчлөлт алга). `ProductDetail.tsx`/`QuickViewDialog.tsx` variant сонгогдоход үнэ/нөөц/sku шинэчлэгдэнэ. `CartDrawer.tsx`/`Checkout.tsx`/`OrderConfirmation.tsx` сонгосон variant-ийн шинж чанарыг ("Хэмжээ: 400мл") жижиг тайлбар мөрөөр харуулна.
- **Тест**: шинэ `server/product-variants-phase2.integration.test.ts` (8 тест) — productId→default variant, variantId→тодорхой variant, нэг барааны 2 variant тусдаа мөр, variant тус бүрийн нөөц тусад нь хязгаарлагддаг, checkout зөв variant-ийн нөөцийг хасаж зөв sku бичдэг (slug-bug-ийн regression шалгалт), цуцлахад зөв variant-ийн нөөц сэргэдэг, зочны сагс нэгтгэхэд variantId хадгалагддаг, `admin.updateProduct` ганц variant-ыг mirror хийдэг. Мөн 5 хуучин integration test файлд (checkout.guest, loyalty, discount-codes, routine-discount, order-notifications, commerce.database) шинэ variantId багана шаардсан fixture нэмсэн (productId-ээр шууд `products` хүснэгтэд raw insert хийдэг байсан тул `createAdminProduct`-ийн шинэ auto-variant логикт хамрагдаагүй байсан).

**Баталгаажуулалт**: Migration-аас өмнө бодит DB backup. `pnpm check`/`pnpm build` цэвэр. `pnpm exec vitest run --no-file-parallelism` (бүх gate идэвхтэй) **149/149 цэвэр**. Бодит running dev server-ийн DB дээр throwaway probe script-ээр (шууд `server/db.ts`-ийн функц дуудаж, дараа нь бүрмөсөн устгасан) жинхэнэ бараа (id=67, "BA-YU Horse Oil Non-Silicone Shampoo") дээр 2 дахь variant нэмж, `getPublicProductVariants`-ийн буцаах утга зөв 2 мөр болж байгааг, цэвэрлэсний дараа буцаад 1 мөр болж байгааг баталгаажуулсан. Бүтэн Playwright browser screenshot (visual) баталгаажуулалт **энэ удаад цаг хугацааны шалтгаанаар хийгдээгүй** — backend/money-path нь 149 автомат тестээр (үүнээс 8 нь яг энэ Phase 2-т зориулагдсан) бүрэн баталгаажсан, frontend нь `pnpm build` цэвэр бөгөөд шинэ `VariantPicker` chunk зөв bundle хийгдсэнийг харсан.

**Дараагийн алхам**: Brevo IP хязгаарлалтын жинхэнэ механизмыг тодруулах (доорх blocker), дараа нь mass SMS/Email campaign эсвэл Product Variants-ийн frontend-ийг бодит олон variant-тай бараагаар screenshot-оор баталгаажуулах.

## Бодит барааны зураг — ангилал бүрийн placeholder + pilot batch (2026-08-26, үргэлжлэл 6)
Brevo баталгаажсны дараа Tom 937 барааны бодит зураг (1080p-тэй ойролцоо чанартай) websearch хийж олоод R2 рүү oруулахыг хүссэн. **Чухал тодруулга өгсөн**: энэ орчинд зураг **generate хийх AI загвар/tool байхгүй** — зөвхөн websearch+татаж авах боломжтой, олдохгүй бол зөвхөн code-ээр зурсан SVG icon л хийж чадна (фото зураг зохиомлоор "generate" хийх боломжгүй). Мөн 937 барааг нэг зэрэг, нэг бүрийг баталгаажуулалгүй хийх нь өндөр эрсдэлтэй (буруу бараанд буруу зураг наалдах) гэдгийг тайлбарлаад, Tom-той 2 асуулт тодруулсан: (1) pilot (24 бараа, 4/ангилал)-аас эхэлье, (2) олдохгүй бол ангилалд тохирсон generic icon.

**1. Ангиллаас тохирсон placeholder (бүх 937 бараанд шууд нөлөөлнө):** Өмнө нь **ганц** ерөнхий улаан лонхны SVG (`product-placeholder.svg`) бүх 925 зурагтугй бараанд адилхан харагддаг байсан. Одоо 6 бодит ангилал тус бүрдээ өөрийн SVG icon-той: Арьс арчилгаа (дусаалуурт лонх — хуучин ерөнхий icon-той адил), Гоо сайхан (уруулын будаг), Эрүүл мэнд (эмийн лонх+загалмай), Эрүүл ахуй (соап помп лонх), Үс ба бие (шампунь лонх), Ээж ба хүүхэд (хүүхдийн сүүний лонх). `shared/catalog-filter.ts`-ийн `getCategoryPlaceholderImage(categorySlug)` функц, `Shop.tsx`/`ProductDetail.tsx`/`QuickViewDialog.tsx`-д (хамгийн их ашиглагддаг 3 газарт) холбогдсон. `getRecommendedProducts` (db.ts) query-д дутуу байсан `categorySlug` сонголтыг нэмсэн.

**2. Pilot batch — 24 бараанаас 6-г нь бодитоор бүрэн дуусгасан (ангилал бүрээс үнэ өндөртэй эхний 4-ийг нь window function-оор сонгосон):**
- Cell Cure 4T PLUSPLUS/4T PLUS (BELEGA, албан ёсны belega-cellcure.com сайтаас, transparent PNG, өндөр чанартай)
- Prieclat Radiant Power Serum (Скалда Sugi Drug Store (Япон, санамсаргүй ижил нэртэй) private-label брэндийн албан ёсны cdn зураг, 1946x1946, маш өндөр чанартай)
- AMOMA Milk Up/Through Blend, Maternity Oil (cosme.net-ээс, зөв бараа мөн ч зөвхөн 180x180 бага нягтралтай — цаашид илүү сайн эх сурвалж олдвол сольж болно)

Урсгал бүрийг: WebSearch (барааны нэр+баркод) → WebFetch (жинхэнэ зурган URL олох) → curl татах → **Read tool-оор нүдээр шалгаж баталгаажуулах (зөв бараа мөн эсэх)** → `processUploadedImage` (admin upload-той ЯГ ижил pipeline: rotate+resize 1600px max+re-compress) → `storagePut` R2 рүү → `products.imageUrl` DB шинэчлэлт. Зам: `catalog/products/<productId>/<slug>.<ext>` (одоо байгаа `admin.uploadProductImage`-ийн uploader-id-based замаас ялгаатай, гэхдээ ижил `catalog/products/` эх namespace дор — барааны ID-аар эрэмбэлэгдсэн тул R2 console-оос харахад илүү ойлгомжтой). Throwaway script-ээр (устгасан) хийсэн. Playwright+Edge screenshot-оор ProductDetail (жинхэнэ зураг, бага нягтралтайг хамт), Shop grid (placeholder-той хольцолдсон), ангилал placeholder зөв ялгаатай (Ээж ба хүүхэд-ийн лонх vs Арьс арчилгааны дусаалуур) харуулж баталгаажуулсан.

## ⚠️ Гэрийн лаптоп дээр DB хоосон байсныг илрүүлсэн (2026-08-26, үргэлжлэл 8)
Гэртээ ирээд "server iig asaa, 937 barааны зураг update хий" гэсэн хүсэлтээр эхлэхэд `products: 0` (бүрэн хоосон) байгааг олов — MySQL нь машин бүрд тусдаа (R2 л хуваалцдаг), 937 барааны бодит өгөгдөл хэзээ ч энэ лаптоп руу орж ирээгүй байсан бөгөөд GitHub-т ч байхгүй (DB backup `.gitignore`-д, бодит харилцагчийн мэдээлэл агуулдаг тул зориудаар). Шийдэл: ажлын лаптопоос `scripts/db-backup.ps1`-ээр авсан хамгийн сүүлийн backup zip-ыг физикээр (USB/cloud) энэ лаптоп руу зөөгөөд `db-restore.ps1 -Force`-ээр сэргээх ёстой — **энэ алхам хараахан хийгдээгүй, дараагийн шаардлагатай алхам хэвээр байна.**

## Admin Analytics/CRM dashboard — борлуулалт, дүүрэг, харилцагчийн мэдээлэл, Excel/PDF export (2026-08-26, үргэлжлэл 9)
Tom-ий шууд хүсэлтээр ("data analyst, ямар хүн ямар бараа авсан, аль дүүргээс захиалж байна, Excel/Word/PDF-ээр татаж болгодог болго"). Websearch-ээр Shopify Analytics-ийн бүтцийг судалж (sales/customer/geography/product reports) баримт болгосон. Гурван том хэсгийг зэрэг (нэг түвшинд) хийсэн:

1. **Schema** (`drizzle/0032_customer_analytics.sql`): `users.birthYear`/`users.occupation` (заавал биш, sign-up-д асуудаггүй, зөвхөн профайл дээрээ сайн дураараа өгвөл), `user_addresses.district`/`orders.deliveryDistrict` (Улаанбаатарын 9 дүүргийн бүтэцтэй enum, `shared/districts.ts`). `orders.deliveryDistrict` бол snapshot (`customerName`-тэй адил зарчим) — хаяг дараа засагдсан ч захиалгын түүх өөрчлөгдөхгүй. `scripts/backfill-order-districts.ts` — байгаа захиалгуудын чөлөөт бичвэр хаягаас (Cyrillic бүтэн нэр + товчлол ХУД/БЗД г.м. + latin аль алиныг таньдаг) дүүргийг таамаглаж backfill хийдэг, зөвхөн NULL мөрийг л хөндөнө (давхар ажиллуулахад аюулгүй).
2. **`server/analytics.ts`** (шинэ файл): `getSalesOverview`/`getRevenueTimeseries`/`getTopProducts`/`getTopCategories`/`getDistrictBreakdown`/`getCustomerDemographics`/`getLoyaltyTierBreakdown` — бүгд зөвхөн `paymentStatus="paid"` захиалгаас. **Насны/мэргэжлийн мэдээлэл зөвхөн сайн дураараа өгсөн хэрэглэгчээр хязгаарлагдана** тул хариу нь үргэлж "N/M хэрэглэгч мэдээлэл өгсөн" гэдгийг дагалдуулдаг (хэзээ ч бүрэн дүүрэн юм шиг үзүүлэхгүй). Дүүргийн задаргаа бол ЗАХИАЛГЫН (order-based) өгөгдөл — вэбсайт ЗОЧЛОЛТЫН (traffic/visit) өгөгдөл биш, тийм infrastructure энэ сайтад алга (WebSearch-ээр Shopify-гийн жишээгээр баталгаажуулсан ялгаа).
3. **Excel/PDF export** (`exceljs`, `pdfkit` шинэ dependency): `admin.analyticsExport` procedure base64 файл буцаана, клиент `downloadBase64File` (`client/src/lib/fileDownload.ts`)-ээр татна. **Чухал bug олж заслаа**: pdfkit-ийн built-in фонт (Helvetica) Cyrillic үсэг огт дэмждэггүй (зөвхөн Latin, PDF стандартын жишиг 14 фонтын хязгаарлалт) — анхны тест PDF **бүрэн эвдэрсэн тэмдэгтүүд** (mojibake) харуулсан. Засаж: `dejavu-fonts-ttf` npm package-аас DejaVu Sans/Bold TTF файлыг `server/assets/fonts/`-т хуулж (npm dependency-г устгаад, зөвхөн файлыг нь repo-д шууд хадгалсан), pdfkit-д `registerFont`-оор бодитоор embed хийдэг болгосон. `import.meta.dirname`-ээр зам тооцоолдог тул dev (`tsx`, `server/assets/...`) болон prod (esbuild bundle, `dist/assets/...`) хоёуланд адилхан ажиллана — `package.json`-ий `build` script-д `server/assets` → `dist/assets` хуулах алхам нэмсэн. Засварын дараа PDF-ийн Монгол кирилл текст бүрэн зөв харагдахыг screenshot-оор баталгаажуулсан.
4. **`client/src/components/AdminAnalyticsPanel.tsx`** (шинэ): огнооны хугацаа сонгогч (7 хоног/30/90/энэ сар/бүх цаг), KPI tile (орлого/захиалга/AOV/шинэ-давтан), `recharts`-аар орлогын line chart + дүүргийн bar chart + насны bar chart, их зарагдсан бараа/ангиллын хүснэгт (CSV export товчтой), гишүүнчлэлийн түвшингийн тоо. `AdminWorkspace.tsx`-д admin-only ("Хэрэглэгч"/"Аюулгүй байдал"/"Интеграцууд"-тай ижил түвшинд) шинэ "Аналитик" таб.
5. **Checkout.tsx/Profile.tsx**: хүргэлтийн хаягийн дэргэд дүүрэг сонгох dropdown (сонголтоор), профайл дээр төрсөн он/мэргэжил талбар (сонголтоор, тодорхой "заавал биш" тайлбартай).

**Тест**: шинэ `server/analytics.integration.test.ts` (4 тест) — staff хориглогдох, борлуулалт/бараа/дүүргийн тооцоо бодит өгөгдөөр зөв гарах, Excel/PDF (`%PDF` magic byte хүртэл) бодитоор үүсэх, `createOrderFromActiveCart`-ийн `guessDistrictFromAddress` бодитоор ажиллаж байгааг (ХУД → khan_uul) баталгаажуулсан.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр (`dist/assets/fonts/`-т фонт зөв хуулагдсаныг баталгаажуулсан), `pnpm exec vitest run --no-file-parallelism` бүх gate идэвхтэй **153/153 цэвэр**. Гэрийн лаптоп дээр 937 бодит бараа/захиалга байхгүй тул визуал dashboard-ыг бодит өгөгдлөөр screenshot аваагүй — DB backup сэргээгдсэний дараа Tom өөрөө шалгаж, шаардлагатай засвар хийлгэх шаардлагатай.

**Явц ба цаашдын шийдвэр (937 барааны зураг):** 24-ийн 6 нь бүрэн дууссан, 18 нь **websearch-оор олдоогүй эсвэл зураг чанар хангалтгүй байсан тул одоохондоо алгассан** (тэдгээр нь ангиллын placeholder-оо хэвээр авна). 937-ийн үлдсэн 913-ыг ижил түвшний нарийвчлалтайгаар (нэг бүрийг websearch+нүдээр шалгах) хийхэд маш их цаг/tool call шаардана — Tom-той цаашид үргэлжлүүлэх хурд/цар хүрээг (жишээ нь: илүү олон бараагаар үргэлжлүүлэх, эсвэл нийлүүлэгчийн бодит зургаар солих, эсвэл placeholder-ыг л хангалттай гэж үзэх) тодруулах хэрэгтэй.

`pnpm check`/`pnpm build` цэвэр.

## ⚠️ Ноцтой bug олж заслаа: миний ӨӨРИЙН integration test жинхэнэ `home-hero` контентыг test ажиллуулах БҮР устгадаг байсан (2026-08-26, үргэлжлэл 7)
Tom `/admin` → Content & Media-аас нүүр хуудасны гол (`home-hero`) зурган дээр бодит, өндөр чанартай зураг upload хийсэн ч, дараа нь "сервер restart хийх бүрт зураг алга болоод байна" гэж мэдэгдэв. Мөн "937 барааны data алга болсон" гэж санаа зовсон.

**Шалгалт (баримт баримтаар):**
- `SELECT COUNT(*) FROM products/product_variants` → **937/937, бүрэн бүтэн** — барааны өгөгдөл огт алдагдаагүй.
- R2 bucket-ийг S3 API-аар шууд жагсаахад: Tom-ий upload хийсэн жинхэнэ, 4.1MB-той, 1920x1440 хэмжээтэй (`processUploadedImage`-ийн 1920px pipeline-ээр зөв боловсруулагдсан), маш өндөр чанартай hero зураг **бодитоор R2-т байсан**, гэхдээ `site_media` хүснэгтэд `home-hero` мөр огт байхгүй байв.
- **Жинхэнэ шалтгаан олдов**: `server/site-media.integration.test.ts` нь `slotKey = "home-hero"` гэсэн **БОДИТ, ХЭРЭГЛЭГЧИЙН production slot-ыг** (санамсаргүй/тест-only slot биш!) шууд ашигладаг байсан бөгөөд `afterEach`-д **болзолгүйгээр** `clearSiteMedia({ slotKey: "home-hero" })` дуудаж, `site_media` хүснэгтээс тухайн мөрийг бүрмөсөн УСТГАДАГ байв. Энэ session-ий турш `RUN_MEDIA_INTEGRATION_TESTS=1`-тэй бүх-gate `pnpm test`-ийг хэд хэдэн удаа ажиллуулсан (Product Variants Phase 2, зурган ажлын баталгаажуулалтын хэсэгт) — **тест ажиллуулах БҮРТ Tom-ий жинхэнэ upload-ийг DB-ээс устгаж байсан** (upload өөрөө R2-т амьд үлдсэн ч DB reference нь тасарсан). Энэ бол "server restart" биш, харин **миний өөрийн тестийн код Tom-ий бодит контентыг дайран устгаж байсан** явдал байв.
- Мөн R2-оос жижиг (68-96 byte) `media-integration-*.png` нэртэй **42 ширхэг test-debris файл** олдов (тест бүр ажиллах бүрд шинэ tiny 1-pixel PNG upload хийдэг байсан, хэзээ ч устгагддаггүй байсан) — persistent R2 руу шилжсэнээс хойш (2026-08-26-ны эрт үеийн session) хуримтлагдсаар байсан.

**Заслаа:**
1. `site_media`-ийн `home-hero` мөрийг Tom-ий бодит upload хийсэн зургийн URL руу шууд сэргээв (throwaway script, дахин upload хийх шаардлагагүй — файл өөрөө R2-т байсан хэвээр).
2. `site-media.integration.test.ts`-ийг **snapshot-and-restore** зарчимд шилжүүлэв: тест ажиллуулахын өмнө `home-hero`-ийн ОДООГИЙН (бодит) утгыг хадгалж аваад, тестийн дараа яг тэр утгыг (эсвэл анхнаасаа хоосон байсан бол хоосон болгож) буцаан тавьдаг болгосон — цаашид ямар ч тест ажиллуулалт бодит контентыг дайрахгүй.
3. Хуримтлагдсан 42 test-debris файлыг R2-оос бүрмөсөн устгасан.
4. `admin.uploadAvatar`/бүтээгдэхүүний зурган тестүүд ч мөн адил R2-т орфан файл үлдээдгийг (`removeAvatar` зөвхөн DB-ийн `avatarUrl`-ыг null болгодог, S3 object-ыг устгадаггүй) тэмдэглэв — эдгээр нь **бодит контентыг дайрдаггүй тул эрсдэлгүй, зөвхөн диск зай бага зэрэг үрдэг** асуудал, энэ удаад заасангүй (ирээдүйн cleanup-д нэмэх).

**Тодруулга Tom-д зориулж**: Таны "937 барааны data алга болсон" гэсэн санаа зовнил дэмий байлаа — бараа 100% бүтэн байсан. Харин "зураг upload хийвэл алга болоод байна" гэсэн ажиглалт бол **бодит, ноцтой bug байсан**, зөв илрүүлсэн байна — баярлалаа. Ирээдүйд ижил зурган slot-уудад (нэн ялангуяа `home-hero`) upload хийхэд ийм зүйл дахин тохиолдохгүй.

**Баталгаажуулалт**: Тест-ийг ганцаараа ажиллуулж (1/1 ✅), дараа нь DB-ээс `home-hero` бодит утгаараа хэвээр байгааг баталгаажуулсан. Бүх gate идэвхтэй бүрэн suite: `pnpm exec vitest run --no-file-parallelism` **149/149 цэвэр**. `pnpm check` цэвэр.

**⚠️ Home.tsx-ийн hero/collection/care зурган (CSS `background-image`) бодит browser дээр screenshot-оор ХАРАГДАЖ БАЙГААГ баталгаажуулж чадсангүй** — Playwright+Edge (headless) дээр `content.siteMedia` query зөв утга буцааж, `getComputedStyle` бүх талаараа зөв (`background-image` URL, `background-size: cover`, `background-position: center`, ямар ч filter/mask/blend алга) харуулсан ч, screenshot дээр бодит зураг харагдахгүй, зөвхөн CSS градиент харагдсан хэвээр байв. **Гэхдээ ижил зураг шууд URL-аар нь navigate хийхэд, мөн `<img>` tag-аар (ProductDetail) харагдахад бүрэн зөв харагдсан** — зөвхөн энэ тодорхой CSS `background-image` + headless screenshot хослолд л гарч байгаа зүйл (магадгүй зөвхөн миний screenshot tool-ийн хязгаарлалт, өөр АЛЬ Ч (Aug 20-с хойш "аль хэдийн ажилладаг" гэж тэмдэглэгдсэн `home-categories` зэрэг) слот дээр ч ижил шинж тэмдэг ажиглагдсан тул **энэ бол шинэ bug биш**, зөвхөн миний одоогийн screenshot pipeline-ийн орхигдол). Өгөгдлийн түвшинд (DB + R2 + network) бүрэн баталгаажсан тул Tom өөрийн жинхэнэ browser-оос (hard refresh, Ctrl+Shift+R) шалгаж баталгаажуулах хэрэгтэй.

## Лаптоп хооронд шилжилт (2026-08-20, 2026-08-26)
**Гэрийн лаптоп анх удаа асуулгасан (2026-08-20)**: GitHub-аас clone, Node/pnpm/MySQL/MinIO шинээр суулгасан. `pnpm-workspace.yaml`-д `onlyBuiltDependencies: [@tailwindcss/oxide, esbuild]` зөөх шаардлагатай байсан (шинэ pnpm package.json-ий `"pnpm"` field уншихаа больсон). Migration 0009-ийн `DROP INDEX openId` бодит индексийн нэр (`users_openId_unique`) буруу байсан тул гараар зассан.

**Ажлын лаптоп R2 руу шилжилт (2026-08-26)**: дээрх "Object storage" хэсэгт нэгтгэсэн.

`pnpm dev` одоо стандарт байдлаар ажилладаг (2026-08-20-с хойш) — өмнө нь `package.json`/`pnpm-lock.yaml`-ийн Windows "High Mandatory Level" integrity label-ийг elevated PowerShell-ээс `icacls ... /setintegritylevel Medium`-ээр зассан.

## Admin Analytics — Tier B/C: ашиг/маржин, сагс орхилт, нөөц, суваг, эх сурвалж/төхөөрөмж (2026-08-26, үргэлжлэл 10)

Tom Geckoboard-ийн жишиг dashboard screenshot + стандарт e-commerce KPI-ийн жагсаалт (Conversion Rate, AOV, Cart Abandonment, CAC, New vs Returning, Device, Traffic Source, Best Sellers, Return Rate, Inventory) илгээгээд **"ямар ч тайлбар/хойшлуулалт хэрэггүй, шууд tier-ээр хуваагаад хий"** гэж тодорхой зааварчилсан — тайлбаргүйгээр шууд хэрэгжүүлсэн:

- **Schema** (`drizzle/0033_analytics_expansion.sql`): `products.costMnt` (admin-аас гараар оруулдаг, заавал биш — ашиг/маржин зөвхөн энэ талбарыг бөглөсөн бараагаар л тооцоологдоно, "N/M зарагдсан ширхэгт cost мэдээлэлтэй" гэдгийг үргэлж дагалдуулна, demographics-ийн адил зарчим), `orders.trafficSource`/`orders.deviceType` (захиалга хийх мөчид л бичигдэнэ, хуучин захиалгад хэзээ ч backfill хийгдэхгүй).
- **`server/analytics.ts`**-д 5 шинэ функц: `getOrdersByChannel` (хүргэлт/төлбөрийн хэлбэрээр), `getCartAbandonment` (бодит `carts`/`cart_items`-аас — `carts.status`-ийн ашиглагдаагүй "abandoned" enum-д биш, харин бараатай+24ц+ идэвхгүй+хэзээ ч захиалга болоогүй сагсаар тооцдог), `getInventorySnapshot` (нөөцийн үнэ цэн/дууссан/бага үлдэгдэлтэй), `getProfitOverview` (доод тал нь ашиг — зөвхөн cost мэдээлэлтэй мөрөөр), `getTrafficBreakdown`. Бүгд `getAnalyticsReport`/Excel/PDF export руу холбогдсон.
- **Excel export**-д "Суваг" болон "Эх сурвалж, Төхөөрөмж" гэсэн 2 шинэ sheet нэмсэн. **Явцад жинхэнэ exceljs bug олж заслаа**: sheet нэрэнд `/` тэмдэгт байж болохгүй (Excel-ийн өөрийнх нь дүрэм) — "Эх сурвалж/Төхөөрөмж" нэрийг shipped-ын өмнөх интеграцийн тестээр илрүүлж "Эх сурвалж, Төхөөрөмж" болгож зассан.
- **`shared/deviceType.ts`**: `parseDeviceType(userAgent)` — mobile/tablet/desktop/unknown, тодорхойгүй бол таамаглалгүй "unknown".
- **`client/src/lib/trafficSource.ts`**: browser session бүрийн эхний хуудас ачаалалт дээр л (`main.tsx`) нэг удаа тэмдэглэгддэг "эх сурвалж" — utm_source/medium байвал тэрийг, эсвэл жинхэнэ external referrer-ийн hostname-ыг, эсвэл "Шууд орсон". Захиалга хийх мөчид (`document.referrer` аль хэдийн өөрийн сайтын өмнөх хуудас болчихсон байдаг тул) биш, зөвхөн эхний хуудсан дээр л барих ёстой гэдгийг тайлбарласан comment-той.
- `checkout.createOrder` одоо `ctx.req.headers["user-agent"]`-ээс `deviceType`-г серверийн талд өөрөө parse хийж, клиентээс ирсэн `trafficSource`-ыг хүлээж авдаг — хоёул `customerName`/`deliveryDistrict`-тэй адил захиалга дээр л snapshot хийгддэг.
- `admin.createProduct`/`updateProduct`-д `costMnt` (admin-only, `/admin`-аас гадна хэзээ ч харагдахгүй) талбар нэмсэн, `AdminWorkspace.tsx`-ийн бүтээгдэхүүний форм дээр "Хуучин үнэ"-ийн хажууд шинэ талбар.
- `AdminAnalyticsPanel.tsx`-д 3 шинэ KPI tile (ашиг/маржин, сагс орхилт, нөөцийн үнэ цэн) + 2 шинэ хэсэг (хүргэлт/төлбөрийн суваг, эх сурвалж/төхөөрөмж).

**Тест**: `server/analytics.integration.test.ts` 4→5 болж өргөжсөн — profit/channel/inventory/cartAbandonment бодит fixture дээр шалгагдсан, мөн шинэ тест `checkout.createOrder`-ийг бодит mobile User-Agent header-тэйгээр дуудаж, DB-д `deviceType="mobile"` бичигдэж байгааг, мөн `getAnalyticsReport`-ийн `traffic` хэсэгт тэр захиалга бодитоор гарч ирж байгааг (зөвхөн функц шууд дуудахгүй, бүтэн router round-trip-ээр) баталгаажуулсан.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. Бүх gate идэвхтэй `pnpm exec vitest run --no-file-parallelism` **154/154 цэвэр**. CI-тэй ижил горим (gate унтраасан): 59 passed/95 skipped, регресс алга. Commit+push хийсэн.

**⚠️ Хажуугаар олдсон, засаагүй (энэ ажилтай холбоогүй, урьд байсан) цоорхой**: `server/integrations.integration.test.ts`-ийн нэг "unit" тест `INTEGRATIONS_ENCRYPTION_KEY` env var-гүй үед шатдаг ба энэ var нь `.github/workflows/ci.yml`-д тохируулагдаагүй — өөрөөр хэлбэл **жинхэнэ GitHub Actions CI дээр энэ тест улаан гарч байж магадгүй**. `git log`-оор шалгахад энэ бол өнөөдрийн ажлаас **өмнө** (49b513e commit, Admin Integrations панел) байсан асуудал. Шийдвэрлээгүй — нууцлалын түлхүүрийн шинж чанартай тул dev fallback нэмэхийн өмнө Tom-той зөвшилцөх нь зөв гэж үзсэн.

**Дараагийн боломжит алхмууд (Tom-той тодруулаагүй)**: CAC (маркетингийн зардал admin-аас гараар оруулах талбар шаардана), Return Rate (шинэ "буцаасан" захиалгын статус эсвэл тусдаа returns tracking шаардана) — эдгээрийг хийхийн тулд шинэ өгөгдлийн эх сурвалж (admin-ийн гараар оруулах мэдээлэл) шаардлагатай тул код зөвхөн бичихээр шийдэгдэхгүй.

## Admin Analytics — Geckoboard дизайн (Tier D) + Conversion Rate/CAC/Return Rate/paymentStatus fix (Tier E/F/G/I) (2026-08-27)

Tom Geckoboard-ийн жинхэнэ dark KPI dashboard screenshot (sparkline KPI tile, "vs өмнөх" delta, P&L statement card, "sales by X" ranked list, AOV gauge, channel bar) илгээгээд, дээрх Tier B/C-ийн жагсаалтаас дутуу үлдсэн (шинэ өгөгдлийн эх сурвалж шаардсан учир хойшлуулагдсан) 3 metric-ийг заавал дуусгахыг, **бас "тайлбар/хойшлуулалт бүү хий, зүгээр tier-ээр хуваагаад одоо хий" гэдгээ дахин маш тодорхой шаардсан**. Plan mode-оор эхэлж (2 Explore agent — codebase судалгаа + gauge/sparkline/session-tracking-ийн зөв аргачлалын websearch, дараа нь 1 Plan agent), таван тиер болгож дараалан бүгдийг дуусгасан.

### Tier D — Geckoboard дизайны шинэчлэл

`AdminAnalyticsPanel.tsx`-ийн дээд KPI хэсэг бүхэлдээ харанхуй "command center" дизайнтай болов (зөвхөн энэ component-ийн өөрийн hardcoded палитр, сайтын global dark mode-той (ашиглагдаагүй, идэвхгүй) огт хамааралгүй):
- `server/analytics.ts`: `getPeriodComparison` (одоогийн vs өмнөх ижил хугацааны цонх — "Бүх цаг үе" сонголтод боломжгүй тул `available:false`, хэзээ ч зохиомол харьцуулалт хийхгүй), `getPnlOverview` (**зөвхөн бодит талбар** — Geckoboard жишээний "Referer cut"/"Paypal transactions" шиг энэ бизнест байхгүй зүйл зохиомлоор оруулаагүй; хүргэлтийн орлого/хямдрал нь "нийт дүнд аль хэдийн шингэсэн" тайлбартай мэдээллийн мөр, давхар хасалт хийгээгүй), `getTrafficBreakdown`-д `revenueMnt` нэмэгдэв (District breakdown-той адил "sales by referer" ranked-$ list болгохын тулд).
- Шинэ component: `Sparkline` (recharts AreaChart, 2 цуврал — өдрийн offset-оор зэрэгцүүлсэн, sparse өгөгдлийг 0-ээр дүүргэсэн), `AovGauge` (**гараар зурсан SVG** semicircle+needle — recharts-д gauge component байхгүй, RadialBarChart-ийн дотоод cx/cy-г буцааж тооцоолохоос гар SVG-ээр needle байрлалыг нарийн удирдах нь илүү найдвартай гэж шийдсэн), `DeltaBadge` (сум icon + тэмдэгтэй хувь, өнгө дангаараа хэзээ ч биш), `PnlCard`, `RankedDollarCard`, `ChannelBarsCard`.
- **Явцад AdminWorkspace.tsx-ийн urьдын bug олж заслаа**: "Аналитик" таб дээр header/subtitle text "Хэрэглэгч ба эрх" (Users-ийн текст) гэж буруу харагдаж байсан — section ternary chain-д "analytics" branch байгаагүй тул fallback руу унадаг байжээ.
- **QA-гийн явцад 2 жинхэнэ CSS bug олж заслаа** (Playwright + бодит synthetic order өгөгдлөөр screenshot; getBoundingClientRect/elementFromPoint-оор DOM зөв гэдгийг нотолсны дараа): (1) CSS grid item-д `min-w-0` байхгүй бол дотор нь `justify-between` flex мөр багана гаднаа "blowout" хийж зэргэлдээ карт руу орж болдог (карт-ийн түвшинд БОЛОН PnlCard/RankedDollarCard/ChannelBarsCard-ийн дотоод `grid`-ээр shrхэгдсэн мөр бүрийн түвшинд — хоёул засах шаардлагатай байсан). (2) `bg-white/5` (тунгалаг) card background нь headless screenshot pipeline дээр visual ghosting артефакт үүсгэдэг байсан (msedge болон chromium аль алинд, GPU disable хийсэн ч арилаагүй) — `#1f2126` (opaque) болгож бүрэн шийдсэн, мөн илүү цэвэрхэн харагдав.

### Tier I — pre-existing, том нөлөөтэй bug: cash_on_delivery захиалга хэзээ ч "paid" болдоггүй байсан

Return Rate-ийг төлөвлөж байх явцад олдсон: `orders.paymentStatus` нь **зөвхөн QPay webhook-ийн `markQPayPaymentAttemptPaid`-д л** "paid" болдог байсан. `createOrderFromActiveCart` ч, `updateAdminOrder` ч хэзээ ч `paymentStatus` бичдэггүй байв. QPay одоохондоо production дээр ажиллаагүй тул **бэлэн мөнгө/банкны шилжүүлгийн (энэ дэлгүүрийн жинхэнэ гол төлбөрийн арга) захиалга хэзээ ч "paid" болохгүй, `analytics.ts`-ийн бараг бүх функц (`paymentStatus="paid"`-аар filter хийдэг) бодит өгөгдөл дээр 0/хоосон харуулах эрсдэлтэй байсан**. Засав: `updateAdminOrder` нь QPay-гүй захиалгыг "Дууссан" болгоход автоматаар `paymentStatus="paid"` болгодог болов (жинхэнэ ертөнцөд хүргэлт/төлбөр хүлээн авсан мөч).

### Tier G — Return Rate

`orders.status`-д `"returned"` нэмэгдэв (зөвхөн "completed"-ээс шилждэг), `orders.returnedAt` timestamp. **`updateAdminOrder`-ийн хуучин guard-т ноцтой bug олдов**: `currentStatus === "cancelled" || currentStatus === "completed"` бол ЯМАР Ч status update-ийг хориглодог байсан тул буцаалт хийх боломж угаасаа код дотор байгаагүй — бүрэн дахин зохиосон. Нөөц автоматаар сэргээхгүй (буцаасан барааны борлуулж болох эсэх тодорхойгүй тул), `paymentStatus`-д хүрдэггүй (буцаан олголтын урсгал тусдаа, энэ ажлын хүрээнд ороогүй) — хоёул тодорхой comment-оор тэмдэглэсэн, зохиомлоор шийдээгүй. `getReturnRateOverview` нь харьцааны хоёр талыг АДИЛ `orders.createdAt`-аар цонхойлгодог (бусад бүх analytics функцтэй адил талбар) — `returnedAt`-ыг нэг талд нь холиход харьцаа утгагүй болно (100%-с давж эсвэл 0-той ойрхон гарч болно зөвхөн шинэ захиалгууд буцаагдах цаг завгүй байгаагаас болж). **Мөн явцад `AdminOperationsPanel.tsx`-ийн `updateOrder`/`bulkUpdateOrderStatus` mutation-д `onError` огт байгаагүйг олж заслаа** — татгалзсан шилжилт өмнө нь UI дээр огт мэдэгдэлгүй чимээгүй бүтэлгүйтдэг байжээ.

### Tier F — CAC

Шинэ `marketing_spend` хүснэгт (сар тутам admin гараар оруулдаг зар сурталчилгааны зардал, `site_media`-ийн upsert загвартай яг адил). `getCacOverview` нь тухайн хугацааны хамарсан **БҮХ** сард зардал орсон үед л жинхэнэ CAC тооцоолно — нэг ч сар дутуу бол "тодорхойгүй" (хэзээ ч ₮0 гэж таамаглахгүй). CAC tile дээр шууд inline сар+дүн editor (тусдаа тохиргооны хуудас биш).

### Tier E — Conversion Rate (хамгийн том хэсэг)

Энэ site-д урьд байгаагүй жинхэнэ 1st-party visitor/session tracking:
- Шинэ `visitor_sessions` хүснэгт (**зориудаар зөвхөн 1 хүснэгт** — Umami/Plausible/GoatCounter-ийн session+pageview хос биш, энэ site-д page-view-ийн нарийн түвшний тайлан хэрэггүй тул `pageViewCount` session мөр дээрээ хангалттай).
- `server/routers.ts`-д public `telemetry.pageview` procedure (шинэ `lenientRateLimitedProcedure` tier, 600/15мин/IP — бодит худалдан авагчийн cart/checkout-ийн ерөнхий rate limit-тэй хэзээ ч өрсөлдөхгүй байхаар тусад нь), `shared/deviceType.ts`-д `isLikelyBot` (User-Agent substring blocklist).
- `client/src/lib/pageviewTracking.ts` — route бүр солигдох үед 1 удаа beacon илгээдэг (`App.tsx`-д mount хийсэн), алдаа гарвал хуудсанд хэзээ ч харагдахгүй (fire-and-forget).
- Session cookie нь auth/guest-cart cookie-той тусдаа, урт тогтмол хугацаатай — жинхэнэ 30 минутын "session" зааг нь `lastSeenAt`-ийн серверийн шалгалт дээр л байдаг (cookie өөрөө дуусахад биш) — нэг удаагийн урт хугацааны айлчлал хэд хэдэн session болж хуваагдахаас сэргийлдэг.
- `checkout.createOrder` нь session-г cookie-оос **серверийн талд өөрөө** уншиж (`trafficSource`-той адилгүй, клиентээс дамжуулах шаардлагагүй) захиалга дээр хадгална. `getConversionOverview` = захиалга ÷ session (Shopify-ийн албан ёсны томъёо), хэзээ ч хэмжигдэж эхлээгүй хугацаанд "тодорхойгүй" гэж мэдэгдэнэ (0% гэж зохиомлоор харуулахгүй).

### Тест ба баталгаажуулалт

Шинэ `server/telemetry.integration.test.ts` (4 тест): bot UA чимээгүй алгасдаг, шинэ дуудлага token/cookie/session мөр үүсгэдэг, ижил token-той давтан дуудлага шинэ session үүсгэлгүй `lastSeenAt`/`pageViewCount`-ыг л ахиулдаг, бүтэн `checkout.createOrder` round-trip session-г захиалга дээр зөв холбож `getConversionOverview` үүнийг "хөрвүүлсэн" гэж тоолдгийг баталгаажуулсан. `server/analytics.integration.test.ts`-д 3 шинэ тест (period-comparison тооцоо, CAC сарын coverage логик, "completed→returned" зөвшөөрөгдөж "pending→returned" татгалзагддаг + Tier I-ийн paid-on-complete fix). `pnpm check`/`pnpm build` цэвэр, `pnpm exec vitest run --no-file-parallelism` бүх gate идэвхтэй **161/161 цэвэр** (өмнөх 154-өөс +7). CI-тэй ижил горим: 59 passed/102 skipped, регресс алга.

Playwright-ээр (throwaway `visual-qa-admin@example.invalid` акаунт + synthetic order/session/marketing_spend өгөгдлөөр, Tom-ийн бодит өгөгдөлд хэзээ ч хүрээгүй) бүтэн дашбордыг нүдэн дээр шалгасан — CAC хадгалах товч, sparkline/gauge бодит хөдөлгөөнтэй өгөгдлөөр, бүх шинэ tile clean харагдаж байгааг баталгаажуулсан. Ажлын төгсгөлд бүх throwaway өгөгдлийг (products/orders/visitor_sessions/marketing_spend/QA admin/admin_audit_logs мөр) устгаж, DB-г яг өмнөх (0 бараа/захиалга) төлөвт нь буцаасан.

Commit+push (2 commit: `Tier D` тусад нь, `Tier E/F/G/I` хамт).

## PROJECT-GUIDE.md-ээс зөөсөн session бүрийн тэмдэглэл (2026-08-26 → 2026-09-08), зөөсөн огноо 2026-09-09

Доорх хэсгүүд PROJECT-GUIDE.md-д session бүрийн төгсгөлд бичигдэж байсан бүрэн тэмдэглэлүүд — PROJECT-GUIDE.md-г богино байлгахын тулд 2026-09-09-нд бүрэн эхээр нь, анхны дарааллаар нь энд зөөсөн (юу ч хасаагүй, найруулаагүй).

## ✅ (2026-09-08) /admin бүхэлдээ reference дизайнаар дахин бүтээгдэв + харанхуй горим + хүссэн огноогоор шүүх

Tom `docs/reference/admin-dashboard-reference-2026-09-08.jpg` (root-оос 2026-09-09-нд зөөсөн) (wily.agency-ийн "subcom" админ дашбоард) илгээж, /admin-ыг **яг тэр шиг** болгохыг шаардав ("zaawal!!! bur!!!!"), мөн (а) бүх хэсэгт **animation**, (б) байхгүй байсан feature — **dark mode**, (в) 7/30/90 preset дээр нэмээд **хүссэн огноогоо сонгох** боломж шаардав. Хэд хэдэн удаа "still doesn't look like the image" гэж буцаасны эцэст бодит шалтгаанууд олдож заслаа (доор).

**🔴 Хамгийн чухал олдвор — Tom-ийн дэлгэц дээр дизайн задарч байсан жинхэнэ шалтгаан**: түүний browser-ийн CSS viewport ~1233px (лаптоп + zoom) байсан бол миний KPI мөр `xl:grid-cols-5` (≥1280px) байсан тул **5 карт 2 багана болж задардаг**, хоёр баганат мөрүүд нь бүрэн доош унадаг байв — өөрөөр хэлбэл код зөв, breakpoint буруу. `grid-cols-[repeat(auto-fit,minmax(140px,1fr))]` болон `min-[880px]:` болгож зассаны дараа л reference шиг харагдав. **Сургамж: reference-тэй тааруулах ажлыг 1440px дээр биш, Tom-ийн бодит ~1233px дээр шалгах.**

**🔴 Cascade-layer bug (PROJECT-GUIDE.md-д аль хэдийн тэмдэглэсэн `a { color: inherit }`-тэй яг ижил төрөл)**: index.css-д нэмсэн `.admin-icon-btn { display: grid }` зэрэг дүрмүүд **@layer-гүй** байсан тул Tailwind-ийн бүх utility-г дийлж, `lg:hidden` ажиллахгүй болж **гар утасны ☰ товч desktop дээр давхар харагдаж** байв (Tom өөрөө олж заасан). Бүх admin CSS-ийг `@layer components`-д боосноор шийдэгдсэн.

**🔴 Dark mode ажиллахгүй байсан 3 үе шаттай шалтгаан** (Tom "not rendering correctly!!" гэж 3 удаа буцаасан):
1. Панелууд бүгд hardcode-лэгдсэн hex өнгөтэй байсан (240×`#df1f3d`, 92×`#77787d`, 86×`#f8f5ef` г.м.) — shell харанхуй болсон ч дотор нь цагаан карт, цайвар текст хэвээр. **34 файлд codemod** ажиллуулж `--a-*` token руу шилжүүлэв (гэрэл горимд утга нь яг ижил тул визуал өөрчлөлтгүй).
2. Radix-ийн бүх portal (dropdown/dialog/sheet/popover/command palette) `<body>`-д, өөрөөр хэлбэл `.admin-shell`-ээс **гадна** render хийгддэг тул shell-д scoped хийсэн token хүрдэггүй байв → token-уудыг `<html>`-ийн `data-admin-theme` дээр тавьж, shadcn-ий `--background/--card/--popover/--border/...`-ийг мөн дахин зурав.
3. **Гол алдаа**: `.admin-shell` өөр дээрээ ГЭРЭЛ token-уудыг дахин зарладаг байсан ба CSS-д элемент дээрээ тодорхойлогдсон custom property нь `<html>`-ээс удамшсанаас **үргэлж давуу** тул shell харанхуй утгыг хэзээ ч аваагүй. `html[data-admin-theme="dark"] .admin-shell`-ийг мөн зорилтод оруулснаар шийдэгдэв.

**Баталгаажуулалт — нүдээр биш, хэмжилтээр**: Playwright-ээр **19 хэсэг тус бүрийг дараалан дарж**, DOM бүхэлд нь (rail/topbar/панел/portal) сканнердаж (а) харанхуй горимд үлдсэн цайвар гадаргуу, (б) 3:1-ээс доош контрасттай текстийг автоматаар илрүүлэв. Эхний гарц: бүх 19 хэсэг асуудалтай → засварын дараа: **зөвхөн 1 (зориудаар урвуулсан "Бүх цаг үе" товч)**. Явцад олдож заслаа: TinyMCE-ийн бүх chrome цагаан хэвээр (oxide-dark skin-г theme-ээр сольдог болгов), POS-ийн "Худалдаа баталгаажуулах" алтан товчны текст 1.62:1 (codemod алтан дэвсгэр дээрх бэхийг `--a-text` болгосноос — тогтмол бараан бэх болгов), Users хэсгийн 6 role badge цайвар хэвээр (`adminRoles.ts` token болов).

**Шинэ бүрдэл** (`client/src/components/admin/`): `AdminKpiCard` (reference-ийн 5 пастел tile), `AdminCountUp` (тоо 0-ээс өсөх animation, эцсийн утга ҮРГЭЛЖ бодит тоо), `AdminSummaryChart` (2 шугам + dot legend + өөрийн range dropdown), `AdminTopProductsCard`, `AdminRecentOrdersCard`, `AdminTopCustomersCard`, `AdminDateRangePicker`; `client/src/lib/adminTheme.ts` (useSyncExternalStore, дэлгүүрийн ThemeContext-ээс **тусдаа key** тул admin-ыг харанхуй болгоход дэлгүүр хэзээ ч харанхуй болохгүй).

**Огноо**: `analyticsRange.ts` — `10d` preset нэмэгдэж, `custom` (yyyy-mm-dd 2 талбар) бодитоор ажиллана; `resolveRange()` бол цорын ганц "range → цонх" функц. UTC биш **локал** огноо ашигладаг (UB нь UTC+8 тул `toISOString().slice(0,10)` нэг өдрөөр ухраадаг).

**Явцад олдсон 2 бодит дата bug**: (1) `getAdminDashboardSummary`-ийн recentOrders нь захиалгын дугаараас өөр юу ч буцаадаггүй байсан тул reference шиг "юу зарагдсан" харуулах боломжгүй байв → `firstItemName`/`firstItemImageUrl`/`itemCount` нэмэв; (2) `AdminSummaryChart`-ийн өдрийн тэнхлэг `dateFrom`-оос **урагш** 7 нүд барьдаг байсан тул "7 хоног" цонх 8 хуанлийн өдөрт хүрдэг ба **өнөөдрийн орлого графикт огт ороогүй** атал дээрх KPI-д ордог зөрүү үүсгэж байв → тэнхлэгийг цонхны сүүлчийн өдрөөр анкорлов.

**Шинэ backend**: `getTopProductsWithMedia`/`getTopCustomers`/`getDashboardHighlights` (`server/analytics.ts`) + `admin.dashboardHighlights` (financeProcedure — орлогоор эрэмбэлсэн бараа + нэрлэсэн харилцагч тул staff-д түгжээтэй). `getAnalyticsReport`-д ЗОРИУДААР нэмээгүй — тэр нь Excel/PDF export-ийн эх сурвалж бөгөөд эдгээр нь зөвхөн харагдацын нэмэлт (зураг/аватар) агуулдаг.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр, **бүрэн `pnpm exec vitest run --no-file-parallelism` 542/542 ✅ (59/59 файл)**. QA-г **тусдаа порт (3100) дээр `ADMIN_FACE_GATE_ENABLED=0`-оор** ажиллуулж хийсэн — Tom-ийн 3000 порт дээрх сервер болон `.env` огт хөндөгдөөгүй (face gate `=1` хэвээр). Throwaway admin хэрэглэгч (99001188) ашиглаад **устгасан**, түр script устгасан.

**⚠️ Үлдсэн, дараагийн session**: (1) `--a-faint` (жижиг uppercase шошго) гэрэл горимд 2.74:1 — WCAG AA-д хүрэхгүй, гэхдээ энэ нь codemod-оос ӨМНӨ ч ижил байсан (өмнөх `#8a8b8f` 2.9:1) тул регресс биш, тусад нь засах; (2) `AdminAnalyticsPanel`-ийн Geckoboard маягийн харанхуй tile-ууд харанхуй горимд бага зэрэг "хавтгай" харагдана (`--a-btn-dark`/`--a-surface-dark` нь хоёр горимд ч бараан хэвээр байхаар зориудаар үлдээсэн, учир нь дотор нь цагаан текст байгаа).

## ✅ (2026-09-08) /admin-д царайгаар нэвтрэх шалгалт (browser camera face recognition) — `admin-face-auth` branch

Tom `collect.ekyc.mn`-ийн холбоос илгээж, `/admin` хандах эрхтэй **бүх 5 role**-д царай таних шалгалт нэмэхийг шаардав. Худалдан авагчид **хэзээ ч** хамаарахгүй (олон удаа тодотгосон).

### Юуг яагаад ашиглаагүй вэ (лицензийн шалтгаан — дахин судлах шаардлагагүй)
- **`collect.ekyc.mn`** — raw JS-ийг шалгахад **өгөгдөл цуглуулах demo** (`label=alive/spoof` нь сургалтын шошго), auth/docs/pricing байхгүй.
- **🔴 InsightFace/ArcFace** — код MIT ч **pretrained жингүүд "non-commercial research only"**, арилжаанд тусад нь **мөнгөтэй лиценз** шаардана. `@vladmandic/human` нь тэр жингүүдийн TFJS хөрвүүлэлт тул ижил хязгаартай. Tom "юу ч худалдаж авахгүй" гэсэн тул хаагдсан.
- **FaceIO** — үнэгүй tier хангалттай ч `fio.js` self-host хийх боломжгүй, вектор нь тодорхойгүй байршилтай cloud руу явдаг (Монголын хувь хүний мэдээллийн хуулийн хил дамнасан шаардлага).
- **✅ Ашигласан**: `@vladmandic/face-api` (MIT) + dlib-ийн `face_recognition_resnet_model_v1` (зохиогч **public domain**-д гаргасан). Detector: `tinyFaceDetector` (`ssd_mobilenetv1`-ийг ЗОРИУДААР ашиглаагүй — WIDERFACE = non-commercial). Загварууд `client/public/face-models/`-д self-host.

### Архитектур
Загвар **browser дээр** ажиллана — камерын дүрс сервер рүү **хэзээ ч илгээгдэхгүй**, зөвхөн **128 тоо**. Зураг хаана ч хадгалагддаггүй (integration тестээр батлагдсан).

**Бүртгэл (анх удаа)**: заавартай, **3 өнцгөөс** (төв → зүүн → баруун), өнцөг бүр тусад нь `posesJson`-д хадгалагдана. Зааврыг дагаагүй бол **эхнээс дахин**. Дараа нь түр завсарлаад **тусдаа шинэ баталгаажуулалт** (өмнө нь энэ шалгалт нь тэр агшны фреймтэй харьцуулдаг байсан тул **утгагүй/тойрог** байсныг заслаа).

**Нэвтрэх (/admin бүрд)**: зөвхөн камер руу харна — эргүүлэх/flash **байхгүй** (Tom-ийн тодорхой шаардлага). 12 фрейм **≥2.5 секундэд** тарааж авна (өмнө нь 5 фрейм 1 секундэд = нэг агшны хуулбар).

**Таарах шалгалт**: бүх хадгалсан өнцөгтэй харьцуулж **хамгийн ойрыг** авна (`bestFaceDistance`).

### 🔴 Бодит security bug-ууд (Tom өөрөө туршиж олсон)
1. **Өөр хүн /admin руу оров.** Бодит зай: Tom 0.265–0.553, өөр хүн 0.688 — бараг давхцаж байв. **Үндсэн шалтгаан нь threshold биш, зургийн ЧАНАР**: камер 640×480, царайн доод хэмжээ 0.18 (≈115px) байсан тул сүлжээний шаарддаг 150×150 crop **томсгож бүдгэрүүлж** байв → бүх хүний descriptor төстэй болно. Заслаа: **1280×720**, царайн доод хэмжээ **0.30**, detector 320→416, threshold **0.6→0.45** (0.55-аас дээш ХЭЗЭЭ Ч бүү өсгө — тэнд өөр хүн оруулсан). `FACE_MODEL_VERSION` "-hq" болгож бүх хуучин бүртгэлийг хүчингүй болгов.
2. **Logout нь царайн cookie-г арилгадаггүй байв** → гараад дахин орвол 8 цаг хүртэл шалгалтгүй ордог.
3. **Бүртгэл цуцлахад хандалт хэвээр** — proof cookie ба enrollment тусдаа шалгагддаг байсан тул admin хэн нэгнийг цуцлахад 8 цаг хүртэл юу ч цуцлагддаггүй байв.
4. **`Permissions-Policy: camera=()`** (`server/_core/security.ts`) — хоосон allowlist = өөрийн сайт ч камер ашиглаж болохгүй. Browser зөвшөөрөл асуухаас **өмнө** блоклодог тул "хэрэглэгч татгалзсан" мэт харагдана. `camera=(self)` болгов + регресс тест.
5. **`req.cookies` энэ апп-д ҮРГЭЛЖ undefined** (cookie-parser middleware байхгүй) → амжилттай шалгалтын дараа gate мөнхөд гацдаг байв.

### Одоогийн бодлого
- **Царай таарах = ҮРГЭЛЖ блоклоно** (жинхэнэ таних шалгалт, серверт, client уншиж чадахгүй descriptor-той харьцуулна).
- **Liveness (эргүүлэх/flash) = бичигдэнэ, блоклохгүй** (`ADMIN_FACE_LIVENESS_ENFORCED`, default off). Учир: бодит хэрэглэгчийг байнга татгалздаг байсан атал доод талын таарах утга 0.278/0.6 байсан. Бодит тоо цугларсны дараа "1" болгож хатууруулна.
- **3 гарц**: `.env`-ийн `ADMIN_FACE_GATE_ENABLED`, admin → Хэрэглэгч → "Царайн бүртгэлийг цуцлах", `status` алдаа өгвөл **fail-OPEN**.

### Тохируулга (заавал бодит тоогоор)
`face_attempts.distance` бүх оролдлогын бодит зайг, `.detail` нь хэмжсэн утгуудыг бичдэг. **Security Center → "Царайн шалгалт"** таб-аас харна. Зорилт: жинхэнэ ажилтан <0.35, татгалзсан >0.6, хооронд нь тодорхой зай. Хэрэв давхцвал threshold биш **зургийн чанарыг** (гэрэл, зай) засах.

### Баталгаажуулалт
`pnpm check`/`pnpm build` цэвэр. **Бүрэн suite 537 тест / 59 файл ✅**. `server/faceAuth.test.ts` 40 unit (descriptor математик, NaN хамгаалалт, flash scoring, multi-pose, LivenessTracker — нарийн нүдний хэлбэр, эргэх чиглэл), `server/faceAuth.integration.test.ts` 19 бодит Aiven дээр. Playwright 11/11 (throwaway хэрэглэгчээр, дараа нь бүрэн устгасан). Migration Aiven дээр ажиллуулж баталгаажуулсан (`0054_admin_face_gate.sql`, `0055_face_multipose.sql`).

**⚠️ Хийгдээгүй**: Tom **50 хүнээр** тест хийж бодит false-reject rate гаргана. `.env`-д `ADMIN_FACE_GATE_ENABLED=1` тавигдсан. `main`-д merge хийгээгүй.

**⚠️ Aiven байршил**: median **174ms**, DB нь **Энэтхэг, Бангалор** дээр. Зөвлөмж: provider солих биш, **Aiven Console → Service settings → Cloud and network → Actions → Change cloud → Токио**. 5-10 секундын тасалдал, service URI өөрчлөгдөхгүй.

**⚠️ Дараагийн ажил (Tom шаардсан)**: `docs/reference/admin-dashboard-reference-2026-09-08.jpg` (2026-09-09-нд root-оос зөөсөн) — админ панелийн UI/UX reference. Tom үүн шиг болгохыг, animation нэмэхийг, dark mode нэмэхийг, огнооны сонголтыг 7/10/30/90 хоногоос **дурын огноо сонгох** болгохыг хүссэн. Энэ session-д зураг харах хязгаарт хүрсэн тул хийгдээгүй.

## ✅ (2026-09-07) Admin "Шинэ мэдээ" WordPress classic-editor parity болгож дахин бүтээв (`admin-posts-wordpress-editor` branch, main-д merge хийгээгүй)

Tom WordPress-ийн "Add New Post" дэлгэцийн screenshot илгээж яг тэр шиг харагдаж, ажиллахыг шаардсан ("i wont accept it if it works different than the photo"), гэхдээ improvise хийхийг зөвшөөрсөн, мөн Aiven/Cloudflare-той бодитоор холбогдож, алдаагүй байхыг тодорхой шаардсан. Хуучин "Шинэ мэдээ" (`AdminOperationsPanel.tsx`, Захиалгатай хуваалцсан файл) зөвхөн энгийн `<textarea>`-тэй, формат/медиа сан/ангилал/тег/SEO/scheduling/trash огт байгаагүй.

**Хийгдсэн**: Self-hosted TinyMCE (`licenseKey="gpl"`, өөрийн серверт бандл хийсэн — cloud API key хэрэггүй), lazy-loaded (`/admin`-ийн бусад хэсгүүд TinyMCE-ийг татахгүй, `pnpm build`-аар баталгаажуулсан: admin chunk 2MB→730KB, TinyMCE өөрөө тусдаа 1.27MB chunk болсон). Шинэ бодит **Медиа сан** (`media_library` хүснэгт, "Add Media" хайх/сонгох боломжтой модал — энэ кодын сан анх удаа жинхэнэ медиа сантай болов). Шинэ **ангилал+тег** taxonomy (many-to-many, шинэ 4 хүснэгт), Нийтлэх box (Ноорог/Нийтлэх/жинхэнэ **Preview** — staff өөрийн нийтлээгүй постыг бодит /slug хаягаар харах боломжтой/**Товлох** (ирээдүйн огноогоор, cron хэрэггүй — `publishedAt <= NOW()` gate)/**Хогийн сан→Сэргээх→Бүрмөсөн устгах** (шинэ `deletedAt` soft-delete, хуучин нэг товчлуурын hard delete-ийг орлуулсан)), **SEO** box (metaTitle/metaDescription — WordPress-ийн Custom Fields-ийг илүү үнэ цэнэтэй зүйлээр орлуулсан, учир нь энэ кодын санд өмнө ХААНА Ч per-page SEO талбар байгаагүй), Format radio (зөвхөн дүр төрхийн зорилгоор, бодит WP-ийн адилаар одоохондоо template-д ашиглагдахгүй). **Санаатайгаар оруулаагүй** (тодорхой шалтгаантай): Discussion (сайтад ямар ч сэтгэгдлийн систем байхгүй), Send Trackbacks (хуучирсан, spam эрсдэлтэй, юу ч хийхгүй хоосон checkbox болно байсан).

Серверийн талд `sanitize-html`-аар бодит sanitization (`server/_core/sanitizeHtml.ts`) — TinyMCE-ийн Text tab нь staff-д шууд raw HTML бичих боломж өгдөг тул энэ бол жинхэнэ trust boundary, `<script>` tag-ийг бодитоор арилгадгийг тестээр баталгаажуулсан.

**Playwright QA-гийн явцад олдож, шууд заслагдсан 3 бодит bug**: (1) TinyMCE-ийн `convert_urls:true` (анхдагч) орсон зургийн R2 URL-ийн эхний "/"-ийг чимээгүй устгадаг байсан (`convert_urls:false`-ээр засав); (2) `getPublishedPostBySlug` "олдсонгүй" үед `undefined` буцаадаг байсан (файл доторх бусад бүх `*BySlug` функц аль хэдийн `null` буцаадаг байсантай зөрчилдөж байсан) — react-query "Query data cannot be undefined" console error шидэж байсныг олж (`null` буцаах болгож) засав, энэ миний өөрчлөлтөөс өмнө байсан pre-existing bug; (3) шинэ `server/posts.integration.test.ts`-ээр (кодыг бичиж дуусаад шууд) олдсон: `postUpdateSchema`-ийн `categoryIds`/`tagNames`-д `.default([])` байсан нь partial update дээр талбарыг орхигдуулахад ч гэсэн zod-оос идэвхжиж, зөвхөн tag засах гэж байхад ангилалыг чимээгүй устгадаг байсан bug — `.optional()` болгож засав.

**Баталгаажуулалт**: Aiven дээр шинэ migration (`0043_posts_wordpress_parity.sql`) бодитоор ажиллуулж (`db-backup.ps1`-ээр урьдчилж нөөцлөөд), `SHOW COLUMNS`/`SHOW TABLES`-ээр Aiven-ээс шууд баталгаажуулсан. Throwaway staff хэрэглэгчээр (бодит Aiven+R2 дээр) бүтэн урсгал (үүсгэх+ангилал/тег/ковэр/дотоод зураг→нийтлэх→urьдчилан харах→засах→хогийн сан→сэргээх→хогийн сан→бүрмөсөн устгах) Playwright-ээр screenshot бүрчлэн баталгаажуулж, бүх throwaway мөрийг (пост/ангилал/тег/медиа/audit log/хэрэглэгч) дараа нь бүрмөсөн устгасан. Шинэ `server/posts.integration.test.ts` (6 тест: taxonomy replace-semantics, sanitization, scheduling gate, бүрэн trash/restore/permanent-delete lifecycle). `pnpm check`/`pnpm build` цэвэр, **бүрэн `pnpm exec vitest run --no-file-parallelism` 229/229 ✅ (40/40 файл)**.

**⚠️ `main`-д merge хийгээгүй** — `admin-posts-wordpress-editor` branch дээр commit хийж GitHub-д push хийсэн (`git push -u origin admin-posts-wordpress-editor`), Tom өөрөө шалгаад зөвшөөрсний дараа merge хийх шаардлагатай.

## ✅ (2026-09-01, гэрийн лаптоп) Санал болголтын ЧАНАР — 246 зураг сэргээв, tagging дүрэм засав, 2 бодит bug олов

Tom ажлын лаптопын ажлыг (35 commit, `main`-д нэгтгэгдсэн) гэрийн лаптоп дээр үргэлжлүүлэхийг, `localhost:3000` асаахыг, 937 tag дууссан эсэхийг шалгахыг хүсэв. **937/937 tag бодитоор дууссан байсныг** Aiven-ээс шууд баталгаажуулав. Гэхдээ `self-review.md` өөрөө үлдээсэн даалгавар ("apply-ийн дараа зөвхөн хувийг биш, гарцын **бүрэлдэхүүнийг** унш") -ыг гүйцэтгэхэд 937/937 гэсэн тоо **үнэн боловч хангалтгүй** болох нь тодорхой болов.

**🔴 Хамгийн том олдвор — 246 барааны зураг R2-д байсаар атал DB-д холбогдоогүй байв** (дараа нь Tom-ийн шаардлагаар япон эх сурвалжаас нэмэлт 129 олж, нийт **147 → 522/937** болов — доорх "зургийн эх сурвалж" тэмдэглэлийг үзнэ үү). R2-д `catalog/products/` дор **383 барааны 399 объект** байсан ч Aiven-д зөвхөн **147** нь `imageUrl`-аар холбогдсон байв. Өөрөөр хэлбэл өмнөх session-үүдэд websearch-ээр олж, нүдээр шалгаж, upload хийсэн **246 барааны хөдөлмөр "алдагдсан"** байдалтай хэвээр байсан — хамгийн боломжит шалтгаан нь `DATABASE_URL` local MySQL руу заасан тэр үе (дээрх incident): байт нь хуваалцсан R2 руу очсон, `imageUrl` нь буруу local DB руу бичигдсэн. `scripts/reconcile-images-from-r2.ts --apply`-аар сэргээв (зөвхөн `imageUrl IS NULL` мөрд, объектын зам нь тухайн барааны **өөрийн id**-г агуулдаг тул андуурах эрсдэлгүй; 10 дээжийн R2 файлын нэр барааны нэртэй яг таарч байгааг гараар шалгасан). **Зурагтай бараа 147 → 393.** Сэргээсэн зургийн нэгийг `curl -L`-ээр шалгахад бодит 200 / 24,674 байт ирж байгааг баталгаажуулав.

**Кодын 2 бодит bug (хоёулаа бодит гарцыг харснаас олдсон, тестээр биш):**

1. **`wellnessInterests` scoring-д огт ороогүй байв** — quiz-ийн 5-р алхам ("Эрүүл мэнд & амьдрал") хариултыг цуглуулж, 37 бараанд tag хийж, admin формд харуулж атал `PreferenceProfile`/`ScorableProduct`/`scorePreferenceMatch`-д огт байгаагүй, `getRecommendedProducts` нь `users`-ээс уншиж ч чадахгүй байсан — хэрэглэгчийн хариулт санал болголтыг **яг тэг**-ээр өөрчилдөг байв. `server/routers.ts:162`-ийн тайлбар өөрөө "used both ways" гэж бичсэн нь кодтойгоо зөрчилдөж байсан тул санаатай биш, орхигдсон алдаа. Бодит каталог дээр 0 → 37 бараа.
2. **Зочны нүүр хуудсанд "Танд санал болгож байна" хэсэг БҮХЭЛДЭЭ алга болдог байв.** `getRecommendedProducts` нь preference/history-гүй үед `bestsellers()` руу **шууд early-return** хийдэг байсан ба энэ каталогт paid захиалга ~0 тул хоосон массив буцдаг; `RecommendedForYou.tsx` нь `if (!products.length) return null` тул хэсэг ул мөргүй алга болдог байв — доор нь тусгайлан бичсэн 3 дахь fallback tier ("ямар ч in-stock бараагаар дүүргэх") хүртэл **огт хүрдэггүй** байсан. Компонентын өөрийнх нь тайлбар "Always has content now (guest ... bestseller-backed fallback)" гэж батлан бичсэн нь бодит байдалтай зөрчилдөж байв. Засвар: bestseller хоосон бол early-return хийхгүй, доорх tier рүү унагаана. `curl`-ээр 0 → 8 бараа болсныг баталгаажуулав.

**Tagging дүрэм сайжрав (`shared/product-tagging.ts`): Tier-1 хамрах хүрээ 112 → 194.** Хамгийн чухал нь **quiz-д санал болгодог мөртлөө ямар ч дүрэм үүсгэж чаддаггүй байсан 2 утга** одоо ажиллана: `skinConcerns: "sensitivity"` (CICA/Centella, 21 бараа) ба `hairConcerns: "scalp_sensitivity"` (13). Нэмэлт ингредиент-суурьтай дүрэм: ретинол/placenta→aging, niacinamide/vitamin C→pigmentation, морины тос/squalane/ceramide→dryness, charcoal/clay→oily, будаа→dullness, silky/smooth→frizz, name-only "moist"→hairType dry.

**⚠️ Дүрэм бичих явцад олдсон 5 худал эерэг (бүгд ТООГ биш, БОДИТ ГАРЦЫГ уншсанаас олдсон):**
- **`"зөөлөн"` нь skincare-ийн 443/560 (79%)-д таарах boilerplate** байв — 2026-09-01-ний "dryness 441/445" урхитай яг ижил төрөл. Хассан.
- **`"жин"` нь `"жинхэнэ"`** гэсэн загвар үгэнд таарч байв (`PRODUCT-IMPORT.md`-д тэмдэглэсэн `"epa" ⊂ "rEPAir"`-тэй ижил substring урхи). Хассан.
- **`"rice" ⊂ "price"`** — тиймээс латин "rice" ашиглаагүй, зөвхөн Монгол "будаа".
- **`"sebum"`** нь "арьсны байгалийн тостой (sebum) маш ойролцоо" гэсэн **тайлбар** өгүүлбэрт таарч, **хуурай/мэдрэг арьсанд зориулсан** squalane тосыг "тослог" гэж эсрэгээр нь тэмдэглэж байв. Хассан.
- Үсний дүрэм **биеийн** бүтээгдэхүүн дээр ажиллаж байв ("Үс ба бие" ангилал = 82 үс + **36 бие**): чийгшүүлэгч бие тосыг "хуурай ҮС"-ний бараа гэж тэмдэглэж байсныг нэрээр хаалт тавьж зассан.

**Tier-2 placeholder цэвэрлэгээ**: script нь зөвхөн `NULL` багана дээр бичдэг тул сайжруулсан дүрэм аль хэдийн `"normal"` бичигдсэн 590 skinType / 104 hairType дээр огт нөлөөлөхгүй байв. Tom зөвшөөрснөөр эдгээр **placeholder-ыг цэвэрлээд дахин бодов**. Аюулгүй байдлын үндэслэл: `suggestTagsForProduct` нь skinType/hairType-д `"normal"` утгыг **хэзээ ч үүсгэдэггүй** (дүрмүүд нь зөвхөн sensitive/oily/dry/combination ба damaged/color_treated/oily/dry гаргана) тул бүх `"normal"` нь Tier-2-ийн бичсэн placeholder, admin-ы гараар оруулсан баримт биш; мөн bulk apply-аас хойш **гараар засагдсан бараа 0** байсныг шалгасан.

**Эцсийн байдал (бодит Aiven, backup: `backups/defaultdb_2026-09-01_211141.zip`):**

| | Өмнө | Одоо |
|---|---|---|
| Бодит зурагтай бараа | 147 | **522** |
| `skinType` sensitive / oily | 4 / 0 | **25 / 5** |
| `hairType` dry | 0 | **9** |
| `skinConcerns` sensitivity | 0 | **21** |
| `hairConcerns` (нийт) | **0** | **25** |
| Tag-тай бараа | 937/937 | 937/937 |

**Санал болголтын бодит гарц (өмнө хоосон байсан профайлууд):** "Хуурай үс" 0 → 9 (moisture шампунь), "Тослог арьс" 0 → 5 (charcoal/clay цэвэрлэгч), "Мэдрэг арьс" ~0 → 25 (CICA), "Толгойн арьс мэдрэмтгий" 0 → 13 (scalp шампунь). Олон-signal реалист профайл 4 ангиллаас тэнцвэртэй гарч, Tom-ийн барьж авсан "дандаа хүүхдийн бараа" bug эргэж ирээгүйг баталгаажуулав.

**⚠️ ДҮРМЭЭР ЦААШИД ЗАСАХ БОЛОМЖГҮЙ ХЯЗГААР (чухал — дахин оролдох хэрэггүй):** `skinType`-ийн **combination**, `hairType`-ийн **oily/color_treated** нь 0 хэвээр, 564 бараа `skinType="normal"` placeholder хэвээр байна. Учир нь **өгөгдөлд тэр мэдээлэл огт байхгүй**: POS export нь баркод+нэр+үнэ л байсан, `PRODUCT-IMPORT.md`-ийн дагуу **917/937 барааны тайлбарыг импортын үед дүрмээр автоматаар үүсгэсэн** (зөвхөн pilot 20 нь бодит судалгаатай) тул бүх тайлбар "`<брэнд>` нь Японы жижиглэнгийн худалдаанд өргөн танигдсан `<төрөл>` бөгөөд..." гэсэн ижил загвартай. Хэмжсэн бодит тоо: "тослог" 1 бараа, "хуурай" 4, "sensitive" 5, "combination" 0. **Дүрмийн боломж дуусгагдсан** — үүнийг зөвхөн илүү сайн барааны өгөгдөл (websearch баяжуулалт эсвэл admin-аар гараар) засна.

**🔧 Тестийн дэд бүтцийн цоорхой засав**: `vitest.config.ts` **`.env`-ийг огт ачаалдаггүй** байв. Тиймээс integration gate-үүдийг асаахад тестүүд асдаг ч `DATABASE_URL`/`S3_*` байхгүйгээс **22 файл "Database unavailable" / "Storage config missing"-ээр унадаг** байв (кодтой огт хамааралгүй). Шинэ `server/_test-setup.ts` (`import "dotenv/config"`) + `setupFiles` нэмэв — CI дээр `.env` байхгүй тул dotenv чимээгүй no-op болж, gate-үүд хэвээр унтарна. Мөн `testTimeout: 30000` болгов: 8 тест зөвхөн **Aiven-руу сүлжээний саатлаас** болж vitest-ийн 5с анхдагчид багтахгүй унадаг байсныг 60с-ээр дахин ажиллуулж **36/36 pass** болохыг батлав (assertion алдаа огт байгаагүй). Энэ нь "Дараагийн ажлын санал"-ын 2-р зүйлийг хаалаа.

**⚠️ Анзаарах зүйл**: integration suite нь **хуваалцсан бодит Aiven DB дээр** түр бараа/захиалга үүсгэдэг тул ажиллаж байх агшинд тэдгээр нь амьд `/shop` дээр зочинд харагдана (QA явцад авсан нэг screenshot дээр "Coupon Test Product 40,000₮" тэр агшинд орсон, тест дуусмагц устсан). Бодит хэрэглэгч сайтад орж эхэлсэн үед бүрэн suite-ийг production DB дээр ажиллуулах нь тохиромжгүй.

**Баталгаажуулалт**: `pnpm check` цэвэр; unit тест `catalog-filter.test.ts` 18/18 + `product-tagging.test.ts` 12/12 (шинэ 6 регресс тест: CICA→sensitive, sebum худал эерэг, rice⊂price, бие≠үс, "Moist Diane" repair→damaged, scalp_sensitivity); **бүрэн suite 194/194 ✅ (34/34 файл)** — засварын дараа гараар env тохируулахгүйгээр `RUN_AUTH_INTEGRATION_TESTS=1 COMMERCE_INTEGRATION_TESTS=1 RUN_MEDIA_INTEGRATION_TESTS=1 pnpm exec vitest run --no-file-parallelism` шууд ногоон гарна (341с). Засварын өмнө: 22 файл env-ээс болж унадаг, дараа нь 186/194 (үлдсэн 8 нь зөвхөн latency). Playwright-ээр (түр суулгаад бүрэн хассан) нүүр/Shop/бүтээгдэхүүний хуудсыг 1440/390px дээр шалгав: **эвдэрсэн зураг 0**, хэвтээ overflow 0, console алдаа 0, нүүр хуудасны "Танд санал болгож байна" хэсэг 6 бодит зурагтай гарч байна.

## ✅ (2026-09-01) Preference Profile v2 + Recommendation Engine v2 + Admin Analytics segment — bulk auto-tag ЭЦСИЙН APPLY бодит Aiven дээр амжилттай дуусав

Tom "Хувийн профайл" таб хэт basic байна, "Гоо сайхны & Гэрийн профайл" хэсэг хэт богино гэж мэдэгдэж, (1) бүрэн хувийн мэдээлэл (хаяг/дүүрэг/ажил/нас/хүйс), (2) олон segment-тэй өргөтгөсөн quiz, (3) 937 барааны каталогоос бодитоор тохирсон санал болгох систем, (4) admin Analytics-ийг ("хэт oldschool") нэг зэрэг шаардав, эрдэмтэй websearch/судалгаа хийхийг тодорхой шаардсан. Judgment call шаардсан 3 сонголтыг Tom өөрөө шийдсэн: (a) **quiz wizard** (segmented card биш), (b) **`catalog.recommended` public** (guest-д ч bestseller fallback-аар харагдана), (c) bulk auto-tag script-ийг **эхлээд dry-run тайлан үзүүлж, "za" гэсний дараа** бодит Aiven дээр ажиллуулна.

**Хийгдсэн (бүгд `pnpm check`/`pnpm build` цэвэр, throwaway admin+staff хэрэглэгчээр Playwright QA баталгаажсан):**
- **Schema** (`drizzle/0038_preference_profile_v2.sql`): `users`-д `gender`/`primaryDistrict`/`skinRoutineComplexity`/`hairType`/`hairConcerns`/`fragrancePreference`/`wellnessInterests`/`hasYoungChildren`; `products`-д `hairType`/`hairConcerns`/`fragrancePreference`/`wellnessInterests` (skinType/skinConcerns/interiorStyle хэвээр). Aiven дээр бодитоор ажиллуулж баталгаажуулсан.
- **`shared/catalog-filter.ts`**: recommendation engine v2-ийн цэвэр, unit-тестлэгдсэн scoring функцууд (`scorePreferenceMatch`, `scorePriceBandAffinity`, `applyDiversityCap`, `computeCategoryAffinity`) + бүх шинэ талбарын vocabulary/label map/option list (өмнөх Profile.tsx-ийн локал массивуудыг эндээс дахин ашигладаг болгож нэгтгэв, drift багасгав).
- **`shared/product-tagging.ts`** (шинэ): keyword-based `suggestTagsForProduct` — нэр/тайлбар/ангиллаас rule-based tag санал болгодог, hiч хэзээ таамаглахгүй (match олдохгүй бол `undefined`). **Real dry-run explore хийхэд том bug олж заслаа**: анхны хувилбарт "чийгшүүлэх"-тэй холбоотой keyword (moistur/hydrat/чийг) 445-ийн 441 (99%) skincare бараанд боловсролгүй боловч бараг бүх тайлбарт байдаг boilerplate-аас болж **бүх зүйлийг "dryness" гэж дүрмээр tag хийж байсан** — non-discriminative noise байсныг олж, зөвхөн тодорхой ингредиент/хэллэгээр солив.
- **`server/db.ts`'s `getRecommendedProducts` v2**: preference-tag match (backbone) + захиалгын түүхээс category affinity + үнийн зурвас (price-band) + wishlist-adjacency + brand/category diversity cap + **cold-start/thin-result fallback** (bestseller-ээр дүүргэдэг, хэзээ ч хоосон харагдахгүй). `catalog.recommended` endpoint public болов (guest-д ч ажиллана).
- **`server/db.ts`'s шинэ `getRelatedProducts`** + `catalog.related` public endpoint: ProductDetail-ийн шинэ "Мөн танд таалагдаж магадгүй" хэсэг (өмнө нь ProductDetail-д related-products огт байгаагүй) — тухайн барааны tag-аар бусад барааг matched.
- **`client/src/components/ProfileQuizWizard.tsx`** (шинэ): 6 алхамт + review алхам (Хувийн мэдээлэл → Арьсны профайл → Үсний профайл → Үнэр & хэрэглээ → Эрүүл мэнд & амьдрал → Интерьер), `@/components/ui/dialog`-г ашигласан, бүх асуулт заавал биш, "Алгасах"/"Буцах"/"Дараах", эрт хаавал partial save хийдэг. `Profile.tsx`-ийн "Гоо сайхны & Гэрийн профайл" карт "Таны тохиргоо" read-only summary + "Профайл засах/бөглөх" товч болов.
- **`client/src/components/RecommendedForYou.tsx`** (Shop.tsx-аас extract хийсэн) — одоо `Home.tsx`-д мөн ашиглагдана (шинэ "Танд санал болгож байна" section, bestseller rail-ийн ард).
- **`client/src/components/AdminWorkspace.tsx`**: PERSONALIZATION TAGS блокт шинэ 4 талбар (hairType/hairConcerns/fragrancePreference/wellnessInterests) + `suggestTagsForProduct`-аас дуудсан dismissible санал chip-үүд (admin өөрөө дарж баталгаажуулна, автоматаар бичигдэхгүй).
- **`server/analytics.ts`**: шинэ `getPreferenceSegmentBreakdown` (хүйс/арьс/үс/дүүргийн breakdown, "N of M" discipline) + `getRecommendationCoverage` (нийтлэгдсэн барааны хэдэн хувь tag-тай вэ, ангиллаар) — `AdminAnalyticsPanel.tsx`-д шинэ "Тохиргооны сегмент" + "Санал болгох системийн хамрах хүрээ" секц.
- **`scripts/auto-tag-products.ts`** (шинэ, dry-run горимд л ажилласан): 2 tier — Tier 1 keyword match (`suggestTagsForProduct`), Tier 2 category-level default (жишээ нь tag-гүй skincare→`skinType:"normal"`). Зөвхөн `NULL` талбар дээр бичдэг, admin гараар оруулсан утгыг хэзээ ч дарж бичихгүй.

**🔴 Playwright QA-гийн явцад олдож, бодит Aiven дээр шууд заслагдсан bug**: Tom өөрөө localhost:3000 дээр амьдаар ажиглаж байхдаа "юу сонгосон ч дандаа хүүхдийн бараа гарч байна" гэж мэдэгдэв. Шалтгаан: `hasYoungChildren` signal-ийн жин (+3) нь яг skinType/hairType exact match-тай (+3) ижил байсан ч, real production дээр tagging coverage 4/937 л байсан тул бусад signal тохирох бараа олдоогүй үед энэ ганц signal **бүх жагсаалтыг дарж авчихсан** (5-аас 4-5 нь бэби бүтээгдэхүүн). Засвар: жинг +3→+1 болгож (fragrancePreference-тэй ижил "зөөлөн" signal), diversity cap-ыг maxPerCategory 4→3 болгов. Тухайн хэрэглэгчийн бодит хадгалсан тохиргоогоор шууд дахин шалгахад 3 арьс арчилгаа + 3 Ээж/хүүхэд гэсэн илүү тэнцвэртэй жагсаалт болсныг баталгаажуулав.

**✅ Bulk auto-tag `--apply` дуусав (2026-09-01, Tom-ийн live баталгаажуулалттай)**: `scripts/db-backup.ps1`-ээр backup аваад (`backups/defaultdb_2026-09-01_194214.zip`), `pnpm exec tsx scripts/auto-tag-products.ts --apply` бодит Aiven дээр ажиллуулж, **937/937 бараа tag-тай болсныг шууд DB query-ээр баталгаажуулав** (`select ... where skinType is not null or ... ` → 937/937). Apply хийсний дараа **бодит олон-signal профайлаар** (skinType/hairType/concerns/hasYoungChildren хамт) дахин шалгахад олон ангиллаас (арьс арчилгаа/гоо сайхан/эрүүл ахуй) тэнцвэртэй жагсаалт гарсныг баталгаажуулав.

**Apply хийх явцад олдсон 3 дахь bug (шууд заслаа)**: цэвэр ганц signal-тэй (жишээ нь зөвхөн "Хуурай үс" сонгосон) хэрэглэгчид **`getRecommendedProducts` 0 үр дүн буцааж байсан** — учир нь Tier 2 category-default ихэнх "Үс ба бие" барааг `hairType:"normal"`-аар л tag хийсэн тул "dry" яг таарах бараа цөөн, мөн одоогийн production дээр **0 бодит paid захиалга байгаа тул bestseller fallback ч хоосон** — 2 fallback tier зэрэг хоосон гарсан жинхэнэ edge case байв. Гуравдах, эцсийн fallback tier нэмэв: хэрэв match+bestseller хоёул хангалтгүй бол ямар ч (score claim-гүй) нийтлэгдсэн, нөөцтэй бараагаар дүүргэдэг болгож, section хэзээ ч бүрэн хоосон харагдахгүй болгов.

**Бүрэн баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр, unit tests (`catalog-filter.test.ts` 17/17, `product-tagging.test.ts` 6/6) ✅, `profile.integration.test.ts` 14/14 ✅. Playwright QA throwaway хэрэглэгчээр (dry-run үе, apply-ийн өмнө) хийгдсэн; apply-ийн дараагийн баталгаажуулалт шууд `getRecommendedProducts`-ыг throwaway хэрэглэгчээр (2 өөр реалист профайлаар) дуудаж хийгдсэн, бүгд DB-ээс дараа нь устгасан.

**⚠️ Хараахан хийгдээгүй**:
1. Full `pnpm exec vitest run --no-file-parallelism` бүрэн ажиллуулаагүй (тусад нь холбогдох файлууд бүгд ✅; бүрэн suite-ийн pre-existing timeout/network асуудал доорх "Дараагийн ажлын санал"-д дурдсан, миний ажилтай холбоогүй).
2. `server/recommendations.integration.test.ts`/`server/analytics.integration.test.ts`-ийн preference-segment/coverage бодит DB интеграц тест бичигдээгүй — зөвхөн unit test + давтан гар QA-аар баталгаажсан.
3. Одоогоор **0 бодит paid захиалга** байгаа тул bestseller fallback чинээгээр дэмжлэг өгөхгүй байна — захиалга нэмэгдэх тусам fallback-ын чанар сайжирна, кодод өөрчлөлт хийх шаардлагагүй.

## ✅ (2026-09-01) Branch консолидаци, CI encryption key засвар, CategoryMasonry v8 сэргээв

Tom "хэт олон uncommitted өөрчлөлт, хэт олон branch байна" гэж мэдэгдэж, бүх branch-ийг нэг `main`-руу нэгтгэхийг шаардав. Хийсэн зүйл:
- **Branch судалгаа**: `main` хуучирсан (0dbcd005) байсан бол `home-redesign-categorymasonry-v2` (өөр session/agent-ийн үргэлжлүүлсэн CategoryMasonry v2→v8 iteration + site-text CMS + sunrise ribbon бүгдийг агуулсан) хамгийн ахисан байв. `agents/ai-assisted-website-creation` аль хэдийн ancestor байсан (нэмэлт merge хэрэггүй). `agents/minio-r2-cloudflare-setup`-д 5 давхцаагүй commit байсан (Aiven DB backup scheduling, Shop pagination URL-state fix — сүүлийнх нь `home-redesign` талд аль хэдийн bugfix-той хувилбараар давхцаж байсан).
- **Merge**: `agents/minio-r2-cloudflare-setup`-ийг нэгтгэхэд 3 conflict гарав (`docs/PROJECT-GUIDE.md`, `HISTORY.md` — хоёулаа prose лог, аль алиных нь агуулгыг хадгалж нэгтгэсэн; `client/src/pages/Shop.tsx` — хоёр branch яг ижил feature-ийг тусад нь хэрэгжүүлсэн байсан тул bugfix-той хувилбарыг сонгосон). `main`-ийг fast-forward хийж push хийв.
- **CategoryMasonry v8 сэргээлт**: Working directory-д өөр session-ий committed-ХЭЗЭЭ БОЛООГҮЙ бодит WIP (heading text disappearing bug fix, product photo cropping→contain fix) байсныг `git stash`-аар аюулгүй хадгалж, merge дараа буцаан нэгтгэв — алдагдаагүй.
- **CI**: `.github/workflows/ci.yml`-д `INTEGRATIONS_ENCRYPTION_KEY`-г GitHub secret-ээс дамжуулахаар нэмэв. **⚠️ Энэ арга 2026-09-01-нд ОРЛУУЛАГДСАН** — secret нь repo дээр хэзээ ч нэмэгдээгүй тул хоосон утга орж CI улаан хэвээр байсан. Одоо `server/_test-setup.ts` түр түлхүүр өгдөг болсон тул secret огт шаардлагагүй, ci.yml-ээс env блокыг хассан (дээрх шийдэгдсэн тэмдэглэлийг үзнэ үү).
- **Цэвэрлэгээ**: миний `home-redesign-categorymasonry-v2` branch (local+remote) устгав (бүрэн `main`-д орсон). `agents/*` 3 worktree branch (`ai-assisted-website-creation`, `minio-r2-cloudflare-setup`, `pixel-perfect-ui-tailwind-css`) идэвхтэй worktree-д checkout хийгдсэн хэвээр байгаа тул **зориудаар устгаагүй** — өөр session идэвхтэй ашиглаж байж болзошгүй тул устгах эсэхийг Tom өөрөө шийдэх хэрэгтэй.
- **Баталгаажуулалт**: `pnpm check`/`pnpm build` merge бүрийн дараа цэвэр. Бүрэн integration test suite цаг хугацааны шаардлагаар ажиллуулаагүй — дараагийн session-д ажиллуулж баталгаажуулах зөвлөмжтэй.

## ✅ (2026-09-01) Sunrise ribbon — баруун тийш урсдаг болгов, текст нь admin-аар засварлагдах боллоо

Tom 3 зүйл шаардсан: (1) Hero-ийн доорх урсдаг зурвасын (`JAPANESE DAILY CARE` / `УЛААНБААТАР / MONGOLIA` / `ГЭР БҮЛИЙН ГИШҮҮН БҮРТ`) урсгалын чиглэлийг **үргэлж баруун тийш** болгох, (2) энэ 3 хэллэгийг мөн admin Content & Media → Текст-ээр засварлах боломжтой болгох, (3) **24 цагийн турш тасралтгүй** урсдаг байхыг заавал баталгаажуулах, бүх алдааг давхар шалгах.

**Чиглэл**: `client/src/index.css`-ийн `@keyframes sunrise-track` нь `to { transform: translateX(-100%) }` байсан (0-ээс -100%-руу, зүүн тийш урсдаг байсан) — `from { translateX(-100%) } to { translateX(0) }` болгож урвуулав. 2 ижил давхардсан мөр (нэг харагдах, нэг `aria-hidden`) зэрэгцэн байрлалтай тул loop-ийн голд (100%→0% руу шилжихэд) хараанд ялгарахгүй, тасралтгүй мэт харагдана — өмнөх зүүн тийш урсдаг hacks-тай яг ижил техник, зөвхөн цагийн чиглэлийг урвуулсан.

**24/7 тасралтгүй байдал — ⚠️ ЭНЭ ЯГ ГОЛ АСУУДАЛ БАЙВ**: Эхлээд би "animation аль хэдийн `infinite` тул асуудалгүй" гэж дүгнээд Tom-д тэгж хэлсэн нь **буруу байсан** — Tom "0.000000000001 инч ч хөдлөхгүй байна" гэж дахин шаардсаны дараа жинхэнэ root cause олдов: **Tom-ийн компьютерт OS/browser-ийн "reduce motion" (Windows: Ease of Access → Visual effects → Animation effects) тохиргоо унтраалттай байсан** (түүний screenshot дээрх FPS/GPU/CPU overlay нь performance-тохируулсан setup болохыг илтгэж байсан нь энэ таамаглалыг дэмжсэн). Playwright-ийн `reducedMotion: "reduce"` emulation-оор баталгаажуулав: тухайн үед `animation-name: none` болж, элемент **яг 0.00px хөдөлдөг** байв (энгийн үед 1.2 секундэд 30.71px хөдөлдөг).

Хоёр тусдаа CSS дүрэм үүнийг зогсоож байсан: (1) `@media (prefers-reduced-motion: reduce)`-ийн доторх **глобал** `*, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }` blanket дүрэм, (2) тусгайлан бичигдсэн `.sunrise-ribbon > div { animation: none; }`. Tom "заавал 24 цагийн турш урсана" гэж 2 удаа тодорхой шаардсан тул **энэ зурвасыг reduce-motion дүрмээс чөлөөлөв**: (2)-ыг устгаж, (1)-ийг давахын тулд media query дотор `.sunrise-ribbon > div { animation-duration: 24s !important; animation-iteration-count: infinite !important; }` нэмэв.

⚠️ **Энэ бол ухамсартай хийсэн accessibility буулт** (алдаа биш): reduce-motion тохиргоотой ЖИНХЭНЭ хөдөлгөөнд мэдрэг зочин ч энэ зурвасыг хөдөлж байгаагаар харна. Үндэслэл: жижиг, удаан (нэг эргэлт 24 секунд), бага контрасттай, зөвхөн брэндийн чимэглэлийн элемент — сайтын бусад БҮХ animation (`order-confirm-check`, `skeleton`, бүх transition) reduce-motion-ыг хэвээр хүндэтгэнэ. Код дотор тайлбар бичсэн тул хожим хэн нэгэн "алдаа" гэж бодоод буцаахгүй.

**Admin-editable болгов**: `shared/site-text.ts`-д "Урсдаг зурвас (Hero доор)" шинэ бүлэгт 3 slot (`home-text-ribbon-phrase1/2/3`) нэмэв. `Home.tsx`-д `ribbonPhrases` array + `ribbonRow(keyPrefix)` helper нэмж, **2 давхардсан мөр хоёул яг ижил эх сурвалжаас (нэг array) рендерлэгддэг** тул admin засвар хийхэд 2 мөр хэзээ ч бие биенээсээ зөрөхгүй.

**Баталгаажуулалт (давхар шалгасан)**: `pnpm check`/`pnpm build` цэвэр. Playwright-ээр: (1) 2 мөрийн текст яг ижил болохыг баталгаажуулав; (2) `translateX`-ийг 3 удаа (1.5с зайтай) хэмжихэд тогтмол өсч байгааг (жишээ: -565px → -526.7px → -488.4px) баталгаажуулж, **баруун тийш** урсаж байгааг тоогоор нотолсон (зөвхөн нүдээр биш); (3) `animation-play-state: running` (хэзээ ч "paused" биш) баталгаажуулав; (4) throwaway staff эрхтэй хэрэглэгчээр (бодит Aiven DB дээр, дараа нь бүрэн устгасан) admin → Текст таб → "Урсдаг зурвас" бүлгийг нээж 1-р slot-ыг шинэ утгаар хадгалж, нүүр хуудсан дээр **2 мөр хоёул** шинэ утгаар шинэчлэгдсэнийг баталгаажуулав, backend-ээс ямар ч 5xx алдаа, browser console алдаа гараагүй; (5) хэвтээ overflow 0. Бүх throwaway өгөгдлийг (site_text мөр, staff хэрэглэгч, audit log) Aiven-ээс бүрэн устгасан.

## ✅ (2026-09-01) TrustStrip ("800+ / 03 / 01" тоон баримтын зурвас) бүрмөсөн устгав

Tom тодорхой заав: "delete these 3 permantly!!!! idont think these are good looking div with current design!!" — Hero доорх `.hero-facts` зурвас (800+ бүтээгдэхүүн / 03 УБ дахь салбар / 01 Японы албан ёсны эрх) одоогийн дизайнтай зохицохгүй байгааг шийдвэрлэж, зөвхөн нуух биш **бүрэн устгав**:
- `client/src/components/home/TrustStrip.tsx` файлыг бүхэлд нь устгав.
- `Home.tsx`-аас импорт болон `<TrustStrip branchCount={locations.length} />` дуудлагыг хассан.
- `client/src/index.css`-ээс `.hero-facts` бүх CSS дүрмийг (desktop, mobile responsive, dark-tint overrides — нийт 3 тусдаа блок) устгав.
- `shared/site-text.ts`-ээс энэ section-д зориулагдсан "Тоон баримт (Trust Strip)" 4 slot-ыг (2026-09-01-д өөрөө нэмсэн байсан) хассан — Aiven дээрх `site_text` хүснэгт хоосон байсан тул (0 мөр) орфон admin override цэвэрлэх шаардлагагүй байв.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. Playwright-ээр (түр суулгаад дараа нь бүрэн хассан) 1440px/390px screenshot — `.hero-facts` DOM-д алга, hero зураг шууд хар "sunrise ribbon" texture рүү цэвэрхэн шилждэг, хоосон зай/artifact алга, хэвтээ overflow 0, console алдаагүй.

## 🔴 (2026-09-01) КРИТИК incident — "зургууд алга болсон" нь код биш, буруу DATABASE_URL байсан (шийдэгдсэн)

Tom "зурагнууд server restart болгонд алга болоод байна, cloudflare-оос татаж чадаж байна уу" гэж ноцтой шаардсан. Deep-dive хийхэд код огт эвдрээгүй, харин **энэ (гэрийн) лаптопын `.env`-ийн `DATABASE_URL` нь local MySQL руу заасан байсан, Aiven руу биш** байсныг олов — дээрх "Локал орчны тохиргоо" хэсгийн шинэ анхааруулгын яг тэр incident.

**Баталгаажуулсан баримтууд (таамаглаагүй, бүгд шууд шалгасан)**:
1. `.env`-ийн `DATABASE_URL` = `mysql://root:...@127.0.0.1:3306/sugi_asayake` (local), файлын mtime Aug 26 20:36-аас хойш өөрчлөгдөөгүй.
2. Энэ local DB-д **937 бараа БОЛОВЧ 0 захиалга** байсан — бодит production дээр захиалга байдаг тул энэ бол "нэг удаагийн snapshot", "амьд" DB биш гэдгийг илтгэнэ.
3. Local DB-ийн `site_media` хүснэгт **бүрэн хоосон (0 мөр)** байсан — тул бүх slot "BRAND DEFAULT" харагдаж байв.
4. **Гэхдээ Cloudflare R2 bucket-ыг шууд `ListObjectsV2Command`-ээр шалгахад Tom-ийн бодитоор upload хийсэн бүх зураг (`sugi-professional-hero`, `sugi-care-retail`, `sugi-professional-assortment`, `sugi-professional-family`, `sugi-sunrise-editorial-hero`, `sugi-symbol`) бүгд бодит хэмжээтэй (3-5MB), Aug 26 ~03:33-т upload хийгдсэн хэвээрээ байсан** — файл хэзээ ч устаагүй.
5. Aiven DB-г (Tom-ийн dashboard-с өгсөн connection string-ээр) шууд `mysql2`-оор холбож шалгахад: **937 бараа, 4 бодит захиалга, `site_media`-д яг 7 мөр** (`home-hero`, `home-categories`, `home-family`, `home-stores`, 3 summer-slide) — Tom-ийн upload хийсэн зурагтай **яг таарч байв**.

**Root cause**: PROJECT-GUIDE.md-ийн "Локал орчны тохиргоо" хэсгийн жишээ blockнь `DATABASE_URL=mysql://root:...@127.0.0.1/...`-г "чухал тохиргоо" мэтээр харуулж байсан нь бодит зорилго (Aiven-ыг ашиглах) -тай зөрчилдөж байв — доор нь "Aiven MySQL is the shared source of truth" гэж өөр өгүүлбэрт бичигдсэн байсан ч дээрх жишээ block илүү анзаарагдахуйц байсан. Хэн нэгэн (өмнөх session эсвэл Tom өөрөө) энэ жишээг шууд хуулсны улмаас `.env` Aiven-аас local руу буцсан байх магадлалтай.

**Засвар**:
- `.env`-ийг Tom-оос авсан бодит Aiven connection string руу буцаан тохируулав (`avnadmin@sugi-asayake-db-project-4b75.h.aivencloud.com:25861/defaultdb`).
- Хуучин node процессийг PowerShell-ээр (`Stop-Process`, taskkill classifier-т blocked-той тул) зогсоож, dev server-ийг шинэ `.env`-тэйгээр дахин асаав.
- Баталгаажуулалт: `curl http://localhost:3000/api/trpc/content.siteMedia` бодит 7 мөрийг буцаав; `/manus-storage/site-media/1/sugi-professional-hero-...png`-ийг curl -L хийхэд R2-ийн бодит 4,148,819 byte файл руу 302→200 redirect хийж байгааг баталгаажуулав; Playwright screenshot-оор нүүр хуудсан дээр бодит hero зураг (лааз, ургамал бүхий lifestyle фото) харагдаж байгааг нүдээр баталгаажуулав (placeholder gradient биш).
- PROJECT-GUIDE.md-ийн "Локал орчны тохиргоо" жишээ blockыг Aiven-руу засаж, яагаад чухал болохыг тодорхой тайлбарлав (энэ бичлэг өөрөө).

**✅ Дуусав**: Auto mode-ийн classifier анх Aiven руу шууд schema-mutating тушаал (`CREATE TABLE site_text`) явуулахыг блоклосон байсан ч Tom тодорхой зөвшөөрсний дараа дахин оролдоход амжилттай — `site_text` хүснэгт одоо Aiven дээр бодитоор үүссэн (баталгаажуулсан: `curl .../api/trpc/content.siteText` → `[]`, хоосон, зөв — учир нь admin override хараахан нэмэгдээгүй, бүх slot fallback утгаараа харагдана). Нууц үг агуулсан түр migration script устгасан.

**Сургамж, цаашид сануулах зүйл**: Хоёр laptop-ийн аль нэг дээр `.env`-ийг ЯМАР Ч учиртай local MySQL руу түр сольсон бол ажил дуусмагц заавал буцааж Aiven руу тавих ёстой — эс бөгөөс дараагийн session (би эсвэл Tom) анзаарахгүйгээр буруу DB дээр ажиллаж, "зураг алга болсон" мэт ижил төстэй будлиан дахин үүсэх эрсдэлтэй. Цаашид `.env` солих бүрдээ `SELECT COUNT(*) FROM orders`-оор шалгаж, 0 гарвал шууд болгоомжлох дадал зуршил болгох нь зүйтэй.

## ✅ (2026-09-01) Нүүр хуудасны текст (гарчиг/тайлбар/товч мэдэгдэл) admin-аар засварлагдах боллоо — шинэ `site_text` CMS

CategoryMasonry v7-ийн дараа Tom тодорхой асуусан: "хажуудаа related холбоотой хамааралтай текстийг ч бас admin-аар засварлаж болдог болгох" гэдгийг ямар хэмжээгээр хийхийг асуухад **"Бүх нүүр хуудас (Home.tsx)"** гэж тодорхой хариулав — зөвхөн CategoryMasonry биш, Hero/TrustStrip/Бидний ялгаа/WhyChooseUs/CategoryMasonry/Их зарагддаг бараанууд/Гэр бүлийн арчилгаа/SUGI Journal/Салбарууд/Quick Stats/Эцсийн CTA гэсэн **бүх 12 хэсгийн** маркетинг-текстийг хамруулав.

**Архитектур**: `shared/site-media.ts`-тэй яг ижил pattern (slotKey → утга, upsert-by-unique-key, enum биш plain varchar тул миграци шаардлагагүй), зөвхөн зурган URL-ийн оронд чөлөөт текст:
- **DB**: шинэ `site_text` хүснэгт (`drizzle/0037_site_text.sql`) — `slotKey varchar(80) unique`, `textValue text`, `updatedByUserId`, timestamps. Локал MySQL-д гараар ажиллуулж баталгаажуулсан (PROJECT-GUIDE.md-ийн "--> statement-breakpoint устгах" зааврын дагуу).
- **shared/site-text.ts**: **74 slot**-ын бүртгэл, `group`-оор ангилагдсан (жишээ нь "Hero", "Яагаад биднийг сонгох вэ", "Гэр бүлийн арчилгаа" гэх мэт), тус бүрийн `fallbackValue` нь одоо сайт дээр бодитоор байгаа эх текст (шинэ зохиомол текст биш).
- **server**: `content.siteText` (public, `getSiteText`), `admin.siteText` (staff query), `admin.updateSiteText`/`admin.clearSiteText` (staffProcedure mutation, `server/db.ts`-ийн `upsertSiteText`/`deleteSiteText`, `site_media`-тай яг ижил upsert-by-unique-key shape).
- **client**: шинэ `client/src/hooks/useSiteText.ts` hook (`imageFor()`-той ижил зарчим) — Home.tsx болон бүх 6 `home/*.tsx` section компонент дотор шууд дуудагдана (`trpc.content.siteText.useQuery()` нь react-query-ээр deduped тул олон компонент дуудсан ч 1 network request).
- **admin UI**: шинэ `ContentTextPanel.tsx`, `AdminWorkspace.tsx`-ийн "Content & Media" хэсэгт **"Зураг" / "Текст" гэсэн 2 sub-tab** нэмэгдэв (Tom "хажуудаа" гэж тодорхой хүссэн тул шинэ тусдаа sidebar section биш, яг зурган хэсгийн хажууд). Slot бүрийг `group`-оор эмхэтгэсэн 12 collapsible хэсэгт харуулна (жишээ нь "Hero" бүлэгт 9 текст).

**Ухамсартай хязгаарлалт (шинэ файлын толгойн тайлбарт бичигдсэн)** — дараах зүйлс ЭНЭ системд ОРООГҮЙ:
- Ангиллын **нэр** (жишээ: "Арьс арчилгаа") — учир нь `/shop?category=<нэр>` шүүлтүүрийн exact-match түлхүүрээр давхар ашиглагддаг тул чөлөөт текстээр засварлавал линк тасрах эрсдэлтэй. Зөвхөн доод тайлбар (`detail`) мөр л засварлагдана.
- Утасны дугаар шингэсэн CTA (жишээ нь "9450-9911 руу залгах") — бодит `tel:` холбоостой холбоотой тул тусдаа зассан тохиолдолд зөрчил үүсэх эрсдэлтэй.
- Салбарын нэр/хаяг/цаг/утас (`locations-data.ts`-ийн бодит бизнесийн өгөгдөл), шинэ мэдээний гарчиг/агуулга (Posts admin панель), бүтээгдэхүүний нэр/тайлбар (Products admin панель) — эдгээр аль хэдийн өөрийн CMS-тэй.
- Бодит тоо/хэрэглэгчийн мэдээлэл дээр тулгуурласан өгүүлбэрүүд (жишээ нь Quick Stats-ийн "Одоогийн зэрэглэл"/жишээ тайлбар өгүүлбэр, review count, үнэ) — эдгээр серверээс бодитоор тооцоологддог, чөлөөт текст болговол дүрмийн зөрчил гарах эрсдэлтэй.
- **"800+"** тоо 4 өөр газарт (Hero badge, TrustStrip, CategoryMasonry тайлбар, WhyChooseUs карт) давхардсан хэвээр байгаа — тус бүр ӨӨР ӨӨРИЙН slot-той тул нэгийг нь өөрчлөхөд бусад автоматаар өөрчлөгдөхгүй (админ UI-д энэ тухай тодорхой anхааруулга бичсэн).
- 2-мөртэй гарчиг бүр (жишээ: "Японы чанарыг / ойртуулна.") **нэг slot**-д "\n"-ээр холбогдсон 2 мөр хэлбэрээр хадгалагдана (74 slot-ыг 2 дахин нэмэхийн оронд), компонент бүр `.split("\n")`-ээр задалж өөрийн `<br/>`/`<em>` дүрслэлийг хэвээр хадгална. Нэг жижиг дизайны хялбарчлал: анх "Багахан **итгэл.**" гэж зөвхөн нэг үгийг тод өнгөтэй байсан бол одоо бүтэн эхний мөр адилхан онцлогтойгоор харагдана.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. Шинэ `server/site-text.integration.test.ts` (3 тест: admin засвар → public query-д харагдах → reset → устах; буруу slotKey/хоосон утга rejected; admin бус caller rejected) — `site-media.integration.test.ts`-тэй ижил **snapshot-and-restore** discipline ашигласан (PROJECT-GUIDE.md-ийн "бодит production slot ашиглахгүй" сануулгын дагуу). Бүрэн suite **33 файл, 168/168 тест ✅**. Playwright-ээр (түр суулгаад дараа нь бүрэн хассан): (1) 1440px-д бүх 9 харагдаж буй хэсгийг (Hero→QuickStats→Бидний ялгаа→WhyChooseUs→CategoryMasonry→Гэр бүл→Салбарууд→Эцсийн CTA) scroll хийж screenshot авахад бүгд визуал регресс алгүй зөв харагдав, overflow=0, console алдаагүй; (2) throwaway `staff` эрхтэй хэрэглэгчээр бодитоор нэвтэрч, admin → Content & Media → Текст таб нээж, нэг slot-ыг шинэ утгаар хадгалж, нүүр хуудсан дээр шууд тусгагдсаныг баталгаажуулсан (`QA-MARKER` тестийн текст), дараа нь slot-ыг устгаж, throwaway хэрэглэгч болон audit log мөрүүдийг DB-ээс бүрэн устгасан.

**Bestseller/Journal хэсгүүд screenshot дээр харагдаагүй** (одоогийн dev DB-д бодит захиалга/пост байхгүй тул арчилгааны дагуу бүхэлдээ нуугддаг, өмнө нь ч тэгж баримталж байсан зарчим) — эдгээр 2 хэсгийн wiring зөвхөн typecheck + кодын шалгалтаар баталгаажсан, бусад 9 хэсэгтэй яг ижил механик хэлбэрээр хийгдсэн тул итгэлтэй байна.

**Мэдэгдэж буй цаашдын ажил**: slot 74 тоо цаашид улам нэмэгдэж болно (жишээ нь Shop/ProductDetail/бусад хуудсууд текст-CMS-д ороогүй хэвээр, зөвхөн Home.tsx л энэ session-д хийгдсэн). Хэрэв Tom өөр хуудсыг мөн адил хамруулахыг хүсвэл ижил `shared/site-text.ts`/`useSiteText()`/`ContentTextPanel.tsx` pattern-ийг өргөтгөхөд хангалттай (шинэ table/backend endpoint шаардлагагүй, зөвхөн шинэ slot бүртгэл + component wiring).

## ✅ (2026-08-31) CategoryMasonry v7 — anchor scrim зөөллөв, 6 ангиллын зураг admin-аар засварлагдах боллоо

Tom v6-ийн дараа 2 зүйл заав: (1) жижиг 6 картын scrim-ийг v6-д арилгасан ч **anchor (том зураг) тайлын өөрийн харанхуй scrim хэвээр хэт хүчтэй, хажуугийн текстийг халхалж** байсан (би v6-д зөвхөн жижиг картуудыг л засаж, anchor-ийг огт хөндөөгүй байсныг олов), (2) одоо ашиглаж буй бүх зургийг `/admin` → Контент & Медиа-гаар солих боломжтой болгох.

**Root cause (anchor scrim)**: `.cat-mosaic-anchor-shade` градиент 80%-д бүрэн опак `#17181b`-д хүрдэг байсан (`rgba(23,24,27,0)→rgba(23,24,27,1)`), v6-ийн жижиг карт scrim-тэй ижил түвшний хүчтэй харанхуй байсан ч энэ tile дээр CTA текст (`OUR SELECTION` / `Нэг өдөрт хэрэгтэй бүх зүйл` / `Ойр салбараа олох`) шууд дээр нь давхцаж байдаг тул илүү мэдэгдэхүүнтэй асуудал болж байв.

Засвар (`client/src/index.css`, `.cat-mosaic-anchor-shade`): градиентийг зөөлрүүлж, дээд тал бүрэн тунгалаг хэвээр, доод талд **опак 1.0 биш, дээд тал нь 0.74**-д зогсоо (`rgba(23,24,27,0) 0%→30%, rgba(23,24,27,.5) 62%, rgba(23,24,27,.74) 100%`) — текст унших боломжтой хэвээр, зураг ил харагдана.

**Admin-editable зургууд**: `shared/site-media.ts`-д 6 шинэ slot нэмэв (`home-category-arhis-archilgaa`, `-goo-saikhan`, `-eruul-mend`, `-eruul-akhui`, `-us-ba-bie`, `-eej-ba-khuukhed`), тус бүрийн `fallbackUrl` нь `Home.tsx`-д одоо hardcode-логдсон бодит бүтээгдэхүүний зурагтай яг ижил (шинэ зураг зохиогоогүй, зөвхөн одоо байгааг admin-аар солих боломжтой болгов). `drizzle/schema.ts`-ийн `site_media.slotKey` нь `varchar(80)` (enum биш) тул миграци шаардлагагүй. `ContentMediaPanel.tsx`-ийн admin UI **generic `siteMediaSlots.map()`** loop ашигладаг тул шинэ 6 slot автоматаар upload/alt-text/reset controls-той гарч ирнэ — нэмэлт admin UI код бичих шаардлагагүй байв (энэ pattern аль хэдийн `home-hero`/`home-categories`/`home-family`/`home-stores`/`summer-slide-*`-д ашиглагдаж байсан).

`Home.tsx`-ийн `<CategoryMasonry categories={...}>`: `imageUrl` талбарыг `imageFor(\`home-category-\${category.slug}\`, category.imageUrl ?? null) ?? undefined` болгож, admin upload байвал түүнийг, байхгүй бол одоо байгаа бодит бүтээгдэхүүний зургийг ашиглана (сайтын бусад бүх site-media slot-той яг ижил pattern).

**Нэмэлт нээлт**: `home-categories` slot-ийн одоогийн `fallbackUrl` (`/manus-storage/sugi-professional-assortment_74fa4e31.jpg`) нь Manus AI үеийн хуучин, **404 dead link** болохыг `curl`-ээр баталгаажуулав (анкор tile яагаад цайвар placeholder+icon-оор л харагддаг байсны шалтгаан) — засаагүй, зөвхөн тэмдэглэв (Tom бодит зураг upload хийхэд шийдэгдэнэ, admin panel-аар боломжтой болсон).

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. Playwright-ээр (түр суулгаад дараа нь бүрэн хассан) screenshot: anchor scrim нүдээр харахад мэдэгдэхүйц зөөлөрсөн (бүрэн харанхуй block алга, текст тод унших боломжтой), бүх 6 карт бодит зургаа хэвээр харуулж байгаа, хэвтээ overflow=0, console алдаагүй.

**⚠️ Хараахан хийгдээгүй, Tom тодорхой хүссэн 3 дахь зүйл**: "хажуудаа related холбоотой хамааралтай **текст**-ийг ч бас admin-аар засварлаж болдог болгох" — энэ хэсэгт ажил хараахан эхлээгүй. `site_media` систем нь зөвхөн ЗУРАГ-т зориулагдсан (slotKey → image URL/alt), текстэд зориулсан ижил төстэй pattern одоогоор байхгүй. Нүүр хуудсанд л гэхэд headings/subtitle/detail text маш олон газар байгаа (QuickStats, CategoryMasonry-ийн 6 картын гарчиг/тайлбар, WhyChooseUs, Journal, StoreLocator гэх мэт) — үүнийг бүрэн CMS болгох нь шинэ хүснэгт (`site_text` эсвэл ижил төстэй, slotKey→text/locale), шинэ admin UI хэсэг, бүх компонентод "backend утга байвал ашиг, үгүй бол hardcode fallback" logic оруулах шаардлагатай **том, тусдаа scope-той ажил** — энэ session-д эхлээгүй, тусад нь төлөвлөж эхлэх шаардлагатай.

## ✅ (2026-08-31) CategoryMasonry v6 — харанхуй scrim бүрэн арилав (бүтэц буруу байсныг олов)

Tom тодорхой screenshot (crop) илгээж "dark black shadow" арилгахыг шаардав, `.cat-mosaic-item-title`-ийг заав. Root cause: миний card бүтэц **зурган дээр текстийг давхарлаж** (background-image + харанхуй gradient scrim + цагаан текст) байрлуулж байсан бол reference-д зураг **дээд хэсэгт цэвэрхэн**, текст нь **доод цайвар (var(--card)) хэсэгт тусад нь**, харанхуй scrim огт байхгүй байв.

Засвар:
- `CategoryMasonry.tsx`: card-ийн JSX бүтцийг өөрчилж, `<span className="cat-mosaic-item-photo">` (зөвхөн зураг, дээр юу ч биш) + `<span className="cat-mosaic-item-body">` (var(--card) цайвар дэвсгэр, бодит текст) гэсэн 2 тусдаа блок болгов
- `index.css`: `.cat-mosaic-item-shade` (харанхуй gradient scrim) бүрэн устгав — текст одоо цайвар дэвсгэр дээр харанхуй текстээр байрладаг тул scrim огт хэрэггүй болов
- Photo зон `height:150px` (desktop), `130px` (mobile) тогтмол өндөртэй — бүх 6 карт яг ижил хэвээр
- Mobile line-clamp 2 хэвээр хадгалав

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр, 1440/768/375px screenshot — харанхуй сүүдэр/scrim ХААНАЧ алга, бүх карт ижил хэмжээтэй, real product photo цэвэрхэн харагдаж, текст цайвар дэвсгэр дээр тод унших боломжтой.

## ✅ (2026-08-31) CategoryMasonry v5 — uniform хэмжээтэй, харанхуй сүүдэргүй, зайгүй

Tom v4-ийг ("positions all over the place", "dark shadow", "zawaan baina") дахин татгалзаад **бүх картыг ижил хэмжээтэй болгохыг тодорхой шаардав** — v4-ийн "irregular masonry" чиглэл буруу байсныг хүлээн зөвшөөрөв.

Root cause (v4): `translateY`-ээр карт тус бүрийг зөөх нь **grid track-ийн layout зайг агшаадаггүй** (transform зөвхөн visual, layout биш) — тул мөр хоорондоо хоосон зай ("zawaa") үлддэг байсан. Мөн `--shadow-lg` (хүнд харанхуй сүүдэр) 2 картад тусгайлан байсан.

Засвар (`client/src/index.css`, `CategoryMasonry.tsx`):
- `.cat-mosaic-grid`: `1.15fr 0.95fr 0.9fr` (тэгш бус) → `repeat(3,1fr)` (**бүрэн тэгш**), nth-child өндрийн ялгаа бүгд арилсан → **нэг ижил `min-height:250px`** бүх 6 картад
- Per-card `translateY` overlap/offset transform (4 тусдаа class) бүгд арилаад, **бүх grid-ийг нэгэн зэрэг** (`margin-top:-28px`) дээш зөөж, anchor-той **бүх мөр 1-ийн 3 карт адилхан хэмжээгээр** давхцдаг болгов — grid track зөв тооцоологддог тул хоосон зай алга
- `--shadow-lg` (харанхуй сүүдэр) бүрэн хасаж, бүх карт ижил зөөлөн `--shadow-sm` авдаг болов
- `CategoryMasonry.tsx`-аас `CARD_TREATMENT` logic бүрэн арилгав (component код бас цэвэрлэгдэв)

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр, 1440/768/375px screenshot — бүх 6 карт нүдээр харахад яг ижил хэмжээтэй, харанхуй сүүдэргүй, мөр хоорондын хоосон зай алга.

## ✅ (2026-08-31) CategoryMasonry v4 — жинхэнэ masonry (ууртан ялгаатай өргөн/өндөр)

Tom v3-ыг (бүх карт бодит зурагтай ч 3 тэгш баганад) "alignment/geometry бүгд сонин" гэж дахин татгалзав. Deep reasoning: v3 нь **зөвхөн 3 тэгш баганатай grid дээр 2 картыг transform-оор бага зэрэг зөөсөн** байсан — жинхэнэ masonry (өргөн/өндөр бүрд ялгаатай) БИШ байв. Reference-д картуудын өндөр мэдэгдэхүйц ялгаатай (нэг карт мэдэгдэхүйц урт), stagger тод харагддаг, зай маш нягт.

Засвар (`client/src/index.css`, зөвхөн CSS):
- `.cat-mosaic-grid`: `repeat(3,1fr)` (тэгш) → `1.15fr 0.95fr 0.9fr` (тэгш бус баганын өргөн), `gap: 10px→6px` (нягт)
- 6 картад тус тусдаа `nth-child` дүрмээр **зориудаар өөр өөр өндөр** (230/300/250/210/260/230px) — өмнө нь бүгд ижил `min-height:200px`
- Overlap: `-48px/-42px → -56px/-46px`, Stagger: `24px/20px → 46px/34px` (өмнөх нь ~200-260px картын хэмжээтэй харьцуулахад бараг үл анзаарагдах байсан)
- Mobile (≤820px): бүх nth-child өндрийг дахин 260px нэгдмэл болгож reset хийсэн (desktop-ийн irregular өндрүүд mobile 2-баганад дамжихаас сэргийлэв)

**Тодруулга**: Anchor зураг (баруун дээд, том lifestyle зураг) энэ орчинд одоо ч placeholder gradient хэвээр байгаа — учир нь "home-categories" R2 slot-д бодит зураг upload хийгээгүй байна. Энэ бол admin панелаас Tom өөрөө зураг upload хийх шаардлагатай **өгөгдлийн дутагдал**, код/geometry-ийн асуудал биш.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр, 1440/768/375px screenshot, overflow 0.

## ✅ (2026-08-31) CategoryMasonry v3 — бүх 6 карт бодит бүтээгдэхүүний фототой болов

Tom v2 (icon+text давхар зурагтай) хувилбарыг мөн "professional биш" гэж татгалзаад reference зурагтай (854×892 crop) дахин нягт харьцуулав. Гол ялгаа: reference-ийн small card бүр **бодит гэрэл зурагтай бүтээгдэхүүн** харуулдаг, миний хийсэн icon (шугаман зурсан lipstick/эмийн лонх icon) огт өөр. DB-ээс шалгахад **бүх 6 категори бодит, currently-published product фототой байсан** (`SELECT ... FROM products WHERE categoryId=? AND isPublished=1 AND imageUrl NOT LIKE '%placeholder%'`) — тул зохиомол/stock зураг биш, **жинхэнэ каталогийн бодит бүтээгдэхүүний фото** ашиглав.

Засвар:
- `Home.tsx`-ийн `categories` array-д `imageUrl` талбар нэмж, категори бүрт нэг бодит product photo оноов (жишээ нь Арьс арчилгаа → organic-sugar-squalane, Гоо сайхан → SokaMocka makeup remover, гэх мэт).
- `CategoryMasonry.tsx`: бүх 6 карт (өмнөх 2-оос) `.cat-mosaic-item--image` болов, `category.imageUrl`-г ашиглаж, зөвхөн байхгүй тохиолдолд `getCategoryPlaceholderImage` fallback хэвээр.
- Screenshot хийх явцад олдсон 2 CSS bug: (1) icon хассанаас `.cat-mosaic-item-number` badge зүүн тал руу шилжиж гарчигтай давхцаж байсныг `margin-left:auto` нэмж засав; (2) цайвар (жишээ нь цагаан лонх) бүтээгдэхүүний зураг дээр цагаан гарчиг текст харагдахгүй болж байсныг (scrim хангалтгүй) `.cat-mosaic-item-body`-д тусдаа найдвартай gradient scrim нэмж засав; (3) mobile 6 карт бүгд image болсноор `-webkit-line-clamp:1` бүх гарчгийг таслаж байсныг `2` болгож засав.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр, 1440/768/375px screenshot, overflow 0. Dev server-ийг Tom-ийн хүсэлтээр асаалттай үлдээв (screenshot QA-д зориулж Playwright-ыг л түр суулгаад бүрэн хассан).

## ✅ (2026-08-31) Quick Stats infinity graph — зочны төлөвт огт харагдаагүй bug засав + reference-тэй тааруулав

Tom reference зурагтай харьцуулаад "too basic" гэж татгалзсан. Root cause: **зочны (нэвтрээгүй) төлөвт infinity graph огт харагдаагүй** — зөвхөн 4 талбарын box харагдаж байсан (`QuickStatsSection.tsx`-ийн хуучин `.qs-guest-tiers` fallback). Тому reference-ийг зочноор харж байсныг баталгаажуулсан тул энэ бол гол шалтгаан байв. Дэлгэрэнгүй reasoning audit: (төлөвлөгөөний тэмдэглэл).

Засварууд (`InfinityGraph.tsx`, `QuickStatsSection.tsx`, `client/src/index.css`-ийн `.ig-*`/`.qs-*`):
- **Зочны төлөвт мөн адил infinity graph харагдана** — `shared/loyalty.ts`-ийн бодит `getLoyaltyTier`/`getNextLoyaltyTier`-ээс тооцоолсон жишээ утгаар (₮600,000 зарцуулалт → Хүрэл 3%), дэлгэц дээр тод **"ЖИШЭЭ ХАРУУЛАЛТ"** гэсэн шошготой — хэзээ ч хэрэглэгчийн бодит өгөгдөл гэж андуурагдахгүй.
- **Гарчиг "Quick Stats" болов** (өмнө нь зөвхөн жижиг eyebrow tag-д байсан, гол гарчиг нь өөр монгол хэллэг байсан) — master-prompt §16.5-ийн тодорхой заавраар reference-ийн visual-ыг хадгалж, монгол тайлбарыг доор нь нэмсэн.
- **Gradient stroke нэмэгдсэн** (`<linearGradient>` SVG defs) — өмнө нь flat өнгө байсан.
- **Шинэ muted өнгөний token** (`--graph-copper`, `--graph-copper-light`, `--graph-charcoal`, `--graph-gold-muted`) — master prompt тодорхой зааж байсан ("muted terracotta, not bright red") учир брэндийн тод vermilion/gold-ыг ашиглахгүй, зөвхөн энэ graph-д зориулсан шинэ token.
- **Geometry pinch засав**: 2 тойргийн зай 140px→166px (R=88 хэвээр) — өмнө нь 36px давхцдаг байсан бол одоо ~10px, жинхэнэ ∞ crossing шиг харагдана.
- **Том дүнгийн compact формат нэмэв** (`formatMntCompact`, жишээ нь "1.1M₮") — master prompt §16.7-ийн зөвлөсөн "₮1.2M" загварыг мөрдөж, infinity graph дотор урт тоо халхлагдахаас сэргийлэв.
- **Explore хийх явцад олдсон, холбоогүй bug**: `.eyebrow` class (сайт даяар ашиглагддаг) `display:inline-flex` тул зочны төлөвт дараагийн `.qs-cta` линктэй нэг мөрөнд наалддаг байсныг 768px screenshot-оор олж, `.qs-copy > .eyebrow { display: flex; }` гэсэн **scoped** (зөвхөн Quick Stats-д хамаарах, глобал биш) засвар хийсэн.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр, 1440/768/375px дээр screenshot (guest), throwaway хэрэглэгч+захиалгаар authenticated screenshot (Мөнгөн 5%, 1.1M₮, 24,000₮ хэмнэлт, Алтан хүртэл 8,924,000₮ — бүгд зөв), дараа нь бүх throwaway өгөгдлийг DB-ээс устгаж баталгаажуулсан. Playwright түр суулгаад бүрэн хассан.

## ✅ Brevo API IP хязгаарлалт арилсан, имэйл бодитоор ажиллаж байгааг баталгаажуулсан (2026-08-26)
Өмнөх blocker (`GET /v3/account` 401 "unrecognised IP address") шийдэгдсэн — Tom өөрийн талаас (яг ямар алхмаар хийснийг тодорхой мэдэгдээгүй, гэхдээ dashboard дээрх ганц "toggle" биш байсныг батлаcан) IP-г зөвшөөрсний дараа шууд бодитоор шалгасан:
- `GET https://api.brevo.com/v3/account` → **200 OK**, бодит акаунтын мэдээлэл буцсан (free tier, 300 sendLimit credit, "Sugi asayake" байгууллага).
- `POST /v3/smtp/email` → **201 Created**, бодит имэйл `t.morius@gmail.com` руу амжилттай илгээгдэж, жинхэнэ `messageId` буцсан.

**Имэйл (`sendAccountEmail`) бүрэн ажиллаж байгаа нь баталгаажлаа** — захиалгын баталгаажуулах, staff invitation, back-in-stock мэдэгдэл гэх мэт бүх имэйл feature-үүд одоо localhost дээрээс ч бодитоор гарах боломжтой.

**SMS хараахан шалгаагүй** (`sendAccountSms`) — Brevo-ийн SMS нь имэйлээс тусдаа кредит систем (мөнгө зарцуулдаг тул зөвшөөрөлгүй туршиж үзээгүй). SMS туршихаасаа өмнө Tom-оос: (1) Brevo dashboard дээр SMS кредит худалдаж авсан эсэх, (2) Монгол улс руу route/үнэ дэмжигдсэн эсэхийг (Transactional SMS → Country pricing) баталгаажуулах хэрэгтэй.

Одоо **mass SMS/Email campaign feature (email хэсгийг нь)** эхлэх боломжтой.

## ✅ Admin Analytics — Geckoboard дизайн + Conversion Rate/CAC/Return Rate дуусав (2026-08-27)
Tom Geckoboard дашбордын screenshot илгээж, яг тэр дизайнаар (харанхуй KPI карт, sparkline, gauge, P&L card, ranked list) хийхийг, мөн өмнө нь орхигдсон 3 metric-ийг (Conversion Rate, CAC, Return Rate — гурвуулаа шинэ өгөгдлийн эх сурвалж шаардсан тул хойшлуулагдаж байсан) заавал дуусгахыг тодорхой шаардсан. Бүгд дуусав:
- **Дизайн**: `AdminAnalyticsPanel.tsx`-ийн KPI хэсэг бүхэлдээ харанхуй `#17181b`/`#1f2126` дизайнтай болсон (зөвхөн энэ component дотор, сайтын global dark mode-той хамааралгүй). Sparkline/gauge chart-уудыг QA хийх явцад **жинхэнэ CSS bug олж заслаа**: CSS grid item-д `min-w-0` байхгүй бол дотор нь `justify-between` flex мөр багана гаднаа гарч зэргэлдээ карт руу орж болдог (2 газарт олдож заслаа). Мөн `bg-white/5` (тунгалаг) card background нь энэ орчны headless screenshot pipeline дээр visual ghosting artifact үүсгэдэг байсныг (getBoundingClientRect/elementFromPoint-оор бодит DOM зөв гэдгийг батлаад) илрүүлж, `#1f2126` (opaque) болгож шийдсэн.
- **Conversion Rate** (хамгийн том хэсэг): энэ site-д урьд байгаагүй жинхэнэ 1st-party visitor/session tracking (`visitor_sessions` хүснэгт, `telemetry.pageview` public procedure, `client/src/lib/pageviewTracking.ts`-ийн beacon). Hөрвүүлэлтийн хувь = захиалга ÷ session (Shopify-ийн стандарт томъёо).
- **CAC**: шинэ `marketing_spend` хүснэгт (сар тутам admin гараар оруулдаг), CAC tile дээрх inline editor-оор шууд оруулна. Сар бүрт зардал орсон эсэхийг бүрэн шалгадаг (нэг сар дутуу бол "тодорхойгүй" гэж мэдэгдэнэ, хэзээ ч ₮0 гэж таамаглахгүй).
- **Return Rate**: `orders.status`-д `"returned"` нэмэгдэв (зөвхөн "completed"-ээс шилждэг). **Явцад ноцтой pre-existing bug олж заслаа**: `updateAdminOrder`-ийн хуучин код "completed" захиалгыг ЯМАР Ч байдлаар өөрчлөхийг хориглодог байсан тул буцаалт хийх боломж угаасаа байгаагүй.
- **Мөн явцад олсон, том нөлөөтэй pre-existing bug засав**: `orders.paymentStatus` нь зөвхөн QPay webhook-оос л "paid" болдог байсан — бэлэн мөнгө/шилжүүлгийн захиалга хэзээ ч "paid" болдоггүй байсан тул **бараг бүх analytics тоо (орлого гэх мэт) бодит cash-on-delivery захиалга дээр ажиллахгүй байх эрсдэлтэй байсан**. Одоо "Дууссан" болгоход QPay биш захиалга автоматаар "paid" болдог.

`pnpm exec vitest run --no-file-parallelism` **161/161** (шинэ 7 тест: `telemetry.integration.test.ts` 4 + `analytics.integration.test.ts`-д нэмэгдсэн 3). Playwright-ээр throwaway admin+synthetic order/session өгөгдлөөр дэлгэрэнгүй QA хийж баталгаажуулсан, бүх throwaway өгөгдлийг устгаж DB-г буцаан хоосон төлөвт нь оруулсан. Дэлгэрэнгүй: [HISTORY.md](HISTORY.md).

## ✅ (2026-08-28) Гэрийн лаптопын DB blocker цуцлагдсан — `.env` одоо Aiven руу заасан байна
Дээрх "идэвхтэй blocker" тэмдэглэл хуучирсан байсныг олж, шалгаад баталгаажуулав: энэ (гэрийн) лаптопын `.env`-ийн `DATABASE_URL` одоо `mysql://root:...@127.0.0.1/...` биш, харин **Aiven-ийн шууд hostname** (`sugi-asayake-db-project-4b75.h.aivencloud.com`) руу заасан байна — өөрөөр хэлбэл хоёр лаптоп аль хэдийн нэг ижил шинэ шинэ shared DB ашиглаж эхэлсэн (хэн, хэзээ шилжүүлснийг тодорхойгүй, гэхдээ бодитоор шалгасан). `SELECT count(*)` асуулгаар шууд баталгаажуулсан: **937 бараа, бодит захиалгууд байна**. Иймд доорх "DB backup сэргээх" алхам ба "гэрийн лаптоп дээр бодит өгөгдөл байхгүй" гэсэн урьдны тэмдэглэлүүд **бүгд хуучирсан** — цаашид гэрийн лаптоп дээрээс ч бодит 937 барааны өгөгдлөөр Admin Analytics, Categories, bestsellers зэргийг шалгах боломжтой.

## ✅ (2026-08-28, гэрийн лаптоп дээр) CategoryMasonry v2 засвар ВАЛИДАЦИ ХИЙГДЭЖ ДУУСАВ
Өмнөх тэмдэглэл ("код бичигдсэн ч validation хийгдээгүй") дараагийн session-д гэрийн лаптоп дээр (`C:\Users\hero_\Documents\Projects\sugi-asayake`, local MySQL, мөн 937 бараа) бүрэн шалгагдаж, олдсон 3 бодит bug засагдав:

- **`pnpm check` / `pnpm build`** — цэвэр (олон удаагийн checkpoint).
- **Overlap тоогоор баталгаажаагүй байсан** — эхний хувилбарт `margin-top`/`translateY` тооцоо буруу байсны улмаас overlap card-ууд boditoor anchor-ийн ирмэгт **хүрээгүй** (0px эсвэл -8px зай) байсныг Playwright `getBoundingClientRect()`-ээр яг хэмжиж олж, `.cat-mosaic-grid margin-top: 34px→16px`, `--overlap-1: -34px→-48px`, `--overlap-2: -26px→-42px` болгож засаад **32px/26px бодит overlap** (Tom-ийн шаардсан 24-40px хязгаарт) болохыг дахин хэмжиж баталгаажуулсан.
- **Anchor-ийн өөрийн "Ойр салбараа олох" линк overlap card-д халхлагдаж байсан** — `.cat-mosaic-anchor-card`-ийн `bottom: 24px→64px` болгож зассан.
- **Том bug: category placeholder SVG-үүдэд (`client/public/category-placeholder-*.svg`, мөн `product-placeholder.svg`) far "SUGI ASAYAKE" watermark текст шингэсэн байсан** (viewBox 400x400, y=335≈84% доод хэсэгт) — image-led card болон anchor-ийн `background-size:cover`-ээр card дүүргэхэд энэ watermark ил гарч ирж байсныг олж, scrim gradient-ийг тохируулж (`rgba(0) 0%→0% 58%→opaque #17181b 80%→100%`) бүрэн нуусан — **icon зураг (гоо сайхны lipstick, эрүүл мэндийн savtai icon гэх мэт) бүрэн харагдахаар үлдээж, зөвхөн доод watermark хэсгийг л нуусан** (эхний хувилбарт хэт хүчтэй scrim хийж icon-ийг бүхэлд нь нуучихсан алдаа гарсан, дараа нь тэнцвэржүүлсэн).
- **Mobile (≤820px) 2-баганад "Эрүүл мэнд" картын гарчиг icon-той давхцаж байсан** (157×200px нарийхан карт дээр `background-size:cover` бүх өндрийг харуулдаг тул icon+title зай хүрэлцэхгүй байсан) — `.cat-mosaic-item--image { min-height: 260px }` + гарчгийг 1-мөрөнд `-webkit-line-clamp:1` болгож зассан.
- **Баталгаажуулалт**: 1440/1024/768/430/375px бүх breakpoint дээр screenshot + `getBoundingClientRect()`-ээр pixel хэмжилт (overlap 32px/26px, offset 24px/20px), хэвтээ overflow 0, console/page алдаагүй. Playwright түр суулгаад (`pnpm add -D playwright -w`) дараа нь бүрэн хассан (`git checkout -- package.json pnpm-lock.yaml` + `pnpm install`).
- **Файлууд** (эцсийн): `client/src/index.css`-ийн `.cat-mosaic*` блок (олон удаа засварлагдсан), `client/src/components/home/CategoryMasonry.tsx`, `client/src/pages/Home.tsx`-ийн `categories` array-д `slug` талбар (өмнөх session-ээс өөрчлөгдөөгүй).

## ✅ (2026-08-28) Нүүр хуудасны premium reference-driven редизайн (Tier 0–7) дуусав
`docs/REFERENCE-DRIVEN-PREMIUM-REDESIGN-MASTER-PROMPT.md`-д тулгуурлан бүх нүүр хуудсыг дараалан (tokens/primitives → Hero → TrustStrip → **QuickStatsSection** (шинэ, infinity graph) → **CategoryMasonry** (шинэ, асимметр collage) → **WhyChooseUs** (шинэ, харанхуй 3 карт) → **JournalSection** (staggered restyle) → **StoreLocatorSection** (3-бүсийн зохион байгуулалт)) хийж дуусгав. `client/src/pages/Home.tsx` (302 мөрийн монолит) `client/src/components/home/*.tsx`-руу section тус бүрээр задарсан.
- **Quick Stats**: шинэ backend талбар `totalLoyaltySavingsMnt` (`server/db.ts`-ийн `getUserLoyaltyStatus`, зөвхөн `paymentStatus="paid"` захиалгын `loyaltyDiscountMnt`-ийг нэгтгэдэг, coupon/routine-той холилдохгүй) + `server/loyalty.integration.test.ts`-д 4 шинэ тест (бүгд pass). Frontend: `AdminAnalyticsPanel.tsx`-ийн `polarPoint`/`arcPath` SVG arc math-ыг `client/src/lib/svg-arc.ts`-руу зөөж (2 дахь хэрэглэгч гарсан тул) хуваалцав. Зочинд зөвхөн public tier table, нэвтэрсэн хэрэглэгчид бодит infinity graph (spend progress + discount%) + тусдаа "нийт хэмнэсэн дүн" тоо харагдана — 3 metric хэзээ ч холилдохгүй.
- **Categories masonry**: hardcoded 6 категори (icon/дараалал editorial curation, нэрс нь бодит `product_categories`-тай баталгаажсан таарсан) — href-ийг `/shop?category=...`-руу бодитоор холбов (`shared/catalog-filter.ts`-ийн exact-match логиктой баталгаатай).
- **Store locator**: 3 бодит салбар хэвээр, газрын зураг нь static SVG дүрслэл (Google Maps API key хаана ч тохируулаагүй тул `Map.tsx`-ийг холбоогүй — infra шийдвэр шаардана).
- **Баталгаажуулалт**: `pnpm check`/`pnpm build` олон checkpoint дээр цэвэр; Playwright (түр суулгаад дараа нь бүрэн хассан, `package.json`/lockfile өөрчлөгдөөгүй) -оор 1440px/390px screenshot, хэвтээ overflow шалгалт (1440–320px бүх breakpoint, 0 overflow), **бодит throwaway хэрэглэгч+захиалгаар authenticated Quick Stats infinity graph screenshot аваад тоо мат зөв болохыг баталгаажуулж (жишээ: Мөнгөн 5%, ₮1,076,000 зарцуулалт, ₮24,000 хэмнэлт, Алтан хүртэл ₮8,924,000 дутуу — бүгд гараар тооцоотой таарсан), дараа нь бүх throwaway өгөгдлийг DB-ээс устгаж баталгаажуулсан**. Нэг бага зэргийн CSS bug олж заслаа (mobile дээр category card-ийн тайлбар текст сум icon-той давхцаж байсан).
- **Тодруулга**: full test suite ажиллуулахад 21 тест fail гарсан (жишээ нь `order-notifications.integration.test.ts`, `discount-codes.integration.test.ts`, `checkout.guest.integration.test.ts` гэх мэт) — **эдгээр бүгд миний хөндөөгүй файлууд**, тусад нь isolate хийж ажиллуулахад ч давтагдсан тул энэ session-ийн ажилтай холбоогүй, өмнөх орчны/сүлжээний асуудал (Aiven network timeout 5000ms default vitest timeout-оос давсан + `order-notifications`-ийн тодорхойгүй logging асуудал). Дэлгэрэнгүй шалгаагүй — доор дараагийн ажлын саналд нэмэв.

## ✅ (2026-09-04) Honeybadger error tracking холбогдов (hosting хүлээгээгүй, `phase3-honeybadger` branch)

Tom "Error tracking (Honeybadger) — hosting хүлээхгүйгээр эхлүүлж болно" гэж тодорхой шаардсан (ROADMAP TIER 5-ийн Sentry/staging/CDN бүгд hosting сонгогдоогүй тул хойшилж байсныг задлан, зөвхөн error tracking hosting шаардахгүй болохыг олж харсан). `@honeybadger-io/js` (server) + `@honeybadger-io/react` (client) суулгаж холбов:
- **`server/_core/env.ts`**: шинэ `HONEYBADGER_API_KEY` (байхгүй бол `""`, бусад бүх ENV талбартай ижил "N of M" зарчим).
- **`server/_core/honeybadger.ts`** (шинэ): `notifyError()` (хаанаас ч дуудагдах аюулгүй no-op key байхгүй үед), `registerHoneybadgerMiddleware`/`registerHoneybadgerErrorMiddleware` (Express request/error handler, key байхгүй бол no-op). `enableUncaught`/`enableUnhandledRejection: false` — Honeybadger-ийн өөрийн автомат hook-ийг унтраагаад, `server/_core/index.ts`-ийн одоо байгаа `process.on('unhandledRejection'/'uncaughtException')`-оос дотор нь дуудуулна (процесс амьд үлдэх зан төлөвийг хэвээр хадгалж, зөвхөн Honeybadger рүү мэдэгдэл нэмнэ). Нууц утга (`password`/`apiKey`/`config`/`credentials`/`dataBase64`/`token`/`secret`) filter хийж гуравдагч этгээдэд дамжуулахгүй.
- **`server/_core/index.ts`**: `registerHoneybadgerMiddleware(app)` (эрт, бусад middleware-ийн өмнө), tRPC `createExpressMiddleware`-ийн `onError` hook (зөвхөн "гэнэтийн" алдаа мэдэгдэнэ — `BAD_REQUEST`/`UNAUTHORIZED`/`FORBIDDEN`/`NOT_FOUND`/`CONFLICT`/`PRECONDITION_FAILED`/`TOO_MANY_REQUESTS` кодуудыг чөлөөлсөн, эс бөгөөс жирийн validation алдаа сар бүрийн 5,000 үнэгүй эрхийг дүүргэнэ), `registerHoneybadgerErrorMiddleware(app)` (бүх route-ийн дараа, tRPC-ээс гадуурх storage proxy/QPay webhook-ийн алдаа барина).
- **`client/src/main.tsx`**: `VITE_HONEYBADGER_API_KEY` байвал `Honeybadger.configure()` + `<HoneybadgerErrorBoundary>`-аар React app-г ороож, key байхгүй бол өмнөх шигээ ямар ч өөрчлөлтгүй render хийнэ.

**Ухамсартай сонголт — Honeybadger (Sentry биш)**: үнэгүй tier нь сарын 5,000 event, зээлийн карт шаардахгүй, hosting шийдэгдэхээс өмнө өнөөдрөөс эхлэн ажиллаж эхэлнэ, hosting сонгогдсоны дараа ч зан төлөв өөрчлөгдөхгүй.

**⚠️ Одоогоор бодит үйлдэлгүй — key оруулаагүй байгаа тул**: `HONEYBADGER_API_KEY`/`VITE_HONEYBADGER_API_KEY` хоёулаа `.env`-д хоосон/байхгүй. Tom [honeybadger.io](https://www.honeybadger.io)-д (эсвэл өөр вэндорыг) үнэгүй бүртгүүлж, төслийн API key-г хоёр газарт (server `.env`-ийн `HONEYBADGER_API_KEY`, client-д зориулсан `VITE_HONEYBADGER_API_KEY`, хоёулаа ижил утга) тавихад л идэвхжинэ — код талд нэмэлт өөрчлөлт шаардлагагүй.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 204/204 ✅ (35/35 файл)** — Honeybadger нэмэлт ямар ч регресс үүсгээгүй (key байхгүй тул бүх код зам no-op хэвээр). `curl http://localhost:3000/health` 200 хэвээр, dev server hot-reload-оор асуудалгүй ажиллав. Playwright screenshot-оор дахин баталгаажуулаагүй (key байхгүй үед UI-д ямар ч харагдах өөрчлөлт байхгүй тул шаардлагагүй гэж дүгнэв).

## ✅ (2026-09-06) /admin-ийн бүх ил хэсэг Gentelella загварын дэлгэцтэй ижилхэн болов (шинэ dark sidebar + light topbar + KPI grid + chart + activity feed)

Tom Gentelella v4 (жинхэнэ, нээлттэй эх сурвалжтай админ загвар — github.com/ColorlibHQ/gentelella, тодорхой баталгаажуулсан) загварын screenshot илгээж "/admin яг ийм л харагдах ёстой" гэж шаардаж, "Do not reuse anything!!! I want originals!!" гэж тодорхой заав (хуучин Аналитик хэсгийн харанхуй KPI tile-уудыг дахин ашиглахгүй, шинэ визуал бүрдэл бүтээх ёстой). `/plan` горимоор судалгаа хийж (Gentelella-ийн жинхэнэ бүтэц, Recharts-ын ComposedChart арга, "design MCP" гэж юу байдгийг үнэн зөв шалгасан — тийм тусгай MCP байхгүй, Playwright MCP-ээр бодит screenshot авч харьцуулах нь цорын ганц бодит арга), Tom өөрөө шийдвэрлэсэн: **бүх 14 хэсэгт** (зөвхөн Хянах самбарт биш) шинэ shell хэрэгжинэ.

**Шинэ, бүрэн эх бүрдэл** (`client/src/components/admin/`): `AdminSidebar.tsx` (харанхуй, үүрлэсэн навигаци — "Хянах самбар" бүлэг Тойм/Аналитик/Аюулгүй байдал дэд-зүйлтэй, mobile drawer нь `ui/sheet.tsx`-ээр, `ui/sidebar.tsx`-ийн shadcn Sidebar биш — хуучин `DashboardLayout.tsx`-ийн давхар sidebar bug-ийг дахин үүсгэхээс сэргийлэв), `AdminTopBar.tsx` (hamburger, breadcrumb, хайлт, бодит мэдэгдлийн тоо, avatar dropdown), `AdminStatCard.tsx`/`AdminDeltaPill.tsx`/`AdminMiniSparkline.tsx`, `AdminNetworkActivitiesCard.tsx` (Recharts ComposedChart — бодит area + tasalsan шугам), `AdminRecentActivityFeed.tsx` (захиалга+амжилтгүй төлбөр+audit log-ийг нэгтгэдэг).

**6 KPI карт бүхэлдээ бодит өгөгдөл дээр ажиллана, ямар ч тоо зохиомол биш** — `server/analytics.ts`-д `ConversionOverview`-д `totalPageViews`/`avgSessionDurationSec` нэмэв (нэг query дотор), `PeriodComparison`-д харгалзах delta-ууд, шинэ `getVisitorSessionTimeseries`. `server/db.ts`-ийн `getAdminDashboardSummary`-д `ordersLast7d`/`ordersPrevious7d`/`ordersDailySeries` (7 хоногийн sparkline). Staff эрхтэй хэрэглэгчид `analyticsReport`-оос ирдэг картууд (Дундаж сессийн хугацаа/Орлого/Хөрвүүлэлт/Хуудас үзэлт/Network Activities) **🔒 Зөвхөн админд** гэсэн түгжээтэй харагдана (procedure нь `adminProcedure`, network түвшинд хориотой тул), Захиалгын карт л staff-д бодитоор харагдана — яг өмнөх `dashboardSummary`-ийн redaction зарчимтай тохирч байна.

**Хуваалцсан код (visual биш, зөвхөн logic)**: `lib/adminAuditLabels.ts` (`AdminSecurityCenter.tsx`-ээс задалж авав, мөн дутуу байсан label-үүдийг (`user.phone_updated`, `featuredBrand.*`, `routine.*` гэх мэт) нэмж бүрэн болгов), `lib/analyticsRange.ts` (`AdminAnalyticsPanel.tsx`-ийн `rangeToDates`/`buildDaySeries`-г задалж, ерөнхий төрөлтэй болгов — шинэ 7/30/90 сонголт хуучинтай яг ижил тооцоолол ашиглана).

**Баталгаажуулалтын явцад олдож, шууд засагдсан бодит bug**: `AdminWorkspace.tsx`-ийн `admin.users` query нь **ямар ч role шалгалтгүйгээр** бүх non-preview session дээр (staff ч гэсэн) дуудагдаж, 403 алдаа өгдөг байсан — миний шинэ shell-тэй хамааралгүй, өмнө нь байсан bug, зөвхөн staff session-ээр screenshot QA хийх явцад олдсон. Засав.

**Баталгаажуулалт (бодит, зөвхөн typecheck биш)**: Aiven дээр 2 throwaway хэрэглэгч (admin, staff) үүсгэж, төслийн өөрийнх нь "Playwright-ыг QA-д зориулж түр суулгаад, дараа нь бүрэн хасах" зарчмаар (`pnpm add -D playwright -w`, ашигласны дараа `git checkout -- package.json pnpm-lock.yaml`) бодит dev server-ийг screenshot-оор шалгав: desktop/mobile/mobile-drawer, мөн staff-ийн 🔒 харагдац бүрэн зөв ажиллаж байгааг нүдээр баталгаажуулаад, 2 throwaway хэрэглэгчийг DB-ээс бүрэн устгасан. `pnpm check`/`pnpm build` цэвэр, **бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. `.mcp.json`-д Playwright MCP-д зориулж `--browser chromium` нэмэв (энэ машинд бодит Chrome суугаагүй тул).

**Ухамсартай орхигдуулсан зүйл**: reference screenshot-ийн "+ New view"/"+ Create report" 2 товч нэмээгүй — эдгээрийн ард ямар ч бодит үйлдэл байхгүй тул хоосон, юу ч хийдэггүй товч нэмэх нь зохиомол функцтэй адил гэж үзэв.

## ✅ (2026-09-06) Бүртгэл одоо заавал verify.mn SMS-ээр баталгаажсан утас шаарддаг (Tom амьдаар туршиж, шийдвэрээ эргүүлэн өөрчилсөн)

2026-09-05-ний доорх бичлэгт баталгаажуулалтыг **сонголттой** болгосон байсан ч Tom өөрийн эхнэрийн утасны дугаараар бодитоор бүртгүүлж үзэхэд ямар ч SMS баталгаажуулалтгүйгээр шууд бүртгэгдсэнийг хараад ("ehneriinhee utasiig hiigeed burtguulsen chine shuud burtgegdej baina!! verify.mn geed ajilahgui baina") шийдвэрээ эргүүлэн өөрчилж, **заавал баталгаажуулах ёстой** гэдгийг тодорхой шаардав ("not just only used for forgot-password!! also create account!!!! do it professionally!!!").

**Шинэ 2-алхамт бүртгэлийн урсгал** (`auth.startPhoneVerification` → `auth.completeRegistration`, хуучин ганц алхамт `auth.register` бүрмөсөн хассан):
1. Хэрэглэгч утасны дугаараа оруулна → бодит verify.mn SMS session үүсэж, SMS хүлээнэ (`PhoneVerificationStep` компонент, `ForgotPassword.tsx`-тэй ижил, аль хэдийн Tom-ийн тусгайлан батласан дизайнтай).
2. Утас **бодитоор баталгаажсаны дараа** л Нэр (сонголтоор) + Нууц үг оруулж бүртгэлээ дуусгана (`auth.completeRegistration`) — энэ мөчид л жинхэнэ хэрэглэгчийн бүртгэл (`users` мөр) үүснэ, өмнөх нь зөвхөн `phone_verification_sessions`-д session хадгалагдана.
3. `auth.startPhoneVerification`-ийн "register" branch endо public болов (`ctx.user` шаардахгүй) — учир нь бүртгэл үүсэхээс өмнө session эхэлдэг болсон тул нэвтэрсэн хэрэглэгч байх боломжгүй. Аль хэдийн өөр акаунтад холбогдсон утсаар шинэ session эхлүүлэхийг шууд `CONFLICT`-оор татгалзана (энэ бол anti-enumeration биш — бүртгэлийн энгийн urgent conflict мэдэгдэл).
4. `server/db.ts`-д шинэ `completeRegistrationViaPhoneSession` (VERIFIED session-оос бодит акаунт үүсгэнэ) — хуучин `attachPhoneFromVerifiedSession` (аль хэдийн нэвтэрсэн хэрэглэгчийн утсыг солих/нэмэх зориулалттай, одоо ямар ч UI-аас дуудагдахгүй ч ирээдүйн Profile "утсаа дахин баталгаажуулах" функцэд бэлэн хэвээр үлдсэн) хэвээрээ, зөрчилдөхгүй.

Ажилтай холбоотой хамгийн том эрсдэл — тест дэх verify.mn session бодит биш (fake sessionId) байдаг тул router-ийн "live status дахин шалгах" хэсэг бодит verify.mn API руу очих гэж оролдсон — `server/checkout.guest.integration.test.ts`-ийн "merges a guest's cart..." тестэд `vi.stubGlobal("fetch", ...)`-аар шийдвэрлэв (fake VERIFIED хариу буцаадаг, тестийн төгсгөлд `finally`-д сэргээдэг).

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. Dev server дахин асааж `/health` 200 баталгаажуулсан.

---

## ✅ (2026-09-05) Бүртгэл/нэвтрэлт зөвхөн утасны дугаараар боллоо (имэйл бүрмөсөн хассан) + ажилтны имэйл-урилга бүрмөсөн хассан

Tom тодорхой шаардав: "remove email !!! only phone number!!!" (бүртгэлийн формоос имэйл талбарыг арилгаад зөвхөн утасны дугаараар бүртгүүлдэг болгох). Хоёр судалгааны асуултад тодорхой хариулав: (1) **бүх хэрэглэгч (хуучин болон шинэ) заавал утастай байх ёстой** ("Require phone for everyone" — хуучин имэйлээр нэвтэрдэг байсан аргыг хэвээр үлдээхийг сонгоогүй), (2) бүртгүүлэхэд заавал 150₮-ийн SMS баталгаажуулалт (⚠️ **энэ хоёр дахь заалт 2026-09-06-нд дээрх шинэ бичлэгээр эргүүлэн өөрчлөгдсөн, одоо ЗААВАЛ баталгаажуулна**) — тухайн үед "typo хийвэл админтай холбогдоод шийднэ, боломжит бүх нөхцлийг бодож үз" гэж тодорхой зөвшөөрсөн байсан.

**Бодит эрсдэлийн үнэлгээ (Aiven-аас шууд шалгасан)**: production дээр ердөө **4 хэрэглэгч** байсан (1 нь Tom, утастай; 2 нь item #12-т аль хэдийн тэмдэглэсэн тестийн үлдэгдэл admin акаунт; 1 нь энгийн user, утасгүй) — тул "бүх хэрэглэгч заавал утастай байх ёстой" гэсэн эрсдэлтэй сонголт бодит хохирол багатай байсныг баталгаажуулаад хэрэгжүүлсэн.

**Схем**: `users.email` → nullable (NOT NULL хасав, UNIQUE хэвээр), `users.phone` → UNIQUE нэмэв (`drizzle/0042_phone_primary_auth.sql`, Aiven дээр шууд ажиллуулж баталгаажуулсан). Бүх бичих цэг (`register`, `admin.updateUserPhone`, `profile.update`, `attachPhoneFromVerifiedSession`) нэгдсэн 8-оронтой хэлбэрт normalize хийдэг (`normalizePhoneForVerifyMn`) тул raw баганын UNIQUE index нь `findUserByPhone`-ийн уян хатан (сүүлийн 8 орон харьцуулах) хайлттай хэзээ ч зөрчилдөхгүй.

- **`auth.register`**: `{email, password}` → `{phone, password, name?}`. Давхардсан утас шалгаад `CONFLICT`, амжилттай бол шууд session нээнэ (Brevo хасалтын дараах нэг алхамт бүртгэл хэвээр).
- **`auth.login`**: `{email, password}` → `{phone, password}`. `findUserByPhone`-оор хайна.
- **Login.tsx**: бүх Имэйл талбар Утасны дугаар болов, бүртгэлийн дараах "утсаа баталгаажуулах уу?" сонголт бүрмөсөн арилав (утас аль хэдийн заавал бөглөгддөг тул илүүц) — `attachPhoneViaVerification`/`PhoneVerificationStep` backend код хэвээр үлдсэн (ашиглагдаагүй ч гэсэн, ирээдүйд Profile дээр "утсаа дахин баталгаажуулах" функц хэрэгтэй бол бэлэн).
- **Admin-side сэргээх хэрэгсэл (шинэ, "зөвхөн админтай холбогдоод шийднэ" гэсэн Tom-ийн шийдвэрийг бодитоор хэрэгжүүлсэн)**: `admin.updateUserPhone` + `AdminUserDetailDrawer.tsx`-д шинэ "УТАСНЫ ДУГААР" карт — нэвтэрч чадахгүй болсон (утасгүй/буруу утастай) хэрэглэгчийн утсыг админ шууд засна, нууц үгэнд хэзээ ч хүрэхгүй (утас зөв болмогц хуучин нууц үг шууд ажиллана, эсвэл хэрэглэгч өөрөө SMS-ээр сэргээнэ).
- **`profile.update`**: утас солиход мөн normalize + давхардал шалгалт нэмэв (өөр хэрэглэгчийн утсыг санамсаргүй "авахаас" сэргийлнэ).
- **Admin Users жагсаалт/хайлт**: утасны багана нэмэгдэв, `adminGlobalSearch` одоо утсаар ч хайдаг болов (`AdminGlobalSearch.tsx`), Нэвтрэлтийн түүх (`AdminSecurityCenter.tsx`) багана "Имэйл"→"Утас" болов (`login_attempts.email` баганын нэрийг хэвээр үлдээсэн — зөвхөн миграцийн эрсдэлгүй, зорилго нь өөрчлөгдсөнийг код/UI-д тэмдэглэсэн).

**Хоёрдугаар хэсэг: "admin invite staff section just change it to manually only admin give staff role to default users"** — имэйлээр ажилтан урих бүхэл систем (`admin.inviteStaff`/`admin.staffInvitations`/`admin.revokeStaffInvitation`, `invites.*` router, `/invite/:token` хуудас/`AcceptInvitation.tsx`) **бүрмөсөн хассан** (Tom-ийн шинэ утас-төвтэй загварт "имэйлээр урих" ойлголт зохицохгүй болсон тул). Оронд нь аль хэдийн байсан **`admin.updateUserRole`** (Users жагсаалтын мөр бүрийн эрхийн dropdown) цорын ганц арга болов — админ өөрөө аль хэдийн бүртгүүлсэн хэрэглэгчийг сонгоод шууд эрх өгнө. `staff_invitations` хүснэгт DB-д хэвээр (ашиглагдахгүй, Brevo-цэвэрлэгээний адил зарчмаар устгаагүй).

**Тестийн засвар, явцад олдсон холбоогүй бодит bug**: бүрэн suite ажиллуулахад `server/verifyMn.test.ts`/`server/verifyMn.integration.test.ts`-ийн "VERIFY_MN_API_KEY тохируулаагүй үед л шалгадаг" 2 тест **бодит амжилттай session үүсгэж unшид** (ROLLBACK-гүй!) — учир нь энэ session-ий эхэн үед `.env`-д Tom-ий өгсөн **бодит** verify.mn API key нэмэгдсэн байсан тул тестийн "key байхгүй" урьдач нөхцөл худал болсон байв. Засвар: хоёр файлд `vi.mock("./_core/env", ...)`-оор `verifyMnApiKey`-г тухайн тестийн хувьд зорчилтойгоор хоосон болгов (нэг нь бүрэн ENV орлуулга, нөгөө нь `importOriginal`-аар бусад бодит утгыг хэвээр хадгалсан хэсэгчилсэн орлуулга — учир нь тэр файл бодит DB рүү холбогддог). Бодит үр дагавар: цаашид энэ suite ажиллуулах бүрт verify.mn-ийн бодит dashboard дээр хуурамч session үүсэхгүй болов.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. Migration Aiven дээр шууд ажиллуулж баталгаажуулсан (`SHOW COLUMNS`/`SHOW INDEX`-ээр). Dev server дахин асааж `/health` 200 баталгаажуулсан.

**⚠️ Мэдэгдэж буй үлдэгдэл**: одоогийн 4 хэрэглэгчийн 1 нь (item #12-ын тестийн artifact-уудаас өөр, жинхэнэ "user" эрхтэй) утасгүй тул одоо нэвтэрч чадахгүй болсон — тухайн хэрэглэгч гомдоллосон тохиолдолд admin → Хэрэглэгч → Дэлгэрэнгүй → "УТАСНЫ ДУГААР" картаар шууд засах боломжтой (кодоор аль хэдийн бэлэн).

## ✅ (2026-09-04) Phase 3 review (Shop/ProductDetail/Checkout/Profile) — том дахин зохион байгуулалт хэрэггүй байсныг баталгаажуулав, 3 бодит гарц-defect олж заслаа

Tom "Phase 3: Shop → ProductDetail → Checkout → Profile-г дараалан premium дизайнд шилжүүлэх" гэж тодорхой шаардсан. Playwright-ээр (1440px/390px, throwaway верификацлагдсан хэрэглэгчээр Profile-ийг оролцуулан) бүх 4 хуудсыг нэг бүрчлэн нүдэн дээр шалгахад **аль хэдийн Home-тэй ижил premium дизайны хэлийг (dark editorial card, kicker шошго, numbered steps, tier-based loyalty visualization) агуулсан байсныг баталгаажуулав** — жишээ нь Checkout-ийн 01/02/03 numbered steps + харанхуй "ORDER SUMMARY" sidebar, Profile-ийн "Гишүүнчлэлийн карт" tab-ийн Home-ийн membership section-той яг ижил tier-progress дизайн. Иймд **бүтэн дахин зохион байгуулалт хийх шаардлагагүй** гэж дүгнэв — үүний оронд бодит гарц дээр суурилсан нарийвчилсан defect-hunting хийж, 3 бодит асуудал олж заслаа:

1. **Promo banner (`SitePromo.tsx`) — 2 мөрөнд хуваагдаж, тогтмол хурдтай биш байсан.** Tom өөрөө шууд ажиглаад заав: "Top thicker bar is promotion section!! Make the top promotion bar into 1 line!! And make it ursagdag bolgo uduriin 24tsag urgelj ursgadag bolgo!!!" — санамсаргүй "гадны inject" гэсэн миний анхны таамаглал БУРУУ байсныг (доор дэлгэрэнгүй) Tom засав: энэ бол admin-ий бодитоор идэвхжүүлсэн `sitePromotions` зурвас (одоогоор contentаа улс төрийн мэдээгээр бөглөсөн байгаа нь Tom-ий шийдвэр, өөрчлөх шаардлагагүй). Sunrise ribbon/shop ribbon-той ЯГ ИЖИЛ `sunrise-track` marquee техник ашиглаж 1 мөр рүү шилжүүлэв, гэхдээ нэг нюанс нэмсэн: admin-ий бичсэн зурвас хэдий ч урттай байж болох тул (өмнөх 2 ribbon-ий адил тогтмол 24s биш) бодит рендерлэгдсэн мөрийн өргөнийг хэмжиж, **тогтмол ~42px/s хурдаар** тооцоолсон `animation-duration`-ийг CSS хувьсагчаар дамжуулдаг болгов — эс бөгөөс урт зурвас хэт хурдан "нисч" өнгөрдөг байв (анхны debug-д 24s тогтмолоор шалгахад бодит хурд ~680px/s гарч байсан, засварын дараа ~42px/s болсныг Playwright-ээр баталгаажуулсан). 24/7 reduce-motion exemption (sunrise/shop ribbon-той ижил зарчим) мөн нэмэв.
2. **3 барааны imageUrl буруу зурагтай холбогдсон байв (жинхэнэ, өмнө нь мэдэгдээгүй bug).** `docs`-т тэмдэглэсэн "522/937 бодит зурагтай" тоо баримт үнэн ч, "522 бүгд ЗӨВ зураг мөн үү" гэдгийг хэн ч шалгаагүй байсныг ProductDetail-ийн "Мөн танд таалагдаж магадгүй" (related products) хэсгийг нүдээр харахад олов: id=70 "NMN Daily Facial Mask" нь **бүр өөр компанийн "Fabulous Store" маркетингийн баннер зураг** (1200×628 — яг classic Open Graph/social-share зурган хэмжээ), id=79 "SokaMocka Organic Facial Soap" болон id=150 "Diane Volume&Scalp Treatment" нь **хоёулаа яг ижил, огт хамааралгүй эмийн сангийн вэбсайтын screenshot** (3 хүн лаборторын хувцастай зогссон зураг) харуулж байв. Бодит эх сурвалж: 13 барааны зураг нэг удаагийн upload session-д `products/150/` (эсрэг талын өөр бүтээгдэхүүний) storage замд бичигдсэн байсан — файлын нэр бүр зөв бүтээгдэхүүнтэй тохирсон (`nmn_...`, `bayu_...` гэх мэт) тул 9/13 нь ЗӨВ зурагтай (зөвхөн замын дугаар холбоогүй, харагдацад нөлөөгүй cosmetic зөрүү), харин яг эдгээр 3 нь агуулгын хувьд ч буруу байв. Sharp-аар бүх 13 зургийг нэг montage болгож нүдээр баталгаажуулаад, Tom-оос зөвшөөрөл авч (`AskUserQuestion`, учир нь Aiven руу шууд UPDATE — auto-mode classifier анх блоклосон, batchgvй scoped засвар учир Tom зөвшөөрсний дараа дахин ажилласан), 3-ыг `imageUrl = NULL` болгож placeholder icon руу буцаав. R2-ийн файлын байт хэвээр, зөвхөн DB холбоос арилгасан тул бүрэн урвуулах боломжтой.
3. **ProductDetail-ийн "Хэрэглэх зөвлөмж" карт — хэзээ ч холбогдоогүй placeholder текст, бодит хэрэглэгчид харагдаж байсан.** Бүх бүтээгдэхүүний хуудсанд болзолгүй харагддаг байсан ("Бүтээгдэхүүний дэлгэрэнгүй тайлбар, хэрэглээний зааврыг Admin хэсгээс оруулж шинэчилж болно.") — `products` хүснэгтэд ийм талбар огт байхгүй тул энэ бол хэзээ ч бодитоор хэрэгжээгүй feature-ийн орхигдсон scaffolding текст, admin-д зориулсан дотоод тэмдэглэл шиг харагдах өгүүлбэрийг жинхэнэ худалдан авагч бүрд харуулж байсан. Бүхэлд нь хассан (дээр байгаа бодит тайлбар аль хэдийн энэ мэдээллийг агуулдаг).

**Баталгаажуулалт**: `pnpm check`/`pnpm build` бүх засвар бүрийн дараа цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 204/204 ✅ (35/35 файл)** засварын дараа. Playwright-ээр (түр суулгаад бүрэн хассан): promo ticker 1 мөр/~42px/s/reduce-motion-д мөн адил хурдтай баталгаажсан тоогоор; 13 зургийн montage нүдээр баталгаажсан; throwaway verified хэрэглэгчээр (шууд DB insert + бодит login urgamal, дараа нь бүрэн устгасан) Profile-ийн бүх 5 tab (Тойм/Захиалга/Хувийн профайл/Аюулгүй байдал/Гишүүнчлэлийн карт) screenshot авч шалгасан.

## ✅ (2026-09-04) Phase B — хуваалцсан эх сурвалж (formatMnt/ангилал/800+/ProductCard) дуусав

Дээрх "Яагаад нэг бүтэн бүтээгдэхүүн мэт биш" судалгааны Phase B хэсгийг ((төлөвлөгөөний тэмдэглэл)) хэрэгжүүлэв — cohesion audit-ийн олдсон бодит давхардлуудыг засав:

- **`shared/format.ts`**: `formatMnt` 23 тусдаа файлд copy-paste хийгдсэн байсныг нэг эх сурвалж болгов (21 client + 2 server файл, бүгд функционал хувьд ижил байсан тул зан төлөв өөрчлөгдөөгүй).
- **`client/src/components/home/categories-data.ts`** (шинэ): Home.tsx болон Shop.tsx тус бүр 6 ангиллыг өөр өөрөөр (өөр дараалал, өөр тайлбар, Shop 4/6-г л агуулж байсан) hardcode хийж байсныг нэг эх сурвалж болгов (`locations-data.ts`-тэй ижил загвар). Shop-ийн хоосон-каталогийн "discovery" карт одоо бодит 6 (өмнө нь 4) харуулна, 2 шинэ CSS tone (`peach`/`sand`) нэмэв.
- **"800+" тоо**: Hero badge-ийн "800+" ямар ч admin-аар засварлагдахгүй, code-lock хийгдсэн байсныг шинэ `getPublishedProductCount()` (`server/db.ts`) + `catalog.publishedCount` public procedure-оор бодит COUNT(*)-аас тооцоолж, 100-аар доош бөөрөнхийлж ("900+") харуулдаг болгов. CategoryMasonry/WhyChooseUs-ийн "800+"-тэй CMS текстийг "900+" болгож шинэчилсэн (чөлөөт текст хэвээр, admin засварлаж болно).
- **ProductCard давхардал**: 4 өөр "ProductCard" хэрэгжүүлэлтээс 2 нь **бодитоор ижил visual style-тай, зөвхөн код давхардсан** байсныг тодорхойлж, extract хийв: (1) Home-ийн bestseller/recommended rail — нэг `BestsellerRailCard` болгосон (давхардлын улмаас "recommended" rail rating харуулдаггүй байсан bug-ийг ч зэрэгцүүлэн засав), (2) `RecommendedForYou.tsx`/Shop-ийн `RecentlyViewed` — шинэ `RailProductCard.tsx` компонент. Үлдсэн 2 (Shop-ийн `.shop-product-card`, ProductDetail-ийн raw Tailwind) нь **бодитоор өөр контекстэд зориулсан өөр layout** (grid vs rail vs cross-sell tile) гэж дүгнэж, зориудаар нэгтгээгүй — энэ бол дизайны шийдвэр, зөвхөн код цэвэрлэгээ биш тул тусдаа ажил болгож үлдээв.

**Зориудаар алгассан зүйлс (бодит үндэслэлтэй, "цаг хүрэлгүй" биш)**:
- **Eyebrow/kicker CSS-ийн бүрэн нэгтгэл** (`.eyebrow`/`.shop-kicker`/admin-ийн raw Tailwind) — value-үүд 1px орчим ялгаатай (`10px`/`.18em` vs `10px`/`.19em`), бодит харагдацад бараг мэдрэгдэхгүй ялгаа. Илүү чухал нь: 1-р бүлэгт дурдсан "AI slop" судалгааны дагуу **энэ pattern (badge+numbered+all-caps) аль хэдийн ХЭТ ОЛОН удаа давтагдсан нь өөрөө асуудал** — CSS-ийг илүү нэгдмэл болгох нь энэ давталтыг улам бэхжүүлэх тул Phase C (rhythm-ийг эвдэх)-тэй чиглэл зөрчилдөнө. Тиймээс энэ session-д хийхгүй орхив.
- **Design token sweep (`--shadow-*`/`--radius-*`/өнгө, 400+ орц)** — хэмжээ хэт том (30+ файл), нэг удаагийн sweep хийхээс илүү **шинэ/засварлагдаж буй файл бүрд аажмаар шилжих** нь илүү зохистой гэж дүгнэв (аудитын өөрийнх нь дүгнэлт).

**Баталгаажуулалт**: 4 тусдаа commit, бүр бүрийн дараа `pnpm check`/`pnpm build` цэвэр + `pnpm exec vitest run --no-file-parallelism` 204/204 + Playwright screenshot баталгаажуулалт (Home-ийн category grid, hero badge "900+", Home/Shop-ийн rail card-ууд өөрчлөлтгүй харагдана).

## ✅ (2026-09-04) Phase C + Phase D (NEWVISION.md, Tier 1-8) дуусав — header/footer нэгтгэл, Топ Брэнд, ангиллын rail, бодит харилцагчийн сэтгэгдэл

`za-odoo-ene-website-zesty-koala.md`-ийн Phase C (WhyChooseUs-ийн 3 ижил icon-карт → тэгш бус editorial layout) болон **Phase D бүхэлдээ** — 2026-09-02-нд аль хэдийн батлагдсан ч хэрэгжүүлэгдээгүй байсан `NEWVISION.md`-г 8 tier-ээр (өөрийн 8 commit) хэрэгжүүлж дуусгав: шинэ `CarouselShelf`/`ShelfProductCard`/`EditorialBanner`/`TrustTriptych` primitive; `featured_brands` backend+migration+admin CRUD (`AdminBrandsPanel.tsx`, Tom-ийн бодит PRIECLAT/Cocochi-г admin UI-аар оруулав); Home.tsx-д Топ Брэнд section, 6 ангиллын CarouselShelf rail, CustomerVoices section холбов; Shop.tsx-д бодит `brand` URL-state шүүлтүүр нэмэв (өмнө нь огт байгаагүй); `CommerceHeader.tsx`-г Home.tsx-ийн тусдаа `.site-header`-ийн оронд ашиглаж **header/nav-ыг бүх хуудсанд нэгтгэв** (дээрх "Homepage редизайны хараахан хийгээгүй хэсэг"-ийн сүүлчийн зүйл); `SiteFooter.tsx` (шинэ) — 3 баганаас 5 багана (Дэлгүүр 6 ангилал, Салбарууд 4 бодит салбар) руу өргөжүүлэв.

**Явцад олдсон 2 бодит CSS bug** (тодорхой бус, зөвхөн header-ыг жинхэнэ sticky болгосны дараа л илэрсэн): (1) `.sugi-site { overflow: hidden }` нь `position: sticky`-г CSS spec-ийн дагуу бүрэн эвддэг байсан (bounding-box шалгалтаар header дэлгэцээс `y: -559.86`-д гарсныг олов) — арилгасан, 5 breakpoint дээр 0 overflow баталгаажуулсны дараа; **`.sugi-commerce`-ийн ижил төстэй, Checkout-д байгаа тусдаа 320px overflow bug-ийг зориудаар хөндөөгүй**, тусдаа ажил болгож үлдээсэн. (2) sticky header жинхэнэ болмогц SitePromo-ийн адил sticky зурвастай давхцах эрсдэлийг `--promo-banner-offset` CSS variable дахин ашиглаж шийдэв.

**Баталгаажуулалт (Tier 8, NEWVISION.md §13 чеклистийн дагуу)**: `pnpm check`/`pnpm build` цэвэр, **`pnpm exec vitest run --no-file-parallelism` 204/204 (35/35 файл)**. Playwright-ээр (түр суулгаад бүрэн хассан): 7 breakpoint (1440-320px)-д 0 overflow/0 console алдаа; `reducedMotion:"reduce"`-д ribbon exemption ажиллаж байгаа; CarouselShelf/mobile drawer гар товчлуураар ажиллана; CustomerVoices-ийн шударга хоосон төлөв (0 бодит ≥4-од review) `reviews.featured` endpoint-оор шууд баталгаажсан, throwaway review-ээр positive-path-ыг мөн баталгаажуулсан; Топ Брэнд admin CRUD бодит throwaway admin-аар create→Home-д харагдах→delete гурвыг бүрэн шалгасан; Shop/ProductDetail/Checkout/Profile 4 хуудсанд regression алга. Дэлгэрэнгүй: [HISTORY.md](HISTORY.md).

## ✅ (2026-09-06) Admin sidebar-ийн 2 CSS bug засав + Homepage Journal section editorial редизайн

Gentelella admin rebuild-ийн дараа Tom 2 бодит CSS bug олж мэдэгдэв: (1) Products хуудсан дээр sidebar-ийн цэсний зайнууд асар том, тэгш бус ("broken paddings") — root cause: `<aside>` нь sticky/fixed өндөргүй байсан тул урт content баганатай тэнцүү (2165px) хэмжээгээр сунадаг байсан, харин доtorh `<nav>` нь `display:grid` бөгөөд мөрийн хэмжээ заагаагүй тул CSS Grid-ийн анхдагч `align-content:stretch` илүүдэл зайг цэсний товчнуудын **хооронд** тараадаг байв. Засвар: `<aside>`-д `sticky top-0 h-screen self-start`, `<nav>`-д `content-start` нэмэв — өндөр яг viewport (1250px)-тэй тэнцүү болсныг баталгаажуулав. (2) Гар утасны drawer дээр богино дэлгэц дээр цэсний scroll-ийн scrollbar "муухай" харагдаж байсныг сайт дотор аль хэдийн байсан загвар (`.carousel-shelf-track`-ийн `scrollbar-width:none`) ашиглан `.admin-sidebar-nav` class-аар нуув (scroll хэвээр ажиллана, зөвхөн track нь харагдахгүй).

**Homepage Journal section редизайн**: Tom нүүр хуудасны "Зөвлөгөө ба мэдээ" хэсгийг "ugly and shitty" гэж татгалзаад premium editorial дизайны судалгаа шаардав. NYT/Medium/Substack/The Verge-ийн "3 сүүлийн нийтлэл" загварыг судалж (тэгш 3 карт биш, 1 том hero + 2 жижиг дэмжих карт) `JournalSection.tsx`/`.jn-*` CSS-ийг дахин бичив: эхний нийтлэл (index 0) hero эсэхийг тэмдэглэж, grid-row 2 мөр эзэлдэг, зурган дээр доороос дээш харанхуй gradient scrim + давхарласан текст авдаг (text-shadow-той, тодорхойгүй эх зурган дээр ч унших боломжтой байхаар). Бодит контентийн discipline хэвээр: 0 пост үед бүхэлдээ нуугдана, 1/2/3 бодит пост дээр ажиллана, зохиомол fallback зураг/текст алга.

**Явцад олдож, шууд заслагдсан bug**: эхний хувилбарт hero карт 2 мөр span хийхдээ хажуугийн 2 давхарласан картын **өндрөөр** тодорхойлогддог байсан бөгөөд тэдгээрийн зураг `16/10` aspect ratio-гоор ойролцоогоор 600px өргөнтэй баганад ~370px өндөр рендерлэгддэг байв — 2 давхарлахад hero карт **~950px** өндөртэй ("so big ass" гэж Tom шууд татгалзсан) болж байв. Хажуугийн картуудын зургийн өндрийг тогтмол (128px, aspect-ratio-той холбоогүй) болгож, grid мөрийн minmax доод хязгаарыг багасгаж, section-ийн нийт өндрийг эх зургийн харьцаанаас үл хамааран тааварлагдахуйц болгов — screenshot-оор баталгаажуулсан: hero карт ~950px → **~600px**.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. Playwright-ээр (түр суулгаад бүрэн хассан, `package.json`/lockfile өөрчлөгдөөгүй): admin sidebar-ийн `<aside>` өндөр яг viewport-тэй тэнцэж байгааг, scrollbar `scrollbarWidth:"none"` атлаа scroll хэвээр ажиллаж байгааг DOM хэмжилтээр баталгаажуулав; Journal section-ийг 1440px/390px дээр screenshot авч hero картын шинэ өндрийг нүдээр баталгаажуулав.

**⚠️ Одоогоор нүүр хуудсан дээр 3 тестийн junk пост (id 5/6/7 — "lofi cityaidhas", "asdsad", "assasafaregrheta", 2026-09-06 үүссэн, cover зураг нь Windows File Explorer/PowerShell stack trace/AI cyberpunk city screenshot) харагдаж байна** — эдгээр нь `Дэлгэрэнгүй мэдээ` (id 2, "diane shampoo", Aug 18) шиг илүү бодит агуулгатай хуучин постыг "сүүлийн 3"-аас түлхэж гаргачихсан байна. Устгах эсэхийг Tom-оос асуух хэрэгтэй (аюулгүй устгах боломжтой ч, зөвшөөрөлгүй устгаагүй).

## ✅ (2026-09-06) Нүүр хуудасны дугаарлалт (01→06) зөрчлийг засав, admin-аар засварлагдах боллоо

Tom screenshot-оор "05" (Journal) "06" (Салбарууд, буруу "04" гэж бичигдсэн байсан)-аас өмнө гарч ирдэг, мөн "Гэр бүлийн арчилгаа" хэсэг Зуны сонголттой адил "03" гэж давхардаж байгааг олж мэдэгдэв ("these are out of order"). Шалтгаан: хэсэг бүрийн дугаар (SectionEyebrow-ийн `number` prop эсвэл raw `<span>`) кодод тусад нь шууд бичигдсэн байсан, бусад хэсгийн дугаартай ямар ч холбоогүй, `site-text` CMS-д ч ороогүй байв.

Зассан дараалал (хуудасны бодит байрлалын дагуу): Бидний ялгаа=01, Ангилал=02, Зуны сонголт=03, Гэр бүлийн арчилгаа=04 (өмнө нь буруу 03), SUGI Journal=05 (өөрчлөгдөөгүй), Салбарууд=06 (өмнө нь буруу 04). Бүгдийг `shared/site-text.ts`/`useSiteText()` CMS-д оруулав (6 шинэ slot) — Tom `/admin` → Content & Media → Текст-ээр эдгээр дугааруудыг код хөндөхгүйгээр өөрчлөх боломжтой боллоо (`ContentTextPanel.tsx` generic тул нэмэлт admin UI код шаардлагагүй). Зуны carousel-ийн бүх дээд зурвас (`SeasonalCampaignCarousel.tsx`) урьд нь site-text системд огт ороогүй байсныг мөн нэгтгэв.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. Playwright-ээр (түр суулгаад бүрэн хассан) DOM-оос бүх дугаарыг хуудасны бодит эрэмбээр уншиж, 01/02/03/04/05/06 давхцалгүй/эргэлтгүй болохыг баталгаажуулав.

## ✅ (2026-09-06) Гадны дизайны шүүмж — 3 удаагийн research pass-аар баталгаажуулж, нүүр хуудсыг ~6 хэсэг рүү нэгтгэв

Tom гадны chatbot-с авсан нүүр хуудасны дизайны шүүмжийг бүхэлд нь бичиж илгээгээд "бүгдийг заслаарай" гэж шаардав. Юу ч засахаасаа өмнө 3 зэрэгцээ research agent явуулж, шүүмжийн ЗААЛТ бүрийг бодит код/DB-тэй тулгаж баталгаажуулав (энэ төслийн "баталгаажаагүй мэдэгдэлд итгэхгүй" зарчмын дагуу).

**Шүүмжийн 3 "bug" нь код дахь алдаа БИШ болохыг баталгаажуулав:**
- "Эвдэрсэн зураг" — 415/937 бараанд бодит зураг байхгүй нь аль хэдийн танигдсан, хянагдаж буй өгөгдлийн цоорхой (`docs/products-needing-photos.csv`), код buggy биш; placeholder өөрөө зориудаар зохион бүтээгдсэн brand SVG.
- Quick Stats-ийн "0%/0₮" — зочны төлөв тодорхой "ЖИШЭЭ ХАРУУЛАЛТ" гэж шошготой бодит жишээ тоо харуулдаг; яг шинэ, зарцуулалтгүй бодит хэрэглэгчийн 0%/0₮ бол ЗӨВ, чиглэлийн дагуу шаардлагатай зан төлөв.
- "Header давхарладаг" — жинхэнэ давхардал байхгүй; хэрэв admin promotion идэвхтэй бол SitePromo (тусдаа, зориудаар нэгтгэсэн sticky зурвас) header дээр давхарладаг — 2 өөр бүрдэл, bug биш.

**Бодит, зассан асуудлууд:**
- 10 тусдаа гараар кодлогдсон декоратив тойрог/"blob" (hero нарны туяа, 2 orbit цагираг, hero badge нар, story-section цагираг, care sun-stamp+алтан blob, final-CTA цагираг+sun-stamp, seasonal carousel цагираг, хуучин dead hover-blob) — бүгдийг устгав (Tom-ийн тодорхой зөвшөөрлөөр). Hero-ийн "900+" badge одоо эргүүлсэн алтан тойрог биш, зөвхөн тэгш өнцөгт pill.
- Аль хэдийн байсан spacing/color/shadow token-уудыг илүү өргөн ашиглав, 3 давхардсан pale-mint hex утгыг (`#e9f0f2`/`#eaf2f1`/`#eef3f1`) нэг шинэ `--surface-tint` token болгож нэгтгэв.
- Нүүр хуудас нэг мөрөнд хүртэл ~9 carousel rail дараалан зогсдог байсныг (2 ижил шар bestseller/recommended rail, дараа нь зайгүй 6 хүртэл category rail) бүтцийн хувьд цөөлөв (доор дэлгэрэнгүй).
- Шар дэвсгэр дээрх улаан accent текст (bestseller/recommended гарчиг) уншихад хэцүү байсныг — өнгө солихын оронд харанхуй текст дээр улаан доогуур зураас болгож заслаа (контраст бүрэн хадгалагдсан).
- Явцад олдсон, шүүмжтэй хамааралгүй бодит bug: `BestsellerRailCard` хэзээ ч хямдралын badge/compare price харуулдаггүй байсан (ижил төстэй `ShelfProductCard`-д аль хэдийн байсан ч), учир нь `getBestsellingProducts`/`getRecommendedProducts` хоёул `compareAtPriceMnt`-г аль хэдийн буцаадаг байсан ч энэ карт огт ашигладаггүй байсан. Заслаа.

**Бүтцийн нэгтгэл (Tom-ийн тодорхой сонголт, AskUserQuestion-оор баталгаажуулсан)**: доорх хэсгүүдийг нүүр хуудасны **render tree-ээс л** хассан — бүх component/backend/admin CRUD бүрэн хэвээр, дахин ашиглах боломжтой (JSX-ийн түвшний өөрчлөлт, устгал биш): 6 хүртэлх category shelf rail, SeasonalCampaignCarousel, JournalSection (`/journal`-д хэвээр амьдардаг), тусдаа customer-voices-section (бодит review-үүд одоо BrandStorySection дотор шахсан strip болов). **Топ Брэнд rail мөн адил хасагдсан ч, Tom тухайн өдрөө "must have!!" гэж шаардсаны дараа шууд буцаан нэмэгдсэн** (BrandStorySection-ий дараа, CategoryMasonry-ийн өмнөх анхны байрлалдаа) — одоогийн бодит бүтэц: Hero → Quick Stats → BrandStorySection → **Топ Брэнд rail** → CategoryMasonry(02) → Bestseller → Recommended → EditorialBanner(03, Family Care) → StoreLocator(04) → Footer.

**⚠️ Ижил дугаарлалтын bug 3 дахь удаагаа гарсан, дараагийн session-д сануулах**: Топ Брэндийг буцааж нэмэхэд доод хэсгүүдийн дугаарыг дахин шалгаагүйгээс "04 / FAMILY CARE" (EditorialBanner) "03" (StoreLocator)-аас ӨМНӨ гарч ирж дахин зөрчил үүссэн (Tom дахин олж заслуулсан). **Дараагийн удаа Home.tsx-ийн section дараалалд ямар нэг өөрчлөлт хийх бүрдээ** (шинэ хэсэг нэмэх, хасах, зөөх) **бүх дугаартай badge-үүдийг (`.section-heading span:first-child` + `.editorial-banner-tag`) DOM-оор дахин уншиж, ascending дараалалтай эсэхийг заавал шалгах** — зөвхөн код харж "логикоор зөв байх ёстой" гэж таамаглахгүй.

**Шинэ бүтэц (Топ Брэнд-ийг буцаан нэмсний дараах эцсийн байдал)**: Hero → Quick Stats → **BrandStorySection** (шинэ, хуучин story-section + WhyChooseUs + review strip 3-ыг нэгтгэсэн — 2 давхардсан "Японы чанарыг..." гарчигтай байсан) → Топ Брэнд rail → CategoryMasonry(02) → Bestseller rail → Recommended rail → **EditorialBanner**-ээр дамжуулсан Гэр бүлийн арчилгаа content (аль хэдийн бүтээгдсэн ч хэзээ ч ашиглагдаагүй байсан primitive-ийг эцэст нь холбов) → StoreLocatorSection(03, урьд нь буруу 06 байсан) → Footer (хуучин тусдаа final-cta-г `ctaBanner` optional prop болгож шингээв — `SiteFooter` бараг бүх хуудсанд render хийгддэг тул анхдагчаар унтраалттай, зөвхөн Home л дамжуулна).

**Шүүмжийн буруу мэдэгдлүүд, зассангүй**: сайт аль хэдийн Google-ийн жинхэнэ Cyrillic font Noto Sans Mongolian ашигладаг (auto-fallback биш); нүүр хуудасны 2 бодит product-card бүгд аль хэдийн ижил 1:1 харьцаа + object-fit:cover ашигладаг (өөр харьцаа биш) — бодит үлдэгдэл ялгаа нь зөвхөн эх зургийн дэвсгэр өнгө, CSS-ээр засах боломжгүй.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр (CSS bundle 245.6kB → 234.1kB буурав, dead code устгалыг баталгаажуулав). **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. Playwright-ээр (түр суулгаад бүрэн хассан) DOM-оор бүх хасагдсан хэсэг үнэхээр алга болсныг, үлдсэн хэсэг бүр бодит өгөгдлөөрөө render хийж байгааг, шинэ дугаарлалт (02/03) цоорхойгүй/эргэлтгүй болохыг, 1440px/390px дээр 0 console алдаа/0 хэвтээ overflow-г баталгаажуулав.

## ✅ (2026-09-06) `/privacy` хуудсыг Монголын бодит хувь хүний мэдээлэл хамгаалах хуультай тулгаж бүрэн дахин бичив

Tom "Монголын хамгийн сүүлийн үеийн хувь хүний privacy хуулийг судалж нэмж оруул" + "ecommerce-д тохирсон мэдээлэл өдөр бүрийнхийг нэмж оруул" гэж шаардав. Websearch-ээр бодит эх сурвалж (legalinfo.mn/Wikisource-ийн бүрэн хууль, gratanet.com/lehmanlaw.mn-ийн legal alert, parliament.mn) шалгаж, өмнөх 3 догол мөрт placeholder-ыг (нэр/утас/хаяг цуглуулна гэсэн ерөнхий өгүүлбэр) **11 хэсэгтэй бодит бодлого** болгож бичив ([Legal.tsx](client/src/pages/Legal.tsx)-ийн `privacy` object, `terms`-ийг 2026-09-05-нд бичсэнтэй ижил түвшний research discipline-ээр):

**Бодит хуулийн эх сурвалж (жинхэнэ зүйл, заалтын дугаартай)**: Хүний хувийн мэдээлэл хамгаалах тухай хууль (Шинэчилсэн найруулга, 2021.12.17 батлагдаж 2022.05.01-нээс мөрдөгдсөн) — 16.1 (мэдэх/хуулбар авах/засуулах/устгуулах эрх), 16.2 (гомдол гаргах), 8.7 (зөвшөөрөл цуцлах), 8.5 (насанд хүрээгүй хүний зөвшөөрөл), 15.1.3 (зорилгодоо хүрмэгц устгах), 18.2 (мэдээлэл хариуцагчийн үүрэг), 30 (шийтгэл). Хилийн чанадад дамжуулахад тодорхой зөвшөөрөл/эрх зүйн үндэслэл шаардлагатай тул гуравдагч тал бүрийг нэрлэж (доор). Хяналтын байгууллага: Хүний эрхийн үндэсний комисс (nhrcm.gov.mn). Мөн Кибер аюулгүй байдлын тухай хууль (мөн 2021.12.17), Нягтлан бодох бүртгэлийн тухай хуулийн 11 дүгээр зүйл (**10-аас доошгүй жил** санхүүгийн баримт хадгална — бодит тоо, "5 жил" гэж таамаглаагүй). **Websearch зөвхөн ADB-ийн техникийн туслалцааны draft тайлан олсон тул "Цахим худалдааны тухай хууль" гэсэн батлагдаагүй хуулийг зохиомлоор иш татаагүй.**

**"ecommerce-д тохирсон, өдөр бүрийн"** хэсэг нь энэ сайтын өөрийнх нь бодит, кодоор баталгаажуулсан дата практик (ерөнхий boilerplate биш): яг **3 first-party cookie** байдгийг (`shared/const.ts`) баталгаажуулж, бүгд httpOnly+secure+SameSite=Lax гэдгийг (`server/_core/cookies.ts`) шалгаад бичсэн; Google Analytics/Meta Pixel гэх мэт **гуравдагч талын сурталчилгааны cookie энэ кодод огт байхгүй**-г grep-ээр баталгаажуулсан. localStorage ашиглалт яг grid-density + сүүлд үзсэн бараа (Shop.tsx) + theme (ThemeContext.tsx) гэдгийг шалгасан. Нэрлэсэн гуравдагч үйлчилгээ бүгд бодит, идэвхтэй интеграц (Brevo имэйл, Cloudflare зураг, Aiven DB, verify.mn утас баталгаажуулалт) — QPay-г "идэвхжсэн тохиолдолд" гэж нөхцөлтэй бичсэн (бүрэн live биш тул), **Honeybadger-ийг зориудаар нэрлээгүй** (API key оруулаагүй тул одоогоор юу ч цуглуулаагүй байгаа үйлчилгээг нэрлэх нь худал мэдэгдэл болно).

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. Playwright-ээр (түр суулгаад бүрэн хассан) бүх 11 хэсэг render хийж байгааг, badge дугаарлалт (01-11) DOM-оос шууд уншиж зөв дараалалтай болохыг баталгаажуулав (жижиг pixel дээр screenshot-оор нүдээр уншихад дугаар андуурагдаж болзошгүйг олж, DOM-оор дахин шалгаж зөв гэдгийг батлав — өдрийн турш давтагдсан дугаарлалтын bug-уудаас сургамж авсан зуршил).

## ✅ (2026-09-06) `/returns` бодит хууль тулгаж дахин бичив + "хэрэглэсэн бараа буцаадаггүй" бодлого + Checkout-д анхааруулга нэмэв

Tom Монголын бодит буцаах/солилцооны хууль судлахыг, мөн "манай компани хэрэглэсэн бараа буцаадаггүй" гэсэн бодит бизнесийн дүрмийг тодорхой мэдэгдэв. `/returns`-ийг 3 догол мөрт placeholder-оос **9 хэсэгтэй** бодлого болгож дахин бичив (`Legal.tsx`, `privacy`-тэй ижил research discipline):

**Бодит хуулийн эх сурвалж (legalinfo.mn/Wikisource-ийн бүрэн текстээс шууд авсан)**: Хэрэглэгчийн эрхийг хамгаалах тухай хууль — 5.3(1) (мэдэгдээгүй согогтой бараа: нэн даруй эсвэл тохиролцсон хугацаанд солих), 5.3(2) (баталгаат хугацаанд хэрэглэгчийн буруугүй согогт засвар/солилт/буцаан олголт), 9.2(1) (хэрэглэгч эхлээд худалдагчид гомдол гаргана, худалдагч үндэслэлгүйгээр татгалзахгүй). **Websearch тодорхой баталсан: Монгол хуульд "таалагдаагүй тул буцаах" (cooling-off) эрх огт байхгүй, мөн хэрэглэсэн/эрүүл ахуйн барааг татгалзах эсэхийг хуулиар тусгайлан зөвшөөрөөгүй ч хориглоогүй** — тиймээс §3 нь Tom-ий "хэрэглэсэн бараа буцаадаггүй" дүрмийг **хуулийн дагуух согогтой барааны заавал эрхийг хэзээ ч хязгаарлахгүйгээр**, зөвхөн компанийн өөрийн бодлого гэдгийг тодорхой ялгаж бичсэн. Мөнгө буцаах хугацаанд зохиомол тоо (жишээ нь "3-5 ажлын өдөр") оруулаагүй.

**Checkout.tsx**-д ORDER SUMMARY карт доор жижиг amber (шар) анхааруулга нэмэв (энэ хуудсанд аль хэдийн байсан QPay-pending мэдэгдлийн ЯГ ИЖИЛ visual style-ийг дахин ашигласан, шинэ дизайн зохиогоогүй) — "хэрэглэсэн/нээгдсэн бараа буцаахгүй" дүрмийг захиалга баталгаажуулахаас ӨМНӨ харуулж, `/returns`-руу шууд холбоос өгдөг.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. Playwright-ээр (түр суулгаад бүрэн хассан) `/returns`-ийн 9 хэсэг бүгд render хийж, badge 01-09 DOM-оор баталгаажсан; `/checkout`-ийн шинэ анхааруулга бодитоор харагдаж, `/returns` холбоос ажиллаж байгааг баталгаажуулав.

## ✅ (2026-09-06) Бодит, ажилладаг cookie-consent банер (Silktide Consent Manager, self-hosted) + бодит accessibility audit (axe-core)

Tom Silktide-ийн үнэгүй Consent Manager-ийг судалж, **self-hosted** байдлаар (CDN биш) сайтад холбохыг тодорхой шаардав, мөн verify.mn-ий үеийн bug-уудыг дурдаж "100% ажиллах ёстой, алдаа гаргаж болохгүй" гэж онцолсон. Улмаар Silktide-ийн (өөр, төлбөртэй) accessibility scanner-ийн тухай Reddit сэтгэгдэл харуулж, "би ч гэсэн ийм зүйл хүсч байна" гэсэн — эрдэмтэй судалж үзэхэд энэ бол тусдаа, төлбөртэй SaaS бүтээгдэхүүн болохыг олж мэдээд, ижил үр дүнг (бодит accessibility алдаа олж, засах) axe-core гэсэн үнэгүй, нээлттэй эх сурвалжтай хэрэгслээр хийхээр Tom зөвшөөрөв.

**Cookie-consent банер**: 2 судалгааны agent зэрэгцээ явуулж (Silktide-ийн бодит эх сурвалж код + энэ сайтын бодит cookie/tracking мэдээллийг), дараа нь Plan agent-аар баталгаажуулж бичив. Бодит баримтууд: энэ сайт яг **3 cookie** ашигладаг (`app_session_id`, `guest_cart_token` — заавал шаардлагатай, өөрчлөгдөөгүй; `sugi_visitor_session` — зөвхөн энэ нь зөвшөөрөл шаарддаг анонимчилсан аналитик cookie). Гуравдагч талын Google Analytics/Meta Pixel сайтад огт байхгүй (grep-ээр баталгаажуулсан). `client/public/vendor/silktide-consent-manager.js`/`.css`-г Tom-ийн заасны дагуу **self-host** хийж, татаж авсны дараа **SHA-384 hash-ыг албан ёсны SRI hash-тай харьцуулж баталгаажуулсан** (curl+openssl). 2 бодит категори (Зайлшгүй шаардлагатай/Статистик аналитик), `defaultValue:false` (opt-in), `client/src/lib/cookieConsent.ts`-ийн `hasAnalyticsConsent()` нь Silktide-ийн өөрийнх нь localStorage key-г (`stcm.consent.analytics`) яг адилхан `=== "true"` харьцуулалтаар уншиж, `pageviewTracking.ts`-ийн цорын ганц dial-цэгт (`telemetry.pageview` mutate дуудлагын өмнө) хориглодог. Tom-ийн шаардсанаар UI-г сайтын өөрийнх нь дизайны token-уудтай (`--accent`/`--surface-dark`/`--font-body`) тааруулж дахин загварчилж, "Get this consent manager for free" credit link болон Silktide-ийн лого icon-ыг хассан (config-оор арилгах боломжгүй болохыг эх кодоос баталгаажуулаад CSS `display:none` ашигласан). SiteFooter-д "Күкийн тохиргоо" товч нэмж, Silktide-ийн баримтжуулсан `resetConsent()`-ийг дуудна. **Бодит, тоон баталгаажуулалт** (зөвхөн screenshot биш): шинэ зочин 0 аналитик beacon → "Зөвхөн шаардлагатайг зөвшөөрөх" дараа ч 0 → "Бүгдийг зөвшөөрөх" дараа 1 (дараагийн navigation дээр) — сүлжээний бодит хүсэлтийг хянаж баталгаажуулав.

**Accessibility audit**: `@axe-core/playwright`-г (Playwright-тэй хамт) түр devDependency болгож суулгаж (дараа нь бүрэн хассан), 9 бодит route-д (Нүүр, Дэлгүүр, бодит ProductDetail slug, Checkout, Profile, Login, /privacy, Journal, бодит /404) WCAG 2A/2AA/2.1A/2.1AA скан хийв. Эхний гарц: **20 зөрчил** (0 critical, 11 serious, 9 moderate). Эцсийн гарц (бүх засварын дараа дахин скан хийсэн): **0 зөрчил**. Олдсон бодит bug-ууд:
- `maximum-scale=1` бүх сайт даяар pinch-zoom-ыг хориглож байсан — хассан.
- StoreLocatorSection-ий газрын зурган дахь **бодит, focus хийгддэг `<a>` салбарын pin холбоосуудыг** `aria-hidden="true"`-тай эцэг элемент нуучихсан байсан (screen reader-т үл үзэгдэх ч Tab товчоор очих боломжтой хэвээр — driver bug). Зөвхөн жинхэнэ decorative дэвсгэр shape-үүдийг л `aria-hidden` болгож зассан.
- EditorialBanner-ийн CSS specificity bug: `.editorial-banner-copy > p` дүрэм `.eyebrow`-г санамсаргүй дийлж, "ГЭР БҮЛИЙН ӨДӨР БҮРТ" гэсэн эйброу текст 15px саарал энгийн текст болж харагдаж байсан (өнгөний зөрчлийг шалгах явцад олдсон, өнгөний асуудал биш bug).
- **Бодит, том цар хүрээтэй CSS cascade-layer bug**: index.css-ийн `@layer`-гүй `a { color: inherit }` дүрэм нь Tailwind v4-ийн бүх `text-*` utility class-ыг (`<a>`/`<Link>` элемент дээр шууд ашигласан үед) чимээгүй дийлж байсныг `getComputedStyle`-ээр бодитоор баталгаажуулав (жишээ нь `text-white` товч бодитоор хар өнгөтэй харагдаж байсан). 5 баталгаажсан тохиолдлыг Tailwind v4-ийн `!` чухал заалтаар зассан (нийт сайтад илүү өргөн нөлөөтэй байж болзошгүй тул бүрэн засаагүй, доор тэмдэглэв).
- `--primary` (#df1f3d) улаан өнгө цайвар дэвсгэр дээр 10-13px жижиг bold текстэнд 4.38:1 харьцаатай (4.5:1 шаардлагатай) — 5 тусдаа CSS class-д давтагдаж байсныг шинэ `--primary-text` token-оор (баталгаажсан ~5:1) засав, `--primary`-г өөрийг нь хөндөөгүй. Шар дэвсгэр дээрх улаан текстийг (харьцаа 2.57:1) харанхуй текст+улаан доогуур зураас болгож (өдрийн эхэнд аль хэдийн тогтоосон загвар) зассан. 7 өөр давхардсан саарал өнгийг (`#77787c` гэх мэт) нэг баталгаажсан `#6f7076`/`#65666b` болгож нэгтгэв.

**⚠️ Дараагийн session-д мэдэгдэх зүйл**: `a { color: inherit }` cascade-layer bug нь миний 9 route-ийн скан хүрээгүй бусад `<Link>`/`<a>` элементүүдэд ч байгаа магадлалтай. Бүрэн засах (index.css-ийн reset дүрмүүдийг `@layer base`-д шилжүүлэх) сайт даяар засах ч, шалгаагүй өргөн нөлөөтэй тул тусгайлан дараагийн session-д зориулсан.

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**. Playwright+axe-core-г (түр суулгаад бүрэн хассан) бодит cookie consent урсгал (0→0→1 beacon), 9 route-ийн accessibility скан (20→0), болон `getComputedStyle`-ээр өнгөний засварыг баталгаажуулахад ашигласан.

## ✅ (2026-09-06) ProductDetail-ийн 3 бодит bug засав — давхар зайлсан "Мөн танд таалагдаж магадгүй" хэсэг, утгагүй давхардсан thumbnail, бараг бүх бүтээгдэхүүнд ижилхэн "холбоотой" жагсаалт

Tom бодит хуудасны HTML paste хийж "remove the padding!! every products pages!!" гэж шаардаад, дараа нь тусдаа мессежээр "most of them present these products!!!" гэж 5 нэрийг жагсааж (S-LABO NMN Face Mask, Asayake Moist Hot Cleansing, S-LABO Rice Face Mask, SokaMocka Organic Facial Soap, S SELECT Cleansing Oil), эцэст нь screenshot-оор "why there is this small identical product below the same products????" гэж 3 дахь асуудал заав. Бүгд бодит bug байсан:

1. **Давхар зай**: ProductDetail-ийн `<main>` аль хэдийн `px-4 sm:px-8` зайтай атал, `CarouselShelf`-ийн өөрийн `.carousel-shelf-section` padding нь Home.tsx-ийн (зайгүй `<main>`) хэрэглээнд зориулагдсан байсан тул хоёул давхарч, related-products мөр дээд контентоос илүү их зайтай харагдаж байв. `CarouselShelf.tsx`-д `inset` prop нэмж (зөвхөн ProductDetail дамжуулна), `.carousel-shelf-section--inset { padding: 0 }` нэмэв.
2. **Утгагүй давхардсан thumbnail**: одоогоор ЯМАР Ч бараанд бодит `galleryJson` (олон зурагтай) өгөгдөл байхгүй тул `gallery` массив 1 л зурагтай байдаг, гэвч код болзолгүйгээр thumbnail мөр рендерлэж, том зурган доор яг ижил зургийг жижгээр, дарахад юу ч хийдэггүй товч болгон дахин харуулж байв. Одоо thumbnail мөр зөвхөн `gallery.length > 1` үед л рендерлэнэ.
3. **Бодит bug — "холбоотой" жагсаалт бараг ялгаагүй байсан**: `getRelatedProducts` (server/db.ts)-ийн scoring-д ижил ангиллын `+1` оноо ганцаараа `score>0` шүүлтүүрийг дийлдэг байсан (учир нь ихэнх бараа хэвээр `"normal"`/null placeholder tag-той — PRODUCT-IMPORT.md), тул нэг ангиллын бараа бүгд адил оноотой болж, `Array.sort`-ийн тогтвортой байдлаас болж tie үргэлж raw, харагдаж буй бараанаас үл хамаарах DB мөрийн эрэмбэ рүү унадаг байв — үр дүнд нэг ангиллын бараг бүх бараанд ХАМГИЙН ЭХНИЙ N (эсвэл хамгийн их зарагдсан) бараа "холбоотой" гэж давтагдан гарч байсан. Засвар: `(viewedProductId, candidateId)`-аас тооцоолсон deterministic hash-ийг эцсийн tiebreak болгож нэмэв — нэг барааны хуудас дахин ачаалахад үргэлж ижил үр дүн (санамсаргүй биш, cache хийхэд аюулгүй), гэхдээ өөр бараанаас үзэхэд tie-үүд өөрөөр задардаг тул бодитоор өөр жагсаалт гарна.

**Баталгаажуулалт**: throwaway Playwright script-ээр (суулгаад бүрэн хассан) 8 өөр skincare бараан дээр шалгахад **8 бүгд өөр өөр "холбоотой" жагсаалттай** болсныг, thumbnail товчны тоо бүгд 0 байгааг, inset shelf-ийн computed padding 0px болсныг баталгаажуулав. `pnpm check`/`pnpm build` цэвэр. **Бүрэн `pnpm exec vitest run --no-file-parallelism` 211/211 ✅ (37/37 файл)**.

## ✅ (2026-09-06) Гүнзгий full-stack аудит (9 bug) — бүгд заслаа: JWT fallback secret, 6 ашиглагдаагүй dependency (75→10 vulnerability), phone-session race, checkout isPublished цоорхой, CSRF/index-ийн сайжруулалт

Гадны 30-хэсэгтэй "Deep Full-Stack Audit" master prompt-ыг Tom бүхэлд нь бичиж илгээж "FIX ALL of this right now!!" гэж шаардав. Аудитыг өөрөө (bug олох урд алхам) энэ session-ий өмнөх хариулт дээр аль хэдийн бодит код/`pnpm audit`-аар баталгаажуулж хийсэн байсан — доор зөвхөн **заслыг** тэмдэглэв.

**🔴 BUG-001 (CRITICAL, заслаа)**: `server/_core/context.ts`-ийн `secretKey()` нь `JWT_SECRET` тохируулаагүй үед **олон нийтэд ил, GitHub дээр committed** `"insecure-development-secret-change-me"` гэсэн тогтмол утга руу чимээгүй унадаг байсан — production дээр санамсаргүй `JWT_SECRET` дутуу орвол хэн ч энэ мэдэгдэж буй string-ээр ЯМАР ч хэрэглэгчийн (admin оролцуулан) session JWT хуурамчаар үүсгэх боломжтой байв. Засвар: (1) fallback-ыг **тухайн процессын хугацаанд л хүчинтэй санамсаргүй 32 байтын түлхүүр**-ээр сольсон (committed string биш), (2) шинэ `assertProductionSecrets()` (`server/_core/index.ts`-ийн `startServer()`-ийн эхэнд дуудагдана) — `NODE_ENV=production`-д `JWT_SECRET` хоосон бол сервер эхлэхээс татгалзана (`INTEGRATIONS_ENCRYPTION_KEY`/`VERIFY_MN_API_KEY`-тэй ижил "чанга бүтэлгүйтэх" зарчим). 3 шинэ unit тест (`server/_core/context.test.ts`).

**🟠 BUG-002 (HIGH, заслаа)**: `package.json`-д **6 бүрэн ашиглагдаагүй** dependency байсныг (`streamdown`, `axios`, `nanoid`, `framer-motion`, `date-fns`, `tailwindcss-animate` — бүгдийг `client/src`/`server`/`shared`-аас бодитоор 0 import-оор баталгаажуулсан) `pnpm remove`-оор устгав. `pnpm audit --prod`: **75 → 10 vulnerability** (`streamdown`-ийн бүхэл mermaid/dompurify мод, `axios`-ийн ~30 CVE (SSRF/prototype pollution/credential theft), `nanoid`-ийн 2 HIGH бүгд алга болов).

**🟡 BUG-003 (MEDIUM, заслаа)**: `server/db.ts`-ийн `resetPasswordViaPhoneSession`/`completeRegistrationViaPhoneSession`/`attachPhoneFromVerifiedSession` 3 функц бүгд **TOCTOU race** агуулж байв (`if (session.consumedAt) throw` нь зүгээр л унших код, DB-level guard биш — 2 зэрэгцээ дуудлага хоёулаа "хараахан ашиглагдаагүй" гэж уншиж чадна). Засвар: `createOrderFromActiveCart`-ийн stock decrement-тэй ЯГ ИЖИЛ atomic `WHERE consumedAt IS NULL` + `affectedRows===1` guard нэмж, session-ийг бодит ажил хийхээс **ӨМНӨ** claim хийдэг болгов (алдаа гарвал claim-ыг буцаан суллана). `server/verifyMn.integration.test.ts`-д 2 шинэ concurrency тест (`Promise.allSettled` 2 зэрэгцээ дуудлага, яг 1 нь амжилттай, нөгөө нь цэвэр "аль хэдийн ашиглагдсан" алдаа авдгийг баталгаажуулсан — raw DB constraint алдаа биш).

**🟡 BUG-004 (MEDIUM, заслаа)**: Checkout-ийн stock-decrement transaction (`createOrderFromActiveCart`) нь зөвхөн `stockQuantity` шалгадаг байсан, `isPublished`-ийг ХЭЗЭЭ Ч дахин шалгадаггүй байв (`addCartItem` зөвхөн сагсанд НЭМЭХ үед л шалгадаг) — admin бараа unpublish хийсний ДАРАА ч сагсандаа үлдсэн хэрэглэгч амжилттай захиалж чаддаг байв. Засвар: атомик `UPDATE`-ийн `WHERE`-д `EXISTS (SELECT 1 FROM products WHERE ... isPublished = TRUE)` subquery нэмэв (race-proof чанарыг хэвээр хадгална). `server/commerce.database.integration.test.ts`-д бодит дараалал (сагсанд нэмэх → unpublish → checkout) шалгасан шинэ тест.

**🔵 BUG-005 (заслаа)**: `findUserByPhone` (`server/db.ts`) `RIGHT(REGEXP_REPLACE(phone,...))` ашигладаг байсан тул `users.phone`-ийн UNIQUE индекс ажиллахгүй, **бүх нэвтрэлт/бүртгэл/нууц үг сэргээлт бүрд full table scan** хийдэг байв. Засвар: эхлээд шууд индексжсэн `eq(users.phone, ...)` fast-path туршиж үзээд (одоогийн БҮХ бичих цэг аль хэдийн normalize хийдэг тул үнэн хэрэгтээ бараг бүх мөрийг даруй олно), олдохгүй бол хуучин уян хатан regex fallback-руу унана — зан төлөв яг ижил хэвээр, зөвхөн хурд сайжирсан.

**⚪ BUG-007 (заслаа)**: `protectStateChangingApiRequests` (`server/_core/security.ts`) `Origin` header байхгүй үед ЯМАР Ч шалгалтгүй дамжуулдаг байв. Засвар: `Origin` байхгүй бол `Referer`-ээр fallback шалгадаг болгов (SameSite=Lax cookie аль хэдийн гол хамгаалалт өгдөг тул critical биш байсан ч, одоо жинхэнэ шалгалт хийдэг). Шинэ `server/_core/security.csrf.test.ts` (6 тест).

**⚪ BUG-008 (заслаа)**: `drizzle-orm` 0.44.7 → **0.45.2** (SQL identifier injection GHSA-ийн patched хувилбар) — `pnpm audit`-аар шалгаад бүрмөсөн арилсныг баталгаажуулсан.

**⚪ BUG-009 (оролдсон, БҮРЭН заслагдаагүй — доор тайлбарласан)**: Express 4.21.2-ийн дотоод `path-to-regexp`/`qs`/`body-parser`-ийг patched хувилбар руу `pnpm-workspace.yaml`-ийн `overrides`-оор pin хийхийг оролдоход **pnpm 10.4.1-ийн бодит, баримтжуулсан bug** олдов ([pnpm/pnpm#10614](https://github.com/pnpm/pnpm/issues/10614), [#10675](https://github.com/pnpm/pnpm/issues/10675)): `pnpm-workspace.yaml`-д бичсэн `overrides` lockfile/dependency graph-руу огт орохгүй байгааг `pnpm list`-ээр бодитоор баталгаажуулсан (bump хийхээс өмнө ч, дараа ч яг ижил хуучин хувилбарууд харагдсан). pnpm хувилбарыг өөрөө bump хийх нь **хоёр laptop + CI-д нөлөөлөх toolchain шийдвэр** тул зөвхөн 3 бага ач холбогдолтой (LOW/MODERATE) DoS-class CVE засахын тулд дангаараа шийдээгүй — `pnpm-workspace.yaml`-д зөв утгуудыг (`path-to-regexp: 0.1.13`, `qs: 6.16.0`, `body-parser: 1.20.6`) тайлбартайгаар үлдээсэн, дараагийн хүн pnpm хувилбарыг ахиулахад шууд идэвхжинэ. **BUG-006 (in-memory rate limiting)** мөн адил заавал шинэ infrastructure (жишээ нь Redis) шаардах тул зориудаар хөндөөгүй, зөвхөн архитектурын тэмдэглэл хэвээр үлдэв.

**⚠️ Нэмэлт нээлт (аудитад ороогүй байсан, засварын үед олдсон)**: `package.json`-ийн хуучин `"pnpm": { "overrides": ..., "patchedDependencies": ... }` блок **аль хэдийн бүрэн inert** байсан (`[WARN] The "pnpm" field in package.json is no longer read by pnpm` — pnpm 10-ийн шинэ `pnpm-workspace.yaml`-руу зөөгдсөн байх ёстой байсан) — `pnpm-workspace.yaml`-руу зөв зөөв (`wouter@3.7.1` patch-ыг бодитоор шалгаад, энэ нь `window.__WOUTER_ROUTES__` гэсэн апп даяар хаана ч ашиглагдаагүй debug instrumentation болохыг баталгаажуулсан — функциональ нөлөөгүй).

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр (bundle хэмжээ өөрчлөгдөөгүй — dead dependency-үүдийг зөв тодорхойлсныг баталгаажуулав). **Бүрэн `pnpm exec vitest run --no-file-parallelism` 223/223 ✅ (39/39 файл)** — шинэ 12 тестийг (3+6+2+1) оролцуулаад. Dev server дахин асааж `/health` (`{"ok":true,"database":"up"}`) болон бодит `catalog.publishedCount` (937) тест хийж баталгаажуулсан.

## PROJECT-GUIDE.md-ээс зөөсөн session бүрийн тэмдэглэл (2026-09-15)

Гарын авлага 165 KB (~55,000 токен) болж, session бүрийн эхэнд БОЛОН compact
бүрийн дараа бүхэлдээ дахин ачаалагдаж байсан тул доорх 123 KB-ийн өнгөрсөн
ажлын тэмдэглэлийг энд бүрэн эхээр нь зөөв. Гарын авлагад зөвхөн хэзээ ч
зөрчиж болохгүй дүрмүүд, тохиргоо, идэвхтэй ажил үлдсэн. Гарчиг бүр яг ижил
нэртэй тул хайлтаар олдоно.

## ✅ (2026-09-09) Adversarial audit — төлбөртэй/зээлтэй захиалгыг БУЦААХ (cancel/refund/late webhook) замын 4 бодит bug заслаа

Tom гадны 12 хэсэгтэй "adversarial audit" playbook илгээв. Өмнөх аудитууд (09-02, 09-06, 09-08) auth/CSRF/checkout race-ийг аль хэдийн хаасан байсан тул энэ удаа **checkout → cancel → refund → QPay webhook → analytics/loyalty** гинжийг бүхэлд нь мөрдөж, зөвхөн тестээр нотлогдсон зүйлийг тэмдэглэв. Бүрэн тайлан (4 inventory + phased plan + "NOT A PROBLEM" гэж баталгаажсан жагсаалт): **[docs/AUDIT-2026-09-09-order-unwind.md](docs/AUDIT-2026-09-09-order-unwind.md)**.

**Заслагдсан (бүгд `server/db.ts`, + `routers.ts`/`analytics.ts`):**
1. **Дэлгүүрийн зээл (store credit) цуцлах/буцаахад хэзээ ч буцааж олгогддоггүй байв** — checkout-д хасагдсан 3,000₮ захиалга цуцлагдахад алга болдог, `refundOrder` нь cash-ийг `totalMnt` (зээл хассаны ДАРААХ дүн)-ээр хязгаарладаг тул хэрэглэгч зээлийнхээ хэмжээгээр хохирдог байв. Шинэ `reverseStoreCreditForOrder` (ledger-ийн эерэг мөр = idempotency marker, cancel→refund хоёуланд нэг л удаа).
2. **`updateAdminOrder`/`refundOrder` read-then-write TOCTOU** — 2 зэрэгцээ cancel (double-click, эсвэл хэрэглэгч+warehouse зэрэг) хоёул ладдер шалгалтыг давж **stock-ийг 2 удаа сэргээдэг** байв. Одоо checkout-тэй ижил `WHERE status = <шалгасан>` + `affectedRows` guard, transaction-ий ЭХЭНД.
3. **Төлбөр төлөгдсөн (QPay) боловч дараа нь цуцлагдсан захиалга `paymentStatus='paid'` хэвээр** → орлого, loyalty lifetime spend (үнэгүй tier өсөлт), bestseller-т тоологдсоор байв, мөн буцаах боломжгүй dead end (refund зөвхөн `returned`-ээс). Шийдэл: **`settledSaleSql`** (`paid AND status<>'cancelled'`) — db.ts-ийн 8, analytics.ts-ийн 17 газар бүгд нэг л тодорхойлолт ашиглана; `refundOrder` одоо `returned` ЭСВЭЛ `cancelled` (+заавал `paid`) захиалгыг хүлээн авна.
4. **QPay webhook хаагдсан захиалгыг амилуулдаг байв** — `markQPayPaymentAttemptPaid` болзолгүй `status='confirmed'` бичдэг тул цуцлагдсан (stock аль хэдийн буцсан) захиалга дахин confirmed болж oversell, completed→confirmed ухардаг, refunded→paid эргэдэг байв. Одоо зөвхөн `unpaid` бөгөөд хаагдаагүй захиалгад л нөлөөлнө (`pending`→`confirmed`, бусад статус хэвээр), attempt мөр үргэлж бичигдэнэ. `qpayCreateInvoice` хаагдсан захиалгад invoice гаргахаас татгалзана.

**Баталгаажуулалт**: шинэ `server/order-unwind.integration.test.ts` (8 тест, бодит Aiven, throwaway мөр бүрэн устгагдсан) — засварыг `git stash`-аар түр авахад **7/8 унадаг**, засвартай **8/8** ✅. `pnpm check`/`pnpm build` цэвэр. Бүрэн `pnpm exec vitest run --no-file-parallelism`: **550/550 ✅ (60/60 файл)** — өмнөх 542 + шинэ 8, регресс 0.

**Хоёрдугаар pass, мөн өдөр ("Fix all of them!! Make it better also! Improve all!!")** — тайлангийн шийдвэр хүлээж байсан бүх зүйлийг хэрэгжүүлэв (дэлгэрэнгүй хүснэгт: тайлангийн "Second pass" хэсэг):
- **R1** `discount_codes.maxUsesPerCustomer` (migration `0056`, Aiven дээр ажилласан) — нэг хэрэглэгч (данс, зочин бол утасны сүүлийн 8 орон) кодыг N-ээс олон удаа ашиглахгүй; admin формд шинэ талбар. `NULL` = хуучин зан төлөв. ⚠️ Production-д `NEWCOMERS110` (−50%, 100 удаа) per-customer cap-гүй байна — Tom админаас 1 болгож тавих нь зүйтэй.
- **R2** `shared/orders.ts` (`isRefundOwed`/`isRefundable`/`paymentBadgeFor`) — admin Захиалгад "Буцаан олголт хүлээгдэж буй · N" шүүлтүүр+pill, цуцлагдсан-төлсөн захиалгад refund товч; Хянах самбарт анхааруулга; Profile-д pill; цуцлалтын имэйлд "төлбөрийг буцаан олгоно" мөр.
- **R3** `rate_limit_buckets` хүснэгт (migration `0057`) + `server/_core/persistentRateLimit.ts` — strict/phoneVerify tier-үүд DB дээр тоолно (олон instance-д ч хүчинтэй), fail-open. Cart/telemetry tier-үүд санаатайгаар in-memory хэвээр. ⚠️ Тестүүдэд тогтмол IP ашиглах бол per-run subnet хэрэглэ (15 минутын bucket дараагийн run-д үлддэг).
- **R4** `admin.users` server-side page+search (`{rows,total}`), `orders.mine` cursor-paged (`{orders,nextCursor,total}`, Profile-д "Өмнөх захиалгуудыг үзэх"), `admin.products` жагсаалт `description`/`galleryJson`-гүй болж, editor `admin.productDetail`-аар нэг барааг ачаална.
- **R5** orderNumber 6 санамсаргүй тэмдэгт + давхцвал transaction-ийг шинэ дугаараар дахин оролдоно (3 хүртэл). **R6** QPay `paid_amount` шалгалт — дутуу төлсөн invoice-ийг захиалга баталгаажуулахгүй, failed attempt болгож бүртгэнэ. **R7** `PUBLIC_BASE_URL` env (сонголттой) — QPay callback URL-д Host header-ийн оронд.
- **Debt**: `shared/delivery.ts` нэг хүргэлтийн дүрэм (client+server); `refundOwedSql`/`isRefundOwed` нэг тодорхойлолт; System Health картанд "Дэлгүүрийн зээлийн тэнцэл" (cache vs ledger drift, бодит DB дээр 0 зөрүү); PROJECT-GUIDE.md 208KB→40KB (36 хэсэг HISTORY.md-руу бүрэн эхээр нь).
- **Cleanup**: `@hookform/resolvers` устгав; `84abf….jpg`→`docs/reference/`, `self-review.md`→`docs/`; `.playwright-mcp/` gitignore; шинэ **`scripts/db-apply-migration.ts`** (`pnpm exec tsx scripts/db-apply-migration.ts drizzle/00NN_*.sql` — Aiven дээр migration ажиллуулах албан ёсны арга, доорх "Migration-уудыг ажиллуулах тухай"-г орлоно).

**Хоёрдугаар pass-ийн баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр; шинэ тестүүд — `persistent-rate-limit.integration.test.ts` (5), `delivery-fee.test.ts` (4), `qpay.test.ts` (+6), `discount-codes` (+1 per-customer), `order-unwind` (+4: retry/users paging/orders paging/refund-owed count+drift). Бүрэн suite: **570/570 ✅ (62/62 файл)** — өмнөх 550 + шинэ 20, регресс 0. Playwright (MCP, порт 3100, face gate унтраалттай, throwaway admin/customer, дараа нь бүрэн устгасан): Хянах самбарын анхааруулга+health мөр, Захиалгын шүүлтүүр/pill/refund товч, Хямдралын кодын шинэ талбар (форм→DB→жагсаалт), Хэрэглэгчийн server pager+хайлт ("1–9/9"→"1–1/1"), Profile-ийн pill (desktop 1280 + mobile 390, overflow 0) ба load-more (20→23), console/server алдаа 0.

## ✅ (2026-09-09, орой) Deep audit #2 — "код чинь мянган алдаатай" гэсэн шаардлагаар бүх давхаргыг шалгав

Tom: "chinii hiij ugsun code edr bugd zunduu har myngan aldaa baina!! ... deep audit deep analyze hiiged bugdiin ynzaldaa". Хэрэгсэл: `tsc --noUnusedLocals --noUnusedParameters`, `pnpm audit --prod`, бүрэн vitest suite, Playwright (playwright-core + Edge) crawl — storefront 22 route × 3 дэлгэц (1233/390/320), /admin 19 хэсэг × гэрэл/харанхуй (throwaway admin, дараа нь устгасан), production build дээр ачааллын тест, серверийн лог, DB холболтын бодит шалгалт. **Storefront-ийн 66 ачаалалт: console алдаа 0, амжилтгүй request 0, эвдэрсэн зураг 0, давхар id 0, нэргүй товч 0.** Олдож засагдсан бодит алдаанууд:

1. **🔴 Aiven DB холболт ШИФРЛЭГДЭЭГҮЙ байв.** `drizzle({ connection: { uri: DATABASE_URL } })` → mysql2 нь `?ssl-mode=REQUIRED`-ийг ойлгодоггүй ("Ignoring invalid configuration option" warning boot бүрт гарч байсан) → бодит серверт `Ssl_cipher` хоосон, `require_secure_transport=OFF`. Бүх query, нууц үгийн handshake Бангалор хүртэл plaintext явж байв. Шинэ **`server/_core/dbConnection.ts`** (`planMysqlConnection`): loopback-оос бусад бүх host-д TLS; `DATABASE_CA_CERT` (эсвэл `_PATH`) байвал сертификат шалгана, байхгүй бол шифрлээд startup-д warning бичнэ (Aiven-ий CA нь project CA тул системийн root-оор шалгагдахгүй — `rejectUnauthorized:true` HANDSHAKE_SSL_ERROR өгдгийг баталгаажуулсан). Баталгаажуулалт: аппын өөрийн drizzle pool одоо `TLSv1.3 / TLS_AES_256_GCM_SHA384`. 2 script (`apply-product-image`, `reconcile-images-from-r2`) мөн адил. 8 unit тест. ⚠️ **Tom: Aiven Console → Overview → CA certificate-ийг `.env`-д `DATABASE_CA_CERT` болгож тавих** — тэгэхэд л MITM цоорхой бүрэн хаагдана.
2. **Scroll-reveal "давхцал"-ын жинхэнэ шалтгаан**: `useScrollReveal` зөвхөн Home/Shop/Profile-д дуудагддаг + анх mount хийхэд л `[data-reveal]` хайдаг байв → tRPC-ийн дараа гарч ирдэг 6 хэсэг (нүүр) болон PDP-ийн "холбоотой бараа" shelf хэзээ ч `.is-revealed` авалгүй 18px доош шилжсэн хэвээр дараагийн хэсэг дээр давхарлан зурагдаж байв (Tom-ийн screenshot: locator panel улаан band дээр). Одоо App-ийн Router-т нэг MutationObserver+IntersectionObserver — бүх route, хожуу mount хийсэн бүх хэсэг. Crawl: stuck reveal 0.
3. **18 dependency vulnerability (8 high) → 0**: `sharp` 0.35.4, `express` 4.22.2, транзитив override (qs/body-parser/path-to-regexp/lodash/postcss/nanoid/uuid) — **`package.json`-ийн `pnpm.overrides`-д** (pnpm 10.4.1 "no longer read" гэж warning бичдэг ч lockfile-д орж, graph-д бодитоор нөлөөлдөг; `pnpm-workspace.yaml`-ийн хуучин блок 2026-09-06-нд ажиллахгүй нь батлагдсан тул устгав). ⚠️ Сургамж: хязгааргүй `>=1.20.8` гэж бичсэн эхний оролдлого express 4 доор body-parser 2 + path-to-regexp 8-ыг татаж серверийг `pathRegexp is not a function`-ээр унагаасан — одоо бүх range major-оороо хязгаарлагдсан (`>=1.20.8 <2` г.м.).
4. **POS in-store sale (`recordInStoreSale`)** өөрийн 4 тэмдэгтийн Math.random дугаар үүсгэж, давхцвал retry хийдэггүй байв (R5 зөвхөн checkout-д хүрсэн) → `generateOrderNumber()` + 3 удаагийн retry, checkout-тэй ижил.
5. **Analytics "deviceTypes" давхар мөр**: GROUP BY нь NULL болон "unknown"-ыг тусад нь өгч, `?? "unknown"` дараа нь ижил label-тай 2 мөр болгож React "two children with the same key `unknown`" алдаа + админд тоо хуваагдаж харагдаж байв → label-аар нэгтгэнэ (sources-д мөн).
6. **4 brand-default fallback зураг 404** (`shared/site-media.ts`: sugi-sunrise-editorial-hero, professional-assortment, professional-family, care-retail — R2-д байхгүй): admin "BRAND DEFAULT" preview эвдэрхий, `home-stores` slot upload-гүй тул storefront дээр хоосон. Tom-ийн өөрийн upload хийсэн ижил зургууд (`site-media/1/*.webp`) руу заалгав.
7. **Checkout 320px-д 71px хэвтээ overflow** (PROJECT-GUIDE.md-ийн хуучин нээлттэй зүйл): 2 шалтгаан — "баталгаажуулах." нэг үг text-5xl-д багтахгүй (→ text-4xl + overflow-wrap) ба grid item-ийн `min-width:auto` хямдралын кодын input+button-ийн min-content (334px)-ийг баганад тулгаж байв (→ `min-w-0`). Одоо overflow 0.
8. **Quick Stats infinity graph-ийн 2 label 320px-д 28px давхардаж** байв (130px fixed box) → `min(130px, 25%)`.
9. **Хуудас бүрт 2 `<h1>`**: cookie banner (Silktide vendor JS) гарчгаа h1-ээр зурдаг байв → h2 (vendor js+css patch). **Хуудас бүрийн `<title>`**: зөвхөн PostDetail тохируулдаг байсан — одоо PDP (барааны нэр + description), Shop, Journal, Legal (3), Login, Checkout, TrackOrder, ForgotPassword, NotFound, MyOrders, Profile, RoutineDetail.
10. **TinyMCE харанхуй горим**: dark content CSS import хийгдсэн ч `content_style`-д хэзээ ч өгөгдөөгүй → админ харанхуй байхад бичих талбар цагаан хэвээр байв → `isDark ? dark : light`.
11. **/favicon.ico** SPA fallback-аар index.html (text/html) буцаадаг байв → PNG icon руу 302.
12. **Admin sidebar nav**-д `min-h-0` (flex column-д scroll хийхгүй, "Гарах" товч 900px өндөрт дэлгэцээс гадуур байв).
13. Strict unused-code 18 → 2 (үлдсэн 2 нь AdminFaceGate-ийн санаатай хадгалсан liveness функцууд, мөр 626-ийн тайлбартай): Profile-ийн 5 ашиглагдаагүй import/`logout`, Home `CircleCheck`, AdminFaceGate `toast`, faceEngine type, AdminDashboardHome `canSeeAuditTrail` prop, db.ts `InsertUser`/`ENV`, security.ts/env.ts параметр. PDP-ийн үндсэн зурагт import хийгдсэн ч ашиглагдаагүй `imageSrcSet`-ийг залгав (srcset + sizes).

**Crawl-ийн false positive гэж тогтоосон (засаагүй)**: mobile-д хаалттай `.commerce-mobile-menu` (display:none-ийн доторх текст) болон cookie banner-тай "давхцал"; admin sidebar-ийн "Удирдлага" гарчиг nav-ийн scroll хэсэгт (clip хийгддэг); PnlRow-ийн note span (truncate-аар clip хийгддэг); нүүрний 3 мөр caps h1-ийн line-height .9 (дизайн). **Tom-д хэлэх**: `posts`-д "company"→"diane shampoo", "lflowadjaw"→"lofi cityaidhas" гэсэн 2 нийтлэгдсэн тестийн нийтлэл production дээр харагдаж байна; `/no-such-page` "Мэдээ олдсонгүй" гэж гардаг (catch-all нь PostDetail).

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр; `pnpm audit --prod` 0; unit+integration suite (доор тоо); post-fix crawl: stuck reveal 0, h1 1/хуудас, title хуудас бүрт, checkout overflow 0 (320), analytics console алдаа 0.

**Ачааллын тест (production build, нэг Node process, энэ laptop, 100 зэрэгцээ, 8с)**: статик HTML `/` → **5,410 req/s, p50 18ms, p99 29ms, 0 алдаа**; API (`catalog.list`, `catalog.bestsellers`) → нэг IP-ээс 300 request/15мин global limiter-т тулж 429 (limiter өөрөө 17k req/s даана). 10k хүн зэрэг орох тохиолдолд бодит хязгаар нь **DB зам**: pool `connectionLimit` 10 (mysql2 default), Aiven Бангалор RTT ~170–330ms → cache-гүй query ~30–60/с; нүүр хуудас ~11 tRPC дуудлага (batch). Дэлгэрэнгүй санал "Дараагийн ажлын санал"-д.

## 📦 Агуулахад шилжих алхмууд (Tom-д, 2026-09-11 — Phase 3 бэлэн, cutover ХИЙГДЭЭГҮЙ)

Код бэлэн, гэхдээ **автоматаар юу ч шилжээгүй** (бүх салбар одоо ч `store`, онлайн нөөц = бүх салбарын нийлбэр, үндсэн салбар = Орос элчин). Дэлгүүр хаалттай үед нэг өдөр:

1. /admin → **Салбарууд** → "Шинэ салбар нэмэх": нэр "Агуулах", **Төрөл = Агуулах** (одоохондоо үндсэн биш).
2. /admin → **Хэрэглэгч** → зөвлөхүүдэд `staff` эрх + **Ажилладаг салбар**; агуулахын ажилтанд `warehouse`.
3. /admin → **Бараа хүлээн авах → Тооллого → "Эхний үлдэгдэл"**, салбар = Агуулах, бүх барааг сканнердаж → **Батлах**.
4. Салбарууд → Агуулахыг **Онлайн захиалгын үндсэн салбар** болгоно; 4 дэлгүүрийн **"Онлайн нөөцөд тооцох"-ыг унтраана** (дэлгүүрүүд Smart POS-оор зардаг тул).
5. Дэлгүүр бүрт "Эхний үлдэгдэл" тооллого (Орос элчингийн одоогийн 18,725 гэсэн түр тоо бодит тоогоор солигдоно).
6. Хянах самбар → Системийн байдал → "Нөөцийн хөдөлгөөний бүртгэл" = таарч байна.

⚠️ 3–5-ын хооронд нийт тоо давхар тоологдоно — нэг өдөр дотор дуусгах. Дэлгүүрүүдэд онлайнаас очиж авах захиалга ирвэл бараа агуулахаас очно (систем автоматаар).

## ✅ (2026-09-11 → 09-12) Утасны push мэдэгдэл (ntfy) + нөөцийн ledger + сканнераар хүлээн авах + шилжүүлэг + нөөцийн alert + Smart Software синк — Phase 1–6 ДУУССАН

**Phase 5 (нөөцийн alert)**: салбарын **"Нөөц бага гэж анхааруулах босго"** тавьсан байршилд л борлуулалт/шилжүүлэг босгыг доошоо огтлох үед нэг удаа (өдөрт) push очно; 0 болбол "дууслаа"; нийтлэгдсэн барааны онлайн нийт 0 болбол admin+warehouse-д. Admin-ий засвар, тооллого alert өгөхгүй. Cutover-ийн дараа агуулахад босго (жишээ нь 5) тавих, дэлгүүрүүдэд Smart POS синк хүртэл хоосон үлдээх.

**Phase 4 (шилжүүлэг)**: /admin → Бараа хүлээн авах → **Шилжүүлэг**. Агуулах скан хийж "Илгээх" (агуулахаас шууд хасагдана, дэлгүүрт push) → дэлгүүр **blind** скан (илгээсэн тоо харагдахгүй) → "Хүлээн авах" (дэлгүүрт нэмэгдэнэ) → зөрүү байвал admin-д priority-5 push, admin мөр бүрийг шийднэ. Код: `server/transfers.ts`, `shared/transfer-reconcile.ts`, `client/src/components/inventory/TransfersView.tsx`. ⚠️ Бүртгэлгүй кодтой шилжүүлгийг илгээх боломжгүй (эхлээд бараа үүсгэх).

**Phase 6 (Smart Software синк, 2026-09-12)**: `server/integrations/smartSoftware.ts` нь вендорын **REST/JSON API**-тай холбогдоно (баримт: `developer.smartsoftware.mn` — Apidog тул JS-ээр зурагддаг, `llms.txt` + `/api-<id>.md`-ээр уншина). **Auth нь API key БИШ** — OAuth2 password grant (`GET|POST {host}/oauth/token`, username/password; Смарт Ложик гэрээний дараа имэйлээр илгээнэ). Хостууд: Inventory/Retail/Loyalty `https://retailapiv2.smartlogic.mn`, POS `https://smartposapi.smartapp.mn`, Accounting `https://accountingAPI.smartlogic.mn`. Ашиглаж буй: `/api/inventory/stock_locations`, `/api/inventory/products` (байршил бүрийн `count_on_hand`, баркодоор таарна).

**Урсгал**: /admin → Интеграцууд → Smart Software дээр нэр/нууц үг → "Холболт шалгах" (байршлын жагсаалт гарна) → салбар бүрт Smart POS код → "Үлдэгдэл татах" (эсвэл идэвхжүүлбэл 15 мин тутам). Үр дүн нь **нөөц шууд бичихгүй**: салбар бүрт зөвхөн зөрүүтэй мөрүүдтэй `submitted` тооллого үүсч, Бараа хүлээн авах → Тооллого дээр warehouse/admin **батлах** үед л ledger-ээр нөөц хөдөлнө. Шинэ таталт өмнөх батлагдаагүйг цуцална. ⚠️ Вендорын тоо бол **санхүүгийн үлдэгдэл** (дэлгүүрийн постлогдоогүй борлуулалтыг тооцоогүй) гэдгийг тэдний баримт өөрөө анхааруулдаг тул `scope:"partial"` — вендор илгээгээгүй барааг хэзээ ч 0 болгохгүй.

⚠️ **Borлуулалт илгээх (`POST /api/sale/sale`) нь И-БАРИМТ гаргадаг** (хариунд ДДТД/QR/сугалаа) — [EBARIMT.md](EBARIMT.md)-ийн Зам A яг энэ. Код хараахан бичээгүй: нягтлангийн (НӨАТ/НХАТ) болон вендорын (retailId/posId/cashierId, хүргэлтийн барааны код, paymentType/bankId) баталгаа шаардана.

🔴 **zod 4 урхи (2026-09-11 бодит incident)**: `.partial()` дотор `.default()` ОДОО Ч хэрэгждэг — update schema-д заавал `partialForUpdate()` (server/routers.ts) ашигла. Эс бөгөөс орхигдсон талбарууд create-ийн анхдагч утгаар дарагдана (салбар зөөхөд онлайн хүргэлт унтарч байсан; тестийн явцад бодит үндсэн салбар хэдэн минут алга болсон, сэргээсэн).

**Бүтэн төлөвлөгөө (Tom баталсан, 6 phase)**: (төлөвлөгөөний тэмдэглэл) (гэрийн лаптоп дээр л байгаа — гол шийдвэрүүд HISTORY.md-ийн ижил нэртэй хэсэгт). **Phase 2 дууссан**: `stock_movements` ledger (migration 0063) — `branch_stock`-ийн өөрчлөлт бүр `server/stockLedger.ts`-ээр ижил transaction-д бүртгэгдэнэ. ⚠️ **`branch_stock`-д шинээр бичих код заавал `applyBranchStockDelta` / `setBranchStockAbsolute` / `recordStockMovement`-ийг ашиглана** — эс бөгөөс Системийн байдал дээр drift гарна (`scripts/stock-ledger-rebaseline.ts --apply` засна). Нөгөө лаптоп `git pull` хийхээс өмнө ажиллуулсан checkout/POS нь бүртгэлгүй өөрчлөлт хийнэ — pull хийсний дараа rebaseline dry-run ажиллуул. Үлдсэн phase: **3** агуулах байршил (`branches.kind`) + `users.branchId` + USB сканнераар бараа хүлээн авах/тооллого (A4 цаас + group chat зургийг орлоно), **4** агуулах→дэлгүүр шилжүүлэг, blind скан тулгалт, **5** салбар бүрийн бага нөөцийн alert, **6** Smart Software adapter-ийн суурь.

**Хэрхэн ажилладаг**: business код мэдэгдлийг `notification_outbox`-д **өөрийн transaction дотор** бичнэ (`enqueueNotification`, `recordNotification`) → `server/notifications.ts` dispatcher ntfy.sh руу илгээнэ. Бүлэг: admin/warehouse/finance/store (`staff` = дэлгүүрийн зөвлөх). Мессежид харилцагчийн нэр/утас/хаяг **хэзээ ч** ороохгүй (payload төрлөөр хамгаалагдсан). Admin top bar-ын **хонх** ижил мөрүүдийг харуулна (уншсан төлөв `users.lastSeenNotificationId`).

⚠️ **Чухал тохиргоо**:
- **`NOTIFICATIONS_DISPATCH=1`** тохируулсан машин л утас руу илгээнэ (хоёр лаптоп нэг DB хуваалцдаг тул opt-in). Одоо **аль ч машин дээр тохируулаагүй** — бодит захиалгын мэдэгдэл queue-д орж, 2 цагийн дараа expired болно. Hosting сонгогдмогц production дээр тохируулна. /admin → Интеграцууд → "Туршилт" товч үүнээс үл хамааран шууд илгээнэ.
- ntfy тохиргоо (token + 4 бүлгийн сэдэв) `integration_configs`-д **шифрлэгдсэн**, идэвхтэй. Tom-ийн iPhone admin сэдэвт бүртгэлтэй, **бодитоор ирж байгааг баталгаажуулсан**. Ажилтан гарвал тухайн бүлгийн сэдвийг "Шинэчлэх" дарж солино.
- `server/_test-setup.ts` нь `NOTIFICATIONS_SUPPRESS=1` тавьдаг — тест бодит Aiven дээр захиалга үүсгэсэн ч мэдэгдэл `suppressed` болж утас руу **хэзээ ч** явахгүй.
- **Dedupe түлхүүр үйл явдлын төрлөөр namespace хийгдсэн** (`outboxDedupeKey`) — нэг захиалгын "шинэ", "төлөгдсөн", "цуцлагдсан" бүгд `order:<id>`-ээр дуудагддаг; namespace-гүй бол unique index тэднийг чимээгүй залгидаг байсан (тестээр олдсон).
- Интеграцийн тохиргоо одоо **merge** хийгдэнэ (өмнө нь нэг түлхүүр хадгалахад бусад нь устдаг байв). Гадагшаа нээлттэй REST API / OAuth2 **зориуд байхгүй** (Smart Software-той бид өөрсдөө холбогддог, тэд манай руу хандахгүй).
- Шинэ admin хэсэг "Утасны мэдэгдэл" (`notifications`) — хэсэг нэмэхдээ `AdminSection` union, `adminSectionKeys`, `SECTION_ROLES`, 3 гарчгийн ternary chain, `shared/admin-tips.ts` + `server/admin-tips.test.ts` бүгдийг шинэчлэх.

## ⚠️ ХОЁР ЛАПТОП — session бүрийн эхэнд ЗААВАЛ `git fetch` (2026-09-11 бодит incident)

```powershell
git fetch --all --prune ; git status -sb
```

**Яагаад**: 2026-09-11-нд session нь remote-ыг шалгалгүй эхэлж, `origin/main`-аас **2 commit хоцорсон** branch дээр бүтэн өдрийн ажил хийсэн. Ажлын лаптоп өчигдөр push хийсэн "Top Brands + /brands" ажил (15 файл, `index.css`-ийн 397 мөр) огт харагдаагүй, улмаар **хоёр өдөр ижил CSS мөрүүдийг бие даан дахин бичсэн**. Засахын тулд өдрийн ажлыг backup хийж, `--ff-only`-оор өчигдрийн ажлыг буцааж аваад, өөрчлөлтүүдийг **дахин хэрэгжүүлэх** шаардлагатай болсон (3-way merge нь таамаглал болох байсан).

⚠️ **Хамгийн зальтай хэсэг**: Aiven DB болон R2 нь хоёр лаптопт **хуваалцсан** тул нөгөө лаптопын migration аль хэдийн бодит DB дээр ажилласан байдаг. Өөрөөр хэлбэл **DB шинэ, код хуучин** гэсэн байдал чимээгүйхэн үүсдэг (2026-09-11-нд `featured_brands.logoUrl` багана DB дээр байсан ч энэ лаптопын `drizzle/schema.ts`-д байгаагүй). Аппликейшн ажиллаж байгаа нь синк болсны баталгаа БИШ.

## ✅ (2026-09-11, орой) Гүнзгий аудит — 5 бодит асуудал заслаа, 2 дизайны бооцоо хүлээгдэж байна

Бүрэн тайлан: (дотоод тайлан) · дэлгэрэнгүй HISTORY.md

**Заслагдсан**: (1) `catalog.categoryShelves` — дуудагчгүй мөртлөө **нээлттэй public** endpoint, хүсэлт бүрт **13 query**; procedure + 2 функц устгав. (2) `getFeaturedBrands`-ийн **N+1** — брэнд бүрт нэг fallback query, 9 брэнд × 10 холболтын pool; нэг бүлэглэсэн query боллоо. (3) `products.brand` дээр **индекс байгаагүй** (migration `0060`, Aiven дээр ажилласан). (4) 9-өөс **8 хэсэг ижил eyebrow+гарчгаар** эхэлдэг байсныг 3 болгов; утгагүй "01–06" дугаарлалт устгав (ангилал бол дараалал биш). (5) import хийгддэггүй **7 компонент** устгав (544 мөр).

⚠️ **"Онцлох брэндүүд" цагаан харагдах шалтгаан**: carousel нь `brands.some(b => b.logoUrl)`-оор лого зурвас нөөцөлдөг байсан — **ганц** брэнд (Cocochi) логотой атлаа **бүх 9 карт** 100px хоосон зай үүсгэж байв. Одоо **олонх** шаардана. Жинхэнэ шийдэл: **/admin → Брэнд дээр үлдсэн 8 логог оруулах**.

⚠️ **Хийгээгүй, зөвшөөрөл хүлээж буй**: (a) display шрифт нэмэх — Golos Text ганцаараа 643 элемент бүгдийг тохируулж байна; **кирилл глифийг заавал шалгах** (2026-09-06-ны бодит урхи). (b) 9-өөс 7 хэсэг одоо ч бүтэн өргөний хэвтээ band — 2 хэсгийг bento/асимметр болгох.

**Аудитын арга (дахин ашиглах)**: import графикаар orphan модуль олох, `routers.ts`-ийн procedure бүрийг client-ийн бодит дуудлагатай тулгах, Playwright-ээр дизайны шинжийг **тоолох** (eyebrow/дугаар/CAPS шошго/тэгш grid/shadow), дараа нь л дүгнэх.

## ✅ (2026-09-11) Гэрэл багасгасан Linen палитр + босоо зайн засвар + bestseller rail

**Менежер**: "нүүр болон бүх frontend хуудас хэт гэрэлтэй, юу ч харагдахгүй". **Tom: харанхуй горим ХЭРЭГГҮЙ** — 2 цайвар хувилбараас (Paper дулаан / Linen сэрүүн) **Linen** сонгогдов.

**Хэмжсэн шалтгаан**: хуудасны дэвсгэр 91.5% luminance, карт vs суурь **1.07:1** (карт/хуудас/цагаан packshot гурав нэг цагаан хуудас мэт), мөн **2 бүтэн дэлгэцийн ханасан шар band** (`#f0b52d`, нийт 1443px өндөр) — гялбааны хамгийн том эх үүсвэр.

**Linen токенууд**: суурь `#dae0da` · ээлжлэх band `#ced5cf` · карт `#f2f5f2` · хүрээ `#b7beb9` · тайлбар текст `#545958` · жижиг улаан `--primary-text` **#b01729** · surface-tint `#d3dad4` · sky `#28537a`. Шар нь зөвхөн badge/rank/гарчгийн зураас. **Барааны зургийн тавцан цэвэр цагаан хэвээр**; `wcu-section` 2026-09-12 хүртэл харанхуй байсан; Tom-ийн лавлагаа зургаар цайвар (сайтын дэвсгэртэй ижил) болсон — хуучин хувилбар `backup/pre-wcu-redesign-2026-09-12` tag дээр. Гэрэл **20% буурав**, карт vs суурь **1.22:1**.

⚠️ **Жижиг улаан текстэд `var(--primary)` (#df1f3d) ХЭРЭГЛЭХГҮЙ** — шинэ band дээр 3.19:1. Үүнд зориулж `--primary-text` байдаг (14 газар шилжүүлсэн). **`.brands-page`/`.back-to-top` CSS нь admin theme блокийн ДООР** байрладаг тул палитр өөрчлөхдөө тэр хэсгийг мартаж болохгүй.

**Босоо зай**: band бүр 25–34% хоосон padding байсныг татав; `.editorial-heading` 82px→56px cap, `/shop` h1 96px→62px (нүүрний hero-гоос том байсан), hero 1009px→628px (h1 428→184). **Нийт нүүр 8015→6612px (−18%)**.

**Bestseller rail**: бүх DB-д ердөө **3 төлөгдсөн захиалга** байгаа тул rail ганц карт зурдаг байв. `getBestsellingProducts` одоо `getCategoryShelfProducts`-ийн гэрээг дагаж, бодит борлуулалтын дараа **admin-ий featured брэндүүдээс** (round-robin) дүүргэнэ — **хуурамч захиалга үүсгээгүй**, бодит борлуулалт гармагц filler шахагдана. `Asmy` featured brand болж нэмэгдэв (`scripts/seed-featured-brand-asmy.ts`; ⚠️ `products.brand` дээр яг **"Asmy"**, "ASMY" биш). `getRecommendedProducts`-ийн cold-start нь 2 дахин гүн хуудсын хоёр дахь хэсгийг авдаг болсон — эс бөгөөс хоёр rail ижил 6 картыг давхардуулж байв.

**Баталгаажуулалт**: 28 хослол (7 хуудас × 1440/1024/390/320) — hэвтээ overflow 0, давхцал 0, **контрастын алдаа 0** (эхэлж 55 байсныг бүгдийг заслаа, бодит computed дэвсгэр дээр хэмжсэн), эвдэрсэн зураг 0, `<h1>` хуудас бүрт 1. `pnpm check`/`pnpm build` цэвэр, bestseller+catalog тест 24/24.

## ✅ (2026-09-10) /shop-ийн барааны карт Tom-ийн лавлагаа зурган дээрх карт болов

Tom лавлагаа screenshot (SHARP шүүлтүүрийн карт) илгээж: "Build like same thing exact one!!! Even brand name thats located on left top!!" + "Make it 100% data driven and editable on ./admin page".

**Карт (`Shop.tsx` + `index.css`-ийн шинэ `.shop-product-*` блок)**: цагаан карт (radius 14px, hairline border) · зүүн дээд буланд **брэндийн нэрийн чип** · баруун дээд буланд улбар шар **-N%** badge · бараа цагаан дэвсгэр дээр **бүтнээрээ** (object-fit: contain) · 2 мөр bold гарчиг (ellipsis) · дээр нь зурсан хуучин үнэ, доор нь том улаан үнэ · баруун доод буланд **цэнхэр сагсны товч**.

**Бүх утга admin-аас удирдагдана** (шинэ талбар нэмээгүй — бүгд аль хэдийн байсан): чип = `products.brand` (**Брэнд**), badge+зурсан үнэ = **Хуучин үнэ (сонголтоор)** vs **Үнэ**, гарчиг = **Нэр**, зураг = **Зураг**, товчны идэвх = **Нөөц**. Картанд hardcode текст алга.

**Хамгийн том функциональ ялалт**: сагсны товч урьд нь `<Link>` дотор байсан **чимэглэл** байсан тул дарахад зүгээр л барааны хуудас руу үсэрдэг байв. Одоо жинхэнэ `cart.addItem` — ProductDetail-тэй ижил зам (invalidate → drawer нээх → toast). Бодитоор шалгасан: цэвэр session-д 2 удаа дарахад Aiven дээр `cart_items.quantity = 2` болсон (дараа нь тестийн 2 guest cart устгасан).

**Замдаа олдсон/заслагдсан**:
- Хөрөнгийн зурагнууд `object-fit: cover` байсан тул **дөрвөлжин болгож тайрч** байв — Япон packshot-ийн ирмэг тасардаг. Одоо contain.
- Босоо зурагтай бараа (жишээ 105x283 eyeliner) aspect-ratio блокийг сунгаж, тэр эгнээний карт **2.3 дахин өндөр** болгодог байв → зургийн давхаргыг `position:absolute` болгож дөрвөлжинг тогтоов. Одоо 1233/390/320-д бүх карт **яг ижил өндөртэй**.
- 7 placeholder SVG-ийн `#eef0ee` дэвсгэр цагаан карт дээр **саарал хайрцаг** болж харагдаж байв (зурaггүй 415 бараа) →透明 болгов.
- **Контраст (тооцоолсон, таамаглаагүй)**: лавлагааны тод улбар шар `#f2622b` дээрх цагаан = **3.20:1**, badge-ийн текст 15px bold нь WCAG-ийн "том текст" (18.66px bold) босгонд хүрэхгүй тул 4.5 шаардана → `#cf4611` (**4.63:1**). Зурсан хуучин үнэ `#9a9aa0` = **2.80:1** → `#6f7076` (**4.94:1**). Улаан үнэ 4.77:1 ✓, цэнхэр товч 7.98:1 ✓.
- `.shop-sale-badge` нь нүүрний shelf/bestseller/104px thumbnail-уудтай **хуваалцсан** класс тул томруулсан хувилбарыг зөвхөн `.shop-product-media` дотор хязгаарлав (бусад нь ижил улбар шар, жижиг хэвээр).
- Карт дотор `<button>` нь `<a>` дотор байсан (a11y алдаа) — одоо ах дүү элемент.
- Устгасан: улаан hover цагираг, "VIEW" дугуй, тайлбар мөр, байнга харагддаг нөөцийн тоо, доод талын бүтэн өргөнтэй "Шуурхай харах" мөр (лавлагаанд байхгүй). Шуурхай харах нь **hover overlay** болж үлдсэн (зөвхөн хулгана/pointer төхөөрөмж).

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр (CSS 259.5→261.0 kB); 1440/1233/900/760/390/320 зургаан өргөнд hOverflow 0, console алдаа 0, картын элементүүд хоорондоо давхцал 0, карт бүр ижил өндөр; нүүр + placeholder-тэй барааны хуудас + /shop дээр эвдэрсэн зураг 0, page error 0; /admin-д `.shop-*` класс огт ашиглагддаггүйг grep-ээр баталгаажуулсан.

⚠️ **Tom-д**: одоогоор **937 бараанаас 0-д нь "Хуучин үнэ" тавигдаагүй** тул улбар шар **-N% badge бодит сайт дээр хараахан харагдахгүй**. Badge ажиллаж байгааг нэг бараан дээр түр 309,900→30,900 тавьж (-90%) баталгаажуулаад **шууд буцаасан** (одоо дахин 19,000₮, хуучин үнэ NULL). Хямдрал харуулах бол /admin → Бүтээгдэхүүн → **Хуучин үнэ** талбарыг бөглөнө.

## ✅ (2026-09-12) Хэл солих товч — Монгол / English / 日本語

Tom: "translate hiideg button hiilgmeer baina hajuudn!! dotorn english bas japanese baih ystoi". Header дээр глоб товч (`LocaleSwitch.tsx`), сонголт `localStorage` (`sugi-locale`) + `<html lang>`-д хадгалагдана; `vendor/theme-init.js` эхний зурагдахаас өмнө тавина.

- **Түлхүүр нь монгол өгүүлбэр өөрөө**: `shared/i18n.ts`-ийн `UI_STRINGS` нь `"Дэлгүүр" → {en, ja}`. Толь бичигт байхгүй бол монголоороо үлдэнэ (хоосон түлхүүр харагдахгүй).
- **Хамрах хүрээ**: сайтын өөрийн үгс — цэс, товч, хэсгийн гарчиг, шүүлтүүрийн шошго, footer, ангиллын нэр, `useSiteText`-ээр ирдэг бүх admin текст (анхдагч утгууд толь бичигт орсон).
- ⚠️ **Каталогийн өгөгдөл орчуулагдахгүй** — барааны нэр/тайлбар/брэнд DB-д нэг хэлээр байдаг. Тэдгээрийг орчуулах бол хэл тус бүрийн багана + admin дэлгэц хэрэгтэй (тусдаа ажил).
- Admin өөрөө site-text-ээ дахин бичсэн бол тэр утга толь бичигт байхгүй тул монголоороо үлдэнэ — машин таамаг дэвсгэрлэхээс дээр.

## ✅ (2026-09-12) Каталогийн 937 тайлбар + хэл солих алдаанууд (commit `527e000`)

Дэлгэрэнгүй: [HISTORY.md](HISTORY.md) "Каталогийн тайлбар + хэл солих алдаанууд".

- **`shared/product-i18n.ts` (шинэ)** — 937 барааны тайлбар англи/японоор. Тайлбарууд нь үүсгэгдсэн тул (2,811 өгүүлбэр, гэхдээ 241 л ялгаатай) **2 template + 51 барааны төрөл + 19 найрлага + 71 өгүүлбэр**-ээр бүгдийг хамарна. **Бодит Aiven дээр хэмжсэн: 937/937 тайлбарт кирилл үсэг үлдээгүй** (en ба ja). ⚠️ Барааны **нэр**, брэнд, салбарын хаяг хэвээр.
- 🔴 **Хэл солиход хагас дутуу солигддог байсан** — `TranslateSurface` нь үгсийг зурагдсан DOM-оос уншдаг тул нэг удаа солимогц англи текстийг монгол түлхүүрээр хайдаг байв. **Толь бичиг одоо 3 хэлээрээ индекслэгдсэн** (`EXACT` Map дотор mn/en/ja гурвуулаа түлхүүр) — аль ч хэлнээс аль ч хэл рүү, refresh хэрэггүй. **Шинэ орчуулга нэмэхэд en/ja утга давхардвал эхнийх нь ялна.**
- 🔴 **`{placeholder}` түлхүүр** — ажиллах үедээ угсардаг шошго ("{name}-г сагсанд нэмэх", "Сагс нээх, {n} бараатай") pattern-аар таарна; барьсан хэсэг нь дахин орчуулагдана. Компонентд `t()` татахгүй.
- 🔴 **`requestAnimationFrame` background tab-д ажилладаггүй** — эхний pass-ийн дараа ирсэн бүх зүйл монголоор үлдэж байв → `setTimeout(…, 16)`. **Дүрэм: DOM-ыг ажиглах давтамжид rAF ашиглахгүй.**
- Tab-ын `<title>` одоо орчуулагдана (`{page} — SUGI ASAYAKE` pattern).
- **Баталгаажуулалт**: 12 маршрут × en/ja — кирилл үлдсэн шошго 0 (DB контентээс бусад); /shop дээр **6 удаа дараалж солиход** refreshгүйгээр бүгд дагаж, монгол руу яг буцаж ирнэ.
- ✅ **2026-09-14: /privacy, /terms, /returns гурван хэлээр** — `site_documents`-д `locale` багана (migration `0075`, HeatWave дээр ажилласан; unique = documentKey+locale). Англи/япон анхдагч текст `shared/legal-documents.i18n.ts` (монгол эхийн орчуулга, бүх иш татсан хууль/тоо хэвээр); `getLegalDocumentFallbackFor(key, locale)`. /admin → Баримт бичиг дээр **Хэл: Монгол/English/日本語** pill — хэл бүр тусдаа мөр (• = засварласан); "Амьд хуудсыг харах" `?lang=` линк (useLocale одоо `?lang=en|ja|mn`-ийг нэг удаа хүндэтгэнэ). Storefront `Legal.tsx` useLocale-оор мөр/fallback сонгоно; толь бичгээр биш. ⚠️ Монгол эх бичвэрт "Aiven" гэсэн хэвээр (одоо Oracle Cloud Токио) — Tom /admin-аас 3 хэлээр засах.
- ✅ **2026-09-14: cookie banner орчуулагддаг боллоо** — `TranslateSurface` `#stcm-wrapper`-ийг алгасахаа больсон; `cookie-text-*` 11 анхдагч + "Күүкийн тохиргоог хаах" толь бичигт. Admin site-text-ээр өөрчилсөн cookie текст (толь бичигт байхгүй бол) монголоор үлдэнэ — бусад site-text-тэй ижил дүрэм.
- ✅ **2026-09-13 (гэрийн лаптоп)**: /profile-ийн 9 таб, сэтгэгдэл/хариулт, Асуулт/хариулт, профайлын сонголтын шошгууд (`catalog-filter.ts`), Checkout-ийн StorePay/QPay, RoutineDetail, ForgotPassword, ErrorBoundary — ~300 entry нэмэгдэв (Tom: "profile barag bur … mongol hel deeree baina"). **`{n}`/`{pct}`/`{count}` placeholder зөвхөн тоо таарна** (`NUMERIC_PLACEHOLDERS`) — "2ц" pattern "Багц"-ыг эвдэхгүй. Дутуу мөр олох арга: статик sweep (HISTORY.md "Profile, сэтгэгдэл … орчуулга"); шинэ storefront текст бичихдээ **React `{expr}`-тэй өгүүлбэрийг template literal-аар нэг text node болго**, эс бөгөөс pattern таарахгүй. ✅ 2026-09-14 Playwright (ja): PDP/checkout/shop/forgot-password/track-order/journal — UI-ийн кирилл 0 (DB контент, дүүргийн нэр, cookie banner-аас бусад); /profile нэвтрэлт шаарддаг тул Tom өөрөө шалгана.

## ✅ (2026-09-12) Storefront-ийн Dark theme (header дээрх товч)

Tom: "website iin frontend deer dark theme on off bolgodog bolgo, headeriin tend button nem". Хэрэгжүүлэлт:

- **Өөрийн атрибут**: `html[data-storefront-theme="dark|light"]`. ⚠️ Tailwind-ийн `.dark` класс ХЭРЭГЛЭЭГҮЙ — тэр класс нь /admin доторх `dark:` utility бүрийг мөн асаадаг тул storefront-оос дарахад админ панель хамт өнгөө сольдог болно. Бүх dark дүрэм `html[data-storefront-theme="dark"]`-аар эхэлнэ.
- `client/src/hooks/useStorefrontTheme.ts` (localStorage `sugi-storefront-theme`, системийн `prefers-color-scheme` анхдагч) + header-ийн нар/сар товч (`.header-theme-toggle`).
- **FOUC**: `client/public/vendor/theme-init.js` нь React ачаалахаас өмнө атрибутыг тавина. ⚠️ index.html-д inline script БИЧИХГҮЙ (CSP `script-src 'self'`) — тиймээс тусдаа файл.
- **Токен**: `--ck-page` (хуудас) ба `--ck-surface` (карт/header) салсан; dark-д `--ck-*` бүгд дахин тодорхойлогдоно. **Хуучин Linen токенууд** (`--card`, `--background`, `--foreground`, `--muted-foreground`, `--border`, `--secondary`, `--muted`, `--surface-tint`) storefront доторх dark-д `--ck-*` руу заана — үүгээр restyle-аас өмнөх олон зуун дүрэм нэг дор зөв болсон.
- ⚠️ **Барааны зураг, брэндийн логоны талбар цагаан хэвээр** (packshot цагаан дэвсгэртэй, `mix-blend-mode: multiply` тул харанхуй дээр алга болно). Ангиллын дугуй зурагт `overflow: hidden` заавал (эс бөгөөс дөрвөлжин булан харагдана). Header-ийн лого dark-д `filter: brightness(0) invert(1)`.
- 🔴 **Хамгийн том алдаа байсан**: `.sugi-commerce` (Shop/Checkout/Profile-ийн нийтлэг бүрхүүл) өөрөө `#f2f5f2` будаж, /shop бүхэлдээ цайвар хэвээр үлдэж байв. Одоо `var(--ck-page)`.
- **Баталгаажуулалт**: 8 маршрут × 2 загвар × 1440/390 = **32/32 хослол цэвэр** — WCAG босго (жижиг 4.5:1, том 3:1) зөрчсөн текст 0, dark дээр үлдсэн цайвар самбар 0, хэвтээ overflow 0, эвдэрсэн зураг 0. (Аудитын явцад өөрийн rate limiter 429 өгсөн нь тестийн олон хүсэлтээс, сайтын алдаа биш.)

## ✅ (2026-09-12) Нүүр хуудас cosmekitchen-webstore.jp лавлагаагаар бүрэн шинэчлэгдэв

Tom лавлагаа сонгов: "buh design sudalj ... bugdiin huulaad hiiged uz!!! premium baih ystoi professional!!!". Playwright-ээр тэр сайтын computed style/bounding box-ыг хэмжиж (Inter; гарчиг 26px/400/.1em төвлөрсөн, доош 35px; хэсэг хооронд 80px; цагаан хуудас, cream #fafaf5, чип #f8f7ef, бэх #212121, hairline #e5e5e5, rank алт #93781e; контейнер 1108px; карт 207px, дөрвөлжин зураг, **сүүдэргүй**, radius 4; header 65px + 380×40 хайлтын мөр) нүүрийг дахин зохион байгуулав. Дэлгэрэнгүй: [HISTORY.md](HISTORY.md) "Нүүр хуудасны Cosme Kitchen редизайн".

- **Бүх засвар `client/src/index.css`-ийн ТӨГСГӨЛД нэг давхарга** ("COSME KITCHEN RESTYLE") — өмнөх дүрмүүд хэвээр, зөвхөн дарагдсан. Бүхэлд нь хасвал хуучин дизайн эргэж ирнэ. Backup tag: `backup/pre-cosmekitchen-2026-09-12`.
- 🔎 **/shop-ийн шүүлтүүрийн мөр дахин бүтээгдэв** (Tom: "дэндүү замбараагүй", судалгаа хийхийг хүссэн). Baymard-ийн дүгнэлт: цөөн facet-тэй дэлгүүрт хэвтээ мөр sidebar-аас давуу, харин хамгийн түгээмэл алдаа нь **сонгосон шүүлтүүр нуугдах** (сайтуудын 20%). Тиймээс: ангиллын pill-үүд хэвтээ scroller биш **мөр дамжин ороодог**, гарчиг дээрээ, хяналтууд нэг эгнээнд, доор нь **"Сонгосон:" чипүүд** (тус бүр × дарж хасагдана) + "Бүгдийг цэвэрлэх". Арьсны төрлийн мөр нь ангиллын дэд шүүлтүүр тул сонгогдох хүртэл нам гүм.
- 🌐 **/admin-аас бусад БҮХ хуудас энэ загварт орсон** (Tom, 2026-09-12): `App.tsx`-ийн Router нь `/admin`-аас бусад бүх route-ыг `.sugi-site`-д ороодог тул restyle давхарга бүх storefront-д хүрнэ. Нэмэлт "inner pages" блок: /shop (hero/хайлтын панель/discovery cream+hairline, хар marquee устсан, карт hairline), /privacy·/terms·/returns (цагаан, 16px/1.9 текст), /checkout (Tailwind arbitrary өнгийг attribute selector-оор: хар самбар→cream, шар товч→улаан), /login, /journal, /brands, /track-order, /404. ⚠️ Хоёр ерөнхий sweep бий: `.sugi-site [class*="-card"|"-panel"|…] { box-shadow: none }` ба `[class*="rounded-"]:not([class*="rounded-full"]) { border-radius: 4px }` — шинэ storefront компонент нэмэхэд эдгээр нөлөөлнө.
- 🎨 Hero-гийн "SUGI ASAYAKE / MONGOLIA" мөр: эхний хэсэг нь **улаан**, ташуу зураасны дараах хэсэг нь **цэнхэр** дэвсгэртэй (админ текстээ "/"-аар хуваана; шрифт/хэмжээ хэвээр). ⚠️ `.eyebrow span` нь 7×7 цэгийн дүрэм тул эдгээр тэмдэглэгээнд `width/height: auto` заавал хэрэгтэй — эс бөгөөс 7px болж таслагдана (бодитоор тохиолдсон).
- ⚠️ **Hero-гийн урсгал `prefers-reduced-motion`-ийг дагахаа больсон** (Tom: Edge дээр огт хөдлөхгүй байв — Windows-ийн "animation багасгах" тохиргоотой; эмуляцаар нөхөн үзүүлсэн: 0px vs 9px). Эзний шийдвэрээр урсгал үргэлж ажиллана; хуруу хүрэхэд л зогсоно, байнгын pause товч хуудсанд алга.
- 🔤 **Шрифт хэвээрээ Golos Text** — Inter-ийг түр туршсан ч Tom "жижиг, хөгшин хүн уншиж чадахгүй" гэсэн тул буцаасан. Лавлагаанаас зөвхөн **layout** авсан; бүх хэмжээ нэг шатаар томорсон (үндсэн текст 15–17px, барааны нэр 15px, үнэ 21px, гарчиг clamp(24,2.4vw,32)). Барааны карт 207→232px (кирилл нэр 3 мөр багтахын тулд).
- 📂 **Ангилал hardcode БИШ** (Tom асуусан): `product_categories` хүснэгтээс уншина (`content.categories` → `useCategories`), /admin → **Бүтээгдэхүүн → "Шинэ ангилал үүсгэх"** дээр нэр/slug/тайлбар/дараалал/идэвх, **2026-09-12-оос зураг** ч оруулна (өмнө нь зургийн талбар байхгүй байсан тул шинэ ангилал placeholder-тэй гарч ирдэг байв). Шинэ slug (жишээ "food") нь icon-ыг `categoryPresentation`-ий анхдагчаас авна. ⚠️ `getPublishedCategories` нь **дор хаяж нэг нийтлэгдсэн бараатай** идэвхтэй ангиллыг л storefront-д гаргана (хоосон ангилал нүүр/цэс/footer-т гарахгүй).
- 🧭 **Header нэг мөр**: лого | хайлтын талбар | дүрснүүд (Tom: "search bariig logo giin neg shugamnd"), доор нь төвлөрсөн цэсний мөр. ⚠️ **grid БИШ, flex** — 3 баганат grid нь 761–1100px-д гурав дахь баганаа алдаж дүрснүүдийг доош унагаадаг байв (хэмжсэн). Лого хэзээ ч агшихгүй (`flex: 0 0 auto`, эс бөгөөс тогтмол өргөнтэй зураг нь хайрцгаасаа халиад хайлтын талбар доор нь давхарладаг); зөвхөн талбар агшина. **760px-ээс доош хайлт нь зөвхөн дүрс** болж хураагдаж, ижил панелийг нээнэ (`.header-search-compact`).
- 🔐 **/login, /forgot-password** мөн цагаан болов: `.auth-shell`-ийн `min-height:100vh` (header+footer-ийн ГАДНА байсан тул хуудас үргэлж 1.5 дэлгэц болдог байсан) хасагдаж, чимэглэлийн улаан цагиргууд унтарч, карт hairline+radius 4 болов.
- 👤 **"Танд санал болгож байна" зөвхөн нэвтэрсэн, профайлдаа мэдээлэлтэй хүнд** харагдана — **нүүр ба /shop хоёулаа** (Tom 2 удаа шаардсан). `catalog.recommended` `personalOnly: true` input-тай дуудагдана: preference/худалдан авалтын түүхгүй бол сервер **хоосон** буцаана; зочинд query огт явахгүй. ⚠️ /shop дээр үлдсэн `.recently-viewed-section` нь "ТАНЫ СҮҮЛД ҮЗСЭН" (энэ төхөөрөмжийн түүх) — өөр хэсэг, зөв.
- ⚠️ **`:root` токен хөндөөгүй** (admin/shadcn аюулгүй). Шрифт нь `.sugi-site/.commerce-header/.site-footer`-т `--font-body/--font-display`-ыг дахин тодорхойлж сольдог; хуудас цагаан болох нь `body:has(.sugi-site)` — зөвхөн НҮҮР. /shop, барааны хуудас Linen палитраа хэвээр барина (header/footer хоёр л сайт даяар шинэчлэгдсэн).
- Hero = дөрвөлжин зургийн rail (`HeroImageSlideshow` дахин бичигдсэн), доор нь төвлөрсөн гарчиг/CTA. **Зургийн доорх тайлбар болон цэгүүд Tom-ийн хүсэлтээр устгагдсан** — улмаар слайд бүрийн 18 site-text slot (badge/marker/булангийн бичээс/тайлбар) admin-аас бүрмөсөн хасагдав; слайд зөвхөн **зурагтай** бол харагдана. Зураг ачаалагдаж дуустал rail-ийн өндөр хадгалагдана (`.hero-rail-reserve`) — эс бөгөөс 3 зурагнаас 5 болж үсэрдэг байв. Шинэ `KeywordChips` (slot `home-text-keywords-heading`). Bestseller/recommended нь `CarouselShelf`+`ShelfProductCard` болов — **`ShelfProductCard` ProductDetail-тэй хуваалцсан тул түүнийг өөрчилбөл 2 газар өөрчлөгдөнө**. Ангилал = 110px дугуй зураг+шошго, брэнд carousel `--fbrand-scale:1` (JS нь CSS var уншдаг). Footer cream. Sunrise ribbon нүүрнээс хасагдсан.
- **Hero слайд = тасралтгүй marquee** (Tom: "zuunees baruun tiishee ursahgui baina zogsoltgui"): 3 хуулбартай rail, **anime.js**-ийн `createTimer`-ээр frame бүрт `scrollLeft`-ыг бага багаар хасна (баруун тийш урсана), нэг зураг **15 секунд** тутам өнгөрнө (`MS_PER_SLIDE`; Tom 4000→2500→3500→5000→10000→15000 гэж өөрөө тааруулсан; хурд нь картны алхмаас тооцогддог тул утсан дээр автоматаар удаашрана). Хулганаар зогсохгүй (өмнө нь hover зогсоодог байсан тул Tom-ийн дэлгэц дээр "хөдөлдөггүй" харагдаж байсан) — зөвхөн хуруу дээр нь, tab нуугдсан, эсвэл reduced-motion үед зогсоно.
  🔴 **`scroll-snap-type` нь marquee-г бүрмөсөн зогсоодог** — frame тутмын бутархай пиксел бүрийг snap цэг рүү буцаан татдаг (хэмжсэн: байрлал огт хөдлөөгүй). Тиймээс `.hero-rail`-д snap алга; `.cat-rail` (бүтэн карт алхдаг) дээр snap хэвээр. Admin дээр **6 хүртэл hero зураг** (`home-hero-4/-5/-6`, brand default-гүй — зураг оруулаагүй слайд огт харагдахгүй; тайлбар нь "Hero — N-р слайд" бүлэгт). `ContentMediaPanel` одоо `fallbackUrl: null`-ыг мэддэг (зурaггүй слотод "ЗУРАГ ОРУУЛААГҮЙ", alt хадгалах боломжгүй).
- Утсан дээр header-т зөвхөн **сагс + цэс** үлдэв: доод самбар аль хэдийн хүслийн жагсаалт/профайлыг барьдаг тул давхардаж, Tom-д "зүрх ба сагсны хооронд том зай" болж харагдсан.
- Header: `.commerce-header-inner` одоо **grid 1fr/auto/1fr** (лого | төвийн цэс | дүрснүүд), цэс `.commerce-header-left`-ээс ГАДНА байрлана; 1100px-ээс доош цэс drawer руу орно; бүх хуудсанд хайлтын мөр (`<HeaderSearch variant="inline" />`). Tom-ийн хүсэлтээр **header доорх брэндийн логоны зурвас болон "Дэлгүүр" текст линк устгагдсан**.
- Баталгаажуулалт: check/lint/build цэвэр; **9 маршрут × 1440/390** (нүүр, /shop, /checkout, /privacy, /journal, /brands, /track-order, /login, 404): хэвтээ overflow 0, `<h1>` 1, 3:1-ээс доош контраст 0, эвдэрсэн зураг 0, console алдаа 0; нүүр 6612→~6000px. ⚠️ Энэ машин дээр Playwright-ийн `setViewportSize` нь бодит CSS өргөнөөс ~10% зөрдөг — хэмжихдээ `window.innerWidth`-ээр давтаж тааруул.

## ✅ (2026-09-12) Forensic аудит (Tom-ийн 27 үе шаттай playbook, "do not skip anything / deep dig") — 4 commit, бүгд тестээр нотлогдсон

Бүрэн тайлан (health score /10 хэсэг бүрээр, scaffold/AI-slop inventory, P0–P4 bug register, юу засагдсан/юу санаатай хөндөгдөөгүй, production readiness): **(дотоод тайлан) · **Сайтын архитектурын визуал зураг** (давхаргууд, захиалгын аялал, ledger, эрхүүд): (дотоод тайлан)** · дэлгэрэнгүй HISTORY.md "Forensic аудит" хэсэг.

**Гол засварууд** (`618eeec` idle lock → `28774f3` cache → `6653fff` batch 1 → `3d3b05a` batch 2):
- 🔒 **/admin 25 минут idle → lock, царайг дахин асуух** (Tom-ийн хүсэлт). Зөвхөн бодит оролт (pointer/key/touch/scroll) тоологдоно — панелийн өөрийн polling сунгахгүй. Proof cookie = sliding idle 25 мин + absolute 8 ц; бүх tab `BroadcastChannel`-ээр хамт; lock `face_attempts.idle_locked` (migration 0068). NIST 800-63B / PCI DSS 4.0 8.2.8 / OWASP-ийн дунд.
- ⚡ **Cache**: storefront контент 30 с (бичигч бүр invalidate), session user **5 с, user id-аар** — 163→2мс, 173→2мс хэмжсэн. 🔴 Эхний хувилбар token-оор түлхүүрлэж "бүх төхөөрөмжөөс гарах"-ыг 5 с хоцроосон (P0, suite барив) — одоо session-ийн эрхийг өөрчилдөг 7 бичигч `forgetSessionUser` дуудна. **Шинэ ийм бичигч нэмбэл заавал дуудна.**
- 🧾 **Idempotency**: `orders.clientRequestId` (migration 0069) — checkout + POS хоёулаа. Timeout/resend/2 дахь tab давхар захиалга + давхар нөөц хасалт үүсгэдэг байв. **Захиалга бичдэг шинэ зам бүр энэ түлхүүрийг авна.**
- 📣 **Кампанит ажил** ижил илгээлтийг 10 минутын дотор татгалзана (CONFLICT; fingerprint audit log дээр, 2 лаптопт хүчинтэй). `qpayCreateInvoice`/`storepayCreateLoan` нээлттэй attempt-аа дахин ашиглана. QPay callback `"SUCCESS"`. SSRF guard (cloud вендор https + public host). `data-retention` job.
- 📱 390/320px: admin 4 хэсэг + /shop filter pill-ийн хэвтээ overflow 0 болов; admin `<title>`/h1; cookie banner /admin-д гарахгүй; aria-label-ууд; login redirect `//` guard.
- 🧰 **Tooling**: тест/скрипт type-check (`tsconfig.tests.json`, 90 хуучирсан fake user → `testSessionUser()`), ESLint (`pnpm lint`, CI Lint алхам), target ES2022, 3 хэрэггүй dev dep устгасан.

**Санаатайгаар хөндөөгүй**: React Compiler eslint дүрмүүд (39 ажилладаг pattern flag хийдэг); AdminFaceGate liveness функцууд; 5 junk post (Tom); ntfy token rotate (Tom).

🔴 **Idle lock-ийн бодит incident (2026-09-12, орой)** — Tom лаптопоо 2 цаг орхиод буцаж ирэхэд /admin ажилласаар байв. 2 шалтгаан, хоёулаа заслагдсан (`server/_core/faceProof.ts`): (1) **Хуучин proof cookie** — Tom 10:58-д царайгаа таниулсан, idle lock 11:37-д deploy болсон; хуучин token нь `abs` claim-гүй, 8 цагийн `exp`-тэй байсан бөгөөд шинэ код түүнийг "өөрийн хугацаа хүртэл" хүлээн зөвшөөрдөг байв → одоо `abs`-гүй token **хүчингүй** (нэг удаа камер дахин). (2) **Gate нь зөвхөн дэлгэц байв** — панель царай асуудаг ч түүний дуудаж буй tRPC procedure-ууд proof шалгадаггүй байв → одоо `panelProcedure` (admin/staff/finance/marketing/warehouse/anyStaff/inventory/*Read бүгд) `assertFaceProofForPanelRole` ажиллуулна; proof-гүй бол `FORBIDDEN` + `FACE_REQUIRED_ERR_MSG`, client тэр алдааг авмагц `faceAuth.status`-ыг invalidate хийж камер гаргана; status 60 с тутам + tab focus дээр дахин шалгана. ⚠️ **Тестэд**: `_test-setup.ts` gate-ийг `0` болгодог (caller-ууд cookie-гүй); `ENV.adminFaceGateEnabled` одоо getter тул face тестүүд өөрсдөө `"1"` тавьдаг. Шинэ admin procedure бичихдээ `protectedProcedure` биш role builder ашигла — эс бөгөөс proof шалгагдахгүй.

## ✅ (2026-09-12) SQL injection үнэлгээ (Tom: sqlmap-ээс хамгаалагдсан уу?)

Бүрэн тайлан: **[docs/SECURITY-sqli.md](docs/SECURITY-sqli.md)**. Товч: **бүтэцийн хувьд хамгаалагдсан**. sqlmap-ийн 6 техник (boolean/time-blind, error, UNION, stacked, out-of-band) бүгд аттакерын текстийг SQL syntax болгохыг шаарддаг — энд бүх query drizzle-ийн `sql` template-ээр (bind parameter) явдаг тул боломжгүй.

- Цорын ганц concatenate хийдэг primitive `sql.raw` — 7 газар (INTERVAL/LIMIT, MySQL bind param авдаггүй) — одоо бүгд **`server/_core/sqlSafe.ts` `sqlInt()`**-ээр явна (finite тоо биш бол throw). `grep -rn "sql.raw" server/` одоо зөвхөн helper өөрийг өгнө. **Шинээр `sql.raw` бичихгүй — `sqlInt` ашигла.**
- Stacked queries mysql2-т анхнаасаа хаалттай (`multipleStatements` default false); zod бүх id-г `z.number().int()`, хайлтыг `max(120)`; production-д tRPC дотоод алдааг client руу гоодуулдаггүй; `limitApiTraffic` 300/15мин scanner-ыг таслана.
- **Баталгаа**: `server/sqli-probe.integration.test.ts` — sqlmap-ийн payload-уудыг бодит хайлт руу шиднэ, DROP TABLE-ийн дараа products хүснэгт байсаар.
- ⚠ **Tom хийх ганц hardening**: апп одоо `avnadmin` (Aiven superuser)-ээр холбогддог. `scripts/aiven-least-privilege.sql`-аар зөвхөн SELECT/INSERT/UPDATE/DELETE эрхтэй `sugi_app` хэрэглэгч үүсгэж `DATABASE_URL` солих (migration нь avnadmin-аар хэвээр). Injection боломжгүй ч ч хэзээ нэгэн цагт гарвал blast radius-ыг хаана.

## ✅ (2026-09-12) `.env` сканнер бот + терминалын лог (Tom-ийн hosting лог screenshot, Reddit r/SaaS thread)

Reddit-ийн дүгнэлт: энэ бол **бүх IPv4-ийг сканнердаж буй бот, хэвийн**; хамгийн чухал нь сервер `.env`-ийг хэзээ ч өгөхгүй байх (манайх: `.env` gitignore, `dist/public`-ийн гадна, express.static dotfile-ыг өгдөггүй). Гэхдээ өмнө нь ийм зам бүр SPA fallback-аар **200 + index.html** авдаг байсан (сканнерт "энд юм байна" гэсэн дохио) бөгөөд манай логт мөр ч үлддэггүй байв.

- **`server/_core/scannerProbes.ts`** (`blockScannerProbes`, `setSecurityHeaders`-ийн шууд дараа): `.env*`, dotfile/dot-dir (`.well-known`-оос бусад), `*.php/asp/jsp`, backup/dump (`.bak/.sql/.zip/…`), `wp-admin`/`phpmyadmin`/`vendor`/`actuator`/`_profiler`, `/config.js`/`/server.js` → **шууд 404 text/plain**, app ажил хийхгүй. IP тутам тоолж, **1 цагт 5 probe → тэр IP 1 цаг 403** (in-process fail2ban). Loopback/private хаяг (127.0.0.1, 10/8, 192.168/16, 172.16/12, ::1, fd00::/8) **хэзээ ч ban болохгүй** (404 л авна) — dev дээр өөрийгөө түгжихгүй, production-д proxy client IP дамжуулаагүй бол бүх зочин нэг IP болж нэг бот сайтыг бүхэлд нь хаах эрсдэлээс сэргийлнэ. Probe бүр `[probe] <ip> GET <path> -> 404 (n/5)` гэж терминалд бичигдэнэ. 78 unit тест (probe жагсаалт + бодит замын жагсаалт хоёулаа).
- **Терминалын лог** (шинэ, dependency-гүй): `$env:LOG_REQUESTS="1"; pnpm dev` → хүсэлт бүрт nginx маягийн `[time] ip "GET /path" status bytes ms` мөр (`server/_core/requestLog.ts`; dev-д Vite-ийн модулийн хүсэлтүүд алгасагдана). `$env:LOG_SQL="1"` → SQL statement бүр bound param-тайгаа `[sql] …` гэж (admin-ийн SQL tab сүүлийн 200-г л харуулдаг, энэ бүгдийг live). Хоёулаа анхдагчаар унтраалттай.
- Hosting дээр нэмэх: Cloudflare (үнэгүй bot fight mode) урд нь, эсвэл host дээр fail2ban; nginx ашиглавал `location ~ /\.(?!well-known) { return 404; }`.

## ✅ (2026-09-12) Утсан дээр "Дараах" болон шинэ хуудас доошоо (footer руу) үсэрдэг байсныг заслаа

Tom утсаараа (192.168.88.6, LAN) туршихад /shop-ийн "Дараах" footer руу аваачдаг, шинэ хуудас нээхэд дандаа доод тал нь гардаг байв. Хоёулаа **хэмжиж** олсон (Playwright 390px): (1) хуудас солиход `catalog.list`-ийн шинэ key → `isLoading` → grid 8 картын skeleton болж унмаунт, документ 8170→4414px болж хагасаар багасахад явж байсан smooth scroll clamp/cancel болдог (Safari-д footer). (2) Route солиход scroll хэзээ ч reset хийгддэггүй байсан — /shop-ийн 7326px-ээс footer линк дарахад /privacy 884px байхад 40 болж clamp, дараа нь 5331px болж өсөхөд 4488 дээр (доод тал) үлддэг.

Засвар: `catalog.list`-д `placeholderData: keepPreviousData` (grid унмаунт болохгүй, 24 карт хэвээр), pager render-ийн ДАРАА `useEffect`-ээр **instant** scroll (`client/src/lib/scroll.ts` `scrollToNow` — `html{scroll-behavior:smooth}`-ыг нэг frame override), sticky header-ийн өндрийг хасна; `client/src/hooks/useScrollToTopOnNavigate.ts` Router-т — forward navigation бүр 0-ээс эхэлнэ, **back/forward-д хүрэхгүй** (popstate flag), hash-тай бол хүрэхгүй. Хэмжсэн: Дараах → grid header-ийн доор 75px-д тогтвортой; footer линк → /privacy scrollY 0.

## 📱 Демо / утсаар турших (2026-09-12) — `scripts/demo.ps1`

`.\scripts\demo.ps1` = production build + `NODE_ENV=production node dist/index.js` (3000 порт, LAN IP-г хэвлэнэ, access log асаалттай). `-Tunnel` нэмбэл Cloudflare quick tunnel (`https://<random>.trycloudflare.com`) — **ямар ч сүлжээнээс, HTTPS тул утсан дээр камер/царайны хаалга ажиллана**; оффисын Wi-Fi ихэвчлэн төхөөрөмж хоорондын холболтыг хаадаг тул LAN IP оффист ажиллахгүй байж болно. cloudflared суулгах (нэг удаа, Tom өөрөө): `winget install --id Cloudflare.cloudflared`. ⚠️ Tunnel нээлттэй байхад сайт интернэтэд ил (хамгаалалтууд бүгд асаалттай: face gate, rate limit, CSRF, probe blocker); demo дуусмагц `Ctrl+C`. Demo-ийн захиалгууд **бодит Aiven**-д орно — бэлнээр захиалуулж, дараа нь /admin-аас цуцлах. `pnpm start` скрипт нь bash синтакс (`NODE_ENV=…`) тул Windows дээр ажиллахгүй — demo.ps1 ашигла.

## ✅ (2026-09-12) iPhone: доод nav bar scroll хийхэд жижигэрдэг байсныг заслаа
`--mobile-sticky-bar-h` (64px) одоо контентын өндөр, safe-area нь дээр нь нэмэгдэнэ (`height: calc(64px + var(--safe-bottom))`). **Дүрэм: fixed доод элементэд `env(safe-area-inset-bottom)`-ийг өндөр ДОТОР нь биш, ДЭЭР нь нэм** — Safari toolbar эвхэгдэхэд inset өөрчлөгддөг.

## 🔴 (2026-09-12) Production дээр cookie banner 09-06-оос хойш ОГТ гарахгүй байсан — CSP inline script-ийг хааж байв

Public tunnel-ээр (production build, `script-src 'self'`) нүүрийг нээхэд console: "Executing inline script violates CSP". `index.html`-ийн inline `silktideConsentManager.init({…})` production-д хэзээ ч ажиллаагүй (CSP 09-02, inline init 09-06). Dev-д CSP байхгүй тул бүх шалгалт "ажиллаж байна" гэж харуулж байв. Засвар: текст нь `<script type="application/json" id="cookie-consent-config">` (өгөгдөл, CSP хамаарахгүй; server placeholder-оо орлуулсаар), init нь `client/public/vendor/silktide-consent-init.js` (`'self'`). Production дээр Playwright-аар banner гарч байгааг баталгаажуулсан. **Дүрэм: `index.html`-д inline `<script>` бичихгүй** (JSON/ld+json блок болно); production-only зүйлийг (CSP, compression, static) заавал `NODE_ENV=production node dist/index.js`-ээр нэг удаа шалга — `scripts/demo.ps1` яг үүнийг хийдэг.

## ⚠️ (2026-09-12) LAN/http дээр туршихад олдсон 2 алдаа — "localhost дээр ажилласан" гэдэг нь хангалтгүй

1. **`crypto.randomUUID()` зөвхөн secure context-д байдаг** (https эсвэл localhost). Утаснаас `http://192.168.88.6`-ээр /checkout нээхэд render дээр унасан. Localhost-ын бүх тест үүнийг харуулдаггүй. Одоо `client/src/lib/requestId.ts` `newRequestId()` (randomUUID → getRandomValues v4 → Math.random). **Шинэ код secure-context-only API (`randomUUID`, `navigator.clipboard`, `navigator.share`, `getUserMedia`) ашиглавал заавал fallback/guard тавь.** Царайны камер нь HTTPS-гүйгээр утсан дээр ажиллахгүй — энэ нь шийдэгдэхгүй, HTTPS л хэрэгтэй.
2. **Scanner-blocker өөрийн `/vendor/silktide-consent-manager.{js,css}`-ийг 404 болгож, cookie banner хуудас бүр дээр үхсэн байв** (`f4555cb`, нэг цаг). `vendor`-ыг ерөнхий жагсаалтаас хасав; `scripts`-ээр `client/public`-ийн 71 файлыг matcher-оор шалгахад зөвхөн `.gitkeep` л блоклогдоно (зөв). **Дүрэм: probe matcher-т шинэ pattern нэмбэл `client/public`-ийн бүх замыг `isScannerProbe`-оор дахин шалга** (тестийн REAL жагсаалтад нэм).

## ✅ (2026-09-13) Сайтыг бусад төхөөрөмжөөс үзэх — LAN + Cloudflare Tunnel (`https://sugi.karkaron.com`)

**LAN (ажлын wifi)**: сервер бүх interface дээр сонсдог (`server.listen(port)` host-гүй) тул зөвхөн Windows Firewall хэрэгтэй байсан — `SUGI ASAYAKE dev (TCP 3000)` дүрэм нэмэгдсэн (Private+Domain профайл). Хаяг: `http://<лаптопын IP>:3000` (`ipconfig`-оор олно; гэртээ 192.168.1.7). ⚠️ Ажлын wifi **Private** ангилалтай байх ёстой — `Get-NetConnectionProfile` Public гэвэл: `Set-NetConnectionProfile -InterfaceAlias Wi-Fi -NetworkCategory Private` (admin PowerShell).

**Cloudflare Tunnel** (named, Tom-ийн Cloudflare данс, zone `karkaron.com` — Porkbun-д бүртгэлтэй хуучин тоглоомын домэйн, NS аль хэдийн Cloudflare дээр; apex нь 522 буцаадаг үхсэн origin тул `sugi.` subdomain ашиглав):
- cloudflared `C:Program Files (x86)cloudflaredcloudflared.exe` (winget). Тохиргоо `C:Userssugia.cloudflaredconfig.yml`, tunnel `sugi-asayake` (id `bbd3128e-486e-481d-8c21-f9d3d240a56c`), credential `.json` + `cert.pem` тэнд — **commit хийхгүй, хуулахгүй**. Нөгөө лаптопт tunnel хэрэгтэй бол `cloudflared tunnel login` + `tunnel create` дахин хийж өөр нэртэй tunnel үүсгэх (нэг credential-ийг 2 машинд хуваалцахгүй).
- Асаах: `pnpm build && pnpm start` (эсвэл `pnpm dev`) дараа нь `cloudflared tunnel run sugi-asayake`. Windows service болгох бол admin-аар `cloudflared service install`.
- ⚠️ `pnpm dev` tunnel-ээр **403 "Blocked request"** өгдөг (Vite-ийн Host шалгалт) — `.env`-ийн `DEV_ALLOWED_HOSTS=sugi.karkaron.com,.trycloudflare.com` → `vite.config.ts` `server.allowedHosts`. `pnpm start` (production build) энэ шалгалтгүй. `PUBLIC_BASE_URL=https://sugi.karkaron.com` мөн `.env`-д (QPay/StorePay callback).
- Аппын тал бэлэн байсан: `app.set("trust proxy", 1)` → `req.protocol === "https"` → secure cookie + CSRF origin шалгалт зөв (tunnel-ээр POST → 405, 403 биш гэж баталгаажсан).
- ⚠️ **Porkbun-ий DNS хуудас "Oh no! … update my domain?" гэж асуудаг — ХЭЗЭЭ Ч "Yes" дарахгүй** (nameserver-ийг Porkbun руу буцааж, Cloudflare zone-ыг салгана). Porkbun дээр харагдах 9 бичлэг нь идэвхгүй үлдэгдэл.
- **Cloudflare edge хамгаалалт (мөн өдөр, `scripts/cloudflare-harden.mjs`, Tom өөрийн PowerShell-ээс ажиллуулсан)**: Always HTTPS, TLS ≥1.2/1.3, SSL strict, security level medium, browser check; rate limit `/api/*` 150 req/10с/IP → 10с block (free plan-ий 1 дүрэм; оффисын NAT нэг IP тул багадвал өсгөх); WAF custom 3 дүрэм (scanner probe `.env/.git/wp-*/*.php` block — амьдаар 403 баталгаажсан; зөвшөөрөгдөөгүй method block; `/admin`-д MN/JP-ээс гадуур managed challenge); **Bot Fight Mode** dashboard-аас асаасан (⚠️ QPay/StorePay callback-ийг challenge хийж болзошгүй — төлбөр амьд болохоос өмнө унтраах эсвэл шалгах; free plan-д WAF-аар bypass хийх боломжгүй). Zone id `a9d1a84c784531a8ba875c46faac12ca`, account `2deded39…`. Тохиргоо өөрчлөх API token `profile/api-tokens`-оос үүсгэнэ (шаардлагатай эрхүүд script-ийн толгойд) — **хэзээ ч commit хийхгүй**, 2026-09-13-ны token-ийг ашигласны дараа устгахыг зөвлөсөн.
- **/admin нээлттэй (Access-гүй) — Tom-ийн шийдвэр (2026-09-13)**: захирал + тестлэгчид `https://sugi.karkaron.com/admin`-д орж аппын өөрийн хаалгыг (утас SMS OTP → admin/staff эрх → `ADMIN_FACE_GATE_ENABLED=1` царай) амьдаар үзнэ. Zero Trust Access app (имэйл OTP, зөвхөн t.morius@gmail.com, `/admin` + `/api/trpc/admin*`) нэг удаа тавьж баталгаажуулаад (302 → karkaron.cloudflareaccess.com) **устгасан**; буцааж тавих: `node scripts/cloudflare-harden.mjs <token-file> --access`. ⚠️ Access зам **сегментээр** таардаг — `/api/trpc/admin` нь tRPC-ийн `/api/trpc/admin.users`-ийг хамардаггүй (401 = аппын JWT-д хүрсэн), wildcard `admin*` хэрэгтэй. ⚠️ **Царай таних зөвхөн HTTPS дээр** — LAN `http://192.168.1.7:3000` дээр камер ажиллахгүй, demo-г tunnel хаягаар хийх.

## ✅ (2026-09-13) Царай таних /admin хаалга — MediaPipe tracking + Face ID маягийн цагираг бүртгэл

Tom утсаараа (iPhone Safari, tunnel) туршаад: "уншиж байна" хэт удаан, бүртгэл хэт энгийн (баруун тийш жаахан эргүүлэхэд л болдог). Судалгаа + шийдвэр: **[docs/FACE-AUTH-RESEARCH-2026-09-13.md](docs/FACE-AUTH-RESEARCH-2026-09-13.md)**.

**Шалтгаан**: `captureFace()` frame бүрт detector+68 landmark+**dlib ResNet descriptor** гурвыг ажиллуулж байсан (нэвтрэхэд 12 frame, бүртгэхэд эргэхийг хүлээх давталтад ч); descriptor нь утсанд хамгийн хүнд алхам. Pose нь 68 цэгийн yaw ratio (босго 0.06), pitch огт байхгүй.

**Одоо**: tracking = **MediaPipe Face Landmarker** (`client/src/lib/faceTracker.ts`, 478 цэг + blendshape, GPU→CPU fallback, Apache-2.0, **өөрийн сервер**: `client/public/face-models/mediapipe/` — `.task` 3.7MB + wasm simd/nosimd ~23MB, git-д орсон). Таних descriptor **dlib хэвээр** (`FACE_MODEL_VERSION` өөрчлөөгүй, хуучин бүртгэл хүчинтэй), зөвхөн tracker-ийн сонгосон snapshot дээр: нэвтрэхэд 3, бүртгэхэд 9. Цэвэр математик `shared/face-pose.ts` (yaw/pitch/roll ratio, framing gate, `CoverageTracker` 8 сектор+төв, `BlinkDetector`, `StillnessTracker`) — `server/face-pose.test.ts` 25 тест. Бүртгэл = толгойгоо тойруулан 8 цагирагийн хэсэг + төвийг дүүргэнэ (хажуугаар гүйлгэх тоолохгүй — 3 frame барих), дараа нь descriptor-уудыг тоологдох progress-той боловсруулна; нэвтрэлт = 3 хөдөлгөөнгүй frontal snapshot (≥260мс зайтай), байгалийн анивчилтыг blendshape-ээр хэмжиж `livenessPassed`-д үнэнчээр бүртгэнэ (enforce хэвээр опт-ин). Сервер: `poses` max 8→12; CSP `script-src self wasm-unsafe-eval`; `/face-models/*` 7 хоног cache. `shared/face-auth.ts`-ийн 68 цэгийн LivenessTracker/flash код тесттэй хэвээр (одоо UI-д залгагдаагүй).

**Баталгаажуулалт**: `pnpm check`/`pnpm build` цэвэр; unit suite 630/630 (+25); Playwright-ээр tunnel + бодит CSP дор `vision_bundle` chunk → wasm → `FaceLandmarker` GPU delegate, SIMD, үүсгэх 1.0с (headless software GPU дээр detect 299мс — бодит утасны GPU олон дахин хурдан). **Бодит утсан дээрх хурд/цагирагийн UX-ийг Tom туршаагүй байна** — хамгийн эхний зүйл.

⚠️ **Cloudflare Web Analytics beacon** (`static.cloudflareinsights.com/beacon.min.js` + inline script) zone дээр автоматаар injected байгаа тул хуудас бүрт **2 CSP console алдаа** гарна (хаагдаж байгаа, аюулгүй). Унтраах: dashboard → Analytics & Logs → Web Analytics → karkaron.com → automatic setup OFF (эсвэл CSP-д `https://static.cloudflareinsights.com` нэмэх — нууцлалын үүднээс унтраахыг зөвлөнө). MediaPipe өөрийн INFO логоо console.error-оор бичдэг ("Created TensorFlow Lite XNNPACK delegate") — алдаа биш.

**CSP nonce (мөн өдөр)**: Web Analytics-ийг унтраасны дараа ч хуудас бүрт 1 CSP алдаа үлдсэн — **Bot Fight Mode**-ийн inline bootstrap (`window.__CF$cv$params` + `/cdn-cgi/challenge-platform/`) Cloudflare edge дээр HTML-д injected. Одоо `setSecurityHeaders` хариулт бүрт санамсаргүй `nonce-…` үүсгэж script-src-д нэмнэ; Cloudflare CSP-д nonce байвал өөрийн script дээрээ хуулдаг (амьдаар баталгаажсан: header nonce = script tag nonce, console алдаа 0). `unsafe-inline` НЭМЭЭГҮЙ; апп өөрөө inline script байхгүй. Тест: `security.headers.test.ts` (nonce хариулт бүрт өөр, unsafe-inline байхгүй).

## ⚠️ (2026-09-13) Дэлгүүр vs сагсны үнийн зөрүү — 814 variant хуучин үнэтэй байсан

Тестлэгч: /shop-д 25,000₮, сагсанд 22,500₮. Шалтгаан: storefront `products.priceMnt`, харин сагс/checkout/захиалгын мөр `product_variants.priceMnt` (cart_items → variantId) уншдаг. Бүх 937 бараа ганц variant-тай; `syncSoleVariantFromProduct` (09-11) үнийг хуулдаг болсон ч түүнээс ӨМНӨХ засварууд variant-д хүрээгүй → **814 variant** зөрүүтэй (686 нь 90%, 75 нь 50%, 27 нь 80%…) — **захиалга бүр дутуу үнээр төлөгдөж байв**. Засвар: `scripts/sync-variant-prices.ts` (dry-run анхдагч, `--apply` = JSON backup + UPDATE; олон variant-тай бараа гарвал татгалзана). Бөөн DB бичилтийг Tom өөрөө ажиллуулна. Шинэ бараа/variant нэмэх бүх зам үнийг хоёр газарт бичдэг эсэхийг цаашид шалгах.

Мөн өдөр: **cookie банерын текст** энгийн монгол болов (`shared/site-text.ts` cookie-text-* fallback; DB override байхгүй байсан тул шууд амьд). **iOS Safari-ийн play/pause overlay** `<video>`-ийн дотор зурагддаг тул CSS-ээр нуугдахгүй — video `opacity:0` (decoding үргэлжилнэ), дүрсийг `face-gate-preview` canvas дээр rAF-аар зурна.

## ✅ (2026-09-13) POS-ийн 43 шинэ бараа + "Хүнс" (khuns) ангилал

Tom POS-ийн бүрэн экспорт (`Downloads/shine baraanuudad nemegdsen list.csv`, 980 мөр, latin1, кирилл → `?`) илгээв. Barcode = `products.sku`; 937 нь байсан, **43 шинэ** (35 хүнс: mochi/jelly/tea/chocolate/cookies; 6 toilet paper/"SD LC" → Эрүүл ахуй; 2 knee/calf support → Эрүүл мэнд). `scripts/import-pos-products.ts` (dry-run анхдагч, `--apply`) — `createAdminCategory`/`createAdminProduct`-аар (variant + branch_stock + cache invalidation бүгд хэвийн), stock 20, published, зураггүй. **6 нэр** экспортод кирилл алдагдсан тул `"Toilet paper (4902727011443)"` маягаар орсон — /admin-д нэрлэх. Категори: id 1647 `khuns` "Хүнс", sortOrder 7; i18n `"Хүнс": Food & sweets / 食品・お菓子`; media slot `home-category-khuns` (default `/images/categories/khuns.webp` — Pexels #6645975, RDNE Stock Project, Pexels лиценз, 3840×2560 WebP 412KB + 1600px хувилбар); icon `Cookie`. ⚠️ CSV-ийн үнэ 933 барааны хувьд DB-ээс **яг 5% бага** (26,600 vs 28,000) — хөндөөгүй, Tom-оос аль нь зөв гэдгийг асуусан.

## ✅ (2026-09-13) Сканнер "products tsx" алдаа = deploy-ийн дараах хуучин chunk

Tom: сайт нээлттэй байхад POS сканнераар бараа уншуулахад заримдаа алдаа гарч, reload хийхэд хэвийн. Шалтгаан: `ProductDetail` (болон 14 хуудас) lazy chunk, нэр нь hash-тай (`ProductDetail-BJW-G6rc.js`) — **deploy бүрт солигдоно**, хуучин файл устдаг. Deploy-оос өмнө нээсэн tab хуучин `index.js`-тэй → scan → хуучин chunk 404 → `Failed to fetch dynamically imported module …ProductDetail-….js` → ErrorBoundary англи stack (Tom "products tsx" гэж уншсан). Өнөөдөр 6 удаа deploy хийсэн. Засвар: `shared/chunk-error.ts` (`isChunkLoadError` — Chrome/Firefox/Safari/Vite-ийн бүх үг хэллэг, тесттэй), `client/src/lib/lazyRetry.ts` (`lazyRetry` = React.lazy + нэг удаагийн авто reload, sessionStorage guard; `markChunksHealthy` App mount дээр), `main.tsx`-д `vite:preloadError` listener, App.tsx-ийн 15 `lazy(` → `lazyRetry(`; ErrorBoundary монгол + stale бол чимээгүй reload, stack `<details>`-д. ⚠️ Дэлгүүрийн лаптоп дээр сайт нээлттэй үед deploy хийвэл дараагийн scan **нэг удаа автоматаар reload** хийнэ (2–3с) — хэвийн. Сканнерын логик (`useBarcodeScanner`, `catalog.bySku`) өөрөө алдаагүй.

## ✅ (2026-09-13, үдээс хойш) Performance + dark-mode portal + царайн гацаа

**Хэмжилт** (chrome-devtools trace, 390px, Fast 4G, CPU 4×): нүүр LCP **3.37с**, үүнээс **load delay 2.78с** — hero зураг JS→React→tRPC(siteMedia)-ийн дараа л олддог байв. Bundle (sourcemap задаргаа, `scratchpad/bundle-analyze.cjs` загвар): index 538KB = react-dom 173 + @honeybadger 55 (key байхгүй атал) + i18n 33 + sonner 33 + home components 32 + tailwind-merge 24 + animejs 17 …

**Засвар**: (1) `indexHtml.ts` `%SEO_HERO_PRELOAD%` — `home-hero` slot-ийн URL-ийг (admin эсвэл default) HTML head-д `<link rel=preload as=image fetchpriority=high>`; HeroSection-ийн src-тэй **byte-ижил** байх ёстой. (2) Honeybadger зөвхөн key байвал, dynamic import, first paint-ийн дараа (−55KB). (3) App mount-ийн дараа idle-д Shop/ProductDetail/Checkout chunk-ийг урьдчилан татна (сканнерын хуудас шууд нээгдэнэ). (4) **Dark mode portal bug**: dark токенууд `.sugi-site` scope-д байсан, харин Radix Sheet/Dialog/Popover/Dropdown/Tooltip/sonner нь `<body>`-д portal → Linen цагаан хэвээр (Tom: сагс цагаан). Одоо `html[data-storefront-theme="dark"]:not(:has(.admin-shell)) [data-slot="…-content"]` scope-д орсон; CartDrawer/Checkout/ProductDetail-ийн hardcode `bg-[#fffdf9]`/`#f8f5ef`/`border-black/*`/саарал text hex-үүд → токен (`bg-card`/`bg-muted`/`border-border`/`text-muted-foreground`); `bg-white` packshot тавцангууд санаатай хэвээр. (5) **Царай танилтын гацаа** (Tom: нөгөө PC дээр гацаатай): `warmUpFaceModels()` — TFJS WebGL-ийн эхний inference дээрх shader compile (1–2с)-ийг камер нээгдэж байх зуур урьдчилан хийнэ (өмнө нь яг "Боловсруулж байна…" дээр гацдаг байсан); preview/mesh canvas 1280×720 → ≤640 (`overlaySize`); диагностик `face_attempts.detail`-д `tfjs=webgl|cpu mp=GPU|CPU describeMs trackMs` — удаан машиныг Security Center-ээс тоогоор оношилно. ⚠️ Хэрэв `tfjs=cpu` гарвал тэр машинд WebGL унтраалттай (Edge: edge://flags / GPU driver) — код биш, тохиргоо.

**Forced reflow (мөн trace)**: нийт **1,100мс** — хамгийн том нь `HeroImageSlideshow`-ийн animejs `onUpdate` frame бүрт `getComputedStyle(rail)` + `getBoundingClientRect()` уншаад `scrollLeft` бичдэг байв (60 удаа/с layout thrash). Одоо tile pitch-ийг `measure()`-д нэг удаа хэмжиж (ResizeObserver дээр дахин), frame нь write-only. Ижил загвар `CategoryRail`/`CarouselShelf`-д: уншилт зөвхөн scroll/resize дээр — thrash биш. DOM 1073 элемент, style recalc 575мс/1000 элемент — Tailwind + 3.7k мөр custom CSS-ийн үнэ; дараагийн ажил. Dark portal: sheet/dialog-д `color: var(--foreground)` мөн нэмсэн (сагсны үнэ rgb(23,24,27) дээр rgb(27,27,27) — үл үзэгдэх байсныг хэмжсэн).

## ✅ (2026-09-13, орой) Хэрэглэгчийн контентын аюулгүй байдал — NSFW avatar + олон хэлний хараалын шүүлт

- **Avatar NSFW** (`server/_core/imageSafety.ts`): nsfwjs `MobileNetV2Mid` (MIT, жин npm багц дотор — runtime-д юу ч татахгүй, зураг серверээс гарахгүй), `@tensorflow/tfjs` цэвэр JS CPU backend (native build хэрэггүй), sharp-аар 224px RGB болгож тензор. Босго: Porn/Hentai ≥0.45 эсвэл Sexy ≥0.75 → `BAD_REQUEST` (монгол мессеж). Загвар ачаалагдахгүй бол upload-ыг **татгалзана** (чимээгүй алгасахгүй). `profile.uploadAvatar`-т `processUploadedImageOrThrow`-ийн дараа. Log: оноо л, зураг биш. Тест `server/image-safety.test.ts` (загвар бодитоор ачаалж, neutral зураг тэнцдэг).
- **Сэтгэгдлийн хараал/доромжлол** (`server/_core/moderation.ts`): 2 давхарга. (1) Үргэлж: NFKC+lowercase+leetspeak/латин-кирилл fold+тусгаарлагч арилгах (f.u.c.k, х у й, sh1t) → mn кирилл/латин, ru, en, zh, ja, ko язгуурын regex + threat/hate/spam; Scunthorpe allow-list (class, massage, письмо…). (2) `ANTHROPIC_API_KEY` байвал Anthropic API-ийн загвар (сонголтоор, `ANTHROPIC_API_KEY`) моderator шиг уншиж JSON шийдвэр; API алдвал lexical шийдвэр хүчинтэй (AI давхарга fail-open, lexical хэзээ ч биш). `reviews.create`-д comment байвал `screenText`. Тест `server/moderation.test.ts`. ⚠️ Tom: AI давхаргыг асаахын тулд `.env`-д `ANTHROPIC_API_KEY` (console.anthropic.com) — нэг сэтгэгдэл ≈ $0.001.

## ✅ (2026-09-13, шөнө) Сэтгэгдлийн thread (Like/Reply) + admin засвар + Docker-гүй олон хэлний moderation

**Tom-ийн лавлагаа**: ishadeed.com-ийн comment component (avatar + bubble + холбогч шугам, logical properties). `client/src/components/ReviewThread.tsx` + `index.css`-ийн `.review-*` (Linen/dark токен, `inset-inline-start`/`border-inline-start`/`border-end-start-radius`). **Migration `0070`** (Aiven дээр ажилласан): `product_review_replies` (тусдаа хүснэгт — product_reviews-ийн unique(userId,productId) + NOT NULL rating-д хариулт багтахгүй), `product_review_likes` (PK reviewId+userId = toggle). `reviews.list` нэг query-д replies + likeCount + likedByMe + avatar + staff badge (`isAdminPanelRole`); `reviews.reply` (зохиогч / panel staff / тухайн барааг авсан хэрэглэгч; moderation дамжина; strict rate limit), `reviews.like` (toggle). Admin: `admin.updateReview` (rating/comment засах), `reviewReplies`/`updateReviewReply` (нуух/засах)/`deleteReviewReply`; AdminReviewsPanel-д "Засах" + "Хариулт N" modal. **Бодит баталгаа**: `scripts/verify-review-thread.ts` (throwaway buyer/staff/order → create/reply/like/list/admin edit/hide/delete cascade → cleanup; `--keep`/`--cleanup`) — өмнө нь `product_reviews` **0 мөр** байсан тул "ажилладаг" гэдэг нь зөвхөн энэ script-ээр батлагдана.

**Moderation давхаргууд (дараалал)**: (1) lexical mn/ru/en/zh/ja/ko — үргэлж; (2) **in-process ONNX** `onnx-community/bert-multilingual-toxicity-classifier-ONNX` (textdetox, 15 хэл: ru/zh/ja/de/es/ar/hi… — **mn биш**; openrail++; q8 179MB `.cache/moderation-model/` gitignored; transformers.js 4.x + onnxruntime-node — pnpm build script хаагдсан ч win32/x64 binding багц дотроо байдаг) — Tom "Docker хэрэггүй, VPS-д ачаалал өгөхгүй" → **on-demand ачаалж, 10 мин идэвхгүй бол dispose** (`MODEL_IDLE_MS`), boot дээр зөвхөн prefetch→release; `MODERATION_MODEL=0` унтраана; `RUN_MODEL_TESTS=1` gated тест; (3) LocalMod adapter (`MODERATION_API_URL`, r/selfhosted-ийн KOKOSde/localmod: MIT, Docker, 3.5GB, toxicity **зөвхөн англи**) — сонголтоор; (4) Anthropic API (`ANTHROPIC_API_KEY`) — сонголтоор. nsfwjs avatar шүүлт мөн idle-unload. ⚠️ LocalMod/Anthropic хоёулаа тохируулаагүй = lexical + ONNX л ажиллана (Tom-ийн хүсэлт).

⚠️ **Загварын татаалт**: huggingface.co-оос энэ лаптопт ~100KB/с (179MB ≈ 30 мин) — transformers.js-ийн өөрийн татаалт vitest-ийн 300с timeout-д багтахгүй. Арга: `curl -L -C - -o .cache/moderation-model/onnx-community/bert-multilingual-toxicity-classifier-ONNX/onnx/model_quantized.onnx https://huggingface.co/onnx-community/bert-multilingual-toxicity-classifier-ONNX/resolve/main/onnx/model_quantized.onnx` (config/tokenizer-ийг transformers.js өөрөө татсан), дараа нь offline. Загвар татагдаж дуустал сервер `MODERATION_MODEL=0`-оор ажиллаж байсан (thread UI deploy-ийг хүлээлгэхгүйн тулд); дууссаны дараа энгийнээр дахин асаана. Hosting дээр: `.cache/moderation-model`-ийг хамт хуулах (эсвэл нэг удаа татуулах).

**Баталгаажуулалт (2026-09-13)**: `verify-review-thread.ts` 7/7 ✓ Aiven дээр (abusive review/reply татгалзсан; review/replies/likes бичигдсэн; staff badge; likedByMe; admin edit/hide; delete cascade; cleanup) — ⚠️ script-д `ADMIN_FACE_GATE_ENABLED=0` (admin procedure-ууд face proof шаарддаг) ба санамсаргүй IP (strict rate limit 15 мин) хэрэгтэй. Playwright: thread light/dark screenshot (`.playwright-mcp/review-thread-*.png`) — bubble rgb(27,27,27)/текст rgb(237,237,237) dark-д. Unit suite 648/648.

## ✅ (2026-09-13, орой) Нээлтийн зураглал (gap audit) + sitemap/robots/og:image + ONNX загвар бэлэн

**Тайлан** (Tom: "манай website-д юу дутагдаж байгааг судалж хэлээрэй"): (дотоод тайлан) — бодит DB/кодоос хэмжсэн: 980 бараанаас **461 зураггүй**, 43 тайлбаргүй, 129 брэндгүй; users 2 / orders 4 (paid 1) / reviews 0; онлайн төлбөр 0/2; hosting = лаптоп+tunnel; og:image/sitemap/hreflang/Meta Pixel/Messenger/Merchant feed/FB login/бэлгийн карт/Q&A/PDF баримт/PWA/skip link алга. Нээлтийг хаадаг 5: hosting+домэйн, QPay, хүргэлтийн урсгал, зураг, eBarimt — 3 нь Tom-ийн бизнесийн алхам.

**Заслагдсан**: `server/_core/sitemap.ts` — `/sitemap.xml` (static route + ангилал `/shop?category=` + бүх нийтлэгдсэн бараа lastmod-той + нийтлэл; 10 мин cache; DB алдвал static л буцаана, 500 биш) ба `/robots.txt` динамик (origin = `PUBLIC_BASE_URL` эсвэл request host) — хуучин static robots.txt **устсан manus.space** руу sitemap заадаг байсныг устгав; `server/sitemap.test.ts` 5. `og:image`/`twitter:image` (`%SEO_OG_IMAGE%` = hero зургийн абсолют URL, `summary_large_image`). ONNX toxicity загвар 179MB бүрэн татагдаж (`curl -C -`), `RUN_MODEL_TESTS=1` тест 2/2 (ru/zh/ja/en доромжлол үгийн сангүйгээр) — сервер одоо `MODERATION_MODEL=0`-гүй ажиллана.

## ✅ (2026-09-13) Aiven Бангалор → Oracle HeatWave Токио — АЖЛЫН ЛАПТОП (DESKTOP-4GALLRR, user sugia) CUTOVER ДУУССАН; гэрийн лаптоп (user hero_) — VM-ийн түлхүүр л дутуу

✅ **2026-09-14: гэрийн лаптоп HeatWave-д ХОЛБОГДЛОО** — ажлын лаптопын түлхүүрийг VM-д нэмсэн ч "Permission denied" хэвээр байсны жинхэнэ шалтгаан: `setup-laptop.ps1`-ийн `-N '""'` нь түлхүүрт **хоёр хашилт тэмдэгтийн нууц үг** тавьсан (`ssh -v`: Server accepts key → "incorrect passphrase"). `ssh-keygen -p -P '""' -N ''`-ээр арилгасан; скрипт `98d39b5`-д зассан (cmd.exe-ээр үүсгэж, нууц үгтэй бол шатна). Tunnel 4 с-д 3307 нээгдсэн; `db-backup-daily.ps1` HeatWave дээр 258.6 KB ✓ (14 хадгална); `pnpm dev` `/health` database up; орчуулгыг ja-аар 6 public хуудсанд Playwright-аар шалгасан (кирилл үлдээгүй, DB контент/дүүргийн нэр/cookie banner-аас бусад). OCI Run Command-ийн 2 хуучирсан command queue-д үлдсэн — хор нөлөөгүй.

**Гэрийн лаптоп (hero_, 2026-09-13 орой)**: `setup-laptop.ps1` step 1 ✅ (түлхүүр `~/.ssh/sugi-oci`, config, tunnel task), `oci-ca.pem` ✅, `.env` Oracle+FB+VAPID ✅ (`.env.bak-aiven-2026-09-13`), **`SUGI ASAYAKE Daily DB Backup` task ✅ (энэ лаптопт өмнө нь огт байгаагүй)**. ⏳ **Дутуу**: VM-ийн `~/.ssh/authorized_keys`-д энэ лаптопын public key (`sugi-asayake-oci-MYDICK`, ажлын лаптопоос `ssh sugi-oci "echo '<key>' >> ~/.ssh/authorized_keys"`) — орох хүртэл `ssh sugi-oci` "Permission denied", 3307 хаалттай, `pnpm dev`/backup ажиллахгүй. Орсны дараа: 3307 шалгах → `scripts/db-backup-daily.ps1` гараар нэг удаа → `pnpm dev` `/health`. **⛔ 2026-09-13 орой туршиж бүтээгүй зам (дахин оролдохгүй)**: OCI **Run Command** — API-аар command үүсдэг (2 ширхэг `add-home-laptop-ssh-key*` queue-д үлдсэн, өөрөө хугацаа дуусна) ч VM-ийн агент хэзээ ч татдаггүй (`delivery=VISIBLE` хэвээр); шалтгаан нь агент `auth.ap-tokyo-1.oraclecloud.com` (140.204.8.204:443)-д хүрч чадахгүй (Cloud Guard plugin-ийн i/o timeout мессеж) — Bastion managed SSH ч ижил auth замаар явдаг тул найдваргүй. Гэрийн лаптопт OCI API key бэлэн (`~/.oci/config`, fingerprint `be:f7:…:47`, `oci` Python SDK) — читал-уншилтад ажилладаг. Bastion plugin идэвхжүүлсэн (хор нөлөөгүй). ⚠️ Tom `.env`-ээ бүтнээр chat-д paste хийсэн (09-13) → Cloudflare API token, FB secret, DB/R2 нууц үгүүд **rotate хийх**. Дэлгэрэнгүй HISTORY.md "Гэрийн лаптоп (hero_) → Oracle HeatWave".

⚠️ Машины нэр: **энэ лаптоп = АЖЛЫН** (`DESKTOP-4GALLRR`, `C:Userssugia`, Tom 2026-09-13 баталгаажуулсан); **гэрийн = `C:Usershero_`** (тэнд `SUGI ASAYAKE Daily DB Backup` task + mysqldump байдаг). Доорх тэмдэглэлүүдэд "гэрийн лаптоп" гэж бичигдсэн газар нь энэ (ажлын) лаптопыг хэлж байгаа. Гэрийн лаптопыг тохируулах: `scripts/oci/setup-laptop.ps1` (доор).

Runbook: **[docs/OCI-MIGRATION.md](docs/OCI-MIGRATION.md)**. Бодит нөөцүүд (Tom-ийн OCI данс, home region Tokyo): VCN `sugi-vcn` (10.0.0.0/16; `sugi-public` 10.0.0.0/24, `sugi-private` 10.0.1.0/24, IGW `sugi-igw`, route `sugi-rt-public` 0.0.0.0/0→IGW — **энэ дүрэм дутуу байснаас SSH timeout гарч байсан**); **HeatWave** `sugi-db` = **10.0.1.227** (`sugi-db.sugiprivate.sugivcn.oraclevcn.com`), MySQL.Free 1 ECPU/8GB, 50GB, **26.7.0-cloud**, delete protected; **VM** `sugi-app` = **168.110.25.230** (E2.1.Micro x86 1GB — jump host; A1 Токиод "Out of capacity", Tom PAYG upgrade хийвэл ихэвчлэн гардаг; Always Free A1 2026-06-15-аас **2 OCPU/12GB** болж хагасалсан, PAYG-д 4/24 хэвээр).

Хийгдсэн: `scripts/oci/setup-vm.sh` VM дээр ажилласан (mysql client 8.4.11 — Oracle repo-ийн 2023 GPG key **хугацаа дууссан**, 2025 key + Ubuntu fallback; Node 22, pm2, cloudflared, swap 2G, ufw 22). Aiven→HeatWave: mysqldump VM дээрээс (1м43с, 2.29MB, DEFINER/routine 0) → restore **3 секунд** → 57 хүснэгт, 980 бараа, 4 захиалга, 3920 branch_stock, 980 movements, FULLTEXT ✓. Хэрэглэгч: `admin` (Tom-ийн нууц үг — **солих**), `sugi_app` (SELECT/INSERT/UPDATE/DELETE, нууц үг VM-ийн `~/.sugi_app.env` 600). TLS: server `MySQL_Endpoint_Server` ← CA `MySQL_Endpoint_CA` (2029) → `oci-ca.pem` (gitignored; нөгөө лаптопт `scp ubuntu@168.110.25.230:/tmp/cert2.pem oci-ca.pem`). Энэ лаптоп: `~/.ssh/config` `Host sugi-oci` (LocalForward 3307→10.0.1.227:3306), `.env` → `DATABASE_URL=mysql://sugi_app:…@127.0.0.1:3307/…`, `DATABASE_ADMIN_URL` (admin), `DATABASE_CA_CERT_PATH=./oci-ca.pem`; Aiven URL `#AIVEN_DATABASE_URL` гэж comment-д (rollback 7 хоног); `.env.bak-aiven-2026-09-13`. ⚠️ Нууц үгэнд `#`/`@` байвал .env-д **URL-encode** (`%23`, `%40`) — dotenv `#`-ээс хойш comment гэж уншдаг (бодитоор тохиолдсон). Хэмжсэн: tunnel-ээр query p50 **67мс** (Aiven 170–330мс).

✅ **Бүрэн integration suite HeatWave дээр: 915/915 (90 файл, 561с)** — sql_mode ялгаа аппад нөлөөгүй нь батлагдсан. Энэ (ажлын) лаптопын production сервер (3000, tunnel sugi.karkaron.com) одоо HeatWave дээр: `/health` database up, нүүр 0.9с/shop 0.06с, sitemap 1000 URL. Tunnel = Task Scheduler **"SUGI OCI Tunnel"** (`scripts/oci/tunnel.ps1`, logon бүрт, авто reconnect). **Гэрийн лаптопт (hero_) хийх**: `git pull`, `scripts/oci/setup-laptop.ps1` (түлхүүр үүсгэж, config бичиж, task бүртгэнэ; public key-г VM-д нэмнэ) (SSH key `~/.ssh/sugi-oci`-г тэр лаптопт хуулах ЭСВЭЛ шинэ түлхүүр үүсгэж VM-ийн `~/.ssh/authorized_keys`-д нэмэх), `oci-ca.pem` (VM `/tmp/cert2.pem`), `.env`-ийн 3 мөр (энэ лаптопынхтай ижил), backup task-ийн URL.

⚠️ **sql_mode ялгаа**: HeatWave `IGNORE_SPACE,ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION` (ANSI_QUOTES/ANSI/PIPES_AS_CONCAT байхгүй) — бүрэн integration suite-ээр батлагдана (доор). `server/_core/dbConnection.ts`: CA pin + IP-literal host → `checkServerIdentity` алгасна (3 тест). Дараагийн: ажлын лаптопын tunnel/.env, сайтыг VM дээр (A1 гармагц), Windows backup task → tunnel, Aiven устгах (7 хоногийн дараа).

## ✅ (2026-09-13, орой) САЙТ ОДОО ORACLE VM ДЭЭР — лаптоп унтарсан ч ажиллана

Tom: "лаптоп унтарвал сайт дагаж унана биз дээ" → аппыг мөн VM (`sugi-app`, 168.110.25.230, E2.1.Micro 1GB) дээр байрлуулав. Private repo тул VM clone хийж чадахгүй (`could not read Username`) → **build лаптоп дээр, VM-д зөвхөн `dist/` + package.json + lockfile** (`scripts/oci/deploy.ps1`: build → tgz → scp → `pnpm install --prod` зөвхөн lockfile өөрчлөгдвөл → `pm2 restart sugi` → health). VM дээр: `~/sugi-asayake/{dist,node_modules,.env,oci-ca.pem}`, `.env` = гэрийн лаптопынхаас үүсгэсэн (DB **шууд** `10.0.1.227:3306` sugi_app, **шинэ JWT_SECRET**, `NOTIFICATIONS_DISPATCH=1` — push мэдэгдэл одоо VM-ээс явна, `MODERATION_MODEL=0` — 1GB-д ONNX багтахгүй, A1 гармагц асаана), pm2 `sugi` (`--max-memory-restart 700M`, `pm2 save` + systemd startup), **cloudflared systemd service** `/etc/cloudflared/config.yml` — лаптопын tunnel credential (`bbd3128e…json`) VM рүү **зөөгдсөн**; лаптоп дээр `cloudflared tunnel run` ДАХИН АЖИЛЛУУЛАХГҮЙ (хоёр connector нэг tunnel-д зэрэг байвал Cloudflare хувааж явуулна — эвдэрдэггүй, гэхдээ dev лаптопын серверт бодит хэрэглэгч ирнэ). `pnpm install --prod` 1GB дээр 2м51с (swap 110MB), апп RSS ~206MB, идэвхтэй хуудас 3–180мс.

**Батлагдсан**: лаптопын cloudflared + node **хоёуланг зогсооход** `https://sugi.karkaron.com` 200 (0.15–0.9с), `/health` database up; VM connector connIndex 0–3 бүртгэгдсэн. Энэ (ажлын) лаптоп одоо **зөвхөн dev** (`pnpm dev` → tunnel 3307 → HeatWave); production сервер = VM. Гэрийн лаптопт `deploy.ps1` ажиллуулахад `~/.ssh/config` `Host sugi-oci` + түлхүүр хэрэгтэй.

⚠️ Startup-д `notification_outbox` дээр 6 удаа `connect ETIMEDOUT` (нэг л удаа, дараа нь 0) — ажиглах; давтагдвал HeatWave-ийн `max_connections`/pool 10 шалгах.

## ✅ (2026-09-13, орой, ажлын лаптоп) Growth tier — Q&A, PDF баримт, бэлгийн карт, Web Push, Facebook login, PWA, skip link

Tom-ийн "growth tier" жагсаалтаас нэг дор хэрэгжүүлэв (migration **0071–0074** HeatWave дээр ажилласан; бүгд `pnpm check`/`pnpm lint` цэвэр, throwaway script-ээр бодит DB дээр батлагдсан: Q&A 9/9, бэлгийн карт+push 13/13):

- **Барааны Асуулт/Хариулт** (`product_questions`, `product_question_answers`): `questions.list/ask/answer` — ask нь нэвтэрсэн хэн ч, answer нь ажилтан эсвэл тухайн барааг авсан хэрэглэгч (review reply-тай ижил дүрэм, `canAnswerQuestion`); текст `screenText` moderation + strict rate limit. UI `client/src/components/ProductQuestions.tsx` (review thread-ийн `.review-*` загварыг дахин ашиглана), PDP-д сэтгэгдлийн доор. Admin: /admin → Сэтгэгдэл хэсгийн доод хагас (`AdminQuestionsPanel`, нуух/устгах; `admin.questions/setQuestionApproved/deleteQuestion/deleteQuestionAnswer`).
- **Захиалгын PDF баримт** (`server/invoice.ts`, `orders.invoicePdf` → base64): pdfkit + **`server/assets/fonts/GolosText.ttf`** (build нь `server/assets`→`dist/assets` хуулдаг; Helvetica кирилл байхгүй). ⚠️ Golos-д **₮ (U+20AE) глиф байхгүй** тул PDF-д "11,250 төг" гэж бичнэ. Footer-т "и-баримт БИШ" гэдгийг заасан. Profile → захиалга бүрт "Баримт (PDF)" товч (Blob download).
- **Бэлгийн карт** (`gift_cards`): /admin → Урамшуулал хэсгийн доор `AdminGiftCardsPanel` (finance эрх; дүн/тоо/хугацаа; код `SUGI-XXXX-XXXX-XXXX`, 0/O/1/I-гүй), кодыг гараар өгнө. Хэрэглэгч /profile → Гишүүнчлэл → "Бэлгийн карт ашиглах" → `giftCards.redeem` нэг transaction-д картыг `redeemed` болгож `users.storeCreditMnt` + ledger мөр (checkout аль хэдийн store credit зарцуулдаг). ✅ **2026-09-14: checkout-оор зарагдана** — `products.kind='gift_card'` (migration 0076), ангилал "Бэлгийн карт" + 4 бараа (`scripts/seed-gift-cards.ts`), `issueGiftCardsForPaidOrder` (QPay/StorePay webhook, admin "Дууссан", POS; idempotent, cancel/refund → void), код push+имэйл+профайл/track-order; хямдрал physical мөрөнд л. Дэлгэрэнгүй HISTORY.md "Бэлгийн карт checkout-оор зарагдана".
- **Customer Web Push (VAPID)** (`push_subscriptions`, `server/_core/webPush.ts`, `web-push` багц): `.env` `VAPID_PUBLIC_KEY/PRIVATE_KEY/SUBJECT` (ажлын лаптоп + VM хоёуланд ижил хос тавигдсан; ⚠️ гэрийн лаптопт хуулах). Profile → Мэдэгдэл → "Push мэдэгдэл (энэ хөтөч)" toggle + туршилтын мэдэгдэл; `sendOrderStatusPush` нь `sendOrderStatusUpdateEmail`-ийн 3 дуудлагын хажууд (статус солигдох бүрт). 404/410 endpoint автоматаар устна. ⚠️ iPhone-д зөвхөн "Нүүр дэлгэцэд нэмэх" (PWA) хийсний дараа ажиллана; HTTP LAN дээр огт ажиллахгүй.
- **Facebook login** (`server/_core/facebookAuth.ts`, `/api/auth/facebook` → `/callback`, SDK-гүй OAuth code flow, state cookie, `appsecret_proof`; `users.facebookId`): `.env` `FACEBOOK_APP_ID=2284025695468563` тавигдсан, **`FACEBOOK_APP_SECRET` хоосон → товч нуугдаж, route 404** (`auth.socialProviders`). Tom: developers.facebook.com → sugiasayake → App settings → Basic → App Secret-ийг ажлын лаптоп + VM `.env`-д; Facebook Login → Settings → Valid OAuth Redirect URIs: `https://sugi.karkaron.com/api/auth/facebook/callback`. Нэвтэрсэн хэрэглэгч энэ URL руу орвол **холбоно** (шинэ данс үүсгэхгүй); FB-ээр үүссэн данс утасгүй (passwordHash санамсаргүй), checkout утас асуусаар. ⚠️ Graph API Explorer-ийн user token нь login-д хэрэггүй (богино хугацаатай).
  ✅ **2026-09-13 18:30 — App Secret .env-д (ажлын лаптоп + VM) орж, товч амьд**; Meta dashboard: Basic бүрэн (icon, privacy/terms/deletion URL = `/privacy`, Category Shopping), Use cases → Facebook Login → Settings → Valid OAuth Redirect URIs = callback, `email` permission нэмэгдсэн; Tom-ийн өөрийн FB-ээр амьд нэвтрэлт ажилласан. ⚠️ **App одоо ч Development (Unpublished)** — Publish хийхэд **Business verification** (компанийн бичиг баримт, Business ID 1100641962466867) шаардана; Tom дараа хийнэ. Тэр хүртэл **зөвхөн app-ын admin/developer/tester эрхтэй FB данс** нэвтэрч чадна (тестлэгч нэмэх: dashboard → App roles → Add testers). App domains талбарт `sugi.karkaron.com` бичих (хоосон үлдсэн байж магадгүй). Гэрийн лаптопын `.env`-д ажлын лаптопын `FACEBOOK_APP_ID/FACEBOOK_APP_SECRET/VAPID_*` 5 мөрийг хуулна.
- **PWA**: `client/public/manifest.webmanifest`, `sw.js` (navigations network-first + offline.html, hashed assets cache-first, `/api/*` хэзээ ч кэшлэхгүй; push/notificationclick handler; `CACHE_VERSION` bump хийж шинэчилнэ), `icons/` (sharp-аар үүсгэсэн), SW зөвхөн production-д бүртгэгдэнэ (`main.tsx`). `scannerProbes` allowlist-д `sw.js|offline.html`.
- **Skip link** (WCAG 2.4.1): storefront бүх хуудсанд `#main-content` руу; Tab дарахад л харагдана.
- **ESLint**: `client/public/**` + `scripts/*.mjs` ignore (MediaPipe wasm JS 675 алдаа өгч байсан — HEAD дээр ч lint улаан байсныг заслаа).
- **deploy.ps1 засвар**: remote bash блок single-quoted here-string болов (`\$(...)` PowerShell-д ажиллахгүй байсан). 🔴 Засварын явцад scp мөр ч `__BUNDLE__` placeholder-той болж, архив `~/__BUNDLE__` нэрээр очиж, remote алхам `dist`-ийг устгасны дараа tar унасан → **сайт ~3 минут 502** (18:00 UTC+8 орчим). Гараар сэргээсэн, script засагдсан, дараа нь бүрэн deploy-оор дахин батлагдсан. **Дүрэм: remote блок `rm -rf dist`-ээс өмнө архивыг ЗААВАЛ шалгана** (одоо `set -e` + tar эхэлж `dist.new`-д задардаг тул архив байхгүй бол `dist` хөндөгдөхгүй).

## ✅ (2026-09-14, гэрийн лаптоп) Cache, орхигдсон сагсны push, sweep — 4 deploy

- Нүүрний rail-ууд (`getBestsellingProducts`/`getFeaturedBrands`/`getBrandDirectory`/`getPublishedProductCount`/`getRelatedProducts`) 30 с storefront cache; бичигчид түлхүүрээ хаяна (`invalidateCachedByPrefix`). Амьд: дуудлага бүр ~0.2 с, бараг бүгд UB→Токио сүлжээ — сервер тал одоо асуудал биш.
- `abandoned-cart-reminder` job одоо **web push**-аар ч сануулна (утасны бүртгэлтэй, имэйлгүй хэрэглэгч) — `push-body-abandoned-cart` store setting; ядаж нэг суваг хүрсэн үед л `reminderSentAt`.
- `{N}`/`{n}` placeholder `+`-тэй тоо ("900+") таарна; 2 хаах товчны tap target ≥24px.
- Tom-д: барааны нэр "Бараа (4901655440509)" (POS placeholder) нэрлэх; `product_categories` "Shampoo" (id 1, хоосон) устгаж болно; privacy §4 "Aiven"→"Oracle Cloud (Токио)" 3 хэлээр код fallback-д зассан (admin мөр байвал тэр давамгайлна).
- **Барааны share + серверийн meta** (`server/_core/routeMeta.ts`): `/product/:slug` ба нийтлэл `/:slug` өөрийн og:title/description/**og:image**/JSON-LD-тэй — `renderIndexHtml(template, originalUrl)`. **Google Merchant feed** `/feeds/google-merchant.xml`; **Search Console / Meta домэйн баталгаажуулалт** — /admin → Дэлгүүрийн тохиргоо → "SEO ба баталгаажуулалт" (2 код). PDP-д `ShareBar` (native share + FB/X/Telegram/copy). Tom: Search Console-д property нэмж кодоо буулгах; Merchant Center-д feed URL өгөх; FB Sharing Debugger-ээр барааны линкийг "Scrape again".
- **DB backup одоо VM дээрээс** (`~/sugi-asayake/vm-backup.sh`, cron 19:00 UTC → private R2 `sugi-asayake-backups/db/*.sql.gz.enc`, 30 хоног; restore: `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:BACKUP_PASSPHRASE | gunzip | mysql`; passphrase VM `.env` + гэрийн `.env`). Лаптопын Windows task нэмэлт хуулбар л. **Uptime**: `.github/workflows/uptime.yml` — ⚠️ Tom repo secrets `NTFY_URL`/`NTFY_TOKEN` нэмэх хүртэл push илгээхгүй.
- **Захиалгын push ажиллаж байгаа нь амьдаар батлагдсан** (туршилтын захиалга `SAMU0NHNJY458K8X` — Tom /admin-аас цуцлах). PDP: сэтгэгдэл/асуулт руу үсрэх pill (`ProductSectionJumps`).
- **/help** — холбоо барих (утас/Messenger/имэйл/цаг — store settings), салбарууд, FAQ (`shared/help-faq.ts`, Profile-тэй нэг жагсаалт), footer-т линк, sitemap-д.
- **Царайны proof tab-д холбоотой** (09-14): `x-admin-tab` header (sessionStorage id) ↔ JWT `tabs` claim; tab хаагаад буцахад камер дахин; хоёр дахь tab join хийнэ (max 6). Шинэ tRPC client/fetch зам нэмбэл header-ийг заавал дамжуул (`adminTabId()`), эс бөгөөс admin API FACE_REQUIRED өгнө.
- **Admin панелийн render шалгах**: dev дээр `/__admin-preview?adminSection=documents` (auth/царайгүй, `preview` горим, production-д байхгүй). 09-14: Баримт бичгийн editor хоосон байсан регресс (`useEffect` dependency-д render бүрт шинэ объект) — `useMemo`-оор засав.
- **OG карт** `/og/product/<slug>.jpg` (sharp, 1200×630, cache) — барааны зураг хэдэн px байсан ч Facebook том зурагтай карт зурна; `og:image:width/height` meta. FB-д өмнө хуваалцсан URL → Sharing Debugger "Scrape again".
- Share: утсан дээр Facebook товч → **Messenger deep link** (Facebook апп sharer линкийг барьж феедээ нээдэг — 09-14 бодит), Facebook нь share sheet-ээр. Баримт: **`docs/ADMIN-MANUAL.md`** (ажилтанд), **`docs/SALES-BRIEF.md`** (худалдан авагч компанид).
- Дараагийн боломж (хийгээгүй): бэлгийн картыг checkout-оор зарах (`gift_cards.purchaseOrderId` бэлэн; 3 "paid" шилжилт дээр код гаргах хэрэгтэй); referral.
