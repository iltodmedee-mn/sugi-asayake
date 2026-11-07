import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { blockScannerProbes, isScannerProbe, resetScannerProbesForTests } from "./scannerProbes";

/**
 * The .env-scanner defence (2026-09-12). Two lists matter equally: the
 * probe paths a bot sends must be refused, and every real path this app
 * serves -- dotted or file-like included -- must pass through untouched.
 */
const PROBES = [
  "/.env", "/.env.save", "/.env.bak", "/.env.prod", "/.env.local", "/laravel/.env", "/api/.env", "/crm/.env", "/images/.env",
  "/.git/config", "/.aws/credentials", "/.ssh/id_rsa", "/.config.yaml", "/.DS_Store",
  "/info.php", "/phpinfo.php", "/test.php", "/app_dev.php/_profiler/phpinfo", "/index.asp",
  "/wp-admin/", "/wp-login.php", "/xmlrpc.php", "/phpmyadmin/", "/cgi-bin/test", "/vendor/phpunit/src/Util/PHP/eval-stdin.php", "/actuator/health", "/_profiler/open",
  "/secrets.env", "/config.js", "/server.js", "/settings.json", "/backup.sql", "/db.sqlite", "/site.zip", "/dump.tar.gz", "/debug/default/view?panel=config".split("?")[0],
  "/%2e%2e/etc/passwd".replace("%2e%2e", ".."), "/%ZZ", // undecodable
];

const REAL = [
  "/", "/shop", "/shop?q=тос", "/product/sugi-hand-cream", "/journal/some-post", "/admin", "/checkout", "/brands", "/track/SAMTY32BFYSKM6Z6",
  "/api/trpc/catalog.list", "/api/trpc/auth.me?batch=1", "/api/payments/qpay/callback", "/api/payments/storepay/callback", "/api/verify-mn/callback/abc123", "/health",
  "/cdn/products/abc.webp", "/assets/index-B5ktK4kX.js", "/assets/index-DpKeP7kF.css", "/face-models/tiny_face_detector_model-weights_manifest.json", "/face-models/model-shard1",
  "/favicon.ico", "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/.well-known/acme-challenge/token", "/.well-known/apple-app-site-association",
  // The cookie banner's own files (client/public/vendor). Blocking these
  // silently killed consent on every page once -- keep them here.
  "/vendor/silktide-consent-manager.js", "/vendor/silktide-consent-manager.css", "/vendor/silktide-consent-init.js",
  "/@vite/client", "/@react-refresh", "/src/main.tsx", "/node_modules/.vite/deps/react.js",
];

describe("isScannerProbe", () => {
  it.each(PROBES)("refuses %s", path => { expect(isScannerProbe(path)).toBe(true); });
  it.each(REAL)("lets %s through", path => { expect(isScannerProbe(path.split("?")[0])).toBe(false); });

  it("treats the Vite dev-server paths as probes in production (no Vite there; /@fs is the file-read CVE path)", () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      for (const path of ["/@fs/C:/Users/x/.env", "/@fs/etc/passwd", "/@vite/client", "/@react-refresh", "/@id/x", "/node_modules/.vite/deps/react.js", "/src/main.tsx"]) {
        expect(isScannerProbe(path), path).toBe(true);
      }
      expect(isScannerProbe("/shop")).toBe(false);
      expect(isScannerProbe("/assets/index-abc.js")).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

function fakeRequest(path: string, ip: string): Request {
  return { path, originalUrl: path, method: "GET", ip, socket: { remoteAddress: ip } } as unknown as Request;
}

function fakeResponse() {
  const res = {
    statusCode: 200, body: "", headers: {} as Record<string, unknown>,
    status(code: number) { this.statusCode = code; return this; },
    type() { return this; },
    setHeader(name: string, value: unknown) { this.headers[name] = value; },
    send(body: string) { this.body = body; return this; },
  };
  return res as unknown as Response & { statusCode: number; body: string };
}

describe("blockScannerProbes", () => {
  beforeEach(() => { resetScannerProbesForTests(); vi.spyOn(console, "warn").mockImplementation(() => undefined); });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it("answers a probe with a bare 404 and never reaches the app", () => {
    const res = fakeResponse();
    const next = vi.fn();
    blockScannerProbes(fakeRequest("/.env", "198.51.100.7"), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe("Not found");
  });

  it("passes a real request through", () => {
    const res = fakeResponse();
    const next = vi.fn();
    blockScannerProbes(fakeRequest("/shop", "198.51.100.7"), res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("bans an IP after five probes within the hour, for every path, and forgets it after", () => {
    vi.useFakeTimers({ now: new Date("2026-09-12T12:00:00Z") });
    const ip = "203.0.113.55";
    for (let i = 0; i < 5; i++) blockScannerProbes(fakeRequest(`/probe${i}.php`, ip), fakeResponse(), vi.fn());
    // The sixth request is refused even though it is a legitimate path.
    const res = fakeResponse();
    const next = vi.fn();
    blockScannerProbes(fakeRequest("/shop", ip), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    // Another IP is unaffected.
    const other = vi.fn();
    blockScannerProbes(fakeRequest("/shop", "203.0.113.56"), fakeResponse(), other);
    expect(other).toHaveBeenCalledOnce();
    // An hour later the ban has lapsed.
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    const later = vi.fn();
    blockScannerProbes(fakeRequest("/shop", ip), fakeResponse(), later);
    expect(later).toHaveBeenCalledOnce();
  });

  it.each(["127.0.0.1", "::1", "::ffff:127.0.0.1", "10.0.0.5", "192.168.88.6", "172.16.0.9", "fd12::1"])("still 404s but never bans %s (developer, or a proxy that hides client IPs)", ip => {
    for (let i = 0; i < 8; i++) {
      const res = fakeResponse();
      blockScannerProbes(fakeRequest("/.env", ip), res, vi.fn());
      expect(res.statusCode).toBe(404);
    }
    const next = vi.fn();
    blockScannerProbes(fakeRequest("/shop", ip), fakeResponse(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("logs one access-log style line per probe", () => {
    blockScannerProbes(fakeRequest("/laravel/.env", "198.51.100.9"), fakeResponse(), vi.fn());
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/^\[probe\] 198\.51\.100\.9 GET \/laravel\/\.env -> 404 \(1\/5\)$/));
  });
});
