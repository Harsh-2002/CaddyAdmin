#!/usr/bin/env bash

# Resolve script directory to handle relative paths correctly
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Function to kill process by port safely
kill_port() {
  local port=$1
  local name=$2
  local pid=""
  if command -v ss >/dev/null; then
    pid=$(ss -lptn "sport = :$port" | grep -o 'pid=[0-9]*' | cut -d= -f2 | head -n1)
  fi
  if [ -z "$pid" ] && command -v lsof >/dev/null; then
    pid=$(lsof -ti:$port 2>/dev/null || true)
  fi
  if [ -n "$pid" ]; then
    echo "   Stopping $name (PID: $pid)"
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

# Kill existing services
echo "Stopping existing services..."
kill_port 4000 "Backend"
kill_port 3000 "Frontend"

# Start Backend
echo "Starting Backend..."
cd "$SCRIPT_DIR/../apps/backend"
nohup go run main.go > "$SCRIPT_DIR/../backend.log" 2>&1 &
BACKEND_PID=$!
echo "Backend started with PID $BACKEND_PID"

# Start Frontend
echo "Starting Frontend..."
cd "$SCRIPT_DIR/../apps/web"
nohup npm run dev > "$SCRIPT_DIR/../frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "Frontend started with PID $FRONTEND_PID"

echo "Services started. Check backend.log and frontend.log for output."