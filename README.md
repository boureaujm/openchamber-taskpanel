# Task Panel

OpenChamber extension that displays Markdown task plans with a visual progress bar.

## Supported files

The extension searches for:

- `openspec/changes/**/tasks.md`
- `tasks.md`
- `.openchamber/tasks.md`

It understands Markdown checkboxes (`- [ ]` and `- [x]`). OpenSpec is supported by convention; no OpenSpec dependency is required.

## Development

```sh
npm install
npm run build
npm test
```

Install the folder from OpenChamber Settings → Extensions. The panel polls the selected file every four seconds because the SDK does not currently expose a general file-change subscription.
