# SUGI ASAYAKE — Үйл ажиллагааны гарын авлага (OPERATIONS)

_2026-09-20. Уншигч: системийг ажиллуулж байгаа хөгжүүлэгч эсвэл техникийн хүн._

Өмнө нь deploy, нөөцлөлт, migration, мониторингийн мэдлэг нь **PowerShell
скриптүүдийн толгойн комментод болон гурван өөр .md файлд тархсан** байсан.
Энэ баримт тэр бүхнийг нэг дор цуглуулав. Эзэмшигчид зориулсан (данс, нууц,
хүлээлцэх журам) хэсэг нь [OWNER-HANDOVER.md](OWNER-HANDOVER.md)-д, дэлгүүрийн
ажилтанд зориулсан нь [ADMIN-MANUAL.md](ADMIN-MANUAL.md)-д байна. Гурвуулангийн
нэгтгэсэн, хэвлэхэд бэлэн хувилбар: **[SUGI-ASAYAKE-HANDOVER-MANUAL.pdf](SUGI-ASAYAKE-HANDOVER-MANUAL.pdf)**.

---

## 1. Орчин

| Орчин | Хаана | Порт | Схем | pm2 нэр |
|---|---|---|---|---|
| Production | Oracle Cloud VM (Токио) | 3000 | `defaultdb` | `sugi` |
| Staging | ижил VM | 3001 | `sugi_staging` | `sugi-staging` |
| Локал хөгжүүлэлт | лаптоп (`pnpm dev`) | 3000 | `defaultdb` (ssh тунелиар) | — |

Өгөгдлийн сан нь **Oracle MySQL HeatWave**, хувийн сүлжээнд. Лаптопоос шууд
хүрэхгүй — `scripts/oci/tunnel.ps1` ssh тунел (машин асахад автоматаар) нээж
`127.0.0.1:3307` руу дамжуулна. Тунел ажиллахгүй бол ямар ч локал команд
өгөгдлийн санд хүрэхгүй.

---

## 2. Deploy

```powershell
.\scripts\oci\deploy.ps1              # production
.\scripts\oci\deploy.ps1 -Staging     # staging
```

⛔ **Production зөвхөн `main`-ээс** (2026-11-07): HEAD нь `origin/main` дээр байхгүй бол
`deploy.ps1` татгалзана — branch-аа эхлээд `main` руу merge хий. Staging (`-Staging`)
дурын branch-аас болно.

Юу болдог вэ:

1. **Локал компьютер дээр** `pnpm build` ажиллана. Сервер өөрөө build хийдэггүй
   — VM-д 954 MB RAM байгаа бөгөөд хувийн репозиторыг clone хийх эрхгүй.
