# Terminal primitives

Shared building blocks for the Command Center UI. Every page in this app should be composed out of these. If you find yourself hand-rolling a terminal-looking card, an input with a `--flag` label, or a start/stop button — stop and use the primitive.

---

## Composition at a glance

Every page follows the same shape:

```tsx
<>
  <PageHead path="…" title="…" description="…" actions={<SmBtn>save</SmBtn>} />
  <Alert tone="warn">…optional warning…</Alert>
  <Block title="script.name" tag="script" note="…what the user should do in-game…">
    <Field label="duration" width="w-[140px]">
      <TermSelect value={dur} onChange={setDur} options={[…]} />
    </Field>
    <RunBtn scriptId="general.candy.run" label="start candy" getArgs={() => [dur]} />
  </Block>
</>
```

Rules of the road:

- **One `PageHead` per page.** It renders the breadcrumb path, title, optional description, and right-side actions slot.
- **One or more `Block`s.** Each block is a titled section that usually hosts one script (config + run button) or some data.
- **Run buttons live inside `Block`s**, never on top of a raw `<div>`. The block's header sets context for what the button does.
- **Page content lives above the always-visible Queue Dock.** The dock is rendered globally in `app.tsx`; never import it into a page.
- **Width budget:** the content pane is ~742×466 at 958×570 window size. Design everything to fit without horizontal scroll.

---

## `PageHead`

```tsx
<PageHead
  path="world-3 / trapping"
  title="trapping"
  description="Places and collects traps across all characters with trapping unlocked."
  actions={<SmBtn onClick={refetch}>↻ refetch</SmBtn>}
/>
```

- `path` — breadcrumb, e.g. `"general / candy"`. Use kebab-case, match the sidebar label hierarchy.
- `title` — lowercase mono, matches the sidebar label.
- `description` — 1–2 sentences of what this page does. Optional but recommended.
- `actions` — right-aligned slot. Use `<SmBtn>` or a cluster of them (`<div className="flex gap-1"><SmBtn>…</SmBtn></div>`).

---

## `Block` + `BlockActions`

The workhorse. One titled card with an optional `// note` strip and a body.

```tsx
<Block
  title="candy.run"
  tag="script"
  note="switch in-game to the target character before starting."
>
  <Field label="duration" width="w-[140px]">
    <TermSelect value={dur} onChange={setDur} options={…} />
  </Field>
  <RunBtn scriptId="general.candy.run" label="start candy" getArgs={() => [dur]} />
</Block>
```

Props:

- `title` — mono, rendered as `# title`. Use `module.action` form (e.g. `candy.run`, `cards.apply`, `traps.place`).
- `tag` — optional small chip to the right of the title. Common tags: `"script"`, `"config"`, `"data"`, `"planner"`, `"current"`.
- `note` — optional guidance rendered as `// note text`. This strip grows vertically when sibling Blocks in a grid have more content — it absorbs extra height so action rows stay pinned at the bottom.
- `compact` — tighter body padding. Use for short, dense blocks (e.g. the `cogs.collect` / `cogs.trash` pair on the construction page).

### Side-by-side Blocks with equal height

When two `Block`s sit in a `grid grid-cols-2` and one has a longer note/body, the shorter one should grow to match. Wrap each block's run button in `<BlockActions>` to pin it to the bottom:

```tsx
<div className="grid grid-cols-2 gap-2">
  <Block title="cards.apply" tag="script" note="applies preset to active character." compact>
    <BlockActions>
      <RunBtn scriptId="general.cardPresets.apply" label="apply preset" getArgs={…} />
    </BlockActions>
  </Block>
  <Block title="cards.select" tag="script" note="selects preset without applying." compact>
    <BlockActions>
      <RunBtn scriptId="general.cardPresets.select" label="select preset" getArgs={…} />
    </BlockActions>
  </Block>
</div>
```

`BlockActions` uses `margin-top: auto` — the note absorbs extra height, the action stays pinned.

