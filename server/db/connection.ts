// server/db/connection.ts — Холболт, pool, getDb/dbPing; борлуулалтын SQL нөхцөл (settledSaleSql), захиалгын дугаар.
// 2026-09-21: server/db.ts (7 066 мөр) домэйнээр хуваагдав; server/db.ts нь одоо barrel
// (export *) тул import зам өөрчлөгдөөгүй. Функц зөөхдөө энэ файлын import-ыг мөн шинэчил.

import { sql, type SQLWrapper } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { classifyDbError, describeTransport, planMysqlConnection, type DbFailureKind } from "../_core/dbConnection";
import { orders } from "../../drizzle/schema";
import { sqlQueryLogger } from "../_core/sqlQueryLog";

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Audit 2026-09-09: the ONE definition of "this order counts as a sale that
 * actually happened" -- used by every revenue, loyalty-spend, bestseller and
 * analytics query in this file and in server/analytics.ts.
 *
 * `paymentStatus = 'paid'` alone (what every reader used to check) is not
 * enough: a QPay order becomes "paid" the moment the webhook lands, while its
 * fulfilment status is still pending/confirmed -- exactly the window in which
 * a customer may self-cancel it (orders.cancel) or a warehouse user may cancel
 * it (admin.updateOrder). Cancellation restores stock but deliberately never
 * touches paymentStatus (the money really was collected and is now owed
 * back), so such an order stayed "paid" forever and was silently counted as
 * revenue, as lifetime loyalty spend (a free tier upgrade for a purchase that
 * never shipped), and as bestseller volume -- while analytics.ts's own header
 * comment promised "a pending/cancelled order never inflates revenue".
 * Excluding cancelled orders here restores that promise in one place. A
 * refunded order is already excluded by paymentStatus <> 'paid'.
 */
export const settledSaleSql = sql`(${orders.paymentStatus} = 'paid' AND ${orders.status} <> 'cancelled')`;

/** SQL twin of shared/orders.ts's isRefundOwed: the customer's money was
 *  collected and the order is dead -- finance owes a refund. */
export const refundOwedSql = sql`(${orders.paymentStatus} = 'paid' AND ${orders.status} = 'cancelled')`;

// Audit 2026-09-09 (R5): "SA" + base-36 milliseconds + 6 random base-36
// characters (was 4). orders.orderNumber is UNIQUE, so a same-millisecond
// collision never silently duplicates -- but it used to surface as a raw
// database error to the shopper. Six characters make a collision ~1 in 2.2
// billion per same-millisecond pair, and createOrderFromActiveCart retries
// with a fresh number on the remaining chance. Injectable for the test that
// proves the retry (see order-unwind.integration.test.ts).
/**
 * LIKE-ийн орлуулагч тэмдэгтүүдийг хэрэглэгчийн хайлтын үгнээс салгана
 * (2026-09-23). Параметр нь bound тул injection байхгүй боловч `%` нь БҮХ
 * мөрийг, `_` нь дурын нэг тэмдэгтийг тааруулдаг тул хайлтын үр дүн эрс
 * өөр болно. MySQL-ийн анхдагч escape тэмдэгт нь `\\`.
 */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

/**
 * Дэлгүүрийн (Улаанбаатар, UTC+8, 2017-оос DST-гүй) календарын өдөр
 * (2026-09-23). Session нь `time_zone='+00:00'` тул `date(createdAt)` нь UTC
 * өдөр — 08:00-аас өмнөх захиалга график, sparkline дээр ӨМНӨХ өдөрт
 * бүртгэгддэг байв (admin-ий хөтөч орон нутгийн өдрөөр тааруулдаг).
 * Тоон offset-той `convert_tz` нь MySQL-ийн цагийн бүсийн хүснэгтгүйгээр ажиллана.
 */
export const storeDaySql = (column: SQLWrapper) => sql<string>`date(convert_tz(${column}, '+00:00', '+08:00'))`;
/** JS талын хос нь: Date → дэлгүүрийн өдрийн "YYYY-MM-DD". */
export const storeDayString = (value: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);