2. `dist/`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` архивлагдана.
3. `scp`-ээр VM рүү хуулагдана.
4. Lockfile өөрчлөгдсөн бол л `pnpm install --prod --frozen-lockfile` ажиллана.
5. `pm2 restart` + `curl localhost:3000/health`.
6. Нийтийн хаягаар дахин шалгана (5 секунд тутамд, 18 удаа).

⚠️ VM дээрх `.env` болон `oci-ca.pem`-д deploy **хэзээ ч хүрэхгүй**. Тэдгээрийг
ssh-ээр гараар засна.

**Deploy амжилттай = гаралтад `[vm] DEPLOY-RESTART-OK: <app> restarted Ns ago`.**
VM дээрх скрипт pm2-ийн uptime-аар restart бодитоор болсныг шалгадаг; болоогүй бол
`deploy.ps1` алдаа шиднэ. Нийтийн health 200 дангаараа баталгаа БИШ — хуучин процесс ч 200
буцаадаг (2026-09-21-нд lockfile өөрчлөгдсөн deploy ингэж restart-гүй үлдсэн, HISTORY 6m).

⚠️ **`pnpm build`-ийн exit code-ийг шууд шалга.** `pnpm build | tail && pnpm e2e`
гэж холбовол build-ийн уналт залгигдаж, E2E хуучин `dist/` дээр ажиллана.

---

## 3. Migration (өгөгдлийн сангийн схем)

Энэ төсөлд `drizzle/meta` экспортлогдоогүй тул **`drizzle-kit` / `db:push`-д
найдаж болохгүй**. Migration бүрийг гараар, нэг нэгээр нь ажиллуулна:

```powershell
pnpm exec tsx scripts/db-apply-migration.ts drizzle/00NN_name.sql
pnpm exec tsx scripts/db-apply-migration.ts drizzle/00NN_name.sql --staging
```

Скрипт нь аппын өөрийн холболтыг ашигладаг тул TLS, UTC session, query log бүгд
production-тай ижил. `--> statement-breakpoint` тэмдэглэгээг өөрөө хасна.
Админ эрх шаардвал `DATABASE_ADMIN_URL` ашиглана.

### Анхны admin өгөх (2026-10-01)

Шинэ суурилуулалт/хоосон DB дээр "эхний бүртгэл автоматаар admin" дүрэм **байхгүй**
(race-тэй, хэн түрүүлж бүртгүүлсэн нь admin болдог байв). Эхлээд сайтаар (/login →
бүртгүүлэх) ердийн данс үүсгээд, серверт хандах эрхтэй хүн:

```powershell
pnpm exec tsx scripts/make-admin.ts 99112233 --dry-run   # юу өөрчлөгдөхийг харах
pnpm exec tsx scripts/make-admin.ts 99112233             # admin болгох (staging: --staging)
```

Хэрэглэгч олдохгүй бол татгалзана (данс үүсгэдэггүй). Тухайн хэрэглэгчийн бүх одоогийн
сешн хүчингүй болж (sessionVersion+1) дахин нэвтэрнэ; дараа нь /admin дээр нууц үг +
царайны step-up.

> ⛔ **`deploy.ps1 -Staging` нь migration зөөдөггүй** — зөвхөн кодыг зөөнө.
> Шинэ `.sql` бүрийг staging дээр мөн **гараар** ажиллуул. Эс бөгөөс staging
> чимээгүй 500 алдаа өгнө (2026-09-16-нд /careers болон admin-ий бүтээгдэхүүн
> хадгалах хоёр ийм байдлаар унасан).

**Аль migration ажилласныг** `schema_migrations` хүснэгтээс харна. Өмнө нь энэ
бүртгэл байхгүй, зөвхөн HISTORY.md-ийн текстэд л байдаг байсан.

```powershell
pnpm exec tsx scripts/db-migration-status.ts              # production
pnpm exec tsx scripts/db-migration-status.ts --staging    # staging
```

⚠️ **Нэг удаагийн ажил — ХИЙГДЭЭГҮЙ байна.** Бүртгэлийн хүснэгт 2026-09-20-нд
нэмэгдсэн тул түүнээс ӨМНӨХ 92 migration бүртгэлгүй: status скрипт эхний
ажиллалтдаа бүгдийг "дутуу" гэж харуулна (2026-09-21-нд staging дээр яг ингэсэн).
Схемд аль хэдийн ажилласан гэдгийг баталгаажуулсны **дараа** нэг удаа бүртгэнэ
(SQL ажиллуулахгүй, зөвхөн нэрийг нь бичнэ):

```powershell
pnpm exec tsx scripts/db-apply-migration.ts drizzle/0000_*.sql ... --mark-applied
pnpm exec tsx scripts/db-apply-migration.ts drizzle/0000_*.sql ... --mark-applied --staging
```

Энэ нь бодит схемд хүснэгт үүсгэдэг тул эзэн/хөгжүүлэгч өөрөө шийдэж хийнэ.

---

## 4. Нөөцлөлт ба сэргээлт

### 4.1 Одоо ажиллаж буй давхаргууд

| Давхарга | Юу | Хаана | Хугацаа | Хэн ажиллуулдаг |
|---|---|---|---|---|
| HeatWave автомат | DB snapshot | ижил Oracle данс | 7 хоног | Oracle |
| VM cron (19:00 UTC = 03:00 УБ) | Шифрлэгдсэн `mysqldump` | хаалттай R2 сав `sugi-asayake-backups/db/` | 30 хоног | `scripts/oci/vm-backup.sh` |
| Зургийн нөөц | R2 public сав → backup сав `media/` (**2,287 объект, ~130 MB**) | ижил хаалттай сав | нэмэгдүүлсэн, ням гараг бүр | `scripts/oci/media-backup.mjs` |
| Лаптоп | Локал `.zip` | `./backups/` | 14 хувилбар | Windows Task Scheduler |

⚠️ **Нэг Oracle дансанд байгаа нөөц бол жинхэнэ нөөц биш.** Данс түгжигдэх,
төлбөр саатах зэрэг тохиолдолд HeatWave-ийн snapshot ч хамт хүрэхгүй болно.
Тиймээс R2 дээрх шифрлэгдсэн хуулбар чухал — гэхдээ **R2 нь мөн Cloudflare
дансанд** байгаа тул сард нэг удаа нэг хуулбарыг гуравдагч байршилд (өөр
cloud drive, гадаад диск) татаж аваарай.

### 4.2 Сэргээх

```powershell
# Аюулгүй дасгал: <db>_restore_drill нэртэй ТУСДАА санд сэргээнэ
.\scripts\db-restore.ps1 -BackupFile "backups\defaultdb_2026-09-20.zip"

