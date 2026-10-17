export type Task = {
  id: string;
  text: string;
  done: boolean;
  level: number;
  section: string;
  line: number;
};

export type ParsedPlan = {
  title: string;
  tasks: Task[];
};

export function parseTasks(markdown: string, fallbackTitle = "Task plan"): ParsedPlan {
  const lines = markdown.split(/\r?\n/);
  const headings: Array<{ level: number; text: string }> = [];
  const tasks: Task[] = [];
  let title = fallbackTitle;

  lines.forEach((line, index) => {
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      headings.push({ level, text });
      if (level === 1 && title === fallbackTitle) title = text;
      return;
    }

    const task = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (!task) return;
    const section = [...headings].reverse().find((heading) => heading.level >= 2)?.text ?? "Tasks";
    const text = task[3].trim();
    tasks.push({
      id: `${index}:${text}`,
      text,
      done: task[2].toLowerCase() === "x",
      level: Math.floor(task[1].length / 2),
      section,
      line: index + 1,
    });
  });

  return { title, tasks };
}

export function progressOf(tasks: Task[]) {
  const completed = tasks.filter((task) => task.done).length;
  return { completed, total: tasks.length, percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0 };
}

export function describeCurrentWork(tasks: Task[]) {
  const activeTask = tasks.find((task) => !task.done);
  if (!activeTask) {
    if (!tasks.length) return "Aucune tâche détectée";
    return `Plan terminé · ${tasks.length} ${tasks.length === 1 ? "tâche" : "tâches"}`;
  }
  return activeTask.section === "Tasks" ? activeTask.text : `${activeTask.section} · ${activeTask.text}`;
}

export function visibleTasks(tasks: Task[], showCompleted: boolean) {
  return showCompleted ? tasks : tasks.filter((task) => !task.done);
}
