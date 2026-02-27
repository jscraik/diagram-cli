.PHONY: diagrams-refresh diagrams-refresh-force diagrams-hook-install

diagrams-refresh:
	bash scripts/refresh-diagram-context.sh

diagrams-refresh-force:
	bash scripts/refresh-diagram-context.sh --force

diagrams-hook-install:
	bash scripts/install-repo-open-hook.sh
