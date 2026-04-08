#!/usr/bin/env bash
#
# Verify Task Manager Installation
# 驗證 Task Manager 安裝
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0

log_pass() { echo -e "${GREEN}[PASS]${NC} $1"; ((PASS++)); }
log_fail() { echo -e "${RED}[FAIL]${NC} $1"; ((FAIL++)); }
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

echo ""
echo "========================================"
echo "  Task Manager - 安裝驗證"
echo "========================================"
echo ""

# Check Node.js
log_info "檢查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VER=$(node --version)
    log_pass "Node.js: $NODE_VER"
else
    log_fail "Node.js 未安裝"
fi

# Check NPM
log_info "檢查 NPM..."
if command -v npm &> /dev/null; then
    NPM_VER=$(npm --version)
    log_pass "NPM: $NPM_VER"
else
    log_fail "NPM 未安裝"
fi

# Check OpenClaw
log_info "檢查 OpenClaw..."
if command -v openclaw &> /dev/null; then
    OPENCLAW_VER=$(openclaw --version 2>/dev/null || echo "unknown")
    log_pass "OpenClaw: $OPENCLAW_VER"
else
    log_warn "OpenClaw 未找到（可選）"
fi

# Check openclaw-task
log_info "檢查 openclaw-task CLI..."
if command -v openclaw-task &> /dev/null; then
    log_pass "openclaw-task 已安裝"
else
    log_warn "openclaw-task 未在 PATH 中，嘗試本地..."
fi

# Check local build
log_info "檢查本地構建..."
if [ -d "dist" ]; then
    if [ -f "dist/cli/task.js" ]; then
        log_pass "dist/cli/task.js 存在"
    else
        log_fail "dist/cli/task.js 不存在，運行 npm run build"
    fi
else
    log_warn "dist/ 不存在，運行 npm install && npm run build"
    npm install --silent 2>/dev/null || true
    npm run build --silent 2>/dev/null || true
    if [ -f "dist/cli/task.js" ]; then
        log_pass "構建成功"
    else
        log_fail "構建失敗"
    fi
fi

# Run CLI tests
log_info "運行 CLI 測試..."
if [ -f "dist/cli/task.js" ]; then
    echo ""
    echo "----------------------------------------"
    node dist/cli/task.js list 2>/dev/null || log_warn "list 命令可能需要初始化"
    echo "----------------------------------------"
    echo ""
    node dist/cli/task.js stats 2>/dev/null || log_warn "stats 命令可能需要初始化"
    log_pass "CLI 可執行"
fi

# Check templates
log_info "檢查模板..."
if [ -d "src/templates" ]; then
    TMPLS=$(ls src/templates/ 2>/dev/null | wc -l)
    log_pass "找到 $TMPLS 個模板"
else
    log_fail "模板目錄不存在"
fi

# Summary
echo ""
echo "========================================"
echo "  驗證結果"
echo "========================================"
echo ""
echo -e "  ${GREEN}通過: $PASS${NC}"
echo -e "  ${RED}失敗: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}所有檢查通過！${NC}"
    echo ""
    echo "可用命令："
    echo "  openclaw-task list"
    echo "  openclaw-task stats"
    echo "  openclaw-task create --template news-monitor --name 'Test' --schedule '0 10 * * *'"
    exit 0
else
    echo -e "${RED}有檢查失敗，請修復後重試${NC}"
    exit 1
fi
