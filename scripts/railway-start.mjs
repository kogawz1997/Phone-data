import { spawnSync } from "node:child_process";
import { commandForTarget, resolveRailwayTarget } from "./railway-target.mjs";

const target = resolveRailwayTarget();
const command = commandForTarget(target, "start");
console.log(`[railway-start] target=${target}`);
console.log(`[railway-start] ${command}`);
const result = spawnSync(command, { shell: true, stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
