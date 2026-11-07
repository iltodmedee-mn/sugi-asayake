# SUGI ASAYAKE — Төслийн танилцуулга (хөгжүүлэгчийн тэмдэглэл)

Энэ файлыг ажил эхлэх бүрт эхлээд уншина.

> 📘 **Код хэрхэн ажилладаг вэ — бүрэн тайлбар: [docs/CODEBASE.md](docs/CODEBASE.md)** (2026-09-12). Файл бүр юу хариуцдаг, өгөгдөл хаанаас хаашаа урсдаг, хэзээ ч зөрчиж болохгүй 8 дүрэм. Шинэ файл нэмэх/өөрчлөх бүрт түүнийг мөн шинэчилнэ. **Файлыг бага байлгахын тулд дэлгэрэнгүй өдөр бүрийн ажлын лог [HISTORY.md](HISTORY.md)-рүү зөөгдсөн** (2026-08-26) — тодорхой bug/шийдвэрийн шалтгааныг мэдэх хэрэгтэй үед л тэнд хайна. Энд зөвхөн **одоогийн статус, тохиргоо, идэвхтэй асуудал** байна.

## Төслийн зорилго
**SUGI ASAYAKE** — Улаанбаатар дахь интерьер/skincare дэлгүүрийн онлайн худалдааны сайт (SUGI × ASAYAKE брэнд). Эзэмшигч: Tom (`t.morius@gmail.com`). Анхны эх код нь Manus AI платформоор бүтээгдсэн байсныг бүрэн салгасан (JWT email+password auth, S3-compatible storage, Manus runtime хассан) — дэлгэрэнгүй шалтгаан/алхам: [HISTORY.md](HISTORY.md).

## Локал орчны тохиргоо (чухал — эдгээрийг мэдэхгүй бол дахин цаг алдана)

⚠️ **Энэ блокийн ХАЯГУУД ХУУЧИРСАН** (тэмдэглэв 2026-09-16): өгөгдлийн сан
2026-09-13-нд **Aiven → Oracle HeatWave (Токио)** руу нүүсэн. Бодит `DATABASE_URL`
нь `mysql://…@127.0.0.1:3307/defaultdb` — ssh тунелиар (`scripts/oci/tunnel.ps1`,
машин асахад автоматаар) HeatWave-ийн хувийн сүлжээнд холбогдоно, CA файл нь
`oci-ca.pem`. Доорх Aiven-ий жишээ зөвхөн бүтцийг харуулж байна.
⚠️ **`DATABASE_URL` нь ЗААВАЛ хуваалцсан бодит DB руу заасан байх ёстой, local
MySQL руу БИШ** (2026-09-01 бодит incident-ээр баталгаажсан шалтгаан доор):

```
DATABASE_URL=mysql://avnadmin:<Aiven password>@sugi-asayake-db-project-4b75.h.aivencloud.com:25861/defaultdb?ssl-mode=REQUIRED
JWT_SECRET=<64 тэмдэгт санамсаргүй hex — node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"; баримтад бичигдсэн жишээ утгыг ХЭЗЭЭ Ч бүү ашигла>
OWNER_EMAIL=t.morius@gmail.com
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<R2 access key>
S3_SECRET_ACCESS_KEY=<R2 secret key>
S3_PUBLIC_BASE_URL=https://pub-<hash>.r2.dev
PORT=3000
# Сонголттой (2026-09-04, доор дэлгэрэнгүй) — байхгүй бол error tracking чимээгүй no-op:
HONEYBADGER_API_KEY=
# Сонголттой (2026-09-05, доор дэлгэрэнгүй) — байхгүй бол утасны SMS баталгаажуулалт
# (бүртгэл + нууц үг сэргээх) дуудагдмагц ШУУД алдаа шидэнэ (бусад интеграцаас ялгаатай,
# чимээгүй no-op БИШ — эсвэл шалтгаан server/_core/env.ts-ийн verifyMnApiKey-ийн тайлбарт):
VERIFY_MN_API_KEY=
# Сонголттой боловч production-д ЗААВАЛ (2026-09-09 deep audit, доор дэлгэрэнгүй): Aiven-ий CA
# сертификат (PEM, Aiven Console → service → Overview → "CA certificate"). Байвал сервер
# сертификатыг шалгана; production-д байхгүй бол сервер эхлэхээс ТАТГАЛЗАНА (2026-10-01, fail-closed).
# Эсвэл файлын зам: DATABASE_CA_CERT_PATH=./aiven-ca.pem (файлыг commit хийхгүй).
# ✅ 2026-09-12: ГЭРИЙН лаптоп дээр ./aiven-ca.pem + DATABASE_CA_CERT_PATH тавигдаж, бодитоор шалгасан
#    (TLSv1.3, буруу CA-г татгалзсан). АЖЛЫН лаптоп + production host дээр ижил файлыг гараар хуулна
#    (Aiven Console → Overview → CA certificate) — .env болон *.pem хоёулаа gitignore тул git-ээр ирэхгүй.
DATABASE_CA_CERT_PATH=./aiven-ca.pem
# Сонголттой (2026-09-11): утасны push мэдэгдлийг ЭНЭ машинаас илгээх эсэх. Хоёр лаптоп нэг DB
# хуваалцдаг тул зөвхөн НЭГ машин (production host) дээр 1 болгоно. ntfy-ийн token/сэдвүүд .env-д
# БИШ, /admin → Интеграцууд-д шифрлэгдэж хадгалагдана.
NOTIFICATIONS_DISPATCH=
```
Клиент талд мөн `VITE_HONEYBADGER_API_KEY` (server-ийн `HONEYBADGER_API_KEY`-тэй ижил утга) тохируулж болно — Vite build руу шингэдэг тул нууц биш, Sentry-ийн public DSN-тэй ижил итгэлийн загвар.
(Бодит Aiven нууц үг/R2 утгууд: Tom-оос асуух, эсвэл Aiven dashboard → sugi-asayake-db → Connection information / Cloudflare dashboard → R2 → Manage R2 API Tokens. Хоёр laptop **нэг ижил Aiven DB, нэг ижил R2 bucket**-ыг хуваалцдаг тул `DATABASE_URL`/`S3_*` утгууд хаана ч яг ижил байх ёстой.)

**⚠️ 2026-09-01 бодит incident, яагаад энэ анхааруулга чухал вэ**: Энэ (гэрийн) лаптопын `.env` хэзээ нэгэн цагт (Aug 26 20:36-аас өмнө/дараа тодорхойгүй) local MySQL руу буцаж сольсон байсан — магадгүй яг энэ дээрх жишээ блокийг харж хуулснаас (өмнө нь энд `mysql://root:...@127.0.0.1/...` жишээ байсан нь бодит local MySQL руу заасан жишээ атлаа "чухал тохиргоо" мэт харагдаж байсан). Үр дагавар: Tom-ийн бодитоор /admin-аар upload хийсэн зургууд (`home-hero`, `home-categories`, `home-family` гэх мэт) Cloudflare R2-д бүрэн бүтэн хэвээрээ байсан ч (шалгасан: `ListObjectsV2Command`-ээр бодитоор баталгаажуулсан, файлууд алга болоогүй), local MySQL-ийн `site_media` хүснэгт хоосон байсан тул `/admin` → Content & Media дээр бүгд "BRAND DEFAULT" (буюу зураг алга болсон мэт) харагдаж байв. **Зураг хэзээ ч устаагүй, зөвхөн буруу DB-ээс уншиж байсан.** Local MySQL-ийг зөвхөн интернэтгүй үед түр орлуулагч болгон ашиглах (доорх "MySQL-тэй холбоотой" хэсгийг үзнэ үү) — хэзээ ч `.env`-д удаан хугацаагаар үлдээхгүй, ажил дуусмагц заавал Aiven руу буцааж тавих.

**`pnpm dev` стандарт байдлаар ажилладаг** (2026-08-20-с хойш засагдсан) — зүгээр:
```powershell
cd C:\Sugi-asayake
pnpm dev
```
Гар `$env:` тохиргоо зөвхөн `.env`-ийн утгыг түр override хийх шаардлагатай үед л хэрэгтэй.

### Shared database and catalog navigation (Aiven)
Aiven MySQL is the shared source of truth for both laptops; Cloudflare R2 stores image bytes. Keep the Aiven `DATABASE_URL` only in the ignored `.env`. Shop search/category/pagination state is kept in the URL, product breadcrumbs return to the shop, and the admin sidebar has a direct homepage link.

Aiven service-ийн built-in daily backup-ийг идэвхжүүлж, нэмэлт локал backup нь өдөр бүр **19:00** цагт ажиллана (`SUGI ASAYAKE Daily DB Backup` Windows Task Scheduler task, 14 backup хадгална). Мөн долоо хоног бүрийн **Даваа 10:00**-д `SUGI ASAYAKE Weekly Dependency Check` ажиллаж (`scripts/check-updates.ps1`) advisory/хуучирсан пакет/override эрүүл мэндийг шалгаад `logs/dependency-checks/`-д бичиж, олдвол Windows toast өгнө — юу ч суулгахгүй, зөвхөн мэдээлнэ. Aiven URI-д `?ssl-mode=REQUIRED` байвал backup/restore script-үүд TLS flag-ийг автоматаар дамжуулна.

**Aiven trial дуусахаас өмнө хийх ажил:** trial-ийн сүүлийн долоо хоногт Aiven-ээс хамгийн сүүлийн бүрэн `.zip` backup-ийг татаж аваад, өөр төхөөрөмж/cloud drive дээр хадгална. Дараа нь хүсвэл backup-ийг managed MySQL эсвэл локал MySQL рүү `scripts/db-restore.ps1 -DatabaseUrl "<target>" -BackupFile "<zip>" -Force`-оор сэргээнэ. Backup файл, password, CA certificate-ийг GitHub-д commit хийхгүй. Trial дуусах яг өдрийг Aiven Console-ийн Billing/Service мэдээллээс шалгана.

### MySQL-тэй холбоотой чухал зүйл
Windows дээрх MySQL 8 root хэрэглэгч `caching_sha2_password`-оор тохиргоологдвол Node.js-ийн `mysql2` драйвертай зөрчилдөнө (`mysql.exe` CLI ажилладаг тул андуурч болно). Засвар:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Zulaa123';
CREATE USER IF NOT EXISTS 'root'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY 'Zulaa123';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'127.0.0.1' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

### Migration-уудыг ажиллуулах тухай
`drizzle/meta` экспортод ороогүй тул `pnpm db:push`-д бүрэн найдаж болохгүй — `.sql` файлуудыг гараар ажиллуулна. **2026-09-09-өөс хойш албан ёсны арга** (Aiven дээр аппын өөрийн холболтоор — TLS, UTC session, query log бүгд production-тай ижил; `--> statement-breakpoint`-ийг өөрөө хасна):
```powershell
pnpm exec tsx scripts/db-apply-migration.ts drizzle/0056_discount_code_per_customer_cap.sql
```
Өмнө нь: `scripts/db-backup.ps1 -DatabaseUrl "<Aiven URI>"` (`-DatabaseUrl`-гүй бол `$env:DATABASE_URL` шаардана, `.env`-ийг өөрөө уншдаггүй). Зөвхөн интернэтгүй, local MySQL дээр ажиллаж байгаа үед л хуучин арга: `(Get-Content <file>.sql -Raw) -replace '--> statement-breakpoint', '' | mysql.exe -u root -p sugi_asayake`.

### Тест ажиллуулах тухай
⛔ **2026-09-23-аас integration тест `sugi_staging` дээр ажилладаг, `defaultdb` дээр БИШ** (`server/_test-setup.ts` нь `.env`-ийн `defaultdb`-г автоматаар `sugi_staging` болгоно; өөр схем → `VITEST_DATABASE_URL`, ухамсартайгаар production → `ALLOW_PROD_TESTS=1`). Шалтгаан: тасарсан run бүр бодит /shop дээр харагдах тест бараа, тайланд тоологдох тест захиалга үлдээдэг байв. Үр дагавар: шинэ migration-ийг `--staging`-оор ЭХЛЭЭД ажиллуул, эс бөгөөс тест хуучин схем дээр унана.
Бүх integration gate идэвхтэй үед vitest-ийн анхдагч параллель горим тогтмол бус ~3 файлыг унагаадаг (pre-existing race, 20 гаруй файл нэг MySQL/MinIO-г зэрэг hammer хийдгээс) — **үргэлж `pnpm exec vitest run --no-file-parallelism` ашиглах**:
```powershell
$env:RUN_AUTH_INTEGRATION_TESTS="1"; $env:COMMERCE_INTEGRATION_TESTS="1"; $env:RUN_MEDIA_INTEGRATION_TESTS="1"
pnpm exec vitest run --no-file-parallelism
```
Сүүлд БОДИТООР хэмжсэн бүрэн тоо: **1132 passed / 2 skipped ✅ (117 файл, 1159 с, `sugi_staging` дээр)**, 2026-09-24-нд vitest **4.1.11** дээр (`--hook-timeout=60000 --test-timeout=90000` — Токио дахь DB руу тунелээр анхдагч 10 с hook хангалтгүй). ⚠️ Windows дээр ажиллаж байгаа suite-ийг `TaskStop`/Ctrl+C-ээр биш `taskkill //PID <pid> //T //F`-ээр зогсоо — эс бөгөөс vitest процесс үлдэж дараагийн run-тэй DB-г зэрэг дарна. ⚠️ Бүрэн suite ажиллаж байхад **зэрэгцүүлэн өөр тест/скрипт ижил Aiven дээр ажиллуулахгүй** — 2026-09-12-нд ингэснээс `loyalty.integration` hook 10 с timeout-оор нэг удаа унасан (485 с), цэвэр дараалсан run-д ногоон. Мөн **`pnpm check`** одоо 2 tsc (апп + `tsconfig.tests.json`-оор тест/скрипт) ба **`pnpm lint`** (ESLint, CI-д ч ажиллана) — commit хийхээсээ өмнө хоёуланг ажиллуул. Шинэ integration тест fake session user бичихгүй, `server/_test-helpers.ts`-ийн `testSessionUser({id,...})`-ийг ашиглана (CI горимд gate-үүд идэвхгүй тул ихэнх integration файл skip болно — хэвийн). ⚠️ Strict rate-limit tier-үүд одоо DB дээр тоолдог (`rate_limit_buckets`) тул тестэд **тогтмол IP** ашиглавал 15 минутын дотор дахин ажиллуулахад блоклогдоно — `callerFor`-ийн санамсаргүй/per-run IP загварыг дага.

### E2E тест (Playwright, 2026-09-16-аас)

