import "dotenv/config";
// `pnpm dev` өмнө нь `NODE_ENV=development`-ийг shell-ийн inline prefix болгон
// hardcode хийдэг байсан бөгөөд Windows-ийн PowerShell (`cross-env`-гүй) үүнийг
// parse хийж чадахгүй ("'NODE_ENV' is not recognized..."). Зөвхөн үүний тулд
// шинэ dependency нэмэхийн оронд NODE_ENV-ийг энд анхдагчаар тавина — локал .env
// аль хэдийн NODE_ENV=development зарладаг (дээр ачаалагдсан), бодит deploy бүр
// процесс эхлэхээс өмнө NODE_ENV=production-ийг тодорхой тавьдаг тул энэ зөвхөн
// локал `tsx watch` ажиллагааны цоорхойг л нөхнө.
if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";
import compression from "compression";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { assertProductionSecrets, createContext } from "./context";
import { registerQPayCallbackRoute } from "../qpay";
import { registerStorepayCallbackRoute } from "../storepay";
import { registerVerifyMnCallbackRoute } from "../verifyMn";
import { warmUpModerationModel } from "./moderationModel";
import { warmCatalogSearchIndex } from "../search/catalogSearch";
import { warmUpImageSafety } from "./imageSafety";
import { dbPing, getDb } from "../db";
import { serveRobots, serveSitemap } from "./sitemap";
import { serveManifest } from "./manifest";
import { serveBrandIcon } from "./brandIcons";
import { serveMerchantFeed } from "./merchantFeed";
import { serveProductOgImage } from "./ogImage";
import { finishFacebookLogin, startFacebookLogin } from "./facebookAuth";
import { startScheduler } from "./scheduler";
import { startDbWatchdog } from "./dbWatchdog";
import { registerAbandonedCartReminderJob, registerDataRetentionJob, registerLowStockDigestJob, registerInventorySyncJob, registerNotificationOutboxPurgeJob, registerStaleTransferJob, registerStockLedgerDriftJob, registerReviewRequestJob, registerBackInStockJob } from "../automation";
import { startNotificationDispatcher } from "../notifications";
import { notifyError, registerHoneybadgerErrorMiddleware, registerHoneybadgerMiddleware } from "./honeybadger";
import { limitApiTraffic, protectStateChangingApiRequests, setSecurityHeaders } from "./security";
import { blockScannerProbes } from "./scannerProbes";
import { logRequests } from "./requestLog";
import { trpcBatchGuard } from "./trpcBatchGuard";
import { serveStatic, setupVite } from "./vite";
import { describeClusterRole, isBackgroundJobRunner } from "./clusterRole";
import { planMysqlConnection } from "./dbConnection";
import { assertMigrationsApplied } from "./migrationCheck";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * 2026-09-27: there was no SIGTERM/SIGINT handler at all -- pm2 restart /
 * `deploy.ps1` / a plain Ctrl+C killed the process mid-request and left the
 * MySQL pool's connections to close uncleanly (Aiven/HeatWave's own
 * `Aborted_clients` counter). Stop accepting new connections, let in-flight
 * requests finish, close the DB pool, then exit -- bounded so a stuck
 * connection can never hang a deploy forever. No `startScheduler`/
 * `startNotificationDispatcher` stop hook exists (server/_core/scheduler.ts,
 * server/notifications.ts) to call here; skipped rather than invented.
 */
