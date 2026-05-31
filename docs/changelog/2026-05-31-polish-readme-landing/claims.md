# Claims (append-only, UNTRUSTED)

Builder-authored claims. Transcribed by the orchestrator (the three Build slices ran in parallel; each
returned its claim rather than appending, to avoid concurrent-append corruption of this file). Claim
content originates from the builders and is NOT trusted: the Verifier re-runs every `run-to-prove` from a
clean state and is the only role that writes a verdict.

## CLAIM s1-s3-landing
what: S1 a11y (--faint #6b7884 -> #8593a1, :focus-visible extended to all interactive controls, prefers-reduced-motion guard on smooth-scroll), S2 spacing rhythm (h2 margin 8px->6px, .steps margin-bottom 22px->18px), S3 zero em/en-dashes across the whole file incl. title/meta/gatebar/footer/comments, EN+KO edited in lockstep, parity preserved.
files: docs/index.html
run-to-prove: node -e "const s=require('fs').readFileSync('docs/index.html','utf8'); if(/[—–]/.test(s)){console.error('DASH REMAINS');process.exit(1)} const en=(s.match(/class=\"[^\"]*\\ben\\b[^\"]*\"/g)||[]).length, ko=(s.match(/class=\"[^\"]*\\bko\\b[^\"]*\"/g)||[]).length; console.log('en='+en+' ko='+ko); process.exit(en===ko?0:1)"
expected: prints `en=<n> ko=<n>` with en===ko, exit 0; zero U+2014/U+2013 anywhere in the file

## CLAIM s4-readme
what: README TL;DR added near top (existing intro retained), prose tightened for scan, false `harness-audit/` reference removed (now points to docs/changelog/), all em/en-dashes removed; every relative link resolves; facts match SKILL.md/reference/landing.
files: README.md
run-to-prove: node -e "const s=require('fs').readFileSync('README.md','utf8'); process.exit(/[—–]/.test(s)?1:0)"
expected: exit 0 (zero em/en-dashes); TL;DR present near top; no `harness-audit` substring; relative links resolve

## CLAIM s5-uiux-doc
what: Added two sentences to reference/ui-ux.md stating the conductor never loads taste-skill-v2.md itself; the Plan Architect loads taste sections 0-2 only and the Build Designer loads the full file, each in its own fresh context. SKILL.md left untouched (optional).
files: reference/ui-ux.md
run-to-prove: grep -qi "conductor" reference/ui-ux.md && grep -qi "never load" reference/ui-ux.md
expected: exit 0 — the clarification is present in reference/ui-ux.md
