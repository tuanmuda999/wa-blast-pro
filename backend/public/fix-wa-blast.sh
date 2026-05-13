#!/bin/bash

echo "🔧 WA BLAST PRO - COMPLETE FIX SCRIPT"
echo "===================================="
echo ""

# Step 1: Backup dashboard.js
echo "📦 Step 1: Backing up dashboard.js..."
cd ~/wa-blast-pro/backend/public
cp dashboard.js dashboard.js.backup.$(date +%s)
echo "✅ Backup created"
echo ""

# Step 2: Fix dashboard.js dengan Python
echo "🔧 Step 2: Fixing dashboard.js API calls..."
python3 << 'PYEND'
with open('dashboard.js', 'r') as f:
    content = f.read()

# Replace all broken apiCall patterns
replacements = [
    ("apiCall('GET', '", "apiCall('"),
    ('apiCall("GET", "', 'apiCall("'),
    ("apiCall('POST', '", "apiCall('"),
    ('apiCall("POST", "', 'apiCall("'),
    ("apiCall('DELETE', '", "apiCall('"),
    ('apiCall("DELETE", "', 'apiCall("'),
    ("apiCall('PUT', '", "apiCall('"),
    ('apiCall("PUT", "', 'apiCall("'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open('dashboard.js', 'w') as f:
    f.write(content)

print("✅ Fixed all apiCall patterns!")
PYEND
echo ""

# Step 3: Verify fix
echo "🔍 Step 3: Verifying fixes..."
BROKEN_COUNT=$(grep -c "apiCall('GET'," dashboard.js 2>/dev/null || echo "0")
if [ "$BROKEN_COUNT" -eq "0" ]; then
    echo "✅ No broken patterns found!"
else
    echo "⚠️  Warning: Still found $BROKEN_COUNT broken patterns"
fi
echo ""

# Step 4: Setup Nginx configuration
echo "🌐 Step 4: Setting up Nginx..."
if [ ! -f /etc/nginx/sites-available/wa.tuanmuda.id ]; then
    echo "Creating Nginx config..."
    sudo tee /etc/nginx/sites-available/wa.tuanmuda.id > /dev/null << 'NGINXCONF'
server {
    listen 80;
    server_name wa.tuanmuda.id;

    # Frontend static files
    location / {
        root /root/wa-blast-pro/backend/public;
        try_files $uri $uri/ /index.html;
        
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }

    # Proxy ALL requests to backend
    location ~ ^/(api/|session/|sessions|contacts/|templates|blast/|message/|logs|stats|schedules|send/|analytics/|warmup/) {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:3000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    access_log /var/log/nginx/wa-blast-access.log;
    error_log /var/log/nginx/wa-blast-error.log;
}
NGINXCONF

    # Enable site
    sudo ln -sf /etc/nginx/sites-available/wa.tuanmuda.id /etc/nginx/sites-enabled/
    
    # Test and reload Nginx
    echo "Testing Nginx configuration..."
    sudo nginx -t
    
    if [ $? -eq 0 ]; then
        echo "Reloading Nginx..."
        sudo systemctl reload nginx
        echo "✅ Nginx configured and reloaded"
    else
        echo "❌ Nginx config test failed!"
        exit 1
    fi
else
    echo "✅ Nginx config already exists"
fi
echo ""

# Step 5: Restart PM2
echo "🔄 Step 5: Restarting backend..."
pm2 restart wa-blast-pro
echo "✅ Backend restarted"
echo ""

# Step 6: Test endpoints
echo "🧪 Step 6: Testing endpoints..."
sleep 2

echo "Testing localhost:3000/sessions..."
LOCALHOST_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/sessions)
if [ "$LOCALHOST_TEST" = "200" ]; then
    echo "✅ Localhost backend: OK"
else
    echo "⚠️  Localhost backend returned: $LOCALHOST_TEST"
fi

echo "Testing wa.tuanmuda.id/sessions..."
DOMAIN_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://wa.tuanmuda.id/sessions)
if [ "$DOMAIN_TEST" = "200" ]; then
    echo "✅ Domain proxy: OK"
else
    echo "⚠️  Domain proxy returned: $DOMAIN_TEST"
fi
echo ""

# Step 7: Final instructions
echo "===================================="
echo "✅ ALL FIXES COMPLETED!"
echo "===================================="
echo ""
echo "📋 Next steps:"
echo "1. Open browser"
echo "2. Go to wa.tuanmuda.id"
echo "3. Press Ctrl + Shift + Delete"
echo "4. Clear 'Cached images and files' for 'All time'"
echo "5. Press Ctrl + Shift + R (hard refresh) 3-5 times"
echo "6. Test create session"
echo ""
echo "🔍 If still issues, check browser console (F12)"
echo "📁 Backup saved at: dashboard.js.backup.*"
echo ""