# Harness Development Makefile
# Run `make help` to see available commands

.PHONY: help install setup preflight worktree-ready verify-work hooks hooks-pre-commit hooks-pre-push secrets-staged docs-style-changed related-tests semgrep-changed diagrams-check dev build lint docs-lint fmt typecheck test check audit secrets security clean reset ci diagrams env-check

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# === Setup ===

install: ## Install dependencies
	npm install

setup: install hooks ## Full setup: install deps and configure git hooks

preflight: ## Run repository preflight checks (required local-memory gate by default)
	@bash ./scripts/codex-preflight.sh

worktree-ready: ## Bootstrap a fresh git worktree before first push
	@bash ./scripts/prepare-worktree.sh

verify-work: ## Run canonical repo-local verification wrapper
	@bash ./scripts/verify-work.sh

hooks: ## Setup git hooks
	node scripts/setup-git-hooks.js

hooks-pre-commit: ## Run local pre-commit gates before creating a commit
	npm run lint
	npm run docs:lint
	npm run typecheck
	$(MAKE) secrets-staged
	$(MAKE) docs-style-changed
	$(MAKE) related-tests

hooks-pre-push: ## Run local pre-push governance gates before pushing
	@bash ./scripts/verify-work.sh --fast --all

secrets-staged: ## Scan staged content for secrets before committing
	npm run secrets:staged

docs-style-changed: ## Run Vale on staged authoritative docs only
	npm run docs:style:changed

related-tests: ## Run Vitest related mode for staged src implementation files
	npm run test:related

semgrep-changed: ## Run narrow Semgrep rules against changed src implementation files
	npm run semgrep:changed

diagrams-check: ## Refresh architecture diagrams when sensitive paths change and fail on drift
	@bash ./scripts/check-diagram-freshness.sh

# === Development ===

dev: ## Start development server
	npm run dev

build: ## Build for production
	npm run build

# === Quality ===

lint: ## Run linter
	npm run lint

docs-lint: ## Lint markdown/docs
	npm run docs:lint

fmt: ## Format code
	npm run fmt

typecheck: ## Run TypeScript type checking
	npm run typecheck

test: ## Run tests
	npm test

check: ## Run all required quality gates
	npm run check

# === Security ===

audit: ## Run security audit
	npm audit

secrets: ## Scan for secrets with gitleaks
	@gitleaks detect --source . --verbose || (echo "Install gitleaks: brew install gitleaks" && exit 1)

security: audit secrets ## Run all security checks

# === Maintenance ===

clean: ## Clean build artifacts and caches
	rm -rf dist coverage artifacts .test-traces* .traces
	rm -rf node_modules/.cache

reset: clean ## Full reset: clean and reinstall
	npm install

# === CI ===

ci: ## Run CI-equivalent local checks
	npm run check

# === Diagrams ===

diagrams: ## Generate architecture diagrams
	@bash ./scripts/refresh-diagram-context.sh --force

# === Environment ===

env-check: ## Check environment policy envelope
	@bash ./scripts/check-environment.sh
