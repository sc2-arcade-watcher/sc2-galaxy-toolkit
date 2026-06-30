# Monorepo Migration History

The source repositories were originally developed as separate projects — `vscode-sc2-galaxy` handled Galaxy Script, `sc2-layouts` handled SC2Layout XML, and `plaxtony` provided the compiler and mod tooling. Each had its own VS Code extension.

The goal of this migration is to unify everything into a single monorepo with a layered package architecture, shipping one VS Code extension (`sc2galaxy` / "StarCraft II Mod Tools") that covers all SC2 modding needs: Galaxy Script, SC2Layout, trigger metadata, and data catalogs.

The `refactor/*` branches preserve each milestone of this migration.

## Source Repositories

- [Talv/vscode-sc2-galaxy](https://github.com/Talv/vscode-sc2-galaxy) — VS Code extension
- [Talv/sc2-layouts](https://github.com/Talv/sc2-layouts) — SC2Layout XML language support
- [Talv/plaxtony](https://github.com/Talv/plaxtony) — Galaxy Script compiler and SC2 mod tooling
- [SC2Mapster/sc2layout-schema](https://github.com/SC2Mapster/sc2layout-schema) — SC2Layout schema data files

## Branch Overview

| Branch | Purpose |
|---|---|
| `legacy` | Original single-package VS Code extension (pre-monorepo). Last release v1.10.5. Default branch on origin. |
| `main` | Current development head. Fully restructured layered monorepo. |

### Migration milestones (`refactor/*`)

Each branch builds on the previous, preserving the incremental restructuring:

| Branch | Milestone |
|---|---|
| `refactor/monorepo-init` | Empty monorepo scaffold (`packages/` directory). |
| `refactor/merge-vscode-sc2-galaxy` | Merged `vscode-sc2-galaxy` repo history into `packages/vscode-sc2-galaxy`. |
| `refactor/merge-vscode-sc2-layout` | Merged `sc2-layouts` repo history into `packages/sc2-layouts`. |
| `refactor/merge-plaxtony` | Merged `plaxtony` repo history into `packages/plaxtony`. All three original repos unified. |
| `refactor/monorepo-v1` | Scaffolded pnpm workspace, added tsconfig project references, upgraded to TypeScript 5.5. |
| `refactor/monorepo-v2` | Split `sc2-layouts` into `sc2-xml`, `sc2-layout-lang`, and `vscode-sc2-layout`. |
| `refactor/monorepo-v3` | Incorporated `sc2-layout-schema` data files, merged ESM modernization work. |
| `refactor/monorepo-v4` | Full ESM migration: TypeScript 6.0, `.js` import extensions, `nodenext` module resolution, esbuild bundler, unified VS Code extension. |
| `refactor/monorepo-v5` | Extracted `sc2-mod`, `sc2-trigger`, `sc2-data`, `sc2-text`, `sc2-galaxy-lang` from plaxtony. Created `sc2-lsp` unified LSP server. Equivalent to `main`. |

## Migration Progression

```
legacy (single VS Code extension repo)
  │
  ├── 1. Merge histories ──────────────── monorepo-init → merge-* branches
  │     vscode-sc2-galaxy ─► packages/vscode-sc2-galaxy
  │     sc2-layouts        ─► packages/sc2-layouts
  │     plaxtony           ─► packages/plaxtony
  │
  ├── 2. Workspace tooling ─────────────── monorepo-v1
  │     pnpm workspace, tsconfig refs, TS 5.5
  │
  ├── 3. Package splitting ─────────────── monorepo-v2
  │     sc2-layouts → sc2-xml + sc2-layout-lang + vscode-sc2-layout
  │
  ├── 4. Schema + ESM ──────────────────── monorepo-v3 → v4
  │     sc2-layout-schema, TypeScript 6.0, ESM throughout
  │
  └── 5. Layered extraction ────────────── monorepo-v5 = main
        plaxtony → sc2-mod, sc2-trigger, sc2-data, sc2-text, sc2-galaxy-lang
        + sc2-lsp unified LSP server
```
