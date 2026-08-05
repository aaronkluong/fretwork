// Cross-platform launcher for the FastAPI backend.
// Prefer backend/venv so `pnpm dev` uses the project interpreter (with ML deps)
// instead of whatever bare `python` is on PATH.

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const backend = join(root, "backend");
const candidates = [
  join(backend, "venv", "Scripts", "python.exe"),
  join(backend, "venv", "bin", "python"),
  "python",
];

const python = candidates.find((p) => p === "python" || existsSync(p));
if (!python || (python !== "python" && !existsSync(python))) {
  console.error(
    "No Python interpreter found for the backend. Checked:\n" +
      candidates.map((p) => `  ${p}`).join("\n") +
      "\nCreate the venv first (see backend/README.md)."
  );
  process.exit(1);
}

console.log(`[dev:backend] using ${python}`);
const child = spawn(python, ["app.py"], {
  cwd: backend,
  stdio: "inherit",
  shell: python === "python",
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
