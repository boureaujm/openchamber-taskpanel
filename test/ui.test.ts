import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../panel/index.html", import.meta.url), "utf8");
const main = readFileSync(new URL("../panel/main.ts", import.meta.url), "utf8");

test("exposes the Task Panel root and its required component styles", () => {
  expect(index).toContain('<main id="app" class="tp-panel" aria-live="polite">');
  for (const selector of [
    ".tp-head", ".tp-toolbar", ".tp-icon-btn", ".tp-file-path", ".tp-progress",
    ".tp-bar", ".tp-seg", ".tp-now", ".tp-section", ".tp-section-head",
    ".tp-tasks", ".tp-task", ".tp-check", ".tp-task-id", ".tp-tag",
    ".tp-notice", ".tp-scrim", ".tp-dialog", ".tp-crumbs", ".tp-row",
  ]) expect(index).toContain(selector);
});

test("defines both dark and light design tokens with accessible focus states", () => {
  for (const token of ["--bg", "--surface-raised", "--track", "--ink", "--ink-muted", "--accent", "--active", "--focus", "--danger"]) {
    expect(index).toContain(token);
  }
  expect(index).toContain('[data-theme="light"]');
  expect(index).toContain("outline: 2px solid var(--focus)");
  expect(index).toContain("prefers-reduced-motion: reduce");
});

test("renders the complete progress and task states", () => {
  expect(main).toContain('role="progressbar"');
  expect(main).toContain("stats.percent");
  expect(main).toContain('class="tp-seg"');
  expect(main).toContain("is-done");
  expect(main).toContain("is-active");
  expect(main).toContain('role="img"');
  expect(main).toContain("aria-label");
  expect(main).toContain("tp-tag");
  expect(main).toContain("scrollIntoView");
});

test("covers the panel interactions and their persistence hooks", () => {
  for (const id of ["open-picker", "toggle-completed", "refresh", "close-picker", "picker-up"]) {
    expect(main).toContain(`"#${id}"`);
  }
  for (const key of ["ArrowDown", "ArrowUp", "Escape", "Enter"]) expect(main).toContain(`"${key}"`);
  expect(main).toContain('host.storage.set("collapsedSections"');
  expect(main).toContain('host.storage.get<string[]>("collapsedSections")');
  expect(main).toContain("is-spinning");
  expect(main).toContain("setInterval");
});

test("keeps the panel free of legacy emoji and gradients", () => {
  expect(main).not.toMatch(/[✅🔵⬜📁📄]/u);
  expect(index).not.toMatch(/linear-gradient|radial-gradient/);
});
