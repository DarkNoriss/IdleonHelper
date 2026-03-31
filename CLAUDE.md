# Global Rules

## ⚠️ CRITICAL: Documentation-First Principle
> **THIS SECTION DEFINES OVERRIDE PRIORITY. IT APPLIES AT ALL TIMES, IN EVERY CONTEXT: direct work, Superpowers skills, subagent tasks, after /compact, and after context resets.**

- **Documentation is the FOUNDATION of all work.** It is NOT optional, NOT secondary, NOT "when I have time."
- Ticket folders (`docs/tickets/<id>/`) are YOUR responsibility — no tool or skill creates them for you
- Every task gets documented: what was done, what changed, what's next
- Superpowers skills (if used) are OPTIONAL tooling that accelerates planning/execution — they do NOT replace or manage documentation
- Superpowers plans live in `docs/plans/` — reference them from `tasks.md` but don't depend on them for continuity
- **Subagent awareness:** Subagents may not receive context (GitHub #237). Rules marked with 🔒 are ESPECIALLY important regardless of execution context

## 🚫 MANDATORY PRE-IMPLEMENTATION GATE
> **STOP. You MUST complete ALL of these steps BEFORE writing any code, running any skill, or dispatching any subagent. This applies to ALL work — Superpowers or not. Do NOT rationalize skipping this. "I'll do it after" is not acceptable. "The task is too small" is not acceptable.**

1. Ensure a feature branch exists (not on main/master/dev/develop)
2. Derive ticket slug from branch name
3. Create `docs/tickets/<slug>/` with these files:
   - `tasks.md` — initialized with `## Last Activity` block (see format below) and checkbox items
   - `context.md` — initialized with feature description and relevant file paths
   - `decisions.md` — initialized with any decisions already made
4. Ensure `docs/tickets/` is in `.git/info/exclude`
5. **Only AFTER all 3 files exist, proceed with implementation**

If you catch yourself writing code without having done this: STOP immediately, create the folder, then resume.

## 🔒 Post-Task Completion Hook
> **MANDATORY after completing ANY task — code change, bug fix, investigation, refactor, even research. Execute this BEFORE telling the user the task is done. No exceptions. No "I'll do it later." This is what makes "continue" and session recovery work.**

After completing each task, update ALL three files:

1. **`tasks.md`**:
   - Check off completed item with file paths and brief approach note: `- [x] Fix async cookies — middleware.ts:45-67 — wrapped in await`
   - Mark any in-progress items with `[~]`: `- [~] Update validation — schema done, submit handler pending`
   - Add any new sub-tasks discovered during implementation
   - **Overwrite the `## Last Activity` block** (see format below)

2. **`context.md`**:
   - Add newly discovered file paths and their roles
   - Note gotchas, edge cases, or non-obvious findings
   - Update open questions (remove answered ones, add new ones)

3. **`decisions.md`**:
   - Log any choices made during this task, even small ones

4. **Self-verify**: Re-read `## Last Activity` — would a fresh session with ZERO prior context understand exactly where to pick up? If not, add more detail.

### Last Activity Block Format
This block lives at the TOP of `tasks.md` and is overwritten after every task:

```markdown
## Last Activity
- **What**: [1-2 sentences describing what was just completed]
- **Files changed**: [list of modified files with brief notes]
- **State**: [tests passing/failing, lint clean/broken, build status]
- **Stopped at**: [exactly where work left off — "Completed task 3/7, about to start X" or "Mid-task: schema done, submit handler pending"]
- **Blockers**: [None, or describe what's blocking]
- **Updated**: [timestamp or "just now"]
```

### Task Item Format
Use enriched checkbox format — bare `- [ ] Fix thing` is NOT enough:

```markdown
- [x] Fix async cookies API — `middleware.ts:45-67` — wrapped in await
- [~] Update form validation — `EditZipcodeModal.tsx` — IN PROGRESS: schema done, submit handler pending
- [ ] Add integration tests — `__tests__/edit-zipcode-modal.test.tsx` — cover new validation + error states
```

Markers: `[x]` = done, `[~]` = in progress, `[ ]` = pending

## 🔒 Session End Protocol
> **Before ending a session, suggesting /compact, or when context is getting large — execute this FIRST.**

1. Run Post-Task Completion Hook for any in-progress work (mark with `[~]`)
2. Ensure `## Last Activity` accurately reflects the stopping point
3. Verify: would a completely fresh session understand where to resume? Test by re-reading the docs
4. Tell the user: "Documentation updated. Safe to /compact or start fresh."

## Communication
- All output in English (commits, docs, comments, code)
- Ask clarifying questions before any ambiguous task — never assume intent
- When unsure between two approaches, present both with tradeoffs and let me decide

## Code Quality
- Self-documenting code. Comments only for non-obvious "why", never "what"
- Readable names — no abbreviations except widely known ones (`id`, `url`, `ctx`)
- Prefer type inference when types are obvious
- DRY: extract repeated values to constants, repeated logic to functions
- Never change code unrelated to the current task
- Plans MUST identify exact files (and ideally line ranges) that need to change
- Default to `bun` if no package manager is configured. Check `package.json` or lockfiles first

## Debugging
- ALWAYS investigate root cause, not symptoms. Apply Five Whys before changing code
- Read error messages and stack traces fully before acting
- Reproduce the issue first, then fix
- Never silence errors, swallow exceptions, or add try-catch as a "fix"

## Testing
- Write failing tests FIRST, verify they fail, then implement until they pass
- Never modify tests to make them pass — fix the implementation
- Run ONLY affected tests during development; full suite before commit/PR
- Pre-commit checklist: formatter → linter → type-check → affected tests. Fix all failures before reporting done
- Never claim something works without running and verifying it

## Commits
- Check `git log --oneline -10` and match existing style
- Fallback: conventional commits `type(scope): brief message`
- When on a plan, all commits share the same scope
- First line only. No body, no `Co-Authored-By`
- Never commit debug code, console.logs, or test artifacts

## Branches
- Before any code change on `main`/`master`/`dev`/`develop`, create a feature branch first
- Naming: `feat/`, `fix/`, `chore/`, `refactor/` + kebab-case description

## Push Safety
- NEVER push unless I explicitly ask
- Before push: review `git log` and `git diff` for debug artifacts or unintended changes

## Context Window Management
- Prefer writing to files over keeping state in conversation
- For long tasks, break into phases and suggest clearing context between them
- When context is getting large, proactively suggest a handoff doc and fresh start

### Compact Instructions
When `/compact` is triggered, the summary MUST preserve: current ticket ID + branch, task completion status (with plan file path if any), unresolved decisions/blockers, recently modified files, and active ticket folder path.

## 🔒 File-Based Persistence
> **IMPORTANT OVERRIDE: This applies in ALL contexts — with or without Superpowers, inside skills, inside subagents. You are always responsible for maintaining these files.**

All working docs live in `docs/tickets/<id>/` where `<id>` is derived from the branch name or a descriptive slug.

```
docs/tickets/<id>/
├── context.md       # Discoveries, relevant file paths, open questions
├── decisions.md     # Append-only decisions log
└── tasks.md         # Last Activity block + enriched TODO items
```

- If a Superpowers plan exists, reference it: `Plan: docs/plans/YYYY-MM-DD-feature-name.md`
- NEVER commit `docs/tickets/` — add to `.git/info/exclude`

## Session Startup
When starting any session or switching tasks:
1. Read `~/.claude/LEARNINGS.md` if it exists
2. `git branch --show-current` → derive ticket ID/slug
3. Look for `docs/tickets/<id>/` — if found, read ALL three files (`tasks.md`, `context.md`, `decisions.md`)
4. Check `docs/plans/` for related plans
5. If ticket folder found: parse `## Last Activity` from `tasks.md` — this is your primary context anchor
6. If no ticket folder found: "No docs for branch `<branch>`. Want me to create a ticket folder?"

## 🔒 "Continue" Protocol
> **IMPORTANT OVERRIDE: When I say "continue" or "continue with clear context", follow this exactly.**

1. Run Session Startup (all steps above)
2. Read `## Last Activity` from `tasks.md` — this is your PRIMARY context, not the checkbox list
3. Present status:
   - "Branch: `X`"
   - "Last completed: [What from Last Activity]"
   - "State: [State from Last Activity]"
   - "Next task: `Y`" (first `[~]` in-progress item, or first `[ ]` unchecked item)
   - "Progress: Z of N tasks complete"
   - "Blockers: [from Last Activity, or None]"
4. Wait for my confirmation, then proceed

### 🔒 Mandatory Progress Updates
> **Update docs after EVERY completed task — not in batches, EVERY time.** This is enforced by the Post-Task Completion Hook above.

- Run Post-Task Completion Hook after every task (this is the hook, not a suggestion)
- If a task is more complex than expected, split it and note why in `tasks.md`
- Every 2 file edits or tool operations, self-check: "Have I run the completion hook?" If not, do it now
- Update ALL docs BEFORE suggesting compaction or session end

## 🔒 Decisions Log
> **You MUST follow this in ALL contexts: direct work, brainstorming, planning, execution, subagent tasks. There is NO tool or skill that does this for you. This is YOUR responsibility.**

Log ONLY decisions that the user explicitly makes or approves. Do NOT log your own investigative findings, eliminated hypotheses, or autonomous choices.

- A decision is logged when: the user states a preference, picks between options you presented, approves a proposed approach, or explicitly tells you to record something
- Do NOT log proactively — wait for user confirmation
- Append to `decisions.md` in the active ticket folder (create folder first if needed)
- One or two sentences per entry:
  ```
  - Dropped `lodash` in favor of native array methods — bundle size reduction
  - Pinned React to 18.x — v19 has breaking Suspense changes
  - Using server actions instead of API routes — simpler data flow for forms
  ```

## 🔒 Subagent-First Execution
> **Subagents protect the main context window. Prefer delegation over direct execution.**

- **Default to subagents** for: research, codebase exploration, web lookups, file analysis, test runs, and any task producing 5000+ tokens of working output you don't need line-by-line
- **Parallel by default**: When 2+ independent tasks exist, dispatch them as parallel subagents in a single message — do NOT work sequentially on parallelizable work
- **Background for non-blocking work**: Use `run_in_background` for research, documentation lookups, and any task whose result isn't immediately needed
- **Direct execution only when**: the task is a single file read/edit, requires main conversation state, or the user explicitly asks to do it directly

## 🔒 Post-Subagent Review
> **Subagents lose context. This compensates.**

After each subagent task completes:
1. Review output and diff for unlogged decisions → append to `decisions.md`
2. Update `tasks.md` checkboxes and `## Last Activity`
3. Add discoveries or gotchas to `context.md`

## Self-Improving Learnings
Maintain `~/.claude/LEARNINGS.md`. Append ONLY when the user corrects you. Do NOT log gotchas, debugging findings, or failed approaches — only explicit user corrections. Format: `### [YYYY-MM-DD] Title` → `Context` / `Learning`. All learnings are global — no project-scoped entries. Read at every session start.

## Efficiency
- Batch related file edits into single operations
- Don't re-read files already read this session unless they may have changed
- Explore codebases from entry point following imports — don't scan every file
