#!/usr/bin/env bash
# Local environment preflight (strict)
# Fails fast when required tooling is missing.

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd)"
CONTRACT_PATH="$REPO_ROOT/harness.contract.json"
ATTESTATION_PATH="$REPO_ROOT/artifacts/policy/environment-attestation.json"
MISE_PATH="$REPO_ROOT/.mise.toml"
CODEX_ENVIRONMENT_PATH="$REPO_ROOT/.codex/environments/environment.toml"
MAKEFILE_PATH="$REPO_ROOT/Makefile"
PREK_CONFIG_PATH="$REPO_ROOT/prek.toml"
PACKAGE_JSON_PATH="$REPO_ROOT/package.json"
TOOLING_CONTRACT_PATH="${TOOLING_CONTRACT_PATH:-$REPO_ROOT/docs/agents/tooling.contract.json}"
TOOLING_DOC_PATH="${TOOLING_DOC_PATH:-$REPO_ROOT/docs/agents/tooling.md}"

if [[ ! -f "$CONTRACT_PATH" ]]; then
	echo "Error: missing contract file at $CONTRACT_PATH"
	exit 1
fi

if ! command -v rg >/dev/null 2>&1; then
	echo "Error: required binary 'rg' is not installed or not on PATH"
	exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
	echo "Error: required binary 'jq' is not installed or not on PATH"
	exit 1
fi

if [[ ! -f "$TOOLING_CONTRACT_PATH" ]]; then
	echo "Error: missing tooling contract at $TOOLING_CONTRACT_PATH"
	exit 1
fi

if [[ "${BASH_VERSINFO[0]:-0}" -lt 4 ]]; then
	echo "Error: scripts/check-environment.sh requires Bash 4+ (detected ${BASH_VERSION:-unknown})"
	echo "Fix: run with Bash 4+ (for example via mise) before running scripts/check-environment.sh or scripts/codex-preflight.sh."
	exit 1
fi

mapfile -t required_mise_tools < <(jq -r '.required_mise_tools[]' "$TOOLING_CONTRACT_PATH")
mapfile -t required_bins < <(jq -r '.required_bins[]' "$TOOLING_CONTRACT_PATH")
mapfile -t required_codex_actions < <(jq -r '.required_codex_actions[] | "\(.name)|\(.icon)"' "$TOOLING_CONTRACT_PATH")

declare -A expected_action_commands=(
	["Debug"]=$'set -euo pipefail\nnode src/diagram.js doctor . --strict'
)

if [[ "${#required_mise_tools[@]}" -eq 0 || "${#required_bins[@]}" -eq 0 || "${#required_codex_actions[@]}" -eq 0 ]]; then
	echo "Error: tooling contract is missing required list entries in $TOOLING_CONTRACT_PATH"
	exit 1
fi

if [[ ! -f "$MISE_PATH" ]]; then
	echo "Error: missing mise config at $MISE_PATH"
	exit 1
fi

if [[ ! -f "$CODEX_ENVIRONMENT_PATH" ]]; then
	echo "Error: missing Codex environment file at $CODEX_ENVIRONMENT_PATH"
	exit 1
fi

if [[ ! -f "$MAKEFILE_PATH" ]]; then
	echo "Error: missing required Makefile at $MAKEFILE_PATH"
	exit 1
fi

if [[ ! -f "$PREK_CONFIG_PATH" ]]; then
	echo "Error: missing required prek config at $PREK_CONFIG_PATH"
	exit 1
fi

required_support_files=("scripts/codex-preflight.sh" "scripts/codex-learn" "scripts/codex-enforced" "scripts/verify-work.sh" "scripts/prepare-worktree.sh" "scripts/check-staged-secrets.sh" "scripts/check-doc-style.sh" "scripts/check-related-tests.sh" "scripts/check-semgrep-changed.sh" "scripts/semgrep-pre-push.yml")
for support_file in "${required_support_files[@]}"; do
	if [[ ! -f "$REPO_ROOT/${support_file}" ]]; then
		echo "Error: missing required hook support file at $REPO_ROOT/${support_file}"
		exit 1
	fi
done

if ! command -v mise >/dev/null 2>&1; then
	echo "Error: required binary 'mise' is not installed or not on PATH"
	exit 1
fi

# Bootstrap the full repo-managed environment so hook validation reflects the
# pinned runtime versions and required approval posture, not only the caller
# shell's PATH.
eval "$(mise activate bash)"
export CLAUDE_APPROVAL_POSTURE="${CLAUDE_APPROVAL_POSTURE:-require}"
export CLAUDE_SECRET_FILTER="${CLAUDE_SECRET_FILTER:-gitleaks}"

