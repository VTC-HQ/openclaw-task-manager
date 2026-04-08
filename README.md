# OpenClaw Task Manager Plugin

> Automated Task Management System for OpenClaw / OpenClaw 自動化任務管理系統

[![CI](https://github.com/venturet/openclaw-task-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/venturet/openclaw-task-manager/actions/workflows/ci.yml)
[![Release](https://github.com/venturet/openclaw-task-manager/actions/workflows/release.yml/badge.svg)](https://github.com/venturet/openclaw-task-manager/actions/workflows/release.yml)
[![NPM Version](https://img.shields.io/npm/v/@venturet/openclaw-task-manager)](https://www.npmjs.com/package/@venturet/openclaw-task-manager)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[English](#english) | [中文](#中文)

---

## English

### Features

- **Template System**: Pre-built templates for common tasks
  - `news-monitor`: News monitoring
  - `system-health`: System health checks
  - `daily-brief`: Daily briefing generation
- **Thinking Notes**: Each task maintains a thinking notes file for continuous context
- **State Machine**: Tasks track their own state
- **Note Compression**: Automatic compaction when notes exceed 15KB
- **Bilingual**: Full support for English and Chinese
- **CI/CD**: Automated testing, building, and publishing

### Installation

```bash
# Install via NPM
npm install -g @venturet/openclaw-task-manager

# Or use directly
openclaw-task create --template news-monitor --name "Bitcoin News" --schedule "0 */4 * * *"
```

### CLI Usage

```bash
# Create task
openclaw-task create --template <tmpl> --name <name> --schedule <cron> [--agent <agent>]

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

### Templates

| Template | Description | Default Schedule |
|----------|-------------|-----------------|
| `news-monitor` | Monitor news for topics | Every 4 hours |
| `system-health` | System health checks | Every 15 minutes |
| `daily-brief` | Generate daily briefs | Daily at 8 AM |

### Development

```bash
# Clone
git clone https://github.com/venturet/openclaw-task-manager.git
cd openclaw-task-manager

# Install
npm install

# Build
npm run build

# Test
npm test
```

### Release Workflow

```bash
# Trigger release workflow (patch/minor/major)
# Or manually:
npm version patch
git push --tags
npm publish --access public
```

---

## 中文

### 功能特點

- **模板系統**：預設模板
  - `news-monitor`：新聞監控
  - `system-health`：系統健康檢查
  - `daily-brief`：每日簡報
- **思考筆記**：保持上下文連續
- **狀態機**：任務狀態追蹤
- **筆記壓縮**：超過 15KB 自動壓縮
- **雙語支援**：英文和中文
- **CI/CD**：自動化測試、構建、發布

### 安裝

```bash
npm install -g @venturet/openclaw-task-manager
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

### 開發

```bash
# 克隆
git clone https://github.com/venturet/openclaw-task-manager.git
cd openclaw-task-manager

# 安裝依賴
npm install

# 構建
npm run build

# 測試
npm test
```

### 發布流程

```bash
# 觸發 release workflow (patch/minor/major)
# 或手動：
npm version patch
git push --tags
npm publish --access public
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `CI` | Push/PR | Run tests, lint, build |
| `Release` | Manual/Tag | Publish to NPM |
| `Maintenance` | Daily | Check updates, backup |

### Secrets Required

- `NPM_TOKEN`: NPM access token with publish permission

### Automatic Updates

The `Maintenance` workflow runs daily to:
1. Check for outdated dependencies
2. Create PR for updates
3. Backup repository
4. Verify build health

---

## License / 許可證

MIT License - see [LICENSE](LICENSE) file for details.
