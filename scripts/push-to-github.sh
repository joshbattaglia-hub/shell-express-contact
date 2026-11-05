#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Exclude secrets from any accidental add
git ls-files -z | tr '\0' '\n' | grep -E 'password|secret|\.env$|\.netlify|^node_modules' && {
  echo "Refusing: secret-like tracked files" >&2
  exit 1
} || true
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/joshbattaglia-hub/shell-express-contact.git
# Prefer gh credential helper
gh auth setup-git
git push -u origin main
echo "PUSHED $(git rev-parse HEAD)"
echo "FILES $(git ls-files | wc -l)"
