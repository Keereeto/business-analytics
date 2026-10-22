#!/usr/bin/env bash
set -Eeuo pipefail

echo "=== Container CPU and Memory Usage ==="
docker stats --no-stream