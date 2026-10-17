#!/usr/bin/env bash
set -euo pipefail

output_file="opencode-preflight.out"
marker="<!-- opencode-preflight -->"

: "${CI_API_V4_URL:?CI_API_V4_URL is required}"
: "${CI_PROJECT_ID:?CI_PROJECT_ID is required}"
: "${CI_MERGE_REQUEST_IID:?This job requires a merge request pipeline}"
: "${GITLAB_TOKEN:?Set the masked project access token variable GITLAB_TOKEN}"

if [[ ! -r "$output_file" ]]; then
  printf 'Pre-Flight output not found: %s\n' "$output_file" >&2
  exit 1
fi

body="$(jq -Rs 'gsub("^\\s+|\\s+$"; "")' "$output_file" | jq -r .)"
notes_url="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/merge_requests/${CI_MERGE_REQUEST_IID}/notes"
notes="$(curl --fail --silent --show-error \
  --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
  "${notes_url}?per_page=100&sort=desc&order_by=updated_at")"
note_id="$(jq -r --arg marker "$marker" \
  '[.[] | select((.body // "") | startswith($marker))] | first | .id // empty' \
  <<<"$notes")"

if [[ -z "$body" || "$body" == "NO_PREFLIGHT_ITEMS" ]]; then
  if [[ -n "$note_id" ]]; then
    curl --fail --silent --show-error --request DELETE \
      --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
      "${notes_url}/${note_id}" >/dev/null
    printf 'Removed obsolete Pre-Flight comment.\n'
  else
    printf 'No actionable Pre-Flight items; no comment posted.\n'
  fi
  exit 0
fi

comment_body="${marker}"$'\n\n'"## Pre-Flight"$'\n\n'"${body}"
payload="$(jq -n --arg body "$comment_body" '{body: $body}')"

if [[ -n "$note_id" ]]; then
  curl --fail --silent --show-error --request PUT \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    --header 'Content-Type: application/json' \
    --data "$payload" "${notes_url}/${note_id}" >/dev/null
  printf 'Updated Pre-Flight comment.\n'
else
  curl --fail --silent --show-error --request POST \
    --header "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
    --header 'Content-Type: application/json' \
    --data "$payload" "$notes_url" >/dev/null
  printf 'Posted Pre-Flight comment.\n'
fi
