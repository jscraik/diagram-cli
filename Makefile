# diagram-cli workflow Makefile
# Run `make help` to list commands.

.PHONY: help install setup hooks test test-watch test-deep ci-artifacts harness preflight-gates diagrams env-check clean

help: ## Show available targets
	@echo "Usage: make <target>"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies
	npm install

setup: install hooks ## Install deps and git hooks

hooks: ## Configure simple-git-hooks
	node scripts/setup-git-hooks.js

test: ## Run test suite
	npm test

test-watch: ## Run tests in watch mode
	npm run test:watch

test-deep: ## Run deeper regression checks
	npm run test:deep

ci-artifacts: ## Generate architecture artifacts
	npm run ci:artifacts

harness: ## Show harness help
	npm run harness -- --help

preflight-gates: ## Run harness preflight gate
	npm run harness -- preflight-gate --contract harness.contract.json

diagrams: ## Refresh AI context and diagram artifacts
	bash scripts/refresh-diagram-context.sh --force

env-check: ## Validate local harness environment
	bash scripts/check-environment.sh

clean: ## Remove generated artifacts
	rm -rf .diagram AI/diagrams .memory-metrics.json .harness
