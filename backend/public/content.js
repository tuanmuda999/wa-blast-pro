// Inject custom UI into WhatsApp Web
(function() {
    // Wait for WhatsApp to load
    function waitForWhatsApp() {
        const header = document.querySelector('header');
        if (header) {
            injectBlastMenu();
        } else {
            setTimeout(waitForWhatsApp, 1000);
        }
    }

    function injectBlastMenu() {
        const header = document.querySelector('header');
        if (!header || document.getElementById('wa-blast-button')) return;

        const button = document.createElement('div');
        button.id = 'wa-blast-button';
        button.innerHTML = `
            <button class="wa-blast-trigger">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM8 14H6v-2h2v2zm0-3H6V9h2v2zm0-3H6V6h2v2zm7 6h-5v-2h5v2zm3-3h-8V9h8v2zm0-3h-8V6h8v2z"/>
                </svg>
                <span>Blast Pro</span>
            </button>
        `;

        button.querySelector('.wa-blast-trigger').addEventListener('click', openDashboard);
        header.appendChild(button);

        console.log('✓ WhatsApp Blast Pro Menu injected');
    }

    function openDashboard() {
        chrome.runtime.sendMessage({ action: 'openDashboard' });
    }

    // Listen for messages from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'injectPanel') {
            createFloatingPanel();
        }
    });

    function createFloatingPanel() {
        if (document.getElementById('wa-blast-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'wa-blast-panel';
        panel.innerHTML = `
            <div class="blast-panel-header">
                <h3>🚀 Blast Pro</h3>
                <button class="close-panel">×</button>
            </div>
            <div class="blast-panel-content">
                <div class="quick-actions">
                    <button class="action-btn" data-action="quick-blast">
                        ⚡ Quick Blast
                    </button>
                    <button class="action-btn" data-action="templates">
                        📝 Templates
                    </button>
                    <button class="action-btn" data-action="contacts">
                        📱 Contacts
                    </button>
                    <button class="action-btn" data-action="schedules">
                        ⏰ Schedules
                    </button>
                    <button class="action-btn" data-action="analytics">
                        📊 Analytics
                    </button>
                    <button class="action-btn" data-action="dashboard">
                        🎛️ Dashboard
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // Event listeners
        panel.querySelector('.close-panel').addEventListener('click', () => {
            panel.remove();
        });

        panel.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                handlePanelAction(action);
            });
        });
    }

    function handlePanelAction(action) {
        chrome.runtime.sendMessage({ 
            action: 'openDashboard',
            tab: action 
        });
    }

    // Start injection
    waitForWhatsApp();
})();