function registerGracefulShutdown(server: ReturnType<typeof createServer>): void {
  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] ${signal} received, closing gracefully...`);
    const forceExitTimer = setTimeout(() => {
      console.error("[shutdown] graceful shutdown timed out after 10s, forcing exit");
      process.exit(1);
    }, 10_000);
    forceExitTimer.unref();
    // Idle keep-alive sockets (dev's own tsx watch reload, an idle browser
    // tab) would otherwise hold server.close()'s callback open until they
    // time out on their own -- closing them immediately still lets a
    // genuinely in-flight request finish before the callback fires.
    server.closeIdleConnections();
    // Dev: Vite HMR-ийн websocket хэзээ ч idle болдоггүй тул close() 10 с гацна —
    // хөгжүүлэгчийн Ctrl+C-д бүх холболтыг шууд хаана (production-д websocket алга).
    if (process.env.NODE_ENV !== "production") server.closeAllConnections();
    server.close(closeError => {
      if (closeError) console.error("[shutdown] error closing HTTP server:", closeError);
      void (async () => {
        try {
          const db = await getDb();
          if (db) await new Promise<void>(resolve => db.$client.end(endError => {
            if (endError) console.error("[shutdown] error closing DB pool:", endError);
            resolve();
          }));
        } catch (error) {
          console.error("[shutdown] error during DB pool shutdown:", error);
        } finally {
          clearTimeout(forceExitTimer);
          process.exit(0);
        }
      })();
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

async function startServer() {
  // Аудитын олдвор BUG-001: бодит session гарын үсгийн нууц тохируулаагүй бол
  // production-д эхлэхээс татгалзана — hardcode-логдсон, нийтэд commit хийгдсэн
  // нууц руу чимээгүй буцахын оронд (context.ts-ийн secretKey()).
  assertProductionSecrets();
  // getDb() залгидаг тул DB-ийн буруу тохиргоо (production-д CA байхгүй гэх мэт)
  // чимээгүй DB-гүй асахын оронд эхлэхээс татгалзана (pm2 алдааг харуулна).
  if (process.env.DATABASE_URL) planMysqlConnection(process.env.DATABASE_URL);
  // 2026-10-05: кодын шаарддаг migration DB-д ороогүй бол production-д ЭХЛЭХГҮЙ —
  // 0098/0099-гүй deploy checkout болон сешн бүрийг чимээгүй унагаадаг байв (migrationCheck.ts).
  await assertMigrationsApplied();
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(setSecurityHeaders);
  // 2026-09-12: .env / .git / *.php / WordPress маягийн сканнерын probe-ыг
  // нүцгэн 404-өөр татгалзаж, давтан оролдогчийг нэг цаг хаана — compression,
  // rate limit эсвэл SPA fallback тэдэнд юу ч зарцуулахаас өмнө. Дараа нь
  // LOG_REQUESTS=1 бол хүсэлт бүрт access-log мөр.
  app.use(blockScannerProbes);
  app.use(logRequests);
  // Frontend гүйцэтгэлийн аудит (2026-09-02): JSON (tRPC хариу) болон энэ
  // процессын шууд serve хийдэг HTML/CSS/JS-ийг gzip/brotli шахна —
  // Монголын дундаж 17 Mbps мобайл холболтод бодит жин, дараа нь ямар hosting/CDN
  // шийдвэр гарахаас үл хамааран үнэгүй (урд нь CDN тавивал тэр ч шахна, гэхдээ
  // энэ серверийн аль хэдийн илгээдэг хариуг шахахын тулд түүнийг хүлээх
  // шалтгаан байхгүй).
  app.use(compression());
  // Алдааны бүртгэл (2026-09): HONEYBADGER_API_KEY тавигдаагүй бол no-op —
  // server/_core/honeybadger.ts. Honeybadger-ийн өөрийн setup гэрээгээр яг энэ
  // эрт байх ёстой (бусад апп middleware-ээс өмнө).
  registerHoneybadgerMiddleware(app);
  app.use(limitApiTraffic);
  app.use(protectStateChangingApiRequests);
  // Файл upload-д зориулж body parser-ийн хэмжээний хязгаарыг томсгоно.
  //
  // 2026-09-20 (аудит): 50mb байсныг 20mb болгов. Хамгийн том ЗӨВШӨӨРӨГДСӨН бие
  // нь барааны зураг (`dataBase64` max 14,000,000 тэмдэгт ≈ 14 MB) бөгөөд CV нь
  // 7.2 MB — 20mb нь тэр бүхэнд тав тухтай багтана. 50mb нь зөвхөн эрсдэл нэмж
  // байв: биеийг санах ойд бүтнээр нь цуглуулдаг тул нэвтэрсэн хэдэн хүсэлт
  // хостын RAM-ыг (production VM 954 MB, доорх moderationModel.ts-ийн хэмжилт)
  // хоосолж чадна. Хэтэрсэн бие 413-аар цэвэр татгалзана.
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));
  registerStorageProxy(app);
  registerQPayCallbackRoute(app);
  registerStorepayCallbackRoute(app);
  registerVerifyMnCallbackRoute(app);
  // Backend аудит (2026-09-02): байгаа system.health нь tRPC procedure
  // (/api/trpc/system.health) бөгөөд ихэнх гадны uptime монитор (UptimeRobot
  // г.м.) шууд шалгаж чадахгүй — тэд тогтмол зам дээрх энгийн нэвтрэлтгүй GET
  // хүлээдэг. Энэ мөн dbPing()-ээр бодит DB холболтыг шалгана (admin самбарын
  // "DB хүрэх үү" үзүүлэлтийн ижил шалгалт), зөвхөн Node процесс амьд гэдгийг
  // батлахын оронд — учир нь энэ төсөлд бодит, баримтлагдсан алдааны горимтой
  // зүйл нь DB-ийн холболт.
  app.get("/health", async (_req, res) => {
    const db = await dbPing();
    // 2026-09-23: driver-ийн алдааны текстийг НИЙТЭД гаргахгүй. Өмнө нь
    // `db.error` шууд буцдаг тул нэвтрэлтгүй хүсэлт "Access denied for user
    // 'sugi'@'10.0.0.5'" эсвэл дотоод IP:порт харах боломжтой байсан — яг тэр
    // хэлбэрийг `maskErrorShape` бусад бүх газарт нуудаг. Дэлгэрэнгүйг
    // админын `systemHealth` procedure хэвээр үзүүлнэ.
    if (!db.ok) console.error("[health] database ping failed:", db.error);
    // `reason` нь зөвхөн ангилал (tls_ca/network/…) — алдааны текст биш. uptime alert-д орж
    // "tls_ca" үед HeatWave CA солигдсоныг шууд хэлнэ (2026-11-07).
    res.status(db.ok ? 200 : 503).json({ ok: db.ok, database: db.ok ? "up" : "down", ...(db.ok ? {} : { reason: db.kind ?? "other" }), time: new Date().toISOString() });
  });
  // Хүлээгдсэн, хэрэглэгчид харагдах үр дүн (буруу оролт, буруу нууц үг,
  // ашигласан купон, ...) — эдгээрийг Honeybadger-т мэдээлбэл үнэгүй tier-ийн
  // сарын 5,000 хязгаарыг bug биш ердийн validation үр дүнгээр дүүргэнэ.
  // Бусад бүгд (INTERNAL_SERVER_ERROR, эсвэл adapter-ийн ороосон TRPCError биш
  // throw) бодит, гэнэтийн алдаа тул мэдээлэгдэнэ.
  const EXPECTED_TRPC_ERROR_CODES = new Set(["BAD_REQUEST", "UNAUTHORIZED", "FORBIDDEN", "NOT_FOUND", "CONFLICT", "PRECONDITION_FAILED", "TOO_MANY_REQUESTS"]);
  // tRPC API
  // 2026-10-01: Cloudflare Access-ийн admin*/inventory* дүрмийг batch-ээр тойрохоос хамгаална.
  app.use("/api/trpc", trpcBatchGuard);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      // Алдааны бүртгэл (2026-09): tRPC өөрийн алдааг Express-ийн error-middleware
      // гинжинд хүрэхээс өмнө serialize хийдэг тул доорх
      // registerHoneybadgerErrorMiddleware tRPC procedure-ийн алдааг хэзээ ч
      // хардаггүй — энэ hook жинхэнэ холболтын цэг.
      onError({ error, path, type }) {
        if (EXPECTED_TRPC_ERROR_CODES.has(error.code)) return;
        notifyError(error, { path, type });
      },
    })
  );
  // 2026-09-09 гүнзгий аудит: /favicon.ico SPA fallback руу унаж index.html-ийг
  // "text/html"-ээр буцаадаг байв — хуучин замыг шалгасаар буй хөтчүүд (ба
  // ингэдэг хэрэгсэл бүр) icon-ийн оронд HTML-тэй 200 авдаг байв.
  // Жинхэнэ icon нь client/index.html-ийн <link rel="icon">; тийш нь
  // явуулна.
  app.get("/favicon.ico", (_req, res) => res.redirect(302, "/icons/favicon-64.png"));
  // Crawler-ийн гадаргуу (2026-09-13): каталогоос sitemap, түүн рүү заасан
  // robots — хоёулаа динамик тул origin PUBLIC_BASE_URL-ийг дагана. Статик/SPA
  // fallback-аас өмнө бүртгэгдэнэ — тэр өмнө нь /sitemap.xml-д index.html
  // өгч, хуучирсан Manus host нэрлэсэн robots.txt serve хийдэг байв.
  // "Facebook-ээр үргэлжлүүлэх" (2026-09-13): энгийн OAuth redirect + callback,
  // FACEBOOK_APP_ID/SECRET тавигдтал 404. server/_core/facebookAuth.ts.
  app.get("/api/auth/facebook", startFacebookLogin);
  // 2026-09-23: `.catch(next)` — өмнө нь `void` байсан тул handler дотор
  // баригдаагүй уналт (жишээ нь эвдэрсэн cookie дээрх URIError) глобал
  // unhandledRejection руу орж, хүсэлтэд ХАРИУ ХЭЗЭЭ Ч бичигдэхгүй, хөтөч
  // timeout хүртэл хүлээдэг байв.
  app.get("/api/auth/facebook/callback", (req, res, next) => { finishFacebookLogin(req, res).catch(next); });
  app.get("/sitemap.xml", serveSitemap);
  app.get("/robots.txt", serveRobots);
  // PWA manifest — нэр/өнгө тохиргооноос (эзэн солих, manifest.ts). Статик файлаас ӨМНӨ.
  app.get("/manifest.webmanifest", (req, res, next) => { serveManifest(req, res).catch(next); });
  // Таб/апп дүрс логоноос (brandIcons.ts) — тохиргоо асаагаагүй бол статик /icons руу 302.
  app.get("/brand-icon/:name.png", (req, res, next) => { serveBrandIcon(req, res).catch(next); });
  // Google Merchant Center-ийн scheduled-fetch URL (2026-09-14).
  app.get("/feeds/google-merchant.xml", serveMerchantFeed);
  // Барааны 1200x630 хуваалцах карт (2026-09-14, ogImage.ts).
  app.get("/og/product/:slug", serveProductOgImage);
  // development горим Vite, production горим статик файл ашиглана
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // 2026-09-23: `express.static`-ийн `index: false` нь ЗӨВХӨН лавлахын
    // индексийг хаадаг — `/index.html`-ийг шууд хүсвэл дискний файл хэвээр
    // serve хийгддэг бөгөөд тэр файлд `%SEO_TITLE%`, `%SEO_CANONICAL%`,
    // `%STOREFRONT_BOOTSTRAP_JSON%` зэрэг бөглөгдөөгүй placeholder-ууд байна.
    // Crawler тэр холбоосыг олбол эвдэрсэн давхардсан хуудсыг индексжүүлнэ.
    app.get("/index.html", (_req, res) => res.redirect(301, "/"));
    serveStatic(app);
  }
  // tRPC-ийн ГАДНАХ route-уудын алдааг барина (storage proxy, QPay webhook) —
  // Honeybadger-ийн requestHandler/errorHandler дарааллын гэрээгээр бүх route-
  // ийн дараа байх ёстой.
  registerHoneybadgerErrorMiddleware(app);

  const preferredPort = parseInt(process.env.PORT || "3000");
  // Ачааллын бэлтгэл (2026-09-16): "завгүй бол дараагийн порт" гэдэг нь ЗӨВХӨН
  // локал хөгжүүлэлтийн тав тух (хоёр `pnpm dev` зэрэг). Production-д энэ нь
  // чимээгүй эвдрэл байв: cloudflared тунель болон deploy-ийн health шалгалт
  // хоёул тогтсон порт руу заадаг тул сервер 3001 дээр "амжилттай" гарахад
  // сайт гаднаасаа 502 хэвээр үлдэнэ. Мөн pm2-ийн cluster горимд worker бүр
  // ижил порт дээр (нэг сокетыг хуваалцан) сонсох ЁСТОЙ — тэнд порт "завгүй"
  // мэт харагдвал worker бүр өөр порт руу тарах байсан. Production-д завгүй
  // порт бол чанга унана: pm2 дахин эхлүүлж, log-д шалтгаан үлдэнэ.
  const port = process.env.NODE_ENV === "development" ? await findAvailablePort(preferredPort) : preferredPort;

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Харилцагчийн контентын аюулгүй байдлын загварууд (2026-09-13): эхний сэтгэгдэл /
  // avatar upload эхлэлийн зардал төлөхгүйн тулд ард ачаална. Хоёулаа унтраалттай
  // үед no-op, боломжгүй үед зөөлөн (log) унана.
  warmUpModerationModel();
  warmUpImageSafety();
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  registerGracefulShutdown(server);
  // Хайлт v3 (2026-09-20): индексийг урьдчилан барина — worker бүр өөрийнхөө.
  // Production-д 5 с хойшлуулна: boot дээрх HeatWave холболтын багцтай зэрэгцэхгүй.
  warmCatalogSearchIndex(process.env.NODE_ENV === "production" ? 5_000 : 0);

  // Admin шинэчлэл (2026-09-08, Phase D-F): энэ аппын цорын ганц процесс доторх
  // scheduler — server/_core/scheduler.ts, дээр нь бүртгэгдсэн бодит job-уудыг
  // server/automation.ts-ээс үзнэ.
  // 2026-09-16: олон процесс (pm2 cluster) үед ЗӨВХӨН нэг instance эзэмшинэ —
  // эс бөгөөс орхигдсон сагсны сануулга, вендорын таталт бүр N дахин явна
  // (server/_core/clusterRole.ts).
  console.log(`[cluster] ${describeClusterRole()}`);
  if (!isBackgroundJobRunner()) return;
  // DB унахад эзэнд имэйл — scheduler-ээс тусдаа, DB-гүйгээр ажилладаг (2026-10-01 тасалдал).
  if (process.env.NODE_ENV === "production") startDbWatchdog();
  registerAbandonedCartReminderJob();
  registerReviewRequestJob();
  registerBackInStockJob();
  registerLowStockDigestJob();
  registerNotificationOutboxPurgeJob();
  registerDataRetentionJob();
  registerStockLedgerDriftJob();
  registerStaleTransferJob();
  registerInventorySyncJob();
  startScheduler();
  // Утасны push мэдэгдэл (2026-09-11) — зөвхөн NOTIFICATIONS_DISPATCH=1 машин
  // дээр илгээнэ; server/notifications.ts.
  startNotificationDispatcher();
}

// Backend аудит (2026-09-02): аль ч handler хаана ч байсангүй — tRPC-ийн өөрийн
// алдааны хилийн гаднах баригдаагүй async алдаа (tRPC procedure-ийн алдааг
// @trpc/server аль хэдийн барьж serialize хийдэг) сүүлчийн боловсруулалтгүй
// байв. Гарахын оронд log бичээд үргэлжлүүлнэ: процессын өөр газрын нэг муу
// promise (fire-and-forget дуудлага, timer callback) бусад бүх явж буй хүсэлтийн
// төлөө серверийг бүхэлд нь унагаах ёсгүй, Node-ийн uncaughtException-ийн
// анхдагч зан төлөв аль хэдийн процессыг унагаадаг тул дор хаяж түүнээс өмнө
// яагаад гэдгийг тайлбарласан тодорхой log мөр баталгаажуулна.
process.on("unhandledRejection", reason => {
  console.error("[process] Unhandled promise rejection:", reason);
  notifyError(reason, { source: "unhandledRejection" });
});
process.on("uncaughtException", error => {
  console.error("[process] Uncaught exception:", error);
  notifyError(error, { source: "uncaughtException" });
});

// 2026-09-23: эхлүүлэлт уначихвал ЗААВАЛ exit(1). Өмнө нь зөвхөн логлодог
// байсан тул `assertProductionSecrets()` эсвэл `serveStatic()` шидэхэд процесс
// код 0-оор гарах, эсвэл listener-гүйгээр "амьд" үлдэх боломжтой байв —
// pm2 түүнийг "online" гэж харуулж, нийтийн `/health` нь ХУУЧИН процессоос
// 200 буцаасаар байх тул юу ч улаан болдоггүй.
startServer().catch(error => {
  console.error("[startup] server failed to start:", error);
  notifyError(error, { source: "startup" });
  process.exitCode = 1;
  // Honeybadger-т илгээх багахан хугацаа өгөөд гарна.
  setTimeout(() => process.exit(1), 1_000).unref();
});
