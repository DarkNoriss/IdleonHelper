#!/bin/bash
# Post-task documentation update hook
# Fires after Edit/Write tool calls on code files.
# Tracks code edits vs doc updates using a counter in the ticket folder.
# When code edits accumulate without doc updates, outputs a reminder
# that gets fed back into the conversation as system feedback.

INPUT=$(cat)
TOOL_NAME="${CLAUDE_TOOL_NAME:-}"

# Only care about Edit and Write
case "$TOOL_NAME" in
  Edit|Write) ;;
  *) exit 0 ;;
esac

# Get the file path being edited
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -z "$FILE_PATH" ] && exit 0

# Get repo root
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$REPO_ROOT" ] && exit 0

REL_PATH="${FILE_PATH#$REPO_ROOT/}"

# Get branch
BRANCH=$(git branch --show-current 2>/dev/null)
[ -z "$BRANCH" ] && exit 0

# Skip protected branches
case "$BRANCH" in
  main|master|dev|develop) exit 0 ;;
esac

# Find ticket dir for this branch
TICKETS_DIR="$REPO_ROOT/docs/tickets"
TICKET_DIR=""
if [ -d "$TICKETS_DIR" ]; then
  for dir in "$TICKETS_DIR"/*/; do
    [ -d "$dir" ] || continue
    SLUG=$(basename "$dir")
    if [[ "$BRANCH" == "$SLUG"* ]]; then
      TICKET_DIR="$dir"
      break
    fi
  done
fi

# No ticket dir — nothing to track
[ -z "$TICKET_DIR" ] && exit 0

COUNTER_FILE="${TICKET_DIR}.edit-counter"

# If editing docs/tickets/ files, reset counter and exit silently
if [[ "$REL_PATH" == docs/tickets/* ]]; then
  echo "0" > "$COUNTER_FILE"
  exit 0
fi

# Skip non-code paths — don't count these as "code edits"
case "$REL_PATH" in
  .claude/*|.git/*|docs/*) exit 0 ;;
  *.lock) exit 0 ;;
esac

# Skip root-level config files
case "$REL_PATH" in
  *.md|*.json|*.mjs|*.cjs|*.yaml|*.yml|*.toml)
    if [[ "$REL_PATH" != */* ]]; then
      exit 0
    fi
    ;;
esac

# Increment counter
COUNTER=0
if [ -f "$COUNTER_FILE" ]; then
  COUNTER=$(cat "$COUNTER_FILE" 2>/dev/null | tr -d '[:space:]')
  [ -z "$COUNTER" ] && COUNTER=0
fi
COUNTER=$((COUNTER + 1))
echo "$COUNTER" > "$COUNTER_FILE"

# Check threshold — remind after 5+ code edits without doc update
THRESHOLD=5
if [ "$COUNTER" -ge "$THRESHOLD" ]; then
  TASKS_FILE="${TICKET_DIR}tasks.md"
  TICKET_REL="${TICKET_DIR#$REPO_ROOT/}"

  # Check if Last Activity block exists
  HAS_LAST_ACTIVITY=false
  if [ -f "$TASKS_FILE" ] && grep -q "## Last Activity" "$TASKS_FILE" 2>/dev/null; then
    HAS_LAST_ACTIVITY=true
  fi

  if [ "$HAS_LAST_ACTIVITY" = false ]; then
    echo "DOCUMENTATION REMINDER: $COUNTER code edits without updating docs. ${TICKET_REL}tasks.md is MISSING the '## Last Activity' block. Run the Post-Task Completion Hook NOW: update tasks.md (add Last Activity block with What/Files/State/Stopped-at/Blockers), context.md, and decisions.md."
  else
    echo "DOCUMENTATION REMINDER: $COUNTER code edits since last doc update. Run the Post-Task Completion Hook: overwrite '## Last Activity' in ${TICKET_REL}tasks.md, update context.md and decisions.md."
  fi
fi

exit 0