```powershell
pnpm build ; pnpm e2e                      # 78 тест: компьютер + утас
pnpm e2e --project=desktop e2e/cart.spec.ts
pnpm e2e --headed                          # нүдээр харах
```
⛔ **Бодит дэлгүүрийн схем рүү ХЭЗЭЭ Ч заахгүй**: E2E нь хэрэглэгч үүсгэж, сагс
дүүргэж, admin-аар бичдэг тул `e2e/helpers/environment.ts` нь `defaultdb` рүү
заасан бол ажиллахаас татгалзана; анхдагчаар ижил HeatWave дээрх `sugi_staging`.
Нэвтрэлт нь аппын өөрийн `signSessionToken`-оор богиносгогддог — OTP-г тойрох
арын хаалга аппликейшнд НЭМЭХГҮЙ. Сервер production build (`node dist/index.js`)
дээр асдаг тул CSP/compression/статик зам бодитоор шалгагдана — эхлээд `pnpm build`.
⚠️ **staging deploy нь migration ажиллуулдаггүй** (2026-09-16-нд /careers болон
admin-ий бүтээгдэхүүн хадгалах хоёр 500 өгснөөр илэрсэн) — тиймээс E2E эхлэхийн
өмнө `e2e/global-setup.ts` схемийн зөрүүг шалгаж, дутуу migration-ийг нэрлэнэ.

✅ **CI-ийн `INTEGRATIONS_ENCRYPTION_KEY` цоорхой ШИЙДЭГДСЭН (2026-09-01)**: `server/integrations.integration.test.ts`-ийн "encryption (unit)" 2 тест gate-гүйгээр ажилладаг ба `server/_core/crypto.ts`-ийн `getKey()` нь 64-тэмдэгт hex түлхүүргүй бол шууд шатдаг тул бодит GitHub Actions дээр улаан гарч байв. Эдгээр нь **зөвхөн round-trip болон tamper-detection шалгадаг цэвэр unit тест** бөгөөд түлхүүрийн утга нь огт хамаагүй. Тиймээс `server/_test-setup.ts` орчинд түлхүүр байхгүй үед л **түр зуурын түлхүүр өгдөг** болгов (бодит `.env` утга байвал үргэлж түүнийг хүндэтгэнэ). **Аппликейшний код (`env.ts`/`crypto.ts`) огт хөндөгдөөгүй** — жинхэнэ сервер бодит түлхүүргүйгээр юу ч шифрлэхээс татгалзсан хэвээр, өөрөөр хэлбэл аюултай "insecure dev fallback" НЭМЭЭГҮЙ. Улмаар `ci.yml`-д repo secret огт хэрэггүй болж, шинэ clone дээр `pnpm test` тохиргоогүйгээр ногоон гарна.

### Шинэ S3/R2 bucket байгуулах бүрт (production, шинэ орчин) мартаж болохгүй 2 алхам
Зөвхөн `CreateBucketCommand` хийгээд зогсвол зураг upload "амжилттай" ч browser дээр **403**-аар харагдахгүй:
1. `CreateBucketCommand`
2. `PutBucketPolicyCommand` (`s3:GetObject`-ийг public болгох)

## Одоогийн статус — юу шалгагдсан, юу шалгагдаагүй

