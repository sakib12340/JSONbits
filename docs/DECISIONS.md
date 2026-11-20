# Decisions — JSON Bits

Last updated: 2026-11-19
Status: Phase 10 complete. All 17 tools, six category hubs, five guides, and the privacy page are implemented in five locales; Tier 3 articles are English-first. Cloudflare Pages settings are documented below and awaiting deploy approval.

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

The Phase 2 shell was re-skinned from `D:\DESIGN.md`, a Zapier-inspired warm-professional language, then re-tuned against three DESIGN.md references: **supabase.com** (base system), **cal.com** (tool-page card layout), and **airtable.com** (long-form and signature-card sections). Source files: `Airtable DESIGN.md`, `Cal.com DESIGN.md`, `Supabase DESIGN.md` (opendesignmd.com, MIT).

| Decision | Value |
|---|---|
| Canvas | Warm cream `#FFFEFB`; soft cream `#F8F4F0` for content bands. No pure white. |
| Ink | Deep coffee `#1B1310`, body `#605D52`, secondary `#6B675C`. No pure black. |
| Accent | Deep teal `#2E4B46` on light, `#82B7AB` on dark; on-accent `#FBFAF7` / `#12211F`. One chromatic event per viewport. |
| Dark mode | Teal-tinted near-black canvas `#0A0F0E`, soft `#121715`, ink `#EDEFEC`. |
| Signature band | The privacy block is a **full-bleed** band, not a rounded card, using the same `--code-surface` as the hero artifact: `#141A18` light, `#192120` dark. No new hue is introduced, so the page still has one accent and one dark neutral. Text `#FBFAF7` / `#C3CDC8`, numerals in `#9FD3C6`. The footer stays light canvas. |
| Shape | 16 px tool frame; 12 px cards; 8 px buttons and menu triggers; 6 px inputs and menu rows; pill badges only. |
| Type | Self-hosted Inter variable (latin subset, 48 KB). Display 500 with −0.03em tracking, body 400, UI 14–16 px. No external font requests. |
| Section rhythm | 96 px vertical padding on desktop (`py-20 sm:py-24`); signature card 56–64 px internal padding. |
| Elevation | Hairlines at 14 % ink; `--shadow-1` on cards and menu popovers, `--shadow-2` on the hero code artifact. No gradients, no glass. |
| Code surface | Hero artifact and code blocks use `--code-surface` (`#141A18` light, `#121715` dark) with mint/amber/blue/lilac syntax tokens, all ≥8.7:1 on the surface. |
| Tool cards | Text only: tool name, description, and a text “Soon” badge. No icon glyphs, logos, or arrow icons on cards. Hover raises a 1 px shadow. |
| Contrast | Light `body-mid` darkened from the reference `#939084` to `#6B675C` so 14–16 px text clears 4.5:1 on both canvas and cream. Verified 16/16 token pairs AA in both themes. |

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
- Theme: `light | dark` only, defaulting to light. The site never reads `prefers-color-scheme`, so OS/browser theme changes cannot alter it. No-flash inline bootstrap; Tailwind dark variant bound to the theme attribute; `color-scheme` and `theme-color` follow the chosen theme.

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

## Formatter page feature audit

Checked against two competitor formatters (OpenReplay, jsonformatter.curiousconcept.com). Only features that belong to a *formatter* were accepted.

| Feature | Verdict | Reason |
|---|---|---|
| Find in editor (`Ctrl/⌘+F`) | **Added** | Searching the formatted output is a formatting-time need and no other page owns it. |
| Undo / redo | **Kept, keyboard only** | Rows added to the shortcuts dialog; no toolbar buttons — two icons for keys every user already knows is clutter. |
| Search options (all / match case / regexp) | **Added with the panel** | `by word` hidden: regexp covers whole-word, and the third toggle pushed the row onto a second line. |
| Tree / Table view toggle | **Rejected** | That is the `json-viewer` page. A formatter should stay a text formatter. |
| Filter / JSONPath box | **Rejected** | Belongs to `jsonpath-tester`. |
| JSON-spec dropdown (RFC 8259 / ECMA-404 / JSON5) | **Rejected** | Belongs to `json-validator`. |
| Extra indent presets + “Compact” button | **Rejected** | `json-minifier` owns compaction; the indent list stays 2 / 4 / Tab. |

