#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_FILE="business_analytics_$(date +%Y%m%d_%H%M%S).sql"

echo "Creating database backup: ${BACKUP_FILE}.gz"

docker compose exec -T db sh -c \
  "pg_dump -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" \
  -f '/backups/${BACKUP_FILE}' &&
  gzip -f '/backups/${BACKUP_FILE}'"

echo "Backup completed: ${BACKUP_FILE}.gz"