// Background service untuk Chrome Extension

let API_BASE_URL = 'https://wa.tuanmuda.id';

// Listen untuk messages dari dashboard
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'apiCall') {
        handleApiCall(request, sendResponse);
        return true; // Keep channel open for async response
    }
});

async function handleApiCall(request, sendResponse) {
    const { method, endpoint, data } = request;
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`🔵 API Call: ${method} ${url}`);

    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        
        // CRITICAL: Check if response is OK
        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            sendResponse({ 
                error: `Server error: ${response.status} ${response.statusText}`,
                details: `Backend might not be running or endpoint doesn't exist: ${url}`
            });
            return;
        }

        // CRITICAL: Check content-type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error(`❌ Non-JSON response:`, text.substring(0, 200));
            sendResponse({ 
                error: 'Server returned non-JSON response',
                details: 'Backend might be returning HTML error page. Check if server is running on port 3000.',
                preview: text.substring(0, 200)
            });
            return;
        }

        // Parse JSON safely
        const result = await response.json();
        console.log(`✅ API Success:`, result);
        sendResponse(result);

    } catch (error) {
        console.error(`❌ API Error:`, error);
        
        // Better error message
        let errorMessage = error.message;
        let details = '';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Cannot connect to backend server';
            details = 'Make sure backend is running: npm start in backend folder';
        } else if (error.message.includes('JSON')) {
            errorMessage = 'Server returned invalid JSON';
            details = 'Backend might be returning HTML. Check server logs.';
        }
        
        sendResponse({ 
            error: errorMessage,
            details: details,
            originalError: error.message
        });
    }
}

// Optional: Check server status on extension load
chrome.runtime.onInstalled.addListener(async () => {
    console.log('🚀 WhatsApp Blast Pro Extension Loaded');
    
    // Test backend connection
    try {
        const response = await fetch(`${API_BASE_URL}/sessions`);
        if (response.ok) {
            console.log('✅ Backend server is running');
        } else {
            console.warn('⚠️ Backend returned error:', response.status);
        }
    } catch (err) {
        console.error('❌ Cannot connect to backend. Make sure server is running on port 3000');
        console.error('   Run: npm start in backend folder');
    }
});