import { adminTabId } from "@/lib/adminTab";
import { trpc } from "@/lib/trpc";
import { FACE_REQUIRED_ERR_MSG, REAUTH_REQUIRED_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, splitLink, TRPCClientError } from "@trpc/client";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import { captureTrafficSource } from "./lib/trafficSource";
import { reloadOnceForStaleChunk } from "./lib/lazyRetry";
import { startInstallWatch } from "./lib/pwaInstall";
import "./index.css";
// index.css-ийн ДАРАА (каскадын гэрээ: styles/storefront.css).
import "./styles/storefront.css";

captureTrafficSource();

// "Аппаар суулгах" (2026-09-16). ЗААВАЛ render-ээс өмнө: Chrome нь
// `beforeinstallprompt`-ийг эхний зурагдалтаас ч өмнө шиддэг тул компонент
// дотроос сонсвол эвент аль хэдийн өнгөрсөн байдаг. lib/pwaInstall.ts.
startInstallWatch();

// PWA service worker (2026-09-13). Хуудас ачаалагдсаны дараа бүртгэгдэнэ тул
// эхний paint-тай хэзээ ч өрсөлдөхгүй; scope "/" тул /shop, /product/*, офлайн
// хуудас бүгд хамрагдана. Dev санаатай хасагдсан.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  });
}

// Deploy-ийн дараах хуучин build (2026-09-13): code-split chunk эсвэл түүний CSS
// татагдахгүй үед Vite үүнийг өдөөнө — энэ tab нээлттэй байхад болсон deploy
// файлын нэрийг сольсон. Алдааны дэлгэц харуулахын оронд tab шинэ build-ийг
// авахын тулд нэг удаа reload хийнэ; lazyRetry() React.lazy замыг ижил аргаар
// хамарна. shared/chunk-error.ts.
window.addEventListener("vite:preloadError", event => {
  if (reloadOnceForStaleChunk()) event.preventDefault();
});

// Алдааны бүртгэл (2026-09): server/_core/honeybadger.ts-тэй ижил Honeybadger
// төсөл, тусдаа VITE_-prefix түлхүүр — зөвхөн VITE_-prefix env хувьсагч client
// bundle-д ил гардаг — Vite ямар ч тохиолдолд built JS-д шингээнэ, гэхдээ энд
// хүлээгдсэн (Sentry-ийн public DSN-тэй ижил итгэлийн загвар, нууц биш).
// Түлхүүргүй бол сервер талтай ижил бүрэн no-op тул түлхүүргүй локал dev өмнөх
// шигээ ажиллана.
const honeybadgerApiKey = import.meta.env.VITE_HONEYBADGER_API_KEY as string | undefined;
// Bundle аудит (2026-09-13): @honeybadger-io/react storefront-ийн зочилт бүрт
// үндсэн chunk-ийн 55KB байсан атлаа энэ deploy дээр түлхүүр тохируулаагүй.
// Одоо зөвхөн түлхүүр байгаа үед, тэр үед ч эхний paint-ийн дараа ажилладаг
// dynamic import — нэг секунд хоцорч эхлэх алдааны мэдээлэл юу ч алдахгүй;
// critical path дээрх JS 4G утсанд LCP-ийн үнэтэй.
if (honeybadgerApiKey) {
  void import("@honeybadger-io/react").then(({ Honeybadger }) => {
    Honeybadger.configure({ apiKey: honeybadgerApiKey, environment: import.meta.env.DEV ? "development" : "production" });
  });
}

