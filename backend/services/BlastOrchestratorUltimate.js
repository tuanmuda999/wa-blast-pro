import SessionManager from './SessionManager.js';
import NumberValidator from './NumberValidator.js';
import RandomChatSimulator from './RandomChatSimulator.js';

class BlastOrchestratorUltimate {
    constructor(db, io) {
        this.db = db;
        this.io = io;
        this.sessions = new Map();
        this.validator = new NumberValidator();
        this.chatSimulator = new RandomChatSimulator();
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

    // ==================== NUMBER VALIDATION ====================
    async validateContactList(sessionId, listId) {
        console.log(`🔍 VALIDATING CONTACT LIST`);
        console.log(`   Session: ${sessionId}, List: ${listId}`);

        const session = this.sessions.get(sessionId);
        if (!session || !session.isConnected()) {
            throw new Error('Session not available');
        }

        // Get contacts from database
        const contacts = this.db.db.prepare(
            'SELECT id, number FROM contacts WHERE list_id = ?'
        ).all(listId);

        if (!contacts || contacts.length === 0) {
            throw new Error('No contacts in list');
        }

        console.log(`📋 Validating ${contacts.length} numbers...`);

        const results = await this.validator.validateBatch(
            session.sock,
            contacts.map(c => c.number),
            (progress) => {
                console.log(`   Progress: ${progress.current}/${progress.total} (Valid: ${progress.valid}, Invalid: ${progress.invalid})`);
            }
        );

        // Update database - mark invalid numbers
        for (const invalidNumber of results.invalid) {
            const contact = contacts.find(c => c.number === invalidNumber);
            if (contact) {
                this.db.db.prepare(
                    'UPDATE contacts SET valid = 0 WHERE id = ?'
                ).run(contact.id);
            }
        }

        console.log(`✅ VALIDATION COMPLETE`);
        console.log(`   ✅ Valid: ${results.valid.length}`);
        console.log(`   ❌ Invalid: ${results.invalid.length}`);

        return results;
    }

    // ==================== RANDOM CHAT WARMUP ====================
    async warmupWithRandomChats(sessionId, listId) {
        console.log(`🔥 WARMUP WITH RANDOM CHATS`);

        const session = this.sessions.get(sessionId);
        if (!session || !session.isConnected()) {
            throw new Error('Session not available');
        }

        // Get valid contacts
        const contacts = this.db.db.prepare(
            'SELECT number FROM contacts WHERE list_id = ? AND valid = 1'
        ).all(listId);

        if (!contacts || contacts.length === 0) {
            throw new Error('No valid contacts');
        }

        const numbers = contacts.map(c => c.number);
        
        await this.chatSimulator.fullWarmup(session, numbers);

        return {
            success: true,
            randomChats: 5,
            message: 'Warmup complete with random chats'
        };
    }

    // ==================== ULTRA SAFE BLAST (WITH VALIDATION + WARMUP) ====================
    async sendUltraSafeBlast(sessionId, listId, message) {
        console.log(`🛡️ ULTRA SAFE BLAST INITIATED`);
        console.log(`   Session: ${sessionId}, List: ${listId}`);

        const session = this.sessions.get(sessionId);
        if (!session || !session.isConnected()) {
            throw new Error('Session not available');
        }

        // Step 1: Validate all numbers
        console.log(`📋 Step 1: Validating numbers...`);
        const validation = await this.validateContactList(sessionId, listId);

        if (validation.valid.length === 0) {
            throw new Error('No valid numbers found');
        }

        // Step 2: Warmup with random chats
        console.log(`🔥 Step 2: Warming up account...`);
        await this.warmupWithRandomChats(sessionId, listId);

        // Wait after warmup
        console.log(`⏳ Cooling down for 30 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 30000));

        // Step 3: Send blast to VALID numbers only
        console.log(`📤 Step 3: Sending blast to ${validation.valid.length} valid numbers...`);

        // Simple message variations
        const messageVariations = this.generateMessageVariations(message, 10);
        const results = [];

        for (const number of validation.valid) {
            try {
                // Pick random variation
                const msgVariation = messageVariations[
                    Math.floor(Math.random() * messageVariations.length)
                ];

                // Simulate typing (1-3 seconds)
                const typingDelay = 1000 + Math.random() * 2000;
                await new Promise(resolve => setTimeout(resolve, typingDelay));

                // Send
                const jid = number + '@s.whatsapp.net';
                await session.sock.sendMessage(jid, { text: msgVariation });

                // Log to database (FIXED)
                try {
                    this.db.db.prepare(`
                        INSERT INTO message_logs (session_id, recipient, message, status, sent_at)
                        VALUES (?, ?, ?, 'sent', datetime('now'))
                    `).run(sessionId, number, msgVariation);
                } catch (logErr) {
                    console.error('Log error:', logErr);
                }

                results.push({ number, status: 'sent' });
                console.log(`✅ [${results.length}/${validation.valid.length}] Sent to ${number}`);

                // Adaptive delay (5-15 seconds)
                const delay = 5000 + Math.random() * 10000;
                await new Promise(resolve => setTimeout(resolve, delay));

                // Periodic break (every 20 messages)
                if (results.length % 20 === 0 && results.length < validation.valid.length) {
                    const breakTime = 60000 + Math.random() * 120000; // 1-3 min
                    console.log(`☕ Taking break: ${Math.round(breakTime / 1000)}s`);
                    await new Promise(resolve => setTimeout(resolve, breakTime));
                }

            } catch (err) {
                console.error(`❌ Failed to ${number}:`, err.message);
                
                // Log error (FIXED)
                try {
                    this.db.db.prepare(`
                        INSERT INTO message_logs (session_id, recipient, message, status, sent_at)
                        VALUES (?, ?, ?, 'failed', datetime('now'))
                    `).run(sessionId, number, message);
                } catch (logErr) {
                    console.error('Log error:', logErr);
                }

                results.push({ number, status: 'failed', error: err.message });
            }
        }

        const successCount = results.filter(r => r.status === 'sent').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        console.log(`✅ ULTRA SAFE BLAST COMPLETED`);
        console.log(`   Valid numbers: ${validation.valid.length}`);
        console.log(`   Success: ${successCount}`);
        console.log(`   Failed: ${failedCount}`);

        return {
            validation,
            total: validation.valid.length,
            success: successCount,
            failed: failedCount,
            results
        };
    }

    // Helper: Generate message variations
    generateMessageVariations(text, count = 10) {
        const variations = new Set();
        variations.add(text); // Original

        const greetings = ['Hi!', 'Hello!', 'Hey!', 'Hai!', 'Halo!'];
        const emojis = ['😊', '👍', '🙏', '✨', '💫'];

        while (variations.size < count) {
            let variant = text;

            // Add greeting (20% chance)
            if (Math.random() < 0.2) {
                const greeting = greetings[Math.floor(Math.random() * greetings.length)];
                variant = `${greeting} ${variant}`;
            }

            // Add emoji (30% chance)
            if (Math.random() < 0.3) {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                variant = `${variant} ${emoji}`;
            }

            // Random spacing
            if (Math.random() < 0.3) {
                variant = variant.replace(/\./g, (match) => 
                    Math.random() < 0.5 ? '. ' : '.\n'
                );
            }

            variations.add(variant);
        }

        return Array.from(variations);
    }

    async cleanup() {
        console.log('🧹 Cleaning up all sessions...');
        const cleanupPromises = Array.from(this.sessions.values()).map(s => s.cleanup());
        await Promise.all(cleanupPromises);
        this.sessions.clear();
    }
}

export default BlastOrchestratorUltimate;