# Жинхэнэ сэргээлт (бодит санг дарж бичнэ) — зөвхөн ослын үед
.\scripts\db-restore.ps1 -DatabaseUrl "<target>" -BackupFile "<zip>" -Force
```

VM дээрх шифрлэгдсэн dump-ыг задлах:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in X.sql.gz.enc | gunzip | mysql ...
```

Зургийн нөөцийг шалгах (юу ч хуулахгүй, зөвхөн юу хуулагдахыг жагсаана):

```powershell
node --env-file=.env scripts/oci/media-backup.mjs --dry-run
```

⚠️ `BACKUP_PASSPHRASE` алдагдвал R2 дээрх **бүх** нөөц хуулбар үүрд нээгдэхгүй.
[OWNER-HANDOVER.md](OWNER-HANDOVER.md)-ийн "Сэргээгдэхгүй нууц" хэсгийг үз.

### 4.3 Сар бүрийн дасгал

Сар бүр нэг удаа `db-restore.ps1`-ийг drill горимд ажиллуулж, эх ба сэргээсэн
сангийн хүснэгт бүрийн мөрийн тоог тулгана. Нөөц нь **сэргээж үзсэн үедээ л**
нөөц болно.

---

## 4b. Брэнд студи ба эзэн солих (2026-10-05)

| Ажил | Команд |
|---|---|
| Баярын постер R2-д (шинэ зураг бол `HOLIDAY_POSTER_VERSION` ахиулна — immutable кэш) | `pnpm exec tsx scripts/upload-theme-assets.ts [--apply] [--dir=…]` |
| Хатуу брэнд hex-ийг токен болгох (guard тест унавал) | `pnpm exec tsx scripts/codemod-hex-to-tokens.ts [--write]` |
| Шинэ эзэнд шилжүүлэхийн өмнөх цэвэрлэгээ (dry-run анхдагч) | `pnpm exec tsx scripts/new-owner-reset.ts --keep-admin-phone=… [--staging]` |
| Цэвэрлэгээний бодит туршилт (зөвхөн sugi_migtest) | `pnpm exec tsx scripts/ci-local.ts server/new-owner-reset.integration.test.ts` |
| Deploy өөр VM/домэйн руу | `.\scripts\oci\deploy.ps1 -SshHost <host> -PublicHost <домэйн>` |

Migration 0103–0105 (`site_themes`, `site_theme_versions`, `site_layouts`) нь `REQUIRED_MIGRATIONS`-д
— production-д кодоос ӨМНӨ.

## 4a. Зургийн формат (2026-09-21)

| Агуулга | Хадгалах формат | Яагаад |
|---|---|---|
| Зураг (photo) | WebP q82 **+ AVIF q60**, хоёр хэмжээ (эх ба 600px) | AVIF нь WebP-ээс ~23–30% жижиг; q50 жижиг текстийг бүдгэрүүлсэн тул q60 |
| Тунгалаг график, лого | lossless эсвэл q90 WebP (аль жижиг нь), **AVIF-гүй** | lossy AVIF үсгийн ирмэгийг будлиулна |
| Хөдөлгөөнт GIF | animated WebP, **AVIF-гүй** | AVIF хувилбар байвал `<picture>` хөдөлгөөнийг зогсооно |
| SVG | **хүлээн авахгүй** | SVG дотор script байж болно — манай origin-оос үйлчилбэл XSS |

