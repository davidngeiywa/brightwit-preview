#!/usr/bin/env bash
# Publish the Brightwit concepts to GitHub Pages at https://brightwit.dta.co.ke
# Run from the site/ folder in Git Bash. Needs: gh (logged in), git.
set -euo pipefail
REPO="brightwit-preview"
OWNER="$(gh api user --jq .login)"

# 1. Create the public repo once (GitHub Pages on a private repo needs a paid plan).
if ! gh repo view "$OWNER/$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" --public --description "Design preview" --disable-wiki --disable-issues
fi

# 2. Push the current site.
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$OWNER/$REPO.git"
git push -u origin main --force

# 3. Turn on Pages from main branch root, with the custom domain and HTTPS.
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/' >/dev/null 2>&1 || true
gh api -X PUT "repos/$OWNER/$REPO/pages" -f cname=brightwit.dta.co.ke >/dev/null
sleep 20
gh api -X PUT "repos/$OWNER/$REPO/pages" -F https_enforced=true >/dev/null 2>&1 || true

echo
echo "Pushed. GitHub Pages will serve https://$OWNER.github.io/$REPO/ within a minute or two."
echo "Custom domain brightwit.dta.co.ke works once the CNAME record (brightwit -> $OWNER.github.io, DNS only) exists in Cloudflare"
echo "and GitHub has issued the certificate (usually 5-15 minutes)."
