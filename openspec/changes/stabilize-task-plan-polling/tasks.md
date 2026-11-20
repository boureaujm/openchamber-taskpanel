# Tasks

## 1. Discovery and Refresh

- [x] 1.1 Separate plan discovery from periodic selected-file refresh and exclude dependency/generated directories; verify tests cover startup, directory-change, explicit-refresh, timer-poll, and excluded-directory behavior.
- [x] 1.2 Preserve the rendered view for unchanged plan, empty, and read-error states and prevent stale loads from replacing a newer selection; verify runtime tests cover unchanged rendering, focus/accessibility announcements, repeated empty/errors, and out-of-order reads.
- [x] 1.3 Separate selected-file read failures from storage and badge updates; verify tests show ancillary failures do not discard a successfully read plan.

## 2. Markdown Task Parsing

- [x] 2.1 Ignore checkbox-like lines inside fenced code blocks; verify parser tests cover list and heading checkboxes inside backtick and tilde fences and valid tasks outside fences.

## 3. Integration

- [x] 3.1 Keep `@openchamber/sdk` in `devDependencies` and synchronize `package-lock.json`; verify the local install exposes `openchamber-guest-bundle`.
- [x] 3.2 Run `bun test` and `bun run build`; verify the complete test suite passes and the panel bundle builds.
