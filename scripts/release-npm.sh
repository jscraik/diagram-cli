#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<USAGE
Usage: scripts/release-npm.sh [--publish] [--initial] <version>

Options:
  --publish   Execute the full release (version bump, git tag, npm publish)
  --initial   Publish the existing package.json version as first npm release
  -h, --help  Show this help

Examples:
  scripts/release-npm.sh 1.0.1
  scripts/release-npm.sh --publish 1.0.1
  scripts/release-npm.sh --publish --initial 1.0.0
USAGE
}

fail() {
  echo "Error: $1" >&2
  exit 1
}

ensure_clean_tree() {
  local context="$1"

  if [[ -n "$(git status --porcelain)" ]]; then
    fail "Working tree must be clean (${context})."
  fi
}

is_valid_semver() {
  [[ "$1" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]
}

version_gt() {
  local target="$1"
  local current="$2"
  local target_major target_minor target_patch
  local current_major current_minor current_patch

  IFS=. read -r target_major target_minor target_patch <<<"$target"
  IFS=. read -r current_major current_minor current_patch <<<"$current"

  if ((10#$target_major > 10#$current_major)); then
    return 0
  fi
  if ((10#$target_major < 10#$current_major)); then
    return 1
  fi

  if ((10#$target_minor > 10#$current_minor)); then
    return 0
  fi
  if ((10#$target_minor < 10#$current_minor)); then
    return 1
  fi

  ((10#$target_patch > 10#$current_patch))
}

publish=false
initial=false
target_version=""

for arg in "$@"; do
  case "$arg" in
    --publish)
      publish=true
      ;;
    --initial)
      initial=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "$target_version" ]]; then
        target_version="$arg"
      else
        fail "Unexpected argument: $arg"
      fi
      ;;
  esac
done

if [[ -z "$target_version" ]]; then
  usage
  fail "Target version is required."
fi

if ! command -v jq >/dev/null 2>&1; then
  fail "jq is required but not found on PATH."
fi

branch="$(git branch --show-current)"
if [[ "$branch" != "main" ]]; then
  fail "Releases must run from main (current: $branch)."
fi

ensure_clean_tree "before release"

current_version="$(jq -r .version package.json)"
if [[ -z "$current_version" || "$current_version" == "null" ]]; then
  fail "Could not read package.json version."
fi
package_name="$(jq -r .name package.json)"
if [[ -z "$package_name" || "$package_name" == "null" ]]; then
  fail "Could not read package.json name."
fi

if ! is_valid_semver "$current_version"; then
  fail "Current version '$current_version' is not simple semver X.Y.Z."
fi

if ! is_valid_semver "$target_version"; then
  fail "Target version '$target_version' must be semver X.Y.Z."
fi

if [[ "$initial" == "true" ]]; then
  if [[ "$target_version" != "$current_version" ]]; then
    fail "Initial publish target must match current package.json version ($current_version)."
  fi
else
  if ! version_gt "$target_version" "$current_version"; then
    fail "Target version $target_version must be greater than current $current_version."
  fi
fi

if git rev-parse --quiet --verify "refs/tags/v$target_version" >/dev/null; then
  fail "Tag v$target_version already exists."
fi

set +e
npm_view_output="$(npm view "$package_name@$target_version" version 2>&1)"
npm_view_status=$?
set -e

version_exists_on_npm=false
if [[ "$npm_view_status" -eq 0 ]]; then
  version_exists_on_npm=true
elif [[ "$npm_view_output" == *"E404"* || "$npm_view_output" == *"404 Not Found"* ]]; then
  version_exists_on_npm=false
else
  fail "Unable to verify npm registry state for $package_name@$target_version."
fi

if [[ "$version_exists_on_npm" == "true" ]]; then
  fail "Version $package_name@$target_version already exists on npm."
fi

echo "Running test suite..."
npm test

echo "Checking publish artifact..."
npm pack --dry-run

if ! npm whoami >/dev/null 2>&1; then
  if [[ "$publish" == "true" ]]; then
    fail "npm authentication missing. Run npm login before publishing."
  fi

  echo "Warning: npm authentication not detected (run npm login before publish)."
fi

if [[ "$publish" != "true" ]]; then
  echo
  echo "Preflight checks passed for v$target_version."
  if [[ "$initial" == "true" ]]; then
    echo "To publish: npm run release:publish:initial -- $target_version"
  else
    echo "To publish: npm run release:publish -- $target_version"
  fi
  exit 0
fi

ensure_clean_tree "before version bump"

if [[ "$initial" == "true" ]]; then
  echo "Initial publish path: using existing version $target_version from package.json."
  echo "Publishing $package_name@$target_version to npm..."
  npm publish --access public

  echo "Creating git tag v$target_version..."
  git tag -a "v$target_version" -m "Release v$target_version"

  echo "Initial release complete: v$target_version"
  exit 0
fi

echo "Bumping package version to $target_version (creates commit + tag)..."
npm version "$target_version"

echo "Publishing $package_name@$target_version to npm..."
npm publish --access public

echo "Release complete: v$target_version"
