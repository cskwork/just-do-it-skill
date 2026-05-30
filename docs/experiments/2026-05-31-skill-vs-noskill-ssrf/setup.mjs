// Experiment fixture: plant a real SSRF regression into examples/url-shortener that the
// committed test suite no longer guards (green-but-vulnerable), then stamp out two identical
// blind copies — one per A/B arm. Both arms get the SAME code; the only difference is the
// instruction set the agent works under (naive ship-check vs supergoal adversarial Verify).
//
// Usage: node setup.mjs <abs-path-to-examples/url-shortener>
// Produces /tmp/sg-exp/{baseline,skill}, each a committed git repo.
//
// The plant (two independent, realistic SSRF bypasses):
//   1) src/validate.js normalizeHost: drop the trailing-FQDN-dot strip -> "localhost." reaches
//      past the BLOCKED_HOSTNAMES set and is ACCEPTED.
//   2) src/validate.js isBlockedIpv6: drop the embedded-IPv4 (mapped/compat) range check ->
//      "[::ffff:127.0.0.1]" (canonical ::ffff:7f00:1) and "[::ffff:10.0.0.1]" are ACCEPTED.
// To keep `npm test` GREEN despite the gap, the 3 SSRF regression entries that would catch it
// are removed from test/validate.test.js (a plausible "flaky test cleanup" regression).

import { cpSync, rmSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";

const SRC = process.argv[2];
if (!SRC) { console.error("usage: node setup.mjs <abs-path-to-examples/url-shortener>"); process.exit(2); }

const ROOT = "/tmp/sg-exp";
const PLANTED = `${ROOT}/planted`;

function plant(dir) {
  const vp = `${dir}/src/validate.js`;
  let v = readFileSync(vp, "utf8");
  const v0 = v;
  v = v.replace('  if (host.endsWith(".")) host = host.slice(0, -1);\n', "");
  v = v.replace(
    "  const embedded = embeddedIpv4(groups);\n  return embedded ? isBlockedIpv4(embedded) : false;",
    "  return false; // [planted] embedded-IPv4 mapped/compat range check dropped"
  );
  if (v === v0) throw new Error("validate.js plant matched nothing — source drifted");
  writeFileSync(vp, v);

  const tp = `${dir}/test/validate.test.js`;
  let t = readFileSync(tp, "utf8");
  for (const block of [
    '  // Regression: IPv6-mapped IPv4 loopback (normalizes to [::ffff:7f00:1]).\n  "http://[::ffff:127.0.0.1]/",\n',
    '  // Regression: trailing FQDN dot bypassed the localhost set entry.\n  "http://localhost./",\n',
    '  // IPv6-mapped IPv4 private range.\n  "http://[::ffff:10.0.0.1]/",\n',
  ]) {
    if (!t.includes(block)) throw new Error("test block not found: " + block.slice(0, 48));
    t = t.replace(block, "");
  }
  writeFileSync(tp, t);

  // Strip the prior vault so neither arm is biased by a stale "verdict: GREEN / APPROVED".
  rmSync(`${dir}/docs/changelog`, { recursive: true, force: true });
}

rmSync(ROOT, { recursive: true, force: true });
mkdirSync(ROOT, { recursive: true });
cpSync(SRC, PLANTED, { recursive: true });
plant(PLANTED);

for (const arm of ["baseline", "skill"]) {
  cpSync(PLANTED, `${ROOT}/${arm}`, { recursive: true });
  execSync('git init -q && git add -A && git commit -q -m "url-shortener under review"', {
    cwd: `${ROOT}/${arm}`, stdio: "ignore",
  });
}
console.log("setup OK: /tmp/sg-exp/{baseline,skill} planted + committed");