for tool in "${required_mise_tools[@]}"; do
	tool_pattern="$(printf '%s' "$tool" | sed 's/[][(){}.^$*+?|\\]/\\&/g')"
	if ! rg -q "^[[:space:]]*(\"${tool_pattern}\"|${tool_pattern})[[:space:]]*=" "$MISE_PATH"; then
		echo "Error: required tool '$tool' is not pinned in $MISE_PATH [tools]"
		echo "Fix: add '$tool = \"<version>\"' to $MISE_PATH."
		exit 1
	fi
done

if [[ ! -f "$TOOLING_DOC_PATH" ]]; then
	echo "Error: tooling doc not found at $TOOLING_DOC_PATH"
	echo "Fix: run 'bash scripts/render-tooling-doc.sh' to generate it from $TOOLING_CONTRACT_PATH."
	exit 1
fi

for tool in "${required_mise_tools[@]}"; do
	if ! rg -Fq -- "\`$tool\`" "$TOOLING_DOC_PATH"; then
		echo "Error: tooling doc missing required mise tool '$tool': $TOOLING_DOC_PATH"
		echo "Fix: run 'bash scripts/render-tooling-doc.sh' to regenerate the document."
		exit 1
	fi
done

for bin in "${required_bins[@]}"; do
	if ! rg -Fq -- "\`$bin\`" "$TOOLING_DOC_PATH"; then
		echo "Error: tooling doc missing required binary '$bin': $TOOLING_DOC_PATH"
		echo "Fix: run 'bash scripts/render-tooling-doc.sh' to regenerate the document."
		exit 1
	fi
	if ! command -v "$bin" >/dev/null 2>&1; then
		echo "Error: required binary '$bin' is not installed or not on PATH"
		exit 1
	fi
done

for action in "${required_codex_actions[@]}"; do
	name="${action%%|*}"
	icon="${action##*|}"
	if ! rg -Fq -- "- \`$name\` (\`$icon\`)" "$TOOLING_DOC_PATH"; then
		echo "Error: tooling doc missing required Codex action '$name' (icon '$icon'): $TOOLING_DOC_PATH"
		echo "Fix: run 'bash scripts/render-tooling-doc.sh' to regenerate the document."
		exit 1
	fi
	if ! awk -v name="$name" -v icon="$icon" '
		function trim(value) {
			sub(/^[[:space:]]+/, "", value);
			sub(/[[:space:]]+$/, "", value);
			return value;
		}
		{
			line = trim($0);
			if (line == "[[actions]]") {
				if (in_block && found_name && found_icon) {
					matched = 1;
					exit 0;
				}
				in_block = 1;
				found_name = 0;
				found_icon = 0;
				next;
			}
			if (!in_block) {
				next;
			}
			if (line == ("name = \"" name "\"")) {
				found_name = 1;
				next;
			}
			if (line == ("icon = \"" icon "\"")) {
				found_icon = 1;
				next;
			}
		}
		END {
			if (in_block && found_name && found_icon) {
				matched = 1;
			}
			exit matched ? 0 : 1;
		}
	' "$CODEX_ENVIRONMENT_PATH"; then
		echo "Error: Codex environment action '$name' is missing or mapped to the wrong icon in $CODEX_ENVIRONMENT_PATH"
		exit 1
	fi

		if [[ -n "${expected_action_commands[$name]+set}" ]]; then
			actual_command="$(awk -v name="$name" '
				function trim(value) {
					sub(/^[[:space:]]+/, "", value);
					sub(/[[:space:]]+$/, "", value);
					return value;
				}
				BEGIN {
					sq = sprintf("%c", 39);
					triple = sq sq sq;
				}
				{
					line = trim($0);
				if (line == "[[actions]]") {
					in_block = 1;
					in_target = 0;
					in_command = 0;
					next;
				}
				if (!in_block) {
					next;
				}
				if (!in_target && line == ("name = \"" name "\"")) {
					in_target = 1;
					next;
				}
					if (!in_target) {
						next;
					}
					if (!in_command && index(line, "command =") == 1) {
						in_command = 1;
						next;
					}
					if (in_command) {
						if (line == triple) {
							found = 1;
							print command;
							exit 0;
					}
					if (length(command) > 0) {
						command = command "\n";
					}
					command = command line;
				}
			}
			END {
				exit found ? 0 : 1;
			}
		' "$CODEX_ENVIRONMENT_PATH")" || {
			echo "Error: Codex environment action '$name' is missing a command payload in $CODEX_ENVIRONMENT_PATH"
			exit 1
		}

		expected_command="${expected_action_commands[$name]}"
		if [[ "$actual_command" != "$expected_command" ]]; then
			echo "Error: Codex environment action '$name' command mismatch in $CODEX_ENVIRONMENT_PATH"
			echo "Expected command:"
			printf '%s\n' "$expected_command"
			echo "Actual command:"
			printf '%s\n' "$actual_command"
			exit 1
		fi
	fi
