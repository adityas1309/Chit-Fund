#!/usr/bin/env bash
# Run frontend checks: typecheck, lint, tests, build.
set -euo pipefail
cd "$(dirname "$0")/../frontend"
echo "==> npm ci"
npm ci
echo "==> typecheck"
npm run typecheck
echo "==> lint"
npm run lint
echo "==> tests"
npm test
echo "==> build"
npm run build