Хөтөч `<picture>`-оор AVIF → WebP сонгоно (`ResponsivePicture.tsx`). AVIF нь
**заавал биш**: байхгүй бол зураг WebP руу өөрөө буцна (эвдрэхгүй).

Хуучин зургуудад AVIF нэмэх (давтан ажиллуулахад аюулгүй — байгаагаа алгасна):

```powershell
pnpm exec tsx scripts/image-avif-backfill.ts            # dry run
pnpm exec tsx scripts/image-avif-backfill.ts --apply
```

2026-09-21-нд ажиллуулсан: 470 зураг AVIF болсон, 71 лого/график алгассан,
алдаа 0. Admin-аар шинээр оруулсан зураг автоматаар AVIF-тэй болно.

## 5. Мониторинг

| Юу | Хэрхэн | Хаана тохируулагдсан |
|---|---|---|
| Сайт амьд эсэх | GitHub Actions 10 мин тутам `/health` | `.github/workflows/uptime.yml` |
| Серверийн алдаа | Honeybadger | `HONEYBADGER_API_KEY` |
| Үйл ажиллагаа | ntfy push (захиалга, төлбөр, нөөц) | /admin → Интеграцууд |
| Эмзэг байдал | Dependabot + долоо хоног тутмын локал шалгалт | GitHub + Task Scheduler |

🔴 **Одоогийн асуудал**: Cloudflare-ийн Bot Fight Mode нь GitHub-ийн дата
төвийн IP-ээс ирэх шалгалтыг challenge-ээр хааж байна. Workflow үүнийг таньж
"мониторинг хаагдсан, төлөв үл мэдэгдэх" гэж мэдээлдэг болсон (худал дохио
өгөхгүй), гэхдээ **бодит гаднын мониторинг сэргээгдээгүй**. Сонголтууд:
Bot Fight Mode унтраах · Pro багцын дүрмээр `/health`-д зөвшөөрөл гаргах ·
эсвэл VM өөрөө гадагш "амьд" дохио илгээдэг (healthchecks.io) болгох.

⚠️ **2026-11-07**: `uptime.yml` 09-24-өөс хойш YAML алдаатай байсан тул GitHub огт ажиллуулаагүй
(10-01, ~11-01-ний DB ослуудад мэдэгдэл ирээгүй). Засагдсан; `server/workflows-guard.test.ts` дахин
эвдрэхийг CI-д барина. Cloudflare-ийн дээрх хаалт хэвээр бол alert нь "monitor blocked" гэж ирнэ.

### DB CA (HeatWave) солигдох

HeatWave `MySQL_Endpoint_CA`-гаа засвар үйлчилгээгээр анхааруулгагүй сольдог (09-28, ~11-01).
Шинж: `/health` → `{"database":"down","reason":"tls_ca"}`, лог/watchdog-д `certificate signature failure`.
Нээлттэй байсан холболтууд хэд хоног амьд байдаг тул унах нь хоцорч мэдэгддэг.

```powershell
.\scripts\oci\rotate-db-ca.ps1          # шалгах: VM-ээс серверийн CA-г prod/staging-ийн oci-ca.pem-тэй тулгана
.\scripts\oci\rotate-db-ca.ps1 -Apply   # солих: .bak-<огноо> хадгалж, pm2 restart, /health up хүлээх, лаптопын CA-г татах
```

Шинэ CA-г серверийн гинжнээс авдаг ч серверийг `Verify return code: 0`-оор баталгаажуулсан
сертификатыг л авна (`scripts/oci/rotate-db-ca.sh`). Backup (`db-backup.ps1`) одоо `VERIFY_CA`-аар
холбогддог тул CA солигдоход бас унаж, дохио өгнө.

---

## 6. Тест

```powershell
pnpm check      # TypeScript (апп + тест/скрипт тусдаа)
pnpm lint       # ESLint
$env:RUN_AUTH_INTEGRATION_TESTS="1"; $env:COMMERCE_INTEGRATION_TESTS="1"; $env:RUN_MEDIA_INTEGRATION_TESTS="1"
pnpm exec vitest run --no-file-parallelism
pnpm build
pnpm e2e        # БҮТНЭЭР (desktop + mobile)
```

- **`--no-file-parallelism` заавал** — параллель горим нэг MySQL-г зэрэг
  цохиж тогтмол бус уналт үүсгэдэг.
