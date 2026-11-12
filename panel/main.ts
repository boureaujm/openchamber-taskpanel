import { connectHost } from "@openchamber/sdk";
import { applyHostReady } from "@openchamber/sdk/ui";
import { parseTasks, progressOf, visibleTasks, type ParsedPlan, type Task } from "../src/parser";

const host = connectHost();
const app = document.querySelector<HTMLMainElement>("#app")!;
const POLL_MS = 4000;
const OPEN_SPEC_ROOT = "openspec/changes";
const PLAN_FILE = /^tasks?\.md$/i;
const FALLBACK_NAMES = ["task.md", "tasks.md", ".openchamber/task.md", ".openchamber/tasks.md"];
const icons = {
  file: '<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  folder: '<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  chevron: '<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  right: '<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  down: '<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
  up: '<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
  close: '<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

let directory: string | null = null;
let plans: string[] = [];
let selectedPath: string | null = null;
let currentPlan: ParsedPlan | null = null;
let poll: number | undefined;
let pickerOpen = false;
let pickerDirectory = ".";
let pickerEntries: Array<{ name: string; kind: "file" | "directory" | "other" }> = [];
let pickerError: string | null = null;
let pickerLoading = false;
let pickerRequest = 0;
let showCompletedTasks = true;
let collapsedSections = new Set<string>();
const initializedPlans = new Set<string>();

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }
function taskParts(task: Task) {
  const match = task.text.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  return { id: match?.[1] ?? "", label: match?.[2] ?? task.text };
}
function sections(tasks: Task[]) {
  return [...new Map(tasks.map((task) => [task.section, tasks.filter((candidate) => candidate.section === task.section)])).values()];
}
function sectionName(tasks: Task[]) { return tasks[0]?.section ?? "Tasks"; }

async function findFiles(path: string, depth = 0): Promise<string[]> {
  if (depth > 6) return [];
  const { entries } = await host.listDir(path);
  const result: string[] = [];
  for (const entry of entries) {
    const child = path === "." ? entry.name : `${path}/${entry.name}`;
    if (entry.kind === "file" && PLAN_FILE.test(entry.name)) result.push(child);
    if (entry.kind === "directory" && !entry.name.startsWith(".")) result.push(...await findFiles(child, depth + 1));
  }
  return result;
}
async function discoverPlans() {
  if (!directory) return [];
  const found = new Set<string>();
  for (const path of await findFiles(".")) if (path.startsWith(`${OPEN_SPEC_ROOT}/`) || FALLBACK_NAMES.includes(path.toLowerCase())) found.add(path);
  for (const path of FALLBACK_NAMES) try { if ((await host.stat(path)).kind === "file") found.add(path); } catch { /* optional */ }
  return [...found].sort();
}
async function loadPlan() {
  if (!selectedPath) { currentPlan = null; render(); return; }
  try {
    const { content } = await host.readFile(selectedPath);
    currentPlan = parseTasks(content, selectedPath.split("/").pop()?.replace(/\.md$/i, "") ?? "Task plan");
    if (!initializedPlans.has(selectedPath)) {
      for (const group of sections(currentPlan.tasks)) if (group.length && group.every((task) => task.done)) collapsedSections.add(sectionName(group));
      initializedPlans.add(selectedPath);
    }
    await host.storage.set("selectedPath", selectedPath);
    render();
    await host.setBadge(currentPlan.tasks.filter((task) => !task.done).length || null);
  } catch { currentPlan = null; render(`Unable to read ${selectedPath}: it was moved or deleted.`); }
}
function parentDirectory(path: string) { if (path === ".") return null; const parts = path.split("/"); return parts.length === 1 ? "." : parts.slice(0, -1).join("/"); }
function joinPath(parent: string, child: string) { return parent === "." ? child : `${parent}/${child}`; }

