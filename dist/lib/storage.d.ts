/**
 * Task Storage Module / 任務存儲模組
 */
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
export type TaskStatus = "created" | "scheduled" | "running" | "paused" | "completed" | "failed";
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
export declare class TaskStorage {
    private tasksDir;
    private templatesDir;
    constructor(tasksDir?: string, templatesDir?: string);
    private ensureDirs;
    /**
     * Generate unique task ID / 生成唯一任務 ID
     */
    generateTaskId(): string;
    /**
     * Get all task instances / 獲取所有任務實例
     */
    getAllTasks(): TaskConfig[];
    /**
     * Get task by ID / 根據 ID 獲取任務
     */
    getTask(taskId: string): TaskConfig | null;
    /**
     * Create new task / 創建新任務
     */
    createTask(template: string, name: string, schedule: string, agent?: string): TaskConfig;
    /**
     * Update task / 更新任務
     */
    updateTask(taskId: string, updates: Partial<TaskConfig>): TaskConfig | null;
    /**
     * Delete task / 刪除任務
     */
    deleteTask(taskId: string): boolean;
    /**
     * Get notes file path / 獲取筆記檔案路徑
     */
    getNotesPath(taskId: string): string;
    /**
     * Get prompt file path / 獲取 prompt 檔案路徑
     */
    getPromptPath(taskId: string): string;
    /**
     * Read notes / 讀取筆記
     */
    readNotes(taskId: string, lines?: number): string | null;
    /**
     * Append to notes / 追加筆記
     */
    appendNotes(taskId: string, content: string): boolean;
    /**
     * Get notes size in bytes / 獲取筆記大小
     */
    getNotesSize(taskId: string): number;
    /**
     * Compact notes / 壓縮筆記
     */
    compactNotes(taskId: string): {
        oldSize: number;
        newSize: number;
    } | null;
    /**
     * Get available templates / 獲取可用模板
     */
    getTemplates(): string[];
}
export declare const storage: TaskStorage;
//# sourceMappingURL=storage.d.ts.map