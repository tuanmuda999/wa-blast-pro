// This script runs in the WhatsApp Web page context
(function() {
    'use strict';

    console.log('🚀 WhatsApp Blast Pro - Injection Active');

    // Listen for custom events from content script
    window.addEventListener('wa-blast-action', (e) => {
        const { action, data } = e.detail;
        
        switch(action) {
            case 'extract-contacts':
                extractContacts();
                break;
            case 'get-chats':
                getChats();
                break;
        }
    });

    function extractContacts() {
        // Implementation to extract contacts from WhatsApp Web
        // This would use WhatsApp Web's internal API
        console.log('Extracting contacts...');
        
        // Send back to content script
        window.postMessage({
            type: 'wa-blast-contacts',
            contacts: []
        }, '*');
    }

    function getChats() {
        console.log('Getting chats...');
        
        window.postMessage({
            type: 'wa-blast-chats',
            chats: []
        }, '*');
    }

    // Monitor WhatsApp connection status
    const checkConnection = () => {
        const isConnected = document.querySelector('[data-icon="laptop"]');
        
        window.postMessage({
            type: 'wa-connection-status',
            connected: !!isConnected
        }, '*');
    };

    setInterval(checkConnection, 5000);

})();