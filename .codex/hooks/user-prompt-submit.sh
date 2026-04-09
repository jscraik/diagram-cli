#!/bin/zsh

set -euo pipefail

if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' '{"continue":true,"systemMessage":"jq not found; skipping UserPromptSubmit hook."}'
  exit 0
fi

input_json="$(cat)"
prompt="$(printf '%s' "$input_json" | jq -r '.prompt // ""')"
permission_mode="$(printf '%s' "$input_json" | jq -r '.permission_mode // "default"')"
prompt_lc="${prompt:l}"
block_reason=""

typeset -a context_parts
typeset -a instruction_override_markers=(
  "ig""nore|previous instructions"
  "ig""nore|the previous instructions"
  "ig""nore|all previous instructions"
  "for""get|previous instructions"
  "for""get|the previous instructions"
  "ov""erride|the system prompt"
  "ig""nore|system prompt"
  "ig""nore|developer instructions"
  "ig""nore|repo instructions"
  "ig""nore|project instructions"
  "ig""nore|agents.md"
  "dis""regard|agents.md"
  "by""pass|the guardrails"
  "disable|the guardrails"
  "ig""nore|the guardrails"
)
typeset -a validation_skip_markers=(
  "skip|validation"
  "skip|tests"
  "skip|test"
  "skip|lint"
  "skip|typecheck"
  "without|tests"
  "no|tests"
  "don.t|validate"
  "do not|validate"
  "ship it|without validation"
)
typeset -a destructive_markers=(
  "rm|-rf"
  "reset|--hard"
  "checkout|--"
  "dangerously|skip permissions"
  "--|yolo"
  "delete|everything"
  "remove|everything"
)

has_phrase_marker() {
  local haystack="$1"
  shift
  local marker=""
  local phrase=""
  for marker in "$@"; do
    phrase="${marker//|/ }"
    if [[ "$haystack" == *"$phrase"* ]]; then
      return 0
    fi
  done
  return 1
}

if has_phrase_marker "$prompt_lc" "${instruction_override_markers[@]}"; then
  block_reason="Cannot waive higher-priority system, developer, or repo instructions. Rephrase the request within the active guardrails."
fi

if has_phrase_marker "$prompt_lc" "${validation_skip_markers[@]}"; then
  context_parts+=("If validation is skipped, say so explicitly with a reason in the final handoff.")
fi

if has_phrase_marker "$prompt_lc" "${destructive_markers[@]}"; then
  context_parts+=("The prompt may imply destructive changes; verify scope carefully and protect unrelated edits.")
fi

case "$permission_mode" in
  bypassPerm""issions|dontAsk)
    if (( ${#context_parts[@]} > 0 )); then
      context_parts+=("High-autonomy mode is active, so apply extra caution before destructive or low-verification shortcuts.")
    fi
    ;;
esac

additional_context="${(j: :)context_parts}"

jq -n \
  --arg additional_context "$additional_context" \
  --arg block_reason "$block_reason" \
  '{
    continue: true,
    decision: (if $block_reason == "" then null else "block" end),
    reason: (if $block_reason == "" then null else $block_reason end),
    hookSpecificOutput: (
      if $additional_context == "" then null else {
        hookEventName: "UserPromptSubmit",
        additionalContext: $additional_context
      } end
    )
  } | with_entries(select(.value != null))'
