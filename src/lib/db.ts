/**
 * Task Registry Database (SQLite)
 * 
 * Provides fast query, indexing, and statistics for tasks.
 */

import Database from "better-sqlite3";
import * as fs from "fs";
import * as path from "path";

export interface TaskRecord {
  task_id: string;
  name: string;
  template: string;
  status: string;
  cron_job_id: string | null;
  agent: string;
  schedule: string;
  created_at: string;
  updated_at: string;
  last_run_at: string | null;
  run_count: number;
}

export interface TaskRunRecord {
  run_id: string;
  task_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  result: string | null;
  error: string | null;
}

export class TaskDB {
  private db: Database.Database;
  private dbPath: string;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.init();
  }

  private init(): void {
    // Enable WAL mode for better concurrency
    this.db.pragma("journal_mode = WAL");

    // Create tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        task_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template TEXT NOT NULL,
        status TEXT DEFAULT 'created',
        cron_job_id TEXT,
        agent TEXT DEFAULT 'main',
        schedule TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_run_at TEXT,
        run_count INTEGER DEFAULT 0
      )
    `);

    // Create task_runs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_runs (
        run_id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        result TEXT,
        error TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(task_id)
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_cron ON tasks(cron_job_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_template ON tasks(template);
      CREATE INDEX IF NOT EXISTS idx_runs_task ON task_runs(task_id);
      CREATE INDEX IF NOT EXISTS idx_runs_started ON task_runs(started_at);
    `);
  }

  // Task CRUD
  insertTask(task: TaskRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (task_id, name, template, status, cron_job_id, agent, schedule, created_at, updated_at, last_run_at, run_count)
      VALUES (@task_id, @name, @template, @status, @cron_job_id, @agent, @schedule, @created_at, @updated_at, @last_run_at, @run_count)
    `);
    stmt.run(task);
  }

  updateTask(taskId: string, updates: Partial<TaskRecord>): void {
    const fields = Object.keys(updates)
      .filter(k => k !== "task_id")
      .map(k => `${k} = @${k}`)
      .join(", ");
    
    if (!fields) return;

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields}, updated_at = @updated_at
      WHERE task_id = @task_id
    `);
    stmt.run({ ...updates, task_id: taskId, updated_at: new Date().toISOString() });
  }

  getTask(taskId: string): TaskRecord | null {
    const stmt = this.db.prepare("SELECT * FROM tasks WHERE task_id = ?");
    return stmt.get(taskId) as TaskRecord | null;
  }

  getAllTasks(orderBy: string = "created_at DESC"): TaskRecord[] {
    const stmt = this.db.prepare(`SELECT * FROM tasks ORDER BY ${orderBy}`);
    return stmt.all() as TaskRecord[];
  }

  getTasksByStatus(status: string): TaskRecord[] {
    const stmt = this.db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC");
    return stmt.all(status) as TaskRecord[];
  }

  getTasksByTemplate(template: string): TaskRecord[] {
    const stmt = this.db.prepare("SELECT * FROM tasks WHERE template = ? ORDER BY created_at DESC");
    return stmt.all(template) as TaskRecord[];
  }

  deleteTask(taskId: string): void {
    const stmt = this.db.prepare("DELETE FROM tasks WHERE task_id = ?");
    stmt.run(taskId);
    // Also delete runs
    const stmtRuns = this.db.prepare("DELETE FROM task_runs WHERE task_id = ?");
    stmtRuns.run(taskId);
  }

  // Task Runs
  insertRun(run: TaskRunRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO task_runs (run_id, task_id, status, started_at, completed_at, result, error)
      VALUES (@run_id, @task_id, @status, @started_at, @completed_at, @result, @error)
    `);
    stmt.run(run);
  }

  updateRun(runId: string, updates: Partial<TaskRunRecord>): void {
    const fields = Object.keys(updates)
      .filter(k => k !== "run_id")
      .map(k => `${k} = @${k}`)
      .join(", ");

    if (!fields) return;

    const stmt = this.db.prepare(`UPDATE task_runs SET ${fields} WHERE run_id = @run_id`);
    stmt.run({ ...updates, run_id: runId });
  }

  getRunsByTask(taskId: string, limit: number = 50): TaskRunRecord[] {
    const stmt = this.db.prepare("SELECT * FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT ?");
    return stmt.all(taskId, limit) as TaskRunRecord[];
  }

  getLastRun(taskId: string): TaskRunRecord | null {
    const stmt = this.db.prepare("SELECT * FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT 1");
    return stmt.get(taskId) as TaskRunRecord | null;
  }

  // Statistics
  getStats(): { total: number; byStatus: Record<string, number>; byTemplate: Record<string, number> } {
    const total = (this.db.prepare("SELECT COUNT(*) as count FROM tasks").get() as { count: number }).count;
    
    const byStatusStmt = this.db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status");
    const byStatusRows = byStatusStmt.all() as { status: string; count: number }[];
    const byStatus: Record<string, number> = {};
    for (const row of byStatusRows) {
      byStatus[row.status] = row.count;
    }

    const byTemplateStmt = this.db.prepare("SELECT template, COUNT(*) as count FROM tasks GROUP BY template");
    const byTemplateRows = byTemplateStmt.all() as { template: string; count: number }[];
    const byTemplate: Record<string, number> = {};
    for (const row of byTemplateRows) {
      byTemplate[row.template] = row.count;
    }

    return { total, byStatus, byTemplate };
  }

  // Search
  searchTasks(query: string): TaskRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE name LIKE ? OR template LIKE ? OR task_id LIKE ?
      ORDER BY created_at DESC
    `);
    const pattern = `%${query}%`;
    return stmt.all(pattern, pattern, pattern) as TaskRecord[];
  }

  close(): void {
    this.db.close();
  }
}
