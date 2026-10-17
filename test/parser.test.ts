import { expect, test } from "bun:test";
import { describeCurrentWork, parseTasks, progressOf, visibleTasks } from "../src/parser";

test("parses OpenSpec sections and checkboxes", () => {
  const plan = parseTasks("# Tasks\n\n## 1. UI\n- [x] Build panel\n  - [ ] Add badge\n## 2. Tests\n- [ ] Add parser tests");
  expect(plan.title).toBe("Tasks");
  expect(plan.tasks.map((task) => [task.text, task.done, task.section])).toEqual([
    ["Build panel", true, "1. UI"],
    ["Add badge", false, "1. UI"],
    ["Add parser tests", false, "2. Tests"],
  ]);
});

test("computes percentage from tasks only", () => {
  expect(progressOf(parseTasks("# Tasks\n- [x] One\n- [ ] Two").tasks)).toEqual({ completed: 1, total: 2, percent: 50 });
  expect(progressOf([])).toEqual({ completed: 0, total: 0, percent: 0 });
});

test("describes the current section and first unfinished task", () => {
  const plan = parseTasks("# Plan\n## Validation\n- [x] Build panel\n- [ ] Verify dark theme\n- [ ] Verify light theme");
  expect(describeCurrentWork(plan.tasks)).toBe("Validation · Verify dark theme");
  expect(describeCurrentWork([{ ...plan.tasks[0], done: true }])).toBe("Plan terminé · 1 tâche");
});

test("hides completed tasks by default and can show the full plan", () => {
  const tasks = parseTasks("# Plan\n## Finished\n- [x] Done section\n## Active\n- [x] Done in active section\n- [ ] Still working").tasks;
  expect(visibleTasks(tasks, false).map((task) => task.text)).toEqual(["Still working"]);
  expect(visibleTasks(tasks, true).map((task) => task.text)).toHaveLength(3);
});
