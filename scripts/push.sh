#!/bin/bash
set -e

# Auto-increment tag and push to main
# Usage: ./scripts/push.sh [optional message]

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Error: Must be on main branch to push with auto-tagging"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check if there are changes to commit
if git diff --quiet && git diff --cached --quiet; then
    echo "No changes to commit"
else
    echo "Committing changes..."
    git add -A
    MESSAGE="${1:-"Update"}"
    git commit -m "$MESSAGE"
fi

# Get the latest tag or create v0.0.0 if none exists
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")

# Parse the tag components
TAG_VERSION="${LATEST_TAG#v}"
IFS='.' read -r MAJOR MINOR PATCH <<< "$TAG_VERSION"

# Increment patch version
PATCH=$((PATCH + 1))
NEW_TAG="v${MAJOR}.${MINOR}.${PATCH}"

echo "Latest tag: $LATEST_TAG"
echo "New tag: $NEW_TAG"

# Create and push the new tag
git tag -a "$NEW_TAG" -m "Release $NEW_TAG"
git push origin main
git push origin "$NEW_TAG"

echo ""
echo "Pushed: main + tag $NEW_TAG"
echo "Release will be created at: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/tag/$NEW_TAG"
