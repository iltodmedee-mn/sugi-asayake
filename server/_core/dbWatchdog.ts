import { dbPing } from "../db/connection";
import { notifyOwner } from "./notification";
import { publicOrigin } from "./publicUrl";
import { classifyDbError, type DbFailureKind } from "./dbConnection";

/**
 * Өгөгдлийн сан унахад эзэнд имэйл (2026-10-01).
 *
 * Яагаад: HeatWave 2026-09-28-нд CA-гаа шинээр үүсгэж, production хэд хоногийн
 * дараа бүрэн унасан — хэн ч мэдээгүй, Tom хэрэглэгчийн байрнаас "Каталогийг
 * ачаалж чадсангүй"-г харж л мэдсэн. GitHub-ийн uptime монитор Cloudflare-д
 * хаагдсан (PROJECT-GUIDE №15) тул гаднаас дохио ирэхгүй.
 *
 * Энэ нь scheduler-ээс ТУСДАА энгийн таймер: scheduler өөрөө DB-ээс (claim,
 * lastRunAt) хамаардаг тул DB унахад зогсоно. Имэйл нь Brevo-гийн `.env`
 * тохиргоогоор явдаг (`notifyOwner` → `deliverEmail`) тул DB-гүйгээр ч ажиллана.
 * Зөвхөн background job эзэмшигч production процесс дээр (staging, лаптоп биш);
 * `DB_WATCHDOG=0` унтраана.
 */

const CHECK_INTERVAL_MS = 60_000;
/** 3 дараалсан алдаа (~3 мин) — түр зуурын сүлжээний хэлбэлзэлд сэрэмжлүүлэхгүй. */
const FAILURES_BEFORE_ALERT = 3;
/** Унасан хэвээр бол 6 цаг тутам сануулна. */
const REALERT_INTERVAL_MS = 6 * 60 * 60 * 1000;

export type WatchdogState = {
  consecutiveFailures: number;
  downSince: number | null;
  alertedAt: number | null;
  lastError: string | null;
};

export type WatchdogAction =
  | { kind: "none" }
  | { kind: "alert"; repeat: boolean }
  | { kind: "recovered"; downForMs: number };

export function initialWatchdogState(): WatchdogState {
  return { consecutiveFailures: 0, downSince: null, alertedAt: null, lastError: null };
}

/** Цэвэр шилжилт — тест хийхэд хялбар. `state`-ийг шинэчилж, хийх үйлдлийг буцаана. */
export function stepWatchdog(state: WatchdogState, result: { ok: boolean; error?: string }, now: number): WatchdogAction {
  if (result.ok) {
    const wasAlerted = state.alertedAt !== null;
    const downForMs = state.downSince !== null ? now - state.downSince : 0;
    Object.assign(state, initialWatchdogState());
    return wasAlerted ? { kind: "recovered", downForMs } : { kind: "none" };
  }
  state.consecutiveFailures += 1;
  state.lastError = result.error ?? null;
  if (state.downSince === null) state.downSince = now;
  if (state.consecutiveFailures < FAILURES_BEFORE_ALERT) return { kind: "none" };
  if (state.alertedAt === null) {
    state.alertedAt = now;
    return { kind: "alert", repeat: false };
  }
  if (now - state.alertedAt >= REALERT_INTERVAL_MS) {
    state.alertedAt = now;
    return { kind: "alert", repeat: true };
  }
  return { kind: "none" };
}

const minutes = (ms: number) => Math.max(1, Math.round(ms / 60_000));

/** Алдааны төрөл бүрт хийх эхний алхам — "tls_ca" нь HeatWave CA солигдсон (09-28, ~11-01-нд болсон). */
export function hintFor(kind: DbFailureKind): string {
  switch (kind) {
    case "tls_ca":
      return "HeatWave CA-гаа сольсон бололтой. Лаптопоос (репогийн root): .\\scripts\\oci\\rotate-db-ca.ps1 — шалгана; -Apply — шинэ CA-г VM-ийн prod+staging-д тавьж pm2 restart (docs/OPERATIONS.md §DB CA).";
    case "network":
    case "timeout":
      return "DB-д сүлжээгээр хүрэхгүй байна — OCI консол дээр HeatWave instance асаалттай эсэх, VCN/security list-ийг шалгана уу.";
    case "auth":
      return "DB нэвтрэлт татгалзсан — VM-ийн .env-ийн DATABASE_URL хэрэглэгч/нууц үг өөрчлөгдсөн эсэхийг шалгана уу.";
    default:
      return "Дэлгэрэнгүй: ssh sugi-oci 'pm2 logs sugi --lines 60'.";
  }
}

function alertContent(state: WatchdogState, repeat: boolean, now: number) {
  const since = state.downSince !== null ? new Date(state.downSince).toISOString() : "?";
  const lines = [
    `${publicOrigin()} сайтын сервер өгөгдлийн сантай ${minutes(now - (state.downSince ?? now))} минут холбогдож чадахгүй байна${repeat ? " (сануулга — унасан хэвээр)" : ""}.`,
    "",
    "Хэрэглэгчид каталог, сагс, захиалга ашиглаж чадахгүй ('Каталогийг ачаалж чадсангүй').",
    `Эхэлсэн: ${since}`,
    `Алдаа: ${state.lastError ?? "тодорхойгүй"}`,
    `Төрөл: ${classifyDbError(state.lastError)}`,
    "",
    hintFor(classifyDbError(state.lastError)),
  ];
  return lines.join("\n");
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startDbWatchdog() {
  if (timer || process.env.DB_WATCHDOG === "0") return;
  const state = initialWatchdogState();
  let running = false;
  timer = setInterval(() => {
    if (running) return;
    running = true;
    void (async () => {
      try {
        const now = Date.now();
        const action = stepWatchdog(state, await dbPing(), now);
        if (action.kind === "alert") {
          console.error(JSON.stringify({ event: "db_watchdog_alert", repeat: action.repeat, error: state.lastError }));
          await notifyOwner({ title: `⚠️ Сайтын өгөгдлийн сан холбогдохгүй байна`, content: alertContent(state, action.repeat, now) });
        } else if (action.kind === "recovered") {
          console.log(JSON.stringify({ event: "db_watchdog_recovered", downForMinutes: minutes(action.downForMs) }));
          await notifyOwner({ title: `✅ Сайтын өгөгдлийн сан сэргэлээ`, content: `${publicOrigin()} дахин өгөгдлийн сантай холбогдлоо (~${minutes(action.downForMs)} минут тасалдсан).` });
        }
      } catch (error) {
        console.error("[db-watchdog] check failed:", error instanceof Error ? error.message : error);
      } finally {
        running = false;
      }
    })();
  }, CHECK_INTERVAL_MS);
  timer.unref?.();
}
