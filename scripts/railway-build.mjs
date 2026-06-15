import { spawnSync } from "node:child_process";
import { commandForTarget, resolveRailwayTarget } from "./railway-target.mjs";

const target = resolveRailwayTarget();
const command = commandForTarget(target, "build");
console.log(`[railway-build] target=${target}`);
console.log(`[railway-build] ${command}`);
const result = spawnSync(command, { shell: true, stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
