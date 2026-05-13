import SessionManager from './SessionManager.js';

// ==================== CONFIGURATION ====================
const BLAST_MODES = {
    SAFE: {
        name: 'Safe Mode',
        minDelay: 2000,
        maxDelay: 5000,
        batchSize: 50,
        description: 'Anti-ban protection active'
    },
    FAST: {
        name: 'Fast Mode',
        minDelay: 1000,
        maxDelay: 2000,
        batchSize: 200,
        description: 'Moderate speed, medium risk'
    },
    UNLIMITED: {
        name: 'Unlimited Mode',
        minDelay: 500,
        maxDelay: 1000,
        batchSize: 1000,
        description: 'High speed, high risk'
    },
    INSTANT: {
        name: 'Instant Mode',
        minDelay: 0,
        maxDelay: 0,
        batchSize: 10000,
        description: 'Maximum speed, maximum risk'
    }
};

// Active mode
const ACTIVE_MODE = BLAST_MODES.INSTANT;

console.log(`⚙️ Blast Mode: ${ACTIVE_MODE.name}`);
console.log(`   Description: ${ACTIVE_MODE.description}`);
console.log(`   Batch Size: ${ACTIVE_MODE.batchSize}`);
console.log(`   Delay Range: ${ACTIVE_MODE.minDelay}-${ACTIVE_MODE.maxDelay}ms`);

class BlastOrchestrator {
    constructor(db, io) {
        this.db = db;
        this.io = io;
        this.sessions = new Map();
        this.jobs = new Map();
    }

