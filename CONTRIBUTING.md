# Contributing to openclaw-task-manager

[English](#english) | [中文](#中文)

---

## English

### Development Setup

```bash
# Clone the repository
git clone https://github.com/VTC-HQ/openclaw-task-manager.git
cd openclaw-task-manager

# Install dependencies
npm install

# Build
npm run build

# Test
npm test
npm run test:full
```

### Testing Your Changes

```bash
# Test CLI locally
node dist/cli/task.js list
node dist/cli/task.js stats

# Test with OpenClaw
openclaw-task list
openclaw-task create --template news-monitor --name "Test" --schedule "0 10 * * *"
```

### Release Process

1. **For maintainers:**
   - Use the `Bump Version` workflow in GitHub Actions
   - Or manually: `npm version patch && git push --tags`

2. **Automatic on tag:**
   - GitHub Actions runs CI
   - If passed, publishes to NPM
   - Creates GitHub Release

### Version Strategy

| Type | When | Example |
|------|------|---------|
| Patch | Bug fixes | 1.1.0 → 1.1.1 |
| Minor | New features | 1.1.0 → 1.2.0 |
| Major | Breaking changes | 1.1.0 → 2.0.0 |
| Prerelease | Testing | 1.2.0-beta.1 |

### Code Style

- Use TypeScript
- Run `npm run lint` before commit
- Add tests for new features

---

## 中文

### 開發環境設置

```bash
# 克隆倉庫
git clone https://github.com/VTC-HQ/openclaw-task-manager.git
cd openclaw-task-manager

# 安裝依賴
npm install

# 構建
npm run build

# 測試
npm test
npm run test:full
```

### 測試您的變更

```bash
# 本地測試 CLI
node dist/cli/task.js list
node dist/cli/task.js stats

# 測試 OpenClaw
openclaw-task list
openclaw-task create --template news-monitor --name "測試" --schedule "0 10 * * *"
```

### 發布流程

1. **維護者：**
   - 使用 GitHub Actions 的 `Bump Version` workflow
   - 或手動：`npm version patch && git push --tags`

2. **自動流程：**
   - GitHub Actions 運行 CI
   - 通過後發布到 NPM
   - 創建 GitHub Release

### 版本策略

| 類型 | 時機 | 例子 |
|------|------|------|
| Patch | Bug 修復 | 1.1.0 → 1.1.1 |
| Minor | 新功能 | 1.1.0 → 1.2.0 |
| Major | 破壞性變更 | 1.1.0 → 2.0.0 |
| Prerelease | 測試版本 | 1.2.0-beta.1 |

### 代碼風格

- 使用 TypeScript
- 提交前運行 `npm run lint`
- 為新功能添加測試

---

## Labels for PRs

| Label | Description |
|-------|-------------|
| `feature` | New feature |
| `bug` | Bug fix |
| `documentation` | Docs update |
| `chore` | Maintenance |
| `dependencies` | Dependency updates |