- Search is `@codemirror/search` 6.7.2 with `search({ top: true })`, `highlightSelectionMatches()`, and `searchKeymap`; the toolbar find button targets the focused editor (output when it has focus, input otherwise).
- The panel follows the home search field: 1 px `--line` border that darkens to ink on focus (no 2 px ring, since the field is focused the moment the panel opens), 6 px radius, `--canvas` fill. The three checkboxes are 13 px custom squares (1 px `--line-strong`, filled with `--primary` when checked) instead of native OS boxes; keyboard focus still gets the global ring.
- The panel is laid out as a flex row: the search field absorbs the slack. CodeMirror's base theme makes the close button absolutely positioned, so the panel reserves 32 px on the right; under ~460 px the row wraps to two lines without overlapping.
- The replace row is hidden (`input[name=replace]` + replace buttons); read-only output editors never build it in the first place.
- Verified: `astro check` 0/0/0; open/close via button, `Ctrl+F` and `Esc`; Enter steps to the next match (the panel handles `keyCode 13`, not `key`); 1 and 9 highlighted matches; 44 px single-row panel at desktop width and 70 px two-row at 320 px; light and dark tokens both correct; editor chunk 108.9 KB gzip (was 102 KB) and still lazy.
- The tool header shows the primary shortcut (`Ctrl / ⌘ + Enter to run`) instead of repeating “Runs locally. Nothing is uploaded.”, which already appears in the footer tagline and in site copy. Key chips reuse the shortcuts-dialog style; the string is `tool.shortcutHint` and exists in all five locales.

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
- Light-mode hairlines read as missing: `--line` was 10% ink (1.23:1 on canvas) and card fill was only 1.03:1 against the page, so borders were the sole separator. Light `--line` raised to 20% and `--line-strong` to 36% (≈1.54:1); dark mode values unchanged.
- Root cause of the "Fedora light mode looks washed out" report: **monitor saturation set to 100 on the MSI MP251 OSD**, not the site, the browser, or Fedora. Lowering it restored the design. Ruled out along the way: `devicePixelRatio` 1, GNOME scale 1.0, no HDR/P3, `forced-colors` inactive, Night Light off, colord ICC profile present but **device `Enabled: No`** so it was never applied, `prefers-color-scheme: dark` while the site correctly stayed light. The user's own screenshots proved the hairline was one pixel of `#E8E7E3` on `#FFFEFB` in the framebuffer (1.22:1), i.e. genuinely faint before the token fix rather than altered by the display pipeline.
- No further light-palette darkening was applied: with the monitor corrected the current 20% hairline reads correctly, so the identity stays as designed.
- Deliberately deferred: page canonical/hreflang + article content (Phase 6); splitting `json-formatter/session.ts` (551), `workers/ops/format.ts` (412) and `scanner.ts` (357) under the 250-line guidance (Phase 9).
- Version control: `origin` is `https://github.com/sakib12340/JSONbits.git` (the earlier SSH remote could not authenticate on this machine, so the HTTPS remote plus `gh auth setup-git` is used); the local branch was grafted onto the existing backup commit rather than force-pushed. Commits use `sakib12340 <sadmansakib080212@gmail.com>`. `node_modules/`, `dist/`, and `.astro/` stay ignored.

## Phase 5 converter verification

- Six converter pages (`json-to-csv`, `csv-to-json`, `json-to-yaml`, `yaml-to-json`, `json-to-xml`, `xml-to-json`) share one `ConverterSession` + `ConverterShell`, with per-tool controls driven by `data-option`. Registry entries are now `ui: 'converter'`, `available: true`; total pages grew from 35 to 65.
- All dropdowns now use the same shared `OptionSelect` listbox as the formatter’s indent menu (custom trigger, 44 px rows, token-drawn popup); no native OS `<select>` popups remain on tool pages.
- Worker ops: `jsonToCsv`, `csvToJson`, `jsonToYaml`, `yamlToJson`, `jsonToXml`, `xmlToJson`. Each parser runs inside the worker only; `yaml`, `fast-xml-parser`, and `papaparse` stay behind dynamic `import()`.
- CSV writing is hand-written: CRLF line endings, RFC 4180 quoting (quotes doubled, fields with delimiter/newline quoted), dot-path flattening, arrays joined or serialized, optional header, optional spreadsheet-formula guard (`= + - @ \t \r` prefixed with `'`). `papaparse` is used only for parsing CSV; delimiter auto-detection is available for CSV input.
- JSON→XML maps `@key` entries to attributes only when “Read @ keys as attributes” is on, supports `#text`, validates element/attribute names, and wraps top-level arrays under `<item>`. XML→JSON keeps tag and attribute values as strings by design (e.g. `"12.50"`), because XML does not carry JSON types; attributes appear as `@name`. This is documented rather than inferred.
- YAML output uses `lineWidth: 0` so long strings are not wrapped. YAML input parses one document at a time and caps alias expansion at 100 (`toJS({ maxAliasCount: 100 })`). Library messages are trimmed to their first line so the error panel does not duplicate the source/caret block.
- Errors from JSON input reuse the tokenizer-based `parseJson` path, so line, column, hint, snippet, and Go-to-error work exactly as on Tier 1 pages. Converters report format-specific hints for YAML indentation/tabs/duplicate keys and for XML closing tags/attributes/entities.
- Outputs download with the correct MIME type and extension (`text/csv`, `application/yaml`, `application/xml`, JSON as `application/json`). Outputs over 4 MB are returned as a Blob instead of a cloned string.
- Verified in the browser: all six samples; semicolon delimiter with flatten/header off; XML root rename to `feed`; JSON trailing-comma error at line 1, column 10; XML mismatched closing tag at line 1, column 16; YAML tab/indentation error with cleaned message; drag-and-drop loading `people.json` and downloading `people.csv` with CRLF bytes; 390 px iframe with no horizontal overflow and stacked panes; light/dark layouts and 7.46:1 dark body contrast.
- `pnpm astro check`: 0 errors, 0 warnings, 2 deprecation hints from `fast-xml-parser` v5 (`XMLBuilder`/`XMLValidator`); `pnpm build`: 65 pages. The hints are advisory: v5 points to a separate `fast-xml-validator` package and the builder API remains the documented conversion path.
- Deliberately deferred: converter UI strings are English-only and fall back to English in other locales until Phase 7; the new i18n warning now reports per-locale missing-key counts instead of dumping every key.

## Phase 6 SEO and content verification

