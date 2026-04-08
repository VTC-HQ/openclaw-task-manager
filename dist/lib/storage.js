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
exports.storage = exports.TaskStorage = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const uuid_1 = require("uuid");
class TaskStorage {
    constructor(tasksDir = path.join(process.env.HOME || "", ".openclaw", "workspace", "tasks"), templatesDir = path.join(__dirname, "..", "templates")) {
        this.tasksDir = tasksDir;
        this.templatesDir = templatesDir;
        this.ensureDirs();
    }
    ensureDirs() {
        fs.mkdirSync(path.join(this.tasksDir, "instances"), { recursive: true });
    }
    generateTaskId() {
        return `task_${Date.now()}_${(0, uuid_1.v4)().split("-")[0]}`;
    }
    getAllTasks() {
        const instancesDir = path.join(this.tasksDir, "instances");
        if (!fs.existsSync(instancesDir))
            return [];
        const tasks = [];
        const dirs = fs.readdirSync(instancesDir);
        for (const dir of dirs) {
            const configPath = path.join(instancesDir, dir, "config.json");
            if (fs.existsSync(configPath)) {
                try {
                    tasks.push(JSON.parse(fs.readFileSync(configPath, "utf-8")));
                }
                catch { }
            }
        }
        return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    getTask(taskId) {
        const configPath = path.join(this.tasksDir, "instances", taskId, "config.json");
        if (!fs.existsSync(configPath))
            return null;
        try {
            return JSON.parse(fs.readFileSync(configPath, "utf-8"));
        }
        catch {
            return null;
        }
    }
    createTask(template, name, schedule, agent = "main") {
        const taskId = this.generateTaskId();
        const instanceDir = path.join(this.tasksDir, "instances", taskId);
        fs.mkdirSync(instanceDir, { recursive: true });
        fs.mkdirSync(path.join(instanceDir, "history"), { recursive: true });
        const now = new Date().toISOString();
        const config = {
            taskId, template, name, status: "created", cronJobId: "", agent, schedule,
            createdAt: now, updatedAt: now, notesSize: 0,
            state: { phase: "initialized", lastRun: null, lastResult: null, runCount: 0, consecutiveFailures: 0 },
        };
        fs.writeFileSync(path.join(instanceDir, "config.json"), JSON.stringify(config, null, 2));
        const templateDir = path.join(this.templatesDir, template);
        if (fs.existsSync(templateDir)) {
            const rulesFile = path.join(templateDir, "rules.md");
            if (fs.existsSync(rulesFile))
                fs.copyFileSync(rulesFile, path.join(instanceDir, "rules.md"));
            const promptFile = path.join(templateDir, "prompt_template.md");
            if (fs.existsSync(promptFile))
                fs.copyFileSync(promptFile, path.join(instanceDir, "prompt.md"));
        }
        const notesContent = `# Task: ${name}\n# ID: ${taskId}\n# Created: ${now}\n\n## Goal\nInitializing...\n\n## Log\n- ${now}: Task created\n- Template: ${template}\n\n---\n(Record progress after each execution)\n`;
        fs.writeFileSync(path.join(instanceDir, "思考筆記.md"), notesContent);
        return config;
    }
    updateTask(taskId, updates) {
        const task = this.getTask(taskId);
        if (!task)
            return null;
        const updated = { ...task, ...updates, taskId: task.taskId, updatedAt: new Date().toISOString() };
        fs.writeFileSync(path.join(this.tasksDir, "instances", taskId, "config.json"), JSON.stringify(updated, null, 2));
        return updated;
    }
    deleteTask(taskId) {
        const instanceDir = path.join(this.tasksDir, "instances", taskId);
        if (!fs.existsSync(instanceDir))
            return false;
        fs.rmSync(instanceDir, { recursive: true, force: true });
        return true;
    }
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
        const task = this.getTask(taskId);
        const runCount = task ? task.state.runCount + 1 : 1;
        fs.appendFileSync(notesPath, `\n### ${now} (Round ${runCount})\n${content}`);
        this.updateTask(taskId, { notesSize: fs.statSync(notesPath).size });
        return true;
    }
    getNotesSize(taskId) {
        const notesPath = this.getNotesPath(taskId);
        return fs.existsSync(notesPath) ? fs.statSync(notesPath).size : 0;
    }
    compactNotes(taskId) {
        const task = this.getTask(taskId);
        if (!task)
            return null;
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