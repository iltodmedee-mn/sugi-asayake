// DATABASE_URL-ийг mysql2-ийн тодорхой холболтын option болгоно.
//
// 2026-09-09 гүнзгий аудитын олдвор: pool `{ uri: process.env.DATABASE_URL }`-
// аар үүсдэг байв. mysql2 URI-г өөрөө parse хийдэг бөгөөд `?ssl-mode=REQUIRED`-
// ийг ойлгодоггүй (тэр flag mysql CLI-ийнх, backup script-үүд зөв дамжуулдаг) —
// boot бүрт "Ignoring invalid configuration option ... ssl-mode" бичиж, Aiven руу
// TLS-ГҮЙ холбогдож байв. Амьд сервер дээр баталгаажсан: `SHOW SESSION STATUS
// LIKE 'Ssl_cipher'` хоосон, сервер `require_secure_transport=OFF` тул аль ч тал
// шифрлэлт шаардаагүй. Query бүр — харилцагчийн өгөгдөл, захиалга, нууц үгийн
// handshake — Бангалор хүртэл нээлттэй интернэтээр plaintext явж байв.
//
// Дүрэм, дарааллаар:
// 1. Loopback host (локал MySQL, docs/PROJECT-GUIDE.md-ийн офлайн fallback)
//    plaintext хэвээр — тэнд TLS утгагүй, локал серверт сертификат байхгүй.
// 2. Бусад бүгд TLS. DATABASE_CA_CERT (PEM текст) эсвэл DATABASE_CA_CERT_PATH
//    (файл) тавигдсан бол серверийн сертификатыг түүгээр шалгана — Aiven төслийн
//    CA-аар гарын үсэг зурдаг тул системийн root store мэдэхгүй (системийн root-
//    оор rejectUnauthorized:true HANDSHAKE_SSL_ERROR өгдгийг баталгаажуулсан). CA-
//    гүй бол шифрлэсээр ч серверийг баталгаажуулж чадахгүй: dev-д warning-тай
//    unverified TLS, харин NODE_ENV=production эсвэл ssl-mode=VERIFY_CA/
//    VERIFY_IDENTITY үед CA-гүй бол throw (2026-10-01). PEM нь Aiven Console -> service -> Overview -> "CA certificate"-ээс.
// 3. URL дахь `ssl-mode=DISABLED` хүндэтгэгдэнэ (санаатай татгалзал), бусад query
//    параметр дамжуулагдахгүй хаягдана, тиймээс mysql2 мэдэхгүй option харахгүй.
import { readFileSync } from "node:fs";

export type MysqlSslOptions = { rejectUnauthorized: boolean; ca?: string; minVersion: "TLSv1.2"; verifyIdentity?: boolean };

export type MysqlConnectionOptions = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: MysqlSslOptions;
};

export type ConnectionPlan = {
  options: MysqlConnectionOptions;
  /** Human-readable summary for the startup log. */
  transport: "plaintext-loopback" | "plaintext-explicit" | "tls-verified" | "tls-unverified";
};

const LOOPBACK = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** IPv4 dotted quad or bracketed/plain IPv6, as URL.hostname reports it. */
export function isIpLiteral(hostname: string): boolean {
  const bare = hostname.replace(/^\[|\]$/g, "");
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(bare) || (bare.includes(":") && /^[0-9a-f:.]+$/i.test(bare));
}

export function loadCaCertificate(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const inline = env.DATABASE_CA_CERT?.trim();
  if (inline) return inline.replace(/\\n/g, "\n");
  const path = env.DATABASE_CA_CERT_PATH?.trim();
  if (path) return readFileSync(path, "utf8");
  return undefined;
}

