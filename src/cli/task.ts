#!/usr/bin/env node

/**
 * Task Manager CLI
 * 
 * Commands:
 *   create, list, status, notes, pause, resume, delete, compact, stats
 */

import { storage } from "../lib/storage";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const colors = { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", blue: "\x1b[34m", NC: "\x1b[0m" };

const log = {
  info: (msg: string) => console.log(`${colors.blue}[INFO]${colors.NC} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}[OK]${colors.NC} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}[WARN]${colors.NC} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}[ERROR]${colors.NC} ${msg}`),
};

function getGatewayToken(): string {
  const configPath = path.join(process.env.HOME || "", ".openclaw", "openclaw.json");
  if (!fs.existsSync(configPath)) throw new Error("Cannot find openclaw config");
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const token = config?.gateway?.auth?.token;
  if (!token) throw new Error("Cannot find gateway token");
  return token;
}

function getOpenclawBin(): string {
  return path.join(process.env.HOME || "", ".nvm", "versions", "node", "v24.14.1", "bin", "openclaw");
}

function openclawCron(args: string[]): string {
  const token = getGatewayToken();
  return execSync(`"${getOpenclawBin()}" ${args.join(" ")} --token "${token}"`, { encoding: "utf-8" });
}

function cmdList() {
  const tasks = storage.getAllTasks();
  console.log(`\n${colors.blue}========================================${colors.NC}`);
  console.log(`${colors.blue}  Task Manager${colors.NC} (${tasks.length} tasks)`);
  console.log(`${colors.blue}========================================${colors.NC}\n`);
  
  if (tasks.length === 0) {
    console.log(`  ${colors.yellow}No tasks${colors.NC}\n`);
    return;
  }

  for (const task of tasks) {
    const sc = task.status === "running" ? colors.green : task.status === "paused" ? colors.yellow : task.status === "failed" ? colors.red : colors.NC;
    const pc = task.priority === "high" ? colors.red : task.priority === "medium" ? colors.yellow : colors.green;
    console.log(`  ${colors.blue}ID:${colors.NC} ${task.taskId}`);
    console.log(`  ${colors.blue}Name:${colors.NC} ${task.name}`);
    console.log(`  ${colors.blue}Template:${colors.NC} ${task.template}`);
    console.log(`  ${colors.blue}Priority:${colors.NC} ${pc}${task.priority}${colors.NC} (${PRIORITY_SCHEDULES[task.priority]})`);
    console.log(`  ${colors.blue}Schedule:${colors.NC} ${task.schedule}`);
    console.log(`  ${colors.blue}Runs:${colors.NC} ${task.state.runCount}`);
    console.log(`  ${colors.blue}Status:${colors.NC} ${sc}${task.status}${colors.NC}\n`);
  }
}

function cmdStats() {
  const stats = storage.getStats();
  console.log(`\n${colors.blue}========================================${colors.NC}`);
  console.log(`${colors.blue}  Task Statistics${colors.NC}`);
  console.log(`${colors.blue}========================================${colors.NC}\n`);
  console.log(`  ${colors.blue}Total Tasks:${colors.NC} ${stats.total}\n`);
  
  console.log(`  ${colors.blue}By Status:${colors.NC}`);
  for (const [status, count] of Object.entries(stats.byStatus)) {
    console.log(`    - ${status}: ${count}`);
  }
  console.log();
  
  console.log(`  ${colors.blue}By Template:${colors.NC}`);
  for (const [tmpl, count] of Object.entries(stats.byTemplate)) {
    console.log(`    - ${tmpl}: ${count}`);
  }
  console.log();
}

function cmdStatus(taskId: string) {
  const task = storage.getTask(taskId);
  if (!task) { log.error(`Task not found: ${taskId}`); process.exit(1); }
  
  console.log(`\n${colors.blue}========================================${colors.NC}`);
  console.log(`${colors.blue}  ${task.name}${colors.NC}`);
  console.log(`${colors.blue}========================================${colors.NC}\n`);
  
  const pc = task.priority === "high" ? colors.red : task.priority === "medium" ? colors.yellow : colors.green;
  
  console.log(`  ${colors.blue}ID:${colors.NC} ${task.taskId}`);
  console.log(`  ${colors.blue}Template:${colors.NC} ${task.template}`);
  console.log(`  ${colors.blue}Priority:${colors.NC} ${pc}${task.priority}${colors.NC}`);
  console.log(`  ${colors.blue}Cron:${colors.NC} ${task.cronJobId || "N/A"}`);
  console.log(`  ${colors.blue}Schedule:${colors.NC} ${task.schedule}`);
  console.log(`  ${colors.blue}Agent:${colors.NC} ${task.agent}`);
  console.log(`  ${colors.blue}Status:${colors.NC} ${task.status}`);
  console.log(`  ${colors.blue}Phase:${colors.NC} ${task.state.phase}`);
  console.log(`  ${colors.blue}Runs:${colors.NC} ${task.state.runCount}`);
  console.log(`  ${colors.blue}Last Run:${colors.NC} ${task.state.lastRun || "None"}`);
  console.log(`  ${colors.blue}Created:${colors.NC} ${task.createdAt}\n`);
  
  // Show recent runs
  const runs = storage.getRuns(taskId, 5);
  if (runs.length > 0) {
    console.log(`  ${colors.blue}Recent Runs:${colors.NC}`);
    for (const run of runs) {
      const runStatus = run.status === "succeeded" ? colors.green : run.status === "failed" ? colors.red : colors.yellow;
      console.log(`    - ${run.started_at}: ${runStatus}${run.status}${colors.NC}`);
    }
    console.log();
  }
}

function cmdNotes(taskId: string, lines?: number) {
  const notes = storage.readNotes(taskId, lines);
  if (!notes) { log.error(`Notes not found: ${taskId}`); process.exit(1); }
  console.log(`\n${colors.blue}========================================${colors.NC}`);
  console.log(`${colors.blue}  Notes: ${taskId}${colors.NC}`);
  console.log(`${colors.blue}========================================${colors.NC}\n`);
  console.log(`  Size: ${Math.round(storage.getNotesSize(taskId) / 1024)} KB\n`);
  console.log(`${colors.yellow}----------------------------------------${colors.NC}\n`);
  console.log(notes);
  console.log(`\n${colors.yellow}----------------------------------------${colors.NC}\n`);
}

function cmdRuns(taskId: string, limit?: number) {
  const runs = storage.getRuns(taskId, limit || 20);
  console.log(`\n${colors.blue}========================================${colors.NC}`);
  console.log(`${colors.blue}  Runs: ${taskId}${colors.NC}`);
  console.log(`${colors.blue}========================================${colors.NC}\n`);
  
  if (runs.length === 0) {
    console.log(`  ${colors.yellow}No runs${colors.NC}\n`);
    return;
  }
  
  for (const run of runs) {
    const runStatus = run.status === "succeeded" ? colors.green : run.status === "failed" ? colors.red : colors.yellow;
    console.log(`  ${colors.blue}${run.started_at}${colors.NC}`);
    console.log(`    Status: ${runStatus}${run.status}${colors.NC}`);
    if (run.result) console.log(`    Result: ${run.result.substring(0, 100)}...`);
    if (run.error) console.log(`    ${colors.red}Error:${colors.NC} ${run.error}`);
    console.log();
  }
}

import { Priority, PRIORITY_SCHEDULES, PRIORITY_DESCRIPTIONS } from "../lib/storage";

function cmdCreate(template: string, name: string, schedule: string, agent: string = "main", priority: Priority = "low") {
  const templates = storage.getTemplates();
  if (!templates.includes(template)) {
    log.error(`Template not found: ${template}. Available: ${templates.join(", ")}`);
    process.exit(1);
  }
  
  // Use priority-based schedule if not explicitly provided
  const finalSchedule = schedule || PRIORITY_SCHEDULES[priority];
  
  log.info(`Creating task: ${name}`);
  log.info(`Priority: ${priority} (${PRIORITY_DESCRIPTIONS[priority]})`);
  const task = storage.createTask(template, name, finalSchedule, agent, priority);
  log.success(`Task ID: ${task.taskId}`);
  
  // Create Cron Job
  log.info("Creating Cron Job...");
  const notesPath = storage.getNotesPath(task.taskId);
  
  try {
    const cronMessage = `Execute task: ${name}. Append results to: ${notesPath}`;
    const output = openclawCron([
      "cron", "add",
      "--name", `task:${task.taskId}`,
      "--cron", finalSchedule,
      "--session", "isolated",
      "--agent", agent,
      "--message", cronMessage,
    ]);
    
    const match = output.match(/[a-f0-9-]{36}/);
    if (match) {
      storage.updateTask(task.taskId, { cronJobId: match[0], status: "scheduled" });
      log.success("Cron Job created");
    }
  } catch (e: any) {
    log.warn(`Cron note: ${e.message}`);
  }
  
  console.log(`\n${colors.green}========================================${colors.NC}`);
  console.log(`${colors.green}  Task Created!${colors.NC}`);
  console.log(`${colors.green}========================================${colors.NC}`);
  console.log(`  ID: ${task.taskId}`);
  console.log(`  Name: ${name}`);
  console.log(`  Template: ${template}`);
  console.log(`  Schedule: ${schedule}`);
  console.log(`  Agent: ${agent}\n`);
}

function cmdPause(taskId: string) {
  const task = storage.getTask(taskId);
  if (!task) { log.error(`Task not found: ${taskId}`); process.exit(1); }
  
  if (task.cronJobId) {
    try { openclawCron(["cron", "disable", task.cronJobId]); } catch {}
  }
  storage.updateTask(taskId, { status: "paused" });
  log.success(`Task paused: ${taskId}`);
}

function cmdResume(taskId: string) {
  const task = storage.getTask(taskId);
  if (!task) { log.error(`Task not found: ${taskId}`); process.exit(1); }
  
  if (task.cronJobId) {
    try { openclawCron(["cron", "enable", task.cronJobId]); } catch {}
  }
  storage.updateTask(taskId, { status: "running" });
  log.success(`Task resumed: ${taskId}`);
}

function cmdDelete(taskId: string, force: boolean = false) {
  const task = storage.getTask(taskId);
  if (!task) { log.error(`Task not found: ${taskId}`); process.exit(1); }
  
  if (!force) {
    console.log(`Confirm delete ${taskId}? (y/N): `);
    const answer = require("readline").createInterface({ input: process.stdin, output: process.stdout }).question("", (a: string) => {
      (process as any).exit(a.toLowerCase() === "y" ? 0 : 1);
    });
    if (answer !== "y") { log.info("Cancelled"); process.exit(0); }
  }
  
  if (task.cronJobId) {
    try { openclawCron(["cron", "rm", task.cronJobId]); } catch {}
  }
  storage.deleteTask(taskId);
  log.success(`Task deleted: ${taskId}`);
}

function cmdCompact(taskId: string) {
  const result = storage.compactNotes(taskId);
  if (!result) { log.error(`Notes not found: ${taskId}`); process.exit(1); }
  log.success(`Compacted: ${Math.round(result.oldSize / 1024)}KB → ${Math.round(result.newSize / 1024)}KB`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
${colors.blue}Task Manager CLI${colors.NC}

Usage: openclaw-task <command> [options]

Commands:
  create   --template <tmpl> --name <name> --schedule <cron> [--agent <agent>]
  list                          List all tasks
  stats                         Show statistics
  status   <task-id>            Show task status
  runs     <task-id> [limit]    Show task runs
  notes    <task-id> [lines]    View thinking notes
  pause    <task-id>            Pause task
  resume   <task-id>            Resume task
  delete   <task-id> [--force]  Delete task
  compact  <task-id>            Compact notes

Examples:
  openclaw-task create --template news-monitor --name "News" --schedule "0 */4 * * *"
  openclaw-task list
  openclaw-task stats
  openclaw-task status task_xxx
`);
    return;
  }

  const cmd = args[0];

  if (cmd === "create") {
    let template = "", name = "", schedule = "", agent = "main", priority: Priority = "low";
    for (let i = 1; i < args.length; i++) {
      if (args[i] === "--template" && args[i + 1]) template = args[++i];
      else if (args[i] === "--name" && args[i + 1]) name = args[++i];
      else if (args[i] === "--schedule" && args[i + 1]) schedule = args[++i];
      else if (args[i] === "--agent" && args[i + 1]) agent = args[++i];
      else if (args[i] === "--priority" && args[i + 1]) priority = args[++i] as Priority;
    }
    if (!template || !name) {
      log.error("Missing args: --template, --name");
      console.log("Usage: openclaw-task create --template <tmpl> --name <name> [--schedule <cron>] [--priority high|medium|low] [--agent <agent>]");
      process.exit(1);
    }
    cmdCreate(template, name, schedule, agent, priority);
  } else if (cmd === "list") {
    cmdList();
  } else if (cmd === "stats") {
    cmdStats();
  } else if (cmd === "status" && args[1]) {
    cmdStatus(args[1]);
  } else if (cmd === "runs" && args[1]) {
    cmdRuns(args[1], args[2] ? parseInt(args[2]) : 20);
  } else if (cmd === "notes" && args[1]) {
    cmdNotes(args[1], args[2] ? parseInt(args[2]) : 50);
  } else if (cmd === "pause" && args[1]) {
    cmdPause(args[1]);
  } else if (cmd === "resume" && args[1]) {
    cmdResume(args[1]);
  } else if (cmd === "delete" && args[1]) {
    cmdDelete(args[1], args.includes("--force"));
  } else if (cmd === "compact" && args[1]) {
    cmdCompact(args[1]);
  } else {
    log.error(`Unknown command: ${cmd}`);
    process.exit(1);
  }
}

main();
