#!/bin/sh
set -e
SERVICE="${SERVICE:-main}"
PORT="${PORT:-3000}"

# When ECS run-task overrides command (e.g. seed), run it and exit
if [ $# -gt 0 ]; then
  exec "$@"
fi

# Run migrations on startup (idempotent, safe for multiple containers)
npx prisma migrate deploy

case "$SERVICE" in
  main)    NODE_SCRIPT="node src/index.js" ;;
  cart)    NODE_SCRIPT="node src/cart-server.js" ;;
  checkout) NODE_SCRIPT="node src/checkout-server.js" ;;
  auth)    NODE_SCRIPT="node src/auth-server.js" ;;
  admin)   NODE_SCRIPT="node src/admin-server.js" ;;
  *)       NODE_SCRIPT="node src/index.js" ;;
esac

# Optional: duplicate stdout/stderr to file for Promtail (e.g. WRITE_LOG_FILE=/var/log/app/app.log)
if [ -n "$WRITE_LOG_FILE" ]; then
  mkdir -p "$(dirname "$WRITE_LOG_FILE")"
  $NODE_SCRIPT 2>&1 | tee -a "$WRITE_LOG_FILE"
  exit ${PIPESTATUS[0]:-0}
fi
exec $NODE_SCRIPT
