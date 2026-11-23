# {{SITE_NAME}}: A–Z Website Checklist
Client-side static site · Astro + Tailwind · Cloudflare Pages · .com · SEO on all search engines · AdSense

---

## HOW TO USE THIS FILE (with your AI agent)

1. Save as `docs/CHECKLIST.md` in the repo.
2. Tell the agent: "Read `docs/CHECKLIST.md`. Work on section X only. Tick an item ONLY after verifying it, and add `— evidence: <command or result>` after it."
3. Legend
   - `[MIN]` = minimum to launch. `[PRO]` = extra for a professional, competitive site.
   - `[ ]` open · `[x]` done and verified · `[~]` not applicable (write why) · `[!]` blocked
   - 👤 = only YOU can do it (needs your accounts: Cloudflare, Google, Bing, AdSense, registrar). The agent should give you the exact steps, not claim it's done.
4. Edit freely. Add, remove, and reword items as the site changes. Keep it honest: unverified = unticked.

## LAUNCH GATES (what must be done before each milestone)

| Gate | Meaning | Sections that must be fully `[MIN]`-complete |
|---|---|---|
| **Gate 1: Pre-deploy** | Safe to put on the internet | A, B, E, F, H, I, M, N, O, P, Q, R, U, V, W |
| **Gate 2: Launch day** | Ready to be found | + C, D, G, J, K, L, S, T |
| **Gate 3: Pre-AdSense** | Ready to apply | + X (some traffic/indexing), Y started, Z.1–Z.3 |
| **Gate 4: Post-approval** | Ads on, safely | Z.4–Z.7 |

---

## A: ACCESSIBILITY (WCAG 2.2 AA)
- [x] [MIN] Skip-to-content link is the first focusable element — evidence: browser Tab on production home → first focused element = `<a href="#main-content">Skip to content</a>`
- [x] [MIN] Landmarks (`header`, `nav`, `main`, `footer`), exactly one H1 per page, logical heading order — evidence: python regex over 196 built pages: 196/196 have all four landmarks and exactly 1 `<h1>`; heading-order check 0 bad after replacing command-palette `<h2>` with `<span>`
- [x] [MIN] Every interactive element is a real `<button>`/`<a>`; visible focus ring; no keyboard traps — evidence: grep for `<div/span onClick>` = 0; `global.css:167` defines `:focus-visible` outline; browser Tab order checked; only modal dialogs trap focus
- [x] [MIN] Contrast ≥ 4.5:1 for text and ≥ 3:1 for UI components in BOTH light and dark themes — evidence: node WCAG script on tokens: light body 6.54, body-mid 5.60; dark body 7.46, body-mid 4.96; focus/primary ≥8.5:1 in both
- [x] [MIN] Every input has a label; icon-only buttons have `aria-label` — evidence: browser DOM scan of converter, diff and NDJSON pages: only hidden `<input type=file>` lacks a label (triggered by a labelled Open button); all visible controls have a wrapping label or `aria-label`
- [x] [MIN] Errors and results announced via `aria-live="polite"`; errors never rely on color alone — evidence: `grep aria-live` finds `ToolPage data-live`, `ValidatorShell`, `ErrorPanel`, `JwtShell`, `NdjsonShell`, `ToolGrid`; errors render "JSON error" text plus a plain-English hint
- [x] [MIN] Correct `lang` on `<html>` (and on any fallback-language body text); `dir` for RTL locales — evidence: python over 196 built pages: 196/196 have `lang`+`dir`; 156/156 non-en pages contain `lang="en"` fallback markers
- [ ] [MIN] Touch targets ≥ 44px (our standard; WCAG minimum is 24px)
- [x] [MIN] `prefers-reduced-motion` respected — evidence: `global.css:215` `@media (prefers-reduced-motion: reduce)` zeroes animation/transition durations and scroll-behavior
- [x] [PRO] Tree viewer follows the ARIA tree pattern; command palette follows combobox/listbox pattern — evidence: `ViewerShell role="tree"` + `view.ts treeitem` + `aria-activedescendant`; `CommandPalette` input `role=combobox`, `aria-expanded/controls/autocomplete` + `ul role=listbox`
- [x] [PRO] Dialogs trap focus, close on Esc, and restore focus to the trigger — evidence: repair/shortcuts use native `dialog.showModal()`; browser test: command palette opens, Tab is trapped, Esc closes and focus returns to trigger
- [x] [PRO] axe scan shows 0 serious/critical issues on every page type (home, tool, hub, guide, legal) — evidence: axe-core 4.10.3 injected from local `dist/axe.min.js`; 5 page types scanned with WCAG2A/AA/21/22 + best-practice tags → 0 violations
- [!] [PRO] Manual screen-reader pass (NVDA/Orca/VoiceOver) on 3 tools — blocked: no screen reader or audio output available in this environment
- [x] [PRO] 200% zoom and text-resize cause no loss of content; `forced-colors` mode is usable — evidence: browser `zoom=2` on home + tool: horizontal overflow = false; `global.css` `@media (forced-colors: active)` maps borders/focus to system colors

