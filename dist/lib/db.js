"use strict";
/**
 * Task Registry Database (SQLite)
 *
 * Provides fast query, indexing, and statistics for tasks.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskDB = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TaskDB {
    constructor(dbPath) {
        this.dbPath = dbPath;
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(dbPath);
        this.init();
    }
    init() {
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
    insertTask(task) {
        const stmt = this.db.prepare(`
      INSERT INTO tasks (task_id, name, template, status, cron_job_id, agent, schedule, created_at, updated_at, last_run_at, run_count)
      VALUES (@task_id, @name, @template, @status, @cron_job_id, @agent, @schedule, @created_at, @updated_at, @last_run_at, @run_count)
    `);
        stmt.run(task);
    }
    updateTask(taskId, updates) {
        const fields = Object.keys(updates)
            .filter(k => k !== "task_id")
            .map(k => `${k} = @${k}`)
            .join(", ");
        if (!fields)
            return;
        const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields}, updated_at = @updated_at
      WHERE task_id = @task_id
    `);
        stmt.run({ ...updates, task_id: taskId, updated_at: new Date().toISOString() });
    }
    getTask(taskId) {
        const stmt = this.db.prepare("SELECT * FROM tasks WHERE task_id = ?");
        return stmt.get(taskId);
    }
    getAllTasks(orderBy = "created_at DESC") {
        const stmt = this.db.prepare(`SELECT * FROM tasks ORDER BY ${orderBy}`);
        return stmt.all();
    }
    getTasksByStatus(status) {
        const stmt = this.db.prepare("SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC");
        return stmt.all(status);
    }
    getTasksByTemplate(template) {
        const stmt = this.db.prepare("SELECT * FROM tasks WHERE template = ? ORDER BY created_at DESC");
        return stmt.all(template);
    }
    deleteTask(taskId) {
        const stmt = this.db.prepare("DELETE FROM tasks WHERE task_id = ?");
        stmt.run(taskId);
        // Also delete runs
        const stmtRuns = this.db.prepare("DELETE FROM task_runs WHERE task_id = ?");
        stmtRuns.run(taskId);
    }
    // Task Runs
    insertRun(run) {
        const stmt = this.db.prepare(`
      INSERT INTO task_runs (run_id, task_id, status, started_at, completed_at, result, error)
      VALUES (@run_id, @task_id, @status, @started_at, @completed_at, @result, @error)
    `);
        stmt.run(run);
    }
    updateRun(runId, updates) {
        const fields = Object.keys(updates)
            .filter(k => k !== "run_id")
            .map(k => `${k} = @${k}`)
            .join(", ");
        if (!fields)
            return;
        const stmt = this.db.prepare(`UPDATE task_runs SET ${fields} WHERE run_id = @run_id`);
        stmt.run({ ...updates, run_id: runId });
    }
    getRunsByTask(taskId, limit = 50) {
        const stmt = this.db.prepare("SELECT * FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT ?");
        return stmt.all(taskId, limit);
    }
    getLastRun(taskId) {
        const stmt = this.db.prepare("SELECT * FROM task_runs WHERE task_id = ? ORDER BY started_at DESC LIMIT 1");
        return stmt.get(taskId);
    }
    // Statistics
    getStats() {
        const total = this.db.prepare("SELECT COUNT(*) as count FROM tasks").get().count;
        const byStatusStmt = this.db.prepare("SELECT status, COUNT(*) as count FROM tasks GROUP BY status");
        const byStatusRows = byStatusStmt.all();
        const byStatus = {};
        for (const row of byStatusRows) {
            byStatus[row.status] = row.count;
        }
        const byTemplateStmt = this.db.prepare("SELECT template, COUNT(*) as count FROM tasks GROUP BY template");
        const byTemplateRows = byTemplateStmt.all();
        const byTemplate = {};
        for (const row of byTemplateRows) {
            byTemplate[row.template] = row.count;
        }
        return { total, byStatus, byTemplate };
    }
    // Search
    searchTasks(query) {
        const stmt = this.db.prepare(`
      SELECT * FROM tasks 
      WHERE name LIKE ? OR template LIKE ? OR task_id LIKE ?
      ORDER BY created_at DESC
    `);
        const pattern = `%${query}%`;
        return stmt.all(pattern, pattern, pattern);
    }
    close() {
        this.db.close();
    }
}
exports.TaskDB = TaskDB;
//# sourceMappingURL=db.js.map