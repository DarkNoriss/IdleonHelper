#!/bin/bash
# Pre-implementation gate hook
# Auto-creates docs/tickets/<slug>/ with context.md, decisions.md, tasks.md
# before any code file is edited. Adds docs/tickets/ to .git/info/exclude.

INPUT=$(cat)

# Determine which tool triggered this
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"

# Get the file path being edited/written
if [ "$TOOL_NAME" = "Edit" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
elif [ "$TOOL_NAME" = "Write" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
else
  exit 0
fi

# No file path — skip
if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$REPO_ROOT" ]; then
  exit 0
fi

# Make file path relative to repo root for pattern matching
REL_PATH="${FILE_PATH#$REPO_ROOT/}"

# Skip non-code paths
case "$REL_PATH" in
  docs/tickets/*|docs/plans/*) exit 0 ;;
  .claude/*|.git/*) exit 0 ;;
  .gitignore|.gitattributes) exit 0 ;;
esac

# Skip root-level non-code files
case "$REL_PATH" in
  *.md|*.json|*.mjs|*.cjs|*.yaml|*.yml|*.toml|*.lock)
    # Only skip if at repo root (no slashes in path)
    if [[ "$REL_PATH" != */* ]]; then
      exit 0
    fi
    ;;
esac

# Get current branch
BRANCH=$(git branch --show-current 2>/dev/null)
if [ -z "$BRANCH" ]; then
  exit 0
fi

# Skip protected branches
case "$BRANCH" in
  main|master|dev|develop) exit 0 ;;
esac

TICKETS_DIR="$REPO_ROOT/docs/tickets"

# Check if any existing folder is a prefix of the branch name
MATCHED_DIR=""
if [ -d "$TICKETS_DIR" ]; then
  for dir in "$TICKETS_DIR"/*/; do
    [ -d "$dir" ] || continue
    SLUG=$(basename "$dir")
    if [[ "$BRANCH" == "$SLUG"* ]]; then
      MATCHED_DIR="$dir"
      break
    fi
  done
fi

# If no match found, create the folder using branch name as slug
if [ -z "$MATCHED_DIR" ]; then
  MATCHED_DIR="$TICKETS_DIR/$BRANCH"
  mkdir -p "$MATCHED_DIR"

  # Create context.md
  cat > "$MATCHED_DIR/context.md" << EOF
# Context: $BRANCH

## Feature Description
<!-- Initialized by pre-implementation gate hook -->

## Relevant Files
EOF

  # Create decisions.md
  cat > "$MATCHED_DIR/decisions.md" << EOF
# Decisions: $BRANCH
EOF

  # Create tasks.md with Last Activity block
  cat > "$MATCHED_DIR/tasks.md" << EOF
# Tasks: $BRANCH

Plan: docs/plans/<plan-file>.md

## Last Activity
- **What**: Ticket folder initialized
- **Files changed**: None yet
- **State**: Ready to start
- **Stopped at**: Pre-implementation — no tasks started
- **Blockers**: None
- **Updated**: $(date +%Y-%m-%d\ %H:%M)

## TODO
EOF
fi

# Ensure all three files exist (in case folder exists but is incomplete)
[ -f "$MATCHED_DIR/context.md" ] || cat > "$MATCHED_DIR/context.md" << EOF
# Context: $BRANCH

## Feature Description

## Relevant Files
EOF

[ -f "$MATCHED_DIR/decisions.md" ] || cat > "$MATCHED_DIR/decisions.md" << EOF
# Decisions: $BRANCH
EOF

[ -f "$MATCHED_DIR/tasks.md" ] || cat > "$MATCHED_DIR/tasks.md" << EOF
# Tasks: $BRANCH

Plan: docs/plans/<plan-file>.md

## Last Activity
- **What**: Ticket folder initialized
- **Files changed**: None yet
- **State**: Ready to start
- **Stopped at**: Pre-implementation — no tasks started
- **Blockers**: None
- **Updated**: $(date +%Y-%m-%d\ %H:%M)

## TODO
EOF

# Ensure docs/tickets/ is in .git/info/exclude
EXCLUDE_FILE="$REPO_ROOT/.git/info/exclude"
if [ -f "$EXCLUDE_FILE" ]; then
  if ! grep -q "^docs/tickets/" "$EXCLUDE_FILE" 2>/dev/null; then
    echo "docs/tickets/" >> "$EXCLUDE_FILE"
  fi
else
  mkdir -p "$(dirname "$EXCLUDE_FILE")"
  echo "docs/tickets/" > "$EXCLUDE_FILE"
fi

exit 0
