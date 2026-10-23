# Task Panel

OpenChamber extension that displays progress from Markdown task plans.

## Stack

- TypeScript and Bun.
- `@openchamber/sdk` provides host filesystem, storage, badge, and UI integration.
- `panel/main.ts` is the panel entrypoint; `src/parser.ts` contains the pure task parser.
- `panel/main.js` is the generated bundle. Update TypeScript, then run the build; do not edit the bundle by hand.

## Commands

```sh
bun install --frozen-lockfile
bun run build
bun test
bun test test/parser.test.ts
```

The GitHub Actions workflow uses these same Bun commands. `bun run build` regenerates `panel/main.js`.

## Behavior to preserve

- Plans are discovered in `openspec/changes/**/tasks.md`, `tasks.md`, and `.openchamber/tasks.md`.
- The panel polls the selected file every four seconds because the SDK has no general file-change subscription.
- Completed tasks are hidden by default, but progress always counts all tasks.
- Parser behavior is covered by `test/parser.test.ts`; keep parser logic independent from DOM and host APIs.
