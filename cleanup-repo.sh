#!/bin/bash
echo "🧹 Starting repository cleanup..."

# 1. CRITICAL - Remove sensitive files
echo "🚨 Removing auth sessions..."
git rm -r backend/auth_sessions/ 2>/dev/null
rm -rf backend/auth_sessions/

# 2. Remove backup files
echo "🗑️ Removing backup files..."
git rm backend/public/dashboard.js.CONTAMINATED_* 2>/dev/null
git rm backend/public/dashboard.js.before_auto_session 2>/dev/null
git rm backend/services/BlastOrchestratorAdvanced.js.BACKUP 2>/dev/null
rm -f backend/public/dashboard.js.CONTAMINATED_*
rm -f backend/public/dashboard.js.before_auto_session
rm -f backend/services/BlastOrchestratorAdvanced.js.BACKUP

# 3. Remove extension duplicate (keep web version)
echo "🔄 Removing extension duplicates..."
git rm -r extension/ 2>/dev/null
rm -rf extension/
git rm backend/public/background.js 2>/dev/null
git rm backend/public/content.js 2>/dev/null
git rm backend/public/inject.js 2>/dev/null
git rm backend/public/manifest.json 2>/dev/null
git rm backend/public/popup.html 2>/dev/null
git rm backend/public/popup.js 2>/dev/null
rm -f backend/public/background.js
rm -f backend/public/content.js
rm -f backend/public/inject.js
rm -f backend/public/manifest.json
rm -f backend/public/popup.html
rm -f backend/public/popup.js

# 4. Remove debug/development files
echo "🧹 Removing debug files..."
git rm debug-info.txt 2>/dev/null
git rm deploy-dashboard.sh 2>/dev/null
git rm backend/public/fix-wa-blast.sh 2>/dev/null
git rm backend/public/fix_dashboard.sh 2>/dev/null
git rm qr-viewer.html 2>/dev/null
git rm sites-enabled 2>/dev/null
rm -f debug-info.txt
rm -f deploy-dashboard.sh
rm -f backend/public/fix-wa-blast.sh
rm -f backend/public/fix_dashboard.sh
rm -f qr-viewer.html
rm -f sites-enabled

# 5. Update .gitignore
echo "📝 Updating .gitignore..."
cat > .gitignore << 'GITIGNORE_EOF'
# ==================== CRITICAL SECURITY ====================
# WhatsApp Session Data
backend/auth_sessions/
auth_sessions/
auth_info_*/
*.data.json
creds.json
pre-key-*.json
sender-key*.json
session-*.json
app-state-sync-*.json

# Databases
*.db
*.db-shm
*.db-wal
*.sqlite
database/*.db

# Environment & Secrets
.env
.env.*
*.key
*.pem

# ==================== DEPENDENCIES ====================
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
package-lock.json

# ==================== BUILD & TEMP ====================
dist/
build/
tmp/
temp/
*.tmp

# ==================== BACKUPS ====================
*.backup
*.backup.*
*.BACKUP
*.CONTAMINATED_*
*.before_*
*.old
*.bak

# ==================== DEBUG & SCRIPTS ====================
debug-info.txt
deploy-*.sh
fix-*.sh
qr-viewer.html
sites-enabled

# ==================== IDE & OS ====================
.vscode/
.idea/
*.swp
*.swo
.DS_Store
Thumbs.db

# ==================== LOGS ====================
logs/
*.log
GITIGNORE_EOF

git add .gitignore

# 6. Commit cleanup
echo "💾 Committing cleanup..."
git add -A
git commit -m "cleanup: Remove sensitive data, backups, duplicates, and debug files"

# 7. Show summary
echo ""
echo "✅ CLEANUP COMPLETE!"
echo ""
echo "Summary of changes:"
git diff HEAD~1 --stat
echo ""
echo "Files remaining:"
git ls-files | wc -l
echo ""
echo "⚠️ IMPORTANT: Review changes before pushing!"
echo "Run: git log -1 -p"
echo "Then: git push origin main --force"
echo ""