- Content collections: `tools` (12 articles), `guides` (5), and `hubs` (5), all English under `src/content/<collection>/en/`. Schemas enforce 140–155-character descriptions, exactly 3 steps, 4–6 FAQs, and a locale enum, so edited content cannot silently break the metadata range.
- Page count is 126: 5 locale homes, 60 tool pages, 25 category hubs, 5 `/learn` indexes, 25 guide pages, 5 `/privacy` pages, and `404.html`. Hubs are generated only for categories with at least one available tool, so `/generators` is not built yet.
- Every tool page has a unique article: 479–585 words of body, how-to steps, an input/output example, common mistakes, 4–6 FAQs, related tools, and a privacy note. Tool pages emit `WebApplication`, `FAQPage`, and `BreadcrumbList`; hubs emit `CollectionPage`, `FAQPage`, and `BreadcrumbList`; guides emit `TechArticle`, `BreadcrumbList`, and `FAQPage`.
- Metadata audit on all 12 tool pages: titles 49–54 characters, descriptions 140–151 characters, one canonical, six `hreflang` links including `x-default`. Home, `/learn`, `/privacy`, and all hubs are inside the same ranges; the 404 page is `noindex, follow` and emits no hreflang alternates.
- The sitemap contains 125 URLs (all pages except 404) with hreflang alternates. Home category headings now link to their hubs; the header links Tools and Guides; the footer links Tools, Guides, and Privacy; tool breadcrumbs link to the category hub, so no hub or guide is orphaned.
- Scripts are scoped per page type: the home search module loads only on home pages, the tool boot module only on tool pages, and content pages load only the theme/language shell.
- Hub and guide bodies share `.md-body` and `.faq-list` styles with tool articles instead of duplicating scoped CSS.
- English content is served under every locale URL with correct `lang`, `dir`, canonical, and hreflang until Phase 7. Hub headings and meta titles are still English strings in `src/lib/categories.ts`.
- `pnpm astro check`: 0 errors, 0 warnings, 2 pre-existing `fast-xml-parser` deprecation hints. `pnpm build`: 126 pages, sitemap created.

## Phase 7 localization verification

- UI dictionaries: 329 flat keys in each of `en`, `es`, `fr`, `de`, `pt`. Only 4–5 values per locale still equal English, and those are product names (JSON Bits, JSON Formatter). Two German tree strings used formal “Sie” among informal “du” copy and were rewritten (`tool.tree.valueTooLarge`, `tool.tree.valueMissing`).
- Tier 1 tool content now exists for all six tools in all four non-English locales: 24 articles. Spanish and French already had five and gained `json-repair`; German and Portuguese gained all six. Tool titles stay as product names; summaries, steps, examples, mistakes, FAQs, and body prose are translated.
- A temporary schema validator parsed every tool frontmatter with the project’s `yaml` dependency and checked the same limits as `src/content.config.ts`: description 140–155, summary ≥80, exactly 3 steps, 2–5 mistakes, 4–6 FAQs, plus ≥350 words of article text. All 36 tool articles (12 English + 24 localized) pass; the previously under-length `es/json-formatter` description is 151 characters.
- `pnpm astro check`: 0 errors, 0 warnings, 2 pre-existing `fast-xml-parser` hints. `pnpm build`: 126 pages.
- Built pages were checked directly, not assumed: all 30 Tier 1 tool pages (`6 tools × 5 locales`) emit the correct `<html lang>`, self-referencing canonical, five `hreflang` alternates plus `x-default`, the localized article body, and no text leaked from another locale. The sitemap still holds 125 URLs and now resolves localized `json-repair` pages.
- Deliberate scope boundary: Tier 2 tool articles, the five `/learn` guides, the five category hubs, and the hub headings in `src/lib/categories.ts` remain English fallback. Phase 7 is defined as UI strings plus Tier 1 content, so this is documented rather than silently mixed in.
- Translation quality: no native reviewer. Terminology follows the existing UI dictionaries (for example “Validieren”, “Minifizieren”, “Reparar”, “Réparer”, “Validar”); locale conventions are respected (Spanish informal “tú”, French formal “vous” and “Ctrl/Cmd+Entrée”, German informal “du”, Portuguese “você” imperatives).

## Phase 8 audit verification

- Lighthouse 13 (Chromium 156, locally served production build) on `/json-formatter`: mobile 100 performance / 100 accessibility / 100 best-practices / 100 SEO (FCP 0.9 s, LCP 0.9 s, TBT 70 ms, CLS 0, 192 KiB transfer); desktop preset also 100 across all four (LCP 0.3 s, TBT 0 ms). `/json-viewer` mobile: 100 accessibility / best-practices / SEO.
- axe-core 4.10.3 with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, and `best-practice` tags: zero violations in light **and** dark on home, `/json-formatter`, `/json-viewer`, `/json-diff`, `/json-to-csv`, `/converters`, `/learn`, `/learn/json-vs-yaml`, and `/privacy`.
- Fixed finding: `scrollable-region-focusable` on horizontally scrollable code (`.article-code`, markdown `pre`, hero artifact, error snippets). Every scrollable code surface now has `tabindex="0"`, error snippets included; `.md-body > pre` additionally wraps (`white-space: pre-wrap`, `overflow-wrap: anywhere`) so guides never need horizontal scroll.
- Touch and motion: `touch-action: manipulation` on buttons/links/summaries/role=button (verified computed as `manipulation`), diff filter buttons and tree rows measured at 44 px, `prefers-reduced-motion` block retained, shortcuts dialog gets `overscroll-behavior: contain`.
- Accessible names/announcements: indent listbox trigger exposes “Indent 2 spaces” (state plus label); diff and tree search counts announced via the polite status region; diff row copy buttons removed from tab order and AT tree, with Enter / `Ctrl+Shift+C` as the announced path.
- Keyboard verification (real key events where the harness delivered them, synthetic `KeyboardEvent` otherwise): skip link is the first stop, focus ring visible at every stop, `?` opens the shortcuts dialog with focus inside and Esc restores the trigger, listbox Up/Down/Home/End/Enter/Escape/Tab all move selection and persist `jsonbits:indent`, tree `aria-activedescendant` navigation covers Right/Down/End/Home/Enter/Left, diff list Down/End/Home keeps one selected row.
- Large-file stress test (synthetic JSON, files dropped through the real drop handler): 10 MB format 474 ms and 52.4 MB → 75.4 MB output in 2,201 ms; 10 MB tree 534 ms and 50 MB tree 2,193 ms with a 143 MB JS heap. No app-attributable long tasks in the format runs (max frame gap 19–25 ms); the tree keeps 23 rendered rows for 45k+ children. The over-50 MB warning renders before running.
- Known harness limits rather than app defects: the single 821 ms main-thread task after a 50 MB drop comes from `DataTransfer`/File construction in the test harness, not the app; Chrome's synthetic key delivery was unreliable, so interaction checks also used dispatched events.
- `pnpm astro check`: 0 errors, 0 warnings, 2 pre-existing `fast-xml-parser` hints. `pnpm build`: 126 pages. No third-party runtime requests; only the local axe script was added temporarily to `dist/` for testing and removed afterwards.

