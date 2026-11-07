import type { NextFunction, Request, Response } from "express";

/**
 * Scanner probes (2026-09-12). Bots sweep the whole IPv4 space asking every
 * host for `/.env`, `/laravel/.env`, `/.git/config`, `/phpinfo.php`, WordPress
 * paths and so on -- hundreds of variants in a few seconds, hoping one target
 * in a thousand serves its secrets. Tom saw exactly this in a hosting log.
 *
 * This app never serves those files: secrets live in the ignored `.env`
 * outside `dist/public`, and express.static ignores dotfiles anyway. But until
 * now every such request fell through to the SPA fallback and got a 200 with
 * index.html -- which tells a scanner "something is here, keep going", and
 * left no trace in our own logs. Three things change here, in the order the
 * thread's consensus and fail2ban practice suggest:
 *
 *   1. A probe path gets a bare 404 immediately -- no HTML, no app work, no
 *      hint. (Not 400 as in Tom's screenshot: 400 says "I understood you and
 *      you are wrong", 404 says "nothing here".)
 *   2. Each probe is counted per IP. Past PROBE_BAN_THRESHOLD in an hour the
 *      IP is refused outright for the rest of that hour -- in-process
 *      fail2ban. A shopper does not ask for `/.env` five times by accident.
 *   3. One compact console line per probe, so `pnpm dev` (or PM2's log) shows
 *      the scan the way a web server's access log would.
 *
 * Real paths with dots stay untouched: /.well-known (ACME, app links),
 * /favicon.ico, /robots.txt, /sitemap.xml, /face-models/*.json, /cdn/*,
 * /assets/* -- the rules below match only the files nobody legitimately
 * requests from this app. `isScannerProbe` is pure so it is unit-tested
 * against both lists.
 */

const PROBE_WINDOW_MS = 60 * 60 * 1000;
const PROBE_BAN_THRESHOLD = 5;

/** Path segments a legitimate client never asks this app for. */
const PROBE_PATTERNS: RegExp[] = [
  // Dotfiles and dot-directories anywhere in the path, except .well-known.
  /(^|\/)\.(?!well-known(\/|$))[^/]*/i,
  // Config, backup and dump artefacts.
  /\.(env|ini|bak|old|orig|save|swp|sql|sqlite|db|log|yml|yaml|toml|pem|key|p12|pfx|zip|tar|gz|tgz|rar|7z)(\.\w+)?$/i,
  // Server-side languages this app is not written in.
  /\.(php|asp|aspx|jsp|jspx|cgi|pl|cfm)$/i,
  // Framework and CMS admin surfaces we do not have.
  // `vendor` is deliberately NOT in this list: this app serves its own
  // /vendor/silktide-consent-manager.{js,css} (the cookie banner), and the
  // first version of this rule blocked them -- the banner died on every
  // page. The classic composer probe (/vendor/phpunit/.../eval-stdin.php)
  // is still caught by the *.php rule above.
  /(^|\/)(wp-admin|wp-login|wp-content|wp-includes|xmlrpc\.php|phpmyadmin|pma|adminer|cgi-bin|actuator|_profiler|telescope|laravel|storage\/logs|debug\/default|console|jenkins|solr|manager\/html)(\/|$)/i,
  // Vite dev-server internals and source/dependency trees: never served in production.
  /^\/(@fs|@vite|@id|@react-refresh|node_modules|src)(\/|$)/i,
  // The app's own source files, which are never served at these names.
  /^\/(server|app|main|index|config|secrets?|settings|credentials)\.(js|ts|json|cjs|mjs)$/i,
];

/** Paths that look dotted or file-like but are genuinely ours. */
const ALLOW_PATTERNS: RegExp[] = [
  // Only the API prefixes Express actually registers -- a bare /api/ rule
  // would let /api/.env (a real scanner path) straight through.
  /^\/api\/(trpc|payments|verify-mn)(\/|$)/,
  /^\/cdn\//,
  /^\/assets\//,
  /^\/face-models\//,
  /^\/health$/,
  /^\/(favicon\.ico|robots\.txt|sitemap\.xml|manifest\.webmanifest|manifest\.json|site\.webmanifest|sw\.js|offline\.html)$/,
  /^\/\.well-known\//,
];

