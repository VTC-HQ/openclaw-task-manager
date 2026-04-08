"use strict";
/**
 * Task Storage Module / 任務存儲模組
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
class TaskStorage {
    constructor(tasksDir = path.join(process.env.HOME, ".openclaw", "workspace", "tasks"), templatesDir = path.join(__dirname, "..", "templates")) {
        this.tasksDir = tasksDir;
        this.templatesDir = templatesDir;
        this.ensureDirs();
    }
    ensureDirs() {
        fs.mkdirSync(path.join(this.tasksDir, "templates"), { recursive: true });
        fs.mkdirSync(path.join(this.tasksDir, "instances"), { recursive: true });
    }
    /**
     * Generate unique task ID / 生成唯一任務 ID
     */
    generateTaskId() {
        return `task_${Date.now()}_${(0, uuid_1.v4)().split("-")[0]}`;
    }
    /**
     * Get all task instances / 獲取所有任務實例
     */
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
                    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
                    tasks.push(config);
                }
                catch (e) {
                    // Skip invalid configs
                }
            }
        }
        return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    /**
     * Get task by ID / 根據 ID 獲取任務
     */
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
    /**
     * Create new task / 創建新任務
     */
    createTask(template, name, schedule, agent = "main") {
        const taskId = this.generateTaskId();
        const instanceDir = path.join(this.tasksDir, "instances", taskId);
        fs.mkdirSync(instanceDir, { recursive: true });
        fs.mkdirSync(path.join(instanceDir, "history"), { recursive: true });
        const now = new Date().toISOString();
        const config = {
            taskId,
            template,
            name,
            status: "created",
            cronJobId: "",
            agent,
            schedule,
            createdAt: now,
            updatedAt: now,
            notesSize: 0,
            state: {
                phase: "initialized",
                lastRun: null,
                lastResult: null,
                runCount: 0,
                consecutiveFailures: 0,
            },
        };
        // Write config
        fs.writeFileSync(path.join(instanceDir, "config.json"), JSON.stringify(config, null, 2));
        // Copy template files
        const templateDir = path.join(this.templatesDir, template);
        if (fs.existsSync(templateDir)) {
            const templateConfig = path.join(templateDir, "config.json");
            if (fs.existsSync(templateConfig)) {
                // Already in config
            }
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
        const notesContent = `# 任務：${name}
# Task ID: ${taskId}
# 建立時間 / Created: ${now}

## 任務目標 / Task Goal
初始化中... / Initializing...

## 初始化日誌 / Initialization Log
- ${now}: 任務建立 / Task created
- 模板 / Template: ${template}
- 排程 / Schedule: ${schedule}
- 代理 / Agent: ${agent}

---

（每次執行後在此處記錄推進內容 / Record progress after each execution）
`;
        fs.writeFileSync(path.join(instanceDir, "思考筆記.md"), notesContent, "utf8");
        return config;
    }
    /**
     * Update task / 更新任務
     */
    updateTask(taskId, updates) {
        const task = this.getTask(taskId);
        if (!task)
            return null;
        const updated = {
            ...task,
            ...updates,
            taskId: task.taskId, // Prevent ID change
            updatedAt: new Date().toISOString(),
        };
        fs.writeFileSync(path.join(this.tasksDir, "instances", taskId, "config.json"), JSON.stringify(updated, null, 2));
        return updated;
    }
    /**
     * Delete task / 刪除任務
     */
    deleteTask(taskId) {
        const instanceDir = path.join(this.tasksDir, "instances", taskId);
        if (!fs.existsSync(instanceDir))
            return false;
        fs.rmSync(instanceDir, { recursive: true, force: true });
        return true;
    }
    /**
     * Get notes file path / 獲取筆記檔案路徑
     */
    getNotesPath(taskId) {
        return path.join(this.tasksDir, "instances", taskId, "思考筆記.md");
    }
    /**
     * Get prompt file path / 獲取 prompt 檔案路徑
     */
    getPromptPath(taskId) {
        return path.join(this.tasksDir, "instances", taskId, "prompt.md");
    }
    /**
     * Read notes / 讀取筆記
     */
    readNotes(taskId, lines) {
        const notesPath = this.getNotesPath(taskId);
        if (!fs.existsSync(notesPath))
            return null;
        if (lines) {
            const content = fs.readFileSync(notesPath, "utf-8");
            const allLines = content.split("\n");
            return allLines.slice(0, lines).join("\n");
        }
        return fs.readFileSync(notesPath, "utf-8");
    }
    /**
     * Append to notes / 追加筆記
     */
    appendNotes(taskId, content) {
        const notesPath = this.getNotesPath(taskId);
        if (!fs.existsSync(notesPath))
            return false;
        const now = new Date().toISOString();
        const task = this.getTask(taskId);
        const runCount = task ? task.state.runCount + 1 : 1;
        const entry = `

### ${now} (第${runCount}輪 / Round ${runCount})
${content}
`;
        fs.appendFileSync(notesPath, entry, "utf8");
        // Update notes size
        const stats = fs.statSync(notesPath);
        this.updateTask(taskId, { notesSize: stats.size });
        return true;
    }
    /**
     * Get notes size in bytes / 獲取筆記大小
     */
    getNotesSize(taskId) {
        const notesPath = this.getNotesPath(taskId);
        if (!fs.existsSync(notesPath))
            return 0;
        return fs.statSync(notesPath).size;
    }
    /**
     * Compact notes / 壓縮筆記
     */
    compactNotes(taskId) {
        const task = this.getTask(taskId);
        if (!task)
            return null;
        const notesPath = this.getNotesPath(taskId);
        if (!fs.existsSync(notesPath))
            return null;
        const historyDir = path.join(this.tasksDir, "instances", taskId, "history");
        const oldSize = fs.statSync(notesPath).size;
        // Backup
        const backupName = `backup_${Date.now()}_${Math.round(oldSize / 1024)}KB.md`;
        fs.copyFileSync(notesPath, path.join(historyDir, backupName));
        // Compact: keep first 20 lines (header) + last 3 entries
        const content = fs.readFileSync(notesPath, "utf-8");
        const lines = content.split("\n");
        // Find section headers (### YYYY-MM-DD)
        const sectionStarts = [];
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/^### \d{4}-\d{2}-\d{2}/)) {
                sectionStarts.push(i);
            }
        }
        // Build new content
        const headerLines = lines.slice(0, 20);
        const recentSections = sectionStarts.slice(-3);
        const newLines = [...headerLines];
        // Add separator
        newLines.push("", "---", "");
        newLines.push("*以下為歷史記錄蒸餾版（原始檔案已備份）*", "*Historical records distilled (original backed up)*", "");
        // Add recent sections
        for (const start of recentSections) {
            const section = lines.slice(start, start + 15);
            newLines.push(...section, "");
        }
        fs.writeFileSync(notesPath, newLines.join("\n"), "utf8");
        const newSize = fs.statSync(notesPath).size;
        return { oldSize, newSize };
    }
    /**
     * Get available templates / 獲取可用模板
     */
    getTemplates() {
        if (!fs.existsSync(this.templatesDir))
            return [];
        return fs
            .readdirSync(this.templatesDir)
            .filter((f) => fs.statSync(path.join(this.templatesDir, f)).isDirectory());
    }
}
exports.TaskStorage = TaskStorage;
exports.storage = new TaskStorage();
//# sourceMappingURL=storage.js.map