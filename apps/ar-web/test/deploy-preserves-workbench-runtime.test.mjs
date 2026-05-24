import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const deployShell = await readFile(new URL("../scripts/deploy-vm.sh", import.meta.url), "utf8");
const deployPython = await readFile(new URL("../scripts/deploy_remote_vm.py", import.meta.url), "utf8");

test("remote deploy never uploads local workbench runtime config over server edits", () => {
  assert.match(deployShell, /--exclude "public\/ar\/workbench"/);
  assert.match(deployShell, /--exclude "public\/ar\/targets"/);
  assert.match(deployShell, /BACKUP_DIR="\$\{SHARED_DIR\}\/backups"/);
  assert.match(deployShell, /rm -rf public\/ar\/targets public\/ar\/workbench\nnpm run build/);
  assert.match(deployPython, /MUTABLE_RUNTIME_PREFIXES/);
  assert.match(deployPython, /public\/ar\/workbench/);
  assert.match(deployPython, /public\/ar\/targets/);
});
