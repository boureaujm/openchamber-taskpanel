#!/usr/bin/env bash
set -euo pipefail

: "${CI_API_V4_URL:?CI_API_V4_URL is required}"
: "${CI_PROJECT_ID:?CI_PROJECT_ID is required}"
: "${CI_COMMIT_TAG:?This job requires a tag pipeline}"
: "${CI_JOB_TOKEN:?CI_JOB_TOKEN is required}"

output_file="opencode-changelog.out"
if [[ ! -r "$output_file" ]]; then
  printf 'Changelog output not found: %s\n' "$output_file" >&2
  exit 1
fi

description="$(jq -Rs 'gsub("^\\s+|\\s+$"; "")' "$output_file" | jq -r .)"
if [[ -z "$description" ]]; then
  printf 'OpenCode returned an empty release note.\n' >&2
  exit 1
fi

if [[ "$description" != "## ${CI_COMMIT_TAG}"* ]]; then
  description="## ${CI_COMMIT_TAG}"$'\n\n'"${description}"
fi

release_url="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/releases"
encoded_tag="$(jq -nr --arg tag "$CI_COMMIT_TAG" '$tag | @uri')"
release_payload="$(jq -n \
  --arg tag "$CI_COMMIT_TAG" \
  --arg name "Release ${CI_COMMIT_TAG}" \
  --arg description "$description" \
  '{tag_name: $tag, name: $name, description: $description}')"
update_payload="$(jq -n \
  --arg name "Release ${CI_COMMIT_TAG}" \
  --arg description "$description" \
  '{name: $name, description: $description}')"

http_status="$(curl --silent --show-error \
  --output /tmp/release-response.json \
  --write-out '%{http_code}' \
  --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
  "${release_url}/${encoded_tag}")"

case "$http_status" in
  200)
    curl --fail --silent --show-error --request PUT \
      --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
      --header 'Content-Type: application/json' \
      --data "$update_payload" "${release_url}/${encoded_tag}" >/dev/null
    printf 'Updated GitLab release %s.\n' "$CI_COMMIT_TAG"
    ;;
  404)
    curl --fail --silent --show-error --request POST \
      --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
      --header 'Content-Type: application/json' \
      --data "$release_payload" "$release_url" >/dev/null
    printf 'Created GitLab release %s.\n' "$CI_COMMIT_TAG"
    ;;
  *)
    printf 'Could not inspect GitLab release %s (HTTP %s).\n' "$CI_COMMIT_TAG" "$http_status" >&2
    exit 1
    ;;
esac