---

## `Field`

Wraps any input-like child with a `--label` above it.

```tsx
<Field label="iterations" width="w-[120px]" hint="max 500">
  <TermInput value={iters} onChange={setIters} />
</Field>
```

- `label` — short lowercase name. Rendered as `--label`.
- `width` — optional Tailwind width utility class applied to the wrapper (e.g. `"w-[140px]"`, `"w-1/2"`, `"w-full"`). Must be a literal class so the JIT scanner emits the CSS. Omit for default (full width).
- `hint` — tiny right-aligned text (e.g. units, max values).

Pair with one of: `TermSelect`, `TermInput`, `TermTextarea`, `TermCheckbox`, or any custom child.

---

## `RunBtn`

The state-aware start/stop button. Reads queue state itself — you just give it a scriptId.

```tsx
<RunBtn
  scriptId="general.candy.run"
  label="start candy"
  getArgs={() => [duration]}
  disabled={!ready}
/>
```

Behavior (automatic — you don't manage state):

- **idle** → shows `▶ start candy` on primary background. Click enqueues.
- **running** → shows spinner + `running · click to stop` (transparent bg, primary-dim border). Click removes the running item.
- **queued** → shows `⋯ queued · click to cancel` (surface-hi bg, primary-dim border). Click removes the queued item.
- **disabled** (idle + `disabled` prop) → dimmed surface bg, non-clickable.

Props:

- `scriptId` — `keyof ScriptMap`. Typed, autocomplete works.
- `label` — idle-state label ("start candy", "collect cogs", etc.).
- `getArgs` — **lazy** args getter. Called at click time, so it can reference current form state. Args must match `ScriptMap[scriptId]["args"]`.
- `disabled` — only honored when idle. You can't "disable" stop/cancel.
- `small` — tighter padding + font. Use inside `BlockActions` or when the button shares a row with selects.

No `onClick` prop — enqueue/remove is built in.

---

## `SmBtn`

Small secondary action button. Primarily for page-head actions (`paste`, `save`, `clear`, `↻ refetch`).

```tsx
<SmBtn onClick={handleSave} primary>save</SmBtn>
<SmBtn onClick={handlePaste}>paste</SmBtn>
```

- `primary` — filled primary background. Use sparingly (one primary per cluster).
- All standard `<button>` props (`onClick`, `disabled`, …) pass through.

---

## Terminal-styled inputs

Every page should compose its form controls out of these. They match the design's dense metrics (~26px height, 11px mono font, 3px radius, surface background) and honor `disabled` styling consistently.

- `TermSelect` — native `<select>` with styled chevron. Takes `options: readonly (string | { value: string; label: string })[]` (an `as const` array works directly), `value: string`, `onChange: (v: string) => void`, optional `disabled`.
- `TermInput` — `<input type="text" | "number" | …>`. `value: string`, `onChange: (v: string) => void` (pre-unwrapped), plus any standard input attr (`disabled`, `placeholder`, `type`…).
- `TermTextarea` — `<textarea>`. Same value/onChange shape as `TermInput`. Honors `disabled`.
- `TermCheckbox` — custom box with `✓` glyph. `checked: boolean`, `onChange: (checked: boolean) => void`, `label: ReactNode`, optional `disabled`. Visually-hidden real `<input>` underneath for proper focus/a11y.

---

## `Stat`

Dashboard / summary tile.

```tsx
<div className="grid grid-cols-4 gap-2">
  <Stat label="engine" value="running" tone="var(--primary)" />
  <Stat label="queue" value="1+" />
  <Stat label="session" value="12m" />
</div>
```

- `label` — uppercase tracking letter-spaced caption.
- `value` — big mono number/word.
- `tone` — optional color for the value (defaults to `foreground`). Pass a CSS color or token `var(--primary)`.

---

## `Alert`

Short tinted banner inside a page. Goes between `PageHead` and the first Block.

```tsx
<Alert tone="warn">navigate to the construction screen in-game first.</Alert>
```

- `tone` — `"info"` (default, blue), `"warn"` (amber), `"danger"` (red).

---

## `QuickTile` and `Step` (Dashboard helpers)

`QuickTile` — clickable tile used in the Dashboard's quick-launch grid.

```tsx
<QuickTile label="candy" desc="burn time candy" onClick={() => setPage("general/candy")} />
```

`Step` — numbered onboarding step row for first-time-setup walkthroughs.

```tsx
<Step num="01" label="paste game data → raw-data" onJump={() => setPage("rawData")} />
<Step num="02" label="open target character in-game" />
```

---

## `ScoreCol` (Construction-specific)

Three-column score display with optional delta.

```tsx
<div className="grid grid-cols-3 gap-2.5 text-center">
  <ScoreCol label="build-rate" current="842k" diff={solved ? "+212k" : null} />
  <ScoreCol label="exp-bonus" current="178%" diff={solved ? "+34%" : null} />
  <ScoreCol label="flaggy" current="0" />
</div>
```

`diff` with `-` prefix renders red; otherwise green.

---

## `HsvRow` (Debug-specific)

HSV triplet input used on the debug page's capture-HSV block.

```tsx
<HsvRow label="hsv-lower" value={hsvLow} onChange={setHsvLow} />
<HsvRow label="hsv-upper" value={hsvHi} onChange={setHsvHi} />
```

Takes `HsvColor` (`{ h, s, v }`). Renders three tiny inputs with `h/s/v` prefix badges.

---

## Full before/after: the Candy page

**Before** (old `ScriptPage` wrapper — now removed):

```tsx
export const CandyPage = () => {
  const [duration, setDuration] = useState("24h");
  return (
    <ScriptPage
      title="Candy"
      actions={[{ label: `Start (${duration})`, scriptId: "general.candy.run", args: () => [duration] }]}
    >
      <div className="mb-4">
        <Select value={duration} onValueChange={setDuration}>…</Select>
      </div>
    </ScriptPage>
  );
};
```

**After** (terminal composition):

```tsx
import { Block, Field, PageHead, RunBtn, TermSelect } from "@/components/terminal";

export const CandyPage = () => {
  const [duration, setDuration] = useState("24h");
  return (
    <>
      <PageHead
        path="general / candy"
        title="candy"
        description="Batch-consumes Time Candy from the active character's inventory. Auto-exits when none remain."
      />
      <Block
        title="candy.run"
        tag="script"
        note="switch in-game to the target character before starting. script auto-stops when no matching candies are left."
      >
        <div className="flex items-end gap-2.5">
          <Field label="duration" width="w-[140px]">
            <TermSelect
              value={duration}
              onChange={setDuration}
              options={[
                { value: "1h", label: "1H" },
                { value: "2h", label: "2H" },
                { value: "4h", label: "4H" },
                { value: "12h", label: "12H" },
                { value: "24h", label: "24H" },
              ]}
            />
          </Field>
          <RunBtn
            scriptId="general.candy.run"
            label="start candy"
            getArgs={() => [duration]}
          />
        </div>
      </Block>
    </>
  );
};
```

---

## When NOT to use these

- **Non-terminal chrome** (settings dialogs, modals, etc.) — shadcn is still configured (`components.json`). Re-add a primitive with `pnpm dlx shadcn@latest add <name>` if you need a dialog or dropdown menu.
- **One-off experiments** — feel free to prototype inline; promote to a terminal primitive once the pattern repeats.
- **Light-mode surfaces** — the terminal palette is dark-only. No light variants today.

## Extending

- Add new primitives under `src/renderer/src/components/terminal/` and export them from `index.ts`.
- Reference the design system source of truth in `.design-ref/v3-app.jsx` before inventing new token values — prefer reusing existing CSS variables (`var(--panel-2)`, `var(--amber)`, etc.).
- Update this README whenever you add, remove, or significantly change a primitive.