// Frontend гүйцэтгэлийн аудит (2026-09-02): defaultOptions-гүй бол React Query-
// ийн анхдагч staleTime 0 — remount/цонх focus бүр саяхан ирсэн өгөгдлийг ч
// дахин татдаг, давтан navigation-д харагдах ачааллын анивчилт. 30с нь ийм
// хэлбэрийн client-д React Query-ийн одоогийн (2026) зөвлөмжтэй таарна.
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } });

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  // 2026-09-12: сервер одоо амьд царайны баталгаагүй admin панелийн дуудлагыг
  // татгалзана (idle lock дууссан, эсвэл lock-оос өмнөх баталгаа). faceAuth.status-
  // ийг дахин асуух нь камерыг дэлгэцэнд буцаана; AdminFaceGate зөвхөн тэр query-
  // ээс render хийнэ.
  // 2026-09-22: нууц үгийн step-up дууссан/байхгүй бол ч мөн адил — status
  // `passwordConfirmed: false` буцааж, хаалга нууц үгийн дэлгэцийг харуулна.
  if (error.message === FACE_REQUIRED_ERR_MSG || error.message === REAUTH_REQUIRED_ERR_MSG) {
    void queryClient.invalidateQueries({ predicate: query => Array.isArray(query.queryKey[0]) && (query.queryKey[0] as unknown[])[0] === "faceAuth" });
    return;
  }

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

// Admin царайны баталгаа энэ tab-д холбоотой (client/src/lib/adminTab.ts);
// бусад дуудлагад хор нөлөөгүй тул зүгээр л үргэлж илгээнэ.
function trpcFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers ?? {});
  headers.set("x-admin-tab", adminTabId());
  return globalThis.fetch(input, {
    ...(init ?? {}),
    headers,
    credentials: "include",
  });
}

// 2026-10-01: admin./inventory. процедур нь ТУСДАА batch-ээр явна. Cloudflare Access зөвхөн
// URL-ийн эхний процедурыг хардаг тул холимог batch (`catalog.list,admin.x`) нь Access-ийг тойрдог;
// сервер (server/_core/trpcBatchGuard.ts) холимог batch-ийг 400-аар татгалзана.
const trpcClient = trpc.createClient({
  links: [
    splitLink({
      condition: op => op.path.startsWith("admin.") || op.path.startsWith("inventory."),
      true: httpBatchLink({ url: "/api/trpc", transformer: superjson, fetch: trpcFetch }),
      false: httpBatchLink({ url: "/api/trpc", transformer: superjson, fetch: trpcFetch }),
    }),
  ],
});

