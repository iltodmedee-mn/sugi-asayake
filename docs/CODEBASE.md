# SUGI ASAYAKE — Кодын бүтэн тайлбар

> **Яагаад энэ файл байдаг вэ.** Tom (2026-09-12): *"Learn your code always and create a .md file for explaining your code how they work all of them!! Do not skip even a single code structure!!"* — мөн Reddit-ийн r/nextjs дээрх хамгийн олон санал авсан сэтгэгдэл: *"AI is good at quick scaffolding but it's absolutely useless when it comes to refinement."*
>
> **[PROJECT-GUIDE.md](PROJECT-GUIDE.md)** = одоогийн статус, тохиргоо, анхааруулга. **[HISTORY.md](../HISTORY.md)** = өдөр бүрийн ажлын лог, шийдвэрийн шалтгаан. **Энэ файл = систем хэрхэн АЖИЛЛАДАГ вэ**: файл бүр юу хариуцдаг, өгөгдөл хаанаас хаашаа урсдаг, ямар дүрмийг хэзээ ч зөрчиж болохгүй вэ.
>
> Файл нэмэх/өөрчлөх бүрт энэ баримтыг мөн шинэчилнэ.

---

> 🗺️ Энэ файлын визуал хувилбар (давхаргууд, нэг захиалгын аялал, нөөцийн ledger, эрхүүд, дүрмүүд): (дотоод тайлан) (2026-09-12)

## 0. Нэг догол мөрөөр

SUGI ASAYAKE бол **нэг Node процесс** дээр ажилладаг онлайн дэлгүүр: Express сервер нь (1) `/api/trpc` дээр tRPC API, (2) production-д статик файл / dev-д Vite, (3) хэдэн тусгай route (`/health`, төлбөрийн callback, `/cdn/*` зургийн proxy)-г үйлчилдэг. Өгөгдөл нь **Aiven дээрх MySQL** (drizzle ORM), зургийн байт нь **Cloudflare R2**. Клиент нь **React + Vite + wouter + TanStack Query (tRPC client)**. Хоёр лаптоп нэг DB, нэг R2-г хуваалцдаг.

Гурван эх сурвалжийн хавтас:

| Хавтас | Хэн ашигладаг | Дүрэм |
|---|---|---|
| `server/` | зөвхөн сервер | Node API (fs, net, crypto) ашиглаж болно |
| `shared/` | сервер БА клиент хоёул | **DOM, Node API хоёуланг нь ашиглаж болохгүй** — цэвэр TypeScript, `@shared/*` гэж import хийгдэнэ |
| `client/src/` | зөвхөн браузер | сервер модулийг шууд import хийхгүй (зөвхөн `shared/` болон tRPC-ийн ТӨРӨЛ) |

---

## 1. Процессын амьдралын мөчлөг — `server/_core/index.ts`

Серверийн цорын ганц эхлэх цэг. Дараалал нь санаатай:

1. `dotenv/config` → `.env` уншина; `NODE_ENV` тохируулаагүй бол `development`.
2. **`assertProductionSecrets()`** (`_core/context.ts`) — production-д `JWT_SECRET` байхгүй бол порт нээхээс ӨМНӨ шатна.
3. Middleware (дараалал чухал):
   - `setSecurityHeaders` → `compression()` → Honeybadger (хамгийн эхэнд байх ёстой гэрээтэй) → `limitApiTraffic` → `protectStateChangingApiRequests` (CSRF) → `express.json({ limit: "20mb" })` (2026-09-20-нд 50mb-аас; хамгийн том зөвшөөрөгдсөн бие нь 14 MB base64 зураг).
4. Тусгай route-ууд: `registerStorageProxy` (`/cdn/*`), `registerQPayCallbackRoute`, `registerStorepayCallbackRoute`, `registerVerifyMnCallbackRoute`, `/health` (DB-г бодитоор ping хийнэ), `/favicon.ico` → 302.
5. `/api/trpc` → `createExpressMiddleware({ router: appRouter, createContext })`. `onError` нь **хүлээгдэж буй** алдааг (BAD_REQUEST, UNAUTHORIZED …) Honeybadger руу илгээхгүй — үнэгүй tier-ийг validation-ий үр дүнгээр дүүргэхгүйн тулд.
6. dev бол `setupVite`, production бол `serveStatic`.
7. Порт: `PORT`-оос эхлээд 20 порт сканнердаж сул портыг олно.
8. **Background ажлууд бүртгэгдэнэ** (доорх §7) → `startScheduler()` → `startNotificationDispatcher()`.
9. `unhandledRejection` / `uncaughtException` — процессыг унагаахгүй, лог + Honeybadger.

### Хүсэлтийн зам (tRPC)

```
browser → /api/trpc/<router>.<procedure>
        → createContext (_core/context.ts): cookie-оос session token уншиж user-ийг ачаална
        → procedure-ийн middleware гинж (_core/trpc.ts): эрх + rate limit
        → procedure-ийн код (server/routers.ts эсвэл дэд router)
        → домэйн модуль (db.ts, inventory.ts, transfers.ts …)
        → drizzle → MySQL (Aiven, TLS)
```

---

## 2. `server/_core/` — суурь давхарга (домэйн мэдлэггүй)

