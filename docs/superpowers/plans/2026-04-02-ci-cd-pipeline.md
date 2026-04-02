# CI/CD Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate PR validation and releases so that merging a PR to main automatically builds and publishes a new version of the Electron app to GitHub Releases.

**Architecture:** Two GitHub Actions workflows — `ci.yml` runs lint/typecheck/backend-build on PRs, `release.yml` runs semantic-release + electron-builder on merge to main. semantic-release reads conventional commits to determine version bumps, creates GitHub releases, and electron-builder uploads the Windows installer.

**Tech Stack:** GitHub Actions, semantic-release, cycjimmy/semantic-release-action, electron-builder, pnpm, .NET 9 SDK

**Spec:** `docs/superpowers/specs/2026-04-02-ci-cd-pipeline-design.md`

---

### Task 1: Create feature branch

**Files:** None

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feat/ci-cd-pipeline
```

---

### Task 2: Create CI workflow for PR checks

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create the workflow directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  check:
    name: Lint, Typecheck & Build
    runs-on: windows-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint & format check
        run: pnpm check

      - name: Typecheck
        run: pnpm typecheck

      - name: Setup .NET SDK
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "9.0.x"

      - name: Build backend (compile check)
        run: dotnet build backend/IdleonHelperBackend.csproj -c Release
```

Note: `pnpm/action-setup@v4` auto-detects the pnpm version from the lockfile. `--frozen-lockfile` ensures CI fails if the lockfile is out of sync.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add PR check workflow"
```

---

### Task 3: Create release workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create `.github/workflows/release.yml`**

```yaml
name: Release

on:
  push:
    branches: [main]

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: windows-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Semantic Release
        id: semantic
        uses: cycjimmy/semantic-release-action@v4
        with:
          extra_plugins: |
            @semantic-release/git
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup .NET SDK
        if: steps.semantic.outputs.new_release_published == 'true'
        uses: actions/setup-dotnet@v4
        with:
          dotnet-version: "9.0.x"

      - name: Build backend
        if: steps.semantic.outputs.new_release_published == 'true'
        run: pnpm build:backend

      - name: Build frontend
        if: steps.semantic.outputs.new_release_published == 'true'
        run: pnpm build

      - name: Publish Electron app
        if: steps.semantic.outputs.new_release_published == 'true'
        run: npx electron-builder --win --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Key details:
- `fetch-depth: 0` — semantic-release needs full git history to analyze commits since last tag
- `persist-credentials: false` — lets semantic-release use `GITHUB_TOKEN` for pushing (instead of the checkout token)
- `cycjimmy/semantic-release-action@v4` — runs semantic-release and outputs `new_release_published` and `new_release_version`
- `@semantic-release/git` — commits the version bump back to `package.json` with `[skip ci]` so it doesn't re-trigger the workflow
- All build/publish steps are conditional on `new_release_published == 'true'` — if only `chore:`/`docs:` commits were merged, nothing is built
- `electron-builder --win --publish always` — uploads the installer and update artifacts (`.exe`, `latest.yml`, `.blockmap`) to the GitHub release that semantic-release already created

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add release workflow"
```

---

### Task 4: Add semantic-release config to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `"release"` config to `package.json`**

Add the following top-level key to `package.json`:

```json
"release": {
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/npm", { "npmPublish": false }],
    ["@semantic-release/git", {
      "assets": ["package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]"
    }],
    "@semantic-release/github"
  ]
}
```

Plugin breakdown:
- `commit-analyzer` — reads conventional commits (`feat:` → minor, `fix:` → patch, `feat!:` → major)
- `release-notes-generator` — auto-generates release notes from commit messages
- `npm` — updates `package.json` version (with `npmPublish: false` since this is not an npm package)
- `git` — commits the updated `package.json` back to main with `[skip ci]` to prevent re-triggering
- `github` — creates the GitHub release

- [ ] **Step 2: Remove the manual `release` script from `package.json`**

Remove this line from `"scripts"`:
```json
"release": "powershell -ExecutionPolicy Bypass -File .\\scripts\\release.ps1",
```

Note: The `"release"` key in scripts and the top-level `"release"` key don't conflict — they're at different levels in the JSON. But the manual release script is no longer needed since CI handles releases. Removing it avoids confusion.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add semantic-release config and remove manual release script"
```

---

### Task 5: Delete manual release script

