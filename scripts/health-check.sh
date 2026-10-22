#!/usr/bin/env bash
set -Eeuo pipefail

echo "=== Container Status ==="
docker compose ps

echo
echo "=== Health Status ==="

containers=$(docker compose ps -q)

if [[ -z "$containers" ]]; then
  echo "No Compose containers are running."
  exit 1
fi

failed=0

while IFS= read -r container_id; do
  name=$(docker inspect -f '{{.Name}}' "$container_id" | sed 's#^/##')
  state=$(docker inspect -f '{{.State.Status}}' "$container_id")
  health=$(docker inspect -f \
    '{{if .State.Health}}{{.State.Health.Status}}{{else}}not configured{{end}}' \
    "$container_id")

  printf '%-30s state=%-12s health=%s\n' "$name" "$state" "$health"

  if [[ "$state" != "running" || "$health" == "unhealthy" ]]; then
    failed=1
  fi
done <<< "$containers"

exit "$failed"