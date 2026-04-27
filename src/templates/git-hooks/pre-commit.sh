#!/bin/sh
# G-Harness pre-commit hook
# 提交前自动运行 g-harness validate，校验不通过阻断提交

echo "🔍 G-Harness 提交前校验..."

# 运行 g-harness validate（JSON 输出，解析退出码）
npx g-harness validate --format json > /dev/null 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ G-Harness 校验未通过，提交已阻断"
  echo "   运行 'npx g-harness validate' 查看详情"
  echo ""
  exit 1
fi

echo "✅ G-Harness 校验通过"
exit 0
