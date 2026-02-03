#!/bin/sh
set -e
SERVICE="${SERVICE:-main}"
PORT="${PORT:-3000}"

case "$SERVICE" in
  main)    exec node src/index.js ;;
  cart)    exec node src/cart-server.js ;;
  checkout) exec node src/checkout-server.js ;;
  auth)    exec node src/auth-server.js ;;
  admin)   exec node src/admin-server.js ;;
  *)       exec node src/index.js ;;
esac