- **E2E-г дэд багцаар ажиллуулсныг "ногоон" гэж тооцохгүй.** 2026-09-20-нд
  дэд багцаар давдаг байсан 4 тест бүтэн run дээр унасан (3 нь аппын өөрийн
  rate limit, 1 нь зөвхөн утасны өргөнд илэрдэг сонгогч).
- E2E нь **`sugi_staging`** схем рүү заана; бодит дэлгүүрийн схем рүү заавал
  татгалздаг хамгаалалттай (`e2e/helpers/environment.ts`).
- **"Локал ногоон" ≠ "CI ногоон"**: локал бол жинхэнэ production схем, CI-нх
  бол migration гинжээс шинээр байгуулсан схем. Гинжийг хөндвөл
  `pnpm exec tsx scripts/ci-local.ts`-ээр цэвэр схем дээр давт.

---

## 7. `.env` загвар

Бодит утгуудыг эндээс **хэзээ ч** git рүү оруулахгүй. Шинэ орчин байгуулахдаа
энэ жагсаалтыг хуулж, утгуудыг нь өөрийн дансуудаас ав.

```bash
# ---- ЗААВАЛ ---------------------------------------------------------------
DATABASE_URL=mysql://user:pass@127.0.0.1:3307/defaultdb?ssl-mode=REQUIRED
DATABASE_CA_CERT_PATH=./oci-ca.pem     # production-д ЗААВАЛ: байхгүй бол сервер эхлэхээс татгалзана
JWT_SECRET=                            # урт санамсаргүй мөр
INTEGRATIONS_ENCRYPTION_KEY=           # 64 тэмдэгт hex (32 байт). АЛДВАЛ СЭРГЭЭГДЭХГҮЙ.
                                       # Admin-ийн царайны загвар ч үүгээр шифрлэгдэнэ (2026-09-22):
                                       # БҮХ машин дээр ИЖИЛ байх ёстой, эс бөгөөс өөр машин дээр
                                       # бүртгэсэн царай "дахин бүртгүүлнэ үү" болно.
OWNER_EMAIL=                           # зөвхөн эзэнд очих имэйл мэдэгдэл (хэнийг ч admin болгодоггүй;
                                       # admin өгөх: pnpm exec tsx scripts/make-admin.ts <утас> --yes)
PUBLIC_BASE_URL=https://example.com    # төлбөрийн callback, canonical URL
PORT=3000
NODE_ENV=production

# ---- Зургийн сан (Cloudflare R2) — зураггүй бол сайт хоосон харагдана -------
S3_REGION=auto
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=https://pub-<hash>.r2.dev
# Хувийн bucket (CV, барааны баримтын зураг) — нийтийн URL-гүй. Production-д заавал: байхгүй бол CV upload татгалзана.
# Хуучин объектыг зөөх: pnpm exec tsx scripts/move-private-objects.ts [--apply]
S3_PRIVATE_BUCKET=

# ---- Имэйл, SMS (Brevo) — байхгүй бол лог руу бичнэ ------------------------
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=                     # хоосон = /admin-ийн дэлгүүрийн нэр
BREVO_SMS_SENDER=
SMS_CAMPAIGNS_ENABLED=                 # 1 = олноор SMS илгээх суваг нээгдэнэ

# ---- Утасны баталгаажуулалт (verify.mn) ------------------------------------
# ⚠️ Бусад интеграцаас ЯЛГААТАЙ: байхгүй үед чимээгүй унтардаггүй, дуудагдмагц
# шууд алдаа шиднэ. Зочны checkout OTP-г унтраах бол /admin-ийн тохиргоогоор.
VERIFY_MN_API_KEY=

# ---- Төлбөр -----------------------------------------------------------------
QPAY_USERNAME=
QPAY_PASSWORD=
QPAY_INVOICE_CODE=
QPAY_ENVIRONMENT=                      # sandbox | production
# StorePay нь .env-д БИШ, /admin → Интеграцууд дотор шифрлэгдэж хадгалагдана

# ---- Мэдэгдэл ----------------------------------------------------------------
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=                         # хоосон = mailto:$OWNER_EMAIL
NOTIFICATIONS_DISPATCH=                # ЗӨВХӨН нэг машин дээр 1 (production host)

# ---- Admin-ий царайны хаалга ----------------------------------------------------
# /admin: нууц үг -> царай -> admin (5 ажилтны эрх). Худалдан авагчид хамаарахгүй.
ADMIN_FACE_GATE_ENABLED=1              # 1 = асаалттай. Бусад утга = бүхэлд нь унтрах
                                       # (нууц үгийн алхам ч) — яаралтай гарц
ADMIN_FACE_LIVENESS_ENFORCED=          # хоосон/1 = анивчилтгүй бол татгалзана (2026-09-22-оос
                                       # анхдагч); 0 = зөвхөн бүртгэнэ, блоклохгүй

# ---- Нэвтрэлт, алдаа, AI -----------------------------------------------------
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
HONEYBADGER_API_KEY=
HONEYBADGER_PERSONAL_AUTH_TOKEN=       # System Logs таб уншихад (өөр credential)
ANTHROPIC_API_KEY=                     # байхгүй бол монгол үгийн шүүлт хэвээр
MODERATION_MODEL=                      # 0 = 179 MB ONNX загвар татахгүй (бага RAM)

# ---- Нөөцлөлт (зөвхөн VM дээр) ------------------------------------------------
DATABASE_ADMIN_URL=                    # mysqldump-д хэрэгтэй өндөр эрх
BACKUP_PASSPHRASE=                     # АЛДВАЛ БҮХ НӨӨЦ СЭРГЭЭГДЭХГҮЙ
BACKUP_BUCKET=sugi-asayake-backups
BACKUP_KEEP_DAYS=30

# ---- Тохируулга ----------------------------------------------------------------
DB_POOL_SIZE=25
SEARCH_ENGINE=                         # fulltext = хуучин хайлт руу буцаана
LOG_REQUESTS=
RUN_BACKGROUND_JOBS=
```

