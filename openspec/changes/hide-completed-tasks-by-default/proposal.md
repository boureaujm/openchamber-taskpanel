# Proposal: hide-completed-tasks-by-default

## Why

The panel currently starts with completed tasks visible, contrary to the documented behavior. This makes the initial view noisier and regresses the intended default while progress should still reflect every task.

## What Changes

- Hide completed tasks when the panel first loads a plan.
- Preserve the completed-task visibility toggle so users can reveal completed tasks.
- Continue calculating progress and section counts from all tasks, including hidden completed tasks.

## Capabilities

### New Capabilities

- `completed-task-visibility`: Defines the initial visibility of completed tasks and how visibility affects progress reporting.

### Modified Capabilities

None.

## Impact

Affected areas: `panel/main.ts`, `test/parser.test.ts`, and panel behavior tests. No API or dependency changes are expected.