const app = (
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

// Нүүрний shell-ийн (server/_core/heroShell.ts) hero зураг ЗУРАГДСАНЫ дараа л
// React-ийг mount хийнэ (2026-09-21). Home нь shell-ийг эхний frame-дээ нуудаг
// тул JS зурагнаас түрүүлж ирвэл shell-ийн зураг хэзээ ч зурагдахгүй → LCP нь
// React-ийн зураг болж, Lighthouse/PageSpeed түүнийг "бүх JS татаж ажиллуулсны
// дараа" гэж загварчилдаг (production дээр 89 ↔ 81 гэж зөвхөн уралдаанаар
// хэлбэлзэж байв). "load + нэг frame" хангалтгүй гэдгийг хөтөч дээр хэмжиж
// баталсан (load-оос 58 мс-ийн дараа ч LCP бичигдээгүй) — тиймээс хөтчийн
// өөрийнх нь дохиог хүлээнэ: яг тэр <img>-ийн LCP entry. Нөөц: LCP дэмждэггүй
// хөтөч (зарим Safari) эсвэл зураг хамгийн том биш бол load + 150 мс; зураг
// унавал шууд; ямар ч тохиолдолд 1.2 с-ээс илүү хүлээхгүй.
function afterHeroShellImagePaint(mount: () => void) {
  const img = document.querySelector<HTMLImageElement>('#hero-shell img[fetchpriority="high"]');
  if (!img || img.complete) {
    mount();
    return;
  }
  let mounted = false;
  let observer: PerformanceObserver | undefined;
  const mountOnce = () => {
    if (mounted) return;
    mounted = true;
    observer?.disconnect();
    mount();
  };
  if (PerformanceObserver.supportedEntryTypes?.includes("largest-contentful-paint")) {
    observer = new PerformanceObserver(list => {
      if (list.getEntries().some(entry => (entry as PerformanceEntry & { element?: Element | null }).element === img)) {
        setTimeout(mountOnce, 0);
      }
    });
    observer.observe({ type: "largest-contentful-paint", buffered: true });
  }
  img.addEventListener("load", () => setTimeout(mountOnce, 150), { once: true });
  img.addEventListener("error", mountOnce, { once: true });
  setTimeout(mountOnce, 1200);
}

/**
 * The wait above must never cost the visitor an interaction (2026-09-22).
 *
 * While React waited for the hero to paint (up to 1.2 s), everything on screen
 * was the server-drawn shell: a Tab went nowhere useful (the skip link did not
 * exist yet) and a tap on the header's search button did nothing, because the
 * shell's controls are pictures of controls. The full E2E run caught both.
 *
 * So the first sign of a person -- a key, a pointer going down -- mounts React
 * at once, synchronously (flushSync), before the browser acts on that input:
 *  - a key: its default action (Tab moving focus) runs on React's DOM, so the
 *    first Tab lands on the skip link;
 *  - a pointer: the shell is `inert` (server/_core/heroShell.ts), so the press
 *    lands on <body>; React's identical DOM is in place by the time the finger
 *    lifts, and the resulting click -- delivered to <body>, the only common
 *    ancestor -- is handed to the React element now under that same point.
 * Nothing changes for a visitor who just looks: the paint-first wait (and the
 * LCP it protects) stays exactly as measured.
 */
const rootElement = document.getElementById("root")!;
let appMounted = false;
let pendingTap: { x: number; y: number; at: number } | null = null;

function mountApp(sync: boolean) {
  if (appMounted) return;
  appMounted = true;
  window.removeEventListener("keydown", onFirstKey, true);
  window.removeEventListener("pointerdown", onFirstPointer, true);
  const root = createRoot(rootElement);
  // Honeybadger-т мэдээлдэг React error boundary ижил багцад байдаг; түлхүүргүй
  // бол App доторх энгийн ErrorBoundary нь хил болно.
  if (sync) flushSync(() => root.render(app));
  else root.render(app);
}

function onFirstKey() {
  mountApp(true);
}

function onFirstPointer(event: PointerEvent) {
  if (event.button !== 0) return;
  pendingTap = { x: event.clientX, y: event.clientY, at: performance.now() };
  mountApp(true);
}

// The click that ends the early press. If the browser already delivered it to
// a React element there is nothing to do; if it went to <body> (see above),
// replay it on whatever React drew under the finger. A drag, a scroll or a
// long press is not a tap and is left alone.
window.addEventListener("click", event => {
  const tap = pendingTap;
  pendingTap = null;
  if (!tap) return;
  const target = event.target as Element | null;
  if (target && target !== rootElement && rootElement.contains(target)) return;
  if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 12 || performance.now() - tap.at > 1500) return;
  const under = document.elementFromPoint(tap.x, tap.y);
  const control = under?.closest<HTMLElement>("a[href], button, input, select, textarea, label, summary, [role='button'], [role='link']");
  if (!control || !rootElement.contains(control)) return;
  event.preventDefault();
  if (control.matches("input, select, textarea")) control.focus();
  else control.click();
}, true);
window.addEventListener("pointercancel", () => { pendingTap = null; }, true);

if (document.getElementById("hero-shell")) {
  window.addEventListener("keydown", onFirstKey, true);
  window.addEventListener("pointerdown", onFirstPointer, true);
}
afterHeroShellImagePaint(() => mountApp(false));
// 2026-09-23: гараар `error`/`unhandledrejection` сонсогч НЭМЭХГҮЙ —
// Honeybadger.configure() нь `enableUncaught`/`enableUnhandledRejection`
// (анхдагчаар асаалттай)-аар өөрөө суулгадаг тул алдаа бүр ХОЁР удаа
// бүртгэгдэж, квот хоёр дахин хурдан дуусдаг байв.
