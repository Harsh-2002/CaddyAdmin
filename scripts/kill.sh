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