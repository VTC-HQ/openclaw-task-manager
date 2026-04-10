/**
 * Task Registry Database (SQLite)
 *
 * Provides fast query, indexing, and statistics for tasks.
 */
export interface TaskRecord {
    task_id: string;
    name: string;
    template: string;
    status: string;
    cron_job_id: string | null;
    agent: string;
    schedule: string;
    priority: string;
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
export declare class TaskDB {
    private db;
    private dbPath;
    constructor(dbPath: string);
    private init;
    insertTask(task: TaskRecord): void;
    updateTask(taskId: string, updates: Partial<TaskRecord>): void;
    getTask(taskId: string): TaskRecord | null;
    getAllTasks(orderBy?: string): TaskRecord[];
    getTasksByStatus(status: string): TaskRecord[];
    getTasksByTemplate(template: string): TaskRecord[];
    deleteTask(taskId: string): void;
    insertRun(run: TaskRunRecord): void;
    updateRun(runId: string, updates: Partial<TaskRunRecord>): void;
    getRunsByTask(taskId: string, limit?: number): TaskRunRecord[];
    getLastRun(taskId: string): TaskRunRecord | null;
    getStats(): {
        total: number;
        byStatus: Record<string, number>;
        byTemplate: Record<string, number>;
    };
    searchTasks(query: string): TaskRecord[];
    close(): void;
}