## Phase 9 architecture review

- Reviewed the codebase against the brief and produced seven candidates; only candidate 1 was approved, so the other six remain proposals and were not applied.
- `RunController` (`src/workers/run-controller.ts`) is now the single run lifecycle for every tool: worker call, main-thread fallback, request identity, debounce, cancellation, progress filtering, and typed failures. Sessions keep their public methods (`cancelActive`, `stopDebounce`, `scheduleLive`) as thin delegates, so UI code did not change.
- `src/workers/local-ops.ts` is the one op-to-local-function table; the five hand-written fallback copies were deleted. `src/workers/text.ts` owns payload decoding and size, and `src/tools/shared/failure.ts` is the single failure-to-JsonError presenter.
- Staleness is cancel-based: `run()`/`runFile()` share the current token and only `cancel()` advances it. Sessions call `cancelActive()` before starting a run, so "latest wins" holds while concurrent viewer fetches can coexist. Stale progress is filtered inside the controller.
- Stateful tree rule: a new `tree` load clears local tree state and tries the worker first; once a local tree exists, `treeChildren`/`treeSearch`/`treeValue` answer from it so row paths stay consistent. Local fallback stays capped by `FALLBACK_LIMIT` and `MAX_FILE`.
- Removed `json-formatter/engine.ts` and the duplicated `execute`/`decode`/`normalize`/`runId`/`liveTimer` code across formatter, validator, viewer, diff, minifier/repair, and converters; `fallbackConvert` is gone. Net change across sessions: -504 lines.
- Added Vitest 5.1.0 (`pnpm test`) with 21 tests: controller fallback, size caps, error kinds, cancel/staleness, progress filtering, scheduling, file reads, local tree persistence, number-safe format/minify, validation positions, CSV/YAML/XML converters, and structural diff.
- `pnpm test`: 2 files, 21 tests pass. `pnpm astro check`: 0 errors, 0 warnings, 2 pre-existing `fast-xml-parser` hints. `pnpm build`: 126 pages, sitemap created. Built pages for all five migrated Tier 1 tools plus `json-to-csv`/`csv-to-json` return 200 from a local static server.
- Browser pass (in-app Chromium against the production preview): formatter live formatting, valid output preserving `9007199254740993` and `1.23456789012345678`, and a trailing-comma error at line 3 column 1 with a hint; validator valid/invalid verdicts; minifier kept `1.5000`; repair applied 8 fixes; viewer expanded by keyboard and found one search match; diff reported 4 changes (1 added, 3 changed); JSON→CSV, CSV→JSON (quoted comma), JSON→YAML, and XML→JSON all produced correct output.
- Large-input browser check: 1.58 MB pasted JSON formatted in 160 ms; a 4.48 MB dropped file took the large-file path (read-only input, “Press Format to run”), formatted in 301 ms into a 9.59 MB download panel. No console errors on any tested page, every request was same-origin, the hashed worker asset loaded, and `localStorage`/`sessionStorage` stayed empty.
- Harness limit: the `files.drop` browser RPC failed with `UnknownVizError`, so the drop was simulated in-page with a real `File` and `DragEvent`; this still exercised `File.arrayBuffer()`, the worker transfer, and the large-file branch. Browser interaction evidence beyond that is otherwise direct.

## Phase 10 Tier 3 tools and deployment

