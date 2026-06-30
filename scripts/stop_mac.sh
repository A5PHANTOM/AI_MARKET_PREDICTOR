#!/bin/bash
# Stop FinAlly Docker container (macOS/Linux)
set -e

CONTAINER_NAME="finally-app"

echo "Stopping FinAlly..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo "FinAlly stopped. Data volume preserved."