## B: BUILD, CI & DEPLOY
- [ ] [MIN] Lockfile committed; Node version pinned (`.nvmrc` / `engines`)
- [ ] [MIN] Clean clone → `pnpm install --frozen-lockfile && pnpm astro check && pnpm build` passes
- [ ] [MIN] `.env.example` documents every variable (`PUBLIC_SITE_URL`, `PUBLIC_ADS_ENABLED`, …)
- [ ] [MIN] `site` in `astro.config` is the final `https://yourdomain.com` (canonicals and sitemap depend on it)
- [ ] [MIN] 👤 Cloudflare Pages project created: build command `pnpm build`, output dir `dist`, `NODE_VERSION` set
- [ ] [MIN] Production branch = `main`; preview deployments are `noindex`
- [ ] [PRO] CI (GitHub Actions): install, check, tests, build, content validator, CSP hash check, Lighthouse CI
- [ ] [PRO] Dependency updates automated (Dependabot/Renovate); `pnpm audit` in CI
- [ ] [PRO] Post-deploy smoke test: key URLs return 200, security headers present, sitemap reachable
- [ ] [PRO] Release tags + changelog; rollback tested via Cloudflare deployments

## C: CONTENT (tool pages, hubs, guides)
- [ ] [MIN] Every tool page: H1, short value statement, tool above the fold, how-to (3 steps), input/output example, FAQ (4–6), related tools
- [ ] [MIN] ≥ 500 words of unique, human-readable text per tool; no keyword stuffing; no copied/scraped text
- [ ] [MIN] No lorem ipsum, TODOs, empty pages, or near-duplicate pages
- [ ] [MIN] All code examples were actually run and are correct
- [ ] [MIN] Facts and claims are verifiable (RFC/spec/docs); no invented statistics or competitor claims
- [ ] [PRO] 6+ guides (900–1,500 words each) with "Open in tool" CTAs and related-guides blocks
- [ ] [PRO] Examples library (package.json, API response, GeoJSON, NDJSON, …)
- [ ] [PRO] Large-JSON benchmark page with methodology; factual, date-stamped comparison page
- [ ] [PRO] `datePublished` / `dateModified` on guides; freshness review schedule