- Shipped the five remaining Tier 3 tools through the registry and one-op-per-tool worker pattern: `json-sorter` (format), `json-escape-unescape` (convert), `jsonpath-tester` (view), `json-to-typescript` (generate), and `json-schema-validator` (validate). All five are `available: true`, appear on the home grid, category hubs, related links, sitemap, hreflang sets, and JSON-LD.
- Added `PaneShell.astro` for the four single-editor tools and `SchemaShell.astro` for the schema/document pair. Both reuse the existing editor, toolbar, shortcuts, dropzone, handoff, download, theme, and mobile-tab primitives through `PaneSession` and `SchemaSession`; no third editor shell was introduced.
- Sorter sorts keys at every depth or only the top level, ascending or descending, and preserves number token text (the sample keeps `9007199254740993`). Escape/unescape applies JSON string rules with optional ASCII escaping, switches the primary action and status labels with the mode, and treats input as text. JSONPath supports root, dot/bracket keys, indexes including negative, wildcards, recursive descent, slices, unions, filters with comparisons/existence/not/`&&`/`||`, and reports expression errors under the query field. TypeScript generation handles root objects, arrays, primitives, merged item types, optional fields, unions, quoted keys, and readonly output.
- JSON Schema validation is explicit (Run / Ctrl+Enter) and implements boolean schemas, local `$ref`, `type`, `enum`, `const`, `properties`, `required`, `additionalProperties`, property counts, `items` (single and tuple), item counts, `uniqueItems`, string length/`pattern`, numeric bounds, `exclusiveMinimum`/`exclusiveMaximum`/`multipleOf`, `allOf`, `anyOf`, `oneOf`, and `not`. It reports unsupported keywords separately instead of pretending to enforce them: `format`, `patternProperties`, `if`/`then`/`else`, `contains`, `dependentRequired`, and `propertyNames`; an external `$ref` is a schema error.
- Size tiers match the rest of the site: live runs under 1 MB, explicit Run/Sort/Generate/Query above it, the large-file panel above 4 MB, a warning above 50 MB, and a friendly stop above 100 MB. JSONPath requests 2,000 matches and caps displayed values at 20,000 characters and output near 2 MB, with `total`/`truncated` kept honest.
- UI strings were added to all five locale files (425 keys each, no missing keys). The five English Tier 3 articles, the new `generators` hub, and the schema keyword list are English-first; localized routes fall back to English article content with correct `lang`, canonical, and hreflang.
- `pnpm astro check`: 0 errors, 0 warnings, 2 pre-existing `fast-xml-parser` deprecation hints. `pnpm test`: 4 files, 38 tests pass. `pnpm build`: 156 pages, sitemap with 155 URLs.
- Browser verification: sorter sample sorted 5 keys and preserved the 64-bit integer in both directions; a 1.81 MB file took the explicit-run path and sorted in 215 ms; a 4.98 MB file used the large-file panel and sorted in 1,067 ms; escape/unescape switched labels and produced correct text, including the 1.2 MB “Press Unescape to run” prompt; JSONPath returned one filtered match with a path and reported a bad filter under the field; TypeScript generated `Root` and then `User` with readonly fields; schema validation showed 2 errors for the sample, a valid verdict plus `format` on the unsupported list, and a trailing-comma parse error at line 3; German labels, hreflang, and dark theme were checked on `/de/json-sorter`; the home page linked all five tools.
- No console errors on any tested Tier 3 page. The schema page loaded only same-origin documents, modules, CSS, and the self-hosted font (plus the Vite HMR socket in dev); there were no third-party origins.
- At a 390×844 viewport, the sorter's panes stacked, the tab bar measured 45 px with 44 px controls, switching to Output changed the visible pane, and the page had no horizontal overflow.

## Deployment — Cloudflare Pages

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Root directory | `/` (leave blank) |
| Production branch | `main` |
| `NODE_VERSION` | `22.23.4` — the current Pages v3 default and the floor in `package.json` `engines` |
| `PNPM_VERSION` | `12.16.1` — matches `packageManager` |
| Secrets / site env vars | none; no analytics, API keys, or server runtime |

- Pin both versions in the Pages environment. The v3 build image does not infer pnpm from the lockfile or Node from `engines`, so leaving them unset can silently select a different toolchain.
- `public/_headers` ships as-is and provides the strict CSP (`connect-src 'none'`), nosniff, referrer policy, permissions policy, frame denial, COOP/CORP, revalidated HTML, and immutable `/_astro/*` and `/fonts/*` caching.
- Custom domain: add `jsonbits.com` under Pages → Custom domains, let Cloudflare create the apex record (CNAME flattening), then add `www` and redirect it to the apex with a Redirect Rule. Keep one canonical host; canonical, Open Graph, sitemap, and `site` already point to `https://jsonbits.com`.
- SSL/TLS: Full (strict), Always Use HTTPS on. HSTS is optional and only after every subdomain is confirmed HTTPS. Do not enable Rocket Loader or Cloudflare Web Analytics; both add scripts or requests and contradict the privacy claim.
- Post-deploy checklist: `curl -I` a tool route and confirm 200 plus the CSP header; load `/`, all 17 tool routes, six hubs, five guides, `/privacy`, `/robots.txt`, and `/sitemap-index.xml`; check canonical/hreflang in page source; confirm the custom 404; open DevTools → Network, load a tool, run a sample, and confirm zero requests after the initial assets; paste a 10 MB document and confirm no upload; download a result and reopen the file locally; spot-check mobile stacking, theme persistence, and one non-English route. Submit the sitemap to Google Search Console and Bing Webmaster Tools after the first successful production deploy.

## Theme independence (supersedes the Phase 2 three-state theme)

The operating system and browser must not change how the site looks; the site owns its appearance.

- Theme is now `light | dark`, default **light**, persisted in `localStorage('theme')`. The `system` state, its icon, its label in all five locales, and the `matchMedia` listener were removed.
- No `prefers-color-scheme` query remains in `src/` or the built CSS. A stale stored value of `system` falls back to light instead of erroring.
- `color-scheme` is set only by CSS per theme (`light` / `dark`), so native scrollbars and form controls match the site rather than the OS. `<meta name="color-scheme">` is `light`.
- `theme-color` is a single dynamic meta updated by the bootstrap and the toggle (`#fffefb` / `#0a0f0e`); the OS-based `media` variants were removed so mobile browser chrome follows the site theme.
- `<html data-theme="light" data-theme-mode="light">` is emitted statically, so the page is light even before the bootstrap runs.
- `@media (forced-colors: active)` maps `--line`, `--line-strong`, and `--focus-ring` to system colors, so Windows High Contrast keeps borders and focus visible.
- Verified with the host OS reporting `prefers-color-scheme: dark` while the site rendered light (`data-theme=light`, `color-scheme: light`, theme-color `#fffefb`, toggle labelled “Light”).
- The inline bootstrap changed, so the CSP `sha256` in `public/_headers` was recomputed and matches `dist/_headers` (`sha256-CtQmZyoMJ13kQnOdERJ7npj7WO9CaNmDLCSuzqixowU=`).

## Fullscreen on every tool page

