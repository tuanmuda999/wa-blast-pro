#!/bin/bash
# Deploy Full Dashboard as Website

echo "🌐 Deploying Full Dashboard to wa.tuanmuda.id..."
echo ""

cd /root/wa-blast-pro/backend

# Step 1: Create public directory
echo "1. Creating public directory..."
mkdir -p public

# Step 2: Copy extension files
echo "2. Copying extension files..."
cp -r /root/wa-blast-pro/extension/* public/

# Step 3: Rename dashboard.html to index.html
echo "3. Renaming dashboard.html to index.html..."
cd public
if [ -f "dashboard.html" ]; then
    mv dashboard.html index.html
fi

# Step 4: Update dashboard.js URLs to relative
echo "4. Updating API URLs to relative..."
sed -i "s|fetch('https://wa.tuanmuda.id/|fetch('/|g" dashboard.js
sed -i "s|fetch('http://localhost:3000/|fetch('/|g" dashboard.js

# Step 5: Add static serving to server.js if not exists
echo "5. Configuring static file serving..."
cd /root/wa-blast-pro/backend

if ! grep -q "express.static" server.js; then
    # Add static serving after CORS
    sed -i '/app\.use(cors({/,/}));/a\\n// Serve static files\napp.use(express.static("public"));\n\n// Serve index.html for root\napp.get("/", (req, res) => {\n    res.sendFile(__dirname + "/public/index.html");\n});' server.js
    echo "   ✅ Static serving added"
else
    echo "   ✅ Static serving already configured"
fi

# Step 6: Restart backend
echo "6. Restarting backend..."
pm2 restart wa-blast-pro

sleep 3

# Step 7: Test
echo ""
echo "7. Testing deployment..."
curl -s -I https://wa.tuanmuda.id/ | head -5

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Open in browser: https://wa.tuanmuda.id/"
echo ""