#!/usr/bin/env bash
set -u

# Check database backup files stored in the /backups volume mounted in the db service.

SERVICE="${DB_SERVICE:-db}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: Docker CLI was not found. Install Docker and ensure it is on PATH." >&2
    exit 1
fi

if ! docker compose ps --services --status running 2>/dev/null | grep -Fxq "$SERVICE"; then
    echo "ERROR: Docker Compose service '$SERVICE' is not running." >&2
    echo "Start the services first, for example: docker compose up -d" >&2
    exit 1
fi

if ! docker compose exec -T "$SERVICE" sh -c 'test -d "$1"' sh "$BACKUP_DIR"; then
    echo "ERROR: Backup directory '$BACKUP_DIR' does not exist in service '$SERVICE'." >&2
    echo "Check that the backup volume is mounted at this path in compose.yaml." >&2
    exit 1
fi

if ! docker compose exec -T "$SERVICE" sh -c 'find "$1" -maxdepth 1 -type f -print -quit | grep -q .' sh "$BACKUP_DIR"; then
    echo "WARNING: No backup files found in $BACKUP_DIR (service: $SERVICE)."
    exit 2
fi

echo "Backup files found in $BACKUP_DIR (service: $SERVICE):"
docker compose exec -T "$SERVICE" sh -c 'ls -lhtr "$1"' sh "$BACKUP_DIR"
