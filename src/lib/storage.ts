import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

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

export class TaskStorage {
  private tasksDir: string;
  private templatesDir: string;

  constructor(
    tasksDir: string = path.join(process.env.HOME || "", ".openclaw", "workspace", "tasks"),
    templatesDir: string
  ) {
    this.tasksDir = tasksDir;
    this.templatesDir = templatesDir;
    this.ensureDirs();
  }

  private ensureDirs(): void {
    fs.mkdirSync(path.join(this.tasksDir, "instances"), { recursive: true });
  }

  generateTaskId(): string {
    return `task_${Date.now()}_${uuidv4().split("-")[0]}`;
  }

  getAllTasks(): TaskConfig[] {
    const instancesDir = path.join(this.tasksDir, "instances");
    if (!fs.existsSync(instancesDir)) return [];
    const tasks: TaskConfig[] = [];
    const dirs = fs.readdirSync(instancesDir);
    for (const dir of dirs) {
      const configPath = path.join(instancesDir, dir, "config.json");
      if (fs.existsSync(configPath)) {
        try {
          tasks.push(JSON.parse(fs.readFileSync(configPath, "utf-8")));
        } catch {}
      }
    }
    return tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getTask(taskId: string): TaskConfig | null {
    const configPath = path.join(this.tasksDir, "instances", taskId, "config.json");
    if (!fs.existsSync(configPath)) return null;
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch {
      return null;
    }
  }

  createTask(template: string, name: string, schedule: string, agent: string = "main"): TaskConfig {
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
      state: { phase: "initialized", lastRun: null, lastResult: null, runCount: 0, consecutiveFailures: 0 },
    };
    fs.writeFileSync(path.join(instanceDir, "config.json"), JSON.stringify(config, null, 2));
    const templateDir = path.join(this.templatesDir, template);
    if (fs.existsSync(templateDir)) {
      const rulesFile = path.join(templateDir, "rules.md");
      if (fs.existsSync(rulesFile)) fs.copyFileSync(rulesFile, path.join(instanceDir, "rules.md"));
      const promptFile = path.join(templateDir, "prompt_template.md");
      if (fs.existsSync(promptFile)) fs.copyFileSync(promptFile, path.join(instanceDir, "prompt.md"));
    }
    const notesContent = `# 任務：${name}\n# Task ID: ${taskId}\n# 建立時間: ${now}\n\n## 任務目標\n初始化中...\n\n## 初始化日誌\n- ${now}: 任務建立\n- 模板: ${template}\n- 排程: ${schedule}\n\n---\n\n（每次執行後記錄）\n`;
    fs.writeFileSync(path.join(instanceDir, "思考筆記.md"), notesContent);
    return config;
  }

  updateTask(taskId: string, updates: Partial<TaskConfig>): TaskConfig | null {
    const task = this.getTask(taskId);
    if (!task) return null;
    const updated = { ...task, ...updates, taskId: task.taskId, updatedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(this.tasksDir, "instances", taskId, "config.json"), JSON.stringify(updated, null, 2));
    return updated;
  }

  deleteTask(taskId: string): boolean {
    const instanceDir = path.join(this.tasksDir, "instances", taskId);
    if (!fs.existsSync(instanceDir)) return false;
    fs.rmSync(instanceDir, { recursive: true, force: true });
    return true;
  }

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
    const task = this.getTask(taskId);
    const runCount = task ? task.state.runCount + 1 : 1;
    fs.appendFileSync(notesPath, `\n### ${now} (第${runCount}輪)\n${content}`);
    this.updateTask(taskId, { notesSize: fs.statSync(notesPath).size });
    return true;
  }

  getNotesSize(taskId: string): number {
    const notesPath = this.getNotesPath(taskId);
    return fs.existsSync(notesPath) ? fs.statSync(notesPath).size : 0;
  }

  compactNotes(taskId: string): { oldSize: number; newSize: number } | null {
    const task = this.getTask(taskId);
    if (!task) return null;
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
    const newLines = [...headerLines, "", "---", "", "*歷史記錄蒸餾版（已備份）*", ""];
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
