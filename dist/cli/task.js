#!/usr/bin/env node
"use strict";
/**
 * Task Manager CLI / 任務管理 CLI
 *
 * Usage:
 *   openclaw task create --template <tmpl> --name <name> --schedule <cron>
 *   openclaw task list
 *   openclaw task status <task-id>
 *   openclaw task notes <task-id> [lines]
 *   openclaw task pause <task-id>
 *   openclaw task resume <task-id>
 *   openclaw task delete <task-id> [--force]
 *   openclaw task compact <task-id>
 */
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
// Colors / 顏色
const colors = {
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    NC: "\x1b[0m",
};
const log = {
    info: (msg) => console.log(`${colors.blue}[INFO]${colors.NC} ${msg}`),
    success: (msg) => console.log(`${colors.green}[OK]${colors.NC} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.NC} ${msg}`),
    error: (msg) => console.log(`${colors.red}[ERROR]${colors.NC} ${msg}`),
};
// Get gateway token / 獲取 gateway token
function getGatewayToken() {
    const configPath = path.join(process.env.HOME, ".openclaw", "openclaw.json");
    if (!fs.existsSync(configPath)) {
        throw new Error("Cannot find openclaw config");
    }
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const token = config?.gateway?.auth?.token;
    if (!token) {
        throw new Error("Cannot find gateway token");
    }
    return token;
}
// OpenClaw CLI wrapper / OpenClaw CLI 包裝
function openclawCron(args) {
    const token = getGatewayToken();
    const cmd = [
        path.join(process.env.HOME, ".nvm", "versions", "node", "v24.14.1", "bin", "openclaw"),
        ...args,
        "--token",
        token,
    ];
    return (0, child_process_1.execSync)(cmd.join(" "), { encoding: "utf-8" });
}
// Command: list / 命令：列表
function cmdList() {
    const tasks = storage_1.storage.getAllTasks();
    console.log("\n========================================");
    console.log("         Task Manager / 任務列表        ");
    console.log("========================================\n");
    if (tasks.length === 0) {
        console.log(`  ${colors.yellow}No tasks found / 沒有任務${colors.NC}`);
        console.log("\n========================================\n");
        return;
    }
    for (const task of tasks) {
        const statusColor = task.status === "running"
            ? colors.green
            : task.status === "paused"
                ? colors.yellow
                : task.status === "failed"
                    ? colors.red
                    : colors.NC;
        console.log(`  ${colors.blue}ID:${colors.NC} ${task.taskId}`);
        console.log(`  ${colors.blue}Name:${colors.NC} ${task.name}`);
        console.log(`  ${colors.blue}Template:${colors.NC} ${task.template}`);
        console.log(`  ${colors.blue}Schedule:${colors.NC} ${task.schedule}`);
        console.log(`  ${colors.blue}Run Count:${colors.NC} ${task.state.runCount}`);
        console.log(`  ${colors.blue}Status:${colors.NC} ${statusColor}${task.status}${colors.NC}`);
        console.log("");
    }
    console.log("========================================\n");
}
// Command: status / 命令：狀態
function cmdStatus(taskId) {
    const task = storage_1.storage.getTask(taskId);
    if (!task) {
        log.error(`Task not found / 找不到任務: ${taskId}`);
        process.exit(1);
    }
    console.log("\n========================================");
    console.log(`     Task Status / 任務狀態 - ${taskId}     `);
    console.log("========================================\n");
    console.log(`  ${colors.blue}Task ID:${colors.NC} ${task.taskId}`);
    console.log(`  ${colors.blue}Name:${colors.NC} ${task.name}`);
    console.log(`  ${colors.blue}Template:${colors.NC} ${task.template}`);
    console.log(`  ${colors.blue}Cron Job ID:${colors.NC} ${task.cronJobId || "N/A"}`);
    console.log(`  ${colors.blue}Schedule:${colors.NC} ${task.schedule}`);
    console.log(`  ${colors.blue}Agent:${colors.NC} ${task.agent}`);
    console.log(`  ${colors.blue}Status:${colors.NC} ${task.status}`);
    console.log(`  ${colors.blue}Phase:${colors.NC} ${task.state.phase}`);
    console.log(`  ${colors.blue}Run Count:${colors.NC} ${task.state.runCount}`);
    console.log(`  ${colors.blue}Last Run:${colors.NC} ${task.state.lastRun || "None"}`);
    console.log(`  ${colors.blue}Last Result:${colors.NC} ${task.state.lastResult || "N/A"}`);
    console.log(`  ${colors.blue}Created:${colors.NC} ${task.createdAt}`);
    console.log("\n========================================\n");
}
// Command: notes / 命令：筆記
function cmdNotes(taskId, lines) {
    const notes = storage_1.storage.readNotes(taskId, lines);
    if (notes === null) {
        log.error(`Notes not found / 找不到筆記: ${taskId}`);
        process.exit(1);
    }
    const size = storage_1.storage.getNotesSize(taskId);
    console.log("\n========================================");
    console.log(`     Thinking Notes / 思考筆記 - ${taskId}     `);
    console.log("========================================\n");
    console.log(`  ${colors.blue}Size:${colors.NC} ${Math.round(size / 1024)} KB`);
    console.log("\n----------------------------------------\n");
    console.log(notes);
    if (lines) {
        console.log("\n... (truncated / 已截斷)");
    }
    console.log("\n----------------------------------------\n");
}
// Command: create / 命令：創建
function cmdCreate(template, name, schedule, agent = "main") {
    // Validate template / 驗證模板
    const templates = storage_1.storage.getTemplates();
    if (!templates.includes(template)) {
        log.error(`Template not found / 找不到模板: ${template}`);
        console.log(`  Available templates / 可用模板: ${templates.join(", ")}`);
        process.exit(1);
    }
    log.info(`Creating task / 創建任務: ${name}`);
    // Create task instance / 創建任務實例
    const task = storage_1.storage.createTask(template, name, schedule, agent);
    log.success(`Task ID / 任務 ID: ${task.taskId}`);
    // Create Cron Job / 創建 Cron Job
    log.info("Creating Cron Job / 創建 Cron Job...");
    const notesPath = storage_1.storage.getNotesPath(task.taskId);
    const promptPath = storage_1.storage.getPromptPath(task.taskId);
    try {
        // Read prompt for cron message / 讀取 prompt 作為 cron 消息
        let cronMessage = `Please execute task: ${name}. After completion, append results to notes file.`;
        if (fs.existsSync(promptPath)) {
            const promptContent = fs.readFileSync(promptPath, "utf-8");
            cronMessage = `Task: ${name}\n\nPlease follow the instructions in the prompt file and execute the task. After completion, append your results to: ${notesPath}`;
        }
        const cronOutput = openclawCron([
            "cron",
            "add",
            "--name",
            `task:${task.taskId}`,
            "--cron",
            schedule,
            "--session",
            "isolated",
            "--agent",
            agent,
            "--message",
            cronMessage,
        ]);
        // Extract cron job ID / 提取 cron job ID
        const cronIdMatch = cronOutput.match(/[a-f0-9-]{36}/);
        if (cronIdMatch) {
            task.cronJobId = cronIdMatch[0];
            storage_1.storage.updateTask(task.taskId, {
                cronJobId: task.cronJobId,
                status: "scheduled",
            });
            log.success("Cron Job created / Cron Job 已創建");
        }
    }
    catch (e) {
        log.warn(`Cron Job creation note / Cron Job 創建備註: ${e.message}`);
    }
    console.log("\n" + "=".repeat(40));
    log.success("Task created successfully / 任務創建成功！");
    console.log("=".repeat(40));
    console.log(`  ${colors.blue}Task ID:${colors.NC} ${task.taskId}`);
    console.log(`  ${colors.blue}Name:${colors.NC} ${name}`);
    console.log(`  ${colors.blue}Template:${colors.NC} ${template}`);
    console.log(`  ${colors.blue}Schedule:${colors.NC} ${schedule}`);
    console.log(`  ${colors.blue}Agent:${colors.NC} ${agent}`);
    console.log(`  ${colors.blue}Notes:${colors.NC} ${notesPath}`);
    console.log("");
}
// Command: pause / 命令：暫停
function cmdPause(taskId) {
    const task = storage_1.storage.getTask(taskId);
    if (!task) {
        log.error(`Task not found / 找不到任務: ${taskId}`);
        process.exit(1);
    }
    if (task.cronJobId) {
        try {
            openclawCron(["cron", "disable", task.cronJobId]);
        }
        catch (e) {
            // Ignore errors
        }
    }
    storage_1.storage.updateTask(taskId, { status: "paused" });
    log.success(`Task paused / 任務已暫停: ${taskId}`);
}
// Command: resume / 命令：恢復
function cmdResume(taskId) {
    const task = storage_1.storage.getTask(taskId);
    if (!task) {
        log.error(`Task not found / 找不到任務: ${taskId}`);
        process.exit(1);
    }
    if (task.cronJobId) {
        try {
            openclawCron(["cron", "enable", task.cronJobId]);
        }
        catch (e) {
            // Ignore errors
        }
    }
    storage_1.storage.updateTask(taskId, { status: "running" });
    log.success(`Task resumed / 任務已恢復: ${taskId}`);
}
// Command: delete / 命令：刪除
function cmdDelete(taskId, force = false) {
    const task = storage_1.storage.getTask(taskId);
    if (!task) {
        log.error(`Task not found / 找不到任務: ${taskId}`);
        process.exit(1);
    }
    if (!force) {
        console.log(`Confirm delete / 確認刪除: ${taskId}? (y/N): `);
        const readline = require("readline");
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        rl.question("", (answer) => {
            rl.close();
            if (answer.toLowerCase() !== "y") {
                log.info("Cancelled / 已取消");
                process.exit(0);
            }
            doDelete(taskId, task);
        });
    }
    else {
        doDelete(taskId, task);
    }
}
function doDelete(taskId, task) {
    if (task.cronJobId) {
        try {
            openclawCron(["cron", "rm", task.cronJobId]);
            log.info(`Cron Job deleted / Cron Job 已刪除: ${task.cronJobId}`);
        }
        catch (e) {
            // Ignore errors
        }
    }
    storage_1.storage.deleteTask(taskId);
    log.success(`Task deleted / 任務已刪除: ${taskId}`);
}
// Command: compact / 命令：壓縮
function cmdCompact(taskId) {
    const result = storage_1.storage.compactNotes(taskId);
    if (!result) {
        log.error(`Notes not found / 找不到筆記: ${taskId}`);
        process.exit(1);
    }
    log.success(`Notes compacted / 筆記已壓縮: ${Math.round(result.oldSize / 1024)} KB → ${Math.round(result.newSize / 1024)} KB`);
}
// Main CLI / 主 CLI
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        printHelp();
        return;
    }
    const command = args[0];
    switch (command) {
        case "create": {
            let template = "", name = "", schedule = "", agent = "main";
            for (let i = 1; i < args.length; i++) {
                if (args[i] === "--template" && args[i + 1]) {
                    template = args[++i];
                }
                else if (args[i] === "--name" && args[i + 1]) {
                    name = args[++i];
                }
                else if (args[i] === "--schedule" && args[i + 1]) {
                    schedule = args[++i];
                }
                else if (args[i] === "--agent" && args[i + 1]) {
                    agent = args[++i];
                }
            }
            if (!template || !name || !schedule) {
                log.error("Missing required arguments / 缺少必要參數");
                console.log("Usage: openclaw task create --template <tmpl> --name <name> --schedule <cron> [--agent <agent>]");
                process.exit(1);
            }
            cmdCreate(template, name, schedule, agent);
            break;
        }
        case "list":
            cmdList();
            break;
        case "status":
            if (!args[1]) {
                log.error("Missing task ID / 缺少任務 ID");
                process.exit(1);
            }
            cmdStatus(args[1]);
            break;
        case "notes":
            if (!args[1]) {
                log.error("Missing task ID / 缺少任務 ID");
                process.exit(1);
            }
            cmdNotes(args[1], args[2] ? parseInt(args[2]) : 50);
            break;
        case "pause":
            if (!args[1]) {
                log.error("Missing task ID / 缺少任務 ID");
                process.exit(1);
            }
            cmdPause(args[1]);
            break;
        case "resume":
            if (!args[1]) {
                log.error("Missing task ID / 缺少任務 ID");
                process.exit(1);
            }
            cmdResume(args[1]);
            break;
        case "delete":
            if (!args[1]) {
                log.error("Missing task ID / 缺少任務 ID");
                process.exit(1);
            }
            cmdDelete(args[1], args.includes("--force") || args.includes("-f"));
            break;
        case "compact":
            if (!args[1]) {
                log.error("Missing task ID / 缺少任務 ID");
                process.exit(1);
            }
            cmdCompact(args[1]);
            break;
        case "--help":
        case "-h":
            printHelp();
            break;
        default:
            log.error(`Unknown command / 未知命令: ${command}`);
            printHelp();
            process.exit(1);
    }
}
function printHelp() {
    console.log(`
Task Manager CLI / 任務管理 CLI

Usage / 用法: openclaw-task <command> [options]

Commands / 命令:
  create    Create a new task / 創建新任務
  list      List all tasks / 列出所有任務
  status    Show task status / 顯示任務狀態
  notes     View thinking notes / 查看思考筆記
  pause     Pause a task / 暫停任務
  resume    Resume a task / 恢復任務
  delete    Delete a task / 刪除任務
  compact   Compact notes / 壓縮筆記

Examples / 範例:
  openclaw-task create --template news-monitor --name "Bitcoin" --schedule "0 */4 * * *"
  openclaw-task list
  openclaw-task status task_xxx
  openclaw-task notes task_xxx 100
  openclaw-task pause task_xxx
  openclaw-task delete task_xxx --force
`);
}
main();
//# sourceMappingURL=task.js.map