#!/bin/bash
# Safe cleanup script to free up disk space

echo "🧹 Starting disk cleanup..."
echo ""

# 1. Clear npm cache (3.2GB)
echo "1️⃣  Clearing npm cache (3.2GB)..."
npm cache clean --force
echo "✅ npm cache cleared"
echo ""

# 2. Clear iOS Simulators (2.5GB)
echo "2️⃣  Clearing unavailable iOS simulators (2.5GB)..."
xcrun simctl delete unavailable 2>/dev/null || echo "No unavailable simulators found"
rm -rf ~/Library/Developer/CoreSimulator/Caches/* 2>/dev/null
echo "✅ iOS Simulator cache cleared"
echo ""

# 3. Clear pip cache (900MB)
echo "3️⃣  Clearing pip cache (900MB)..."
pip cache purge 2>/dev/null || echo "pip not found or no cache"
echo "✅ pip cache cleared"
echo ""

# 4. Clear Xcode DerivedData (safe - rebuilds on next use)
echo "4️⃣  Clearing Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null
echo "✅ Xcode DerivedData cleared"
echo ""

# 5. Clear system logs (979MB)
echo "5️⃣  Clearing old system logs..."
sudo rm -rf /var/log/*.log.* 2>/dev/null || echo "Skipping system logs (requires sudo)"
rm -rf ~/Library/Logs/* 2>/dev/null
echo "✅ Logs cleared"
echo ""

# 6. Clear browser caches (if needed)
echo "6️⃣  Clearing browser caches..."
rm -rf ~/Library/Caches/Google/* 2>/dev/null
rm -rf ~/Library/Caches/com.apple.MobileSMS/* 2>/dev/null
echo "✅ Browser caches cleared"
echo ""

# 7. Clear old Xcode archives (if you don't need them)
echo "7️⃣  Checking Xcode Archives..."
ARCHIVES_SIZE=$(du -sh ~/Library/Developer/Xcode/Archives 2>/dev/null | cut -f1)
if [ ! -z "$ARCHIVES_SIZE" ]; then
    echo "   Found $ARCHIVES_SIZE in Xcode Archives"
    echo "   Run this manually if you want to delete:"
    echo "   rm -rf ~/Library/Developer/Xcode/Archives/*"
fi
echo ""

echo "✨ Cleanup complete!"
echo ""
echo "💡 Additional manual cleanup:"
echo "   - Delete the 6.34GB Ubuntu ISO from Downloads"
echo "   - Delete old .zip files from Downloads (700MB+)"
echo "   - Empty Trash"
echo ""
df -h / | tail -1