/**
 * Vite dev-server internals, only present under `pnpm dev`. 2026-10-01: allowed
 * ONLY outside production. In production there is no Vite, so /@fs/..., /src/...
 * and /node_modules/... are nothing but scanner probes (and /@fs is the path of
 * Vite's arbitrary-file-read CVEs) -- they fall through to PROBE_PATTERNS.
 */
// `/@react-refresh` нь налуу зураасгүй (@vitejs/plugin-react-ийн runtime) — өмнө нь зөвхөн `…/`-тэйг
// зөвшөөрдөг байсан тул `pnpm dev` дээр 404 авч, апп огт ачаалагддаггүй байв (2026-10-18).
const DEV_ONLY_ALLOW_PATTERNS: RegExp[] = [/^\/(@vite|@react-refresh|@fs|@id|node_modules|src)\//, /^\/@react-refresh$/];

export function isScannerProbe(pathname: string): boolean {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // A path that is not even valid percent-encoding is itself a probe.
    return true;
  }
  if (ALLOW_PATTERNS.some(pattern => pattern.test(path))) return false;
  if (process.env.NODE_ENV !== "production" && DEV_ONLY_ALLOW_PATTERNS.some(pattern => pattern.test(path))) return false;
  return PROBE_PATTERNS.some(pattern => pattern.test(path));
}

type Bucket = { count: number; resetAt: number };
const probesByIp = new Map<string, Bucket>();

function clientKey(request: Request) {
  return request.ip || request.socket?.remoteAddress || "unknown";
}

/**
 * Loopback and private addresses are never banned (they still get the 404).
 * Two reasons. In development the whole team is 127.0.0.1, and five curl
 * probes must not lock the browser out for an hour (it did, the first time
 * this ran). In production, if a reverse proxy sits in front and does not
 * forward the client address -- or `trust proxy` does not match the host --
 * every visitor arrives as the proxy's own private IP, and one bot would
 * ban the entire site. Banning is only meaningful for a public address.
 */
export function isUnbannableAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (v4 === "127.0.0.1" || ip === "::1" || ip === "unknown") return true;
  if (/^10\./.test(v4) || /^192\.168\./.test(v4) || /^172\.(1[6-9]|2\d|3[01])\./.test(v4) || /^169\.254\./.test(v4)) return true;
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10).
  return /^f[cd][0-9a-f]{2}:/i.test(ip) || /^fe[89ab][0-9a-f]:/i.test(ip);
}

function sweep(now: number) {
  probesByIp.forEach((bucket, key) => {
    if (bucket.resetAt <= now) probesByIp.delete(key);
  });
}

/** Test seam: forget every counted probe. */
export function resetScannerProbesForTests() {
  probesByIp.clear();
}

export function blockScannerProbes(request: Request, response: Response, next: NextFunction) {
  const now = Date.now();
  if (probesByIp.size > 10_000) sweep(now);
  const key = clientKey(request);
  const bucket = probesByIp.get(key);
  const banned = !!bucket && bucket.resetAt > now && bucket.count >= PROBE_BAN_THRESHOLD && !isUnbannableAddress(key);

  if (banned) {
    // Everything from a banned IP, probe or not, for the rest of the window.
    response.setHeader("Retry-After", Math.ceil((bucket.resetAt - now) / 1000));
    return response.status(403).type("text/plain").send("Forbidden");
  }
  if (!isScannerProbe(request.path)) return next();

  if (!bucket || bucket.resetAt <= now) probesByIp.set(key, { count: 1, resetAt: now + PROBE_WINDOW_MS });
  else bucket.count += 1;
  const count = probesByIp.get(key)!.count;
  // One line per probe, in the shape of a web server's access log, so the
  // scan is visible in the terminal that runs the app.
  const willBan = count >= PROBE_BAN_THRESHOLD && !isUnbannableAddress(key);
  console.warn(`[probe] ${key} ${request.method} ${request.originalUrl} -> 404 (${count}/${PROBE_BAN_THRESHOLD}${willBan ? ", banned for 1h" : ""})`);
  return response.status(404).type("text/plain").send("Not found");
}
