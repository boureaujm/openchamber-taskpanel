const IGNORED_DIRECTORIES = new Set(["node_modules", "dist", ".next", "vendor"]);

export function shouldDescendDirectory(name: string) {
  return !name.startsWith(".") && !IGNORED_DIRECTORIES.has(name);
}
