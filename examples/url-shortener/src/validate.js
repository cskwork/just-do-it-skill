// Pure validation: target URL (http(s) only, length-capped, SSRF-host rejection) + TTL.

const MAX_URL_LENGTH = 2048;
const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1", "[::1]"]);

/**
 * Validate a user-supplied target URL.
 * @param {unknown} raw
 * @returns {{ok:true, url:string} | {ok:false, reason:string}}
 */
export function validateTargetUrl(raw) {
  if (typeof raw !== "string" || raw.length === 0) {
    return fail("url must be a non-empty string");
  }
  if (raw.length > MAX_URL_LENGTH) {
    return fail(`url exceeds ${MAX_URL_LENGTH} characters`);
  }

  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return fail("url is not a valid absolute URL");
  }

  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    return fail(`scheme ${parsed.protocol} is not allowed; use http(s)`);
  }

  const host = normalizeHost(parsed.hostname);
  if (BLOCKED_HOSTNAMES.has(host)) {
    return fail(`host ${host} is not allowed`);
  }
  if (isBlockedIpv4(host)) {
    return fail(`host ${host} is in a blocked (private/link-local) range`);
  }
  if (isBlockedIpv6(host)) {
    return fail(`host ${host} is in a blocked (loopback/private/link-local) IPv6 range`);
  }

  return { ok: true, url: parsed.href };
}

const TTL_MAX = 31536000; // 1 year in seconds

/**
 * Validate an optional TTL value from user input.
 * @param {unknown} raw  undefined -> no TTL; integer in [1, 31536000] -> ok
 * @returns {{ok:true, ttlSeconds:number|null} | {ok:false, reason:string}}
 */
export function validateTtl(raw) {
  if (raw === undefined) return { ok: true, ttlSeconds: null };
  if (!Number.isInteger(raw) || raw < 1 || raw > TTL_MAX) {
    return fail(`ttlSeconds must be an integer between 1 and ${TTL_MAX}`);
  }
  return { ok: true, ttlSeconds: raw };
}

function fail(reason) {
  return { ok: false, reason };
}

// Lowercase, strip a single trailing FQDN dot, then strip IPv6 brackets.
// Order matters: "LOCALHOST." -> "localhost" so blocked-host lookup hits.
function normalizeHost(hostname) {
  let host = hostname.toLowerCase();
  if (host.endsWith(".")) host = host.slice(0, -1);
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}

// Reject SSRF-class IPv4 ranges: 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16.
function isBlockedIpv4(host) {
  const octets = parseIpv4(host);
  if (!octets) return false;
  const [a, b] = octets;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function parseIpv4(host) {
  const parts = host.split(".");
  if (parts.length !== 4) return null;
  const octets = [];
  for (const part of parts) {
    // Reject non-decimal/leading-zero forms so "01" or "0x7f" cannot slip past.
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255 || String(n) !== part) return null;
    octets.push(n);
  }
  return octets;
}

// Reject SSRF-class IPv6: loopback (::1), unspecified (::), link-local (fe80::/10),
// unique-local (fc00::/7), and IPv4-mapped/compat forms whose embedded IPv4 is blocked.
function isBlockedIpv6(host) {
  const groups = expandIpv6(host);
  if (!groups) return false;
  if (groups.every((g) => g === 0)) return true; // :: unspecified
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true; // ::1 loopback
  const first = groups[0];
  if ((first & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((first & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  const embedded = embeddedIpv4(groups);
  return embedded ? isBlockedIpv4(embedded) : false;
}

// Expand a compressed IPv6 literal into exactly 8 numeric hextets, or null if not IPv6.
function expandIpv6(host) {
  if (!host.includes(":")) return null;
  const halves = host.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fillLen = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fillLen < 0) return null;
  const parts = [...head, ...Array(fillLen).fill("0"), ...tail];
  if (parts.length !== 8) return null;
  const groups = [];
  for (const part of parts) {
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    groups.push(parseInt(part, 16));
  }
  return groups;
}

// Pull the embedded IPv4 (last 32 bits) as dotted-quad, but only for the well-known
// mapped (::ffff:0:0/96) and compatible (::/96) prefixes — not arbitrary IPv6.
function embeddedIpv4(groups) {
  const lead = groups.slice(0, 5).every((g) => g === 0);
  const mapped = lead && groups[5] === 0xffff; // ::ffff:a.b.c.d
  const compat = lead && groups[5] === 0; // ::a.b.c.d
  if (!mapped && !compat) return null;
  const [a, b] = [groups[6], groups[7]];
  return `${a >> 8}.${a & 0xff}.${b >> 8}.${b & 0xff}`;
}
