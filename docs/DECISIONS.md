# Decisions — JSON Bits

Last updated: 2026-11-04
Status: Phase 3 complete. Worker engine and `json-formatter` verified end-to-end; Tier 1 tools remain.

## Product identity

| Decision | Value | Notes |
|---|---|---|
| Brand name | **JSON Bits** | Human-readable casing; use “JSON Bits” in prose and a compact wordmark in the header. |
| Domain | **jsonbits.com** | Canonical host is `https://jsonbits.com`; Cloudflare Pages deployment target. |
| Product | Client-side JSON toolbox | Fast, private, ad-light, no accounts, no paywalls. |
| Audience | Developers first | Plain-English help and precise errors keep it approachable for occasional users without slowing experts down. |
| Tone | Calm, precise, utility-first | No hype, no growth-hack language, no generic “AI” styling. |
| Accent | **Deep teal `#2E4B46`** (dark `#82B7AB`) | Single restrained accent, used for primary CTAs and focus. Replaced the original cobalt direction after the DESIGN.md review. |

## Localization

| Decision | Value |
|---|---|
| Launch locales | `en` (default, no URL prefix), `es`, `fr`, `de`, `pt` |
| URL policy | English slugs in every locale, e.g. `/es/json-formatter` |
| Build order | English content complete first; then translate UI strings and Tier 1 tool content |
| Translation quality | No native human reviewer available. Use researched, terminology-checked translations sourced from authoritative technical references rather than raw machine output. |
| Indexing | All five locale versions may be indexed. Unreviewed translations are disclosed here; no page will claim human review. |
| Missing content | English fallback is shown; locale pages must still have correct `lang`, `dir`, canonical, and hreflang metadata. |
| RTL readiness | Locale config includes `dir`; no RTL locale is in the launch set. |

## Visual direction

The Phase 2 shell was re-skinned from `D:\DESIGN.md`, a Zapier-inspired warm-professional language.

| Decision | Value |
|---|---|
| Canvas | Warm cream `#FFFEFB`; soft cream `#F8F4F0` for content bands. No pure white. |
| Ink | Deep coffee `#1B1310`, body `#605D52`, secondary `#6B675C`. No pure black. |
| Accent | Deep teal `#2E4B46` on light, `#82B7AB` on dark; on-accent `#FBFAF7` / `#12211F`. |
| Dark mode | Teal-tinted near-black canvas `#0A0F0E`, soft `#121715`, ink `#EDEFEC`. |
| Fixed-dark bands | Privacy “why” band and footer stay `#0A0F0E` / `#EDEFEC` in both themes. |
| Shape | 12 px cards and buttons; 6 px inputs and menu rows; pill badges only. |
| Type | Self-hosted Inter variable (latin subset, 48 KB). Degular Display is proprietary, so hero and display sizes use Inter 500, per the design file’s substitute guidance. No external font requests. |
| Tool cards | Text only: tool name, description, and a text “Soon” badge. No icon glyphs, logos, or arrow icons on cards. |
| Contrast | Light `body-mid` darkened from the reference `#939084` to `#6B675C` so 14–16 px text clears 4.5:1 on both canvas and cream. |

## Tool scope and priority

Resolved conflict: **`json-repair` moves from Tier 3 into Tier 1 and is built in Phase 4**, because Phase 4 explicitly includes repair and auto-fix is a stated competitive advantage.

### Tier 1 — Phase 3–4

1. `json-formatter`
2. `json-validator`
3. `json-minifier`
4. `json-viewer`
5. `json-diff`
6. `json-repair`

### Tier 2 — Phase 5

1. `json-to-csv`
2. `csv-to-json`
3. `json-to-yaml`
4. `yaml-to-json`
5. `json-to-xml`
6. `xml-to-json`

### Tier 3 — Phase 10

1. `json-sorter`
2. `json-escape-unescape`
3. `jsonpath-tester`
4. `json-to-typescript`
5. `json-schema-validator`

The registry is the single source of truth for tool metadata, navigation, pages, sitemap entries, related links, and JSON-LD.

## Architecture and product constraints

