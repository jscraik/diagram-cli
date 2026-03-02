#!/bin/sh
# Pre-commit hook: Run tests before committing
# Install: cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

echo "Running tests..."
npm test

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ Tests failed. Commit aborted."
  echo "Fix the failing tests or use 'git commit --no-verify' to skip."
  exit 1
fi

echo "✅ All tests passed."
exit 0
