import { describe, expect, it } from "vitest";
import { classifyDbError } from "./_core/dbConnection";
import { hintFor } from "./_core/dbWatchdog";

// 2026-11-07: production DB хоёр удаа HeatWave CA-ийн солигдлоос унасан. Мессежүүд нь
// бодит лог/скриптийн гаралтаас (drizzle `cause`, mysql2, Node TLS).
describe("classifyDbError", () => {
  it.each([
    ["Failed query: SELECT 1 — certificate signature failure", "tls_ca"],
    ["self-signed certificate in certificate chain", "tls_ca"],
    ["unable to get local issuer certificate", "tls_ca"],
    ["certificate has expired", "tls_ca"],
    ["HANDSHAKE_SSL_ERROR: wrong version number", "tls"],
    ["Access denied for user 'sugi_app'@'10.0.0.219' (using password: YES)", "auth"],
    ["connect ETIMEDOUT", "timeout"],
    ["connect ECONNREFUSED 127.0.0.1:3307", "network"],
    ["getaddrinfo ENOTFOUND db.internal", "network"],
    ["DATABASE_URL тохируулаагүй байна.", "config"],
    ["Unknown column 'x'", "other"],
    ["", "other"],
  ] as const)("%s → %s", (message, kind) => {
    expect(classifyDbError(message)).toBe(kind);
  });
  it("null/undefined → other", () => {
    expect(classifyDbError(null)).toBe("other");
    expect(classifyDbError(undefined)).toBe("other");
  });
});

describe("hintFor", () => {
  it("tls_ca үед CA солих скриптийг заана", () => {
    expect(hintFor("tls_ca")).toContain("rotate-db-ca.ps1");
  });
  it("бусад төрөлд CA скриптийг заахгүй", () => {
    for (const kind of ["network", "timeout", "auth", "other"] as const) expect(hintFor(kind)).not.toContain("rotate-db-ca");
  });
});
