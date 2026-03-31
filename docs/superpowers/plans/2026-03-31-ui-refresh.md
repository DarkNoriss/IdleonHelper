# UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the UI with clean utility aesthetic — better ScriptPage button states, dashboard landing, header fix, and replace hardcoded Tailwind colors with design system tokens.

**Architecture:** Component-level improvements only. No new components or structural changes. All colors from design system CSS variables (`primary`, `secondary`, `muted`, `destructive`, `chart-1`, `accent`, etc.).

**Tech Stack:** React, Tailwind CSS v4, lucide-react icons, shadcn/ui components

---

## File Map

- Modify: `src/renderer/src/components/script-page.tsx` — spinner, error icon, title alignment
- Modify: `src/renderer/src/app/pages/dashboard.tsx` — clean landing page
- Modify: `src/renderer/src/app/app-header.tsx` — className typo fix
- Modify: `src/renderer/src/app/pages/world-3/construction.tsx` — replace hardcoded colors

---

### Task 1: Polish ScriptPage component

**Files:**
- Modify: `src/renderer/src/components/script-page.tsx`

- [ ] **Step 1: Add lucide-react imports**

Add `Loader2` and `AlertCircle` to the imports at the top of the file:

```tsx
import { AlertCircle, Loader2 } from "lucide-react";
```

- [ ] **Step 2: Update the error display to include an icon**

Replace the error div (around line 81):

```tsx
// Old:
<div className="mb-4 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
  {error}
</div>

// New:
<div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-destructive text-sm">
  <AlertCircle className="h-4 w-4 shrink-0" />
  {error}
</div>
```

- [ ] **Step 3: Update the title alignment**

Replace the CardTitle (line 77):

```tsx
// Old:
<CardTitle className="text-center">{title}</CardTitle>

// New:
<CardTitle>{title}</CardTitle>
```

- [ ] **Step 4: Update button content to show spinner when running**

Replace the Button content inside the actions map (around line 104-105):

```tsx
// Old:
{isThisRunning ? runningLabel : action.label}

// New:
{isThisRunning ? (
  <>
    <Loader2 className="h-4 w-4 animate-spin" />
    {runningLabel}
  </>
) : (
  action.label
)}
```

- [ ] **Step 5: Remove the duplicate label above the button**

Remove the label div above the Button (lines 96-98) — the button text already shows the action label, so the separate heading above it is redundant:

```tsx
// Remove this entire div:
<div className="text-center font-semibold text-sm uppercase">
  {action.label}
</div>
```

And change the wrapper div from `className="space-y-3"` to just have the key:

```tsx
<div key={action.scriptId}>
  <Button ...>
```

- [ ] **Step 6: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add src/renderer/src/components/script-page.tsx
git commit -m "refactor(ui): polish ScriptPage with spinner, error icon, left-aligned title"
```

---

### Task 2: Polish Dashboard page

**Files:**
- Modify: `src/renderer/src/app/pages/dashboard.tsx`

- [ ] **Step 1: Update the dashboard to a clean landing**

Replace the entire component:

```tsx
const Dashboard = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2">
      <h1 className="font-bold text-4xl tracking-tight">Idleon Helper</h1>
      <p className="text-muted-foreground text-sm">
        v{window.api.app.version}
      </p>
    </div>
  );
};

export default Dashboard;
```

Note: Check that `window.api.app.version` is available in the preload API. If not, hardcode "0.7.0" or use a simpler fallback.

- [ ] **Step 2: Verify version API exists**

Check `src/preload/index.d.ts` for `app.version`. If it doesn't exist, replace `window.api.app.version` with a static string or remove the version line.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/app/pages/dashboard.tsx
git commit -m "refactor(ui): polish dashboard with clean landing page"
```

---

### Task 3: Fix header className typo

**Files:**
- Modify: `src/renderer/src/app/app-header.tsx`

- [ ] **Step 1: Fix the typo**

On line 19, change:

```tsx
// Old:
<h1 className="text-smfont-semibold">Idleon Helper</h1>

// New:
<h1 className="text-sm font-semibold">Idleon Helper</h1>
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/app/app-header.tsx
git commit -m "fix(ui): fix header className typo"
```

---

### Task 4: Replace hardcoded colors in Construction page

**Files:**
- Modify: `src/renderer/src/app/pages/world-3/construction.tsx`

- [ ] **Step 1: Replace green/red diff colors with design system tokens**

The construction page uses hardcoded Tailwind colors for score differences. Replace all three instances (buildRateDiff, expBonusDiff, flaggyDiff) around lines 184-237.

Replace this pattern (appears 3 times):

```tsx
// Old:
className={`mt-1 font-medium text-sm ${
  buildRateDiff >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400"
}`}

// New:
className={`mt-1 font-medium text-sm ${
  buildRateDiff >= 0
    ? "text-chart-1"
    : "text-destructive"
}`}
```

Apply the same pattern to `expBonusDiff` and `flaggyDiff` (same change, different variable name).

- [ ] **Step 2: Replace yellow warning box colors**

Around line 153, replace the hardcoded yellow warning:

```tsx
// Old:
<div className="rounded-md bg-yellow-500/10 p-3 text-sm text-yellow-600 dark:text-yellow-400">

// New:
<div className="rounded-md bg-accent/10 p-3 text-sm text-accent-foreground">
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/app/pages/world-3/construction.tsx
git commit -m "refactor(ui): replace hardcoded colors with design system tokens in construction"
```