async function loadPickerDirectory(path: string) {
  const request = ++pickerRequest; pickerDirectory = path; pickerLoading = true; pickerError = null; render();
  try {
    const { entries } = await host.listDir(path);
    if (request !== pickerRequest) return;
    pickerEntries = entries.filter((entry) => ![".", "..", ".git", "node_modules"].includes(entry.name)).filter((entry) => entry.kind === "directory" || (entry.kind === "file" && entry.name.toLowerCase().endsWith(".md"))).sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "directory" ? -1 : 1);
  } catch { if (request === pickerRequest) { pickerEntries = []; pickerError = "Unable to read this project folder."; } }
  if (request !== pickerRequest) return; pickerLoading = false; render();
}
async function openFilePicker() {
  pickerOpen = true;
  if (!directory) { pickerEntries = []; pickerLoading = false; pickerError = "Open a project to browse its files."; render(); return; }
  await loadPickerDirectory(selectedPath ? parentDirectory(selectedPath) ?? "." : ".");
}
async function selectPlanFile(path: string) { selectedPath = path; pickerOpen = false; pickerRequest += 1; await loadPlan(); }
async function refresh() {
  if (pickerOpen) return;
  try {
    plans = await discoverPlans();
    const saved = selectedPath ?? await host.storage.get<string>("selectedPath");
    if (saved?.toLowerCase().endsWith(".md")) try { selectedPath = (await host.stat(saved)).kind === "file" ? saved : plans[0] ?? null; } catch { selectedPath = plans[0] ?? null; }
    else selectedPath = plans[0] ?? null;
    await loadPlan();
  } catch { render("No project available"); }
}

