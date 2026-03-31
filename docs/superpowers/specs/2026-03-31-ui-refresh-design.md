# UI Refresh — Design Spec

## Direction

Clean utility aesthetic. Minimal, functional, well-spaced. Let the design system theme do the talking. All colors come from the design system tokens (`primary`, `secondary`, `muted`, `accent`, `destructive`, etc.) — never standalone Tailwind colors.

## Approach

Component-level polish (Approach A). Improve existing components in place. No new layout wrappers, no structural changes.

## Scope

### 1. ScriptPage Component (`src/renderer/src/components/script-page.tsx`)

- **Button running state**: Add `Loader2` spinner icon (from lucide-react) next to label text when script is running. Keep "Click to stop" behavior.
- **Error display**: Add `AlertCircle` icon (from lucide-react) before error text.
- **Card styling**: Ensure proper design system tokens (`bg-card`, `text-card-foreground`, border via `border-border`).
- **Title**: Left-align instead of center for cleaner utility feel.
- **Button grid**: Keep existing 1-col/2-col responsive logic. Ensure comfortable padding and `w-full` sizing.

### 2. Dashboard Page (`src/renderer/src/app/pages/dashboard.tsx`)

- Replace bare "Welcome" stub with clean centered layout:
  - App name "Idleon Helper" as primary heading
  - Version number below in `text-muted-foreground`
  - Optional short tagline
- No cards, stats, or quick actions — just a confident landing
- Only design system classes

### 3. Header Fix (`src/renderer/src/app/app-header.tsx`)

- Fix className typo: `"text-smfont-semibold"` → `"text-sm font-semibold"`

### 4. Custom Pages Polish

Ensure consistent use of design system tokens. No structural changes.

- **Logs** (`src/renderer/src/app/pages/general/logs.tsx`): No changes needed.
- **Raw Data** (`src/renderer/src/app/pages/raw-data.tsx`): Verify buttons use design system colors.
- **Weekly Battle** (`src/renderer/src/app/pages/world-2/weekly-battle.tsx`): Verify cards/buttons use design system tokens.
- **Construction** (`src/renderer/src/app/pages/world-3/construction.tsx`): Already polished, minimal changes if any.

## Out of Scope

- No new shared layout component
- No dashboard quick actions (future work)
- No animation/motion library additions
- No theme/globals.css changes (user handles this separately)
- No sidebar or backend status changes