- Astro static output, TypeScript strict, Tailwind CSS v4 via `@tailwindcss/vite`, vanilla TypeScript tool UIs.
- One lazy module Web Worker; the main thread never parses, stringifies, diffs, or converts JSON.
- CodeMirror 6 is lazy-loaded per tool page. Virtualized rendering for tree and diff output.
- Large-file tiers: live typing below 1 MB; explicit run/progress for 1–20 MB; warning above 50 MB; graceful OOM handling.
- Formatter/minifier preserve number token text; do not round-trip through `JSON.parse`/`JSON.stringify` for number-sensitive output.
- Converters use only `yaml`, `fast-xml-parser`, `papaparse`, and `jsonc-parser`, dynamically imported inside the worker.
- No analytics, trackers, external fonts, third-party scripts, or uploads. CSP `connect-src 'none'` in v1.
- Ads are not shipped. `AdSlot` stays disabled unless `PUBLIC_ADS_ENABLED=true`; ads may later appear only below the tool and in the article area.
- Persist preferences only: theme, locale hint, indent size. Never persist user JSON.
- Theme: `light | dark | system`, no-flash inline bootstrap, Tailwind dark variant bound to the selected theme attribute.

## SEO and launch policy

- Static HTML for every page; canonical URLs, hreflang + `x-default`, OpenGraph/Twitter metadata, JSON-LD per tool.
- English pages indexed at launch. All locale routes are built; translations are terminology-checked and disclosed as not human-reviewed.
- Tool pages need unique, useful copy (≥350 words), 4–6 FAQs, related tools, and privacy explanation.
- Category hubs, `/learn/<guide>` pages, `/privacy`, 404 with tool suggestions, sitemap, and robots.txt are required.
- No orphan pages. Internal link text should match search intent (“JSON formatter”, “convert JSON to CSV”).

## Deferred / not in v1

- Google Ads, consent management, and any CSP loosening for ad networks.
- User accounts, saved documents, server-side processing, API endpoints, analytics.
- Additional locales beyond the five launch locales.
- iOS-specific design work (not applicable to this web product).

## Phase 3 engine verification (resumed on new OS)

Work resumed on a fresh OS with no Node/pnpm installed; the project files were intact.

- Toolchain restored: Node 26.13.0 (nvm) + pnpm 12.16.1; `pnpm install --frozen-lockfile` restores all 299 packages.
- `pnpm astro check`: 0 errors, 0 warnings, 0 hints. `pnpm build`: 10 pages (5 home + `json-formatter` in 5 locales).
- Formatter verified in a production preview, not just dev: sample data formats, 4-space indent re-runs and persists in `jsonbits:indent`, `9007199254740993` / `4.999999999999999` survive unchanged (token-based formatter, no `JSON.parse` round-trip).
- Error path is precise: trailing comma reports “Line 4, column 1” with a plain-English hint and a Go-to-error action; empty input reports an explicit-run message.
- Controls verified: Ctrl/Cmd+Enter run, Clear, Sample, Download (`formatted.json`), drag-and-drop file load (file chip + stats), theme cycle with CodeMirror tokens following the palette, no-flash bootstrap intact.
- Size tiers behave as specified: a 6.87 MB drop switches to large-file mode (no preview), formats in 592 ms with a 12.5 MB result; a 9.44 MB input returns a 16.1 MB Blob instead of a DOM string. Instrumented run showed no long task attributable to the app on the main thread.
- Network during a full tool session: 8 same-origin requests only (document, font, CSS, base script, page script, tool UI, editor, worker). Zero third-party requests, zero console errors.
- Lighthouse on the production tool page: 100 accessibility, 100 best practices, 100 SEO, 0 failures.
- CSP integrity re-checked: the single inline theme script in `dist/index.html` hashes to the pinned `sha256-LvWPinNh6aFOYKtS1cDZB32jfU2RyoTY3YvVC22hZbo=`.
- Bundle shape: shell ~2.4 KB gzip, tool UI 7.1 KB gzip, worker 3.6 KB gzip, CodeMirror editor chunk 102 KB gzip loaded lazily via dynamic `import()`.
- Deliberately deferred: page canonical/hreflang + article content (Phase 6); splitting `json-formatter/session.ts` (551), `workers/ops/format.ts` (412) and `scanner.ts` (357) under the 250-line guidance (Phase 9).
- Version control started: `git init -b main` with Phases 0–3 committed as `Phase 0-3: scaffold, design system, and json-formatter engine`. Local identity is `Sakib <sakib@localhost>`; update it before any push. `node_modules/`, `dist/`, and `.astro/` stay ignored.