function toolbarMarkup() {
  const eye = `<svg class="tp-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/>${showCompletedTasks ? "" : '<path d="M4 4l16 16"/>'}</svg>`;
  return `<div class="tp-toolbar" role="toolbar" aria-label="Plan actions"><button class="tp-icon-btn" id="open-picker" title="Choose a file" aria-label="Choose a Markdown file">${icons.down.replace("M12 5v14M6 13l6 6 6-6", "M12 5v14M5 12h14")}</button><button class="tp-icon-btn" id="toggle-completed" title="${showCompletedTasks ? "Hide" : "Show"} completed tasks" aria-label="${showCompletedTasks ? "Hide" : "Show"} completed tasks" aria-pressed="${showCompletedTasks}">${eye}</button><button class="tp-icon-btn" id="refresh" title="Refresh" aria-label="Refresh">${icons.right.replace('m9 6 6 6-6 6', 'M20 7v5h-5M4 17v-5h5M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2')}</button></div>`;
}
function render(error?: string) {
  if (error) { app.innerHTML = `<div class="tp-head"><div class="tp-file"><div class="tp-file-name">${icons.file}Task Panel</div></div>${toolbarMarkup()}</div><div class="tp-notice is-error" role="alert"><strong>Unable to read plan</strong>${escapeHtml(error)}</div>`; bindToolbar(); return; }
  if (!currentPlan) { app.innerHTML = `<div class="tp-head"><div class="tp-file"><div class="tp-file-name">${icons.file}Task Panel</div></div>${toolbarMarkup()}</div><div class="tp-notice"><strong>No tasks detected</strong>Choose a Markdown file with <code>+</code>, or create <code>openspec/changes/&lt;change&gt;/tasks.md</code>.</div>`; bindToolbar(); return; }
  const all = currentPlan.tasks, stats = progressOf(all), active = all.find((task) => !task.done), grouped = sections(all);
  const segments = `<span class="tp-seg" style="--n:1;--p:${stats.percent}%"><i></i></span>`;
  const visible = visibleTasks(all, showCompletedTasks);
  const body = grouped.map((group, index) => {
    const name = sectionName(group), done = group.filter((task) => task.done).length, collapsed = collapsedSections.has(name), rows = visible.filter((task) => task.section === name).map((task) => {
      const parts = taskParts(task), isActive = task === active;
      return `<li class="tp-task ${task.done ? "is-done" : ""} ${isActive ? "is-active" : ""}" data-task-line="${escapeHtml(task.id)}" style="--l:${task.level}"><span class="tp-check" role="img" aria-label="${task.done ? "completed" : isActive ? "in progress" : "to do"}">${task.done ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12.5l5 5L19.5 7"/></svg>' : ""}</span><span class="tp-task-id">${escapeHtml(parts.id)}</span><span class="tp-task-label">${escapeHtml(parts.label)}</span>${isActive ? '<span class="tp-tag">in progress</span>' : "<span></span>"}</li>`;
    }).join("");
    return `<section class="tp-section ${done === group.length ? "is-complete" : ""} ${collapsed ? "is-collapsed" : ""}" data-section="${escapeHtml(name)}"><button class="tp-section-head" aria-expanded="${!collapsed}"><span class="tp-section-num">${group[0]?.section === "Tasks" ? "··" : String(index + 1).padStart(2, "0")}</span><span class="tp-section-title">${escapeHtml(name)}</span><span class="tp-section-count">${done}/${group.length}</span>${icons.chevron}</button><ul class="tp-tasks">${rows}</ul></section>`;
  }).join("");
  const fileName = selectedPath?.split("/").pop() ?? "tasks.md";
  app.innerHTML = `<header class="tp-head"><div class="tp-file"><div class="tp-file-name">${icons.file}${escapeHtml(fileName)}</div><div class="tp-file-path" title="${escapeHtml(selectedPath ?? "")}">${escapeHtml(selectedPath ?? "")}</div></div>${toolbarMarkup()}</header><div class="tp-progress"><div class="tp-progress-stats"><span class="tp-percent">${stats.percent}<span>%</span></span><span class="tp-count">${stats.completed} / ${stats.total} tasks</span></div><div class="tp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.percent}" aria-label="${stats.percent} % complete">${segments}</div></div>${active ? `<button class="tp-now" id="now"><span class="tp-now-dot" aria-hidden="true"></span><span class="tp-now-label"><b>${escapeHtml(taskParts(active).id)}</b>${escapeHtml(taskParts(active).label)}</span>${icons.down}</button>` : ""}<div class="tp-divider"></div>${body}`;
  bindToolbar();
  document.querySelectorAll<HTMLButtonElement>(".tp-section-head").forEach((button) => button.addEventListener("click", () => { const section = button.closest<HTMLElement>(".tp-section")!; const name = section.dataset.section!; const collapsed = collapsedSections.has(name); if (collapsed) collapsedSections.delete(name); else collapsedSections.add(name); void host.storage.set("collapsedSections", [...collapsedSections]); render(); }));
  document.querySelector<HTMLButtonElement>("#now")?.addEventListener("click", () => document.querySelector<HTMLElement>(`.tp-task[data-task-line="${CSS.escape(active!.id)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
}
function bindToolbar() {
  document.querySelector<HTMLButtonElement>("#open-picker")?.addEventListener("click", () => void openFilePicker());
  document.querySelector<HTMLButtonElement>("#toggle-completed")?.addEventListener("click", () => { showCompletedTasks = !showCompletedTasks; render(); });
  document.querySelector<HTMLButtonElement>("#refresh")?.addEventListener("click", (event) => { const button = event.currentTarget as HTMLButtonElement; button.classList.remove("is-spinning"); void button.offsetWidth; button.classList.add("is-spinning"); window.setTimeout(() => button.classList.remove("is-spinning"), 700); void refresh(); });
  if (pickerOpen) renderPicker();
}
function renderPicker() {
  const parent = parentDirectory(pickerDirectory), rows = pickerEntries.map((entry) => { const path = joinPath(pickerDirectory, entry.name); const isFile = entry.kind === "file"; return `<button class="tp-row ${path === selectedPath ? "is-selected" : ""}" data-picker-${isFile ? "file" : "directory"}="${escapeHtml(path)}" ${path === selectedPath ? 'aria-current="true"' : ""}>${isFile ? icons.file : icons.folder}<span class="tp-row-name">${escapeHtml(entry.name)}</span>${isFile ? path === selectedPath ? '<span class="tp-row-meta">actuel</span>' : "<span></span>" : icons.right}</button>`; }).join("");
  const message = pickerError ?? (pickerLoading ? "Loading…" : rows ? "" : "No Markdown files in this folder.");
  app.insertAdjacentHTML("beforeend", `<div class="tp-scrim" id="picker-backdrop"><section class="tp-dialog" role="dialog" aria-modal="true" aria-labelledby="picker-title"><div class="tp-dialog-head"><span id="picker-title">Choose a plan</span><button class="tp-icon-btn" id="close-picker" aria-label="Close">${icons.close}</button></div><nav class="tp-crumbs" aria-label="Folder"><button class="tp-icon-btn" id="picker-up" ${parent === null ? "disabled" : ""} aria-label="Parent folder">${icons.up}</button>${pickerDirectory === "." ? '<button class="tp-crumb" aria-current="page">root</button>' : pickerDirectory.split("/").map((part, index, parts) => `<button class="tp-crumb" data-crumb="${escapeHtml(parts.slice(0, index + 1).join("/"))}" ${index === parts.length - 1 ? 'aria-current="page"' : ""}>${escapeHtml(part)}</button>`).join("/")}</nav><div class="tp-list">${rows || `<p class="tp-notice">${escapeHtml(message)}</p>`}</div><div class="tp-dialog-foot"><span><span class="tp-kbd">↑↓</span>navigate</span><span><span class="tp-kbd">↵</span>open</span><span><span class="tp-kbd">esc</span>close</span></div></section></div>`);
  const close = () => { pickerOpen = false; pickerRequest += 1; render(); document.querySelector<HTMLButtonElement>("#open-picker")?.focus(); };
  document.querySelector<HTMLButtonElement>("#close-picker")?.addEventListener("click", close); document.querySelector<HTMLElement>("#picker-backdrop")?.addEventListener("click", (event) => { if (event.target === event.currentTarget) close(); }); document.querySelector<HTMLButtonElement>("#picker-up")?.addEventListener("click", () => { if (parent) void loadPickerDirectory(parent); });
  document.querySelectorAll<HTMLButtonElement>("[data-crumb]").forEach((button) => button.addEventListener("click", () => void loadPickerDirectory(button.dataset.crumb!)));
  document.querySelectorAll<HTMLButtonElement>("[data-picker-directory]").forEach((button) => button.addEventListener("click", () => void loadPickerDirectory(button.dataset.pickerDirectory!)));
  document.querySelectorAll<HTMLButtonElement>("[data-picker-file]").forEach((button) => button.addEventListener("click", () => void selectPlanFile(button.dataset.pickerFile!)));
  const rowsForKeyboard = [...document.querySelectorAll<HTMLButtonElement>(".tp-row")];
  rowsForKeyboard.find((row) => row.classList.contains("is-selected"))?.focus();
  document.querySelector<HTMLElement>("#picker-backdrop")?.addEventListener("keydown", (event) => { const index = rowsForKeyboard.indexOf(document.activeElement as HTMLButtonElement); if (event.key === "Escape") close(); else if (event.key === "ArrowDown") { event.preventDefault(); rowsForKeyboard[Math.min(index + 1, rowsForKeyboard.length - 1)]?.focus(); } else if (event.key === "ArrowUp") { event.preventDefault(); rowsForKeyboard[Math.max(index - 1, 0)]?.focus(); } else if (event.key === "Enter") { (document.activeElement as HTMLButtonElement)?.click(); } });
}

host.onReady(async (ctx) => { applyHostReady(ctx, document.documentElement); directory = ctx.directory; const saved = await host.storage.get<string[]>("collapsedSections"); collapsedSections = new Set(saved ?? []); await refresh(); if (poll) window.clearInterval(poll); poll = window.setInterval(() => void refresh(), POLL_MS); });
host.onDirectory((value) => { directory = value; void refresh(); });
host.onSession(() => void refresh());