- The toolbar fullscreen control that shipped on JSON Viewer is now enabled on every implemented tool page: formatter, validator, minifier, repair, viewer, diff, and all six converters.
- `src/lib/fullscreen.ts` owns request/exit, `fullscreenchange` state sync, `aria-pressed`, label and title swaps, enter/exit icon swaps, and the failure callback. Each session calls it once in `start()` and releases the listeners in `dispose()`; the viewer's private copy was deleted.
- `fullscreen`, `exitFullscreen`, and `fullscreenFailed` moved into the shared client strings (`BaseStrings` / `commonToolStrings`) so every shell serializes them; all five locale strings already existed.
- Fullscreen layout covers every shell family: two-pane tools and the viewer keep `.tool-panes`/`.tool-pane`, diff uses `.diff-panes`/`.diff-pane` with two equal grid rows and a flexible change list, and the validator's single editor fills the height while its verdict is capped at 40vh with internal scrolling.
- `pnpm test`: 21/21. `pnpm astro check`: 0 errors, 0 warnings, 2 pre-existing `fast-xml-parser` hints. `pnpm build`: 126 pages.
- Browser pass: all 12 implemented tool pages expose a visible toolbar fullscreen button with the enter icon and no console errors. A synthetic `fullscreenchange` swapped the label to “Exit fullscreen”, set `aria-pressed="true"`, and toggled the icons; a rejected request announced “Fullscreen is not available in this browser.” in both the status bar and the polite live region; Spanish, French, German, and Portuguese pages showed localized labels.
- The automation window releases native fullscreen immediately after entry, so layout was verified by replaying the shipped `:fullscreen` rules under a test class: formatter/viewer frame 898 px tall with 788 px panes and 742 px editors, diff rows 364 px each with a 303 px editor and 302 px change list, validator editor 709 px with the 40vh result cap. Formatter, viewer, diff, validator, and converter sample runs still pass after the session refactor.

## Home category link underline

- The category headings on the home page ("Format →", "Validate →", …) used `hover:underline` on an `inline-flex` with a gap, so the browser painted two separate underlines: one under the word, a short stub under the arrow. That stub read as a cut-off line.
- Replaced the text decoration with a single 1 px `::after` bar that spans the link's full width, so name and arrow share one continuous line. It reveals on `hover` and `focus-visible` (scale-x from the inline start, 200 ms, disabled under `prefers-reduced-motion`) and the arrow nudges 2 px.
- `pnpm test` 21/21, `pnpm astro check` 0 errors, `pnpm build` 126 pages. Verified in the browser on all five locales: the bar width equals the link width (arrow sits flush with the right edge), is hidden at rest, and both hover and focus-visible rules ship in `dist`.

## Client-side feature audit and Batch 1

Audited all 12 shipped tool pages against the jsonformatter.org feature list. Rejected load-from-URL, saved/share links, and last-document storage because they contradict the `connect-src 'none'` privacy claim; rejected print, 3-space indent, and table/graph views as bloat.

Accepted four small fixes that close a real dead end without adding new UI surface:

1. **Fix automatically** in the error panel. `src/tools/shared/in-place-repair.ts` runs the existing `repair` worker op on the current text, the panel button replaces the input with the repaired document, and the tool re-runs. Wired in the formatter, validator, minifier, and JSON-source converters (`jsonToCsv`, `jsonToYaml`, `jsonToXml`). `canRepair` is decided per shell: always for the formatter, `minify` for the minifier, `from === 'json'` for converters, never for JSON Repair, the viewer, or diff. "Go to error" becomes the secondary action when the fix button is present.
2. **Error-line marker.** `EditorHandle.markError(line | null)` paints one `.cm-errorLine` line decoration (tinted fill plus a 2 px danger bar) from a `StateField`, using new `--editor-error` tokens for both themes. The dispatch is queued in a microtask because sessions call it from the editor's own update listener. The marker clears on a clean result, dismiss, clear, and the next edit.
3. **Expand all** in the viewer's tree menu. Reuses the existing breadth-first `expandToDepth` with an `Infinity` depth and a 1200-node budget so a huge document stops early instead of freezing; two new status strings report full or partial expansion.
4. **Converter indent is remembered.** `jsonToYaml`, `yamlToJson`, `jsonToXml`, and `xmlToJson` initialize their indent menu from `jsonbits:indent` and write back on change. A saved `tab` falls back to 2 spaces on the XML tool, whose menu only offers 2 and 4.

- New strings: `tool.errorFix`, `tool.tree.expandAll`, `tool.tree.expandedAll`, `tool.tree.expandedAllPartial`, plus `repairing` / `repairDone` in the shared editor strings, in all five locales.
- `pnpm test` 21/21, `pnpm astro check` 0 errors (2 pre-existing `fast-xml-parser` hints), `pnpm build` 126 pages.
- Browser pass: formatter/validator/minifier/json-to-csv show a hidden-free “Fix automatically” with the error line painted, and one click repairs the document and produces output (`{ "a": 1, "b": [1, 2] }` from trailing-comma input, panel closes). An unrepairable `{{{{` keeps the panel open with the new error and the button re-enabled. Editing to valid JSON clears the marker; typing keeps it while the document stays invalid. Expand all took the sample tree from 1 to 21 rows with “Expanded the whole tree.”; picking 4-space indent on json-to-yaml wrote `jsonbits:indent=4` and json-to-xml restored 4 on the next page. No console errors in any of the runs.
- Deferred to a possible Batch 2 (not built): “Send to…” handoff between tools, and diff swap-sides plus copy/download of the change list.

## Batch 2: cross-tool handoff and diff actions

The two gaps deferred from the audit are now built. Both stay inside the browser: the handoff uses the tab's `sessionStorage`, and the diff additions copy or download text that the page already had.

**“Send to…”**

