# MASTER PROMPT — JSON BITS : Client-Side JSON Toolbox, Domain: 'jsonbits.com'

## 0. HOW YOU MUST WORK (read first, obey always)

You are a senior front-end engineer building a production website with me, step by step.

1. FIRST ACTION: save this entire document to `AGENTS.md` in the project root (it is your persistent memory). In every future session, re-read `AGENTS.md` before doing anything.
2. Work on ONE PHASE at a time (see section 12). After finishing a phase: run `pnpm astro check && pnpm build`, fix all errors, then STOP and report in max 10 lines: what changed, what you verified, what's next. Wait for me to say "continue" or "Phase N".
3. Never claim something works unless you ran it. Show the command and result.
4. Never invent APIs. For Astro, Tailwind, CodeMirror, and any library, look up current docs with the `context7` MCP before writing code.
5. Keep files small (<250 lines), typed, and single-purpose. No dead code, no TODO placeholders left behind.
6. Ask me ONLY when a decision is genuinely mine (name, domain, scope trade-offs). Otherwise follow this document.
7. My dev machine is low-spec (old i5, 8GB RAM): don't run heavy watchers in parallel, keep devDependencies lean, never install a package when ~20 lines of code do the job.
8. Skills available to you — use them at the phases specified:
   - `grill-me`: Phase 0 only (interview me about open decisions).
   - `ui-taste` + `web-design-guidelines`: design work (Phase 2) and the audit (Phase 8).
   - `improve-codebase-architecture`: Phase 9.
   - `ios-design`: DO NOT USE (this is a web product, not iOS).

## 1. PRODUCT

