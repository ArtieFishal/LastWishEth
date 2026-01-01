#!/bin/bash

# Netlify Environment Variables Setup Script
# This script helps you import .env.local variables into Netlify

echo "🔐 Netlify Environment Variables Setup"
echo "======================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "   Please create .env.local with your environment variables first."
    exit 1
fi

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📦 Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

echo "📋 Reading environment variables from .env.local..."
echo ""

# Required variables for LastWish.eth
REQUIRED_VARS=(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID"
    "MORALIS_API_KEY"
    "PAYMENT_RECEIVER_ADDRESS"
)

# Check if we're in a Netlify site
if [ ! -f .netlify/state.json ]; then
    echo "⚠️  Not linked to a Netlify site yet."
    echo ""
    read -p "Do you want to link this site to Netlify now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🔗 Linking to Netlify..."
        netlify link
    else
        echo "❌ Please link to Netlify first: netlify link"
        exit 1
    fi
fi

echo ""
echo "📤 Setting environment variables in Netlify..."
echo ""

# Read .env.local and set variables
while IFS='=' read -r key value || [ -n "$key" ]; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" =~ ^#.*$ ]] && continue
    
    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")
    
    # Skip if value is empty
    [[ -z "$value" ]] && continue
    
    echo "   Setting $key..."
    netlify env:set "$key" "$value" --context production 2>/dev/null || \
    netlify env:set "$key" "$value" 2>/dev/null || \
    echo "   ⚠️  Failed to set $key (may already exist)"
done < .env.local

echo ""
echo "✅ Environment variables set!"
echo ""
echo "📋 To verify, run: netlify env:list"
echo "   Or check in Netlify dashboard: Site settings → Environment variables"
echo ""

