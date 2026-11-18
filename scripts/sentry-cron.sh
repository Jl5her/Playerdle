#!/usr/bin/env bash
# Sentry Cron Monitoring check-ins for scheduled GitHub Actions workflows.
#
#   sentry-cron.sh start <monitor-base>   # first step: in_progress check-in
#   sentry-cron.sh finish <ok|error>      # last step (if: always())
#
# Only scheduled runs check in (manual / push runs are skipped). The monitor is
# created on first check-in from the cron that fired the run (SCHEDULE, from
# github.event.schedule). Workflows with a daily in-season and a weekly off-season
# cron get one monitor each: <monitor-base>-daily / <monitor-base>-weekly.
#
# Never fails the job: monitoring problems must not break data syncs.
set -uo pipefail

# Public DSN of the jack-pfeiffer/playerdle Sentry project (safe to commit)
SENTRY_DSN="${SENTRY_DSN:-https://7b8885a6c35736004bea0bad7af0374d@o4511402247716864.ingest.us.sentry.io/4512449745059840}"

key="${SENTRY_DSN#https://}"
key="${key%%@*}"
host="${SENTRY_DSN#*@}"
host="${host%%/*}"
project_id="${SENTRY_DSN##*/}"

checkin() {
  # $1 = slug, rest = extra curl args
  local slug="$1"
  shift
  curl -sS --max-time 10 --retry 2 -o /dev/null -w "Sentry cron check-in (${slug}): HTTP %{http_code}\n" \
    "https://${host}/api/${project_id}/cron/${slug}/${key}/" "$@" ||
    echo "Sentry cron check-in failed (ignored)"
}

case "${1:-}" in
  start)
    base="${2:?monitor base slug required}"
    schedule="${SCHEDULE:-}"
    if [ -z "$schedule" ]; then
      echo "Not a scheduled run; skipping Sentry cron check-in"
      exit 0
    fi
    # Day-of-week field: "*" = runs every day, otherwise a weekly schedule
    dow="$(echo "$schedule" | awk '{print $5}')"
    if [ "$dow" = "*" ]; then label="daily"; else label="weekly"; fi
    slug="${base}-${label}"
    check_in_id="$(cat /proc/sys/kernel/random/uuid)"
    {
      echo "SENTRY_CRON_SLUG=${slug}"
      echo "SENTRY_CRON_CHECK_IN_ID=${check_in_id}"
    } >>"${GITHUB_ENV:-/dev/null}"
    # GitHub cron runs in UTC and scheduled runs are often delayed, hence the margin
    checkin "$slug" -X POST -H "Content-Type: application/json" --data-raw "$(
      cat <<JSON
{"status":"in_progress","check_in_id":"${check_in_id}","environment":"production",
 "monitor_config":{"schedule":{"type":"crontab","value":"${schedule}"},"timezone":"UTC",
  "checkin_margin":90,"max_runtime":120,"failure_issue_threshold":1,"recovery_threshold":1}}
JSON
    )"
    ;;
  finish)
    status="${2:?status (ok|error) required}"
    if [ -z "${SENTRY_CRON_SLUG:-}" ]; then
      exit 0
    fi
    checkin "$SENTRY_CRON_SLUG" -X POST -H "Content-Type: application/json" \
      --data-raw "{\"status\":\"${status}\",\"check_in_id\":\"${SENTRY_CRON_CHECK_IN_ID}\",\"environment\":\"production\"}"
    ;;
  *)
    echo "usage: $0 start <monitor-base> | finish <ok|error>" >&2
    ;;
esac
exit 0