done

required_make_targets=("help" "install" "setup" "preflight" "worktree-ready" "verify-work" "hooks" "hooks-pre-commit" "hooks-pre-push" "secrets-staged" "docs-style-changed" "related-tests" "semgrep-changed" "diagrams-check" "lint" "docs-lint" "fmt" "typecheck" "test" "check" "audit" "secrets" "security" "clean" "reset" "ci" "diagrams" "env-check")
for target in "${required_make_targets[@]}"; do
	if ! rg -q "^${target}:" "$MAKEFILE_PATH"; then
		echo "Error: required Makefile target '$target' is missing from $MAKEFILE_PATH"
		exit 1
	fi
done

required_prek_hooks=("pre-commit|make hooks-pre-commit" "pre-push|make hooks-pre-push")
for hook_spec in "${required_prek_hooks[@]}"; do
	hook_name="${hook_spec%%|*}"
	hook_command="${hook_spec#*|}"
	if ! rg -q "^[[:space:]]*${hook_name}[[:space:]]*=[[:space:]]*\\[[[:space:]]*\"${hook_command}\"[[:space:]]*\\][[:space:]]*$" "$PREK_CONFIG_PATH"; then
		echo "Error: required prek hook '$hook_name' is missing or out of date in $PREK_CONFIG_PATH"
		exit 1
	fi
done

if [[ -f "$PACKAGE_JSON_PATH" ]]; then
	required_package_scripts=("secrets:staged|bash scripts/check-staged-secrets.sh" "docs:style:changed|bash scripts/check-doc-style.sh" "test:related|bash scripts/check-related-tests.sh" "semgrep:changed|bash scripts/check-semgrep-changed.sh")
	for script_spec in "${required_package_scripts[@]}"; do
		script_name="${script_spec%%|*}"
		script_command="${script_spec#*|}"
		if ! jq -e --arg script_name "$script_name" --arg script_command "$script_command" '
			(.scripts // {})[$script_name] == $script_command
		' "$PACKAGE_JSON_PATH" >/dev/null; then
			echo "Error: package script '$script_name' is missing or out of date in $PACKAGE_JSON_PATH"
			echo "Fix: run node scripts/setup-git-hooks.js"
			exit 1
		fi
	done

	required_simple_git_hooks=("pre-commit|make hooks-pre-commit" "commit-msg|node scripts/validate-commit-msg.js \$1" "pre-push|make hooks-pre-push")
	for hook_spec in "${required_simple_git_hooks[@]}"; do
		hook_name="${hook_spec%%|*}"
		hook_command="${hook_spec#*|}"
		if ! jq -e --arg hook_name "$hook_name" --arg hook_command "$hook_command" '
			.["simple-git-hooks"][$hook_name] == $hook_command
		' "$PACKAGE_JSON_PATH" >/dev/null; then
			echo "Error: simple-git-hooks entry '$hook_name' is missing or out of date in $PACKAGE_JSON_PATH"
			echo "Fix: run node scripts/setup-git-hooks.js"
			exit 1
		fi
	done

	# has_package_marker checks whether PACKAGE_JSON_PATH contains the given package marker in either `dependencies` or `devDependencies`.
	has_package_marker() {
		local marker="$1"
		jq -e --arg marker "$marker" '
			((.dependencies // {}) + (.devDependencies // {})) | has($marker)
		' "$PACKAGE_JSON_PATH" >/dev/null
	}

		repo_capabilities=()
		explicit_capabilities=()
		for capability in "${explicit_capabilities[@]}"; do
			[[ -n "$capability" ]] || continue
			repo_capabilities+=("$capability")
		done
		ui_markers=("react" "react-dom" "next" "vite" "tailwindcss" "@storybook/react" "@storybook/react-vite" "@radix-ui/react-slot")
		for marker in "${ui_markers[@]}"; do
			if has_package_marker "$marker"; then
				repo_capabilities+=("ui")
				break
			fi
		done

		chatgpt_apps_sdk_markers=("@openai/chatkit" "@openai/agents" "@openai/agents-realtime")
		for marker in "${chatgpt_apps_sdk_markers[@]}"; do
			if has_package_marker "$marker"; then
				repo_capabilities+=("chatgpt_apps_sdk")
				break
			fi
		done

		has_capability() {
			local wanted="$1"
			for capability in "${repo_capabilities[@]}"; do
				if [[ "$capability" == "$wanted" ]]; then
					return 0
				fi
			done
			return 1
		}

		has_required_package() {
			local pkg="$1"
			local dependency_type="$2"
			case "$dependency_type" in
				dependencies)
					jq -e --arg pkg "$pkg" '(.dependencies // {}) | has($pkg)' "$PACKAGE_JSON_PATH" >/dev/null
					;;
				devDependencies)
					jq -e --arg pkg "$pkg" '(.devDependencies // {}) | has($pkg)' "$PACKAGE_JSON_PATH" >/dev/null
					;;
				either)
					jq -e --arg pkg "$pkg" '((.dependencies // {}) | has($pkg)) or ((.devDependencies // {}) | has($pkg))' "$PACKAGE_JSON_PATH" >/dev/null
					;;
				*)
					return 1
					;;
			esac
		}

		required_package_specs=("@brainwav/design-system-guidance|either|ui,chatgpt_apps_sdk")
		for spec in "${required_package_specs[@]}"; do
			pkg="${spec%%|*}"
			rest="${spec#*|}"
			dependency_type="${rest%%|*}"
			required_caps_csv="${rest#*|}"
			should_apply=0
			IFS=',' read -r -a required_caps <<< "$required_caps_csv"
			for capability in "${required_caps[@]}"; do
				if has_capability "$capability"; then
					should_apply=1
					break
				fi
		done
			if [[ "$should_apply" -eq 1 ]] && ! has_required_package "$pkg" "$dependency_type"; then
				echo "Error: required package '$pkg' is missing from $PACKAGE_JSON_PATH for explicit or detected UI/App SDK capabilities"
				echo "Fix: npm i $pkg"
				exit 1
			fi
		done
	fi

	mkdir -p "$REPO_ROOT/artifacts/policy"

