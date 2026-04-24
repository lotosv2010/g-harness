#!/bin/sh
# G-Forge pre-commit hook
# 提交前自动运行 gforge validate，校验不通过阻断提交

echo "🔍 G-Forge 提交前校验..."

# 运行 gforge validate（JSON 输出，解析退出码）
npx gforge validate --format json > /dev/null 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
  echo ""
  echo "❌ G-Forge 校验未通过，提交已阻断"
  echo "   运行 'npx gforge validate' 查看详情"
  echo ""
  exit 1
fi

echo "✅ G-Forge 校验通过"
exit 0
