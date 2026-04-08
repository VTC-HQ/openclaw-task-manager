/**
 * Task Storage Module / 任務存儲模組
 */

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

export interface TaskConfig {
  taskId: string;
  template: string;
  name: string;
  status: TaskStatus;
  cronJobId: string;
  agent: string;
  schedule: string;
  createdAt: string;
  updatedAt: string;
  notesSize: number;
  state: TaskState;
}

export interface TaskState {
  phase: string;
  lastRun: string | null;
  lastResult: string | null;
  runCount: number;
  consecutiveFailures: number;
}

export type TaskStatus =
  | "created"
  | "scheduled"
  | "running"
  | "paused"
  | "completed"
  | "failed";

export interface TemplateConfig {
  template: string;
  description: string;
  description_zh?: string;
  defaultSchedule: string;
  defaultAgent: string;
  phases: string[];
  rules: {
    maxConsecutiveFailures: number;
    compactThreshold: number;
    retentionRounds: number;
  };
}

export class TaskStorage {
  private tasksDir: string;
  private templatesDir: string;

  constructor(
    tasksDir: string = path.join(process.env.HOME!, ".openclaw", "workspace", "tasks"),
    templatesDir: string = path.join(__dirname, "..", "templates")
  ) {
    this.tasksDir = tasksDir;
    this.templatesDir = templatesDir;
    this.ensureDirs();
  }

  private ensureDirs(): void {
    fs.mkdirSync(path.join(this.tasksDir, "templates"), { recursive: true });
    fs.mkdirSync(path.join(this.tasksDir, "instances"), { recursive: true });
  }

  /**
   * Generate unique task ID / 生成唯一任務 ID
   */
  generateTaskId(): string {
    return `task_${Date.now()}_${uuidv4().split("-")[0]}`;
  }

  /**
   * Get all task instances / 獲取所有任務實例
   */
  getAllTasks(): TaskConfig[] {
    const instancesDir = path.join(this.tasksDir, "instances");
    if (!fs.existsSync(instancesDir)) return [];

    const tasks: TaskConfig[] = [];
    const dirs = fs.readdirSync(instancesDir);

    for (const dir of dirs) {
      const configPath = path.join(instancesDir, dir, "config.json");
      if (fs.existsSync(configPath)) {
        try {
          const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
          tasks.push(config);
        } catch (e) {
          // Skip invalid configs
        }
      }
    }

    return tasks.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get task by ID / 根據 ID 獲取任務
   */
  getTask(taskId: string): TaskConfig | null {
    const configPath = path.join(this.tasksDir, "instances", taskId, "config.json");
    if (!fs.existsSync(configPath)) return null;

    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      return null;
    }
  }

  /**
   * Create new task / 創建新任務
   */
  createTask(
    template: string,
    name: string,
    schedule: string,
    agent: string = "main"
  ): TaskConfig {
    const taskId = this.generateTaskId();
    const instanceDir = path.join(this.tasksDir, "instances", taskId);
    fs.mkdirSync(instanceDir, { recursive: true });
    fs.mkdirSync(path.join(instanceDir, "history"), { recursive: true });

    const now = new Date().toISOString();

    const config: TaskConfig = {
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
    fs.writeFileSync(
      path.join(instanceDir, "config.json"),
      JSON.stringify(config, null, 2)
    );

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

    fs.writeFileSync(
      path.join(instanceDir, "思考筆記.md"),
      notesContent,
      "utf8"
    );

    return config;
  }

  /**
   * Update task / 更新任務
   */
  updateTask(taskId: string, updates: Partial<TaskConfig>): TaskConfig | null {
    const task = this.getTask(taskId);
    if (!task) return null;

    const updated = {
      ...task,
      ...updates,
      taskId: task.taskId, // Prevent ID change
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(this.tasksDir, "instances", taskId, "config.json"),
      JSON.stringify(updated, null, 2)
    );

    return updated;
  }

  /**
   * Delete task / 刪除任務
   */
  deleteTask(taskId: string): boolean {
    const instanceDir = path.join(this.tasksDir, "instances", taskId);
    if (!fs.existsSync(instanceDir)) return false;

    fs.rmSync(instanceDir, { recursive: true, force: true });
    return true;
  }

  /**
   * Get notes file path / 獲取筆記檔案路徑
   */
  getNotesPath(taskId: string): string {
    return path.join(this.tasksDir, "instances", taskId, "思考筆記.md");
  }

  /**
   * Get prompt file path / 獲取 prompt 檔案路徑
   */
  getPromptPath(taskId: string): string {
    return path.join(this.tasksDir, "instances", taskId, "prompt.md");
  }

  /**
   * Read notes / 讀取筆記
   */
  readNotes(taskId: string, lines?: number): string | null {
    const notesPath = this.getNotesPath(taskId);
    if (!fs.existsSync(notesPath)) return null;

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
  appendNotes(taskId: string, content: string): boolean {
    const notesPath = this.getNotesPath(taskId);
    if (!fs.existsSync(notesPath)) return false;

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
  getNotesSize(taskId: string): number {
    const notesPath = this.getNotesPath(taskId);
    if (!fs.existsSync(notesPath)) return 0;
    return fs.statSync(notesPath).size;
  }

  /**
   * Compact notes / 壓縮筆記
   */
  compactNotes(taskId: string): { oldSize: number; newSize: number } | null {
    const task = this.getTask(taskId);
    if (!task) return null;

    const notesPath = this.getNotesPath(taskId);
    if (!fs.existsSync(notesPath)) return null;

    const historyDir = path.join(
      this.tasksDir,
      "instances",
      taskId,
      "history"
    );
    const oldSize = fs.statSync(notesPath).size;

    // Backup
    const backupName = `backup_${Date.now()}_${Math.round(oldSize / 1024)}KB.md`;
    fs.copyFileSync(notesPath, path.join(historyDir, backupName));

    // Compact: keep first 20 lines (header) + last 3 entries
    const content = fs.readFileSync(notesPath, "utf-8");
    const lines = content.split("\n");

    // Find section headers (### YYYY-MM-DD)
    const sectionStarts: number[] = [];
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
    newLines.push(
      "*以下為歷史記錄蒸餾版（原始檔案已備份）*",
      "*Historical records distilled (original backed up)*",
      ""
    );

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
  getTemplates(): string[] {
    if (!fs.existsSync(this.templatesDir)) return [];
    return fs
      .readdirSync(this.templatesDir)
      .filter((f) =>
        fs.statSync(path.join(this.templatesDir, f)).isDirectory()
      );
  }
}

export const storage = new TaskStorage();
