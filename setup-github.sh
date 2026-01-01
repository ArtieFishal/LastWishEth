#!/bin/bash

# GitHub Setup Script for LastWish.eth
# This script helps you connect your local repo to GitHub

echo "🚀 GitHub Setup for LastWish.eth"
echo "================================"
echo ""

# Check if already has remote
if git remote get-url origin 2>/dev/null; then
    echo "⚠️  You already have a remote configured:"
    git remote -v
    echo ""
    read -p "Do you want to replace it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
    else
        echo "Keeping existing remote. Exiting."
        exit 0
    fi
fi

echo "📝 Step 1: Create a GitHub repository"
echo "   Go to: https://github.com/new"
echo "   Name it: lastwisheth (or any name)"
echo "   DO NOT initialize with README"
echo "   Click 'Create repository'"
echo ""
read -p "Press Enter after you've created the repository..."

echo ""
echo "📋 Step 2: Enter your GitHub repository URL"
echo "   It should look like: https://github.com/YOUR_USERNAME/lastwisheth.git"
read -p "Repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

echo ""
echo "🔗 Adding GitHub remote..."
git remote add origin "$REPO_URL"

echo ""
echo "📤 Pushing to GitHub..."
echo "   (You may be prompted for GitHub credentials)"
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Your code is now on GitHub!"
    echo ""
    echo "📋 Next Steps:"
    echo "   1. Go to https://app.netlify.com"
    echo "   2. Click 'Add new site' → 'Import an existing project'"
    echo "   3. Choose 'Deploy with GitHub'"
    echo "   4. Select your 'lastwisheth' repository"
    echo "   5. Netlify will auto-detect settings and deploy"
    echo ""
    echo "🎉 After that, every 'git push' will auto-deploy!"
else
    echo ""
    echo "❌ Push failed. Common issues:"
    echo "   - Wrong repository URL"
    echo "   - Need to authenticate (use GitHub Personal Access Token)"
    echo "   - Repository doesn't exist yet"
    echo ""
    echo "Try again or set up manually using GITHUB_SETUP.md"
fi

