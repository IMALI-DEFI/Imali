#!/usr/bin/env bash
# Bounded internal preparation only; the slow service passes its lane explicitly.
set -u -o pipefail
APP_DIR=/home/opc/imali-work-agent
LANE="${1:-fast}"
[[ "$LANE" == fast || "$LANE" == slow ]] || exit 2
[[ -r "$APP_DIR/opportunity-autopilot.env" ]] && source "$APP_DIR/opportunity-autopilot.env"
exec 9>/tmp/imali-opportunity-autopilot.lock
flock -n 9 || { logger -t imali-opportunity-autopilot "skip: shared lock"; exit 0; }
read -r total used available < <(df -B1 / | awk 'NR==2 {print $2,$3,$4}')
if (( used * 100 / total >= ${AUTOPILOT_MAX_DISK_PERCENT:-89} || available < ${AUTOPILOT_MIN_FREE_BYTES:-3221225472} )); then
 logger -t imali-opportunity-autopilot "skip: disk guard available=$available"
 exit 0
fi
cd "$APP_DIR" || exit 1
export OUTREACH_SEND_ENABLED=false RFQ_SEND_LIVE=0 APPLICATION_AUTO_SUBMIT=false PYTHONUNBUFFERED=1
exec timeout --foreground 420 ./venv/bin/python opportunity_dispatcher.py "$LANE"
