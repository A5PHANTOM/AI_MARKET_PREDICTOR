#!/bin/bash
# Start FinAlly Docker container (macOS/Linux)
set -e

IMAGE_NAME="finally"
CONTAINER_NAME="finally-app"
PORT=${PORT:-8000}

# Parse --build flag
if [ "$1" = "--build" ]; then
    echo "Building Docker image..."
    docker build -t $IMAGE_NAME .
fi

# Check if image exists
if ! docker image inspect $IMAGE_NAME >/dev/null 2>&1; then
    echo "Building Docker image..."
    docker build -t $IMAGE_NAME .
fi

# Stop existing container if running
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run container
echo "Starting FinAlly on http://localhost:$PORT"
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:8000 \
    -v finally-data:/app/db \
    --env-file .env \
    $IMAGE_NAME

echo "FinAlly is running at http://localhost:$PORT"

# Optionally open browser
if [ "$2" = "--open" ]; then
    open "http://localhost:$PORT"
fi
