/**
 * Task Storage Module
 * 
 * Hybrid storage:
 * - SQLite: Task registry, runs history, fast queries
 * - JSON files: Task config, notes (per-task persistence)
 */

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { TaskDB, TaskRecord, TaskRunRecord } from "./db";

export interface TaskConfig {
  taskId: string;
  template: string;
  name: string;
  status: string;
  cronJobId: string;
  agent: string;
  schedule: string;
  priority: Priority;  // NEW: high, medium, low
  createdAt: string;
  updatedAt: string;
  notesSize: number;
  state: {
    phase: string;
    lastRun: string | null;
    lastResult: string | null;
    runCount: number;
    consecutiveFailures: number;
  };
}

export type Priority = "high" | "medium" | "low";

// Priority to Cron Schedule mapping
export const PRIORITY_SCHEDULES: Record<Priority, string> = {
  high: "*/10 * * * *",    // Every 10 minutes
  medium: "*/30 * * * *",  // Every 30 minutes
  low: "0 * * * *"         // Every 60 minutes
};

export const PRIORITY_DESCRIPTIONS: Record<Priority, string> = {
  high: "每10分鐘執行一次",
  medium: "每30分鐘執行一次",
  low: "每60分鐘執行一次"
};

export class TaskStorage {
  private tasksDir: string;
  private templatesDir: string;
  private db: TaskDB;

  constructor(
    tasksDir: string = path.join(process.env.HOME || "", ".openclaw", "workspace", "tasks"),
    templatesDir: string = path.join(__dirname, "..", "templates")
  ) {
    this.tasksDir = tasksDir;
    this.templatesDir = templatesDir;
    
    // Initialize SQLite database
    const dbPath = path.join(this.tasksDir, "registry.db");
    this.db = new TaskDB(dbPath);
    
    this.ensureDirs();
  }

  private ensureDirs(): void {
    fs.mkdirSync(path.join(this.tasksDir, "instances"), { recursive: true });
  }

  generateTaskId(): string {
    return `task_${Date.now()}_${uuidv4().split("-")[0]}`;
  }

