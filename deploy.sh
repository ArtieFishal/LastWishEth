#!/bin/bash

# Quick Deploy Script for LastWish.eth
# Usage: ./deploy.sh "Your commit message"

if [ -z "$1" ]; then
    echo "❌ Please provide a commit message"
    echo "Usage: ./deploy.sh \"Your commit message\""
    exit 1
fi

echo "🚀 Deploying LastWish.eth..."
echo ""

# Add all changes
git add .

# Commit with message
git commit -m "$1"

# Deploy to Netlify
echo ""
echo "📤 Deploying to Netlify..."
netlify deploy --prod

echo ""
echo "✅ Deployment complete!"
echo "🌐 Site: https://dreamy-paprenjak-3e0b88.netlify.app"

