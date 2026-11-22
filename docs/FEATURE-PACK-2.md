# Feature Pack 2 — Recon & Reuse Plan

## Reuse (do not duplicate)
- Registry + routing: `src/tools/registry.ts`, `src/tools/types.ts`, `src/pages/[...slug].astro` (add entries only).
- Worker: `src/workers/json.worker.ts` (router), `src/workers/protocol.ts` (OpMap), `src/workers/client.ts`, `src/workers/run-controller.ts`, `src/workers/local-ops.ts`, `src/workers/text.ts`.
- Stateful sessions: `src/tools/shared/pane-session.ts` (JSONPath), `src/tools/shared/output-tool.ts` (repair), `src/tools/shared/mount-*.ts`.
- Inference AST: `src/workers/ops/ast.ts` (`parseAst`, `serializeNode`, `formatPath`) reused for JSON Schema + Zod + JWT? JWT is new parse.
- Repair: `src/workers/ops/repair.ts` (counts); keep `attempt.fixes`; add per-fix positions + text diff op.
- CSV/YAML/XML converters: `src/workers/ops/convert/*`, `src/tools/shared/converter-session.ts`, `converter-config.ts`.
- Handoff: `src/lib/handoff.ts` (`writeHandoff`/`takeHandoff`/`toolUrl`/`setupSend`).
- UI shells: `ToolLayout.astro`, `PaneShell.astro`, `EditorToolShell.astro`, `ValidatorShell.astro`, `SchemaShell.astro`, components in `src/components/tool/*`.
- Content: `src/content.config.ts` schemas; `src/lib/content.ts`; guides under `src/content/guides/en`.
- i18n: `src/i18n/t.ts`, locale JSON files; fallback logic already in `[...slug].astro`.
- a11y/focus: `src/lib/a11y.ts`, `src/lib/popover.ts`, `src/lib/select-menu.ts`, `src/lib/fullscreen.ts`.
- Theme: `src/lib/theme.ts`, bootstrap in `BaseLayout.astro`.
- Editor: `src/lib/editor.ts` (lazy CM6).

## New modules to add
- `src/workers/ops/textdiff.ts` (line/word text diff for repair review).
- `src/workers/ops/jwt.ts`, `src/workers/ops/schema-infer.ts`, `src/workers/ops/zod.ts`, `src/workers/ops/ndjson.ts`.
- `src/lib/command-palette.ts` + `src/components/layout/CommandPalette.astro`.
- New tool UIs: `jwt-decoder`, `json-to-json-schema`, `json-to-zod`, `ndjson-*` (4), `jwt` view.
- Guides: 6 markdown under `src/content/guides/en/`.
- Tests: vitest per new op.

## Notes
- Repair fix positions require enhancing repair.ts to track per-fix line/col/before/after; keep aggregate counts for backward compat.
- NDJSON streams from transferred ArrayBuffer in chunks; reuse `text.ts` decode + progress.
- JWT base64url decode hand-written; no new deps.
- Command palette index embedded at build time; no fetch.