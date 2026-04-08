#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("../lib/storage");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const colors = { red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", blue: "\x1b[34m", NC: "\x1b[0m" };
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.NC} ${msg}`),
    success: (msg) => console.log(`${colors.green}[OK]${colors.NC} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.NC} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.NC} ${msg}`),
};
function getGatewayToken() {
    const configPath = path.join(process.env.HOME || "", ".openclaw", "openclaw.json");
    if (!fs.existsSync(configPath))
        throw new Error("Cannot find openclaw config");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const token = config?.gateway?.auth?.token;
    if (!token)
        throw new Error("Cannot find gateway token");
    return token;
}
function getOpenclawBin() {
    return path.join(process.env.HOME || "", ".nvm", "versions", "node", "v24.14.1", "bin", "openclaw");
}
function openclawCron(args) {
    const token = getGatewayToken();
    return (0, child_process_1.execSync)([getOpenclawBin(), ...args, "--token", token].join(" "), { encoding: "utf-8" });
}
function cmdList() {
    const tasks = storage_1.storage.getAllTasks();
    console.log("\n========================================\n  Task Manager / 任務列表\n========================================\n");
    if (tasks.length === 0) {
        console.log(`  ${colors.yellow}No tasks / 沒有任務${colors.NC}\n`);
        return;
    }
    for (const task of tasks) {
        const sc = task.status === "running" ? colors.green : task.status === "paused" ? colors.yellow : task.status === "failed" ? colors.red : colors.NC;
        console.log(`  ${colors.blue}ID:${colors.NC} ${task.taskId}`);
        console.log(`  ${colors.blue}Name:${colors.NC} ${task.name}`);
        console.log(`  ${colors.blue}Schedule:${colors.NC} ${task.schedule}`);
        console.log(`  ${colors.blue}Status:${colors.NC} ${sc}${task.status}${colors.NC}\n`);
    }
    console.log("========================================\n");
}
function cmdStatus(taskId) {
    const task = storage_1.storage.getTask(taskId);
    if (!task) {
        log.error(`Task not found: ${taskId}`);
        process.exit(1);
    }
    console.log(`\n========================================\n  ${taskId}\n========================================\n`);
    console.log(`  ${colors.blue}Name:${colors.NC} ${task.name}`);
    console.log(`  ${colors.blue}Template:${colors.NC} ${task.template}`);
    console.log(`  ${colors.blue}Cron:${colors.NC} ${task.cronJobId || "N/A"}`);
    console.log(`  ${colors.blue}Schedule:${colors.NC} ${task.schedule}`);
    console.log(`  ${colors.blue}Status:${colors.NC} ${task.status}`);
    console.log(`  ${colors.blue}Runs:${colors.NC} ${task.state.runCount}`);
    console.log(`  ${colors.blue}Last:${colors.NC} ${task.state.lastRun || "None"}\n========================================\n`);
}
function cmdNotes(taskId, lines) {
    const notes = storage_1.storage.readNotes(taskId, lines);
    if (!notes) {
        log.error(`Notes not found: ${taskId}`);
        process.exit(1);
    }
    console.log(`\n========================================\n  Notes: ${taskId}\n========================================\n`);
    console.log(`  Size: ${Math.round(storage_1.storage.getNotesSize(taskId) / 1024)} KB\n----------------------------------------\n${notes}\n----------------------------------------\n`);
}
function cmdCreate(template, name, schedule, agent = "main") {
    const templates = storage_1.storage.getTemplates();
    if (!templates.includes(template)) {
        log.error(`Template not found: ${template}. Available: ${templates.join(", ")}`);
        process.exit(1);
    }
    log.info(`Creating task: ${name}`);
    const task = storage_1.storage.createTask(template, name, schedule, agent);
    log.success(`Task ID: ${task.taskId}`);
    log.info("Creating Cron Job...");
    const notesPath = storage_1.storage.getNotesPath(task.taskId);
    const promptPath = storage_1.storage.getPromptPath(task.taskId);
    let cronMessage = `Execute task: ${name}. Append results to: ${notesPath}`;
    try {
        const output = openclawCron(["cron", "add", "--name", `task:${task.taskId}`, "--cron", schedule, "--session", "isolated", "--agent", agent, "--message", cronMessage]);
        const match = output.match(/[a-f0-9-]{36}/);
        if (match) {
            task.cronJobId = match[0];
            storage_1.storage.updateTask(task.taskId, { cronJobId: task.cronJobId, status: "scheduled" });
            log.success("Cron Job created");
        }
    }
    catch (e) {
        log.warn(`Cron note: ${e.message}`);
    }
    console.log(`\n${colors.green}========================================\n  Task Created!\n========================================\n${colors.NC}  ID: ${task.taskId}\n  Name: ${name}\n  Template: ${template}\n  Schedule: ${schedule}\n\n`);
}
function cmdPause(taskId) {
    const task = storage_1.storage.getTask(taskId);
    if (!task) {
        log.error(`Task not found: ${taskId}`);
        process.exit(1);
    }
    if (task.cronJobId)
        try {
            openclawCron(["cron", "disable", task.cronJobId]);
        }
        catch { }
    storage_1.storage.updateTask(taskId, { status: "paused" });
    log.success(`Task paused: ${taskId}`);
}
function cmdResume(taskId) {
    const task = storage_1.storage.getTask(taskId);
    if (!task) {
        log.error(`Task not found: ${taskId}`);
        process.exit(1);
    }
    if (task.cronJobId)
        try {
            openclawCron(["cron", "enable", task.cronJobId]);
        }
        catch { }
    storage_1.storage.updateTask(taskId, { status: "running" });
    log.success(`Task resumed: ${taskId}`);
}
function cmdDelete(taskId, force = false) {
    const task = storage_1.storage.getTask(taskId);
    if (!task) {
        log.error(`Task not found: ${taskId}`);
        process.exit(1);
    }
    if (!force) {
        console.log(`Confirm delete ${taskId}? (y/N): `);
        const answer = require("readline").createInterface({ input: process.stdin, output: process.stdout }).question("", (a) => { process.exit(a.toLowerCase() === "y" ? 0 : 1); });
        if (answer !== "y") {
            log.info("Cancelled");
            process.exit(0);
        }
    }
    if (task.cronJobId)
        try {
            openclawCron(["cron", "rm", task.cronJobId]);
        }
        catch { }
    storage_1.storage.deleteTask(taskId);
    log.success(`Task deleted: ${taskId}`);
}
function cmdCompact(taskId) {
    const result = storage_1.storage.compactNotes(taskId);
    if (!result) {
        log.error(`Notes not found: ${taskId}`);
        process.exit(1);
    }
    log.success(`Compacted: ${Math.round(result.oldSize / 1024)}KB → ${Math.round(result.newSize / 1024)}KB`);
}
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.log(`\nTask Manager CLI\n\nUsage: openclaw-task <command>\n\nCommands: create, list, status, notes, pause, resume, delete, compact\n\nExamples:\n  openclaw-task create --template news-monitor --name "News" --schedule "0 */4 * * *"\n  openclaw-task list\n  openclaw-task status <id>\n\n`);
        return;
    }
    const cmd = args[0];
    if (cmd === "create") {
        let template = "", name = "", schedule = "", agent = "main";
        for (let i = 1; i < args.length; i++) {
            if (args[i] === "--template" && args[i + 1])
                template = args[++i];
            else if (args[i] === "--name" && args[i + 1])
                name = args[++i];
            else if (args[i] === "--schedule" && args[i + 1])
                schedule = args[++i];
            else if (args[i] === "--agent" && args[i + 1])
                agent = args[++i];
        }
        if (!template || !name || !schedule) {
            log.error("Missing args: --template, --name, --schedule");
            process.exit(1);
        }
        cmdCreate(template, name, schedule, agent);
    }
    else if (cmd === "list")
        cmdList();
    else if (cmd === "status" && args[1])
        cmdStatus(args[1]);
    else if (cmd === "notes" && args[1])
        cmdNotes(args[1], args[2] ? parseInt(args[2]) : 50);
    else if (cmd === "pause" && args[1])
        cmdPause(args[1]);
    else if (cmd === "resume" && args[1])
        cmdResume(args[1]);
    else if (cmd === "delete" && args[1])
        cmdDelete(args[1], args.includes("--force"));
    else if (cmd === "compact" && args[1])
        cmdCompact(args[1]);
    else
        log.error(`Unknown command: ${cmd}`);
}
main();
//# sourceMappingURL=task.js.map