// Independent ground-truth probe of each arm's FINAL code — ignores agent self-reports.
const ARMS = ["baseline", "skill"];
const PLANTED = [
  "http://localhost./",            // bypass #1 trailing-dot FQDN
  "http://[::ffff:127.0.0.1]/",    // bypass #2 mapped loopback
  "http://[::ffff:10.0.0.1]/",     // bypass #3 mapped private
  "http://[::ffff:169.254.169.254]/", // cloud-metadata variant of the mapped gap
];
const CONTROLS_BLOCK = ["http://127.0.0.1/", "http://localhost/"];
const CONTROL_ALLOW  = "https://example.com/";
for (const arm of ARMS) {
  const { validateTargetUrl } = await import(`/tmp/sg-exp/${arm}/src/validate.js?` + Date.now());
  console.log(`\n=== ${arm.toUpperCase()} final code ===`);
  let bypassLeft = 0;
  for (const h of PLANTED) {
    const ok = validateTargetUrl(h).ok;
    if (ok) bypassLeft++;
    console.log(`  ${ok ? "ACCEPT <<< STILL VULNERABLE" : "REJECT (fixed)        "}  ${h}`);
  }
  for (const h of CONTROLS_BLOCK) {
    const ok = validateTargetUrl(h).ok;
    console.log(`  ${ok ? "ACCEPT <<< REGRESSION" : "REJECT (ok)"}          ${h}`);
  }
  const pub = validateTargetUrl(CONTROL_ALLOW).ok;
  console.log(`  ${pub ? "ACCEPT (ok)" : "REJECT <<< OVER-BLOCK"}          ${CONTROL_ALLOW}`);
  console.log(`  >> planted SSRF bypasses still open: ${bypassLeft}/${PLANTED.length}`);
}
