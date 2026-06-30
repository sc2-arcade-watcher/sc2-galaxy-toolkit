# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

StarCraft II modding developer toolkit: language servers for Galaxy Script (`.galaxy`) and SC2Layout (`.SC2Layout`) XML, plus a VS Code extension. The monorepo was recently restructured from 3 monolithic packages into a layered architecture.

## Commands

```bash
pnpm -r run build          # Build all packages (tsc composite project refs)
pnpm -r run test           # Run all tests
pnpm --filter <pkg> run build   # Build one package
pnpm --filter sc2-lsp exec mocha --config .mocharc.json   # Run Galaxy LSP tests (161 tests)
pnpm --filter sc2-layout-lang exec mocha                   # Run SC2Layout tests (43 tests)
pnpm --filter plaxtony run lint                            # Lint (only package with eslint)
```

Run a single test file:
```bash
pnpm --filter sc2-lsp exec mocha --config .mocharc.json --spec 'lib/tests/compiler.js'
```

Tests run against compiled output in `lib/` — always build before testing. Test timeout is 0 (unlimited) for sc2-lsp/plaxtony, 20s for sc2-layout-lang.

## Architecture

```
sc2-xml              Pure XML parser (no SC2 knowledge)
  └─▶ sc2-layout-lang   SC2Layout XML language server

sc2-mod              Archive system, workspace model, dependency resolution
  ├─▶ sc2-trigger       Trigger data model + XML parsing
  ├─▶ sc2-data          Game data catalog parsing, S2DataCatalogDomain enum
  ├─▶ sc2-text          Localization / GameStrings.txt parsing
  └─▶ sc2-galaxy-lang   Galaxy Script compiler (parser → binder → type checker)

sc2-lsp              Unified LSP server (Galaxy service layer, config loader)
  └─▶ vscode-sc2-galaxy  VS Code extension (spawns sc2-lsp via stdio)

sc2-layout-schema    Schema XML data files (no TypeScript, no build)
plaxtony             Legacy wrapper (thin re-exports, being phased out)
```

**sc2-lsp** is the main server package. It contains:
- `src/galaxy/server.ts` — Galaxy LSP server (750 lines, handles all protocol wiring)
- `src/galaxy/store.ts` — Document manager, parser/binder orchestration
- `src/galaxy/workspace.ts` — Extended SC2Workspace with typed component properties
- `src/galaxy/s2meta.ts` — Bridges trigger metadata to Galaxy symbols
- `src/galaxy/providers/` — LSP providers (completions, diagnostics, hover, etc.)
- `src/config/` — `sc2project.json` config types and upward-search loader

**sc2-galaxy-lang** is a pure compiler with no LSP dependency:
- `types.ts` — All AST types, Symbol, ITypeCheckerHost interface
- `scanner.ts` → `parser.ts` → `binder.ts` → `checker.ts` pipeline
- TypeChecker takes `ITypeCheckerHost` interface, not a concrete Store

**sc2-mod** is the foundation for SC2 archive handling:
- `SC2Archive` — Single archive directory abstraction
- `SC2Workspace` — Pluggable component registry (`registerComponent`/`getComponent`)
- Archive discovery: `findSC2ArchiveDirectories`, dependency resolution chain

## Key Patterns

- **ESM throughout**: All packages use `"type": "module"` with `moduleResolution: "nodenext"`. Use `.js` extensions on all relative imports.
- **Composite builds**: `tsc` with project references. Output to `lib/`. The root `tsconfig.json` references all packages.
- **`const enum` caveat**: Can't re-export across package boundaries. Use regular `enum` for cross-package types (see `S2DataCatalogDomain`).
- **`experimentalDecorators`**: Used in sc2-mod (logger `@logIt()`), sc2-lsp, sc2-trigger, sc2-data, sc2-text, plaxtony.
- **`strictNullChecks: false`** globally — the codebase predates strict null checks.
- **Logger**: `import { logger, logIt } from 'sc2-mod'` — winston-based, level from `SC2MOD_LOG_LEVEL` or `PLAXTONY_LOG_LEVEL` env var.

## Important Files

- `packages/sc2-xml/src/parser.ts` — XML parser with `ParserHooks<L>` extension point (`onDocumentCreate`, `onElementOpen`, `onStartTagClose`). SC2Layout hooks set schema types during parsing.
- `packages/sc2-layout-lang/src/parser/parser.ts` — Schema-aware hooks that must set `fileRootType` via `onDocumentCreate` (before parse loop, not after).
- `packages/sc2-lsp/src/galaxy/server.ts` — Galaxy LSP server wiring. Config types `MetadataConfig` and `DataCatalogConfig` defined here.
- `packages/vscode-sc2-galaxy/tools/build.mjs` — esbuild bundler for VS Code extension. Externals: `vscode`, `sc2-lsp`, `sc2-layout-lang`.
