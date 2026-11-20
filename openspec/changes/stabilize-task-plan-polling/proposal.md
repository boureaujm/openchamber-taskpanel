# Proposal: stabilize-task-plan-polling

## Why

The four-second refresh currently repeats repository discovery and replaces the full panel even when the selected plan has not changed. Concurrent reads and failures in unrelated storage or badge updates can also leave the panel showing stale or misleading state, while checkbox examples inside fenced Markdown code are parsed as real tasks.

## What Changes

- Limit periodic refreshes to the selected plan and avoid unnecessary directory scans, including scans into `node_modules` and common generated directories.
- Keep the panel stable when the selected plan, empty state, or read-error state is unchanged, and prevent older in-flight reads from replacing a newer selection.
- Report selected-plan read failures separately from storage and badge update failures.
- Ignore task-like checkboxes inside fenced Markdown code blocks.
- Classify the existing OpenChamber SDK as a development-only dependency used to build the bundled panel.

## Capabilities

### New Capabilities

- `task-plan-refresh`: Defines discovery, refresh, selection, and error behavior for the task panel.
- `task-list-parsing`: Defines which Markdown checkboxes are recognized as plan tasks.

### Modified Capabilities

None.

## Impact

Affected areas: `panel/main.ts`, `src/parser.ts`, their tests, `package.json`, and `package-lock.json`. The SDK version and runtime API remain unchanged; its dependency classification becomes development-only because the shipped panel is bundled.
