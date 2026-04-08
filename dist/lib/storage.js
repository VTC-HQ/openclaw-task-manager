"use strict";
/**
 * Task Storage Module
 *
 * Hybrid storage:
 * - SQLite: Task registry, runs history, fast queries
 * - JSON files: Task config, notes (per-task persistence)
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
exports.storage = exports.TaskStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
const db_1 = require("./db");
class TaskStorage {
    constructor(tasksDir = path.join(process.env.HOME || "", ".openclaw", "workspace", "tasks"), templatesDir = path.join(__dirname, "..", "templates")) {
        this.tasksDir = tasksDir;
        this.templatesDir = templatesDir;
        // Initialize SQLite database
        const dbPath = path.join(this.tasksDir, "registry.db");
        this.db = new db_1.TaskDB(dbPath);
        this.ensureDirs();
    }
    ensureDirs() {
        fs.mkdirSync(path.join(this.tasksDir, "instances"), { recursive: true });
    }
    generateTaskId() {
        return `task_${Date.now()}_${(0, uuid_1.v4)().split("-")[0]}`;
    }
    // Convert DB record to TaskConfig
    toTaskConfig(record, extra) {
        return {
            taskId: record.task_id,
            template: record.template,
            name: record.name,
            status: record.status,
            cronJobId: record.cron_job_id || "",
            agent: record.agent,
            schedule: record.schedule || "",
            createdAt: record.created_at,
            updatedAt: record.updated_at,
            notesSize: 0,
            state: {
                phase: record.status,
                lastRun: record.last_run_at,
                lastResult: null,
                runCount: record.run_count,
                consecutiveFailures: 0,
            },
            ...extra,
        };
    }
    // Get all tasks from DB
    getAllTasks() {
        const records = this.db.getAllTasks();
        return records.map(r => this.toTaskConfig(r));
    }
    // Get task by ID
    getTask(taskId) {
        const record = this.db.getTask(taskId);
        if (!record)
            return null;
        // Also read notes size from file
        const notesPath = this.getNotesPath(taskId);
        let notesSize = 0;
        if (fs.existsSync(notesPath)) {
            notesSize = fs.statSync(notesPath).size;
        }
        return this.toTaskConfig(record, { notesSize });
    }
    // Create new task
    createTask(template, name, schedule, agent = "main") {
        const taskId = this.generateTaskId();
        const instanceDir = path.join(this.tasksDir, "instances", taskId);
        fs.mkdirSync(instanceDir, { recursive: true });
        fs.mkdirSync(path.join(instanceDir, "history"), { recursive: true });
        const now = new Date().toISOString();
        // Create DB record
        const record = {
            task_id: taskId,
            name,
            template,
            status: "created",
            cron_job_id: null,
            agent,
            schedule,
            created_at: now,
            updated_at: now,
            last_run_at: null,
            run_count: 0,
        };
        this.db.insertTask(record);
        // Copy template files
        const templateDir = path.join(this.templatesDir, template);
        if (fs.existsSync(templateDir)) {
            const rulesFile = path.join(templateDir, "rules.md");
            if (fs.existsSync(rulesFile)) {
                fs.copyFileSync(rulesFile, path.join(instanceDir, "rules.md"));
            }
            const promptFile = path.join(templateDir, "prompt_template.md");
            if (fs.existsSync(promptFile)) {
                fs.copyFileSync(promptFile, path.join(instanceDir, "prompt.md"));
            }
        }
        // Create initial thinking notes
        const notesContent = `# Task: ${name}\n# ID: ${taskId}\n# Created: ${now}\n\n## Goal\nInitializing...\n\n## Log\n- ${now}: Task created\n- Template: ${template}\n\n---\n(Record progress after each execution)\n`;
        fs.writeFileSync(path.join(instanceDir, "思考筆記.md"), notesContent);
        return this.toTaskConfig(record);
    }
    // Update task
    updateTask(taskId, updates) {
        const existing = this.db.getTask(taskId);
        if (!existing)
            return null;
        // Update DB
        const dbUpdates = {};
        if (updates.name !== undefined)
            dbUpdates.name = updates.name;
        if (updates.status !== undefined)
            dbUpdates.status = updates.status;
        if (updates.cronJobId !== undefined)
            dbUpdates.cron_job_id = updates.cronJobId || null;
        if (updates.schedule !== undefined)
            dbUpdates.schedule = updates.schedule;
        if (updates.state?.lastRun !== undefined)
            dbUpdates.last_run_at = updates.state.lastRun;
        if (updates.state?.runCount !== undefined)
            dbUpdates.run_count = updates.state.runCount;
        if (Object.keys(dbUpdates).length > 0) {
            this.db.updateTask(taskId, dbUpdates);
        }
        // Also update JSON config file if exists
        const configPath = path.join(this.tasksDir, "instances", taskId, "config.json");
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            fs.writeFileSync(configPath, JSON.stringify({ ...config, ...updates, updatedAt: new Date().toISOString() }, null, 2));
        }
        return this.getTask(taskId);
    }
    // Delete task
    deleteTask(taskId) {
        const instanceDir = path.join(this.tasksDir, "instances", taskId);
        if (!fs.existsSync(instanceDir))
            return false;
        // Delete from DB
        this.db.deleteTask(taskId);
        // Delete task files
        fs.rmSync(instanceDir, { recursive: true, force: true });
        return true;
    }
    // Record a task run
    recordRun(taskId, status = "started", result, error) {
        const runId = `run_${Date.now()}_${(0, uuid_1.v4)().split("-")[0]}`;
        const now = new Date().toISOString();
        const run = {
            run_id: runId,
            task_id: taskId,
            status,
            started_at: now,
            completed_at: status !== "running" ? now : null,
            result: result || null,
            error: error || null,
        };
        this.db.insertRun(run);
        // Update task's run count and last run
        const task = this.db.getTask(taskId);
        if (task) {
            this.db.updateTask(taskId, {
                last_run_at: now,
                run_count: task.run_count + 1,
            });
        }
        return runId;
    }
    // Complete a run
    completeRun(runId, status, result, error) {
        this.db.updateRun(runId, {
            status,
            completed_at: new Date().toISOString(),
            result: result || null,
            error: error || null,
        });
    }
    // Get runs for a task
    getRuns(taskId, limit = 50) {
        return this.db.getRunsByTask(taskId, limit);
    }
    // Get statistics
    getStats() {
        return this.db.getStats();
    }
    // Search tasks
    searchTasks(query) {
        const records = this.db.searchTasks(query);
        return records.map(r => this.toTaskConfig(r));
    }
    // Notes management
    getNotesPath(taskId) {
        return path.join(this.tasksDir, "instances", taskId, "思考筆記.md");
    }
    getPromptPath(taskId) {
        return path.join(this.tasksDir, "instances", taskId, "prompt.md");
    }
    readNotes(taskId, lines) {
        const notesPath = this.getNotesPath(taskId);
        if (!fs.existsSync(notesPath))
            return null;
        const content = fs.readFileSync(notesPath, "utf-8");
        return lines ? content.split("\n").slice(0, lines).join("\n") : content;
    }
    appendNotes(taskId, content) {
        const notesPath = this.getNotesPath(taskId);
        if (!fs.existsSync(notesPath))
            return false;
        const now = new Date().toISOString();
        const task = this.db.getTask(taskId);
        const runCount = task ? task.run_count + 1 : 1;
        fs.appendFileSync(notesPath, `\n### ${now} (Round ${runCount})\n${content}`);
        return true;
    }
    getNotesSize(taskId) {
        const notesPath = this.getNotesPath(taskId);
        return fs.existsSync(notesPath) ? fs.statSync(notesPath).size : 0;
    }
    compactNotes(taskId) {
        const notesPath = this.getNotesPath(taskId);
        if (!fs.existsSync(notesPath))
            return null;
        const historyDir = path.join(this.tasksDir, "instances", taskId, "history");
        const oldSize = fs.statSync(notesPath).size;
        fs.copyFileSync(notesPath, path.join(historyDir, `backup_${Date.now()}_${Math.round(oldSize / 1024)}KB.md`));
        const content = fs.readFileSync(notesPath, "utf-8");
        const lines = content.split("\n");
        const headerLines = lines.slice(0, 20);
        const sectionStarts = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^### \d{4}-\d{2}-\d{2}/))
                sectionStarts.push(i);
        }
        const newLines = [...headerLines, "", "---", "", "*Historical records distilled (original backed up)*", ""];
        for (const start of sectionStarts.slice(-3)) {
            newLines.push(...lines.slice(start, start + 15), "");
        }
        fs.writeFileSync(notesPath, newLines.join("\n"));
        return { oldSize, newSize: fs.statSync(notesPath).size };
    }
    getTemplates() {
        if (!fs.existsSync(this.templatesDir))
            return [];
        return fs.readdirSync(this.templatesDir).filter(f => fs.statSync(path.join(this.templatesDir, f)).isDirectory());
    }
}
exports.TaskStorage = TaskStorage;
exports.storage = new TaskStorage();
//# sourceMappingURL=storage.js.map