# OpenClaw Task Manager Plugin

> Automation Task Management System for OpenClaw / OpenClaw 自動化任務管理系統

[English](#english) | [中文](#中文)

---

## English

### Features

- **Template System**: Pre-built templates for common tasks (News Monitor, System Health, Daily Brief)
- **Thinking Notes**: Each task maintains a thinking notes file for continuous context
- **State Machine**: Tasks track their own state (created → scheduled → running → paused/completed/failed)
- **Note Compression**: Automatic compaction when notes exceed 15KB
- **Bilingual**: Full support for English and Chinese

### Installation

```bash
# Install from NPM
openclaw plugins install openclaw-task-manager

# Or manually
npm install -g openclaw-task-manager
```

### CLI Usage

```bash
# Create task
openclaw-task create --template news-monitor --name "Bitcoin News" --schedule "0 */4 * * *"

# List tasks
openclaw-task list

# View status
openclaw-task status <task-id>

# View notes
openclaw-task notes <task-id> [lines]

# Pause/Resume
openclaw-task pause <task-id>
openclaw-task resume <task-id>

# Delete
openclaw-task delete <task-id> [--force]

# Compact notes
openclaw-task compact <task-id>
```

### Available Templates

| Template | Description | Default Schedule |
|----------|-------------|------------------|
| `news-monitor` | Monitor news for specific topics | Every 4 hours |
| `system-health` | System health check and monitoring | Every 15 minutes |
| `daily-brief` | Generate daily briefing reports | Daily at 8:00 AM |

### Task Structure

```
~/.openclaw/workspace/tasks/
├── templates/                    # Task templates
│   ├── news-monitor/
│   ├── system-health/
│   └── daily-brief/
└── instances/                   # Task instances
    └── <task-id>/
        ├── config.json          # Task configuration
        ├── 思考筆記.md          # Thinking notes
        ├── prompt.md            # Execution prompt
        └── history/            # Compacted notes backup
```

### Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test
```

### Publishing

```bash
# Login to NPM
npm login

# Publish
npm publish --access public

# Tag release
git tag v1.0.0
git push origin v1.0.0
```

---

## 中文

### 功能特點

- **模板系統**：預設模板（新聞監控、系統健康、每日簡報）
- **思考筆記**：每個任務維護思考筆記檔案，保持上下文連續
- **狀態機**：任務追蹤自己的狀態（created → scheduled → running → paused/completed/failed）
- **筆記壓縮**：筆記超過 15KB 時自動壓縮
- **雙語支援**：完整支援英文和中文

### 安裝

```bash
# 從 NPM 安裝
openclaw plugins install openclaw-task-manager

# 或手動
npm install -g openclaw-task-manager
```

### CLI 使用

```bash
# 創建任務
openclaw-task create --template news-monitor --name "比特幣新聞" --schedule "0 */4 * * *"

# 列出任務
openclaw-task list

# 查看狀態
openclaw-task status <任務-ID>

# 查看筆記
openclaw-task notes <任務-ID> [行數]

# 暫停/恢復
openclaw-task pause <任務-ID>
openclaw-task resume <任務-ID>

# 刪除
openclaw-task delete <任務-ID> [--force]

# 壓縮筆記
openclaw-task compact <任務-ID>
```

### 可用模板

| 模板 | 說明 | 預設排程 |
|------|------|---------|
| `news-monitor` | 監控特定主題的新聞 | 每 4 小時 |
| `system-health` | 系統健康檢查和監控 | 每 15 分鐘 |
| `daily-brief` | 生成每日簡報報告 | 每天早上 8:00 |

### 任務結構

```
~/.openclaw/workspace/tasks/
├── templates/                    # 任務模板
│   ├── news-monitor/
│   ├── system-health/
│   └── daily-brief/
└── instances/                   # 任務實例
    └── <任務-ID>/
        ├── config.json          # 任務配置
        ├── 思考筆記.md          # 思考筆記
        ├── prompt.md            # 執行 prompt
        └── history/            # 壓縮後的舊筆記備份
```

### 開發

```bash
# 安裝依賴
npm install

# 編譯
npm run build

# 測試
npm test
```

### 發布

```bash
# 登入 NPM
npm login

# 發布
npm publish --access public

# 標籤版本
git tag v1.0.0
git push origin v1.0.0
```

---

## License / 許可證

MIT