## D: DOMAIN, DNS & CLOUDFLARE SETTINGS
- [ ] [MIN] 👤 `.com` registered in YOUR name with auto-renew on; registrar account has 2FA
- [ ] [MIN] 👤 Custom domain attached to the Pages project; HTTPS certificate active
- [ ] [MIN] One canonical host (www or non-www); the other 301-redirects to it; `http` → `https`
- [ ] [MIN] `*.pages.dev` host sends `X-Robots-Tag: noindex` (so it isn't indexed as a duplicate); check Cloudflare docs for the exact `_headers` pattern
- [ ] [MIN] 👤 Cloudflare "Always Use HTTPS" on; minimum TLS 1.2
- [ ] [MIN] 👤 Cloudflare Web Analytics auto-injection OFF (conflicts with CSP and the "no trackers" claim)
- [ ] [MIN] 👤 Rocket Loader and Email Address Obfuscation OFF (they inject scripts and break the CSP hash)
- [ ] [MIN] 👤 Bot Fight Mode / bot rules / AI-bot blocking checked: Googlebot, Bingbot and `Mediapartners-Google` can reach every page
- [ ] [MIN] 👤 Check what robots.txt Cloudflare serves (managed robots.txt can override or add rules)
- [ ] [PRO] 👤 HSTS enabled (after confirming HTTPS works everywhere)
- [ ] [PRO] 👤 Cloudflare Email Routing so `hello@yourdomain.com` forwards to your inbox (needed for the Contact page)
- [ ] [PRO] SPF/DKIM/DMARC records set for the domain's email
- [ ] [PRO] Caching: hashed assets `immutable` long-cache; HTML short TTL; Brotli and HTTP/3 on

## E: ERRORS & REDIRECTS
- [ ] [MIN] Custom 404 page (returns real HTTP 404) with search/tool suggestions
- [ ] [MIN] No soft-404s (an "empty" page returning 200)
- [ ] [MIN] Trailing-slash policy chosen, consistent everywhere (links, canonicals, sitemap, redirects)
- [ ] [MIN] Any changed or removed URL has a 301 in `_redirects`; no redirect chains or loops
- [ ] [MIN] No broken internal links; no broken external links
- [ ] [PRO] Link checker runs in CI
- [ ] [PRO] Friendly in-tool error states (worker crash, out of memory, unsupported browser) with recovery

## F: FEATURES (functional QA of every tool)
- [ ] [MIN] Every tool tested with: empty input, tiny valid input, invalid input, unicode/emoji, deeply nested, very long strings
- [ ] [MIN] Sample data button works; copy, download, clear, file-open and drag-drop work on every tool
- [ ] [MIN] Output is correct (compare against a reference: `jq`, `python -m json.tool`, a known library)
- [x] [MIN] Big numbers and high-precision decimals not corrupted by formatter/minifier — evidence: token-based formatter/minifier; vitest number-precision tests pass (65/65 overall)
- [x] [MIN] Converters correct for edge cases (nested objects, arrays, nulls, special characters, CSV quoting) — evidence: vitest converter tests for CSV/YAML/XML + RFC 4180 quoting pass
- [x] [MIN] Error messages show line, column and a plain-English hint — evidence: `parseJson` tokenizer offsets → line/column; validator/repair tests assert positions; error panel renders hint text
- [x] [MIN] Auto-repair shows exactly what it changed, with a way to revert — evidence: repair review dialog with fix list + text diff + "Revert to original"; browser verified in DECISIONS Phase 1
- [ ] [PRO] Unit tests (vitest) for every worker op with fixtures
- [x] [PRO] "Send to…" handoff between tools works and clears after reading — evidence: `src/lib/handoff.ts` one-shot `sessionStorage` key; DECISIONS Batch 2 browser verification
- [x] [PRO] Keyboard shortcuts documented and conflict-free — evidence: `ShortcutsDialog.astro` lists all shortcuts; primary and copy buttons expose `aria-keyshortcuts`

## G: GOOGLE SEARCH (Search Console and indexing)
Google's technical requirements are basic: Googlebot isn't blocked, the page works (not an error), and it has indexable content. Meeting them doesn't guarantee indexing.
- [ ] [MIN] 👤 Domain property added in Google Search Console and verified (DNS TXT record is best)
- [ ] [MIN] 👤 Sitemap submitted in GSC; status "Success"
- [ ] [MIN] 👤 URL Inspection run on home + top tool pages; "Request indexing" clicked
- [ ] [MIN] No important page is `noindex` or blocked in `robots.txt` by mistake
- [ ] [MIN] Only real translations are indexable; fallback-language pages are `noindex,follow`
- [ ] [MIN] Page Indexing report reviewed for errors ("Crawled – not indexed", "Duplicate", "Soft 404")
- [ ] [PRO] Core Web Vitals report monitored; Performance report reviewed weekly (queries, pages, CTR)
- [ ] [PRO] 👤 Add users/owners correctly; set preferred country only if truly needed
- [ ] [PRO] Check Google's spam policies against the site: no doorway pages, scaled low-value pages, hidden text, misleading functionality

## H: HEADERS & SECURITY (`public/_headers`)
- [ ] [MIN] CSP: `default-src 'self'`; `connect-src 'none'`; inline theme-script allowed by hash (and the hash matches the built output)
- [ ] [MIN] `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` restricting unused APIs
- [ ] [MIN] Clickjacking protection (`frame-ancestors 'none'` in CSP)
- [ ] [MIN] Verify with `curl -I` on the live URL that headers are actually served
- [ ] [MIN] No secrets, keys, or `.env` values in the repo or build output
- [ ] [PRO] Build-time check compares the inline-script hash to the CSP
- [ ] [PRO] Cross-origin isolation headers only if actually needed; documented CSP changes for ads
- [ ] [PRO] Run an external security-headers scan after launch and fix findings
- [ ] [PRO] Source maps decision made (public or not) and documented

## I: i18n & HREFLANG
- [ ] [MIN] Each locale URL is a real translated page, or is `noindex,follow` with no hreflang and not in the sitemap
- [ ] [MIN] `hreflang` set for every genuine translation + `x-default`; all references are reciprocal
- [ ] [MIN] Language switcher keeps the user on the same tool
- [ ] [MIN] No hardcoded UI strings; locale key parity check passes; English fallback works
- [ ] [MIN] `<html lang>` correct; fallback article bodies marked `lang="en"`
- [ ] [PRO] Translations reviewed by a human before being indexable
- [ ] [PRO] RTL layout tested (if an RTL locale is added); date/number formatting uses `Intl`
- [ ] [PRO] Translation roadmap: Tier 1 tools first, then top-traffic tools

## J: JSON-LD (structured data)
- [ ] [MIN] `WebApplication` (free, DeveloperApplication) on each tool page
- [ ] [MIN] `BreadcrumbList` on tool, hub, and guide pages
- [ ] [MIN] `Article` on guides (with dates and author/publisher)
- [ ] [MIN] Validate every type with Google's Rich Results Test and the Schema.org validator
- [ ] [PRO] `FAQPage` where an FAQ exists (note: Google limits FAQ rich results to a narrow set of sites, so don't expect them)
- [ ] [PRO] `Organization`/`Person` + `WebSite` on the home page
- [ ] [PRO] JSON-LD content matches the visible page (no hidden or fake data)

## K: KEYWORDS & URL STRUCTURE
- [ ] [MIN] Clean lowercase hyphenated slugs that match how people search (`/json-formatter`, `/json-to-csv`)
- [ ] [MIN] One primary keyword per page; no two pages target the same query (no cannibalization)
- [ ] [MIN] No query strings or IDs in canonical URLs
- [ ] [MIN] Slugs are stable; a slug change always gets a 301
- [ ] [PRO] Keyword/intent map in `docs/` (tool → primary query, secondary queries, guide that supports it)
- [ ] [PRO] Long-tail pages for real error messages and "X to Y" conversion pairs, only if each has genuinely useful content
- [ ] [PRO] Review Search Console queries monthly and update titles, copy and guides accordingly

## L: LEGAL & CONSENT
- [ ] [MIN] Privacy Policy (live, linked in footer): what runs locally, what's stored (theme/language only), cookies, third parties, contact, last-updated date
- [ ] [MIN] Terms of Use + "provided as is" disclaimer (output isn't guaranteed; don't paste secrets you can't risk)
- [ ] [MIN] Open-source licenses of dependencies respected; `THIRD-PARTY-LICENSES` file generated
- [ ] [MIN] No copyrighted text/images used without permission; fonts and icons properly licensed
- [ ] [PRO] Privacy Policy rewritten when ads go live: Google and partners use cookies/IDs, how to opt out, consent choices
- [ ] [PRO] Consent message for EEA/UK/Switzerland visitors before ads (Google-certified consent tool; see Z)
- [ ] [PRO] Contact details and an accurate owner/operator statement
- [ ] [PRO] Review applicable privacy laws for your visitors (GDPR, CCPA/CPRA) once ads add cookies

## M: MOBILE & RESPONSIVE
- [ ] [MIN] Test widths 320, 375, 414, 768, 1024, 1440; no horizontal scroll at any
- [ ] [MIN] Input/output become tabs or stacked panes on mobile; both reachable
- [ ] [MIN] Header menu available on mobile (Tools, Guides, Privacy), 44px targets
- [ ] [MIN] Text ≥ 16px in inputs (prevents iOS zoom); viewport meta present
- [ ] [PRO] Real devices tested (Android Chrome, iOS Safari); landscape works
- [ ] [PRO] Large-file behavior on mobile tested; friendly size warning
- [ ] [PRO] Virtual keyboard doesn't hide the toolbar or output

## N: NAVIGATION & INFORMATION ARCHITECTURE
- [ ] [MIN] Every page reachable within 3 clicks from home; no orphan pages
- [ ] [MIN] Header: Tools, Guides, About; footer: Privacy, Terms, Contact, Sitemap link
- [ ] [MIN] Breadcrumbs on tool, hub, and guide pages
- [ ] [MIN] Related-tools block on every tool page, driven from the registry
- [ ] [PRO] Command palette (Ctrl/Cmd+K), recents and favorites
- [ ] [PRO] Category hubs (`/converters`, `/formatters`, …) with intro text, not just link lists
- [ ] [PRO] "Related guide" block on tool pages and "Open in tool" CTAs in guides

## O: ON-PAGE SEO
- [ ] [MIN] `<title>` ≤ 60 chars, unique per page: `{Tool} Online: Free & Private | {Site}`
- [ ] [MIN] Meta description 140–155 chars, unique, mentions "runs in your browser / nothing uploaded"
- [ ] [MIN] Self-referencing canonical on every indexable page
- [ ] [MIN] One H1 matching the search intent; H2/H3 structure logical
- [ ] [MIN] Descriptive internal link text (no "click here"); images have alt text
- [ ] [MIN] Open Graph + Twitter card tags on every page
- [ ] [PRO] Per-category OG images (1200×630)
- [ ] [PRO] Content validator in the build enforces all the above
- [ ] [PRO] Favicon set (SVG + PNG + Apple touch icon) and web manifest (decide PWA separately; see Z notes)

## P: PERFORMANCE
- [x] [MIN] Entry JS tiny; editor, worker, and heavy libraries lazy-loaded per tool — evidence: home initial scripts total 5,970 bytes (~2 KB gzip); editor 348 KB and worker 279 KB are lazy chunks; converter libs behind `import()`
- [x] [MIN] Zero third-party requests (until ads, which load after consent and after the page is interactive) — evidence: browser resource-origin scan across all 24 tool pages: only `http://localhost:4322`; 0 console errors
- [x] [MIN] Fonts: system stack or one self-hosted subset with `font-display: swap`; images sized and compressed — evidence: `global.css:5` self-hosted Inter latin subset (48 KB) with `font-display: swap`; no `<img>` elements in source
- [!] [MIN] LCP < 2.5s, CLS < 0.1, INP < 200ms on a mid-range phone profile (target LCP < 1.5s) — blocked: available browser Lighthouse tool reports only a11y/best-practices/SEO; trace showed 0 long tasks, prior DECISIONS records LCP 0.9s
- [~] [MIN] Ad slots reserve fixed height so ads cause no layout shift — N/A: no ad slots ship today (ads intentionally deferred); when enabled they must reserve fixed height
- [!] [PRO] Lighthouse ≥ 90 on every page type; bundle-size budget enforced in CI — blocked: Lighthouse tool exposes no performance score here; a11y/best-practices/SEO were 100 on all tested pages; no CI exists
- [ ] [PRO] Prefetch on hover/viewport works and isn't blocked by CSP
- [!] [PRO] Real-device test on throttled CPU (4× slowdown) — blocked: no physical device or CPU-throttling harness available

## Q: QUALITY GATES (run before every deploy)
- [x] [MIN] `pnpm astro check` → 0 errors — evidence: `astro-check` result 184 files, 0 errors, 0 warnings, 2 hints
- [x] [MIN] `pnpm test` → all pass — evidence: 8 test files, 65/65 tests passed
- [x] [MIN] `pnpm build` → passes; no warnings you can't explain — evidence: 196 pages built; only 2 `fast-xml-parser` v5 deprecation hints, documented in DECISIONS
- [x] [MIN] Content validator (titles, descriptions, FAQ counts, word counts, unique slugs, related IDs, locale parity) passes — evidence: `pnpm validate` all checks pass, including new content-integrity block (unique IDs, resolvable related IDs, ≥350 words)
- [x] [MIN] No console errors or warnings on any page type — evidence: browser console on home/tool/hub/guide/privacy/404: 0 errors, 0 warnings
- [ ] [PRO] HTML validity, link check, spell check on content
- [!] [PRO] Cross-browser: latest Chrome, Firefox, Safari, Edge (+ one older version) — blocked: only Chromium is available in this environment
- [ ] [PRO] Final review with `web-design-guidelines`; periodic `improve-codebase-architecture` review
- [x] [PRO] Git history clean; docs (`AGENTS.md`, `DECISIONS.md`, this file) up to date — evidence: `git status --short` empty after commit `a46370e`; DECISIONS and CHECKLIST updated this session

## R: ROBOTS, SITEMAP & CRAWLING
- [ ] [MIN] `robots.txt` at root: allows crawling, lists `Sitemap:` with the absolute URL
- [ ] [MIN] `sitemap.xml` (or index) includes only canonical, indexable, 200-status URLs, with `lastmod`
- [ ] [MIN] Sitemap excludes `noindex`, redirected, 404, and untranslated-fallback URLs
- [ ] [MIN] Not blocking CSS/JS needed to render pages
- [ ] [MIN] `ads.txt` plan documented (added after AdSense approval)
- [ ] [PRO] Decide a policy for AI crawlers and write it down (e.g. search bots vs training bots); use `robots.txt` tokens accordingly
- [ ] [PRO] Sitemap URL count matches what you expect after each build (add a test)

## S: SEARCH ENGINES BEYOND GOOGLE
- [ ] [MIN] 👤 Bing Webmaster Tools: add the site (import from Search Console, or verify via XML file/meta/DNS) and confirm the sitemap is listed
- [ ] [MIN] Understand the sharing: Yahoo, Ecosia and others largely use Bing; DuckDuckGo mostly uses Bing results; Startpage uses Google (and Bing). Nothing to submit for these, so indexing in Google and Bing is the job
- [ ] [PRO] IndexNow: host the key file at the root; post-deploy script pings changed URLs (Bing and other participating engines)
- [ ] [PRO] Brave Search: no webmaster tools; it relies partly on opt-in browsing data (Web Discovery Project). Try the community-suggested URL-submit page, but don't rely on it; real visits help
- [ ] [PRO] Mojeek and other independent indexes: let them crawl; submit if they offer a form
- [ ] [PRO] Regional engines only if you target those countries: Yandex Webmaster (Russia), Naver Search Advisor (Korea), Seznam (Czechia), Baidu (China; hard from outside China)
- [ ] [PRO] Check each engine monthly: `site:yourdomain.com` coverage and branded-query test

## T: TRUST PAGES
- [ ] [MIN] About (who runs it, why it exists, how privacy works, ≥ 300 words, real identity or at least a real operator name)
- [ ] [MIN] Contact with a working email you actually check (test it)
- [ ] [MIN] Privacy Policy and Terms (see L)
- [ ] [PRO] Changelog page; "Verify our privacy claim yourself" page with DevTools steps
- [ ] [PRO] Source/feedback link (e.g. a public issue tracker) or feedback form that doesn't collect JSON data
- [ ] [PRO] Methodology page for benchmarks and comparisons

## U: UX & UI DESIGN
- [x] [MIN] Tool is above the fold; one primary action per tool; no popups, banners, or overlays over the tool — evidence: browser on formatter: tool top 236px < 700px viewport, 1 visible `bg-primary` button ("Format"), 0 open dialogs/overlays
- [~] [MIN] Dark/light/system theme with no flash on load; choice persists — N/A: system mode intentionally removed (DECISIONS); light/dark only, inline no-flash bootstrap + `localStorage('theme')` persistence verified in source
- [x] [MIN] Consistent spacing, type scale, and color tokens; hierarchy by weight, not borders on every control — evidence: `global.css` design tokens + source review in Phase 8 audit; no per-control borders added
- [x] [MIN] Loading, empty, error, and success states for every tool — evidence: shared `tool-strings.ts` + session shells define `ready`, `emptyInput`, `largeRun`, `running`, `outputReady`, error states used by all tool families
- [x] [PRO] Run the `ui-taste` and `web-design-guidelines` skills; fix the findings — evidence: Phase 8 audit loaded both skills; fixed focus ring, stray h2, combobox roles, overscroll containment
- [ ] [PRO] Microcopy reviewed: clear, short, no jargon, no blame in errors
- [!] [PRO] Test with 3 real users (or friends) on first-use tasks; fix what confuses them — blocked: no real users available

## V: VERIFY THE PRIVACY CLAIM
- [ ] [MIN] After page load and while using each tool, the browser Network tab shows no request carrying user data
- [ ] [MIN] Search the source for `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, analytics snippets; each hit explained
- [ ] [MIN] User input is never saved to localStorage/IndexedDB/cookies; only theme, locale, indent size, recents/favorites (tool IDs)
- [ ] [MIN] No third-party scripts, fonts, or images; no tracking pixels
- [ ] [MIN] Test with the network offline after load: tools still work
- [ ] [PRO] Dependency review: none of the libraries phone home; lockfile audited
- [ ] [PRO] Privacy claims in copy are exactly true (reword them when ads start)
- [ ] [PRO] Automated "no requests after load" test in CI (e.g. Playwright)

## W: WEB WORKERS & LARGE-FILE ROBUSTNESS
- [ ] [MIN] The main thread never parses/stringifies/diffs/converts JSON; the worker does
- [ ] [MIN] Typed worker protocol; cancel/terminate+respawn works; stale requests are discarded
- [ ] [MIN] Fallback when `Worker` is unavailable (size-capped, with a notice)
- [ ] [MIN] Test files of 1MB, 10MB, 50MB, 100MB: the UI stays responsive, progress shows, and the tab doesn't crash
- [ ] [MIN] Out-of-memory handled with a friendly error and a live tab
- [ ] [MIN] Output for huge data rendered virtually (editor viewport / virtual list), never one giant DOM node
- [ ] [PRO] Buffers transferred, not copied; memory released after clear
- [ ] [PRO] Benchmarks recorded (device, browser, time) for the public benchmark page
- [ ] [PRO] Tested on low-spec hardware, Firefox, and Safari/iOS memory limits

## X: EXTERNAL PRESENCE (backlinks & discovery)
- [ ] [MIN] 👤 Social/profile accounts for the brand reserved (GitHub, X, etc.); the site is linked from each
- [ ] [PRO] 👤 Launch posts: Show HN, Reddit developer communities (follow each community's self-promotion rules), dev.to, Product Hunt
- [ ] [PRO] 👤 Submit to reputable tool directories and "awesome" lists only where a real fit exists
- [ ] [PRO] Open-source something small (e.g. a library or a benchmark script) to earn natural links
- [ ] [PRO] Never buy links, run link exchanges, or post spam; these violate search spam policies

## Y: YEAR-ROUND MAINTENANCE & MONITORING
- [ ] [MIN] Weekly: Search Console and Bing Webmaster errors, indexing, queries
- [ ] [MIN] Monthly: Lighthouse/Core Web Vitals, broken links, dependency updates, uptime check
- [ ] [PRO] Uptime monitor on the home page + 3 tool pages (free tier of a monitoring service)
- [ ] [PRO] Quarterly content refresh: update dates, examples, FAQs; add 2–4 new guides
- [ ] [PRO] Track a small set of target queries and positions in Search Console
- [ ] [PRO] Annual: domain renewal, policy re-read (AdSense + Google), privacy page review

## Z: ZONE: ADSENSE & MONETIZATION
Google's stated requirements: original, high-quality content you own; compliance with AdSense policies; access to your site's HTML; applicant aged 18+. No official minimum for posts, words, traffic, or site age. Verify current rules at `support.google.com/adsense` before applying.

### Z.1 Before applying
- [ ] [MIN] 👤 Applicant is 18+; name/address on the account match your ID and payment details
- [ ] [MIN] Site is live on the `.com` with HTTPS; every page publicly reachable; crawlers not blocked (see D)
- [ ] [MIN] All pages have substantial original content; no thin/duplicate/placeholder pages; English-fallback translated pages are `noindex`
- [ ] [MIN] About, Contact, Privacy Policy, Terms are live and linked
- [ ] [MIN] Navigation clear on desktop and mobile; layout not broken on phones
- [ ] [MIN] No prohibited or restricted content; read the AdSense Program policies and Better Ads Standards that Google refers to
- [ ] [PRO] Pages are indexed in Google and receiving some organic visits (not an official rule, but stronger evidence of a real site)
- [ ] [PRO] Every tool page has real publisher content around the tool (not a tool UI alone)

### Z.2 Applying
- [ ] [MIN] 👤 Create the AdSense account; add the exact site URL
- [ ] [MIN] 👤 Complete ownership verification (AdSense code snippet in `<head>`, or the other option AdSense offers). Do this in a branch; it changes CSP and privacy claims, so keep the change minimal and documented
- [ ] [MIN] 👤 Wait for review (can take days to weeks); don't change the site drastically during review
- [ ] [PRO] Keep a copy of the site as submitted (git tag) in case you need to compare after a rejection

### Z.3 If rejected: fix, don't resubmit blindly
- [ ] [MIN] Read the exact reason shown in AdSense; map it to Google's help article on that issue
- [ ] [MIN] "Insufficient / low-value content" → add real original content, remove thin pages, improve usefulness
- [ ] [MIN] "Navigation issues" → fix menus, broken links, orphan pages
- [ ] [MIN] "Site down / can't be crawled" → check Cloudflare bot settings and robots.txt for `Mediapartners-Google`
- [ ] [PRO] Reapply only after the fixes are live and recrawled

### Z.4 After approval (code)
- [ ] [MIN] 👤 Add `ads.txt` with the exact line AdSense gives you at `/ads.txt`
- [ ] [MIN] Flip `PUBLIC_ADS_ENABLED=true` only when ready; `AdSlot` renders nothing when false
- [ ] [MIN] Update the CSP to allow only the Google ad domains required; keep everything else strict; document each added domain
- [ ] [MIN] Ads load after consent and after the page is interactive (no impact on tool responsiveness)
- [ ] [MIN] Ad containers have a reserved height; CLS stays 0
- [ ] [PRO] Compare Lighthouse/Core Web Vitals before vs after ads; fix any regressions

### Z.5 After approval (consent & legal)
- [ ] [MIN] 👤 Set up Google's consent message (AdSense "Privacy & messaging" or a Google-certified CMP) for the EEA, UK and Switzerland
- [ ] [MIN] Privacy Policy updated: ads, cookies/IDs, partners, opt-out links, consent choices
- [ ] [MIN] Site copy updated: "Your JSON is never uploaded" stays true, but remove any claim of "no third-party requests/cookies"
- [ ] [PRO] Footer link to "Privacy choices/consent settings" if required by the consent tool

### Z.6 Placement rules
- [ ] [MIN] Max 1–2 ad slots: one below the tool, one in the article area; never above, inside, or touching the tool controls
- [ ] [MIN] No sticky/overlay/interstitial ads; no ads that push the tool down or move on load
- [ ] [MIN] Never click your own ads; never ask users to click; no deceptive labels
- [ ] [MIN] Ads are never placed on screens without publisher content (error pages, empty states, 404)
- [ ] [PRO] Test with ad blockers on: the tool still works, and nothing breaks or nags

### Z.7 Payments and monitoring
- [ ] [MIN] 👤 Complete payment details and tax information in AdSense (check the options available for your country)
- [ ] [MIN] 👤 Watch AdSense policy-center messages; fix violations quickly
- [ ] [PRO] Monitor invalid-traffic warnings; investigate sudden spikes
- [ ] [PRO] Review RPM and layout per page type quarterly; remove ad units that hurt UX more than they earn
- [ ] [PRO] Decide on PWA/offline explicitly. A service worker needs fetch/cache, so it conflicts with `connect-src 'none'`; choose `connect-src 'self'` or skip PWA

---

## DECISIONS LOG (fill in as you go)
| Date | Decision | Why |
|---|---|---|
| | Site name / domain | |
| | Trailing-slash policy | |
| | Locales indexed at launch | |
| | AI crawler policy in robots.txt | |
| | PWA: yes/no | |
| | Ad slots and placement | |
