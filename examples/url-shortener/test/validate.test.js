import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTargetUrl, validateTtl } from "../src/validate.js";

test("accepts a normal https url with query", () => {
  const r = validateTargetUrl("https://example.com/a?b=c");
  assert.equal(r.ok, true);
  assert.equal(r.url, "https://example.com/a?b=c");
});

test("accepts plain http url", () => {
  assert.equal(validateTargetUrl("http://example.com/").ok, true);
});

test("rejects non-http(s) schemes", () => {
  for (const u of ["ftp://example.com", "javascript:alert(1)", "file:///etc/passwd", "data:text/plain,hi"]) {
    const r = validateTargetUrl(u);
    assert.equal(r.ok, false, `should reject ${u}`);
  }
});

test("rejects over-length url (3000 chars)", () => {
  const long = "https://example.com/" + "a".repeat(3000);
  const r = validateTargetUrl(long);
  assert.equal(r.ok, false);
});

const SSRF_HOSTS = [
  "http://localhost/",
  "http://127.0.0.1/",
  "http://10.1.2.3/",
  "http://172.16.0.1/",
  "http://192.168.1.1/",
  "http://169.254.169.254/",
  "http://[::1]/",
  "http://0.0.0.0/",
  // Regression: IPv6-mapped IPv4 loopback (normalizes to [::ffff:7f00:1]).
  "http://[::ffff:127.0.0.1]/",
  // Regression: trailing FQDN dot bypassed the localhost set entry.
  "http://localhost./",
  // IPv6-mapped IPv4 private range.
  "http://[::ffff:10.0.0.1]/",
  // IPv6 link-local fe80::/10.
  "http://[fe80::1]/",
  // IPv6 unique-local fc00::/7.
  "http://[fc00::1]/",
];

for (const u of SSRF_HOSTS) {
  test(`rejects SSRF host: ${u}`, () => {
    const r = validateTargetUrl(u);
    assert.equal(r.ok, false, `should reject ${u}`);
  });
}

test("rejects non-string / empty input", () => {
  assert.equal(validateTargetUrl(undefined).ok, false);
  assert.equal(validateTargetUrl("").ok, false);
  assert.equal(validateTargetUrl(123).ok, false);
});

test("rejects garbage that is not a valid URL", () => {
  assert.equal(validateTargetUrl("not a url").ok, false);
});

test("does not reject public IPs or normal hosts", () => {
  assert.equal(validateTargetUrl("http://8.8.8.8/").ok, true);
  assert.equal(validateTargetUrl("http://172.32.0.1/").ok, true); // just outside 172.16/12
  assert.equal(validateTargetUrl("http://11.0.0.1/").ok, true);
});

test("does not over-reject: trailing FQDN dot on a public host stays accepted", () => {
  assert.equal(validateTargetUrl("https://example.com./").ok, true);
  assert.equal(validateTargetUrl("http://example.com./").ok, true);
});

// --- validateTtl ---

test("validateTtl: undefined -> ok, ttlSeconds null", () => {
  const r = validateTtl(undefined);
  assert.equal(r.ok, true);
  assert.equal(r.ttlSeconds, null);
});

test("validateTtl: 60 -> ok, ttlSeconds 60", () => {
  const r = validateTtl(60);
  assert.equal(r.ok, true);
  assert.equal(r.ttlSeconds, 60);
});

test("validateTtl: 1 (min) -> ok", () => {
  assert.equal(validateTtl(1).ok, true);
});

test("validateTtl: 31536000 (max) -> ok", () => {
  assert.equal(validateTtl(31536000).ok, true);
});

test("validateTtl: 0 -> fail", () => {
  assert.equal(validateTtl(0).ok, false);
});

test("validateTtl: -1 -> fail", () => {
  assert.equal(validateTtl(-1).ok, false);
});

test("validateTtl: 1.5 (float) -> fail", () => {
  assert.equal(validateTtl(1.5).ok, false);
});

test("validateTtl: '60' (string) -> fail", () => {
  assert.equal(validateTtl("60").ok, false);
});

test("validateTtl: 31536001 (over max) -> fail", () => {
  assert.equal(validateTtl(31536001).ok, false);
});
