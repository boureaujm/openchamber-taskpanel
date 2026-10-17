import { connectHost } from "@openchamber/sdk";
import { applyHostReady } from "@openchamber/sdk/ui";
import { describeCurrentWork, parseTasks, progressOf, visibleTasks, type ParsedPlan } from "../src/parser";

const host = connectHost();
const app = document.querySelector<HTMLMainElement>("#app")!;
const POLL_MS = 4000;
const OPEN_SPEC_ROOT = "openspec/changes";
const FALLBACK_NAMES = ["tasks.md", ".openchamber/tasks.md"];

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
let showCompletedTasks = false;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

async function findFiles(path: string, depth = 0): Promise<string[]> {
  if (depth > 6) return [];
  const { entries } = await host.listDir(path);
  const result: string[] = [];
  for (const entry of entries) {
    const child = path === "." ? entry.name : `${path}/${entry.name}`;
    if (entry.kind === "file" && entry.name.toLowerCase() === "tasks.md") result.push(child);
    if (entry.kind === "directory" && !entry.name.startsWith(".")) result.push(...await findFiles(child, depth + 1));
  }
  return result;
}

async function discoverPlans() {
  if (!directory) return [];
  const found = new Set<string>();
  for (const path of await findFiles(".")) {
    if (path.startsWith(`${OPEN_SPEC_ROOT}/`) || FALLBACK_NAMES.includes(path)) found.add(path);
  }
  for (const path of FALLBACK_NAMES) {
    try {
      if ((await host.stat(path)).kind === "file") found.add(path);
    } catch {
      // Missing optional fallback file.
    }
  }
  return [...found].sort();
}

async function loadPlan() {
  if (!selectedPath) {
    currentPlan = null;
    render();
    return;
  }
  try {
    const { content } = await host.readFile(selectedPath);
    currentPlan = parseTasks(content, selectedPath.split("/").pop()?.replace(/\.md$/i, "") ?? "Task plan");
    await host.storage.set("selectedPath", selectedPath);
    render();
    await host.setBadge(currentPlan.tasks.filter((task) => !task.done).length || null);
  } catch (error) {
    currentPlan = null;
    render(`Impossible de lire ${selectedPath}`);
  }
}

function parentDirectory(path: string) {
  if (path === ".") return null;
  const parts = path.split("/");
  return parts.length === 1 ? "." : parts.slice(0, -1).join("/");
}

function joinPath(parent: string, child: string) {
  return parent === "." ? child : `${parent}/${child}`;
}

async function loadPickerDirectory(path: string) {
  const request = ++pickerRequest;
  pickerDirectory = path;
  pickerLoading = true;
  pickerError = null;
  render();
  try {
    const { entries } = await host.listDir(path);
    if (request !== pickerRequest) return;
    pickerEntries = entries
      .filter((entry) => entry.name !== "." && entry.name !== ".." && entry.name !== ".git" && entry.name !== "node_modules")
      .filter((entry) => entry.kind === "directory" || (entry.kind === "file" && entry.name.toLowerCase().endsWith(".md")))
      .sort((left, right) => left.kind === right.kind ? left.name.localeCompare(right.name) : left.kind === "directory" ? -1 : 1);
  } catch (error) {
    if (request !== pickerRequest) return;
    pickerEntries = [];
    pickerError = "Impossible de lire ce dossier du projet.";
  }
  if (request !== pickerRequest) return;
  pickerLoading = false;
  render();
}

async function openFilePicker() {
  pickerOpen = true;
  if (!directory) {
    pickerDirectory = ".";
    pickerEntries = [];
    pickerLoading = false;
    pickerError = "Ouvrez un projet pour parcourir ses fichiers.";
    render();
    return;
  }
  const selectedParent = selectedPath ? parentDirectory(selectedPath) : null;
  await loadPickerDirectory(selectedParent ?? ".");
}

async function selectPlanFile(path: string) {
  selectedPath = path;
  pickerOpen = false;
  pickerRequest += 1;
  await loadPlan();
}

async function refresh() {
  if (pickerOpen) return;
  try {
    const nextPlans = await discoverPlans();
    plans = nextPlans;
    const saved = selectedPath ?? await host.storage.get<string>("selectedPath");
    if (saved?.toLowerCase().endsWith(".md")) {
      try {
        selectedPath = (await host.stat(saved)).kind === "file" ? saved : plans[0] ?? null;
      } catch {
        selectedPath = plans[0] ?? null;
      }
    } else {
      selectedPath = plans[0] ?? null;
    }
    await loadPlan();
  } catch (error) {
    render("Aucun projet accessible");
  }
}

