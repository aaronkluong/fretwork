// Cross-platform launcher for the backend pytest suite.
// package.json can't hardcode a venv interpreter path -- Windows uses
// backend/venv/Scripts/python.exe, POSIX uses backend/venv/bin/python -- so this
// picks whichever exists on the current machine before shelling out to pytest.

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const candidates = [
  join(root, "backend", "venv", "Scripts", "python.exe"),
  join(root, "backend", "venv", "bin", "python"),
];

const python = candidates.find((p) => existsSync(p));
if (!python) {
  console.error(
    "No backend/venv interpreter found. Checked:\n" +
      candidates.map((p) => `  ${p}`).join("\n") +
      "\nCreate the venv first (see backend/README.md)."
  );
  process.exit(1);
}

const result = spawnSync(
  python,
  ["-m", "pytest", "backend/tests", "--cov=backend", "--cov-report=term-missing"],
  { cwd: root, stdio: "inherit" }
);
process.exit(result.status ?? 1);
