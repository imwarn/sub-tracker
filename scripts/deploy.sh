#!/bin/bash
# Deploy script - reads .env and sets CF Secrets before deploying
# Usage: npm run deploy (or ./scripts/deploy.sh)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Load .env if exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ 已加载 .env 配置"
fi

# Set Cloudflare Secrets from env vars (only if non-empty)
set_secret() {
  local name="$1"
  local value="${!name:-}"
  if [ -n "$value" ]; then
    echo "$value" | wrangler secret put "$name" 2>/dev/null && echo "  🔑 $name 已更新" || echo "  ⚠️  $name 设置失败"
  else
    echo "  ⏭️  $name 未配置，跳过 (如需设置请在 .env 中添加)"
  fi
}

echo "🔐 同步 Secrets..."
set_secret "TG_BOT_TOKEN"
set_secret "TG_CHAT_ID"

echo ""
echo "🚀 开始部署..."
wrangler deploy

echo ""
echo "✅ 部署完成！"