A fast, private, ad-light website of JSON tools. 100% client-side: user data NEVER leaves the browser (no uploads, no analytics that read inputs, no server, no API calls). Static site on Cloudflare Pages free tier, custom .com. No accounts, no paywalls. Monetization later: non-intrusive Google Ads after SEO traffic exists (design for it, don't ship it now).

Competitive edge (these are requirements, not nice-to-haves):
- Instant, never freezes, never crashes on large files (50MB+ handled gracefully).
- Clean minimal UI with no bloat, no popups, no dark patterns, nothing covering the tool.
- Precise errors (line + column + plain-English hint), auto-fix for common mistakes.
- Works great on mobile.

## 2. TECH STACK (fixed — do not substitute)

- Astro (latest stable), static output (`output: 'static'`), TypeScript strict.
- Tailwind CSS v4 via `@tailwindcss/vite` (verify current setup with context7).
- NO UI framework in v1: tool UIs are vanilla TypeScript modules loaded via Astro `<script>` / dynamic `import()`.
- pnpm. Node LTS.
- Editor: CodeMirror 6, lazy-loaded per tool page (never in the initial bundle).
- Lazy libs (dynamic `import()` inside the worker, only when the tool needs them): `yaml`, `fast-xml-parser`, `papaparse`, `jsonc-parser`. Everything else is hand-written.
- Content: Astro Content Collections for tool copy/FAQ/guides per locale.
- Official integrations only: `@astrojs/sitemap`. No analytics, no trackers, no third-party scripts, no external fonts (system font stack or one self-hosted variable subset).

## 3. PROJECT STRUCTURE (create exactly this, adapt names only with reason)

```
/
├─ AGENTS.md
├─ astro.config.mjs            # i18n, sitemap, site URL, vite worker config
├─ docs/DECISIONS.md           # output of Phase 0
├─ public/
│  ├─ _headers                 # security + cache headers (Cloudflare Pages)
│  ├─ robots.txt  favicon.svg  og-default.png
└─ src/
   ├─ pages/
   │  └─ [...slug].astro       # generates home, category hubs, tool pages, content pages for EVERY locale
   ├─ layouts/
   │  ├─ BaseLayout.astro      # <html lang dir>, theme bootstrap, SEOHead, skip link
   │  └─ ToolLayout.astro      # tool UI + article content + FAQ + related
   ├─ components/
   │  ├─ layout/               # Header, Footer, ThemeToggle, LangSwitcher, AdSlot
   │  ├─ seo/                  # SEOHead, JsonLd
   │  └─ tool/                 # ToolShell, Toolbar, ErrorPanel, FileDropzone, StatsBar
   ├─ tools/
   │  ├─ registry.ts           # SINGLE SOURCE OF TRUTH (see §4)
   │  ├─ types.ts
   │  └─ <tool-id>/ui.ts       # thin UI glue per tool
   ├─ workers/
   │  ├─ json.worker.ts        # message router only
   │  ├─ protocol.ts           # typed request/response/progress messages
   │  ├─ client.ts             # WorkerClient used by UI (see §5)
   │  └─ ops/                  # format.ts validate.ts minify.ts tree.ts diff.ts convert/*.ts repair.ts
   ├─ lib/                     # editor.ts (lazy CM6), download.ts, handoff.ts, a11y.ts, storage.ts
   ├─ i18n/
   │  ├─ config.ts             # locales, default, dir (ltr/rtl)
   │  ├─ t.ts                  # t(locale, key, vars)
   │  └─ locales/              # en.json es.json fr.json de.json pt.json (flat keys)
   ├─ content/                 # collections: tools/<locale>/<id>.md (copy + FAQ), guides/
   └─ styles/global.css        # Tailwind import + design tokens (CSS variables)
```

## 4. TOOL REGISTRY (adding a tool = adding one entry)

`registry.ts` exports an array of `ToolDef`: `id, slug, category ('format'|'validate'|'view'|'convert'|'compare'|'generate'), worker op name, icon, keywords, related ids, lazy libs needed, schema.org type`. Pages, nav, sitemap, related-links, and JSON-LD are ALL generated from it. No hardcoded tool lists anywhere else.

Tool list (build in this priority; slugs are final):
- Tier 1: `json-formatter`, `json-validator`, `json-minifier`, `json-viewer` (tree), `json-diff`
- Tier 2: `json-to-csv`, `csv-to-json`, `json-to-yaml`, `yaml-to-json`, `json-to-xml`, `xml-to-json`
- Tier 3: `json-sorter`, `json-escape-unescape`, `jsonpath-tester`, `json-to-typescript`, `json-schema-validator`, `json-repair`
Home page = tool grid grouped by category with a search box. Slugs stay English in v1 in every locale (`/es/json-formatter`); metadata and content are translated.

## 5. WEB WORKER ARCHITECTURE (the core differentiator)

Rule: the main thread NEVER parses, stringifies, diffs, or converts JSON. It only renders and handles input.

- One lazy module worker created on first use: `new Worker(new URL('./json.worker.ts', import.meta.url), { type: 'module' })`.
- Typed protocol in `protocol.ts`: `{ id, op, payload, options }` → `{ id, ok, result | error, progress? }`. Error shape: `{ message, line, column, offset, hint }`.
- `WorkerClient` API: `run(op, payload, opts) → Promise`, `cancel(id)`, `onProgress`. Cancellation = terminate and respawn the worker. Debounce typing (250ms) and cancel stale requests so only the latest wins.
- Large inputs: read files via `File.arrayBuffer()` and TRANSFER the buffer to the worker (`postMessage(buf, [buf])`); decode with `TextDecoder` inside the worker. Never round-trip a 50MB string through the main thread more than needed.
- Size tiers: <1MB live-as-you-type; 1–20MB run on button/debounce with a progress indicator; >50MB show a clear size warning before running; if the worker throws out-of-memory, show a friendly error and keep the tab alive.
- Rendering large output: never put huge text in a normal DOM node. Use CodeMirror 6 (viewport-based) for text output; use a virtualized list for the tree viewer.
- Tree viewer: worker keeps the parsed document and serves slices (`open`, `getChildren(path, offset, limit)`, `search`). Main thread holds only the visible rows. Lazy expand, keyboard navigation, copy path (JSONPath), type badges, child counts.
- Number safety: do not silently corrupt big integers / high-precision decimals in formatter and minifier (use a tokenizer-based formatter that preserves number text, not `JSON.parse` → `stringify`).
- Errors use `jsonc-parser` offsets to report line/column. `repair.ts` fixes: trailing commas, single quotes, unquoted keys, comments, Python `None/True/False`, smart quotes. Show what was changed.
- Fallback: if `Worker` is unavailable, run ops on the main thread with a size cap and a notice.
- Diff: structural diff in the worker → flat list `{ path, type: added|removed|changed, old, new }`; options: ignore key order, ignore array order. Render the list virtualized.
- Converters: CSV (flatten nested objects with dot paths; array handling options; delimiter; header toggle; RFC 4180 quoting; optional CSV-injection guard), XML (root name, attributes, indentation), YAML.

## 6. UI/UX PRINCIPLES

Use `ui-taste` and `web-design-guidelines`. Direction: calm, minimal, utility-first, developer-friendly. Dark mode should feel near-black and relaxed (neutral grays, one restrained accent color, no loud gradients, no generic "AI" look).

- Tool pages: the tool is above the fold. Layout = two panes (input | output) on desktop, stacked with a tab switcher on mobile. One primary action per tool; secondary actions in an overflow/less prominent style. Don't put a border around every control: use weight and spacing for hierarchy.
- Always available: paste, drag-drop file, open file, copy, download, clear, sample data, indent size, stats bar (size, lines, depth, parse time).
- Keyboard shortcuts (Ctrl/Cmd+Enter run, Ctrl/Cmd+Shift+C copy output) listed in a tooltip-free help dialog.
- Cross-tool handoff: "Send to…" passes data via `sessionStorage`, read once then cleared (still 100% local).
- Never store user JSON persistently. Persist only preferences (theme, locale hint, indent size).
- NO popups, banners, newsletter modals, or sticky overlays. Ever.
- Design tokens as CSS variables in `global.css` (surface, text, muted, border, accent, danger, success); Tailwind maps to them.

## 7. THEME (dark / light / system) — no flash

- 3 states: `light | dark | system`, stored in `localStorage('theme')` inside try/catch.
- A tiny INLINE blocking script in `<head>` (before CSS paints) sets `data-theme` / `class="dark"` on `<html>` and `color-scheme`. Listen to `prefers-color-scheme` changes while in `system`.
- Tailwind v4 dark variant bound to that selector (`@custom-variant dark`).
- `ThemeToggle` is a real `<button>` with `aria-label`, current state announced, works without layout shift.
- CodeMirror theme must follow the same tokens.

## 8. INTERNATIONALIZATION

- Astro built-in i18n routing. Locales for launch: `en` (default, no prefix), `es`, `fr`, `de`, `pt`. Architecture must allow adding a locale by adding one JSON file + content files (RTL-ready via `dir`).
- UI strings in `locales/*.json` (flat keys, `t()` helper, build fails or warns on missing keys, English fallback). Long-form tool copy in content collections per locale.
- `<html lang>` and `dir` set correctly; LangSwitcher keeps the user on the same tool; `hreflang` for every locale + `x-default`.
- Do not machine-dump low-quality translations into SEO content: ship English fully first, then translate Tier 1 tools, and flag unreviewed translations in `docs/DECISIONS.md`.

## 9. SEO

- Clean URLs: `/json-formatter`, `/es/json-formatter`; category hubs `/converters`, `/formatters`, etc.; `/learn/<guide>` for error and how-to guides targeting long-tail queries (e.g. "unexpected token in JSON", "JSON vs YAML", "how to convert JSON to CSV").
- Per tool page, generated from registry + content:
  - `<title>`: `{Tool Name} Online — Free & Private | {SITE_NAME}` (≤60 chars)
  - meta description 140–155 chars: states what it does + "runs in your browser, nothing uploaded"
  - self-referencing canonical, hreflang set, OpenGraph + Twitter card, one H1
  - JSON-LD: `WebApplication` (DeveloperApplication, free offer), `FAQPage` (when FAQ exists), `BreadcrumbList`
- Page body below the tool (unique per tool, ≥350 words, human-readable, no keyword stuffing): what it is, how to use (3 steps), input/output example, common errors, FAQ (4–6 Q&A), related tools (from registry), privacy note.
- `@astrojs/sitemap` with i18n, `robots.txt`, descriptive internal links, no orphan pages, 404 page with tool suggestions.
- Heading and link text should match how people search ("JSON formatter", "convert JSON to CSV").
- Page body below the tool (unique per tool, ≥350 words, human-readable, no keyword stuffing): what it is, how to use (3 steps), input/output example, common errors, FAQ (4–6 Q&A), related tools (from registry), privacy note.
- `@astrojs/sitemap` with i18n, `robots.txt`, descriptive internal links, no orphan pages, 404 page with tool suggestions.
- Heading and link text should match how people search ("JSON formatter", "convert JSON to CSV").

## 10. ACCESSIBILITY (WCAG 2.2 AA)

Skip link; landmarks (`header/nav/main/footer`); visible focus rings; full keyboard operation (tree viewer follows the ARIA tree pattern); `aria-live="polite"` for results and errors (announce line/column); errors never rely on color alone; contrast ≥4.5:1 in both themes; touch targets ≥44px; labels for every input; `prefers-reduced-motion` respected; text resizable to 200%; dialog focus trap and Esc to close. Verify with keyboard-only testing and an automated check (axe via chrome-devtools-mcp if available).

## 11. PERFORMANCE, SECURITY, ADS-READINESS

- Budgets: ≤50KB gzipped JS on first tool-page load (editor and libs lazy), LCP <1.5s, CLS 0, INP <200ms. Zero third-party requests.
- Static HTML for all pages; prefetch tool links on hover/visible; long-cache hashed assets via `_headers`.
- `_headers`: strict CSP (`default-src 'self'; connect-src 'none'; …`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. The `connect-src 'none'` line is a provable privacy claim; loosen ONLY when ads are enabled later.
- `AdSlot.astro`: reserves fixed height (no layout shift), renders nothing and loads nothing unless `PUBLIC_ADS_ENABLED=true`. Allowed positions later: one slot below the tool, one in the article area. Never above or inside the tool, never sticky, never interstitial. Consent/CMP is a later task; don't build it now.
- Add `/privacy` page that honestly states what runs locally.

## 12. PHASES (stop after each, wait for my "continue")

- **Phase 0 — Discovery.** Use `grill-me` to interview me on: site name, domain, final locale list, tool priorities, brand tone, accent color. Write answers to `docs/DECISIONS.md`. No code.
- **Phase 1 — Scaffold.** Astro + TS strict + Tailwind v4, pnpm, i18n config, sitemap, folder structure, `_headers`, empty registry, CI-free `pnpm build` passing.
- **Phase 2 — Design system & layouts.** Tokens, BaseLayout, Header/Footer, theme system with no-flash script, LangSwitcher, home page grid. Use `ui-taste` + `web-design-guidelines`.
- **Phase 3 — Engine.** Worker, protocol, WorkerClient, CodeMirror lazy loader, ToolShell, FileDropzone, stats bar, size-tier handling. Ship `json-formatter` end-to-end as the reference tool.
- **Phase 4 — Tier 1 tools.** validator, minifier, repair, viewer (virtualized tree), diff.
- **Phase 5 — Tier 2 converters.**
- **Phase 6 — SEO layer.** Content collections, SEOHead, JSON-LD, tool-page article template, hubs, `/learn` guides, 404, sitemap check.
- **Phase 7 — i18n content.** Translate UI strings and Tier 1 content; verify hreflang.
- **Phase 8 — Audit.** Run `web-design-guidelines` review; a11y pass; Lighthouse/CWV; large-file stress test (generate 10MB / 50MB JSON, prove no UI freeze); fix findings.
- **Phase 9 — Architecture review.** Run `improve-codebase-architecture`; propose refactors; apply only the ones I approve.
- **Phase 10 — Tier 3 tools, then deploy.** Cloudflare Pages settings (build command, output dir `dist`, env vars), custom domain, post-deploy checklist.

## 13. DEFINITION OF DONE (every phase)

`pnpm astro check` has 0 errors, `pnpm build` passes, no console errors, no unused code, no network requests during tool use (verify in devtools Network tab), and your report states exactly what you verified.

Begin now: do step 0.1 (save this document to `AGENTS.md`), then start Phase 0.
