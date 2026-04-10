#!/usr/bin/env bash
# 設置自我維運任務

TASK_CLI="~/.openclaw/workspace/skills/task-manager/scripts/openclaw-task"

echo "Setting up self-maintenance tasks..."

# 自我維運任務
echo "Creating self-maintenance task..."
eval $TASK_CLI create \
  --template self-maintenance \
  --name "Task Manager 自我維運" \
  --schedule "0 2 * * *"

# 安全掃描
echo "Creating security-scan task..."
eval $TASK_CLI create \
  --template security-scan \
  --name "Task Manager 安全掃描" \
  --schedule "0 3 * * 0"

# 備份任務
echo "Creating backup task..."
eval $TASK_CLI create \
  --template backup \
  --name "Task Manager 備份" \
  --schedule "0 4 * * *"

echo ""
echo "All maintenance tasks created!"
echo ""
eval $TASK_CLI list
