#!/usr/bin/env python3
"""Evaluate cross-repo hook-governance rollout readiness and recovery SLOs."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

try:  # pragma: no cover
    import yaml
except ModuleNotFoundError:  # pragma: no cover
    yaml = None


DEFAULT_REQUIRED_GATE_IDS = (
    "docstrings",
    "lint",
    "typecheck",
    "spelling",
    "unit",
    "formatting",
)

PROFILE_TO_WAVE = {
    "standard-prek-wrapper": "wave-1",
    "mixed-framework-transitional": "wave-2",
    "repo-specific-exception": "wave-3",
}


class RolloutCheckError(ValueError):
    """Raised when rollout check inputs are invalid."""


def load_structured_file(path: Path) -> object:
    raw_text = path.read_text(encoding="utf-8")
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        if yaml is not None:
            return yaml.safe_load(raw_text)
    raise RolloutCheckError(
        f"unable to parse structured file '{path}' as JSON or YAML"
    )


def parse_rfc3339_utc(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def utc_now_rfc3339() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_path_portable(path_str: str) -> str:
    """Convert absolute paths to portable relative form by removing user-specific prefixes."""
    path_obj = Path(path_str)
    try:
        # Try to make it relative to the current working directory
        return str(path_obj.relative_to(Path.cwd()))
    except ValueError:
        # If that fails, strip common user-specific prefixes like /Users/username/dev/
        # to make the path more portable
        parts = path_obj.parts
        if len(parts) > 3 and parts[0] == "/" and parts[1] in ("Users", "home"):
            # Remove /Users/username/dev or /home/username/dev and similar patterns
            for i in range(len(parts)):
                if parts[i] in ("dev", "projects", "repos", "workspace"):
                    return str(Path(*parts[i:]))
        return str(path_obj)


def _extract_gate_ids(stages: object) -> set[str]:
    if not isinstance(stages, list):
        return set()
    gate_ids: set[str] = set()
    for stage in stages:
        if not isinstance(stage, dict):
            continue
        gate_id = stage.get("gate_id")
        if isinstance(gate_id, str) and gate_id:
            gate_ids.add(gate_id)
    return gate_ids


def _evaluate_repo(
    repo: dict[str, object],
    required_gate_ids: tuple[str, ...],
    recovery_slo_hours: int,
    now: datetime,
) -> dict[str, object]:
    repo_name = repo.get("repo_name")
    repo_path_value = repo.get("repo_path")
    profile_type = repo.get("profile_type")
    if not isinstance(repo_name, str) or not repo_name:
        raise RolloutCheckError("inventory repository is missing repo_name")
    if not isinstance(repo_path_value, str) or not repo_path_value:
        raise RolloutCheckError(f"inventory repository '{repo_name}' is missing repo_path")
    if not isinstance(profile_type, str) or not profile_type:
        profile_type = "repo-specific-exception"

    repo_path = Path(repo_path_value)
    artifact_path = repo_path / ".codex" / "hook-conformance.json"
    rollout_wave = PROFILE_TO_WAVE.get(profile_type, "wave-unclassified")

    issues: list[str] = []
    warnings: list[str] = []

    if not artifact_path.is_file():
        issues.append(
            f"repo '{repo_name}' missing conformance artifact: {artifact_path}"
        )
        return {
            "repo_name": repo_name,
            "repo_path": _make_path_portable(str(repo_path)),
            "profile_type": profile_type,
            "rollout_wave": rollout_wave,
            "artifact_path": _make_path_portable(str(artifact_path)),
            "status": "fail",
            "issues": issues,
            "warnings": warnings,
        }

    try:
        artifact = load_structured_file(artifact_path)
    except RolloutCheckError as exc:
        issues.append(f"repo '{repo_name}' artifact parse error: {exc}")
        return {
            "repo_name": repo_name,
            "repo_path": _make_path_portable(str(repo_path)),
            "profile_type": profile_type,
            "rollout_wave": rollout_wave,
            "artifact_path": _make_path_portable(str(artifact_path)),
            "status": "fail",
            "issues": issues,
            "warnings": warnings,
        }

    if not isinstance(artifact, dict):
        issues.append(f"repo '{repo_name}' artifact must be a JSON object")
        return {
            "repo_name": repo_name,
            "repo_path": _make_path_portable(str(repo_path)),
            "profile_type": profile_type,
            "rollout_wave": rollout_wave,
            "artifact_path": _make_path_portable(str(artifact_path)),
            "status": "fail",
            "issues": issues,
            "warnings": warnings,
        }

    schema_version = artifact.get("schema_version")
    if schema_version != "hook-conformance.v1":
        issues.append(
            f"repo '{repo_name}' artifact schema_version must be 'hook-conformance.v1' (found '{schema_version}')"
        )
        return {
            "repo_name": repo_name,
            "repo_path": _make_path_portable(str(repo_path)),
            "profile_type": profile_type,
            "rollout_wave": rollout_wave,
            "artifact_path": _make_path_portable(str(artifact_path)),
            "status": "fail",
            "issues": issues,
            "warnings": warnings,
        }

    freshness_status = artifact.get("freshness_status")
    if freshness_status != "fresh":
        issues.append(
            f"repo '{repo_name}' artifact freshness_status must be 'fresh' (found '{freshness_status}')"
        )

    present_gate_ids = _extract_gate_ids(artifact.get("stages"))
    for gate_id in required_gate_ids:
        if gate_id not in present_gate_ids:
            issues.append(
                f"repo '{repo_name}' missing required gate category '{gate_id}' in conformance stages"
            )

    drift_flags = artifact.get("drift_flags", [])
    if not isinstance(drift_flags, list):
        drift_flags = []
    for flag in drift_flags:
        if not isinstance(flag, dict):
            continue
        if flag.get("severity") != "high":
            continue
        flag_id = flag.get("id")
        detected_at = flag.get("detected_at")
        if not isinstance(flag_id, str) or not flag_id:
            flag_id = "unknown-flag"
        if not isinstance(detected_at, str) or not detected_at:
            issues.append(
                f"repo '{repo_name}' high-severity drift flag '{flag_id}' is missing detected_at"
            )
            continue
        try:
            detected_at_dt = parse_rfc3339_utc(detected_at)
        except ValueError:
            issues.append(
                f"repo '{repo_name}' high-severity drift flag '{flag_id}' detected_at is not RFC3339 UTC"
            )
            continue

        age_hours = (now - detected_at_dt).total_seconds() / 3600.0
        if age_hours > float(recovery_slo_hours):
            issues.append(
                "repo '{repo}' recovery SLO exceeded for high-severity drift flag "
                "'{flag}' (age={age:.1f}h > {slo}h)".format(
                    repo=repo_name,
                    flag=flag_id,
                    age=age_hours,
                    slo=recovery_slo_hours,
                )
            )
        else:
            warnings.append(
                "repo '{repo}' high-severity drift flag '{flag}' is within recovery "
                "SLO window (age={age:.1f}h <= {slo}h)".format(
                    repo=repo_name,
                    flag=flag_id,
                    age=age_hours,
                    slo=recovery_slo_hours,
                )
            )

    return {
        "repo_name": repo_name,
        "repo_path": _make_path_portable(str(repo_path)),
        "profile_type": profile_type,
        "rollout_wave": rollout_wave,
        "artifact_path": _make_path_portable(str(artifact_path)),
        "status": "pass" if not issues else "fail",
        "issues": issues,
        "warnings": warnings,
    }


def evaluate_rollout(
    inventory_path: Path,
    required_gate_ids: tuple[str, ...],
    recovery_slo_hours: int,
    now_rfc3339: str | None = None,
) -> dict[str, object]:
    if recovery_slo_hours <= 0:
        raise RolloutCheckError("recovery_slo_hours must be greater than zero")

    inventory = load_structured_file(inventory_path)
    if not isinstance(inventory, dict):
        raise RolloutCheckError("inventory payload must be an object")
    repositories = inventory.get("repositories")
    if not isinstance(repositories, list):
        raise RolloutCheckError("inventory.repositories must be a list")

    if now_rfc3339:
        try:
            now = parse_rfc3339_utc(now_rfc3339)
        except ValueError as exc:
            raise RolloutCheckError("now_rfc3339 must be RFC3339 UTC") from exc
    else:
        now = datetime.now(timezone.utc).replace(microsecond=0)

    repo_summaries: list[dict[str, object]] = []
    blocking_issues: list[str] = []
    warnings: list[str] = []
    for repo in repositories:
        if not isinstance(repo, dict):
            continue
        summary = _evaluate_repo(
            repo=repo,
            required_gate_ids=required_gate_ids,
            recovery_slo_hours=recovery_slo_hours,
            now=now,
        )
        repo_summaries.append(summary)
        blocking_issues.extend(summary["issues"])
        warnings.extend(summary["warnings"])

    repo_summaries.sort(key=lambda item: str(item["repo_name"]))

    return {
        "schema_version": "hook-rollout-check.v1",
        "generated_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "inventory_path": _make_path_portable(str(inventory_path)),
        "recovery_slo_hours": recovery_slo_hours,
        "required_gate_ids": list(required_gate_ids),
        "overall_ok": len(blocking_issues) == 0,
        "repositories": repo_summaries,
        "blocking_issues": blocking_issues,
        "warnings": warnings,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--inventory",
        type=Path,
        required=True,
        help=(
            "path to repo-profile inventory JSON. "
            "Pass an explicit project-local or workspace inventory file."
        ),
    )
    parser.add_argument("--recovery-slo-hours", type=int, default=24)
    parser.add_argument(
        "--required-gates",
        default=",".join(DEFAULT_REQUIRED_GATE_IDS),
        help="comma-separated gate ids",
    )
    parser.add_argument("--out", type=Path)
    return parser.parse_args()


def _required_gates_from_arg(raw: str) -> tuple[str, ...]:
    gates = tuple(item.strip() for item in raw.split(",") if item.strip())
    if not gates:
        raise RolloutCheckError("--required-gates must include at least one gate id")
    return gates


def main() -> int:
    args = parse_args()
    try:
        result = evaluate_rollout(
            inventory_path=args.inventory.resolve(),
            required_gate_ids=_required_gates_from_arg(args.required_gates),
            recovery_slo_hours=args.recovery_slo_hours,
        )
    except (RolloutCheckError, FileNotFoundError) as exc:
        print(f"[rollout_check] {exc}")
        return 1

    if args.out is not None:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    else:
        print(json.dumps(result, indent=2, sort_keys=True))

    if not result["overall_ok"]:
        for issue in result["blocking_issues"]:
            print(f"[rollout_check] {issue}")
        return 1
    print("[rollout_check] OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