  // Convert DB record to TaskConfig
  private toTaskConfig(record: TaskRecord, extra?: Partial<TaskConfig>): TaskConfig {
    return {
      taskId: record.task_id,
      template: record.template,
      name: record.name,
      status: record.status,
      cronJobId: record.cron_job_id || "",
      agent: record.agent,
      schedule: record.schedule || "",
      priority: (record.priority as Priority) || "low",
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
  getAllTasks(): TaskConfig[] {
    const records = this.db.getAllTasks();
    return records.map(r => this.toTaskConfig(r));
  }

  // Get task by ID
  getTask(taskId: string): TaskConfig | null {
    const record = this.db.getTask(taskId);
    if (!record) return null;
    
    // Also read notes size from file
    const notesPath = this.getNotesPath(taskId);
    let notesSize = 0;
    if (fs.existsSync(notesPath)) {
      notesSize = fs.statSync(notesPath).size;
    }
    
    return this.toTaskConfig(record, { notesSize });
  }

  // Create new task
  createTask(template: string, name: string, schedule: string, agent: string = "main", priority: Priority = "low"): TaskConfig {
    const taskId = this.generateTaskId();
    const instanceDir = path.join(this.tasksDir, "instances", taskId);
    fs.mkdirSync(instanceDir, { recursive: true });
    fs.mkdirSync(path.join(instanceDir, "history"), { recursive: true });
    
    const now = new Date().toISOString();
    
    // Create DB record
    const record: TaskRecord = {
      task_id: taskId,
      name,
      template,
      status: "created",
      cron_job_id: null,
      agent,
      schedule,
      priority,
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
  updateTask(taskId: string, updates: Partial<TaskConfig>): TaskConfig | null {
    const existing = this.db.getTask(taskId);
    if (!existing) return null;

    // Update DB
    const dbUpdates: Partial<TaskRecord> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.cronJobId !== undefined) dbUpdates.cron_job_id = updates.cronJobId || null;
    if (updates.schedule !== undefined) dbUpdates.schedule = updates.schedule;
    if (updates.state?.lastRun !== undefined) dbUpdates.last_run_at = updates.state.lastRun;
    if (updates.state?.runCount !== undefined) dbUpdates.run_count = updates.state.runCount;

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
  deleteTask(taskId: string): boolean {
    const instanceDir = path.join(this.tasksDir, "instances", taskId);
    if (!fs.existsSync(instanceDir)) return false;

    // Delete from DB
    this.db.deleteTask(taskId);

    // Delete task files
    fs.rmSync(instanceDir, { recursive: true, force: true });

    return true;
  }

  // Record a task run
  recordRun(taskId: string, status: string = "started", result?: string, error?: string): string {
    const runId = `run_${Date.now()}_${uuidv4().split("-")[0]}`;
    const now = new Date().toISOString();

    const run: TaskRunRecord = {
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
  completeRun(runId: string, status: string, result?: string, error?: string): void {
    this.db.updateRun(runId, {
      status,
      completed_at: new Date().toISOString(),
      result: result || null,
      error: error || null,
    });
  }

  // Get runs for a task
  getRuns(taskId: string, limit: number = 50): TaskRunRecord[] {
    return this.db.getRunsByTask(taskId, limit);
  }

  // Get statistics
  getStats(): { total: number; byStatus: Record<string, number>; byTemplate: Record<string, number> } {
    return this.db.getStats();
  }

  // Search tasks
  searchTasks(query: string): TaskConfig[] {
    const records = this.db.searchTasks(query);
    return records.map(r => this.toTaskConfig(r));
  }

  // Notes management
  getNotesPath(taskId: string): string {
    return path.join(this.tasksDir, "instances", taskId, "思考筆記.md");
  }

  getPromptPath(taskId: string): string {
    return path.join(this.tasksDir, "instances", taskId, "prompt.md");
  }

  readNotes(taskId: string, lines?: number): string | null {
    const notesPath = this.getNotesPath(taskId);
    if (!fs.existsSync(notesPath)) return null;
    const content = fs.readFileSync(notesPath, "utf-8");
    return lines ? content.split("\n").slice(0, lines).join("\n") : content;
  }

  appendNotes(taskId: string, content: string): boolean {
    const notesPath = this.getNotesPath(taskId);
    if (!fs.existsSync(notesPath)) return false;
    const now = new Date().toISOString();
    const task = this.db.getTask(taskId);
    const runCount = task ? task.run_count + 1 : 1;
    fs.appendFileSync(notesPath, `\n### ${now} (Round ${runCount})\n${content}`);
    return true;
  }

  getNotesSize(taskId: string): number {
    const notesPath = this.getNotesPath(taskId);
    return fs.existsSync(notesPath) ? fs.statSync(notesPath).size : 0;
  }

  compactNotes(taskId: string): { oldSize: number; newSize: number } | null {
    const notesPath = this.getNotesPath(taskId);
    if (!fs.existsSync(notesPath)) return null;

    const historyDir = path.join(this.tasksDir, "instances", taskId, "history");
    const oldSize = fs.statSync(notesPath).size;
    fs.copyFileSync(notesPath, path.join(historyDir, `backup_${Date.now()}_${Math.round(oldSize / 1024)}KB.md`));

    const content = fs.readFileSync(notesPath, "utf-8");
    const lines = content.split("\n");
    const headerLines = lines.slice(0, 20);
    const sectionStarts: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].match(/^### \d{4}-\d{2}-\d{2}/)) sectionStarts.push(i);
    }

    const newLines = [...headerLines, "", "---", "", "*Historical records distilled (original backed up)*", ""];
    for (const start of sectionStarts.slice(-3)) {
      newLines.push(...lines.slice(start, start + 15), "");
    }

    fs.writeFileSync(notesPath, newLines.join("\n"));
    return { oldSize, newSize: fs.statSync(notesPath).size };
  }

  getTemplates(): string[] {
    if (!fs.existsSync(this.templatesDir)) return [];
    return fs.readdirSync(this.templatesDir).filter(f => fs.statSync(path.join(this.templatesDir, f)).isDirectory());
  }
}

export const storage = new TaskStorage();
