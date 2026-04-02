# CI/CD Pipeline Design

## Summary

Automate the build and release pipeline for IdleonHelper, a Windows-only Electron app with a .NET 9 backend. Two GitHub Actions workflows: one for PR validation, one for automated releases via semantic-release.

## Current State

- Electron app with electron-updater already integrated (check, download, install via IPC)
- electron-builder configured to publish to GitHub releases (`DarkNoriss/IdleonHelper`)
- .NET 9 backend (`win-x64`) built via `scripts/build-backend.ps1`
- Manual release flow via `scripts/release.ps1` (to be removed)
- No GitHub Actions workflows exist
- No automated versioning — manual `package.json` edits
- Conventional commit style already in use (`feat:`, `fix:`, `chore:`)

## Architecture

### Workflow 1: `ci.yml` — PR Checks

**Trigger:** Pull request targeting `main`

**Steps:**
1. Checkout repository
2. Setup Node 22 + pnpm (with dependency caching)
3. Setup .NET 9 SDK
4. `pnpm install`
5. `pnpm check` — Ultracite/Biome lint and format validation
6. `pnpm typecheck` — TypeScript compiler check (`tsc --noEmit`)
7. `dotnet build backend/IdleonHelperBackend.csproj` — verify backend compiles

**Runner:** `windows-latest` (required for .NET `win-x64` target and Windows-specific native deps like OpenCvSharp, Vortice)

### Workflow 2: `release.yml` — Automated Release

**Trigger:** Push to `main` (PR merge)

**Steps:**
1. Checkout repository (with full git history for semantic-release)
2. Setup Node 22 + pnpm (with dependency caching)
3. Setup .NET 9 SDK
4. `pnpm install`
5. Run semantic-release:
   - Analyzes conventional commits since last tag
   - Determines version bump: `fix:` = patch, `feat:` = minor, `feat!:` or `BREAKING CHANGE` = major
   - Updates `version` in `package.json`
   - Commits version bump
   - Creates git tag (`vX.Y.Z`)
   - Creates GitHub release with auto-generated notes
   - Outputs the new version for subsequent steps
6. If a new version was released:
   - Build backend: `dotnet publish backend/IdleonHelperBackend.csproj -c Release -r win-x64 --self-contained -o resources/backend`
   - Build frontend: `pnpm build`
   - Publish: `electron-builder --win --publish always` (uploads installer + update artifacts to the GitHub release created by semantic-release)
7. If no version bump (e.g., only `chore:` commits): skip build and publish

**Runner:** `windows-latest`

**Required secret:** `GH_TOKEN` — GitHub token with repo permissions (can use the built-in `GITHUB_TOKEN` or a PAT)

### Semantic-Release Configuration

Defined in `package.json` under `"release"` key:

```json
{
  "release": {
    "branches": ["main"],
    "plugins": [
      "@semantic-release/commit-analyzer",
      "@semantic-release/release-notes-generator",
      "@semantic-release/npm",
      "@semantic-release/github"
    ]
  }
}
```

Plugin roles:
- `commit-analyzer` — determines version bump from conventional commits
- `release-notes-generator` — generates release notes for the GitHub release
- `npm` — updates `package.json` version (with `npmPublish: false` since this isn't an npm package)
- `github` — creates the GitHub release

### Version Flow

```
feat: add new feature  →  commit to feature branch
                       →  PR to main
                       →  CI checks pass (lint, typecheck, backend build)
                       →  User approves and merges
                       →  semantic-release detects "feat:" → minor bump (0.9.1 → 0.10.0)
                       →  package.json updated, tag v0.10.0 created
                       →  GitHub release created
                       →  Backend built, frontend built
                       →  electron-builder uploads installer to release
                       →  Users get update notification via electron-updater
```

### Auto-Update Integration

No changes needed. The existing `update-service.ts` checks GitHub releases via electron-updater. As long as electron-builder uploads to the same GitHub repo configured in `electron-builder.yml`, updates work automatically.

## File Changes

### New Files
- `.github/workflows/ci.yml` — PR check workflow
- `.github/workflows/release.yml` — release workflow

### Modified Files
- `package.json` — add semantic-release config and devDependencies (`semantic-release`, `@semantic-release/npm`, `@semantic-release/github`)

### Deleted Files
- `scripts/release.ps1` — replaced by automated release workflow

### Unchanged Files
- `electron-builder.yml` — already configured for GitHub publishing
- `src/main/utils/update-service.ts` — already handles auto-updates
- `scripts/build-backend.ps1` — still used by release workflow for backend build

## Out of Scope

- Code signing (no certificate)
- macOS / Linux builds (backend is Windows-only)
- Test automation (no test suite exists)
- Branch protection rules (can be added manually in GitHub settings)

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| semantic-release creates a release but electron-builder upload fails | Release workflow should upload artifacts in the same job; if it fails, manually delete the release and re-trigger |
| `chore:` / `docs:` commits don't trigger releases | Expected behavior — only `feat:` and `fix:` bump versions |
| Windows runner is slower (~2-3min boot) | Acceptable for this use case; no alternative since backend requires Windows |
| `GITHUB_TOKEN` permissions insufficient for pushing tags | Use default `GITHUB_TOKEN` with `contents: write` permission in workflow |