- `src/lib/handoff.ts` owns the handoff. `writeHandoff` stores `{ slug, text }` under `jsonbits:handoff` in `sessionStorage` (capped at 1,000,000 characters, so a huge document reports “too large” instead of filling the quota). `takeHandoff` reads it once and deletes it, and only returns the text when the slug matches the tool that was asked for.
- `src/components/tool/SendMenu.astro` renders the control: a quiet “Send to” button in the pane header that holds the JSON, opening a popover with the other tools. Targets come from the registry (`acceptsJsonInput`), so no tool list is hardcoded; the current tool is left out, and the three converters that read CSV, YAML, or XML are never targets.
- The button sits next to the JSON it carries: input side for the formatter, validator, minifier, viewer, diff (left document) and the JSON-source converters; output side for JSON Repair and the three converters that produce JSON. An empty document reports “There is no JSON to send yet.”, and the handoff keeps the current locale in the target URL.
- The menu closes on Escape and on an outside click, and the panel is the same shared `.menu-panel` / `.menu-item` styling the tree options menu uses, so there is only one menu style in the site.

**Diff**

- “Swap sides” exchanges the two documents (with their file names) and re-runs the comparison, so “added” and “removed” can be read the other way round.
- “Copy list” copies the changes that are on screen as plain text (`+ path: value`, `- path: value`, `~ path: old → new`), and “Download” saves the same changes as `changes.json` with `path`, `type`, `old`, and `new`. Both follow the active filter and stay disabled while there is nothing to copy.

- New strings: `tool.send.label`, `tool.send.heading`, `tool.send.empty`, `tool.send.tooLarge`, `tool.diff.swap`, `tool.diff.copyList`, `tool.diff.downloadList`, in all five locales.
- The privacy page now says plainly that the handoff puts the document in `sessionStorage`, is read once, and is deleted immediately; the previous “never written to storage” sentence carried an exception.
- `pnpm test` 21/21, `pnpm astro check` 0 errors (2 pre-existing `fast-xml-parser` hints), `pnpm build` 126 pages.
- Browser pass: all 12 tool pages show one send menu (8 targets on the JSON-source tools, 9 on the three converters that produce JSON) with no console errors. Formatter → JSON Viewer carried `{"team":"jsonbits","tags":[1,2,3]}` into the tree (“Tree built in 0.8 ms”); viewer → formatter, JSON Repair → validator (repaired `{"a": 1}` validated as valid), and diff → formatter all landed with the document in place and the handoff cleared. The diff sample pair reported two changes; swapping the sides kept two changes with the values reversed; “Download” produced the expected JSON array and “Copy list” announced “Copied”. Escape and an outside click both close the menu. The menu panel paints above the editor (`elementFromPoint` returns the menu item) and the German page shows “Seiten tauschen” and “Liste kopieren”.
- The SendMenu script ships as an external module, so the strict CSP still holds; the only inline script on a page is the theme bootstrap.

## Aligned pane headers

The two-pane tools showed their divider lines at different heights: the pane that carries the “Send to” button had a 49 px header while its neighbour had 46 px, so the underline under “INPUT” and the underline under “OUTPUT” never met. The cause was the header height following its content, and the new popover button being 3 px taller than the label beside it.

- Pane headers now use one shared class, `.pane-head`, with a fixed height (48 px, 60 px on coarse pointers where the controls are 44 px) instead of a minimum height. Every pane header of every shell uses it, so the input, output, tree, left, and right headers always end on the same line, whatever control sits inside them.
- The “Send to” button shrank to an icon-only control below the `sm` breakpoint so a long file name and the button still fit a narrow pane; the desktop button keeps its label. The popover is absolutely positioned, so the fixed height never clips it.
- The diff change-list header stays auto-height on purpose: it holds the filter row and the copy and download buttons, which need to wrap on narrow screens, and it sits in its own row below the two editors.
- `pnpm test` 21/21, `pnpm astro check` 0 errors (2 pre-existing `fast-xml-parser` hints), `pnpm build` 126 pages.
- Browser pass on the production build: all eleven two-pane pages report 48 px headers and identical bottom edges for the panes that share a row, in light and dark theme, and the editors below them start on the same pixel. The formatter still formats, the validator still paints the error line and repairs it, the diff still compares and swaps sides, and the viewer still builds its tree, all without console errors.
- Note for the next session: the browser used for checks intermittently answers 502 for a batch of parallel module requests, which leaves the CodeMirror editor unmounted. It is not a code fault — the same files answer 200 to a single request — so a page that shows only the skeleton needs one reload before it is judged.

## One hover language for bordered boxes

The “Related tools” rows at the bottom of a tool page jumped from a 14 % hairline straight to a solid ink border on hover. On a light theme that reads as a black outline, and in the dark theme `--ink` is nearly white, so the border flashed bright — heavier than anything else on the site.

- The site actually had two hover intensities for the same kind of element: the cards on the home, hub, and learn pages used `hover:border-line-strong` plus `--shadow-1` (hairline 0.14 → 0.28 alpha and a 1 px soft shadow), while the related rows and the hub pills used `hover:border-ink` (hairline → solid near-black).
- Both now use the card treatment: `transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-[var(--shadow-1)]`. The transition keeps the change calm instead of snapping.
- `hover:border-ink` is now used nowhere on the site. The remaining hover vocabulary is: cream fill for quiet controls, `--line-strong` plus `--shadow-1` for bordered boxes, underline for links in prose, and the primary colour for the main action.
- The 404 card keeps the border step without the shadow, because it has no card shape to lift.
- `pnpm astro check` 0 errors, `pnpm test` 21/21, `pnpm build` 126 pages. In the built CSS `hover:border-ink` no longer appears, and the related rows, the hub pills, and the home, hub, and learn cards carry the identical hover signature.

## One search field language

The tree search field on the JSON Viewer page was the only field on the site with two focus signals at once: `focus:border-ink` painted a solid near-black hairline and the global `:focus-visible` rule painted the teal ring around it, so a small 32 px field ended up ringed in two heavy colours. It also had no hover state at all, which made the jump from idle to focused look sudden.