function render(error?: string) {
  if (error) {
    app.innerHTML = `${toolbarMarkup()}<p class="error">${escapeHtml(error)}</p>`;
  } else if (!currentPlan) {
    app.innerHTML = `${toolbarMarkup()}<p class="empty">Aucune tâche détectée.<br><span class="hint">Choisissez un fichier Markdown avec l’icône de fichier ou utilisez openspec/changes/&lt;change&gt;/tasks.md.</span></p>`;
  } else {
    const stats = progressOf(currentPlan.tasks);
    const firstPending = currentPlan.tasks.find((task) => !task.done)?.id;
    const fileName = selectedPath?.split("/").pop() ?? "tasks.md";
    const activityTitle = describeCurrentWork(currentPlan.tasks);
    let lastSection = "";
    const displayTasks = visibleTasks(currentPlan.tasks, showCompletedTasks);
    const rows = displayTasks.map((task) => {
      const section = task.section !== lastSection ? `<div class="section">${escapeHtml(task.section)}</div>` : "";
      lastSection = task.section;
      const active = task.id === firstPending && !task.done;
      return `${section}<div class="task ${task.done ? "done" : ""} ${active ? "active" : ""}" style="padding-left:${5 + task.level * 14}px"><span class="mark">${task.done ? "✅" : active ? "🔵" : "⬜"}</span><span class="label">${escapeHtml(task.text)}</span></div>`;
    }).join("");
    const emptyMessage = currentPlan.tasks.length && !showCompletedTasks
      ? "Toutes les tâches sont terminées. Cliquez sur l’œil pour les afficher."
      : "Aucune tâche détectée.";
    app.innerHTML = `${toolbarMarkup()}<div class="header"><div class="header-copy"><div class="filename">${escapeHtml(fileName)}</div><div class="title">${escapeHtml(activityTitle)}</div></div><div class="percent">${stats.percent} %</div></div><div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${stats.percent}" aria-label="${stats.percent} pour cent terminé"><div class="progress-fill" style="width:${stats.percent}%"></div></div><div>${rows || `<div class="empty">${emptyMessage}</div>`}</div>`;
  }

  document.querySelector<HTMLButtonElement>("#refresh")?.addEventListener("click", refresh);
  document.querySelector<HTMLButtonElement>("#open-picker")?.addEventListener("click", openFilePicker);
  document.querySelector<HTMLButtonElement>("#toggle-completed")?.addEventListener("click", () => {
    showCompletedTasks = !showCompletedTasks;
    render();
  });
  if (pickerOpen) renderPicker();
}

function toolbarMarkup() {
  const eyeIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"/><circle cx="12" cy="12" r="3"/>${showCompletedTasks ? "" : "<path d=\"M4 4l16 16\"/>"}</svg>`;
  return `<div class="toolbar">
    <button class="icon-action" id="open-picker" title="Ajouter un fichier Markdown" aria-label="Ajouter un fichier Markdown">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
    </button>
    <button class="icon-action" id="toggle-completed" title="${showCompletedTasks ? "Masquer" : "Afficher"} les tâches terminées" aria-label="${showCompletedTasks ? "Masquer" : "Afficher"} les tâches terminées" aria-pressed="${showCompletedTasks}">
      ${eyeIcon}
    </button>
    <button class="icon-action" id="refresh" title="Actualiser" aria-label="Actualiser">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.8-2L20 12M4 12l2.6 5a7 7 0 0 0 11.8-2"/></svg>
    </button>
  </div>`;
}

function renderPicker() {
  const parent = parentDirectory(pickerDirectory);
  const rows = pickerEntries.map((entry) => {
    const path = joinPath(pickerDirectory, entry.name);
    if (entry.kind === "directory") {
      return `<button class="picker-row" data-picker-directory="${escapeHtml(path)}"><span aria-hidden="true">📁</span><span>${escapeHtml(entry.name)}</span><span class="picker-chevron">›</span></button>`;
    }
    return `<button class="picker-row ${path === selectedPath ? "selected" : ""}" data-picker-file="${escapeHtml(path)}"><span aria-hidden="true">📄</span><span>${escapeHtml(entry.name)}</span></button>`;
  }).join("");
  const message = pickerError ?? (pickerLoading ? "Chargement…" : rows ? "" : "Aucun fichier Markdown dans ce dossier.");
  app.insertAdjacentHTML("beforeend", `<div class="picker-backdrop" id="picker-backdrop"><section class="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title">
    <div class="picker-header"><strong id="picker-title">Choisir un fichier Markdown</strong><button class="picker-close" id="close-picker" aria-label="Fermer">×</button></div>
    <div class="picker-location"><button id="picker-up" ${parent === null ? "disabled" : ""} aria-label="Dossier parent">↑</button><span>${pickerDirectory === "." ? "Racine du projet" : escapeHtml(pickerDirectory)}</span></div>
    <div class="picker-list">${rows || `<p class="picker-message">${escapeHtml(message)}</p>`}</div>
  </section></div>`);

  document.querySelector<HTMLButtonElement>("#close-picker")?.addEventListener("click", () => {
    pickerOpen = false;
    pickerRequest += 1;
    render();
  });
  document.querySelector<HTMLDivElement>("#picker-backdrop")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    pickerOpen = false;
    pickerRequest += 1;
    render();
  });
  document.querySelector<HTMLButtonElement>("#picker-up")?.addEventListener("click", () => {
    if (parent !== null) void loadPickerDirectory(parent);
  });
  document.querySelectorAll<HTMLButtonElement>("[data-picker-directory]").forEach((button) => {
    button.addEventListener("click", () => void loadPickerDirectory(button.dataset.pickerDirectory!));
  });
  document.querySelectorAll<HTMLButtonElement>("[data-picker-file]").forEach((button) => {
    button.addEventListener("click", () => void selectPlanFile(button.dataset.pickerFile!));
  });
}

host.onReady((ctx) => {
  applyHostReady(ctx, document.documentElement);
  directory = ctx.directory;
  void refresh();
  if (poll) window.clearInterval(poll);
  poll = window.setInterval(() => void refresh(), POLL_MS);
});

host.onDirectory((value) => { directory = value; void refresh(); });
host.onSession(() => void refresh());
