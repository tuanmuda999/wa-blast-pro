async function apiCall(method, endpoint, data) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: 'apiCall',
            method,
            endpoint,
            data
        }, resolve);
    });
}

async function loadStats() {
    try {
        const sessions = await apiCall('GET', '/sessions');
        const analytics = await apiCall('GET', '/analytics/overview');

        document.getElementById('totalSessions').textContent = 
            sessions.sessions?.filter(s => s.connected).length || 0;
        
        document.getElementById('totalMessages').textContent = 
            analytics.today?.success || 0;
    } catch (err) {
        console.error('Failed to load stats:', err);
    }
}

document.getElementById('openDashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
});

document.getElementById('quickBlast').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') + '#blast' });
});

document.getElementById('manageContacts').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') + '#contacts' });
});

document.getElementById('viewAnalytics').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') + '#analytics' });
});

loadStats();
setInterval(loadStats, 5000);