- All three search inputs now behave the same: the home field, the viewer's tree search, and the CodeMirror find panel. At rest the border is the `--line` hairline, on hover it steps to `--line-strong`, and on focus it stays at `--line-strong` while the site's standard teal focus ring does the signalling. The solid ink border is gone from every search field.
- The home field and the tree field dropped `focus:outline-none`, so they now use the same focus ring as every other control instead of a second, heavier indicator. The find panel input lost the `outline: none` rule in the editor theme for the same reason.
- The border change is animated (150 ms on the page fields, 120 ms in the editor theme) so the step reads as a soft lift, like the cards.
- `pnpm astro check` 0 errors, `pnpm test` 21/21, `pnpm build` 126 pages. The built CSS carries `hover:border-line-strong` and `focus:border-line-strong` for the page fields, and the built editor chunk carries the matching rules for the find panel. Behaviour checks on the production build: the home field still filters (17 tools down to 2 for "yaml"), the tree search still filters (1 match), the find panel still opens with a hairline border at rest, and no console errors.

## One surface for code blocks in both themes

The example blocks on tool pages disappeared into the page in the dark theme. Their surface came from `--code-surface`, which was `#121715` in dark mode against a `#0a0f0e` canvas — a difference too small to read at block size. Light mode looked fine because the same block sat on white.

- Both themes now use one code surface, `#1c2623`. There is no outer border: a first attempt used a 16 % white hairline, but at 1 px around a dark block it read as a glow, so the border was removed and the surface carries the shape alone.
- The horizontal scrollbar was painting square into the rounded bottom corners. Scrolling now lives on the inner `<pre>` inside a wrapper that owns the 10 px radius, background, and `overflow: hidden`, so the scrollbar is clipped by the curve. The scrollbar is thin with a transparent track, a muted rounded thumb, and no arrow buttons. The `pre` keeps its `tabindex` and draws an inset code-accent focus ring, because the wrapper would clip the default outline.
- `--code-line` returned to 14 % in light and 12 % in dark for the home hero's internal dividers. No code block uses it as an outer border now.
- Guide blocks (Shiki `github-dark`) keep their own `#24292e` background without the extra border; the home hero code card uses the same `#1c2623` surface.
- `pnpm astro check` 0 errors, `pnpm test` 24/24, `pnpm build` 126 pages. Computed styles in both themes: tool block `rgb(28, 38, 35)`, 0 px border, 10 px radius; guide pre `rgb(36, 41, 46)` with 0 px border; hero card `rgb(28, 38, 35)` with 0 px border. Light and dark screenshots show no outline glow, and the keyboard focus ring measures 2 px `#9fd3c6` inset when the example is tabbed to.

## Popovers stay inside their frame

On the JSON Diff page the "Send to…" panel was cut off on the left. The shared `.menu-panel` rule pinned every menu to the trigger's inline-end edge, so a button near the left of the left pane grew a 208 px panel leftwards, straight through the tool frame's `overflow: hidden`. Measured before the fix: frame `[89, 1193]`, panel `[53, 261]` — 36 px clipped.

- Added `src/lib/popover.ts`. `positionPopover(trigger, panel)` finds the nearest clipping ancestor (usually `[data-tool-frame]`, otherwise the viewport with an 8 px gutter), compares the room on both inline sides, flips with logical `inset-inline-*` properties (so RTL works), and clamps the panel width when neither side fits. `chooseAlignment()` is pure and unit-tested.
- When both sides fit, the stylesheet default wins, so the viewer's tree menu, the language switcher and the indent select keep their existing position on wide screens. Only the diff menu changes side there.
- Wired into all four popover kinds: send menu, tree options menu, indent select list, and language switcher. Each repositions on open and on window resize while open.
- `.menu-panel` also gets `max-width: calc(100vw - 2rem)` and `max-height: min(60vh, 360px)` with its own scroll, so a tall coarse-pointer menu (44 px rows) cannot spill out of a short mobile frame.
- `pnpm astro check` 0 errors, `pnpm test` 24/24 (3 new alignment cases), `pnpm build` 126 pages. Browser checks: diff panel now `[179, 387]` inside frame `[89, 1193]` with 0 px clipped; with a forced 240 px frame it flips and clamps to 149 px with 0 px clipped; with the page reflowed to 360 px it opens start-aligned at `[114, 322]` inside frame `[24, 336]`. Viewer tree menu, formatter indent select and language switcher all stay in bounds, Escape closes and returns focus, a 44 px-row menu becomes scrollable inside the frame, simulated RTL stays in bounds, and no console errors.

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
- The indent control is a custom listbox (`src/lib/select-menu.ts`), not a native `<select>`. Native select popups are drawn by the OS/GTK: square corners, white sheet, blue row highlight, and a heavy focus ring around the popup, which clashed with the capsule trigger. The replacement uses `--canvas`/`--line`/`--cream`/`--shadow-pop` — superseded below — 12 px popup radius, 6 px rows with a check on the selected row only, 44 px row height, and full listbox keyboard support (Up/Down/Home/End/Enter/Space/Escape/Tab, `aria-activedescendant`, outside-click dismiss).
- The site is shadowless by decision. `--shadow-pop` was removed from both palettes and all four call sites (indent menu, language menu, shortcuts dialog, skip link); separation comes from a 1px `--line` border plus the dialog's `::backdrop` dim. The only `box-shadow` left is the mobile tab bar's `inset 0 -2px 0 var(--primary)` underline, which is a rule, not elevation.
- Tailwind preflight zeroes `margin`, which broke native `<dialog>` centering; the shortcuts dialog carries `m-auto` to restore it.
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
