#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="sportportal.service"
PROJECT_DIR="/home/pindakaas/sportportal"
UNIT_SOURCE="$PROJECT_DIR/ops/$SERVICE_NAME"
UNIT_TARGET="/etc/systemd/system/$SERVICE_NAME"

if [[ ! -f "$UNIT_SOURCE" ]]; then
  echo "Unit file niet gevonden: $UNIT_SOURCE" >&2
  exit 1
fi

echo "Building frontend..."
cd "$PROJECT_DIR"
npm run build

echo "Installing systemd unit..."
sudo cp "$UNIT_SOURCE" "$UNIT_TARGET"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"

echo "Service status:"
sudo systemctl --no-pager --full status "$SERVICE_NAME"

echo "Klaar. Frontend draait op poort 4173 en herstart automatisch bij crash/reboot."