    async addSession(sessionId) {
        if (this.sessions.has(sessionId)) {
            throw new Error('Session already exists');
        }

        console.log(`➕ Adding session: ${sessionId}`);
        const session = new SessionManager(sessionId, this.db, this.io);
        this.sessions.set(sessionId, session);
        
        return session;
    }

    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }

    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    async removeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        await session.cleanup();
        this.sessions.delete(sessionId);
        console.log(`🗑️ Session removed: ${sessionId}`);
    }

    async sendSingle(sessionId, number, message) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        return await session.sendMessage(number, message);
    }

    async sendBulk(sessionId, numbers, message, delay = 0) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        const results = [];
        
        console.log(`📤 Bulk sending to ${numbers.length} numbers`);
        console.log(`⚡ UNLIMITED MODE - No hourly limits`);
        console.log(`⏱️ Delay: ${delay}ms between messages`);
        
        for (const number of numbers) {
            try {
                const result = await session.sendMessage(number, message);
                results.push(result);
                
                // Optional delay (can be 0 for instant)
                if (delay > 0) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
                
            } catch (err) {
                console.error(`❌ Failed to send to ${number}:`, err.message);
                results.push({
                    number,
                    status: 'failed',
                    error: err.message
                });
            }
        }
        
        console.log(`✅ Bulk send completed: ${results.length} total`);
        return results;
    }

    async sendMega(numbers, message, delay) {
        const activeSessions = this.getAllSessions().filter(s => s.isConnected());
        
        if (activeSessions.length === 0) {
            throw new Error('No active sessions available');
        }

        const jobId = Date.now().toString();
        this.jobs.set(jobId, { 
            status: 'running', 
            total: numbers.length, 
            completed: 0,
            sessions: activeSessions.length 
        });

        const chunks = this.distributeNumbers(numbers, activeSessions.length);
        
        const promises = activeSessions.map((session, index) => {
            return session.sendBulk(chunks[index], message, delay);
        });

        Promise.all(promises).then(results => {
            const allResults = results.flat();
            this.jobs.set(jobId, { status: 'completed', results: allResults });
        });

        return jobId;
    }

    distributeNumbers(numbers, sessionCount) {
        const chunks = Array.from({ length: sessionCount }, () => []);
        numbers.forEach((number, index) => {
            chunks[index % sessionCount].push(number);
        });
        return chunks;
    }

    getJobStatus(jobId) {
        return this.jobs.get(jobId);
    }

    async cleanup() {
        console.log('🧹 Cleaning up all sessions...');
        const cleanupPromises = Array.from(this.sessions.values()).map(s => s.cleanup());
        await Promise.all(cleanupPromises);
        this.sessions.clear();
    }

    // ==================== INSTANT MEGA BLAST (NO DELAYS) ====================
    async sendInstantMega(sessionId, listId, message) {
        console.log(`⚡ INSTANT MEGA BLAST INITIATED`);
        console.log(`   Session: ${sessionId}, List: ${listId}`);
        
        const jobId = `instant_${Date.now()}`;
        
        try {
            // Get session
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }
            
            if (!session.isConnected()) {
                throw new Error(`Session ${sessionId} not connected`);
            }
            
            // Get contacts - FIXED: Access better-sqlite3 via this.db.db
            const contacts = this.db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
            
            if (!contacts || contacts.length === 0) {
                throw new Error('No contacts found in list');
            }
            
            console.log(`⚡ Sending to ${contacts.length} numbers INSTANTLY`);
            console.log(`⚠️ WARNING: No delays - maximum speed mode`);
            
            // Send ALL messages simultaneously
            const sendPromises = contacts.map(async (contact) => {
                const recipient = contact.number + '@s.whatsapp.net';
                
                try {
                    await session.sock.sendMessage(recipient, {
                        text: message
                    });
                    
                    // Log to database - FIXED: Use DatabaseManager wrapper method
                    this.db.logMessage(sessionId, contact.number, message, 'sent');
                    
                    console.log(`✅ Instant sent to ${contact.number}`);
                    return { number: contact.number, status: 'sent' };
                    
                } catch (err) {
                    console.error(`❌ Failed to send to ${contact.number}:`, err.message);
                    
                    // Log error - FIXED: Use DatabaseManager wrapper method
                    this.db.logMessage(sessionId, contact.number, message, 'failed');
                    
                    return { number: contact.number, status: 'failed', error: err.message };
                }
            });
            
            // Wait for all to complete
            const results = await Promise.all(sendPromises);
            
            const successCount = results.filter(r => r.status === 'sent').length;
            const failedCount = results.filter(r => r.status === 'failed').length;
            
            console.log(`⚡ INSTANT BLAST COMPLETED`);
            console.log(`   ✅ Success: ${successCount}`);
            console.log(`   ❌ Failed: ${failedCount}`);
            console.log(`   📊 Total: ${contacts.length}`);
            
            return {
                jobId,
                total: contacts.length,
                success: successCount,
                failed: failedCount,
                results
            };
            
        } catch (err) {
            console.error(`❌ Instant blast error:`, err);
            throw err;
        }
    }

    // ==================== SMART BULK SEND (WITH MODE SELECTION) ====================
    async sendBulkSmart(sessionId, numbers, message, mode = 'instant') {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        const config = BLAST_MODES[mode.toUpperCase()] || BLAST_MODES.INSTANT;
        
        console.log(`🚀 Smart Bulk Send Started`);
        console.log(`   Mode: ${config.name}`);
        console.log(`   Recipients: ${numbers.length}`);
        console.log(`   Delay: ${config.minDelay}-${config.maxDelay}ms`);

        const jobId = `smart_${Date.now()}`;
        const results = [];

        // Process in batches
        const batches = [];
        for (let i = 0; i < numbers.length; i += config.batchSize) {
            batches.push(numbers.slice(i, i + config.batchSize));
        }

        console.log(`📦 Processing ${batches.length} batches of up to ${config.batchSize} messages`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            console.log(`📤 Batch ${i + 1}/${batches.length}: ${batch.length} messages`);

            for (const number of batch) {
                try {
                    await session.sendMessage(number, message);
                    results.push({ number, status: 'sent' });
                    console.log(`✅ Sent to ${number}`);

                    // Random delay within range
                    if (config.maxDelay > 0) {
                        const delay = Math.random() * (config.maxDelay - config.minDelay) + config.minDelay;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }

                } catch (err) {
                    console.error(`❌ Failed to send to ${number}:`, err.message);
                    results.push({ number, status: 'failed', error: err.message });
                }
            }

            console.log(`✅ Batch ${i + 1} completed`);
        }

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`🎉 Smart Bulk Send Completed`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed: ${failedCount}`);
        console.log(`   📊 Total: ${numbers.length}`);

        return {
            jobId,
            mode: config.name,
            total: numbers.length,
            success: successCount,
            failed: failedCount,
            results
        };
    }

    // ==================== MISSING METHODS FOR SERVER.JS COMPATIBILITY ====================

    // 1. sendSingleMessage() - ALIAS for sendSingle() + server.js compatibility
    async sendSingleMessage(sessionId, recipient, message) {
        console.log(`📤 Single message: ${sessionId} → ${recipient}`);
        return await this.sendSingle(sessionId, recipient, message);
    }

    // 2. sendGroupMessage() - Send message to WhatsApp group
    async sendGroupMessage(sessionId, groupId, message) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        try {
            console.log(`👥 Sending group message to ${groupId}`);
            
            const jid = groupId.includes('@g.us') ? groupId : `${groupId}@g.us`;
            
            await session.sock.sendMessage(jid, { text: message });
            
            this.db.logMessage(sessionId, groupId, message, 'sent');
            
            console.log(`✅ Group message sent to ${groupId}`);
            
            return {
                success: true,
                groupId,
                message: 'Group message sent successfully'
            };
        } catch (error) {
            console.error(`❌ Group message error:`, error);
            this.db.logMessage(sessionId, groupId, message, 'failed');
            throw error;
        }
    }

    // 3. sendMedia() - Send media file (image, video, document)
    async sendMedia(sessionId, recipient, media) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        try {
            console.log(`📎 Sending media to ${recipient}`);
            
            const jid = recipient.includes('@s.whatsapp.net') 
                ? recipient 
                : `${recipient}@s.whatsapp.net`;
            
            // Media can be: { image: buffer/url, caption: string }
            // or { video: buffer/url, caption: string }
            // or { document: buffer/url, mimetype: string, fileName: string }
            
            await session.sock.sendMessage(jid, media);
            
            this.db.logMessage(sessionId, recipient, '[Media]', 'sent');
            
            console.log(`✅ Media sent to ${recipient}`);
            
            return {
                success: true,
                recipient,
                message: 'Media sent successfully'
            };
        } catch (error) {
            console.error(`❌ Media send error:`, error);
            this.db.logMessage(sessionId, recipient, '[Media]', 'failed');
            throw error;
        }
    }

    // 4. setupAutoReply() - Setup automatic reply for session
    async setupAutoReply(sessionId, config) {
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        try {
            console.log(`🤖 Setting up auto-reply for ${sessionId}`);
            
            // Store config in database
            this.db.db.prepare(`
                INSERT OR REPLACE INTO auto_reply_configs (session_id, enabled, message, keywords, created_at)
                VALUES (?, ?, ?, ?, datetime('now'))
            `).run(
                sessionId,
                config.enabled ? 1 : 0,
                config.message || 'Auto reply message',
                JSON.stringify(config.keywords || [])
            );
            
            console.log(`✅ Auto-reply configured for ${sessionId}`);
            
            return {
                success: true,
                config,
                message: 'Auto-reply setup successful'
            };
        } catch (error) {
            console.error(`❌ Auto-reply setup error:`, error);
            throw error;
        }
    }

    // 5. scheduleMessage() - Schedule message for later sending
    async scheduleMessage(sessionId, recipient, message, scheduledTime) {
        try {
            console.log(`⏰ Scheduling message for ${scheduledTime}`);
            
            const result = this.db.db.prepare(`
                INSERT INTO scheduled_messages (session_id, recipient, message, scheduled_time, status, created_at)
                VALUES (?, ?, ?, ?, 'pending', datetime('now'))
            `).run(sessionId, recipient, message, scheduledTime);
            
            console.log(`✅ Message scheduled with ID: ${result.lastInsertRowid}`);
            
            return {
                success: true,
                scheduleId: result.lastInsertRowid,
                scheduledTime,
                message: 'Message scheduled successfully'
            };
        } catch (error) {
            console.error(`❌ Schedule message error:`, error);
            throw error;
        }
    }

    // 6. blastSafeMode() - Blast with SAFE delays (anti-ban)
    async blastSafeMode(sessionId, contacts, message) {
        console.log(`🛡️ SAFE MODE BLAST - Anti-ban protection`);
        
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        const results = [];
        const minDelay = 5000;  // 5 seconds
        const maxDelay = 15000; // 15 seconds

        console.log(`📤 Sending to ${contacts.length} contacts with SAFE delays`);

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const number = contact.number || contact;

            try {
                const jid = number + '@s.whatsapp.net';
                await session.sock.sendMessage(jid, { text: message });
                
                this.db.logMessage(sessionId, number, message, 'sent');
                
                results.push({ number, status: 'sent' });
                console.log(`✅ [${i+1}/${contacts.length}] Sent to ${number}`);

                // Random delay between min and max
                const delay = minDelay + Math.random() * (maxDelay - minDelay);
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (error) {
                console.error(`❌ Failed to send to ${number}:`, error.message);
                this.db.logMessage(sessionId, number, message, 'failed');
                results.push({ number, status: 'failed', error: error.message });
            }
        }

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`✅ SAFE MODE BLAST COMPLETED`);
        console.log(`   Success: ${successCount}, Failed: ${failedCount}`);

        return {
            total: contacts.length,
            success: successCount,
            failed: failedCount,
            results
        };
    }

    // 7. blastBalancedMode() - Blast with BALANCED delays
    async blastBalancedMode(sessionId, contacts, message) {
        console.log(`⚖️ BALANCED MODE BLAST - Medium speed`);
        
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        const results = [];
        const minDelay = 2000;  // 2 seconds
        const maxDelay = 5000;  // 5 seconds

        console.log(`📤 Sending to ${contacts.length} contacts with BALANCED delays`);

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const number = contact.number || contact;

            try {
                const jid = number + '@s.whatsapp.net';
                await session.sock.sendMessage(jid, { text: message });
                
                this.db.logMessage(sessionId, number, message, 'sent');
                
                results.push({ number, status: 'sent' });
                console.log(`✅ [${i+1}/${contacts.length}] Sent to ${number}`);

                const delay = minDelay + Math.random() * (maxDelay - minDelay);
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (error) {
                console.error(`❌ Failed to send to ${number}:`, error.message);
                this.db.logMessage(sessionId, number, message, 'failed');
                results.push({ number, status: 'failed', error: error.message });
            }
        }

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`✅ BALANCED MODE BLAST COMPLETED`);
        console.log(`   Success: ${successCount}, Failed: ${failedCount}`);

        return {
            total: contacts.length,
            success: successCount,
            failed: failedCount,
            results
        };
    }

    // 8. blastFastMode() - Blast with FAST delays
    async blastFastMode(sessionId, contacts, message) {
        console.log(`⚡ FAST MODE BLAST - High speed`);
        
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        const results = [];
        const minDelay = 500;   // 0.5 seconds
        const maxDelay = 2000;  // 2 seconds

        console.log(`📤 Sending to ${contacts.length} contacts with FAST delays`);

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const number = contact.number || contact;

            try {
                const jid = number + '@s.whatsapp.net';
                await session.sock.sendMessage(jid, { text: message });
                
                this.db.logMessage(sessionId, number, message, 'sent');
                
                results.push({ number, status: 'sent' });
                console.log(`✅ [${i+1}/${contacts.length}] Sent to ${number}`);

                const delay = minDelay + Math.random() * (maxDelay - minDelay);
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (error) {
                console.error(`❌ Failed to send to ${number}:`, error.message);
                this.db.logMessage(sessionId, number, message, 'failed');
                results.push({ number, status: 'failed', error: error.message });
            }
        }

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`✅ FAST MODE BLAST COMPLETED`);
        console.log(`   Success: ${successCount}, Failed: ${failedCount}`);

        return {
            total: contacts.length,
            success: successCount,
            failed: failedCount,
            results
        };
    }

    // 9. blastInstantMode() - Blast with NO delays (maximum speed)
    async blastInstantMode(sessionId, contacts, message) {
        console.log(`💥 INSTANT MODE BLAST - Maximum speed, NO delays`);
        
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        console.log(`📤 Sending to ${contacts.length} contacts INSTANTLY`);
        console.log(`⚠️ WARNING: No delays - maximum risk`);

        // Send ALL messages simultaneously using Promise.all
        const sendPromises = contacts.map(async (contact, index) => {
            const number = contact.number || contact;
            
            try {
                const jid = number + '@s.whatsapp.net';
                await session.sock.sendMessage(jid, { text: message });
                
                this.db.logMessage(sessionId, number, message, 'sent');
                
                console.log(`✅ [${index+1}/${contacts.length}] Instant sent to ${number}`);
                return { number, status: 'sent' };
                
            } catch (error) {
                console.error(`❌ Failed to send to ${number}:`, error.message);
                this.db.logMessage(sessionId, number, message, 'failed');
                return { number, status: 'failed', error: error.message };
            }
        });

        // Wait for all to complete
        const results = await Promise.all(sendPromises);

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`✅ INSTANT MODE BLAST COMPLETED`);
        console.log(`   Success: ${successCount}, Failed: ${failedCount}`);

        return {
            total: contacts.length,
            success: successCount,
            failed: failedCount,
            results
        };
    }

    // 10. blastStealthInstant() - Instant blast with stealth techniques
    async blastStealthInstant(sessionId, contacts, message) {
        console.log(`🥷 STEALTH INSTANT BLAST - Fast + Hidden`);
        
        const session = this.getSession(sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        if (!session.isConnected()) {
            throw new Error('Session not connected');
        }

        console.log(`📤 Sending to ${contacts.length} contacts with stealth`);

        // Use instant mode but with message variations for stealth
        const messageVariations = this.generateStealthVariations(message, 10);

        const sendPromises = contacts.map(async (contact, index) => {
            const number = contact.number || contact;
            
            try {
                // Pick random message variation
                const msgVariation = messageVariations[index % messageVariations.length];
                
                const jid = number + '@s.whatsapp.net';
                await session.sock.sendMessage(jid, { text: msgVariation });
                
                this.db.logMessage(sessionId, number, msgVariation, 'sent');
                
                console.log(`✅ [${index+1}/${contacts.length}] Stealth sent to ${number}`);
                return { number, status: 'sent' };
                
            } catch (error) {
                console.error(`❌ Failed to send to ${number}:`, error.message);
                this.db.logMessage(sessionId, number, message, 'failed');
                return { number, status: 'failed', error: error.message };
            }
        });

        const results = await Promise.all(sendPromises);

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`✅ STEALTH INSTANT BLAST COMPLETED`);
        console.log(`   Success: ${successCount}, Failed: ${failedCount}`);

        return {
            total: contacts.length,
            success: successCount,
            failed: failedCount,
            results
        };
    }

    // Helper: Generate stealth message variations
    generateStealthVariations(text, count = 10) {
        const variations = new Set();
        variations.add(text);

        const greetings = ['Hi!', 'Hello!', 'Hey!'];
        const emojis = ['😊', '👍', '✨'];

        while (variations.size < count) {
            let variant = text;

            if (Math.random() < 0.3) {
                const greeting = greetings[Math.floor(Math.random() * greetings.length)];
                variant = `${greeting} ${variant}`;
            }

            if (Math.random() < 0.3) {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                variant = `${variant} ${emoji}`;
            }

            variations.add(variant);
        }

        return Array.from(variations);
    }

    // 11. sendBlast() - Generic blast method (alias for sendBulkSmart)
    async sendBlast(sessionId, contacts, message, options = {}) {
        console.log(`🚀 Generic blast method called`);
        const mode = options.mode || 'instant';
        return await this.sendBulkSmart(sessionId, contacts, message, mode);
    }
}

export default BlastOrchestrator;