**Ажиллаж байгаа нь баталгаажсан:** бүртгэл/нэвтрэлт (OTP 2-алхамт, эхний хэрэглэгч auto-admin), role-based хамгаалалт, admin панель (бүтээгдэхүүн/зураг/post/routine/coupon/promo/integrations/variants), каталог+server-side FULLTEXT хайлт (`catalog.search`), guest checkout, loyalty/routine хямдрал, reviews, wishlist, profile (address book, preferences, security), захиалгын имэйл мэдэгдэл (Brevo), Cloudflare R2 storage (хоёр laptop хуваалцдаг), **Product Variants PHASE 1+2 (variant сонголттой худалдан авалт, доор дэлгэрэнгүй)**, **Admin Analytics/CRM dashboard (Geckoboard маягийн харанхуй KPI самбар: sparkline/gauge/P&L card/ranked list-үүд, + борлуулалт/дүүрэг/харилцагчийн мэдээлэл/ашиг/маржин/сагс орхилт/нөөц/суваг/эх сурвалж/**хөрвүүлэлтийн хувь (Conversion Rate, бодит visitor session tracking)**/**CAC**/**буцаалтын хувь (Return Rate)** + Excel/PDF export, доор дэлгэрэнгүй — Playwright-ээр throwaway өгөгдлөөр screenshot баталгаажсан, бодит 937 барааны өгөгдлөөр хараахан үзээгүй)**, **Нүүр хуудасны premium reference-driven редизайн (2026-08-28, доор дэлгэрэнгүй — QuickStatsSection infinity graph, CategoryMasonry v2 (pixel-хэмжилтээр баталгаажсан overlap/offset/watermark засвар), WhyChooseUs, JournalSection, StoreLocatorSection, бодит throwaway хэрэглэгчээр authenticated screenshot баталгаажсан)**. Дэлгэрэнгүй бүх TIER-ийн баталгаажуулалт: [HISTORY.md](HISTORY.md), [ROADMAP.md](ROADMAP.md), [PREMIUM-FEATURES.md](PREMIUM-FEATURES.md), [ADMIN-PANEL.md](ADMIN-PANEL.md).
**Өнгөний систем (2026-09-11):** storefront нь **Linen** цайвар палитр (суурь `#dae0da`, карт `#f2f5f2`, band `#ced5cf`) — харанхуй горим БИШ. 7 хуудас × 4 өргөнд WCAG 2.2 AA контрастын алдаа 0 (бодит computed дэвсгэр дээр хэмжсэн). Дэлгэрэнгүй доорх 2026-09-11 хэсэгт.
**Навигацийн засвар (2026-08-28):** Shop-ийн хайлт/ангилал/хуудаслалт URL-д хадгалагдаж refresh болон product-оос буцахад state сэргээнэ; product breadcrumb болон Admin-ийн нүүр хуудасны холбоосууд ажиллана.

**Гүйцэтгэл (Lighthouse, production, утас):** 09-21 өглөө нүүр 59 → 69 (зураг), **үдээс хойш 69 → 89, LCP 5.3 → 3.3 с** (серверийн зурсан hero shell, bootstrap блок, JS low priority, admin CSS салгав — HISTORY 6e); **бодит (devtools) throttling-д LCP 2.5 с** (hero эхний зурагдалтад). Компьютер 94–97. Үлдсэн 3.3 с нь загварт ил: hero зураг өөр origin (`pub-….r2.dev`) дээр → шинэ холболт + шрифт/CSS-тэй зурвас хуваалцах — **кодоор биш, Tom-ийн шийдвэр** (R2 custom domain эсвэл Worker, HISTORY 6e-ийн төгсгөл). SEO 100 (нүүр, бараа), **хүртээмж 100** (нүүр, /shop, бараа, /login, /track-order, /careers — 09-21 үдээс хойш, HISTORY 6f).

**Шалгагдаагүй/хараахан идэвхгүй:**
- QPay төлбөр (жинхэнэ merchant credential шаардана; ⚠️ 2026-09-12: QPay-д **sandbox** орчин байдаг — `QPAY_ENVIRONMENT=sandbox` + sandbox merchant эрхээр бүх урсгалыг гэрээний өмнө туршиж болно)
- **Smart Software** (код бэлэн, эрх хүлээж байна): холбогдмогц 15 мин тутам үлдэгдэл татаж **автоматаар** нөөц болно (Бараа хүлээн авах → Тооллого нь түүх). Үнэ/хөнгөлөлт/найрлага-заавар-анхааруулга нь **батлуулдаг** зөрүүний дэлгэцээр. ⚠️ Эхний таталтыг заавал `vendor-stock-auto-apply=0`-оор, 1 салбар дээр хийж нүдээр шалгаад л автоматыг ас.
- **StorePay** (2026-09-12, код бэлэн, туршигдаагүй): 4 салбар бүгд StorePay хүлээн авдаг тул сайтад нэмэв. Tom StorePay-ээс **7 утга** авах хэрэгтэй: auth хаяг, api хаяг, апп-ын нэр/нууц үг, үндсэн нэр/нууц үг, дэлгүүрийн код (storeId) → /admin → Интеграцууд → StorePay. Бүгд орж, "Идэвхтэй" болтол checkout дээр харагдахгүй. ⚠️ Онлайн төлбөр (QPay ба StorePay) зөвхөн **нэвтэрсэн** хэрэглэгчид харагдана.
- SMS (Brevo) — SMS кредит/route-ийг Tom баталгаажуулаагүй хэвээр (имэйл тал ажиллаж байгаа нь баталгаажсан, доор "Brevo API" хэсгийг үзнэ үү)
- eBarimt, StorePay, шууд карт төлбөр, эльч (eBuuhia) хүргэлт — бүгд Tom-ийн биечлэн хийх бизнесийн алхам шаардана, код бэлэн биш (eBarimt зөвхөн inert schema бэлэн — [EBARIMT.md](EBARIMT.md))
- **Product Variants — PHASE 1 болон PHASE 2 хоёулаа дууссан (2026-08-26)** — худалдан авагч ProductDetail/QuickView дээр 2+ variant-тай бараанаас сонголт хийж, тухайн variant-ийн үнэ/нөөц/sku-гоор бодитоор захиалж болно. Ганц variant-тай (одоогийн 936/937) бараанд ямар ч харагдах өөрчлөлт алга. **Бодит Playwright screenshot баталгаажуулалт хараахан хийгдээгүй** (зөвхөн 149 автомат тест + `pnpm build` + throwaway DB probe script-ээр баталгаажсан) — дэлгэрэнгүй [HISTORY.md](HISTORY.md)-ийн "Product Variants PHASE 2" хэсэгт.
- Хэрэглэгчийн удирдлага (`/admin` → Хэрэглэгч хэсэг)

## Сүүлийн үеийн гол ажлууд (дэлгэрэнгүй бүгд [HISTORY.md](../HISTORY.md)-д)

Өдөр бүрийн бүрэн тэмдэглэл HISTORY.md-д байна — тодорхой bug/шийдвэрийн
шалтгааныг мэдэх хэрэгтэй үед л тэнд гарчгаар хайна.

- (10-05, орой) **Брэнд студи A0+A1 + баярын загвар** — /admin → Брэнд студи: өнгө/хэлбэр амьд preview-тэй, AA хамгаалалт, 13 баяр (асаах, хоног, мэндчилгээ, постер), түүх. 13 постер Gemini-ээр (монгол соёлоор 2 дахин). ⛔ Prod-д migration **0103–0105** кодоос өмнө. HISTORY 2026-10-05 орой.
- (10-05) **/admin → Процесс самбар + prod-ын бодит төлөв** (Tom NEXUS BPMN demo үзээд *"энэ шиг лаг юм болох уу, зарахад юу засах вэ"*). Шинжилгээ: prod дээр **09-23-ны `2abe751`** ажиллаж байгаа нь `/api/trpc/x/catalog.list` 200-оор батлагдав (шинэ код 404 өгнө) — 29 commit deploy хийгдээгүй, 0096–0100 дутуу; кодоос: **0098/0099-гүй deploy = бүх checkout + бүх сешн унана** (fallback алга) → `server/_core/migrationCheck.ts` production-д дутуу migration-тай бол сервер ЭХЛЭХГҮЙ (`REQUIRED_MIGRATIONS`, тест нь drizzle/-ийн сүүлийн файлтай тулгана). Самбар: migration **0101 `order_events`** (захиалга бичдэг 10 функц (13 дуудлагын цэг) ижил tx-д `recordOrderEvent`, актор customer/staff/job/webhook/system) + **0102 `job_runs`**; `admin.process.*`; гинж/түүх/ажлууд 3 tab; backfill скрипт. Мөн brace-expansion 0 vuln, admin Q&A хуудаслалт, drift-check төрөл, SALE §4 тайлан. Хөтчөөр компьютер + утас (E2E 4) — утсан дээр `.sr-only` хуудсыг 376px тэлдэг байсныг олж зассан. ⚠️ Энэ лаптопын `oci-ca.pem` хуучин — scratchpad CA + `DATABASE_CA_CERT_PATH`-аар ажиллуулсан. HISTORY 2026-10-05.
- (10-01) **Аюулгүй байдлын deep scan — 38 олдвор + 5 нэмэлт, бүгд кодонд засагдсан** (Tom: *"deep scan … zunduuu ih tsoorhoi"*). Logout нь зөвхөн тэр төхөөрөмжийг `jti`-аар хүчингүй болгоно (0099), нууц үг/утас/Facebook-д step-up + lockout, анхны admin `scripts/make-admin.ts`, царайн proof `faceGrantVersion`, SSRF (`safeHttp`), push allowlist, DB TLS fail-closed, CV хувийн bucket, бэлгийн карт/купоны race, Access-ийн tRPC зам. Бие даасан 3 шалгалтын 21 олдвор мөн засагдсан. ⛔ Migration **0099, 0100 заавал кодоос өмнө** (0099-гүй бол `users.faceGrantVersion` байхгүй → бүх хэрэглэгч гарсан мэт). ⚠️ Integration/E2E энэ лаптопоос ажиллаагүй (DB TLS). HISTORY 2026-10-01.
- (09-29) **Бүх барааны нийтийн хямдрал** — /admin → Урамшуулал (зөвхөн admin). DB-ийн үнэ хөндөгдөхгүй, `withLiveCampaign()` үнэ уншдаг газар бүрт. ⛔ Migration **0098** заавал кодоос өмнө. [SITEWIDE-SALE-PLAN.md](SITEWIDE-SALE-PLAN.md).
- (09-24→29) **Сүүлчийн бүтэн-стек аудит** — ~200 олдвор (4 P0 мөнгө), бүгд засагдсан + бие даасан шалгалтын 27 регресс. [docs/AUDIT-2026-09-27-final.md](AUDIT-2026-09-27-final.md). ⛔ Migration **0096, 0097 ажиллуулаагүй** (энэ лаптопоос DB TLS алдаа) — prod + staging-д ажиллуулаад л deploy. Хямдралын төлөвлөгөө: [docs/SITEWIDE-SALE-PLAN.md](SITEWIDE-SALE-PLAN.md) (6 шийдвэр гарч, 09-29-нд хэрэгжсэн). HISTORY 2026-09-29.
- (09-22) **/admin: нууц үг → царай → admin (step-up) + царайны системийн аудит** (Tom: *"эхлээд нууц үг, дараа нь царай гэж ярьсан — одоо нууц үг асуухгүй шууд царай"*). Шалтгаан: сешн cookie 365 хоног тул нууц үг зөвхөн анх нэг удаа асуугддаг байв. Одоо `sugi_admin_pw` step-up cookie (таб тус бүр, **нэг удаагийн**, 10 мин) — царай асуух БҮРТ /admin-ий нууц үгийн дэлгэц түрүүлнэ (Tom туршаад "зөвхөн царай уншиж байна" гэснээр `/login` тооцогдохоо больж, амжилттай царай алхмыг зарцуулдаг болсон). Аудитаар засав: сешн cookie-оор л **бусдын царайг өөрийнхөөрөө солих** боломж (`enroll` дарж бичдэг байв; одоо нууц үг + одоогийн царай, `resetOwnEnrollment` устгасан), `distance` oracle, данс тус бүрийн царайны lockout (5/15 мин), токен төөрөгдөл (`typ` claim), загвар **шифрлэгдсэн** (`enc1:`), **анивчилт заавал** (liveness анхдагчаар блоклоно), `/face-approve` утасны хуудас CSS-гүй байсан (`face.css`), handoff-ийн тоог камераас өмнө шалгана, CSPRNG, challenge retention, IdleLockWatcher-ийн effect, камер цэвэрлэгээ, flash/LivenessTracker хог код. HISTORY.md 2026-09-22.
- (09-21, шөнө) **Толгой бүх хуудсанд + сагс хуудас бүрд ажилладаг** (7 хуудсанд сагсны дүрс "үхсэн" байв), **буруу хаяг → брэндийн 404 + HTTP 404** (`routeStatus.ts`, soft 404 арилав), **Dependabot-ийн 6 PR бүгд** (40 bump: React 19.3, tRPC 11.19, zod 4.6, Tailwind 4.3, `lucide-react` 1.x — брэнд лого `icons/BrandIcons.tsx`, `cookie` 2 — `parseCookie`, Actions v7). main chunk 152 → 165 KB gzip (React 19.3 `react-dom`); Lighthouse-ийн дараах хэмжилт машин сул үед. HISTORY 6m.
- (09-21, орой) **Төлөвлөгөөний 2–7-р хэсэг бүгд**: хүртээмж **Lighthouse 100** (6 хуудас, `useFieldErrors`), staging prod-ын 09-21-ний хуулбар (+ `db-restore.ps1`-ийн 2 бодит алдаа: нууц үг decode, кирилл `?` болдог), `window.confirm` 47 → **`useConfirm()` dialog**, reviews/questions/posts хуудаслалт + analytics 60 с кэш, **`server/db.ts` → `server/db/` 21 модуль** (barrel), 8 шинэ E2E spec + **coverage** (`pnpm test:coverage`), **"Ирэхээр мэдэгдэх" жинхэнэ** (0092, `back-in-stock` job, push + имэйл, бүх нөөцийн замаар), **сэтгэгдэлд зураг** (0093, nudity screen, admin "Зураг хасах"). Замдаа E2E олсон алдаа: карьерын анкетын талбарын алдаа хэзээ ч гардаггүй (`required` → `noValidate`), сагсны товчны aria-label латин нэр, хуучин үнэ 2.81:1. Дэлгэрэнгүй HISTORY 6f–6l.
- (09-21, үдээс хойш) **Утасны хурд — render delay арилгав** (батлагдсан төлөвлөгөөний 1-р хэсэг): **серверийн зурсан hero shell** (`server/_core/heroShell.ts`, зөвхөн `/`, React-ийн ижил class-уудаар `#root` дотор, `createRoot` арчина; `HERO_SHELL=0` унтраана), **`#storefront-bootstrap`** (site media + site text + promo → `initialData`, hero tRPC хүлээхээ болив, promo-ийн 40px CLS алга), аппын JS **`fetchpriority=low`** (vite plugin), лого 42→12 KB, **admin CSS `client/src/admin.css`-д** (index.css 290→267 KB), animejs/InstallGuide lazy, warm-up `load`+3 с, `home-family` зурвас lazy `<img>`. Хэмжилт (локал, утас, медиан): devtools throttling LCP **3.82 → 2.14 с** (оноо 61→77); production-тэй адил RTT дээр simulated **4.22 → 2.36 с (76→94)**. ⚠️ localhost дээрх simulated Lighthouse (RTT 0) shell-ийг харж чадахгүй тул тэнд LCP "муудсан" мэт харагдана — HISTORY 6e. Хамгаалалт: `e2e/hero-shell.spec.ts` (shell ↔ React rect тэнцүү). Дүрэм: толгой/hero markup солибол heroShell.ts-ийг мөн.
- (09-20/21) **Зарахад бэлтгэх: худалдан авагчийн багц + дэлхийн жишгийн цоорхойнууд** (Tom: *"10–20 саяар зармаар байна — худалдаж авсан хүн ойлгохгүй бол хэрэг байхгүй"*, дараа нь *"бүх бүтцийг, функц бүрийг нэг нэгээр зааварласан PDF"*). **[docs/SUGI-ASAYAKE-HANDOVER-MANUAL.pdf](SUGI-ASAYAKE-HANDOVER-MANUAL.pdf) — 72 хуудас**, 3 хэсэг (эзэн / ажилтан / хөгжүүлэгч), дотор нь **107 файл × 682 функц бүрийн тайлбар, 250 API цэг эрхтэйгээ**; жагсаалт бүр эх кодоос АВТОМАТААР (`docs/manual/extract.py` → `build_pdf.py`) тул гараар засахгүй, дахин үүсгэнэ. Шинэ: [docs/OWNER-HANDOVER.md](OWNER-HANDOVER.md) (14 данс, 3 сэргээгдэхгүй нууц, домэйн/брэнд солих checklist, лиценз, хүлээлцэх акт), [docs/OPERATIONS.md](OPERATIONS.md) (deploy, migration, backup/restore, мониторинг, **бүрэн `.env` загвар**); ADMIN-MANUAL-д дутуу байсан **7 хэсэг** нэмэгдэв. **Брэнд/эзний утгууд кодоос тохиргоо руу** (баримт PDF, бэлгийн картын имэйл, тайлан, төлбөрийн тайлбар, Brevo илгээгч, VAPID subject, PWA зааврын домэйн, FAQ) — `getSiteName()`; `merchantFeed` нь admin-ий нэрийг үл тоодог **алдаатай** байсныг зассан; `license` → **UNLICENSED**. **R2 зургийн backup анх удаа** (`scripts/oci/media-backup.mjs`), **migration бүртгэл** (`schema_migrations` + `db-migration-status.ts`). Storefront: үнэгүй хүргэлтийн явцын мөр, маягтын алдаа (WCAG 3.3.1), BreadcrumbList, буцаалтын dialog, сүүлд хайсан үгс. **Lighthouse анх удаа бодитоор** (доор). 🔴 **canonical бүх хуудсанд нүүрийг заадаг байсныг зассан**. E2E **192 passed** (шинэ: бүтэн checkout, storefront контраст, SEO). Дэлгэрэнгүй HISTORY.md.
- (09-20, орой) **Хайлт v3 + монгол нэр + санал болголт v3 — бүгд data-driven** (Tom: *"буруу бичсэн ч гарж ирдэг, брэнд хайхад амар, профайлын санал буруу, бүгдийг admin-аас editable"*). **Хайлт**: MySQL FULLTEXT → процесс доторх MiniSearch индекс (`server/search/`): typo (fuzzy), латин↔кирилл галиг хоёр чиглэлд ("кокочи"/"cocohi"/"priecla"/"сокамока" олдоно), синоним DB-д (`search_synonyms`, 148 мөр seed), брэндийн alias DB-д (`brand_aliases`, 55; `SSELECT`→`S-Select` зэрэг 11 бараа нормчилсон), баркод, брэнд/ангиллын мөр + "та … гэж хайсан уу", хайлтын лог (`search_queries`, PII-гүй) → **/admin → Хайлт** (статистик, 0 үр дүнтэй → синоним товч, толь CRUD, alias CRUD, "туршиж үзэх"). Индекс 984 бараа ~0.5 с build, хайлт <5 мс. Буцаах: `SEARCH_ENGINE=fulltext`. **Монгол нэр**: `products.nameMn` + `catalog-name-display` store setting (mn|latin, анхдагч mn — монгол нэр үндсэн гарчиг, латин дэд мөр; карт/quick view/дэлгэрэнгүй/сагс/толгойн хайлт); ⚠️ 984 нэрийг `scripts/generate-product-names-mn.ts` (Claude API) үүсгэнэ — **`ANTHROPIC_API_KEY` .env-д байхгүй тул хараахан ажиллуулаагүй**, admin-аас гараар ч бичиж болно. **Санал болголт v3**: `products.skinTypes` (олон утга/"all"; auto-tag-ийн 561 "normal" placeholder ХУУЛАГДААГҮЙ), `productType` (29 төрөл, дүрмээр 892/984), биеийн арчилгаа (асуулгын шинэ 4-р алхам + `bodySkinType`/`bodyConcerns` хоёр талд), жин **/admin → Дэлгүүрийн тохиргоо → "Санал болголт"**, карт бүр "яагаад" чиптэй, бэлгийн карт/хүнс/гэр ахуй саналд орохгүй, төрлийн хязгаар (8 маск биш), `getRecommendedProducts`-д анх удаа тест. Tagger v2 дүрмээр (Tom AI-г татгалзсан): арьсны төрлийн бодит дохио цөөн хэвээр (sensitive 31, dry 9, oily 7; бусад "all") — admin-аас засна. Migration 0087–0091 prod + staging хоёуланд. Дэлгэрэнгүй HISTORY.md.
- (09-20) **Бүтэн стекийн гүнзгий аудит + гүйцэтгэлийн төлөвлөгөө** — [docs/AUDIT-2026-09-20-full-stack.md](AUDIT-2026-09-20-full-stack.md) (9 аудитын захиалга нэг баримтад: алдааны стратеги, техникийн хог, DB масштаб, гүйцэтгэл TOP 10, орчны зөрүү, тестийн чанар, домэйн төлөв, AI drift, PHASE 0–6 төлөвлөгөө). **Зассан**: нэг сагс → хоёр захиалга race (guarded `active→converted`); production-д SQL/driver алдааны мессеж клиент рүү гардаг байсныг `errorFormatter`-оор маскалав; данс тус бүрийн login lockout (10 буруу/15 мин); login/checkout нь strict 8-аас 20/15мин/IP tier болов (CGNAT/оффис); 7 outbound fetch-д timeout; campaign `Promise.allSettled`; орхигдсон сагсны сануулга имэйл унасныг "илгээсэн" гэдэг байсан; төлбөрийн polling paid-ийн дараа зогсдог болов; SW `/icons /images /fonts`-ыг мөнхөд кэшлэдэг байсныг SWR болгов; production env fail-fast (`DATABASE_URL`) + warning. **PHASE 6 цэвэрлэгээ + PHASE 4-ийн батлагдсан давхардал** (Tom: *"phase 6 gaas ehleed uregjluul"*): устгасан нь `server/index.ts` (Manus-ийн хоёр дахь сервер entry), `client/public/sitemap.xml` (үхсэн Manus host — динамик route дардаг байсан), `careers-small.png`, `AdminDeltaPill`/`SectionEyebrow`/`useComposition`/`useMobile` + тэдний `.section-heading*` CSS, `AXIOS_TIMEOUT_MS`, `@assets` alias (хавтас нь байхгүй), wouter patch (`__WOUTER_ROUTES__`-ийг хэн ч уншдаггүй), `next-themes` / `@types/google.maps` / `autoprefixer` / `postcss` dependency. Үлдээсэн: `shared/job-application-form.ts` (баримтжуулсан ирээдүйн ажил), archive/root-ийн `.md`-ууд. Мөн батлагдсан давхардлыг нэгтгэв: `slugify` ×3 → `@shared/slugify`, `skinTypeLabels` → `@shared/catalog-filter`, `absoluteUrl` ×3 → шинэ `server/_core/publicUrl.ts`. ⛔ Утасны нормчлолыг НЭГТГЭЭГҮЙ — дөрвүүлээ зориудын өөр гэрээтэй (`normalizePhoneForVerifyMn` дурын 8 орон = нэвтрэлтийн identity; `normaliseMongolianMobile` зөвхөн `[5-9]` гар утас; `normalizePhoneForSms` E.164 гаргадаг). Батлав: `/sitemap.xml` ажиллаж буй production сервер дээр 1020 холбоостой; **бүтэн E2E 82 passed / 0 failed** (өмнө нь дэд багцаар л ажиллуулдаг байсан тул 4 уналт нуугдаж байсан: 3 нь аппын өөрийн rate limit, 1 нь mobile-ийн сонгогч). `limitApiTraffic` 300 → **1200**/15мин/IP (нотолгоо: өөрийн suite мөргөсөн + telemetry tier 600 зөвшөөрдөг зөрчил + Cloudflare 150/10с). ESLint-ийн ignore-д `playwright-report/**` зэрэг 3 хавтас нэмэв. ⚠️ NEEDS VERIFICATION: ML загварын RSS vs pm2 700M (`pm2 monit`). ⚠️ README `.env.example`-ийг холбодог ч файл байхгүй — Tom үүсгэнэ (туслах `.env*` бичих эрхгүй)
- (09-17) **Лого /admin-аас солигддог болов** — өмнө нь 3 компонентод хатуу бичигдсэн байсан (Tom: "logo solidog ym algadaa"). Одоо `brand-logo` / `brand-symbol` slot → /admin → Content & Media. Эхний зурагдалт `#brand-media` блокоос ирдэг тул анивчихгүй. ⚠️ **Хөтчийн таб ба утасны дүрс (`client/public/icons/*.png`, 6 файл) болон PWA screenshot 2 нь энэ slot-оос ХАМААРАХГҮЙ** — лого сольвол тэднийг гараар дахин үүсгэнэ
- (09-17) **Dependabot 40 → 0** — production талд эмзэг нь ердөө 2 байсан (`sharp@0.34.5`, `adm-zip@0.5.18`, хоёулаа `@huggingface/transformers`-ээр ирсэн), үлдсэн нь dev хэрэгсэл. `vite` 7.3.6 + `vitest` 4.1.11 + 9 шинэ override. Давтахгүйн тулд **`SUGI ASAYAKE Weekly Dependency Check`** (Даваа 10:00, `scripts/check-updates.ps1`, Windows toast-оор сэрэмжлүүлнэ, юу ч суулгахгүй)
- (09-16) **Автомат мэдэгдэл /admin-аас засварлагдана** — захиалгын 7 төлөвийн гарчиг/текст кодоос тохиргоо руу гарав ("Автомат мэдэгдэл (push)" бүлэг); бие нь хоосон = тэр төлөв унтарна, `push-order-notifications=0` = бүгд
- (09-16) **Админд дутуу байсан 3 устгалт** — барааны ангилал, нийтлэлийн ангилал, захиалга. Захиалга устгах нь `adminProcedure` + 4 хаалт (цуцлагдсан, төлөгдөөгүй, мөнгө/эрхийн мөргүй, нөөцийн нийлбэр 0) + аудитад хуулбар
- (09-16) **Мэдэгдлийг /admin-аас илгээх** — кампанит ажлын гурав дахь суваг (имэйл/SMS-ийн хажууд), дотоод холбоостой, илгээхийн өмнө бодит хүрэх тоо; `users.pushOptIn` (0086) нь зарыг захиалгын мэдэгдлээс салгана
- (09-16) **Мэдэгдэл авах гарц** — push 09-13-аас ажиллаж байсан ч бүртгэл 0 байв (зөвшөөрөл асуух гарц зөвхөн /profile дотор нуугдсан). ☰ цэс + footer-т товч; iPhone-д "дэмждэггүй" биш "эхлээд суулгана уу"
- (09-16) **Сайтыг апп болгон суулгах** — ☰ цэсний эхний мөр ба footer-т "Аппаар суулгах" (компьютер + Android жинхэнэ цонх, iPhone-д зурагтай 4 алхамт заавар); manifest-д `id` ба `screenshots`. PWA нь 09-13-аас бэлэн байсан ч **суулгах гарц байгаагүй**
- (09-16) **Камергүй компьютер дээр admin-д нэвтрэх QR handoff** (0085) — утсаар царайгаа уншуулж компьютероо нээнэ; [docs/FACE-HANDOFF-PLAN.md](FACE-HANDOFF-PLAN.md)
- (09-16) **E2E тест анх удаа** (Playwright, 54 тест, компьютер+утас) — замдаа 9 бодит алдаа олж зассан, тэдгээрийн нэг нь **variant нэмэх admin-аас хэзээ ч ажилладаггүй байсан** (үүрлэсэн `<form>`)
- (09-16) **CI НОГООН боллоо** (42 → 0 уналт) — `openId` гинжийн засвар, `ci-seed`-д лавлах ангилал, хатуу бичсэн ID-ууд, ба секундын нарийвчлалаас үүдэлтэй 3 аппын алдаа. `scripts/ci-local.ts`-ээр CI-г эндээс давтана
- (09-16) **Ачааллын бэлтгэл** — pool 25, кэшийн single-flight, cluster-д аюулгүй, Cloudflare cache rules, k6; **эхний ачаалалт 188 → 152 KB gzip**; **купоны хязгаар атомик (0084)**; admin AA контраст; "Хамт авдаг" cross-sell; Dependabot
- (09-16) **Мерчандайзингийн судалгаа** — [docs/MERCHANDISING-PLAN.md](MERCHANDISING-PLAN.md): бодит тоо (983/984 бараа нэг ч удаа зарагдаагүй, 975 нь `stockQuantity=20` жишиг утга), 4 сохор цэг, Bitrix24-тэй харьцуулалт, 5 үе шаттай төлөвлөгөө. **Tom-оос 3 шийдвэр хүлээж байна** (§8)
- (09-15) **Хэмжилт (GA4/Pixel) дэлгэц**, Smart Software холболтын карт, **вендорын үлдэгдэл автомат** + үнэ/факт батлах дэлгэц (0083)
- (09-15) **Токен хэмнэлт** — энэ гарын авлага 165 KB → ~25 KB; дүрэм: [docs/TOKEN-USAGE.md](TOKEN-USAGE.md)
- (09-14) **Zochil-той харьцуулалт** — /about, /careers хуудас, ажлын байрны зар (`job_postings`, 0081) + ирсэн анкет (`job_applications`, 0082), барааны QR код, YouTube холбоос
- (09-14) **Танилцуулга v4** (`docs/SUGI-ASAYAKE-presentation-v4.pptx`) — 16 хэсэг, 46 frame, Morph, QR
- (09-14) **8 дутагдал нэг дор** — зочны checkout OTP, гар захиалга, GA4/Pixel, барааны факт, сэтгэгдэл хүсэх job, буцаалтын хүсэлт, staging, Messenger товч
- (09-14) **Бэлгийн карт checkout-оор** (0076), **cache + орхигдсон сагсны push**, **OG карт**, **/help**
- (09-13) **Oracle HeatWave Токио руу нүүсэн**, **сайт VM дээр**, **царай таних MediaPipe**, **Q&A/PDF/push/FB login/PWA**
- (09-12) **Нүүр Cosme Kitchen редизайн**, **dark theme**, **хэл солих 3 хэл**, **forensic аудит**, **SQL injection үнэлгээ**
- (09-11) **Linen палитр**, **ntfy push + нөөцийн ledger + сканнер + шилжүүлэг**

## ⚠️ Admin эрх хэн авдаг вэ — bootstrap логик (`server/db.ts`-ийн `createUserWithPassword`)
**(2026-10-01-ээс) Бүх шинэ бүртгэл `"user"`** — "эхний хэрэглэгч автоматаар admin" дүрэм ХАСАГДСАН (count→insert race, хоосон DB-д түрүүлж бүртгүүлсэн нь admin болдог). Анхны admin-ийг серверт хандах эрхтэй хүн `pnpm exec tsx scripts/make-admin.ts <утас> [--staging] [--dry-run] [--yes]` (staging биш схемд `--yes` заавал)-аар оноодог (олдохгүй хэрэглэгч үүсгэхгүй; sessionVersion+1). Шинэ тест/seed admin хэрэгтэй бол `role`-ийг шууд DB-д тавина (`e2e/helpers/session.ts`, `faceAuth.integration.test.ts` шиг). Доорх хуучин тайлбар түүхийн зорилгоор:

(хуучин, ХҮЧИНГҮЙ) Шинээр бүртгүүлж буй хэрэглэгч **admin** эрхтэй болдог ЗӨВХӨН `users` хүснэгт хоосон үеийн хамгийн ЭХНИЙ хэрэглэгч (утсаар бүртгүүлсэн; Facebook-оор үүссэн данс хэзээ ч admin болдоггүй). ⚠️ (2026-09-27-нд кодоос шалгав) `OWNER_EMAIL`-ээр admin болгох зам кодод БАЙХГҮЙ — утсаар нэвтрэх болсноос хойш хасагдсан (`server/db/users.ts`-ийн тайлбар); `OWNER_EMAIL` нь зөвхөн эзэнд очих имэйл мэдэгдэл ба VAPID subject. Бусад бүх шинэ бүртгэл энгийн `"user"` эрхтэй. `staff`/`admin` эрхийг зөвхөн одоо байгаа admin гараар л оноож болно.

⚠️ **Production/deploy хийхээсээ өмнө заавал шалгах:** `.env`-ийн `OWNER_EMAIL=t.morius@gmail.com` байх ёстой (placeholder-оор биш).

## ⚠️ Чухал сануулга: integration test-үүд бодит production slot/контент ашиглахгүй байх
`site-media.integration.test.ts` өмнө нь бодит `home-hero` slot-ыг шууд ашиглаж, `afterEach`-д болзолгүй устгадаг байсан тул тест ажиллуулах БҮРТ Tom-ий бодит upload-ийг DB-ээс устгаж байсан (2026-08-26, дэлгэрэнгүй HISTORY.md). Одоо snapshot-and-restore болгож заслаа. **Ирээдүйд шинэ integration test бичихдээ**: бодит хэрэглэгчийн харах/удирдах өгөгдөл (site_media slots, бодит admin тохиргоо гэх мэт) дээр тест хийвэл заавал snapshot-and-restore хэлбэрээр бичих, эсвэл тусад нь throwaway өгөгдөл (marker-tagged) ашиглах — хэзээ ч бодит slot/мөрийг болзолгүй устгах/дарж бичихгүй байх.

## ⛔ Хэзээ ч зөрчиж болохгүй дүрмүүд

Эдгээр нь бодит incident-ээс гарсан. Дэлгэрэнгүй шалтгааныг HISTORY.md-ийн ижил
нэртэй хэсгээс үзнэ.

**⚠️ 0. Юуны өмнө — 2026-09-16-ны таван алдааны НЭГ шалтгаан**

Тэр өдөр Tom таван удаа алдаа заав: QR хаалга (хөтөч дээр ажиллуулаагүй),
суулгах товч (утсан дээр олдохгүй), iOS-ийн заавар (буруу), мэдэгдэл 5 удаа
давхарласан, гарчгийн шрифт (асуулгүй сольсон). Бүгдийн шалтгаан НЭГ:

> **Код зөв ажиллаж байгааг шалгасан, харин ҮР ДҮН нь хэрэглэгчийн талаас
> зөв эсэхийг шалгаагүй.**

Тиймээс "дууссан" гэдэг нь дараах дөрвийг ХАМТАД нь хангасныг л хэлнэ:

1. **Хэв загварын шийдвэрийг эзэн нь гаргана.** Шрифт, өнгө, байрлал, аяыг
   техникийн шалгуураар (жишээ нь "энэ шрифт кирилл бүрэн") сонгож болохгүй —
   Tom-оос жишээ/зөвшөөрөл авна. Ажлын жагсаалтад байгаа нь зөвшөөрөл БИШ.
   (2026-09-09-ний "чиглэлгүй редизайн" татгалзал, 09-16-ны шрифт — нэг алдаа
   хоёр удаа.)
2. **Олдох эсэхийг олох ёстой хүний байрнаас шалгана.** "Элемент DOM-д байна"
   нь хангалтгүй: утсаар ороход тэр товч хаана байх вэ? Footer нь утсан дээр
   хэдэн дэлгэц доор байдаг.
3. **Платформын зааврыг эх сурвалжаас нь шалгана**, ойн санамжаас бичихгүй —
   ялангуяа Tom-ийн өөрийнх нь ашигладаг OS хувилбар дээр (iOS Safari-ийн
   Хуваалцах товч 26/27 дээр байрлалаа сольсон).
4. **Нэг төлөвийг хоёр газар зурвал төлөв нь ХУВААЛЦСАН байна.** Салангид
   төлөвтэй хоёр товч → давхар илгээлт. Салаа бүрийг тест хийгээд харилцан
   үйлчлэлийг орхивол баригдахгүй.

**Брэнд студи, баяр (2026-10-05)**
- **Storefront-ийн өнгийг шинэ кодонд hex-ээр БИЧИХГҮЙ — `var(--primary)` гэх мэт токен** (`shared/theme-tokens.ts`). Шинэ токен нэмбэл `LIGHT_TOKEN_KEYS` + `BASE_THEME` + index.css гурвуулаа (`theme-tokens.test.ts` тулгана); текстийн токен бол `CONTRAST_PAIRS`-д хос нэм.
- **Баярын постер `home-hero` слотыг ЗӨВХӨН `withHolidayPoster()`-оор солино** — indexHtml ба `content.siteMedia` хоёуланд; өөр газар солибол React ирэх мөчид hero үсэрнэ. Мэндчилгээний markup heroShell ↔ HeroSection ижил.
- **Шинэ хүснэгт нэмбэл `scripts/new-owner-reset.ts`-ийн `TABLE_GROUPS`-д ангил** (харилцагчийн өгөгдөл бол `customerData`) — эс бөгөөс `new-owner-reset.test.ts` унана, скрипт production дээр татгалзана.
- **indexHtml-ийн шинэ placeholder нэрэнд тоо бичихгүй** — загварын regex `[A-Z_]+` (`%SITE_ICON_64%` орлогдохгүй HTML-д үлдсэн, 2026-10-06).
- **Устгадаг скрипт `refuseProductionDatabase(name, <ЯГ холбогдох URL>)`** — `DATABASE_ADMIN_URL`-аар холбогдвол түүнийг шалга.
- **Брэнд фонт нэмбэл**: `shared/fonts.ts` + `scripts/fetch-brand-fonts.ts` + `client/public/fonts/OFL.txt`-д зохиогчийн эрх; Reserved Font Name-тэй фонт (IBM Plex г.м.) ОРУУЛАХГҮЙ; `brand-fonts.spec.ts` монгол глифийг хэмжинэ.
- **Theme/баярын зураг репод биш R2-д** (`themes/…`, `scripts/upload-theme-assets.ts`); постер солих бол `HOLIDAY_POSTER_VERSION` ахиулна (immutable кэш).
- **Брэндийн нэрийг client кодонд бичихгүй — `brandName()` / `brandTitle("Хуудас")`** (`client/src/lib/brand.ts`); `brand-name-guard.test.ts` барина. Сервер талд `getSiteName()`.
- Хатуу брэнд hex орвол `theme-hex-guard.test.ts` унана → `pnpm exec tsx scripts/codemod-hex-to-tokens.ts --write`. Хүчтэй улаан = `var(--primary-strong)`.
- **Нүүрэнд шинэ хэсэг нэмбэл `shared/home-sections.ts` (`HOME_SECTIONS`) ба Home.tsx-ийн `sections` map хоёуланд** — эс бөгөөс админ нууж/дараалж чадахгүй. Hero layout-д ОРОХГҮЙ (shell).
- Брэнд токен /admin, /face-approve-д кодын суурь (`isAdminPath`, indexHtml) — admin UI баярын загвараар солигдохгүй.
- Монгол соёлын зураг (Gemini): судалгаа + бодит лавлагаа зураг + сөрөг жагсаалт; Gemini API зөвхөн зураг үүсгэхэд.

**Хайлт, санал болголт (2026-09-20)**
- Синоним, брэндийн alias кодонд БИЧИХГҮЙ — DB (`search_synonyms`, `brand_aliases`, /admin → Хайлт). Кодын `DEFAULT_*` жагсаалт зөвхөн seed.
- Бараа/ангилал бичдэг шинэ зам `invalidateCatalogSource()` дуудна (каталог + хайлтын индекс) — эс бөгөөс 60 с хуучин үр дүн.
- Барааны нэр ХОЁР: `name` (латин, POS/захиалга/eBarimt — хэзээ ч солихгүй) ба `nameMn` (харагдац). Storefront `useProductName()`-оор л харуулна, `product.name`-ийг шууд бичихгүй.
- `products.skinType` (ганц) биш `skinTypes` (олон/"all") — санал болголт хоёуланг уншдаг ч шинэ tag `skinTypes`-д. Placeholder "normal" ХЭЗЭЭ Ч бичихгүй.
- Санал болголтын жин кодонд биш store setting (`reco-*`). Шинэ дохио нэмбэл `explainPreferenceMatch`-д reason-тэй нь нэм.
- **`users`-д бичдэг шинэ зам `forgetSessionUser` дуудна** — зөвхөн эрх биш, ямар ч профайлын талбарт. Сешн 5 секунд кэштэй тул үүнгүйгээр хадгалсан өөрчлөлт хэрэглэгчид тэр хугацаанд харагдахгүй (2026-09-20-нд нэр/утас/зураг/тохиргоо дөрвүүлээ ийм байсан).
- **`pnpm build`-ийн exit code-ийг ШУУД шалга** — `build | tail && e2e` нь build уналтыг залгидаг тул E2E хуучин bundle дээр ажиллана (2026-09-20).

**Зарах бэлтгэл, брэнд (2026-09-20/21)**
- Харилцагчид харагдах **брэнд/домэйн/утасны утгыг кодод хатуу бичихгүй** — `getSiteName()` (server) эсвэл тохиргооны slot. Шинэ эзэн /admin-аас сольсон ч хуучин нэр гарах эрсдэл.
- **Шинэ хуудас нэмэхэд canonical өөрийнх нь зам болохыг шалга** (`e2e/seo.spec.ts`). 2026-09-21 хүртэл бараа/нийтлэлээс бусад БҮХ хуудас нүүрийг заадаг байв.
- Гуравдагч эзэнд шилжүүлэх боломжтой байлгах: шинэ **гадаад данс** нэмбэл [OWNER-HANDOVER.md](OWNER-HANDOVER.md)-ийн хүснэгтэд, шинэ **сэргээгдэхгүй нууц** гаргавал тэндхийн "3 нууц" хэсэгт мөн нэм.
- PDF гарын авлагыг **гараар засахгүй** — `python docs/manual/extract.py && python docs/manual/build_pdf.py`.

**Bug аудитаас гарсан дүрмүүд (2026-09-23)**
- **Мөнгө олгодог шинэ зам захиалга бодитоор ТӨЛӨГДСӨН эсэхийг шалга** (`isOrderSettled`) — "захиалсан" гэдэг нь COD-ээр нээж, авчихаад цуцлаж болно гэсэн үг.
- **Утас (`users.phone`) нь нэвтрэлтийн identity** — SMS баталгаажуулалтгүйгээр бичдэг ШИНЭ зам гаргахгүй (`attachPhoneFromVerifiedSession` л бичнэ). Шалтгаан: зочны checkout OTP `ctx.user.phone` байхаас хамаардаг.
- **Нэг удаагийн сесс/тасалбарыг ҮЙЛДЛИЙН ӨМНӨ атомаар эзэмш** (guarded UPDATE + `affectedRows`), дараа нь биш; үйлдэл уначихвал суллана. Буцаах утгыг хаяхгүй.
- **Провайдерийн callback нь НЭВТРЭЛТГҮЙ GET** — төлбөр ороогүй хариунд `payment_attempts`-ийн `responseJson`-ыг дарж бичихгүй (нэхэмжлэл дахин ашиглах цоож), "хараахан батлаагүй"-г `failed` болгохгүй, `provider`-ыг МӨН тааруул.
- **Нөөц хасагдаагүй мөрийг буцаахгүй**: `products.kind === "gift_card"` мөр checkout/POS/гар захиалгад нөөц хөндөхгүй тул цуцлалт/буцаалт/POS-д ч хөндөхгүй.
- **Захиалгын `fulfillingBranchId` нь нөөц ХААНААС хасагдсаныг хэлнэ** — мөр байхад түүнийг солихгүй (эсвэл хоёр талын нөөцийг зөө).
- **Төлөгдсөн захиалгын дүнг дахин бодохгүй** (`subtotal/deliveryFee/total`) — мөнгө хөдлөөгүй байхад тайлан хөрнө.
- **"Дууссан" → `paid` нь зөвхөн webhook-гүй аргад** (`WEBHOOK_PAID_METHODS`: qpay, storepay).
- **Урт циклтэй илгээлтийн давхар хамгаалалт циклээс ӨМНӨ тэмдэглэгээ үлдээнэ** (`campaign.started`) — дараа бичсэн тэмдэглэгээ давхар товшилтыг барихгүй.
- **Хоёр лаптоп + prod нэг DB**: мэдэгдэл илгээдэг job мөрөө илгээхийн ӨМНӨ эзэмшинэ (`claim…`), процесс доторх тэмдэглэгээ хүрэлцэхгүй.
- **Талбарын түвшний эрх нэг цэгт биш** — жагсаалт нуусан талбарыг (`costMnt`) дэлгэрэнгүй/export/CSV ч нуух.
- **Админы маягт СЕРВЕР рүү өөр утгатай талбар илгээж болно**: барааны `stockQuantity` нь маягтад НИЙЛБЭР, серверт "үндсэн салбарын үлдэгдэл" — өөрчлөгдөөгүй талбарыг илгээхгүй.
- **react-query-ийн мөр Date талбартай бол refetch бүрт ШИНЭ объект** — `useEffect([row])`-ээр маягт үрждэг код хадгалаагүй засварыг чимээгүй хаяна. Түлхүүрээр (`id`) нэг удаа үрж.
- **Процесс доторх кэш бүр ХЯЗГААРТАЙ** (`ttlCache`) — түлхүүр хэрэглэгчийн замаас бүтэх бол 404-ийг кэшлэхгүй.
- **Хэрэглэгчийн хайлтын үгийг LIKE-д `escapeLike()`-гүйгээр хийхгүй**; `%`/`_` нь орлуулагч.
- **zod-ийн алдаа клиент рүү JSON-оор гардаггүй** — `maskErrorShape` монгол өгүүлбэр болгоно; шинэ талбар нэмбэл `FIELD_LABELS_MN`-д нэр нэм.
- **"Байгаа эсэхийг хараад бичих" нь нэвтрэлтгүй замд ЦООЖ биш** — `FOR UPDATE` транзакц эсвэл UNIQUE индекс дээрх INSERT (бэлгийн карт давхар, кампанит давхар илгээлт хоёулаа ингэж гарсан).
- **Засвар бүрийг тусдаа шалгагчаар diff-ээр уншуул** (2026-09-23: 96 засвар 18 шинэ регресс оруулсан, дотор нь мөнгөний гарз).
- **Бүрэн suite-ийг ДУНДУУР нь зогсоовол** `afterAll` ажиллахгүй → (2026-09-23-аас) `sugi_staging`-д fixture үлдэнэ. Зогсоосон бол заавал `test-residue-report.ts --staging` ажиллуул; шинэ integration тест бичвэл fixture-ынхаа нэрийг `TEST_PRODUCT_PATTERNS`-д нэм.

**Өгөгдлийн сан, мөнгө**
- **Захиалгын мөр бичдэг/төлөв солидог ШИНЭ зам бүр `recordOrderEvent(tx, …)` дуудна** (`server/db/order-events.ts`, 2026-10-05, 0101) — ижил транзакц дотор, актор нь хэн (харилцагчийн өмнөөс `updateAdminOrder` дуудвал `actor: { kind: "customer" }`), payload-д нэр/утас/хаяг ХЭЗЭЭ Ч биш. Мартвал /admin → Процесс "түүхгүй захиалга N" тоолуур ба `order-events.integration.test.ts` барина.
- **Хуучин кодоор уншигдахгүй багана/хүснэгт нэмсэн migration бүрийг `server/_core/migrationCheck.ts`-ийн `REQUIRED_MIGRATIONS`-д нэм** — production сервер түүнгүй DB дээр эхлэхгүй (0098/0099 чимээгүй унасны сургамж); `migrationCheck.test.ts` сүүлийн файлтай тулгадаг тул мартаж чадахгүй.
- Scheduler job-ийн `run()` `{ affectedCount }` буцаавал `job_runs`-д (0102) харагдана; ажиллалт бүр хост#pid-тэй бичигддэг.
- **Хэрэглэгчид үнэ харуулдаг / захиалгын мөр бичдэг ШИНЭ зам бүр `withLiveCampaign()` эсвэл `priceLinesForOrder()`-оор** (`server/db/price-campaigns.ts`, 2026-09-29) — эс бөгөөс нийтийн хямдралын үеэр тэр газар хуучин үнэ харуулна/авна. Мөрөнд `kind` сонго (бэлгийн карт хасагдах ёстой).
- **`server/db.ts` нь barrel** (2026-09-21) — бодит код `server/db/<домэйн>.ts`-д (CODEBASE §3.1 хүснэгт). Шинэ функцийг тохирох файлд, шинэ файл үүсгэвэл barrel-д мөр нэм. Модулийн түвшинд (top-level const) хажуугийн модулийн утга ашиглахгүй (тойрог import).
- Шинэ `sql.raw` БИЧИХГҮЙ — `server/_core/sqlSafe.ts`-ийн `sqlInt()` ашиглана.
- **Өдрөөр бүлэглэх бол `storeDaySql(col)` / JS-д `storeDayString(date)`** (`server/db/connection.ts`, 2026-09-23) — `date(createdAt)` нь UTC өдөр (session `+00:00`) тул 08:00-аас өмнөх захиалга өмнөх өдөрт ордог. Клиентэд `toISOString().slice(0,10)` биш `toDayInput()`.
- **Кэш цэвэрлэлтийг бичих ЗАМ БҮРТ** — нэг функц хэд хэдэн бичих салаатай бол (шинэ мөр / байгаа мөр шинэчлэх / id-аар) салаа бүрийн дараа. 2026-09-23: синонимын 3 салааны 1-д л байсан.
- **Төлөв шилжүүлдэг UPDATE бүр `WHERE <хуучин төлөв>` + `affectedRows === 1`** — сагсны `active→converted` үүнгүй байснаас хоёр tab хоёр захиалга үүсгэж чадаж байв (2026-09-20).
- **Гадагш `fetch` бүр `AbortSignal.timeout`-той** (2026-09-20) — timeout-гүй провайдер checkout-ийг хязгааргүй барина.
- **Клиент рүү очих алдааны мессеж = хэрэглэгчид зориулсан монгол өгүүлбэр л** — production-д INTERNAL/driver-хэлбэртэй мессеж `INTERNAL_ERR_MSG` болно (`maskErrorShape`, `server/_core/trpc.ts`); `catch → BAD_REQUEST(error.message)` ороолтод driver алдаа дамжуулахгүй.
- `branch_stock`-д шууд бичихгүй — `applyBranchStockDelta` / `setBranchStockAbsolute` / `recordStockMovement`.
- Захиалга бичдэг шинэ зам бүр `clientRequestId` (idempotency) авна.
- Борлуулалтын тоо `settledSaleSql` (`paid AND status<>'cancelled'`) — өөрөө нөхцөл бичихгүй.
- Барааны үнэ ХОЁР газар (`products.priceMnt` + `product_variants.priceMnt`) — шинэ зам хоёуланг бичих эсэхийг шалга.
- Вендорын үлдэгдэл **автоматаар** нөөц болдог (`vendor-stock-auto-apply=1`) ч зөвхөн тооллогын замаар — `postCount(..., { automatic: true })`. Шинэ автомат бичигч гаргахгүй.
- Store setting-д формат шаардлагатай бол `format` slot-д бич — regex-ийг хоёр дахь газар хуулахгүй (`checkStoreSettingFormat`).
- zod update schema-д `.partial()` биш **`partialForUpdate()`** (zod 4-д `.default()` partial дотор ч хэрэгждэг).
- Migration нэг нэгээр: `pnpm exec tsx scripts/db-apply-migration.ts drizzle/00NN_*.sql` (admin эрхээр, `DATABASE_ADMIN_URL`).
- **`schema_migrations` бүртгэл 2026-09-21-ээс бүрэн** (92/92 prod ба staging) — `scripts/db-migration-status.ts [--staging]` одоо жинхэнэ дутууг л харуулна; гараар/өөр замаар ажиллуулсан migration-ийг `--mark-applied`-аар бүртгэ.
- **`db-restore.ps1` 2026-09-21-ээс л бодитоор ажилладаг** (нууц үг URL-decode, кирилл-аварсан `source`) — өмнөх хувилбараар сэргээсэн DB-д монгол нэр `?` болсон байж болно.
- **Хуудаслалттай query бүрт тогтвортой эцсийн тэнцвэр** (`id`) — `createdAt` тэнцүү
  мөрүүдийн дарааллыг MySQL баталгаажуулдаггүй тул худалдан авагч нэг барааг хоёр
  хуудсанд харах, эсвэл огт харахгүй өнгөрөх боломжтой (2026-09-16).
- **staging схемд migration автоматаар ОЧИХГҮЙ**: `deploy.ps1 -Staging` зөвхөн кодыг
  зөөдөг. Шинэ migration бүрийг `sugi_staging`-д мөн гараар ажиллуул (DATABASE_ADMIN_URL-ийн
  замыг солино) — эс бөгөөс staging чимээгүй 500 өгнө.

**Admin, аюулгүй байдал**
- **Гадагш HTTP (хэрэглэгч/админ тохируулсан хост руу) `server/_core/safeHttp.ts`-ийн `safeRequest`-ээр** (2026-10-01) — DNS-ийн дараах хувийн IP-г хаана, redirect дагахгүй, байтын хязгаар. Энгийн `fetch` нь redirect дагаж, нэрээр нь л шалгадаг тул SSRF. Хариуг `fetch`-ээр уншвал `readBodyWithLimit`.
- **Хувь хүний файл (CV, баримтын зураг) `storagePutPrivate` / `storageGetSignedUrlPrivate`-аар** — нийтийн bucket-д бичвэл түлхүүрийг мэдсэн хэн ч `S3_PUBLIC_BASE_URL`-аар шууд татна. Шинэ хувийн угтвар нэмбэл `storageProxy.ts`-ийн `NON_PUBLIC_KEY_PREFIXES`-д мөн.
- **`/api/trpc/` зам нэг л сегменттэй** (`trpcBatchGuard.ts`): tRPC процедурын нэрийг сүүлийн `/`-ийн дараахаас авдаг тул `/api/trpc/x/admin.users` Access-ийг тойрдог байв; admin./inventory.-г бусадтай нэг batch-д холихгүй (клиент `splitLink`). Шинэ эрхтэй router нэмбэл `PRIVILEGED_PREFIXES`-д нэм.
- **`NOTIFICATIONS_SUPPRESS=1` нь имэйл/SMS/push-ийг бүгдийг гадагш явуулахгүй** — тестэд илгээгдсэн мессежийг console биш `getSuppressedOutbox()`-оос шалга. Fallback лог мессежийн биеийг ХЭЗЭЭ Ч бичихгүй (бэлгийн картын код орж байсан).
- Шинэ admin procedure бичихдээ `protectedProcedure` БИШ, role builder (`adminProcedure`/`marketingProcedure`/…) — эс бөгөөс царайны proof шалгагдахгүй.
- Session-ий эрх өөрчилдөг шинэ бичигч `forgetSessionUser` дуудна (5 секундын cache).
- Шинэ tRPC client/fetch зам `x-admin-tab` header дамжуулна (`adminTabId()`).
- Мэдэгдэлд харилцагчийн нэр/утас/хаяг ХЭЗЭЭ Ч оруулахгүй (ntfy сэдэв нээлттэй).
- **Царай эхлүүлдэг/бүртгэдэг/QR нээдэг шинэ procedure бүр `assertReauthProof`** (нууц үгийн step-up, 2026-09-22) — эс бөгөөс 365 хоногийн сешн cookie дангаараа царай руу хүрнэ.
- **Нэг түлхүүрээр гарын үсэг зурдаг шинэ JWT бүр өөрийн `typ`-тэй, уншигч нь `typ`-ийг шалгана** — өмнө нь царайны proof-ийг сешн cookie болгож тавихад бүтэн сешн болдог байв.
- **Царайны зай (`distance`)-ийг клиент рүү БУЦААХГҮЙ** (hill-climbing oracle) — зөвхөн `face_attempts`-д.
- **Admin табын id (`adminTab.ts`) хуулбарласан/сэргээсэн таб дээр шинэчлэгдэнэ** (2026-09-23): `back_forward` ачаалалт болон BroadcastChannel-ийн давхцал. ЗОРИУДЫН арилжаа: /admin-аас бүтэн хуудсаар гарч (гадаад холбоос) Back дарахад bfcache-гүй бол нууц үг + царай дахин асууна — сэргээсэн таб ба Back-ийг хөтөч ялгадаггүй. Хуулбар таб эхний хэдэн хүсэлтээ хуучин id-аар явуулдаг (channel асинхрон) тул энэ нь нэмэлт хамгаалалт, цорын ганц биш — 25 минутын идэвхгүй хугацаа үндсэн хаалт хэвээр.
- **Logout = нэг төхөөрөмж (2026-10-01)**: сешн JWT `jti`-тай, `auth.logout` түүнийг `session_revocations`-д бичнэ (`resolveUserFromToken` шалгана, хугацаа дууссан мөрийг `data-retention` job устгана). jti-гүй хуучин токен → `bumpUserSessionVersion`. Шинэ JWT-д ИЖИЛ түлхүүрээр гарын үсэг зурвал өөрийн `typ`-тай байх ёстой.
- **Нууц үг шалгадаг шинэ зам `verifyPasswordWithLockout`-аар** (`server/routers.ts`, данс тус бүрийн lockout, `COUNTED_LOGIN_FAILURE_REASONS`-д reason нэм) — зөвхөн IP-ийн tier хангалтгүй. Утас солих, Facebook холбох нь нууц үг шаарддаг; Facebook холбох нь `startFacebookLink`-ийн intent cookie-тэй л.
- **Panel эрхтэй (role != "user") сешн `createContext`-д КЭШГҮЙ дахин уншигдана** (`server/_core/context.ts`) — 5 секундын `getSessionUserById` кэш олон worker-т түр хаалт/эрх өөрчлөлтийг хоцроодог. Царайн proof/step-up JWT-д `fgv` claim (`users.faceGrantVersion`); царай lock/дахин бүртгэл/баталгаажуулалт бүр `bumpFaceGrantVersion` (эсвэл `issueFaceProof`/`rotateFaceGrant`).
- **Хэн ч бүртгүүлээд admin болохгүй**: анхны admin `scripts/make-admin.ts <утас>`-аар.
- **`INTEGRATIONS_ENCRYPTION_KEY` бүх машин дээр ИЖИЛ** — царайны загвар үүгээр шифрлэгдэнэ; зөрвөл нөгөө машин "дахин бүртгүүлнэ үү" гэнэ.

**Frontend**
- **Storefront-ийн шинэ CSS `client/src/styles/`-д (2026-10-18), index.css-д БИШ** — `storefront.css` (main.tsx-ээс index.css-ийн ДАРАА) ба `routes/*.css` (lazy хуудас өөрөө импортлоно). Гэрээ (`server/storefront-ui-guard.test.ts` тулгана): сонгогч `.sugi-site …`/`.sf-portal …`-оор эхэлнэ, класс `sf-` угтвартай ба нэрэнд `-card`/`-panel`/`-dialog`/`-section`/`rounded-`/`shadow-` ОРОХГҮЙ (index.css-ийн `[class*=]` шүүрдэлт), өнгө зөвхөн токен, шинэ хувьсагч `--sf-*`, `font-family` зөвхөн `var(--font-…)`. Eager модуль (Home, толгой, CartDrawer …) CSS импортлохгүй. Бүрэлдэхүүнийг шинэчлэхдээ хуучин дүрмийг нь index.css-ээс УСТГА (5 дахь давхарга бүү нэм).
- **framer-motion зөвхөн `components/motion/MotionProvider.tsx`-ийн дотор `m.*`** (LazyMotion `strict`) — `motion.*`/`domMax`-ийг ESLint хориглоно; eager графт орвол guard тест унана. `layout`/`layoutId`/`drag` байхгүй (domAnimation). Чухал агуулгад `initial` = харагдах төлөв (`initial={false}`).
- **Барааны карт НЭГ: `components/product/ProductCard.tsx`** (grid/shelf/compact) — шинэ газар бараа харуулахдаа үүнийг ашигла; нөөц/брэнд/хямдрал `shared/product-card.ts`. UI TripleD-ээс зөөсөн код `components/uitripled/`-д, толгойд эх URL + sha256, `THIRD_PARTY_NOTICES.md`-д мөр.
- **Шинэ storefront хуудас нэмбэл `server/_core/routeStatus.ts`-ийн `STATIC_ROUTES`-д МӨН нэм** — эс бөгөөс сервер тэр хуудсыг HTTP 404-өөр өгнө (`route-status.test.ts` App.tsx-тэй зөрөхөд унана).
- **Толгойд `onCartOpen` дамжуулахгүй бол толгой сагсаа өөрөө удирдана** — сагсны тоо/drawer-ийг хуудас бүрт гараар бичих хэрэггүй.
- **Брэнд лого (Facebook/Instagram/YouTube) `@/components/icons/BrandIcons`-оос**, `lucide-react`-аас биш (1.x-д байхгүй).
- **Хэмжилт (GA4/Pixel) руу `location.href` БҮТНЭЭР нь явуулахгүй** — `analytics-init.js`-ийн `safeLocation()`; admin/царайны хуудас хэмжигдэхгүй (2026-09-23: /face-approve?token= Google руу явдаг байв). Шинэ нууц query параметр нэмбэл `SECRET_PARAMS`-д нэм.
- **Хэрэглэгчийн текстийг CSV руу `downloadCsv`-оор л** (томьёоны injection-ий хамгаалалттай).
- **Хугацаагаар хязгаарласан ачааллын хязгаар нь ЗӨВХӨН тэр алхмыг хэмжих ёстой** — царайны загварын татаалт (том файл) ба instance үүсгэлт тусдаа (`faceTracker.ts`). Хугацаа хэтэрсэн ч ард ажилласаар байгаа амлалтын үр дүнг суллах (`close()`).
- **`window.confirm`/`window.prompt` БИЧИХГҮЙ** — `useConfirm()` (`components/ConfirmDialog.tsx`, async: `await confirm({ title, danger })`). E2E-д `acceptConfirm(page)`, `page.once("dialog")` биш (2026-09-21, 47 газар хөрвүүлсэн).
- **Маягтын алдааг талбар дээр нь** — `hooks/useFieldErrors.tsx` (`fieldProps`/`FieldError`/`showErrors`); toast дангаараа хангалтгүй (WCAG 3.3.1). Талбарын `id` = алдааны түлхүүр.
- **aria-label нь харагдах текстээ АГУУЛНА** (WCAG 2.5.3) — тоон badge-ийг `aria-hidden`, глиф/дүрсийг SVG. Lighthouse `label-content-name-mismatch` оноонд нөлөөлдөггүй ч дэлгэц уншигч/дуут удирдлагад бодит алдаа.
- **Нүүрний shell `inert` бөгөөд React hero зурагдахыг ≤1.2 с хүлээдэг — анхны keydown/pointerdown React-ийг `flushSync`-ээр шууд mount хийж, товшилтыг ижил байрлалын React элемент рүү дамжуулна** (`client/src/main.tsx`, 2026-09-22). Shell-д шинэ товч нэмбэл React-д ИЖИЛ байрлалд байх ёстой, эс бөгөөс эрт товшилт буруу элемент рүү очно (`e2e/hero-shell.spec.ts` "анхны үйлдэл").
- **Нүүрний толгой/hero-ийн markup өөрчилбөл `server/_core/heroShell.ts`-ийг МӨН өөрчил** (2026-09-21): сервер тэр DOM-ыг React-ээс өмнө ижил class-уудаар зурдаг; зөрвөл React ирэх мөчид hero үсэрнэ. `e2e/hero-shell.spec.ts` (shell ба React-ийн rect тэнцүү) хамгаална — унавал шалтгаан нь яг энэ. Унтраах: `HERO_SHELL=0`.
- **Storefront-ийн эхний render-д хэрэгтэй жижиг хүснэгтийг tRPC-ээр хүлээхгүй** — `#storefront-bootstrap` блок (`indexHtml.ts` → `client/src/lib/bootstrap.ts` → `initialData`). Шинэ хэсэг нэмбэл хоёр талд нь нэм; `<` тэмдэгтийг сервер `<` болгодог.
- **Admin-д л хэрэглэгддэг CSS `client/src/admin.css`-д**, `index.css`-д БИШ (storefront-ийн render-blocking файл). Storefront/хуваалцсан дүрэм `index.css`-д хэвээр. Admin-ий `@layer components` wrapper-ийг admin.css-д хадгалсан.
- **Аппын JS `fetchpriority="low"`** (vite.config.ts plugin) — CSS/зураг/шрифт түрүүлж ирнэ; "JS яагаад хожуу татагдав" гэж гайхвал энэ. Shell-гүй болговол энэ hint-ийг ч буцаана (JS-гүйгээр юу ч зурагдахгүй болно).
- **Шинэ зургийг `ResponsivePicture`-оор зур** (AVIF → WebP, srcset). AVIF нь ЗААВАЛ БИШ — тиймээс `<source type="image/avif">`-г ГАРААР бичихгүй: `<picture>` нь 404 болоход дараагийн source руу шилждэггүй, зураг эвдэрдэг; `ResponsivePicture` нь `onError`-оор WebP руу буцдаг. Лого дээр `avif={false}`.
- **srcset нэр дэвшигч бүр бодит файл байх ёстой.** `gridVariantUrl()` зөвхөн өргөтгөлийг хардаг; `client/public` дахь локал `.webp`-д `-600w`/`.avif` хувилбар өөрөө үүсдэггүй. SPA fallback нь байхгүй зам руу **200 + index.html** буцаадаг тул статус 200 нь "байна" гэсэн үг БИШ — content-type-аар шалга (2026-09-21-нд ингэж 2 тасархай зураг олсон).
- **Hero-ийн preload ба `<img>` хоёр ИЖИЛ файл сонгох ёстой** — `HERO_IMAGE_SIZES` (shared) ба `heroHasAvif()`. Зөрвөл hero хоёр удаа татагдана.
- **Далд (`display:none`) хэсэг дэх `<img>`-д `loading="lazy"`** — хөтөч далд зургийг ч татдаг (нүүрэнд 3.7 MB PNG ингэж татагдаж байв).
- **Каруселийн "эхлээд ачаал" тэмдгийг ХАРАГДАХ хуулбарт тавь.** `HeroImageSlideshow` 3 хуулбар зурдаг ба нүдэнд харагддаг нь ДУНД нь (`copy === 1`) — тэмдгийг `copy === 0`-д тавьсан нь далд хуулбарыг хурдасгаж, жинхэнэ hero-г `lazy` болгож LCP-г 9.8 с болгосон байв (2026-09-21).
- `index.html`-д inline `<script>` бичихгүй (CSP `script-src 'self'`) — JSON блок эсвэл `client/public/vendor/*.js`.
- Secure-context-only API (`randomUUID`, `clipboard`, `share`, `getUserMedia`) ашиглавал fallback тавина.
- Storefront-ийн dark горимд Tailwind-ийн `.dark` класс ХЭРЭГЛЭХГҮЙ — `html[data-storefront-theme="dark"]`.
- DOM ажиглах давтамжид `requestAnimationFrame` ашиглахгүй (background tab-д зогсдог) — `setTimeout`.
- Шинэ storefront текстийг React `{expr}`-тэй бол template literal-аар НЭГ text node болго (орчуулга таарахгүй).
- Fixed доод элементэд `env(safe-area-inset-bottom)`-ийг өндөр ДОТОР нь биш ДЭЭР нь нэм.
- `scroll-snap-type` нь marquee-г зогсооно — `.hero-rail`-д тавихгүй.
- **`<form>` дотор `<form>` БИЧИХГҮЙ** — HTML зөвшөөрдөггүй ба хөтөч дотоод submit
  товчийг ГАДААД маягтад харьяалуулдаг. 2026-09-16 хүртэл variant нэмэх нь яг
  үүнээс болж ажилладаггүй байсан. Дотор нь маягт хэрэгтэй бол `<div>` + `type="button"`.
- Grid/flex доторх `select`/`textarea`-д `min-width: 0` — анхдагч `min-width: auto`
  нь хамгийн урт сонголтынхоо өргөнөөс жижгэрэхийг хориглож, утсан дээр бүх
  хуудсыг жижигрүүлдэг (2026-09-16, admin маягт).
- Reset дүрмийг ЗААВАЛ `@layer base` дотор бич — давхаргагүй CSS нь Tailwind-ийн
  utility-г дардаг (`a { color: inherit }`-ийн урхи; `e2e/css-layers.spec.ts` хамгаална).
- Шинэ гарчгийн шрифт нэмэх бол монгол Ө/Ү (cyrillic-ext) глифийг ХӨТӨЧ ДЭЭР
  хэмжиж шалга — олон display шрифт cyrillic-ext-гүй эсвэл дутуу
  (`e2e/typography.spec.ts`).

**Тест, deploy**
- **Job (automation.ts) ажиллуулдаг integration тест ЗААВАЛ өөрийн өгөгдлөөр хязгаарлана** (`runBackInStockJob({ productIds })` гэх мэт) — vitest нь (2026-09-23-аас `sugi_staging` гэхдээ) бодит хэрэглэгчтэй хуулбар DB дээр ажилладаг тул хязгааргүй job бодит харилцагчийн мэдэгдлийг "эзэмшиж" алга болгоно (2026-09-21).
- **UI-г screenshot-оор батлахдаа тест өгөгдөл нь харагдахуйц байх ёстой** — цайвар цэвэр өнгөтэй тест зураг дэвсгэртэй нийлж "зураг алга" мэт харагдав; `naturalWidth > 0`-оор бодит ачаалалтыг шалга (2026-09-21).
- **E2E-г ДЭД БАГЦААР ажиллуулсныг "ногоон" гэж тооцохгүй** — `pnpm e2e` бүтнээр (desktop+mobile) нэг удаад. 2026-09-20-нд дэд багцаар давдаг байсан 4 тест бүтэн run дээр унасан: 3 нь аппын өөрийн rate limit (нэг IP-ээс 80 тест → 429), 1 нь зөвхөн утасны өргөнд илэрдэг сонгогчийн алдаа.
- `GUEST_CHECKOUT_OTP=0` нь ЗӨВХӨН тест/E2E-ийн хувьсагч — production `.env`-д тавибал зочны OTP чимээгүй унтарна (аппын код уншдаг, 2026-09-20).
- **Integration тест хөндсөн commit-ийг push-лэхээс өмнө `pnpm exec tsx scripts/ci-local.ts <тестийн файл>`** — fallback/дүүргэгч логик 984 бараатай бодит DB дээр хэзээ ч ажилладаггүй тул локал ногоон хэвээр, жижиг CI каталог дээр л илэрдэг (2026-09-21: санал болголтын 3 тест).
- **"Локал ногоон" нь "CI ногоон" гэсэн үг БИШ**: локал DB бол production-ийн хуулбар (`sugi_staging`), CI-нх бол migration гинжээс байгуулсан схем. Гинжийг хөндвөл шинэ схем дээр ажиллуулж шалга (2026-09-16: `openId` нэг мөрөөс болж 42 файл CI-д унасан).
- **Шинэ integration тест нь хөгжүүлэгчийн DB-д байдаг зүйлд НАЙДАХГҮЙ**: `actorUserId: 1`, `variantId: 1`, "ямар нэг ангилал байгаа" гэх мэт нь локал дээр мөнхөд ногоон, цэвэр схемд мөнхөд улаан. Шаардлагатай өгөгдлөө өөрөө үүсгэ, эсвэл `scripts/ci-seed.ts`-д лавлах мөр болгож нэм (2026-09-16).
- **CI-г эндээс харах**: `gh` суулгасан. `gh auth login` нь `read:org` шаарддаг тул `GH_TOKEN`-оор дамжуулна: `export GH_TOKEN=$(printf "protocol=https
- **Тест/CI/туршилтын скрипт `refuseProductionDatabase()`-тай** (`scripts/_refuse-production.ts`): migration гинж, ci-seed, verify-review-thread нь `defaultdb` рүү заавал татгалзана. Шинэ туршилтын скрипт бичвэл мөн дууд. E2E_BASE_URL зөвхөн staging хост (2026-10-01).
- **Deploy нь git-ийн төлөвийг шалгадаг** (2026-09-23): origin/main-ээс хоцорсон эсвэл commit хийгээгүй өөрчлөлттэй бол татгалзана (`-AllowDirty`). Шинэ build-ийг `pnpm install` амжилттай болсны дараа л солино.
- **CI-г локал дээр давтах**: `pnpm exec tsx scripts/ci-local.ts` (схем хоослох → гинж → seed → CI-ийн орчны хувьсагчаар vitest). ⚠️ Схемээ цэвэрлэлгүй ажиллуулбал өмнөх ажиллалтын өгөгдөл үлдэж **худал ногоон** гардаг.
- **`timestamp` нь секундын нарийвчлалтай** — нэг секундэд болсон хоёр мөр `orderBy(desc(createdAt))`-д ТЭНЦЭНЭ. Эрэмбэ чухал бол `id` тэнцвэр заавал; `createdAt < NOW()` төрлийн шүүлт нь яг тэр секундын мөрийг хасдаг (2026-09-16: 3 уналт).
host=github.com

" | git credential fill | sed -n "s/^password=//p")`, дараа нь `"/c/Program Files/GitHub CLI/gh.exe" run list --repo tmorius-eng/sugi-asayake`.
- Тест: `pnpm exec vitest run --no-file-parallelism` (параллель горим race үүсгэдэг).
- **Coverage**: `pnpm test:coverage` → `coverage/index.html` (server + shared). CI-ийн unit job тайланг artifact болгоно (`coverage-unit`).
- Integration тестэд fake session user бичихгүй — `server/_test-helpers.ts`-ийн `testSessionUser()`; IP санамсаргүй (rate limit 15 мин).
- Бодит production slot/мөрийг тестээр болзолгүй устгахгүй (snapshot-and-restore).
- **UI өөрчлөлтийг хөтөч дээр ажиллуулж үзэлгүйгээр дуусгасанд тооцохгүй**
  (2026-09-16: QR хоосон, карт буланд, polling огт ажиллахгүй — гурвуулаа
  type-check болон серверийн тестийг давсаар production-д гарсан).
- Интервалтай `useEffect`-ийн хамаарлын жагсаалтад интервалаас ХУРДАН
  өөрчлөгддөг утга (тоолуур, секунд) байж болохгүй — interval ажиллаж
  амжилгүй дахин үүссээр байдаг.
- Царайны хаалгатай E2E-г `E2E_FACE_GATE=1`-ээр асаана (3101 порт).
  `ADMIN_FACE_GATE_ENABLED`-ийг ХЭРЭГЛЭХГҮЙ — тэр нь `.env`-д байдаг тул
  бүх E2E-г санамсаргүй хаалгатай горимд оруулна.
- E2E (`pnpm e2e`) production схем рүү ХЭЗЭЭ Ч заахгүй — `sugi_staging` (заавал
  татгалздаг хамгаалалттай, `e2e/helpers/environment.ts`).
- **Deploy амжилттайн баталгаа = `[vm] DEPLOY-RESTART-OK`** (2026-09-21), health 200 биш — нийтийн health хуучин процессоос ч 200 авдаг. Өмнө нь lockfile өөрчлөгдсөн deploy бүр `pnpm install` stdin-ээр скриптийг "идэж" restart-гүй үлддэг байв. Remote скрипт дотор stdin уншдаг команд бичихгүй (`</dev/null`).
- Commit хийхээс өмнө `pnpm check` + `pnpm lint`.
- **AI attribution хэзээ ч бичихгүй** (commit trailer, docs, код) — Tom сайтыг өөрийнхөөрөө танилцуулдаг.

## ⚠️ ХОЁР ЛАПТОП — session бүрийн эхэнд ЗААВАЛ

```powershell
git fetch --all --prune ; git status -sb
```

Хоёр лаптоп нэг repo, нэг HeatWave DB, нэг R2 хуваалцдаг. Нөгөө лаптопын
migration бодит DB дээр аль хэдийн ажилласан байж болох тул **DB шинэ, код
хуучин** гэсэн байдал чимээгүй үүсдэг. Аппликейшн ажиллаж байгаа нь синк болсны
баталгаа БИШ. (2026-09-11-ний бодит incident: 2 commit хоцорсон branch дээр
бүтэн өдрийн ажил хийж, ижил CSS-ийг дахин бичсэн.)

## 📱 Демо / утсаар турших — `scripts/demo.ps1`

`.\scripts\demo.ps1` = production build + `node dist/index.js` (3000 порт, LAN IP,
access log). `-Tunnel` нэмбэл Cloudflare quick tunnel (HTTPS тул утсан дээр камер,
царайны хаалга ажиллана). Production-only зүйлийг (CSP, compression, static)
ЗААВАЛ энэ script-ээр нэг удаа шалга — `pnpm dev`-д CSP байхгүй тул inline script
алдаа харагддаггүй.

## 💰 Токен зарцуулалт — [docs/TOKEN-USAGE.md](TOKEN-USAGE.md)

Session бүр энэ файлыг бүтнээр ачаалдаг тул **энд юу ч урт бичихгүй**: шинэ
session-ий тэмдэглэл HISTORY.md-д, дүрэм л энд. Ажиллах дүрэм (аль загвар аль
ажилд, output-оо хэрхэн таслах, session-ээ хэрхэн хуваах) TOKEN-USAGE.md-д.

## Agent skills (mattpocock/skills — AI Hero, 2026-11-07)

`.claude/settings.json`-д repo-д идэвхжсэн plugin (`/grill-me`, `/tdd`, `/to-spec`, `/triage`…). Энэ гарын авлагын дүрэм давамгайлна (монгол commit, AI attribution-гүй, HISTORY.md).

### Issue tracker

GitHub Issues, `tmorius-eng/sugi-asayake` (`gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`, created lazily. See `docs/agents/domain.md`.

## ⚠️ Tom-оос хүлээж буй (2026-09-14, "Za bugdiin hii"-ийн дараа)
- ✅ **(2026-10-06) Брэнд студи + эзэн солих PRODUCTION-Д ГАРСАН** — Tom deploy хийв (`0e5d639`, `DEPLOY-RESTART-OK`, /health 200); 0103–0105 prod-д аль хэдийн байсан (сервер REQUIRED_MIGRATIONS-аар эхэлсэн). Гаднаас батлав: brand-tokens, theme-color `#df1f3d` (өөрчлөгдөөгүй), статик таб дүрс, динамик manifest, R2 постер 200, `admin.brandStudio` 401. /admin → Брэнд студи; бүх шинэ боломж анхдагчаар унтраалттай.
- **(2026-10-06) Эзний шийдвэр хүлээж буй**: (1) репод `LICENSE` — худалдааны гэрээний нөхцөл (OWNER-HANDOVER §6); (2) TinyMCE `gpl` түлхүүр — худалдааны лиценз эсвэл MIT засварлагч; (3) Gemini API түлхүүрийг солих (чатад ил болсон); (4) баярын постерыг өөрийн зургаар солих бол → Баярын загвар → Тохируулах → Постер солих.
- ✅ **(2026-10-05 20:54) PRODUCTION DEPLOY ХИЙГДСЭН** — Tom prod-д 0096→0102-ыг ажиллуулж (103/103, дутуу 0), `deploy.ps1` (`d91b9fd`), шинэ код амьд (`/api/trpc/x/catalog.list` → 404 "Олдсонгүй.", /health database up, үндсэн хуудсууд 200), `backfill-order-events` prod-д (6 захиалга → 7 event, үлдсэн 0). Хувийн bucket `sugi-asayake-private` үүссэн, VM prod+staging ба энэ лаптопын `.env`-д `S3_PRIVATE_BUCKET`; энэ лаптопын `oci-ca.pem` шинэ CA. ⚠️ Admin бүр нэг удаа нууц үг + царай дахин. Доорх 10-01 жагсаалтаас 1, 2, 3 хаагдсан; 4 (Access), 6 (задгай dump), 7 (push allowlist) нээлттэй.
- ~~(2026-10-05) Процессын самбарын migration~~ (хийгдсэн, дээрхийг үз): prod-д 0096→0100-ийн ДАРАА `0101_order_events.sql`, `0102_job_runs.sql` (staging-д орсон, 103/103) → deploy → `pnpm exec tsx scripts/backfill-order-events.ts --i-know-this-is-production` (idempotent; хуучин захиалгад түүх) → /admin → Процесс. Deploy батлах тэмдэг: `/api/trpc/x/catalog.list` → 404 "Олдсонгүй.". ⚠️ Энэ лаптопын `oci-ca.pem`-ийг солиогүй — `scp sugi-oci:sugi-asayake/oci-ca.pem oci-ca.pem` (бусад скрипт энэ session-д scratchpad CA + `DATABASE_CA_CERT_PATH`-аар ажилласан).
- 🔴 **(2026-10-01) Аюулгүй байдлын засварыг deploy хийхээс ӨМНӨ** (дарааллаар):
  1. ✅ (10-01 үдээс хойш) staging-д 0096–0100 орсон, **integration 1281/0 унаагүй, E2E 239/0** (`sugi_staging`, шинэ CA-гаар). Замдаа 09-29-ний аудитын 2 бодит алдаа засагдав (бүрэн тооллого тоологдоогүй барааг тэглэдэггүй болсон байв). ⛔ **Үлдсэн нь Tom-ийн гар (Claude-д production deploy хаалттай)**: `pnpm exec tsx scripts/db-apply-migration.ts drizzle/0096_audit_schema_fixes.sql` … `0100_orders_coupon_code_idx.sql` (prod, дарааллаар) → `.\scripts\oci\deploy.ps1` → `DEPLOY-RESTART-OK` + /health 200.
  2. Хувийн R2 bucket: `pnpm exec tsx scripts/r2-create-private-bucket.ts` (үүсгэж, бичих/унших/устгахыг шалгаад нэрийг хэвлэнэ; токен эрхгүй бол Cloudflare → R2 → Create bucket) → `.env`-д `S3_PRIVATE_BUCKET` (VM-ийн prod + 2 лаптоп); R2 API токен **хоёр bucket-ийг хоёуланг** хамрах ёстой. Эс бөгөөс production-д CV болон бараа хүлээн авалтын баримтын зураг upload татгалзана. Дараа нь `pnpm exec tsx scripts/move-private-objects.ts` (dry-run) → `--apply`.
  3. VM-ийн `.env`-д `DATABASE_CA_CERT_PATH` байгааг батла — одоо production CA-гүй бол сервер ЭХЛЭХГҮЙ (өмнө нь warning). `vm-backup.sh` ч CA-гүй бол зогсоно.
  4. Access ашигладаг бол `node scripts/cloudflare-harden.mjs --access` дахин (шинэ `/api/trpc/inventory*` зам; PUT байгаа бодлогыг хадгална, дараа нь шалгана).
  5. Deploy-ийн дараа бүх admin нэг удаа нууц үг + царай дахин (proof-ийн формат өөрчлөгдсөн). ⚠️ Нэг төхөөрөмж дээр царай амжилттай болмогц БУСАД төхөөрөмжийн царайн сешн дуусна (зориуд — FACE-HANDOFF-PLAN §13); лаптоп + утсаар зэрэг admin хийдэг бол туршаад хэлээрэй.
  6. `backups/` дахь задгай `.sql` 6 файл (4 нь 0 байт; `defaultdb_2026-09-26_202246.sql`, `oracle-migration_2026-09-09_003515.sql`) — шифрлэгдээгүй DB dump, устгах эсэхээ шийд.
  7. Push allowlist-д Huawei хост (`push-api.cloud.huawei.com`) ойн санамжаар нэмэгдсэн — бодит `push_subscriptions`-ийн хостуудыг нэг удаа шалга (allowlist-гүй мөр одоо УСТГАГДАХГҮЙ, зөвхөн алгасагдана).
- 🔴 **(2026-10-01) HeatWave CA-г 09-28-нд шинээр үүсгэсэн → production DB УНАСАН байв** (09-29-ийн "certificate signature failure"-ийн жинхэнэ шалтгаан). Production + staging-ийн `oci-ca.pem`-ийг VM дээрээс шинэ CA-аар сольж (`openssl … -CAfile` → `Verify return code: 0`), pm2 restart → хоёулаа `database: up` (хуучин нь `oci-ca.pem.bak-20261001`). **Хоёр лаптоп дээр Tom өөрөө**: `Copy-Item oci-ca.pem oci-ca.pem.bak-20261001; scp sugi-oci:sugi-asayake/oci-ca.pem oci-ca.pem` — дараа нь migration 0096 → 0100 (`--staging`, prod), integration suite + `pnpm e2e`. ⚠️ Дахин "certificate signature failure" гарвал эхлээд `openssl s_client -connect 127.0.0.1:3307 -starttls mysql -showcerts`-ийн CA-ийн `NotBefore`-ийг хар — HeatWave засвар үйлчилгээгээр CA-гаа сольдог.
- 🔴 **(2026-09-29) Production `JWT_SECRET`-ийг шалга**: гарын авлагад `local-test-secret-12345` жишээ байсан (энэ лаптоп яг тэрийг хэрэглэдэг). Prod ийм бол хэн ч admin сешн хуурамчаар үүсгэж чадна → 64 hex болгож солих (бүгд нэг удаа гарна). Сервер одоо эхлэхдээ сул бол анхааруулна.
- ✅ **(2026-09-29) Хямдралын 6 шийдвэр ХАРИУЛАГДСАН, хэрэгжсэн** — эцсийн дүрмийг [SITEWIDE-SALE-PLAN.md](SITEWIDE-SALE-PLAN.md)-ийн толгойноос үз.
- ✅ **(2026-09-22) `ca670e7`-ийн регресс ЗАСАГДСАН** (Tom: *"Ali boloh hereglegchid taalamjtai medremj turuulhiin tuld chadah buhnee hii"*): hero-г түрүүлж зурах хүлээлт хэвээр, харин анхны товч/хүрэлт React-ийг шууд mount хийж, товшилтыг React-ийн ижил товч руу дамжуулна; shell `inert`. HISTORY 2026-09-22.
- **(2026-09-22) Шинэ /admin урсгалыг бодит утас/камераар турших**: нууц үг → царай (нэг удаа анивчина). Анивчилт хэт олон удаа илрэхгүй бол `ADMIN_FACE_LIVENESS_ENFORCED=0` түр буцаана.
- ✅ **Монгол нэр ДУУССАН (2026-09-20)**: 979/984 бараа монгол нэртэй (үлдсэн 5 нь аль хэдийн монгол — 4 бэлгийн карт + нэг эвдэрсэн нэр). Гадны API түлхүүр ашиглаагүй: нэрийг 10 багцаар гараар орчуулж `docs/product-names-mn.tsv`-д хадгалсан. Засвар хийвэл тэр файлд бичээд `pnpm exec tsx scripts/apply-product-names-mn.ts docs/product-names-mn.tsv --apply --force`, эсвэл /admin → Бүтээгдэхүүн → "Монгол нэр" талбар. `scripts/generate-product-names-mn.ts` (Claude API) үлдсэн ч хэрэгцээгүй болсон.
- **Hero зургийн origin (2026-09-21, гүйцэтгэл)**: утасны LCP 3.3 с-ийн үлдсэн хэсэг нь hero зураг `pub-….r2.dev` (өөр origin) дээр байдгаас. Cloudflare → R2 → bucket → **Custom domain** (жишээ `cdn.sugi.karkaron.com`) холбоод `.env`-ийн `S3_PUBLIC_BASE_URL`-ийг тэр хаяг болгоход л сервер бүх зургийг тэндээс өгнө (код бэлэн, `directStorageUrl`). Хүлээгдэх үр дүн: PSI LCP ~3.3 → ~2.5–2.8 с.
- **Санал болголтын жин** /admin → Дэлгүүрийн тохиргоо → "Санал болголт"; барааны нэрийн харагдац → "Каталог" (`mn`/`latin`).
- **Хайлтын статистик** /admin → Хайлт: хэдэн өдрийн дараа "Олдоогүй хайлтууд"-ыг үзэж "+ синоним" дарна — толь Tom-ийн гараар л баяжна.
- **Staging DNS**: Cloudflare → karkaron.com → DNS → CNAME `sugi-staging` → `bbd3128e-486e-481d-8c21-f9d3d240a56c.cfargotunnel.com`, proxied. Дараа нь `https://sugi-staging.karkaron.com` (өөрийн `sugi_staging` схем — prod-ын 2026-09-21-ний хуулбар; шинэчлэх: prod backup → `scripts/db-restore.ps1 -DatabaseUrl <…/sugi_staging> -BackupFile <zip> -Force` (DATABASE_ADMIN_URL-ийн эрхээр); туршилтын захиалга энд хийнэ; push илгээхгүй).
- **Хэмжилт**: GA4 Measurement ID + Meta Pixel ID → /admin → **Хэмжилт** (09-15-аас тусдаа цэс). Буруу форматтай ID одоо хадгалагдахгүй — өмнө нь ногоон хадгалагдаад чимээгүй ачаалагддаггүй байв.
- **Захиалгын SMS** асаах бол Brevo SMS кредит → `sms-order-notifications=1`. verify.mn үлдэгдэл дуусвал `checkout-guest-phone-verification=0`.
- **Сэтгэгдлийн урамшуулал**: `review-reward-mnt` (жишээ 2000) тавибал асна.
- **1 junk захиалга цуцлах/устгах** (2026-09-20-нд шалгав: `#6655` аль хэдийн устсан, `#6802` үлдсэн): `#6802 SAMU21BHE3OSC20F` "Checkout Test", бэлгийн карт 200,000₮, 2026-09-15, `pending/unpaid`. ✅ **Асуултад хариулав: бэлгийн картын код үүсээгүй** (карт зөвхөн `paid` болоход үүсдэг) тул устгахад аюулгүй. Аппын хамгаалалт цуцлагдаагүй захиалгыг устгуулдаггүй тул /admin дээр эхлээд цуцлаад дараа нь устгана.
- ✅ **Тестийн үлдэгдэл 2026-09-20-нд цэвэрлэгдсэн**: бодит схемд 4 тестийн хэрэглэгч (гурав нь admin эрхтэй, нэг нь репод ил байсан нууц үгтэй) үлдсэн байсныг `scripts/test-residue-purge.ts`-ээр устгав. ✅ Үндсэн шалтгаан 2026-09-23-нд арилсан: vitest одоо `sugi_staging` дээр ажилладаг (`_test-setup.ts`) тул тасарсан run production-д үлдэгдэл үлдээхгүй — тасалсан бол `pnpm exec tsx scripts/test-residue-report.ts --staging` ажиллуул.
- HeatWave дээр `sugi_migtest` схемийг устгах (`DROP DATABASE sugi_migtest` — migration chain туршилтын үлдэгдэл, хоосон).
- GitHub Actions → `database-tests` job-ийн эхний үр дүнг харах (улаан бол seed-д нэмэх мөр байна).

## Дараагийн ажлын санал (2026-09-16-ний байдлаар НЭЭЛТТЭЙ зүйлс л — хаагдсан бүх зүйл HISTORY.md-д)

**Tom-ийн шийдвэр хүлээж буй (код бичихээс өмнө)**
1. **Bento зохиомж** — "2 хэсгийг тэгш бус bento" гэсэн зорилт. Судалсан дүн: WhyChooseUs аль хэдийн 245/355/245 тэгш бус grid, CategoryMasonry masonry, StoreLocator 3 бүсийн зохиомж. Үлдсэн "жирийн зурвас" нь **EditorialBanner** ба **StoreLocator** хоёр. Аль хоёрыг, ямар агуулгыг аль хайрцагт тавихыг Tom сонговол хийнэ (2026-09-09-ний "чиглэлгүй restyle" татгалзлыг давтахгүйн тулд).
2. **Referral** — код үүсгэх нь хялбар; шийдэх ёстой нь бизнесийн дүрэм: хэн (урьсан/уригдсан аль нь), хэзээ (эхний захиалга төлөгдсөний дараа уу), хэдэн төгрөг/хувь, нэг хүн хэдэн удаа, буруу ашиглалтыг хэрхэн таслах. Loyalty зэрэглэлтэй ижил — дүрэм ирмэгц хэрэгжүүлнэ.

2a. ✅ **Байхгүй хуудас ба хуулийн хуудасны толгой — ХИЙГДСЭН (2026-09-21 шөнө, Tom: "fix all of them")**: HISTORY 6m.

**Код талд нээлттэй**
3. **10k зэрэгцээ хэрэглэгч — үлдсэн хэсэг**: (a) ✅ storefront уншилтын кэш + single-flight, (b) ✅ pool 25 + `DB_POOL_SIZE`, (c) ✅ Cloudflare cache rules, (d) ✅ cluster-д аюулгүй код. ⛔ Үлдсэн: **VM-ийн RAM** (2 vCPU / 954 MB дээр prod+staging хоёулаа; `-Instances 2` энд ашиггүй), **k6-г staging дээр бодитоор ажиллуулж тасрах цэгийг олох**, олон instance болбол кэш/rate-limit-ийг Redis рүү.
4. **Bestseller filler-ийг брэндээр хязгаарлах** — одоо `featured_brands`-ийн БҮХ идэвхтэй брэнд round-robin-д ордог. Зөвхөн тодорхой 3–4 брэнд харагдах ёстой бол admin → Брэнд дээр бусдыг идэвхгүй болгох, эсвэл filler-д зориулсан тусдаа тугийн багана нэмэх.
5. ⚠️ **`/shop` "баруун тийш шахагдсан" (Tom, 2026-09-11) — НӨХӨН ҮЗҮҮЛЭГДЭЭГҮЙ**: 1024–3200px хүртэл 15 өргөнд `scrollWidth - clientWidth` бүгд 0. Дахин гарвал **цонхны бодит өргөн + browser zoom хувь**-ийг асуух (zoom нь `vw` нэгжийг өөрчилдөг).
6. ✅ **Камергүй компьютер дээр admin-д орох зам ДУУССАН, бодитоор ажиллаж
   байна** (2026-09-16): /admin нээхэд аргаа сонгох дэлгэц ("Энэ төхөөрөмжөөр" /
   "Утсаараа") → QR + 2 оронтой тоо → утсаараа уншуулж, тоог таарууулж,
   царайгаа уншуулна → компьютер өөрөө нээгдэнэ. Tom production дээр бодит
   утсаар туршиж баталгаажсан (`face_handoff_requests` #35 = `used`).
   Дизайн/судалгаа: [docs/FACE-HANDOFF-PLAN.md](FACE-HANDOFF-PLAN.md).
7. **Admin face gate** — Tom 50 хүнээр false-reject rate хэмжих. Liveness-ийн шийдвэр гарсан (2026-09-22: анивчилт заавал, `ADMIN_FACE_LIVENESS_ENFORCED=0` буцаана). Бодит утсан дээр анивчилтын хувь (`face_attempts.detail` → `blinks=`, `restarts=`) харагдана.
8. **Эхний ачаалалт** — үндсэн chunk 484 KB (gzip 152). Дараагийн том хэсэг нь Home.tsx + хуваалцсан компонентууд; Home-ийг lazy болгох нь LCP-д сөрөг тул эхлээд хэмжилт хэрэгтэй.

**Tom-ийн биечлэн хийх (код бэлэн)**
9. **Барааны бодит зураг — үлдсэн 415** (`docs/products-needing-photos.csv`): автомат эх сурвалж шавхагдсан, дэлгүүрт өөрөө авах л үлдсэн.
10. **Брэндийн лого — 9-өөс ганц нь** (Cocochi, тэр нь ч бодит лого биш кампанит зураг). /admin → Брэнд дээр 8 лого оруулбал зурвас жигдэрнэ.
11. **Бизнесийн алхам шаардах**: QPay merchant (sandbox эрх ч болно), eBarimt ([EBARIMT.md](EBARIMT.md)-ийн 6 асуулт), StorePay-ийн 7 утга, Smart Software нэвтрэх нэр/нууц үг, Brevo SMS кредит, Honeybadger API key, GA4/Pixel ID, staging DNS, production host дээр `NOTIFICATIONS_DISPATCH=1`, ntfy token rotate.
12. ✅ **Dependabot alerts асаагдсан** (2026-09-17: 40 нээлттэй сэрэмжлүүлэг ирсэн, бүгдийг хаасан). Үлдсэн ажил нь **ажлын лаптоп дээр `.\scripts\check-updates.ps1 -Install`** ажиллуулж, долоо хоног тутмын шалгалтыг тэндээ ч бүртгэх (гэрийн лаптоп дээр бүртгэгдсэн).
13. **1 junk захиалга** `#6802 SAMU21BHE3OSC20F` (бэлгийн карт 200,000₮, `pending/unpaid`) — /admin дээр цуцлаад устгана. Картын код үүсээгүй нь шалгагдсан (2026-09-20). `#6655` аль хэдийн устсан.
15. 🔴 **Uptime монитор ҮХСЭН — Cloudflare түүнийг хааж байна** (2026-09-20-нд илрүүлсэн). `uptime` workflow **2026-09-18-аас хойш run бүр унаж** байв. Шалтгаан нь сайт БИШ: GitHub-ийн дата төвийн IP-ээс ирэх probe-д Cloudflare-ийн Bot Fight Mode "Just a moment…" managed challenge (HTTP 403) буцаадаг. Тэр үед бодит сайт эрүүл байсан (`/health` → 200, `database: up`, 0.57 с — гараар шалгасан). Workflow-г засаж challenge-ийг ТАНИДАГ болгов: одоо "сайт унасан" гэхийн оронд "мониторыг хаасан, төлөв үл мэдэгдэх" гэж мэдэгдэнэ (худал дохио өгөхөө болино), гэхдээ **бодит мониторинг сэргээгүй** хэвээр. Сонголтууд: (a) Cloudflare → Security → Bots → Bot Fight Mode-ийг унтраах (⚠️ CSP-ийн nonce тайлбарт тэр зориуд асаалттай гэж бичсэн), (b) Pro төлөвлөгөөний Super Bot Fight Mode-оор `/health`-д зориулж дүрэм гаргах, (c) мониторингийг эсрэг чиглэлд эргүүлэх — VM өөрөө гаднаас хүлээж буй үйлчилгээ рүү (healthchecks.io гэх мэт) тогтмол "амьд" дохио илгээх, дохио ирэхгүй бол сэрэмжлүүлнэ.
16. 🔴 **ML загварын санах ой — шийдвэр хэрэгтэй** (2026-09-20-нд ХЭМЖСЭН): сервер сул үедээ 535 MB, текстийн загвар +368, зургийнх +213 → хоёулаа хэрэглэгдвэл 680–800 MB, харин pm2 `--max-memory-restart 700M` ба VM нийт 954 MB (staging ч дээр нь). Boot-ийн дараах эхний сэтгэгдэл процессыг хязгаараас хальгаж, pm2 хүсэлтийн дундуур restart хийнэ. Сонголт: (1) VM-ийн RAM нэмэх, (2) `MODERATION_MODEL=0` (монгол lexical шүүлт хэвээр), (3) pm2-ийн хязгаарыг ухамсартайгаар өсгөх. Сервер одоо boot дээр `pm2 logs`-д сэрэмжлүүлэг бичнэ. Дэлгэрэнгүй: [docs/AUDIT-2026-09-20-full-stack.md](AUDIT-2026-09-20-full-stack.md) §4.1.
14. **HeatWave дээрх `sugi_migtest` схем** — migration chain туршилтын үлдэгдэл. ⚠️ Гарын авлагад "хоосон" гэж бичигдсэн байсан нь БУРУУ: 61 хүснэгттэй (2026-09-16-нд шалгасан). Аппын хэрэглэгчид харагддаггүй тул зөвхөн admin эрхээр л устгана.


Дэлгэрэнгүй бүх session-ий бүрэн түүх, шалтгаан, screenshot-ын баталгаажуулалт: **[HISTORY.md](HISTORY.md)**.