**Files:**
- Delete: `scripts/release.ps1`

- [ ] **Step 1: Delete the file**

```bash
git rm scripts/release.ps1
```

- [ ] **Step 2: Check if `scripts/` directory has other files**

`scripts/build-backend.ps1` should still exist — it's used by the release workflow. Verify:

```bash
ls scripts/
```

Expected output: `build-backend.ps1` (and nothing else)

- [ ] **Step 3: Commit**

```bash
git commit -m "chore: remove manual release script"
```

---

### Task 6: Add initial semantic-release tag

**Files:** None

- [ ] **Step 1: Create initial version tag**

semantic-release needs an existing tag to know where to start analyzing commits. Since the current version is `0.9.1`, create the tag:

```bash
git tag v0.9.1
```

This tells semantic-release: "everything after this tag is new." Without it, semantic-release would analyze the entire git history and potentially create an unintended version bump on the first run.

- [ ] **Step 2: Commit a note (no file changes needed)**

The tag is local for now. It will be pushed along with the branch when the PR is created. Add a reminder:

```bash
echo "Remember: push tag v0.9.1 before merging the PR"
```

---

### Task 7: Verify and test locally

**Files:** None

- [ ] **Step 1: Verify workflow YAML syntax**

```bash
npx yaml-lint .github/workflows/ci.yml .github/workflows/release.yml
```

If `yaml-lint` is not available, manually verify the YAML is valid by checking indentation and structure.

- [ ] **Step 2: Verify package.json is valid JSON**

```bash
node -e "require('./package.json'); console.log('package.json is valid')"
```

- [ ] **Step 3: Verify all expected files exist**

```bash
ls .github/workflows/ci.yml .github/workflows/release.yml scripts/build-backend.ps1
```

And verify `scripts/release.ps1` does NOT exist:

```bash
test ! -f scripts/release.ps1 && echo "release.ps1 removed successfully"
```

- [ ] **Step 4: Review git log for clean history**

```bash
git log --oneline -10
```

Expected: 4-5 clean commits on `feat/ci-cd-pipeline` branch.

---

### Task 8: Push and create PR

**Files:** None

- [ ] **Step 1: Push the tag**

```bash
git push origin v0.9.1
```

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/ci-cd-pipeline
```

- [ ] **Step 3: Create PR**

```bash
gh pr create --title "feat: add CI/CD pipeline with semantic-release" --body "$(cat <<'EOF'
## Summary
- Add CI workflow: lint (Ultracite/Biome), typecheck (tsc), and backend build check on every PR
- Add release workflow: semantic-release auto-versioning + electron-builder publish on merge to main
- Remove manual release script (`scripts/release.ps1`)

## How it works
1. Create feature branch, open PR → CI checks run automatically
2. Merge PR → semantic-release reads commit messages, bumps version, creates GitHub release
3. electron-builder builds and uploads the Windows installer to the release
4. Users get update notifications via electron-updater (already integrated)

## Version bump rules
- `fix:` → patch (0.9.1 → 0.9.2)
- `feat:` → minor (0.9.1 → 0.10.0)
- `feat!:` or `BREAKING CHANGE` → major (0.9.1 → 1.0.0)
- `chore:`, `docs:`, `refactor:` → no release

## Test plan
- [ ] CI workflow runs on this PR and passes (lint, typecheck, backend build)
- [ ] After merge: verify semantic-release creates a release with correct version
- [ ] Verify electron-builder uploads installer to the GitHub release
- [ ] Verify electron-updater detects the new release in the app
EOF
)"
```

---

### Post-implementation notes

**First real release after setup:**
After merging this PR, the next PR merged to main with a `feat:` or `fix:` commit will trigger the first automated release. The version will bump from `0.9.1` based on commit types.

**If something goes wrong:**
- Check the Actions tab in GitHub for workflow run logs
- If semantic-release fails: verify the `v0.9.1` tag exists on the remote
- If electron-builder fails to upload: check that `GITHUB_TOKEN` has `contents: write` permission (it does by default)
- If the release was created but artifacts are missing: re-run the failed workflow from GitHub Actions UI

**Commit message discipline:**
From now on, commit messages determine releases. Remind contributors:
- `feat: add X` → triggers a minor release
- `fix: resolve Y` → triggers a patch release
- `chore: update Z` → no release
- `feat!: breaking change` → triggers a major release
