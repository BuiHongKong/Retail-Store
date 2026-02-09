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
  main)    exec node src/index.js ;;
  cart)    exec node src/cart-server.js ;;
  checkout) exec node src/checkout-server.js ;;
  auth)    exec node src/auth-server.js ;;
  admin)   exec node src/admin-server.js ;;
  *)       exec node src/index.js ;;
esac