| Файл | Юу хийдэг | Мэдэх ёстой нарийн зүйл |
|---|---|---|
| `index.ts` | процессын эхлэл (§1) | ажлын бүртгэл, dispatcher энд эхэлдэг |
| `context.ts` | tRPC контекст: cookie → user | `assertProductionSecrets()` энд (2026-09-20: `JWT_SECRET` + `DATABASE_URL` шатна, `INTEGRATIONS_ENCRYPTION_KEY`/`S3_*`/`PUBLIC_BASE_URL`/`OWNER_EMAIL` warning); session token JWT. User мөр **5 с cache** (`getSessionUserById`, түлхүүр = user id, token БИШ) — session-ийн эрхийг өөрчилдөг бичигч бүр `forgetSessionUser` дуудна (§8 дүрэм 10) |
| `trpc.ts` | procedure-ийн төрлүүд (**panel builder бүр face proof шаардана**) + **`errorFormatter`** (2026-09-20: production-д INTERNAL / driver-хэлбэртэй мессежийг `INTERNAL_ERR_MSG`-ээр маскална — `maskErrorShape`) | `publicProcedure`, `protectedProcedure`, `adminProcedure`, `financeProcedure`, `staffProcedure`, **`inventoryProcedure`** (admin+warehouse+staff), rate-limit tier: `strict` 8 (бүртгэл/сэргээх/царай), **`login` 20 + данс тус бүрийн lockout 10/15мин** (`countRecentFailedLoginAttempts`), **`checkout` 20**, `phoneVerify` 3, `moderate` 30, `lenient` 600. Эрхийн шалгалт бүхэлдээ ЭНД, дэд router-үүд өөрсдөө эрх шалгадаггүй |
| `faceProof.ts` | admin царайны proof cookie **+ нууц үгийн step-up cookie** (`sugi_admin_pw`, 2026-09-22) | таб тус бүр (`x-admin-tab`), 8 цагийн дээд хугацаа, идэвхгүй цонх нь **токен дотроо** явдаг (`idle` claim) тул handoff-ийн 10 минут heartbeat-аар уртсахгүй. Нууц үгийн step-up нь **нэг удаагийн** (10 мин, `/login` тооцогдохгүй, амжилттай царай түүнийг "зарцуулна" — царай асуух бүрт нууц үг түрүүлнэ). Токен бүр `typ` (`session`/`face`/`reauth`) — уншигч бүр бусдынхыг татгалзана. Mint хийхэд жинхэнэ таб id заавал |
| `clusterRole.ts` | олон процессын үед хэн ард ажиллах ажлуудыг эзэмшихийг шийднэ | pm2 cluster горимд ЗӨВХӨН instance 0; `RUN_BACKGROUND_JOBS=0/1` дардаг. Үгүй бол орхигдсон сагсны сануулга, вендорын таталт N дахин явна |
| `security.ts` | header, rate limit tier, CSRF | `limitApiTraffic` (IP тутам **1200**/15мин — 2026-09-20-нд 300-аас өсгөв: CGNAT/оффисын нэг IP-ийн ард олон хэрэглэгч, мөн telemetry tier дангаараа 600 зөвшөөрдөг байсан зөрчил), `protectStateChangingApiRequests`, `limitQPayCallbackTraffic` |
| `scannerProbes.ts` | `.env`/`.git`/`*.php`/CMS-ийн сканнер probe → шууд 404; IP тутам 1 ц/5 probe → 403 ban | loopback/private хаяг хэзээ ч ban болохгүй (proxy-ийн ард бүгд нэг IP болох эрсдэл); `isScannerProbe` цэвэр, 2 жагсаалтаар тестлэгдсэн |
| `requestLog.ts` | `LOG_REQUESTS=1` үед access-log мөр | dependency-гүй; dev-д Vite-ийн модулиуд алгасагдана. `LOG_SQL=1` нь `sqlQueryLog.ts`-д |
| `persistentRateLimit.ts` | strict tier-ийн тоолуур **DB дээр** (`rate_limit_buckets`) | олон instance-д ч хүчинтэй, **fail-open** (DB унавал блоклохгүй). Cart/telemetry tier нь санаатайгаар санах ойд |
| `dbConnection.ts` | `planMysqlConnection` — TLS төлөвлөгөө | loopback-оос бусад бүх host-д TLS; `DATABASE_CA_CERT` байвал сертификат шалгана, байхгүй бол шифрлээд warning |
| `faceProof.ts` | админы царайны **proof cookie** (sign/read/refresh/clear) + `assertFaceProofForPanelRole` + **`issueReauthProof`/`assertReauthProof`** (нууц үгийн алхам) | Домэйнгүй тул `trpc.ts` бүх panel procedure дээр ажиллуулна. `abs`- эсвэл `typ`-гүй token хүчингүй. `faceAuth.ts` эндээс re-export хийдэг |
| `crypto.ts` | AES-GCM шифрлэлт | `INTEGRATIONS_ENCRYPTION_KEY` (64 hex) шаардана, байхгүй бол шатна — интеграцийн нууц үг энүүгээр хадгалагдана |
| `password.ts` | `hashPassword` / `verifyPassword` | |
| `cookies.ts` | session cookie-ийн тохиргоо | |
| `ttlCache.ts` | процессын доторх TTL cache | `getOrSetCached`, **`invalidateCached`**. `invalidatedAt` тэмдэг: invalidation-оос ӨМНӨ тооцоолж эхэлсэн үр дүнг хадгалахгүй (write-ийн дундуур явж байсан read хуучин утгыг 30 с "царцаадаг" race). Storefront контент (`STOREFRONT_CACHE_KEYS`, 30 с) + session user (5 с) энд |
| `scheduler.ts` | цорын ганц job хуваарь | нэг `setInterval`, `scheduled_job_runs` хүснэгтээр `lastRunAt`-ыг хардаг. Cron парсер байхгүй |
| `notification.ts` | имэйл илгээх (Brevo) | `deliverEmail` нь **хэзээ ч throw хийхгүй** — үр дүнг буцаана. `notifyOwner`, `sendAccountEmail` |
| `ntfy.ts` | утасны push (ntfy.sh) | JSON POST (кирилл header найдваргүй), 5с timeout, ~3.8KB тайралт, хэзээ ч throw хийхгүй |
| `storageProxy.ts` | `/cdn/*` → R2 | `isSafeStorageKey` (`..`, `\`, хоосон сегмент → 404), `NON_PUBLIC_KEY_PREFIXES` (`applications/`, `inventory/receipts/`) — тэдгээр нь хувийн bucket-д (`storagePutPrivate`) |
| `safeHttp.ts` | гадагш HTTP-ийн SSRF хамгаалалт (2026-10-01) | `safeRequest` (lookup-ийн дараах хувийн IP, IP literal, redirect, байт, deadline), `readBodyWithLimit`; дүрэм нь `shared/ip-address.ts` |
| `trpcBatchGuard.ts` | `/api/trpc` замын хамгаалалт | нэмэлт `/` сегмент → 404, admin./inventory. холилдсон batch → 400 |
| `faceReplay.ts` / `facebookLinkIntent.ts` | царайн descriptor replay; Facebook холбох intent cookie (`typ: fb-link`, 10 мин) | |
| `mapLimit.ts` | concurrency хязгаартай map | push илгээлт (4) |
| `imageProcessing.ts` / `imageUpload.ts` | sharp-аар хувиргалт, upload-ийн шалгалт | |
| `sanitizeHtml.ts` | админы HTML контентыг цэвэрлэх | |
| `honeybadger.ts` / `honeybadgerReadApi.ts` | алдааны хяналт | түлхүүргүй бол чимээгүй no-op |
| `sqlQueryLog.ts` | Drizzle Logger → ring buffer | админы SQL лог самбар үүнээс уншина |
| `indexHtml.ts` | SSR-гүй HTML бэлтгэх (SEO мета, салбарууд, `#storefront-bootstrap` JSON: site media + site text + promo, 60 с кэш) | `getStorefrontBranches`-ийг ашиглана (агуулах харагдахгүй) |
| `publicUrl.ts` | `publicOrigin`/`absoluteUrl` + **`directStorageUrl`/`storageKeyOf`** (2026-09-21): `/cdn/<key>` → R2-ийн шууд хаяг, storefront-ийн эхний render (preload/shell/bootstrap) ба `content.siteMedia`-д — 302-ын RTT hero-ийн замаас хасагдана; DB `/cdn/` хэвээр | admin-ий siteMedia `/cdn/` хэвээр (зориуд) |
| `heroShell.ts` | Нүүрний promo/толгой/hero-г React-ээс ӨМНӨ статик HTML-ээр `#root`-ын ӨМНӨ (2026-09-21, зөвхөн `/`); `aria-hidden` + `inert` (2026-09-22) | ⚠️ Markup React-ийн `CommerceHeader`/`HeroSection`/`HeroImageSlideshow`/`SitePromo`-той ИЖИЛ class, ИЖИЛ байрлал байх ёстой — `e2e/hero-shell.spec.ts`; `HERO_SHELL=0` унтраана. `client/src/main.tsx` React-ийг hero зурагдтал (≤1.2 с) хүлээж, анхны товч/хүрэлт дээр шууд mount хийгээд товшилтыг React-ийн ижил элемент рүү дамжуулна |
| `routeStatus.ts` | HTML хүсэлтийн HTTP статус (2026-09-21): статик route + бараа/routine/нийтлэлийн slug → 200, бусад → 404 (soft 404 арилав). `vite.ts`-ийн dev ба production хоёр handler | `STATIC_ROUTES` нь `App.tsx`-тэй ИЖИЛ байх ёстой — `route-status.test.ts` шалгана; lookup унавал 200 |
| `imagePreload.ts` | `<link rel=preload as=image>` — `<img>`-тэй ижил srcset/sizes, AVIF R2-д байгаа үед л (`hasAvif`, 10 мин кэш) | hero ба барааны хуудас хоёулаа |
| `vite.ts` | dev middleware / production static | |
| `env.ts` | бүх орчны хувьсагчийн нэг цэг | `notificationsDispatchEnabled`, `notificationsSuppressed`, `publicBaseUrl`, `adminFaceGateEnabled` … |

---

## 3. `server/` — домэйн модулиуд

### 3.1 `db.ts` → `db/*.ts` (2026-09-21) — өгөгдлийн үндсэн давхарга

> **2026-09-21: нэг 7 066 мөрийн файл 21 домэйн модуль болов.** `server/db.ts` нь одоо зөвхөн
> barrel (`export * from "./db/…"`) тул 91 файлын `import { … } from "./db"` хэвээр; функц
> хайхдаа доорх хүснэгтээр файлаа ол, шинэ функцийг тохирох файлд нь нэм. Модулиуд бие
> биенээсээ шууд import хийдэг (`./connection`, `./site` …); тойрог import байгаа ч бүгд
> функцийн дуудлага тул аюулгүй — **модулийн түвшинд** (top-level const) хажуугийн модулийн
> утга ашиглахгүй. Хуваалтыг `scratchpad/split-db.mjs` (TypeScript AST) хийсэн, зан төлөв
> өөрчлөгдөөгүй (vitest бүтэн + E2E бүтэн).

| Файл | Юу байдаг |
|---|---|
| `connection.ts` | `getDb`/`dbPing`, pool, **`settledSaleSql`/`refundOwedSql`**, захиалгын дугаар, duplicate-key шалгалт |
| `users.ts` | хэрэглэгч, session (`getSessionUserById`/`forgetSessionUser`), хаяг, хүслийн жагсаалт, утасны баталгаажуулалт/бүртгэл, Facebook |
| `catalog.ts` | storefront каталог: хуудас, кэш, FULLTEXT fallback, `getRecommendedProducts`, `getRelatedProducts`, `getBestsellingProducts`, slug/sku |
| `cart-orders.ts` | сагс, **`createOrderFromActiveCart`** (системийн зүрх), `recordInStoreSale` (POS), `searchVariantsForBranch` |
| `routines-promotions.ts` | routine + зарын урамшуулал |
| `customer-orders.ts` | харилцагчийн захиалга: жагсаалт, `cancelOwnOrder` |
| `reviews.ts` | сэтгэгдэл/хариулт/like, moderation, `getReviewEligibility` |
| `payments.ts` | QPay/StorePay оролдлого (`markQPayPaymentAttemptPaid` provider-аас хамааралгүй) |
| `admin-orders.ts` | admin бараа/захиалгын жагсаалт, самбар, global search, `decrementBranchStock`/`restoreStockForOrder`, `updateAdminOrder`, гар захиалга, `refundOrder`, `deleteAdminOrder`, хянах |
| `posts.ts` | нийтлэл, ангилал/tag, медиа сан |
| `site.ts` | онцлох брэнд, салбар, **storefront кэш (`STOREFRONT_CACHE_KEYS`, `invalidateStorefront`)**, site media/text/documents, ажлын байр/анкет, гишүүнчлэлийн зэрэглэл |
| `ops.ts` | public ангилал, дэлгүүрийн тохиргоо, хуваарьт ажил, орхигдсон сагс, дэлгүүрийн зээл, маркетингийн зардал, зочны session, аудит, нэвтрэлтийн оролдлого |
| `admin-catalog.ts` | admin ангилал/бараа бичих, зөрчил шалгах, `syncSoleVariantFromProduct` |
| `customers.ts` | admin хэрэглэгч, кампанит илгээлтийн хүлээн авагч, гишүүнчлэлийн төлөв/хямдрал, түр хаах, эрх, утас |
| `discounts.ts` | хямдралын код |
| `integrations.ts` | интеграцийн тохиргоо (шифрлэгдсэн, merge семантик) |
| `notifications.ts` | мэдэгдлийн outbox/feed, push subscription |
| `variants.ts` | variant, салбарын нөөц (`setBranchStock`), ledger унших |
| `face.ts` | admin царай: enrollment (**шифрлэгдсэн**, `enc1:` AES-GCM, хуучин plaintext мөр амжилттай шалгалтын дараа шифрлэгдэнэ)/challenge (24 ц retention)/attempt, `countRecentFailedFaceAttempts` (данс тус бүрийн lockout) |
| `questions.ts` | асуулт/хариулт |
| `gift-cards.ts` | бэлгийн карт (үүсгэх, хүчингүй, redeem) |
| `order-events.ts` | (2026-10-05, 0101) захиалгын үйл явдлын append-only бүртгэл: `recordOrderEvent` (захиалга бичдэг 10 функц (13 дуудлагын цэг) ижил tx-д дуудна; актор customer/staff/job/webhook/system), `getOrderTrail` (event + ledger + төлбөр + outbox + аудит → `shared/process-timeline.ts` `mergeTimeline`), `getProcessOverview`/`getStageOrders`/`getAuditFeed` — /admin → Процесс |
| `themes.ts` | (2026-10-05, 0103–0105) Брэнд студи: `getThemeRows` (30 с кэш), `getActiveThemeBundle(dateKey, previewKey?)` (суурь + идэвхтэй баяр → look/greeting/poster), `saveTheme` (FOR UPDATE, өмнөх төлөв `site_theme_versions`-д, 30 хувилбар), `listThemeVersions`, `rollbackTheme`. HTML кэшийг роутер цэвэрлэнэ (тойрог import) |
| `layouts.ts` | (2026-10-05, 0105) нүүрний хэсгүүдийн дараалал: `getHomeLayout` (30 с кэш, мөргүй бол `DEFAULT_HOME_LAYOUT`), `saveHomeLayout` (`sanitizeHomeLayout`, upsert) — Брэнд студи → Нүүрний бүтэц |
| `price-campaigns.ts` | (2026-09-29, 0098) бүх барааны нийтийн хямдрал: `withLiveCampaign`/`priceLinesForOrder` (кэшээс уншсаны ДАРАА), admin CRUD, урьдчилан харах. Дүрэм `shared/price-campaign.ts` |


> 2026-09-20: `getSiteTextValue(slot)` / `getSiteName()` — баримт PDF, имэйл, тайлан, төлбөрийн тайлбар зэрэг **серверээс гардаг бүх брэндийн нэр** эндээс уншина (өмнө нь кодод хатуу бичигдсэн байв).
Бүх бизнес query энд. Гол бүлгүүд:

- **Хэрэглэгч/auth**: `createUserWithPassword` (⚠️ хамгийн эхний хэрэглэгч эсвэл `OWNER_EMAIL`-тэй таарвал л admin болно), `findUserByPhone`, session, нууц үг сэргээх, `recordLoginAttempt`.
- **Каталог**: бүтээгдэхүүн/variant/ангилал/брэнд, FULLTEXT хайлт, `getBestsellingProducts` (бодит борлуулалт дуусмагц featured брэндээр дүүргэдэг), `getRecommendedProducts`.
- **Сагс/checkout**: `createOrderFromActiveCart` — энэ функц бол **системийн зүрх**. Хямдралын дараалал: routine → coupon → loyalty → дараа нь дэлгүүрийн зээл (мөнгөтэй адил, хамгийн сүүлд). Нөөцийг `WHERE stockQuantity >= ?` + `affectedRows` шалгалтаар атомикоор хасна; захиалгын дугаар давхцвал 3 хүртэл дахин оролдоно.
- **Idempotency** (2026-09-12): `orders.clientRequestId` (unique) — checkout болон POS (`recordInStoreSale`) хоёулаа browser-ийн UUID авч, ижил түлхүүрт ижил захиалга буцаана (`replayed:true`). `findOrderForClientRequest(db, key, expectedUserId)` эхэнд + `orders_client_request_unique` dup-key дээр (race-ийн алдагч). `findRecentCampaignSend(fingerprint, minutes)` — кампанит ажлын давхар илгээлтийн хамгаалалт (audit log дээр).
- **Захиалгын буцалт**: `updateAdminOrder`, `cancelOwnOrder`, `refundOrder`, `reverseStoreCreditForOrder`. **`settledSaleSql`** (`paid AND status<>'cancelled'`) — орлого гэж юуг тооцохын ЦОРЫН ГАНЦ тодорхойлолт (db.ts 8 газар, analytics.ts 17 газар).
- **Төлбөрийн оролдлого**: `createQPayPaymentAttempt`, `createStorepayPaymentAttempt`, `markQPayPaymentAttemptPaid` (нэр нь түүхэн — **provider-аас хамааралгүй**: хаагдсан/цуцлагдсан захиалгыг сэргээхээс татгалздаг хамгаалалт нь QPay, StorePay хоёуланд хүчинтэй).
- **Салбар/нөөц**: `getStorefrontBranches` (зөвхөн `kind='store'`), `setBranchStock`, `setFulfillmentBranchStock`, `deleteBranch`-ийн хамгаалалт.
- **Интеграц**: `getAdminIntegrations` (талбар бүрийн `isSet`, secret хэзээ ч буцахгүй), `getIntegrationSettings`, `getActiveIntegrationConfig`, `updateAdminIntegration` (**merge** семантик).
- **Мэдэгдэл**: `recordNotification`, `getNotificationFeed`, `markNotificationsSeen`, `purgeNotificationOutbox`.
- **Ledger унших**: `getStockMovementsForVariant`, `getStockLedgerHealth` (drift).

### 3.2 `routers.ts` (~3,800 мөр) — API-ийн гадаргуу
`appRouter` = 16 нэрийн зай: `auth`, `catalog`, `loyalty`, `routines`, `promotions`, `reviews`, `content`, `cart`, `checkout`, `telemetry`, `orders`, `profile`, `payments`, `faceAuth`, `admin`, + дэд router `notifications` (`notificationsRouter.ts`), `inventory` (`inventoryRouter.ts`).

🔴 **zod 4 урхи**: `.partial()` дотор `.default()` ХЭРЭГЖДЭГ. Update schema бүр `partialForUpdate()`-ийг ашиглах ёстой — эс бөгөөс илгээгээгүй талбар create-ийн анхдагчаар дарагдана (2026-09-11-нд бодит үндсэн салбарыг хэдэн минут алга болгосон).

### 3.3 Нөөцийн гинж (хамгийн чухал инвариант)

```
аливаа нөөцийн өөрчлөлт
   └─ server/stockLedger.ts   applyBranchStockDelta / setBranchStockAbsolute / recordStockMovement
        ├─ branch_stock (тавиурын тоо)          ┐ НЭГ transaction дотор
        ├─ stock_movements (өөрчлөлт бүрийн мөр) ┘
        ├─ recomputeVariantStockTotal  → зөвхөн countsTowardOnlineStock салбаруудыг нэмнэ = онлайн нөөц
        └─ stock alert (shared/stock-alerts.ts: зөвхөн ДООШОО огтлох үед)
```

⚠️ **`branch_stock`-д шууд бичих код бичиж болохгүй.** Бичвэл Системийн байдал дээр drift гарна (`scripts/stock-ledger-rebaseline.ts --apply` засна).

| Файл | Хариуцах зүйл |
|---|---|
| `stockLedger.ts` | дээрх helper-үүд, `StockShortageError`, `getStockLedgerDrift` |
| `inventory.ts` | хүлээн авалт (`stock_receipts`), тооллого (`stock_counts`), `resolveCodes` (баркод → variant), `getSkuIndex` (937 мөрийг нэг удаа), `assertCanOperateOnBranch` (staff зөвхөн өөрийн салбар), **`createSnapshotCount`** (Smart POS-ын үлдэгдлээс батлах тооллого) |
| `transfers.ts` | агуулах→дэлгүүр шилжүүлэг: draft → sent (`transfer_out`) → blind скан → received (`transfer_in`), зөрүүг admin шийднэ |
| `inventoryRouter.ts` | дээрхийн tRPC гадаргуу (`inventoryProcedure`) |

**Тооллогын дельта** = тоолсон − *анх скан хийсэн үеийн* систем тоо. Ингэснээр тооллогын явцад гарсан борлуулалт алдагдахгүй. `scope:"full"` нь уншуулаагүй барааг 0 болгоно, `"partial"` болгохгүй.

### 3.4 Мэдэгдлийн гинж

```
бизнес код (transaction дотор) → enqueueNotification/recordNotification → notification_outbox
   → server/notifications.ts dispatcher (60с тутам)
       → guarded claim: UPDATE … WHERE status='pending' + affectedRows
       → _core/ntfy.ts → ntfy.sh
       → амжилтгүй бол 1м / 5м / 30м, 5 оролдлого; 2 цагаас хойш expired
```

- Бүлэг: `admin`, `warehouse`, `finance`, `store` (`staff` = дэлгүүрийн зөвлөх).
- **Мессежид харилцагчийн нэр/утас/хаяг ХЭЗЭЭ Ч ОРОХГҮЙ** — `shared/notification-events.ts`-ийн payload төрөл нь ийм талбаргүй тул компилятор өөрөө хамгаална.
- **Dedupe түлхүүр төрлөөр namespace хийгдсэн** (`outboxDedupeKey`): нэг захиалгын "шинэ"/"төлөгдсөн"/"цуцлагдсан" бүгд `order:<id>` ашигладаг тул namespace-гүй бол unique index тэднийг залгина.
- `NOTIFICATIONS_DISPATCH=1` тохируулсан машин л илгээнэ; тестэд `NOTIFICATIONS_SUPPRESS=1`.

### 3.5 Төлбөр

| Файл | Урсгал |
|---|---|
| `qpay.ts` | Basic auth → `/v2/auth/token` → `/v2/invoice` → харилцагч төлнө → callback (`POST`/`GET`, **`"SUCCESS"` биетээр хариулна**) → `checkQPayPayment`-ээр **бид өөрсдөө шалгана** → `decideCallbackOutcome` (дутуу төлбөрийг хэзээ ч баталгаажуулахгүй) |
| `storepay.ts` | 2 хос credential (query дээр app хос, Basic-д үндсэн хос) → `/user/possibleAmount` (checkout дээр сонгомогц боломжит дүнг асууна) → `/merchant/loan` → харилцагч StorePay апп дээрээ зөвшөөрнө → callback → `/merchant/loan/check/{id}`-ээр бид өөрсдөө шалгана. ⚠️ **HTTP 200 = амжилт биш**: `status` талбарыг шалгана (`readStorepayEnvelope`) |

Хоёулаа: **callback-ийн биед хэзээ ч итгэхгүй** — тэр зөвхөн "аль гүйлгээг шалгах вэ" гэдгийг л хэлнэ.

**Бэлгийн карт (2026-09-14)**: `products.kind='gift_card'` бараа = цахим мөр. `shared/gift-cards.ts` (`isGiftCardLine`, `isDigitalOnlyBasket`, `discountableSubtotalMnt`) — checkout preview (client) ба `createOrderFromActiveCart` хоёулаа: нөөц хасахгүй, зөвхөн карттай сагс хүргэлтгүй/салбаргүй, хямдрал physical мөрөнд л. Захиалга **paid болох гурван цэг** (`markQPayPaymentAttemptPaid`, `updateAdminOrder` completed, `recordInStoreSale`) бүгд `issueGiftCardsForPaidOrder` дуудна (idempotent: `gift_cards.purchaseOrderId`); cancel/refund → `voidGiftCardsForOrder`. Код хүргэлт `server/giftCardFulfilment.ts` (push+имэйл, db.ts-ээс dynamic import). **Шинээр "paid" бичдэг зам нэмбэл заавал issue дуудна.**

### 3.6 Интеграцууд (`server/integrations/`)

- **`inventorySync.ts`** — вендороос хамааралгүй "гэрээ" + бүртгэл. Урсгалууд: `push` (манай хөдөлгөөн → вендор, 2 минутын хоцролт, `refType='external'` эргэж явахгүй), `sales` (вендорын борлуулалт → манай ledger, `external_refs`-ээр нэг удаа), **`snapshot`** (вендорын үлдэгдэл → **батлах хүлээсэн тооллого**, нөөц хэзээ ч шууд бичигдэхгүй). Бүх функц `SyncOptions {namespace, lagSeconds}` авдаг тул тест бодит cursor-ыг хөндөхгүй.
- **`vendorCatalog.ts`** (2026-09-15) — вендорын **үнэ, хөнгөлөлт, найрлага/заавар/анхааруулга**-г зөрүүний жагсаалт болгож, зөвхөн сонгосон баркодыг бичнэ. Клиент утга илгээхгүй (сервер дахин татна); үнэ хоёр хүснэгтэд, факт нь `factsSource="admin"` барааг хөндөхгүй.
- **`smartSoftware.ts`** — бодит adapter. OAuth2 password grant; `fetch` БИШ `node:http(s)` (баримтын token дуудлага GET дээр body явуулдаг); token cache; `listLocations`, `pullStockSnapshot`. Вендорын POS API-д **борлуулалтын жагсаалт байхгүй** тул `pullSales` хэрэгждэггүй — шударгаар тэмдэглэсэн.

### 3.7 Хайлт (`server/search/`, 2026-09-20)
Процесс доторх MiniSearch индекс — MySQL FULLTEXT-ийг орлоно (typo, латин↔кирилл галиг, синоним, шинэ бараа шууд).
- **`catalogSearchIndex.ts`** — ЦЭВЭР: мөр + толь + alias → индекс (`buildCatalogIndex`), индекс + query → id-ууд (`runCatalogSearch`: strict AND-of-OR → broad OR → баркод; брэнд/ангиллын илрүүлэлт; did-you-mean). Индекс-үеийн баяжуулалт: латин нэр/брэндийн кирилл галиг, кирилл тайлбарын латин галиг, `xc<concept>` ойлголтын токен, admin `searchKeywords`.
- **`catalogSearch.ts`** — ttlCache glue (`storefront:catalogIndex`, 60 с, single-flight), каталогийн кэшээс hydrate, boot-ийн warm-up, `SEARCH_ENGINE=fulltext` буцаах env.
- **`dictionaries.ts`** — `search_synonyms` / `brand_aliases` хүснэгтээс толь (хоосон бол кодын seed), admin CRUD, `seedSearchDictionaries`, `canonicaliseBrandName` (бараа бичих бүрт брэндийг canonical руу).
- **`searchAnalytics.ts`** — `search_queries` лог (fire-and-forget, 60 с dedupe, visitorHash = keyed sha256, PII-гүй), `getSearchInsights`, `purgeSearchQueries` (90 хоног, data-retention job).
- **`cacheKeys.ts`** — импортгүй түлхүүрүүд (db.ts ↔ search/ тойрог үүсгэхгүй). `db.ts`-ийн `invalidateCatalogSource()` каталог + индекс хоёуланг унагаана — бараа/ангилал бичигч бүр дуудна.
Шаардлагатай `shared/`: `search-synonyms.ts` (`buildSynonymDictionary`), `transliterate.ts` (латин→кирилл), `brand-aliases.ts`, `product-name.ts` (монгол/латин нэрийн харагдац, `catalog-name-display` setting), `product-types.ts`.

### 3.8 Бусад
`analytics.ts` (29 экспорт: борлуулалт, дүүрэг, ашиг, CAC, хөрвүүлэлт, буцаалтын хувь, Excel/PDF export), `faceAuth.ts` (админы царайны хаалга — урсгал **нууц үг → царай → admin** (2026-09-22); proof cookie 2 deadline-тай: sliding idle 25 мин `exp` + absolute 8 ц `abs`; `refreshFaceProof` зөвхөн бодит оролтын heartbeat-аар, `lockFaceSession` → `face_attempts.idle_locked`; challenge үргэлж `blink`, liveness анхдагчаар блоклоно; 5 бүтэлгүйтэл/15 мин → данс түгжинэ; клиент рүү `distance` БУЦААХГҮЙ; descriptor л сервер рүү ирнэ, гадны API байхгүй), `verifyMn.ts` (SMS баталгаажуулалт), `storage.ts` (S3/R2), `automation.ts` (доорх §7), `notificationOutbox.ts`, `notificationsRouter.ts`, `catalog-validation.ts`, `commerce-lifecycle.ts`.

---

## 4. `shared/` — хоёр талын нэг эх сурвалж

> 2026-09-20: `delivery.ts`-д `freeShippingProgress()` нэмэгдэв — сагс/захиалгын хураангуйн "үнэгүй хүргэлтэд X дутуу" мөр `computeDeliveryFeeMnt`-тэй ИЖИЛ босго, ижил дүнг уншина (хоёр дахь томьёо бичихгүй). `help-faq.ts` нь эзэнд хамаарах утга (утас, брэнд) агуулахаа больсон.

| Файл | Юу |
|---|---|
| `notification-events.ts` | үйл явдал → бүлэг/priority/tag, Монгол мессеж, **PII-гүй payload төрлүүд**, `ubDateKey` |
| `integrations.ts` | provider-ийн жагсаалт + талбарын тодорхойлолт (`INTEGRATION_META`), `validateIntegrationSettings`, `mergeIntegrationSettings` |
| `stock-alerts.ts` | `classifyStockCrossing` — зөвхөн доошоо огтлоход л alert |
| `stock-movements.ts` / `scan-session.ts` / `transfer-reconcile.ts` | хөдөлгөөний Монгол нэр, сканы reducer, шилжүүлгийн тулгалт |
| `barcode.ts` | `normaliseBarcode` (сканнерын tab/CR, зай, зураас), `createScanBuffer` (50мс түлхүүрийн зайгаар сканнерыг хүнээс ялгана) |
| `catalog-filter.ts`, `search-synonyms.ts`, `product-tagging.ts` | хайлт/шүүлт/таг |
| `site-text.ts`, `site-media.ts`, `store-settings.ts`, `legal-documents.ts`, `admin-tips.ts` | админаар засварлагддаг бүх текст/зураг/тохиргоо. `site-media.ts`-д slot нэмэхэд /admin → Content & Media дээр байршуулах карт **автоматаар** гарна (`ContentMediaPanel` бүртгэлийг тойрдог). Сайтын лого нь `brand-logo`/`brand-symbol` slot (2026-09-17) — компонентууд `useBrandMedia()`-аар уншина; site media бүхэлдээ (`useSiteMedia()`), site text, promo нь `indexHtml.ts`-ийн `#storefront-bootstrap` JSON блокоос (`client/src/lib/bootstrap.ts`, 2026-09-21) react-query `initialData` болж ирдэг тул эхний render бодит утгатай, анивчихгүй. ⚠️ Хөтчийн таб/утасны дүрс (`client/public/icons/*.png`) нь энэ slot-оос ХАМААРАХГҮЙ, гараар солино |
| `delivery.ts`, `districts.ts`, `orders.ts`, `loyalty.ts`, `format.ts`, `slugify.ts` | нэг мөр бизнес дүрэм тус бүр |
| `mobile.ts` | `normaliseMongolianMobile` — checkout StorePay-ийн хариуг бичсэн дугаартай тулгадаг тул хоёр тал ижил дүрэмтэй байх ёстой |
| `face-auth.ts` | descriptor-ийн зай тооцоолол (браузер+сервер ижил) |
| `i18n.ts` | Сайтын өөрийн үгс (mn/en/ja). Түлхүүр нь монгол өгүүлбэр өөрөө; гэхдээ **гурвуулангаараа индекслэгддэг** тул аль ч хэлнээс аль ч хэл рүү орчуулна (хуудас солигдсоны дараа ч). Түлхүүрт `{placeholder}` байвал pattern болно |
| `product-i18n.ts` | Барааны тайлбар (DB-д монголоор) → en/ja. 2 template + барааны төрөл/найрлагын толь + өгүүлбэрийн толь. Брэнд/нэрийг маскдаж хайна |

---

## 5. `client/src/`

> 2026-09-21: зургийг `components/ResponsivePicture.tsx`-ээр (AVIF → WebP + srcset, AVIF байхгүй бол onError-оор WebP); admin-ий upload бүр `lib/prepareImageUpload.ts`-ээр (хөтөч дээр шахалт, хэлбэрийн сануулга) ба хажууд нь `components/admin/UploadTips.tsx` (агуулга `shared/upload-tips.ts`).

- **`App.tsx`** — wouter route + нэг MutationObserver/IntersectionObserver (scroll reveal) бүх route-д.
- **`pages/`** — Home, Shop, ProductDetail, Checkout, Profile (914 мөр: хаягийн дэвтэр, тохиргоо, аюулгүй байдал), Login, ForgotPassword, MyOrders, TrackOrder, Journal/PostDetail, RoutineDetail, Brands, Legal, NotFound, **AdminDashboard** (→ `AdminWorkspace`).
- **`components/`**
  - Дэлгүүрийн нүүр: `home/*` (HeroImageSlideshow, KeywordChips, CarouselShelf + product/ProductCard, CategoryMasonry + CategoryRail, FeaturedBrandsCarousel, BrandStorySection, QuickStatsSection, EditorialBanner, StoreLocatorSection). 2026-09-12-нээс нүүрний харагдах байдал нь `client/src/index.css`-ийн ТӨГСГӨЛД байрлах "COSME KITCHEN RESTYLE" давхаргаар тодорхойлогдоно — хэсгийн CSS засахдаа тэр давхаргад мөн шалгах (эс бөгөөс засвар дарагдана). Admin-ий CSS (design system) 2026-09-21-ээс `client/src/admin.css`-д — `AdminDashboard.tsx` import хийдэг, storefront татдаггүй. Царайны хаалга/нууц үгийн алхам/QR-ийн CSS 2026-09-22-оос `client/src/face.css`-д — `AdminDashboard.tsx` БА утасны `FaceApprove.tsx` хоёулаа import хийнэ (өмнө нь утасны хуудас загваргүй байв). Нууц үгийн алхам: `components/admin/AdminPasswordStep.tsx`. Rail-ийн карт нь `product/ProductCard` (shelf), ProductDetail мөн ашигладаг.
  - Админ: `AdminWorkspace.tsx` (816 мөр — хэсгүүдийн router), `admin/AdminSidebar.tsx`, `admin/AdminTopBar.tsx`, `admin/AdminNotificationBell.tsx`, `admin/AdminCommandPalette.tsx`, `admin/GenericListView.tsx`, панель бүр (`AdminProductsPanel`, `AdminOrdersPanel`, `AdminIntegrationsPanel`, `AdminReceivingPanel`, `AdminAnalyticsPanel`, `AdminSecurityCenter`, `AdminPosPanel` …).
  - Нөөц: `inventory/ScanSession.tsx` (сканы дэлгэц), `inventory/TransfersView.tsx`.
  - `ui/*` — shadcn маягийн суурь элементүүд.
  - **Storefront шинэчлэл (2026-10-18)**: `product/*` (ProductCard — бүх барааны карт, PriceBlock, StarRating, WishlistToggle, QuantityStepper), `uitripled/*` (UI TripleD-ээс өөрчилж зөөсөн: ShopPagination, ProductGallery, ProductInfoTabs, ProgressBar, PasswordInput), `motion/*` (LazyMotion), `ui/button.tsx` (cva → `.button` гэр бүл), `ui/badge.tsx`. CSS: `client/src/styles/` (storefront.css + routes/*.css). Хуучин `home/ShelfProductCard`, `RailProductCard` устсан.
- **`components/ConfirmDialog.tsx`** (2026-09-21) — `ConfirmProvider` (App.tsx) + `useConfirm()` → `{ confirm, prompt }` (async), window.confirm-ийн оронд; `data-testid="confirm-dialog"`. **`hooks/useFieldErrors.tsx`** — маягтын алдааг талбар дээр нь (`fieldProps`/`FieldError`/`showErrors`), Checkout/Login/ForgotPassword/TrackOrder/анкет.
- **`components/ReviewPhotoPicker.tsx`** (2026-09-21, 0093) — сэтгэгдлийн маягтад нэг зураг: `prepareImageUpload`-аар багасгаад `reviews.uploadImage` (эрх → гарын үсэг → nudity screen → WebP/600w/AVIF `reviews/<userId>/`), `reviews.create` зөвхөн өөрийн `reviews/<userId>/` URL-ийг хүлээнэ; `ReviewThread` thumbnail → `ImageLightbox`; admin "Зураг хасах" = `admin.updateReview({ imageUrl: null })`.
- **`lib/bootstrap.ts`** (2026-09-21) — `#storefront-bootstrap` JSON блокоос нэг удаа уншиж `bootstrapSlice(key)` өгнө (`…At` талбар Date болно); `hooks/useSiteMedia.ts`, `hooks/useSiteText.ts`, `SitePromo.tsx` үүгээр `initialData` авдаг. `lib/lazyRetry.ts` — props-той компонентод ч (`lazyRetry<P>`).
- **`hooks/`** — `useScrollToTopOnNavigate` (Router-т: forward navigation 0-ээс, back/forward-д хүрэхгүй), `useBarcodeScanner` (⚠️ input дээр focus байхад зогсдог), `useScanDraft` (localStorage + 700мс сервер рүү хадгалалт), `useSiteText`, `useStoreSetting`, `useScrollReveal`, `useCategories`, `usePersistFn`, `useShopContact`. (2026-09-20-нд `useMobile`, `useComposition` хоёрыг устгав — хэн ч импортлодоггүй байсан.)
- **`lib/`** — `scroll.ts` (`scrollToNow` — global smooth rule-ийг override хийсэн instant scroll; яг тодорхой газар буух бүх scroll үүгээр), `trpc.ts` (client), `faceEngine.ts`, `pageviewTracking.ts`, `trafficSource.ts`, `cookieConsent.ts`, `csv.ts`, `adminTheme.ts`, `scanSounds.ts` …

**Шинэ админ хэсэг нэмэх** = 6 газар: `AdminSection` union, `adminSectionKeys`, `SECTION_ROLES`, 3 гарчгийн ternary, `shared/admin-tips.ts`, `server/admin-tips.test.ts`.

---

## 6. Өгөгдлийн сан — 70+ хүснэгт (2026-10-05: + `order_events` (0101), `job_runs` (0102); 2026-09-20: + `searchSynonyms`, `brandAliases`, `searchQueries`; `products` + `nameMn`/`searchKeywords`/`productType`/`skinTypes`/`bodySkinType`/`bodyConcerns`; `users` + `bodySkinType`/`bodyConcerns`)

| Бүлэг | Хүснэгтүүд |
|---|---|
| Хэрэглэгч | `users`, `userAddresses`, `wishlistItems`, `loginAttempts`, `passwordResetTokens`, `emailVerificationTokens`, `phoneVerificationSessions`, `staffInvitations`, `storeCreditLedger` |
| Каталог | `productCategories`, `products`, `productVariants`, `featuredBrands`, `productReviews`, `routines`, `routineSteps` |
| Нөөц | `branches`, `branchStock`, **`stockMovements`**, `stockReceipts(+Lines)`, `stockCounts(+Lines)`, `stockTransfers(+Lines)` |
| Худалдаа | `carts`, `cartItems`, `orders`, `orderItems`, `paymentAttempts`, `discountCodes`, `sitePromotions`, `loyaltyTiers` |
| Контент | `posts`, `postCategories(+Links)`, `postTags(+Links)`, `mediaLibrary`, `siteMedia`, `siteText`, `siteDocuments`, `storeSettings` |
| Аналитик | `visitorSessions`, `marketingSpend` |
| Систем | `integrationConfigs`, `notificationOutbox`, `externalRefs`, `integrationSyncState`, `scheduledJobRuns`, `rateLimitBuckets`, `adminAuditLogs` |
| Царайны хаалга | `faceEnrollments`, `faceChallenges`, `faceAttempts` |

**Migration**: `drizzle/00NN_*.sql`-ийг гараар бичээд `pnpm exec tsx scripts/db-apply-migration.ts drizzle/00NN_*.sql`. `drizzle/schema.ts`-ийг мөн адил гараар шинэчилнэ. ⚠️ Хоёр лаптоп нэг DB хуваалцдаг тул **DB шинэ, код хуучин** байдал чимээгүй үүсдэг.

---

## 7. Background ажлууд (`server/automation.ts` + `_core/scheduler.ts`)

| Ажил | Давтамж | Юу хийдэг |
|---|---|---|
| `abandoned-cart-reminder` | 1 цаг | 24ц+ хөдөлгөөнгүй сагсанд имэйл |
| `back-in-stock` | 15 мин | (2026-09-21, 0092) хүслийн жагсаалтын "Ирэхээр мэдэгдэх": нөөц > 0 болсон мөрийг эхлээд **эзэмшиж** (`claimRestockAlert`, guarded UPDATE) дараа нь push + имэйл; нөөц дахин 0 болбол `rearmRestockAlerts`. `runBackInStockJob({ productIds })` — тест өөрийн бараагаар хязгаарлана (бодит харилцагчийн мөрийг эзэмшүүлэхгүй) |
| `low-stock-owner-digest` | 20 цаг | бага нөөцийн имэйл + `stock.low_digest` push (UB өдрөөр dedupe) |
| `stock-ledger-drift` | 1 цаг | ledger ≠ тавиур бол admin-д мэдэгдэнэ |
| `stale-transfer-reminder` | 6 цаг | 48ц хүлээн аваагүй шилжүүлэг |
| `inventory-sync-smartsoftware` | 15 мин | Smart POS-ын үлдэгдэл → батлах тооллого (идэвхтэй үед л) |
| `data-retention` | 24 цаг | `visitor_sessions` 24 сараас, `login_attempts` 12 сараас хуучин мөрийг устгана (`purgeStaleTelemetry`) |
| `notification-outbox-purge` | 20 цаг | тестийн болон 90 хоногоос хуучин мөрүүд |

2026-10-05 (0102): ажиллалт бүр `job_runs`-д (startedAt/finishedAt/ok/error/affectedCount/claimedBy=хост#pid) — `scheduler.ts` `startJobRun`/`finishJobRun`; `run()` `{ affectedCount }` буцааж болно; `data-retention` 30 хоногоос хуучныг устгана; `listRegisteredJobs()` → /admin → Процесс → Ажлууд. Staging болон cluster instance ≠ 0 дээр scheduler огт ажилладаггүй (`clusterRole.ts`) — самбар үүнийг `schedulerActive`-аар тайлбарлана.

---

## 8. Хэзээ ч зөрчиж болохгүй дүрмүүд

1. **Нөөц** — зөвхөн `stockLedger.ts`-ээр (§3.3).
2. **Орлого** — зөвхөн `settledSaleSql`-ээр тодорхойлогдоно.
3. **Мэдэгдэлд PII байхгүй** (§3.4).
4. **Гадны төлбөрийн "төлөгдсөн" гэдэгт callback-аар итгэхгүй** (§3.5).
5. **Нууц утга клиент рүү буцахгүй** — `getAdminIntegrations` зөвхөн `isSet` өгнө; ntfy topic нь өөрийн бүлгийн гишүүнд л харагдана.
6. **Update schema бүр `partialForUpdate()`** (zod 4 урхи).
7. **Integration тест бодит мөрийг устгахгүй** — snapshot-restore, эсвэл throwaway marker.
8. **Тестийн өгөгдөл `%test%`-ээр хайж болохгүй** — каталогт жинхэнэ `Honey amproom tester` бий (`scripts/test-residue-report.ts`).
9. **Захиалга бичдэг шинэ зам бүр `clientRequestId` авна** (checkout, POS шиг) — эс бөгөөс timeout/resend/2 дахь tab давхар захиалга, давхар нөөц хасалт үүсгэнэ.
10. **`users` мөрийн эрх/sessionVersion/suspend-ийг өөрчилдөг шинэ функц бүр `forgetSessionUser(id)` дуудна** — эс бөгөөс "бүх төхөөрөмжөөс гарах" 5 с хоцорно (2026-09-12-нд бодитоор гарсан P0).
13. **Захиалгын мөр өөрчилдөг код (`editAdminOrder`, POS, checkout) нөөцийг `adjustOrderLineStock`/`decrementBranchStock`/`restoreStockForOrder`-оор л хөдөлгөнө** — шууд `branch_stock` бичихгүй (§3.3-ийн ledger дүрэм).
14. **Зочны захиалга = утас баталгаажсан session** (`requireCheckoutPhoneVerification`) — шинэ захиалгын зам (ж. өөр checkout) энэ шалгалтыг алгасахгүй.
17. **Царайны шалгалт эхлүүлдэг / царай бүртгэдэг / QR нээдэг шинэ procedure бүр `assertReauthProof`** (нууц үгийн step-up, 2026-09-22) — эс бөгөөс 365 хоногийн сешн cookie дангаараа царай руу хүрнэ. Шинэ JWT бүр өөрийн `typ`-тэй, уншигч нь `typ`-ийг шалгана (нэг түлхүүрээр гарын үсэг зурдаг).
12. **Шинэ admin procedure = role builder** (`adminProcedure`, `staffProcedure`…), `protectedProcedure` БИШ — эс бөгөөс царайны proof шалгагдахгүй (2026-09-12-ны incident: gate зөвхөн дэлгэц байсан).
11. **Cloud вендорын URL https + public host** (`validateIntegrationSettings`, `isPrivateHost`) — ntfy л LAN-д зөвшөөрөгдөнө.
15. **Гадагш чиглэсэн `fetch` бүр `AbortSignal.timeout(...)`-той** (2026-09-20: QPay, verify.mn, Brevo, Honeybadger, OG зураг бүгд 10–15с) — гацсан провайдер checkout-ийн хүсэлтийг хязгааргүй барьж болохгүй.
18. **Мөнгө/эрх олгодог шалгуур "захиалсан" биш "ТӨЛӨГДСӨН"** (`isOrderSettled`, 2026-09-23) — COD захиалга нээж, урамшуулал аваад цуцалж болдог байв.
19. **`users.phone` = нэвтрэлтийн identity** — SMS баталгаажуулалтгүй бичих шинэ зам гаргахгүй (`attachPhoneFromVerifiedSession` л бичнэ). Зочны checkout OTP `ctx.user.phone`-оос хамаардаг.
20. **Нэг удаагийн сесс/тасалбарыг үйлдлийн ӨМНӨ атомаар эзэмш**, дараа нь биш; уначихвал суллана; буцаах утгыг хаяхгүй (2026-09-23: нэг SMS N захиалгыг баталдаг байв).
21. **Провайдерийн callback нэвтрэлтгүй** — төлбөр ороогүй хариунд `responseJson` дарахгүй, "хараахан батлаагүй"-г `failed` болгохгүй, `provider`-оор тааруул (2026-09-23: хоёр төлөгдөх нэхэмжлэл, хоёр зээлийн хүсэлт).
22. **Нөөц хасагдаагүй мөрийг буцаахгүй** — `products.kind === "gift_card"` мөр checkout/POS/цуцлалт/буцаалт бүгдэд нөөц хөндөхгүй.
23. **Захиалгын `fulfillingBranchId` солигдвол нөөцийг ЗӨӨНӨ** (хуучинд буцааж, шинээс хасна) — эс бөгөөс цуцлалт буруу салбарт буцаана.
24. **Төлөгдсөн захиалгын дүнг дахин бодохгүй**; **"дууссан" → `paid` нь зөвхөн webhook-гүй аргад** (`WEBHOOK_PAID_METHODS`).
25. **Процесс доторх кэш бүр хязгаартай** (`ttlCache`-ийн sweep + `MAX_ENTRIES`); түлхүүр хэрэглэгчийн замаас бүтэх бол 404-ийг кэшлэхгүй.
26. **Хэрэглэгчийн үгийг LIKE-д `escapeLike()`-гүйгээр бүү тавь**; **zod-ийн алдаа `maskErrorShape`-ээр монгол өгүүлбэр болно** (шинэ талбар → `FIELD_LABELS_MN`).
16. **Төлөв шилжүүлдэг UPDATE бүр `WHERE <хуучин төлөв>` + `affectedRows` шалгалттай** — сагсны `active→converted` (2026-09-20-нд олдсон: хоёр tab → хоёр захиалга), нөөц, купон, зээл, төлбөрийн attempt бүгд энэ идиомоор.

---

## 9. Тест (137 vitest файл — 2026-10-05, 1281 passed 2026-10-01 `sugi_staging`; **E2E 33 файл / 243 тест — 2026-10-05**; царайны хаалганы E2E `E2E_FACE_GATE=1`-ээр л: `face-gate.spec.ts`, `face-handoff.spec.ts`)

```powershell
$env:RUN_AUTH_INTEGRATION_TESTS="1"; $env:COMMERCE_INTEGRATION_TESTS="1"; $env:RUN_MEDIA_INTEGRATION_TESTS="1"
pnpm exec vitest run --no-file-parallelism   # ~17 минут, бодит Aiven дээр
pnpm check   # tsc (app) + tsc -p tsconfig.tests.json (тест/скрипт) — 2026-09-12-оос тестүүд ч type-check хийгдэнэ
pnpm e2e     # Playwright, 19 файл / 192 тест (desktop + mobile), sugi_staging схем дээр
pnpm lint    # ESLint flat config: typescript-eslint recommended + react-hooks (rules-of-hooks, exhaustive-deps). CI-д ч ажиллана
```

**E2E (Playwright, 2026-09-16-аас — `e2e/`)**

```powershell
pnpm build ; pnpm e2e        # 54 тест, компьютер + утас, production build дээр
```

⛔ Бодит дэлгүүрийн схем рүү хэзээ ч заахгүй — `e2e/helpers/environment.ts` нь
`defaultdb`-г татгалзаж, анхдагчаар `sugi_staging` руу заана. Нэвтрэлт нь аппын
өөрийн `signSessionToken`-оор (OTP-г тойрох арын хаалга аппликейшнд НЭМЭЭГҮЙ).
`e2e/global-setup.ts` нь схемийн зөрүүг эхлээд шалгана (staging deploy migration
ажиллуулдаггүй). Туслахууд: `helpers/fixtures.ts` (күүкийн самбарыг урьдчилан
шийдсэн context), `helpers/session.ts`, `helpers/admin.ts`.

**`server/_test-helpers.ts` `testSessionUser({id, ...overrides})`** — appRouter.createCaller-т өгөх бүрэн session user. Тест бүр өөрийн fake user бичдэг байсан нь `users`-т багана нэмэгдэх бүрт хоцордог байв (type-check асаахад 90 алдаа). Шинэ integration тест ЭНИЙГ ашиглана.

Хоёр төрөл: **unit** (gate-гүй, сүлжээгүй — `ntfy.test.ts`, `smart-software.test.ts`, `storepay.test.ts`, `qpay.test.ts`, `scan-session.test.ts`, `transfer-reconcile.test.ts`, `stock-alerts.test.ts` …) ба **integration** (env gate-тэй, бодит DB — `inventory.integration.test.ts`, `inventory-sync.integration.test.ts`, `stock-ledger.integration.test.ts`, `transfers.integration.test.ts`, `order-unwind.integration.test.ts` …). Integration файл бүр өөрийн throwaway өгөгдлийг `afterAll`-д устгана.

---

## 10. Скриптүүд (`scripts/`)

`db-apply-migration.ts` (migration, нэг файл, prod; **2026-09-20-оос `schema_migrations`-д бүртгэнэ, `--mark-applied`-аар хуучныг бүртгэх**), `db-migration-status.ts` (**prod/staging-ийн дутуу migration-ийг нэрлэнэ**), `oci/media-backup.mjs` (**R2 зургийн нэмэгдүүлсэн нөөц, ETag-аар; `--dry-run`**), `image-avif-backfill.ts` (**хуучин зурагт AVIF, давтан ажиллуулахад аюулгүй**), `db-apply-all-migrations.ts` (хоосон DB-д бүх migration — CI/шинэ орчин), `ci-seed.ts` (4 салбар), `enrich-products-from-open-facts.ts` (Open Facts TSV → барааны факт), `seed-gift-cards.ts`, `db-backup.ps1` / `db-restore.ps1`, `stock-ledger-rebaseline.ts` (drift засах), `test-residue-report.ts` / `test-residue-purge.ts` (амьд DB-ийн тестийн үлдэгдэл), `schema-drift-check.ts` (`drizzle/schema.ts` vs бодит `information_schema` + FK индекс — нөгөө лаптопын migration-ыг илрүүлнэ), `check-updates.ps1` (долоо хоног тутмын `pnpm audit` + `pnpm outdated` + override эрүүл мэндийн тайлан, Windows toast; `-Install`-аар Task Scheduler-т бүртгэнэ, зөвхөн мэдээлнэ — юу ч суулгахгүй), `tmp-*.ts` (gitignore, нэг удаагийн), зураг/брэндийн seed скриптүүд.

---

## 11. Одоо ажиллаж БАЙГАА vs зөвхөн тохиргоо хадгалдаг

| Интеграц | Төлөв |
|---|---|
| ntfy (утасны мэдэгдэл) | ✅ бодитоор ажиллаж байгааг Tom-ийн iPhone дээр баталгаажуулсан |
| Smart Software | ✅ код бэлэн — нэвтрэх нэр/нууц үг хүлээж байна (холбогдмогц үлдэгдэл **автомат**, үнэ/факт батлуулдаг) |
| StorePay | ✅ код бэлэн — 7 утга хүлээж байна |
| QPay | ✅ код бэлэн — merchant (эсвэл sandbox) эрх хүлээж байна |
| Brevo имэйл, verify.mn SMS, R2, Honeybadger | ✅ `.env`-ээр |
| И-баримт, Голомт карт, eBuuhia | ⏸ зөвхөн тохиргоо хадгалдаг (`wiredUp:false`) — бизнесийн шийдвэр хүлээж байна ([EBARIMT.md](../EBARIMT.md)) |
