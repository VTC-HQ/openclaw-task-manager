/**
 * Task Storage Module
 *
 * Hybrid storage:
 * - SQLite: Task registry, runs history, fast queries
 * - JSON files: Task config, notes (per-task persistence)
 */
import { TaskRunRecord } from "./db";
export interface TaskConfig {
    taskId: string;
    template: string;
    name: string;
    status: string;
    cronJobId: string;
    agent: string;
    schedule: string;
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
export declare class TaskStorage {
    private tasksDir;
    private templatesDir;
    private db;
    constructor(tasksDir?: string, templatesDir?: string);
    private ensureDirs;
    generateTaskId(): string;
    private toTaskConfig;
    getAllTasks(): TaskConfig[];
    getTask(taskId: string): TaskConfig | null;
    createTask(template: string, name: string, schedule: string, agent?: string): TaskConfig;
    updateTask(taskId: string, updates: Partial<TaskConfig>): TaskConfig | null;
    deleteTask(taskId: string): boolean;
    recordRun(taskId: string, status?: string, result?: string, error?: string): string;
    completeRun(runId: string, status: string, result?: string, error?: string): void;
    getRuns(taskId: string, limit?: number): TaskRunRecord[];
    getStats(): {
        total: number;
        byStatus: Record<string, number>;
        byTemplate: Record<string, number>;
    };
    searchTasks(query: string): TaskConfig[];
    getNotesPath(taskId: string): string;
    getPromptPath(taskId: string): string;
    readNotes(taskId: string, lines?: number): string | null;
    appendNotes(taskId: string, content: string): boolean;
    getNotesSize(taskId: string): number;
    compactNotes(taskId: string): {
        oldSize: number;
        newSize: number;
    } | null;
    getTemplates(): string[];
}
export declare const storage: TaskStorage;
