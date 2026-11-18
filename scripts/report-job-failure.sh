#!/usr/bin/env bash
# Reports a failed GitHub Actions job to Sentry as an error event, so it shows up
# as an issue and triggers Sentry's alert emails. Each job groups into one issue
# (repeat failures add events; a failure after the issue is resolved reopens it).
#
#   report-job-failure.sh <job-name>     # run as the last step with `if: failure()`
#
# Uses the project's public DSN and the error quota (no cron-monitor slots needed).
# Never fails the job itself.
set -uo pipefail

job="${1:?job name required}"

# Public DSN of the jack-pfeiffer/playerdle Sentry project (safe to commit)
SENTRY_DSN="${SENTRY_DSN:-https://7b8885a6c35736004bea0bad7af0374d@o4511402247716864.ingest.us.sentry.io/4512449745059840}"
key="${SENTRY_DSN#https://}"
key="${key%%@*}"
host="${SENTRY_DSN#*@}"
host="${host%%/*}"
project_id="${SENTRY_DSN##*/}"

event_id="$(cat /proc/sys/kernel/random/uuid | tr -d -)"
now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
run_url="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"

event="$(
  jq -cn \
    --arg id "$event_id" --arg ts "$now" --arg job "$job" --arg url "$run_url" \
    --arg workflow "${GITHUB_WORKFLOW:-}" --arg trigger "${GITHUB_EVENT_NAME:-}" \
    --arg ref "${GITHUB_REF_NAME:-}" --arg sha "${GITHUB_SHA:-}" --arg attempt "${GITHUB_RUN_ATTEMPT:-}" \
    '{
      event_id: $id, timestamp: $ts, platform: "other", level: "error",
      logger: "github-actions", environment: "production",
      message: { formatted: "GitHub Actions job failed: \($job)" },
      fingerprint: ["github-actions-job-failure", $job],
      tags: { "gha.job": $job, "gha.workflow": $workflow, "gha.trigger": $trigger, "gha.ref": $ref },
      contexts: { github_actions: { run_url: $url, workflow: $workflow, trigger: $trigger,
                                    ref: $ref, sha: $sha, attempt: $attempt } }
    }'
)"

printf '%s\n%s\n%s\n' \
  "{\"event_id\":\"${event_id}\",\"sent_at\":\"${now}\"}" \
  '{"type":"event"}' \
  "$event" |
  curl -sS --max-time 10 --retry 2 -o /dev/null -w "Reported failure of '${job}' to Sentry: HTTP %{http_code}\n" \
    -X POST "https://${host}/api/${project_id}/envelope/" \
    -H "Content-Type: application/x-sentry-envelope" \
    -H "X-Sentry-Auth: Sentry sentry_version=7, sentry_key=${key}, sentry_client=playerdle-gha/1.0" \
    --data-binary @- ||
  echo "Could not report failure to Sentry (ignored)"
exit 0