export function generateOrderNumber(): string {
  return `SA${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

/** MySQL's duplicate-key error, for one named unique key. mysql2 wraps the
 *  driver error, so the cause is checked as well as the error itself. */
export function isDuplicateKeyError(error: unknown, keyName: string): boolean {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  return candidates.some(candidate => {
    if (!candidate || typeof candidate !== "object") return false;
    const { code, errno, message } = candidate as { code?: string; errno?: number; message?: string };
    return (code === "ER_DUP_ENTRY" || errno === 1062) && typeof message === "string" && message.includes(keyName);
  });
}

export function isDuplicateOrderNumberError(error: unknown): boolean {
  return isDuplicateKeyError(error, "orderNumber");
}

/**
 * Ачааллын бэлтгэл (2026-09-16): pool-ийн хэмжээ. mysql2-ийн анхдагч
 * `connectionLimit` нь 10 бөгөөд энэ нь нэг процессын зэрэг боловсруулж чадах
 * DB-д хүрэх хүсэлтийн тоог 10-аар тогтоодог — Бангалор/Токиогийн RTT дээр яг
 * энэ нь нүүр хуудсыг 30–60 query/с-т тулгадаг таг байв.
 *
 * Бодитоор хэмжсэн хязгаар (2026-09-16, HeatWave `sugi-db`): `max_connections`
 * = 200, түүхэн дээд нь `Max_used_connections` = 33. Нэг ижил DB-г production,
 * staging, хоёр лаптоп, өдөр тутмын backup дөрвүүлээ хуваалцдаг тул pool
 * бүрийг 200-д багтаах ёстой: анхдагч 25 × (prod + staging + 2 лаптоп) = 100,
 * үлдсэн тал нь backup/migration/гар script-т үлдэнэ.
 *
 * `maxIdle`/`idleTimeout` нь оргил ачаалал өнгөрсний дараа сул холболтыг буцааж
 * өгнө — эс бөгөөс нэг оргил 25 холболтыг `wait_timeout` (8 цаг) хүртэл эзэмшинэ.
 *
 * `DB_POOL_SIZE`-аар дарж болно (cluster горимд ажиллуулбал НЭГ worker-т ногдох
 * тоог өгнө — server/_core/clusterRole.ts-ийн тайлбарыг үзнэ үү).
 */
function poolSizing(): { connectionLimit: number; maxIdle: number; idleTimeout: number } {
  const parsed = Number.parseInt(process.env.DB_POOL_SIZE ?? "", 10);
  const connectionLimit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 25;
  return { connectionLimit, maxIdle: Math.min(10, connectionLimit), idleTimeout: 60_000 };
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Backend audit (2026-09-02): drizzle(connectionString) used to pass
      // a bare string, which lets mysql2 apply its own defaults for
      // everything (connectionLimit: 10, queueLimit: 0/unbounded, no
      // connectTimeout, no keepAlive). docs/PROJECT-GUIDE.md documents real, repeated
      // Aiven network-latency spikes serious enough that vitest's own test
      // timeout had to be raised from 5s to 30s; production code had zero
      // handling for the same kind of blip -- a slow Aiven response just
      // hung whatever request was in flight indefinitely instead of
      // failing cleanly. connectTimeout bounds how long a NEW connection
      // attempt can hang (it does not bound an already-established
      // connection's query time -- mysql2 has no simple per-query timeout
      // independent of the connection itself), so this is a targeted,
      // proportionate fix for the specific documented failure mode, not a
      // general retry/circuit-breaker layer. Passed via drizzle's own
      // { connection: {...} } config form (rather than constructing a
      // mysql2 Pool by hand) so drizzle creates the pool with its own
      // resolved copy of mysql2 -- avoids a cross-package Pool type clash
      // when pnpm hoists a different mysql2 version at the workspace root.
      // Phase K: every query Drizzle issues also passes through the
      // in-process ring buffer that backs the admin "SQL лог" tab (see
      // server/_core/sqlQueryLog.ts for why this can't just read Aiven's
      // own slow-query log instead).
      // 2026-09-09 deep audit: the URI form let mysql2 parse DATABASE_URL
      // itself, and mysql2 does not know "ssl-mode=REQUIRED" -- it warned
      // and connected to Aiven in PLAINTEXT (Ssl_cipher empty on the live
      // service). planMysqlConnection turns the URL into explicit options
      // and enables TLS for every non-loopback host; see
      // server/_core/dbConnection.ts for the CA-verification rules.
      const plan = planMysqlConnection(process.env.DATABASE_URL);
      if (plan.transport !== "plaintext-loopback") console.warn(`[db] ${describeTransport(plan)}`);
      // connectTimeout 10s -> 30s (2026-09-13): on the 1-ECPU HeatWave
      // instance the boot burst (scheduler jobs, notification dispatcher,
      // warm-ups) opens ~10 TLS handshakes at once and the last ones took
      // longer than 10s to be accepted -- "connect ETIMEDOUT" in the
      // notification dispatcher on every start, Aborted_connects climbing
      // on the server. A slow handshake is not a dead server; 30s bounds
      // a genuinely unreachable host well enough.
      _db = drizzle({ connection: { ...plan.options, connectTimeout: 30_000, enableKeepAlive: true, ...poolSizing() }, logger: sqlQueryLogger });
      // drizzle-orm's mysql `timestamp` column hard-assumes the DB session
      // is UTC: it reads a raw wire value and appends "+0000" (see
      // node_modules/drizzle-orm/mysql-core/columns/timestamp.js), and
      // writes a Date by stripping its own UTC ISO string down to a plain
      // "YYYY-MM-DD HH:MM:SS". If the MySQL session's time_zone is
      // anything else (MySQL's default is `SYSTEM`, i.e. the server OS's
      // local zone — not UTC), `NOW()`/`defaultNow()` columns come back
      // shifted by the local UTC offset relative to app-computed Date
      // values (confirmed locally: an 8-hour skew against Asia/Ulaanbaatar,
      // caught by a `dateFrom`/`dateTo` audit-log filter test that compared
      // a `createdAt` column straight against `new Date()`). Force every
      // pooled connection to UTC so app-computed and DB-generated
      // timestamps are always comparable.
      _db.$client.on("connection", connection => connection.query("SET time_zone = '+00:00'"));
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// TIER 6: lightweight admin-panel "is the database reachable" check — a bare
// SELECT 1, not a real query, so it's cheap enough to run on every dashboard
// load. Never throws: reports the failure instead, same contract as
// storagePing() in server/storage.ts.
export async function dbPing(): Promise<{ ok: boolean; error?: string; kind?: DbFailureKind }> {
  try {
    const db = await getDb();
    if (!db) return { ok: false, error: "DATABASE_URL тохируулаагүй байна.", kind: "config" };
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (error) {
    // drizzle-ийн "Failed query: SELECT 1" нь шалтгааныг (TLS, auth, timeout) `cause`-д нуудаг.
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : null;
    const message = error instanceof Error ? error.message.split("\n")[0] : "Unknown database error";
    const text = cause ? `${message} — ${cause}` : message;
    return { ok: false, error: text, kind: classifyDbError(text) };
  }
}