## Phase 2 design-system verification

- Tokens for canvas, cream, ink, body, primary, night bands, borders, focus, danger, success, and warning; light and dark palettes share one deep-teal accent.
- Three-state theme (`light | dark | system`) with a no-flash inline bootstrap, `localStorage` persistence, system-change listener, accessible cycling button, and polite status announcement.
- Astro script inlining disabled (`vite.build.assetsInlineLimit: 0`) so client modules are external and pass `script-src 'self'`. Only the theme bootstrap is inline; its SHA-256 hash is pinned in `public/_headers`.
- Header, footer, locale switcher, responsive hero, registry-driven 17-tool grid across six categories, search with `/` shortcut, live result count, and empty state.
- All 17 registry tools are `available: false` until their pages ship; cards show “Soon” and are not links, so no broken routes. Tool names/descriptions remain English until Phase 7 content translation.
- Five locale dictionaries have the same 46 keys; `lang`, `dir`, titles, skip links, and H1s verified on all five home pages.
- `pnpm astro check`: 0 errors, 0 warnings, 0 hints. `pnpm build`: 5 pages.
- Browser checks: theme cycle/persistence across locale navigation, search filter/empty/clear, `/` focus, language menu Esc close, no console messages, only same-origin document/CSS/JS requests.
- CSP enforced by a local header server: inline hash and external modules executed with no violations.
- Redesign from `D:\DESIGN.md`: warm cream canvas, coffee ink, deep-teal CTA, 12 px cards/buttons, fixed-dark privacy/footer bands, self-hosted Inter variable (48 KB latin subset, preloaded), and text-only tool cards with no icon tiles or arrow glyphs.
- Contrast check: all text pairs clear 4.5:1 in light and dark (body 6.5:1, body-mid 5.2:1 on cream, night body 7.5:1, primary CTA 9.1:1 / 7.4:1).
- Lighthouse on light and dark themes: 100 accessibility, 100 best practices, 100 SEO. Link/aria-target check: 0 problems.
- Post-review spacing: 24 px desktop card gutters, 8 px mobile category gap, and a 129 px tools-to-privacy break (was 161 px); verified at 1440 px and 390 px with no horizontal overflow.
- Initial JS 1.3 KB gzip, CSS 5.8 KB gzip. Next: Phase 3 worker engine and `json-formatter`.

## Phase 1 scaffold verification

- Installed Astro 7.4.4 (Vite 8), `@astrojs/sitemap` 3.7.4, Tailwind 4.3.3 via `@tailwindcss/vite`, `@astrojs/check` 0.9.12, TypeScript 6.0.3, pnpm 12.16.1.
- Static output with `trailingSlash: 'never'`; one catch-all route generates the five locale home pages.
- External stylesheets only (`build.inlineStylesheets: 'never'`) so the strict CSP works without inline-style exceptions.
- `public/_headers` includes `connect-src 'none'`, no-sniff, referrer, permissions, frame, and cache headers.
- Sitemap has five locale URLs, hreflang alternates, and `x-default`; `robots.txt` points to the sitemap index.
- Astro CLI telemetry disabled locally. The shipped site has no analytics or client JS.
- `pnpm astro check`: 0 errors, 0 warnings, 0 hints. `pnpm build`: 5 pages, 0 JS files, 0 inline style/script tags.
- Browser smoke test at preview: 200 responses, no console messages, only document + CSS requests; English and Spanish `lang`, `dir`, title, skip link, and H1 verified.
- Next: Phase 2 design system and layouts.

## Phase 0 verification

- `AGENTS.md` saved with the full master brief.
- No code, dependencies, or build pipeline exists yet, so `pnpm astro check` / `pnpm build` are not applicable in Phase 0.
- Next: Phase 1 scaffold after explicit approval.