export function planMysqlConnection(databaseUrl: string, env: NodeJS.ProcessEnv = process.env): ConnectionPlan {
  const url = new URL(databaseUrl);
  if (url.protocol !== "mysql:" && url.protocol !== "mysqls:") {
    throw new Error(`DATABASE_URL must start with mysql://, got ${url.protocol}`);
  }
  const options: MysqlConnectionOptions = {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
  };
  const sslMode = (url.searchParams.get("ssl-mode") ?? url.searchParams.get("sslmode") ?? "").toUpperCase();

  if (LOOPBACK.has(url.hostname) && sslMode !== "REQUIRED" && sslMode !== "VERIFY_CA" && sslMode !== "VERIFY_IDENTITY") {
    return { options, transport: "plaintext-loopback" };
  }
  if (sslMode === "DISABLED") {
    return { options, transport: "plaintext-explicit" };
  }
  const ca = loadCaCertificate(env);
  const verifyMode = sslMode === "VERIFY_CA" || sslMode === "VERIFY_IDENTITY";
  if (!ca) {
    // 2026-10-01 (security audit E1): the unverified fallback used to apply even
    // when the URL explicitly asked for VERIFY_CA / VERIFY_IDENTITY, and in
    // production -- the one place a man-in-the-middle matters. Both now refuse
    // to start. Development keeps the (warned) unverified TLS so a laptop
    // without the CA file can still connect.
    if (verifyMode) {
      throw new Error(`DATABASE_URL asks for ssl-mode=${sslMode} but no CA certificate is configured -- set DATABASE_CA_CERT_PATH (or DATABASE_CA_CERT).`);
    }
    if (env.NODE_ENV === "production") {
      throw new Error("Refusing to connect to the database in production without a CA certificate to verify the server -- set DATABASE_CA_CERT_PATH (or DATABASE_CA_CERT).");
    }
    options.ssl = { rejectUnauthorized: false, minVersion: "TLSv1.2" };
    return { options, transport: "tls-unverified" };
  }
  // A MySQL reached by bare IP -- an Oracle Cloud HeatWave endpoint through
  // an SSH tunnel (127.0.0.1) or a VM by its address (2026-09-13) -- presents
  // a certificate whose CN/SAN name the address, not what we typed.
  //
  // 2026-10-01 correction: this used to set `ssl.checkServerIdentity` to a
  // no-op for IP hosts "to skip hostname matching". mysql2 (3.x) never reads
  // that option -- it only honours `ssl.verifyIdentity` -- so the line did
  // nothing and the comment lied. What really happens: with `verifyIdentity`
  // unset, mysql2 passes no servername for an IP host and node skips identity
  // verification, i.e. for an IP-literal host the CA pin IS the identity check
  // (only a server whose key was signed by that private CA passes the chain
  // check). For a DNS host we now turn `verifyIdentity` on, so the certificate
  // must also name the host we dialled.
  const ipLiteral = isIpLiteral(url.hostname);
  if (ipLiteral && sslMode === "VERIFY_IDENTITY") {
    throw new Error(`ssl-mode=VERIFY_IDENTITY cannot be honoured for the IP address ${url.hostname} (mysql2 sends no servername for an IP host) -- connect by DNS name, or use ssl-mode=VERIFY_CA / REQUIRED with DATABASE_CA_CERT_PATH (CA pinning).`);
  }
  options.ssl = {
    rejectUnauthorized: true,
    ca,
    minVersion: "TLSv1.2",
    ...(ipLiteral ? {} : { verifyIdentity: true }),
  };
  return { options, transport: "tls-verified" };
}

export function describeTransport(plan: ConnectionPlan): string {
  switch (plan.transport) {
    case "plaintext-loopback":
      return `MySQL: plaintext to loopback ${plan.options.host}:${plan.options.port} (local database).`;
    case "plaintext-explicit":
      return `MySQL: TLS DISABLED by ssl-mode=DISABLED in DATABASE_URL for ${plan.options.host} -- do not use this against a remote database.`;
    case "tls-verified":
      return `MySQL: TLS to ${plan.options.host}:${plan.options.port}, server certificate verified against DATABASE_CA_CERT.`;
    case "tls-unverified":
      return `MySQL: TLS to ${plan.options.host}:${plan.options.port} but the server certificate is NOT verified -- set DATABASE_CA_CERT (Aiven Console -> service -> Overview -> CA certificate) to close the remaining man-in-the-middle gap.`;
  }
}

/**
 * Холболтын алдааны ТӨРӨЛ (2026-11-07). HeatWave CA-гаа хоёр удаа (09-28, ~11-01) чимээгүй
 * сольсон бөгөөд хоёуланд нь `/health` зөвхөн "down" гэдэг байсан тул шалтгааныг хүн
 * лаптопоос гараар олсон. Төрлийг нь `/health`, watchdog-ийн мэдэгдэл, uptime alert-д
 * гаргаснаар "tls_ca" үед засварын команд (scripts/oci/rotate-db-ca.sh) шууд мэдэгдэнэ.
 * Алдааны ТЕКСТ нийтэд гарахгүй (index.ts) — зөвхөн энэ ангилал.
 */
export type DbFailureKind = "tls_ca" | "tls" | "auth" | "network" | "timeout" | "config" | "other";

export function classifyDbError(message: string | null | undefined): DbFailureKind {
  const m = (message ?? "").toLowerCase();
  if (!m) return "other";
  if (/certificate signature failure|self[- ]signed certificate|unable to (get|verify) (local )?issuer|certificate has expired|cert_has_expired|unable_to_verify_leaf|certificate verify failed|depth_zero_self_signed/.test(m)) return "tls_ca";
  if (/handshake_ssl_error|ssl|tls/.test(m)) return "tls";
  if (/access denied|er_access_denied|er_dbaccess_denied|authentication/.test(m)) return "auth";
  if (/etimedout|timed? ?out/.test(m)) return "timeout";
  if (/econnrefused|enotfound|ehostunreach|enetunreach|econnreset|eai_again|getaddrinfo/.test(m)) return "network";
  if (/database_url|ca certificate is configured|must start with mysql/.test(m)) return "config";
  return "other";
}
