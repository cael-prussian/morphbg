#!/bin/bash

# Quick Deploy to GitHub + jsDelivr
# Creates git repo, commits files, and creates release tag

set -e

VERSION="1.0.0"
REPO_URL=""  # Will be set after creating GitHub repo

echo "🚀 Deploying Cael Shaders to GitHub..."
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    echo ""
fi

# Check for existing remote
if git remote | grep -q origin; then
    echo "✅ Git remote 'origin' already exists"
    REPO_URL=$(git remote get-url origin)
else
    echo "⚠️  No git remote found."
    echo ""
    echo "Please create a GitHub repository first, then run:"
    echo "   git remote add origin https://github.com/cael-prussian/morphbg.git"
    echo ""
    read -p "Have you created the GitHub repo and added the remote? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Exiting. Please create GitHub repo first."
        exit 1
    fi
    REPO_URL=$(git remote get-url origin)
fi

echo ""
echo "Repository: $REPO_URL"
echo "Version: v$VERSION"
echo ""

# Stage all files
echo "📝 Staging files..."
git add .

# Check if there are changes to commit
if git diff-index --quiet HEAD --; then
    echo "✅ No changes to commit"
else
    echo "💾 Committing changes..."
    git commit -m "Release v$VERSION - Shader system for Webflow"
fi

# Push to main
echo ""
echo "⬆️  Pushing to main branch..."
git branch -M main
git push -u origin main

# Create and push tag
echo ""
echo "🏷️  Creating version tag v$VERSION..."
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    echo "⚠️  Tag v$VERSION already exists. Skipping."
else
    git tag -a "v$VERSION" -m "Release v$VERSION"
    git push origin "v$VERSION"
    echo "✅ Tag v$VERSION created and pushed"
fi

echo ""
echo "✨ Deployment complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Your shaders are now live on jsDelivr!"
echo ""
echo "Wait ~5 minutes for CDN propagation, then test:"
echo ""

# Extract username and repo from URL
if [[ $REPO_URL =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    REPO="${BASH_REMATCH[2]}"
    
    echo "📦 jsDelivr URLs:"
    echo ""
    echo "Engine:"
    echo "https://cdn.jsdelivr.net/gh/$USERNAME/$REPO@$VERSION/gs-engine.js"
    echo ""
    echo "GS1 Shader:"
    echo "https://cdn.jsdelivr.net/gh/$USERNAME/$REPO@$VERSION/gs1/config.js"
    echo "https://cdn.jsdelivr.net/gh/$USERNAME/$REPO@$VERSION/gs1/shader.js"
    echo "https://cdn.jsdelivr.net/gh/$USERNAME/$REPO@$VERSION/gs1/adaptor.js"
    echo ""
    echo "Test in browser:"
    echo "https://cdn.jsdelivr.net/gh/$USERNAME/$REPO@$VERSION/gs-engine.js"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. Wait 5 minutes for jsDelivr CDN to update"
    echo "2. Test the URL above in your browser"
    echo "3. Use in Webflow (see JSDELIVR_DEPLOYMENT.md)"
    echo "4. (Optional) Publish to npm: npm publish --access public"
    echo ""
    echo "💡 To update:"
    echo "   1. Make changes"
    echo "   2. Update VERSION in this script (e.g., 1.0.1)"
    echo "   3. Run ./deploy-to-github.sh again"
fi
