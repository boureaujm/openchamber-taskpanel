# Design

## Context

See `proposal.md` for motivation. The current four-second timer calls the same path as initial discovery. Plan loading combines file reads, parsing, storage updates, rendering, and badge updates in one error boundary. The picker has a request counter, but plan loads do not. The parser processes each Markdown line without tracking fenced-code state.

## Goals / Non-Goals

**Goals:**

- Preserve the existing polling cadence and selected-plan storage.
- Avoid repository scans during routine polls and avoid replacing the view for unchanged content.
- Make asynchronous plan selection deterministic and keep ancillary failures from masking readable plans.
- Keep parsing in the existing pure parser module without adding dependencies.

**Non-Goals:**

- Change plan file naming, discovery roots, task syntax, or progress calculation.
- Add configurable polling intervals or configurable excluded-directory lists.
- Redesign the panel or replace its rendering approach.

## Decisions

1. **Separate discovery from selected-file refresh.** Discover plans at initial setup, project-directory changes, and explicit user refresh; routine timer ticks reread only the selected plan. This keeps the current poll cadence while removing repeated directory IPC. Exclude `node_modules`, `dist`, `.next`, and `vendor` from recursive discovery, retaining the existing hidden-directory and depth limits. A configurable exclusion system was considered but is unnecessary for the issue's scope.
2. **Guard plan loads with a monotonically increasing request identity.** A selection change or newer load invalidates earlier results; only the latest request may update the displayed plan. This uses the same lightweight approach already used for picker requests instead of introducing cancellation infrastructure.
3. **Compare displayed state before rendering.** Retain the last successfully displayed plan path/content and distinguish it from empty and read-error states. Skip view replacement when a poll produces the same state; this preserves focus and avoids repeated live-region announcements without introducing DOM diffing.
4. **Keep read/parse errors separate from side-effect errors.** Only a failed selected-file read produces the unavailable-plan state. Persisting the selection and updating the badge happen after a successful read and must not clear or hide that plan if they fail.
5. **Track Markdown fences in the existing parser loop.** Ignore lines between matching backtick or tilde fences and continue using the current task extraction logic outside fences. A small parser-state flag is preferred over a Markdown dependency because only fenced-code exclusion is required.
6. **Keep the existing SDK as a development dependency.** The extension ships a bundled `panel/main.js`, so the host does not install the SDK as a runtime dependency. Declaring it as a dev dependency still installs the SDK's `openchamber-guest-bundle` executable for local builds without changing the SDK version or runtime API.

## Risks / Trade-offs

- [A plan file lives under an excluded directory] → Automatic discovery will not find it; preserve direct loading of an already selected path and keep exclusions limited to the named dependency/generated directories.
- [Request ordering changes during rapid polling or selection] → Apply the request identity check before committing both plan content and UI state.
- [Fence markers are malformed or nested] → Follow Markdown fence closing rules (same marker character and a closing run at least as long as the opener) and cover backtick and tilde cases with parser tests.

## Migration Plan

No data migration is needed; existing selected-path and collapsed-section storage remain unchanged. Rollback consists of reverting the implementation while leaving stored values intact.