echo "Running harness environment preflight..."

# run_check_environment_with_runner runs a harness runner command to perform an environment check, captures and echoes its output, writes or extracts the generated attestation to $ATTESTATION_PATH, and returns non-zero if the runner fails or no attestation is produced.
run_check_environment_with_runner() {
	local label="$1"
	shift
	local -a runner=("$@")
	local output=""
	local exit_code=0

	rm -f "$ATTESTATION_PATH"

	echo "Using harness runner: $label"
	set +e
	output="$("${runner[@]}" check-environment \
		--contract "$CONTRACT_PATH" \
		--check-secrets \
		--json \
		--attestation "$ATTESTATION_PATH" 2>&1)"
	exit_code=$?
	set -e

	if [[ -n "$output" ]]; then
		printf '%s\n' "$output"
	fi

	if [[ "$exit_code" -ne 0 ]]; then
		echo "Runner failed: $label (exit $exit_code)"
		return 1
	fi

	if [[ ! -f "$ATTESTATION_PATH" ]]; then
		local json_line
		json_line="$(printf '%s\n' "$output" | awk '/^\{/{line=$0} END{if(line!="") print line}')"
		if [[ -n "$json_line" ]]; then
			printf '%s\n' "$json_line" > "$ATTESTATION_PATH"
		fi
	fi

	if [[ ! -f "$ATTESTATION_PATH" ]]; then
		echo "Runner produced no attestation output: $label"
		return 1
	fi

	return 0
}

if ! command -v npm >/dev/null 2>&1; then
	echo "Error: npm is required to validate global harness installation."
	exit 1
fi

if ! npm ls -g --depth=0 @brainwav/coding-harness >/dev/null 2>&1; then
	echo "Error: @brainwav/coding-harness is not installed globally via npm."
	echo "Install globally and retry:"
	echo "  npm i -g @brainwav/coding-harness"
	echo "Private registry auth is required:"
	echo "  - Local shell: export NPM_TOKEN=<token>"
	echo "  - CI (CircleCI): set NPM_TOKEN as a project environment variable in CircleCI project settings"
	exit 1
fi

if ! command -v harness >/dev/null 2>&1; then
	echo "Error: global harness binary is not on PATH after npm installation."
	echo "Fix: ensure npm global bin directory is on PATH, then retry."
	exit 1
fi

if ! run_check_environment_with_runner "global npm harness ($(command -v harness))" harness; then
	echo "Error: global npm harness failed to run check-environment successfully."
	echo "Reinstall and retry:"
	echo "  npm i -g @brainwav/coding-harness"
	echo "If this is CI (CircleCI), confirm NPM_TOKEN is set as a project environment variable."
	exit 1
fi

jq -e '.passed == true' "$ATTESTATION_PATH" >/dev/null
echo "Environment check passed (attestation: $ATTESTATION_PATH)"