⚠️ **`GUEST_CHECKOUT_OTP=0` нь ЗӨВХӨН тест/E2E-ийн хувьсагч.** Production
`.env`-д тавибал зочны утасны баталгаажуулалт чимээгүй унтарна.

Клиент талд `VITE_HONEYBADGER_API_KEY` тохируулж болно — Vite build руу
шингэдэг тул нууц биш (Sentry-ийн public DSN-тэй ижил итгэлийн загвар).

---

## 8. Шинэ машин бэлтгэх

```powershell
.\scripts\oci\setup-laptop.ps1   # ssh түлхүүр, config, тунелийн task, CA татах
```

Скрипт 2-р алхамд хэвлэсэн нийтийн түлхүүрийг VM-ийн `authorized_keys`-д нэмэхийг
шаардана — үүнийг **аль хэдийн эрхтэй** машинаас эсвэл Oracle консолоор хийнэ.

⚠️ Хоёр лаптоп хоёулаа алдагдвал зөвхөн **Oracle консолын эрхээр** дамжин шинэ
түлхүүр нэмж болно. Тиймээс Oracle дансны нэвтрэх эрх нь ssh түлхүүрээс ч чухал.

VM-ийг дахин байгуулах: `scripts/oci/setup-vm.sh` (idempotent). Автоматжаагүй
зүйлс: Oracle консол дээрх VCN/subnet/security list, HeatWave instance үүсгэх,
`cloudflared` tunnel үүсгэх, `pm2 startup systemd`, `vm-backup.sh`-ийн crontab,
VM дээрх `.env` бичих.

---

## 9. Хоёр лаптоп — session бүрийн эхэнд

```powershell
git fetch --all --prune ; git status -sb
```

Хоёр лаптоп нэг репозитор, нэг өгөгдлийн сан, нэг R2 хуваалцдаг. Нөгөө лаптопын
migration бодит санд аль хэдийн ажилласан байж болох тул **"сан шинэ, код хуучин"**
гэсэн байдал чимээгүй үүснэ. Аппликейшн ажиллаж байгаа нь синк болсны баталгаа биш.

---

## 10. Утсаар турших, демо

```powershell
.\scripts\demo.ps1            # production build + node dist/index.js, LAN IP
.\scripts\demo.ps1 -Tunnel    # Cloudflare quick tunnel (HTTPS — камер ажиллана)
```

Production-only зүйлсийг (CSP, шахалт, статик зам) **заавал** энэ скриптээр нэг
удаа шалга — `pnpm dev`-д CSP байхгүй тул inline script-ийн алдаа харагддаггүй.
