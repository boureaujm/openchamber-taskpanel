import { expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { shouldDescendDirectory } from "../src/discovery";

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
  expect(index).toContain('[data-oc-theme="light"]');
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

test("polls the selected plan without rediscovery and ignores stale, failed, and unchanged reads", async () => {
  let onReady: ((context: { directory: string }) => Promise<void>) | undefined;
  let onDirectory: ((directory: string) => void) | undefined;
  let interval: (() => void) | undefined;
  let currentDirectory = "project-a";
  let deferNextARead = false;
  let releaseARead: ((result: { content: string }) => void) | undefined;
  let failBRead = false;
  let failDiscovery = false;
  let listDirCalls = 0, storageWrites = 0, badgeWrites = 0, renderWrites = 0;
  const reads: string[] = [];
  let html = "";
  const app = {
    get innerHTML() { return html; },
    set innerHTML(value: string) { html = value; renderWrites++; },
  };
  const listeners = new Map<string, (event: { currentTarget: unknown }) => void>();
  const element = (id: string) => ({
    addEventListener(event: string, listener: (event: { currentTarget: unknown }) => void) {
      if (event === "click") listeners.set(id, listener);
    },
    click() { listeners.get(id)?.({ currentTarget: this }); },
    classList: { add() {}, remove() {} },
    offsetWidth: 0,
    focus() {},
  });
  const elements = new Map<string, ReturnType<typeof element>>();
  const documentMock = {
    documentElement: {},
    querySelector(selector: string) {
      if (selector === "#app") return app;
      const id = selector.slice(1);
      return app.innerHTML.includes(`id="${id}"`) ? (elements.get(id) ?? (elements.set(id, element(id)), elements.get(id)!)) : null;
    },
    querySelectorAll() { return []; },
  };
  const host = {
    onReady(callback: typeof onReady) { onReady = callback; },
    onDirectory(callback: typeof onDirectory) { onDirectory = callback; },
    onSession() {},
    storage: {
      async get(key: string) { return key === "collapsedSections" ? [] : null; },
      async set() { storageWrites++; throw new Error("storage unavailable"); },
    },
    async listDir(path: string) {
      listDirCalls++;
      if (path === "." && failDiscovery) throw new Error("discovery unavailable");
      if (path === ".") return { entries: currentDirectory === "project-empty" ? [] : [{ name: "openspec", kind: "directory" }] };
      if (path === "openspec") return { entries: [{ name: "changes", kind: "directory" }] };
      if (path === "openspec/changes") return { entries: [{ name: currentDirectory === "project-a" ? "a" : "b", kind: "directory" }] };
      if (path === `openspec/changes/${currentDirectory === "project-a" ? "a" : "b"}`) return { entries: [{ name: "tasks.md", kind: "file" }] };
      return { entries: [] };
    },
    async stat(path: string) {
      const currentPlan = `openspec/changes/${currentDirectory === "project-a" ? "a" : "b"}/tasks.md`;
      if (currentDirectory !== "project-empty" && path === currentPlan) return { kind: "file" };
      throw new Error("not found");
    },
    async readFile(path: string) {
      reads.push(path);
      if (path === "openspec/changes/a/tasks.md" && deferNextARead) {
        deferNextARead = false;
        return await new Promise<{ content: string }>((resolve) => { releaseARead = resolve; });
      }
      if (path === "openspec/changes/b/tasks.md") {
        if (failBRead) throw new Error("read unavailable");
        return { content: "# Plan B\n- [ ] Latest B task" };
      }
      return { content: "# Plan A\n- [ ] Initial A task" };
    },
    async setBadge() { badgeWrites++; throw new Error("badge unavailable"); },
  };
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const flush = async () => { for (let index = 0; index < 20; index++) await Promise.resolve(); };
  mock.module("@openchamber/sdk", () => ({ connectHost: () => host }));
  mock.module("@openchamber/sdk/ui", () => ({ applyHostReady() {} }));
  Object.defineProperty(globalThis, "document", { configurable: true, value: documentMock });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      clearInterval() {},
      setInterval(callback: () => void) { interval = callback; return 1; },
      setTimeout() { return 1; },
    },
  });
  try {
    await import("../panel/main.ts");
    await onReady!({ directory: "." });
    expect(app.innerHTML).toContain("Initial A task");
    expect(storageWrites).toBeGreaterThan(0);
    expect(badgeWrites).toBeGreaterThan(0);
    expect(app.innerHTML).not.toContain("Unable to read plan");

    const discoveriesBeforePoll = listDirCalls;
    const readsBeforePoll = reads.length;
    deferNextARead = true;
    interval!();
    await flush();
    expect(listDirCalls).toBe(discoveriesBeforePoll);
    expect(reads).toHaveLength(readsBeforePoll + 1);
    expect(reads.at(-1)).toBe("openspec/changes/a/tasks.md");
    expect(releaseARead).toBeDefined();

    currentDirectory = "project-b";
    const bTransitionWrites = renderWrites;
    onDirectory!("project-b");
    await flush();
    expect(app.innerHTML).toContain("Latest B task");
    expect(app.innerHTML).not.toContain("Unable to read plan");
    expect(renderWrites).toBe(bTransitionWrites + 1);

    const bView = app.innerHTML;
    releaseARead!({ content: "# Stale A\n- [ ] Stale A task" });
    await flush();
    expect(app.innerHTML).toBe(bView);
    expect(app.innerHTML).not.toContain("Stale A task");

    const stableView = app.innerHTML, stableRenderWrites = renderWrites;
    interval!();
    await flush();
    expect(app.innerHTML).toBe(stableView);
    expect(renderWrites).toBe(stableRenderWrites);
    expect(listDirCalls).toBeGreaterThan(discoveriesBeforePoll);

    failBRead = true;
    interval!();
    await flush();
    expect(app.innerHTML).toContain("Unable to read plan");
    expect(app.innerHTML).toContain("Unable to read openspec/changes/b/tasks.md");
    expect(app.innerHTML).not.toContain("Latest B task");
    const errorView = app.innerHTML, errorRenderWrites = renderWrites;
    interval!();
    await flush();
    expect(app.innerHTML).toBe(errorView);
    expect(renderWrites).toBe(errorRenderWrites);

    currentDirectory = "project-empty";
    const emptyTransitionWrites = renderWrites;
    onDirectory!("project-empty");
    await flush();
    expect(app.innerHTML).toContain("No tasks detected");
    expect(renderWrites).toBe(emptyTransitionWrites + 1);
    const emptyView = app.innerHTML, emptyRenderWrites = renderWrites;
    interval!();
    await flush();
    expect(app.innerHTML).toBe(emptyView);
    expect(renderWrites).toBe(emptyRenderWrites);

    failDiscovery = true;
    onDirectory!("project-empty");
    await flush();
    expect(app.innerHTML).toContain("No tasks detected");
    expect(app.innerHTML).not.toContain("Unable to read plan");
  } finally {
    mock.restore();
    if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
    else Reflect.deleteProperty(globalThis, "document");
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("skips ignored directories during recursive discovery", () => {
  for (const name of ["node_modules", "dist", ".next", "vendor"]) expect(shouldDescendDirectory(name)).toBe(false);
  expect(shouldDescendDirectory("openspec")).toBe(true);
  expect(shouldDescendDirectory(".git")).toBe(false);
  expect(main).toContain("shouldDescendDirectory(entry.name)");
});

test("keeps the panel free of legacy emoji and gradients", () => {
  expect(main).not.toMatch(/[✅🔵⬜📁📄]/u);
  expect(index).not.toMatch(/linear-gradient|radial-gradient/);
});
