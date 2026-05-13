import makeWASocket, { useMultiFileAuthState, DisconnectReason, delay, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STEALTH_CONFIG = {
    minDelay: 2000,
    maxDelay: 5000,
    batchSize: 50,
    cooldownPeriod: 3 * 60 * 1000,
    hourlyLimit: 200,
    typingDuration: 1500
};

class SessionManager {
    constructor(sessionId, db, io) {
        this.sessionId = sessionId;
        this.db = db;
        this.io = io;
        this.sock = null;
        this.qr = null;
        this.connected = false;
        this.messageCount = 0;
        this.messagesThisHour = 0;
        this.lastMessageTime = null;
        this.hourlyResetTimer = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.logger = pino({ level: 'error' }); // Only show errors
        
        this.init();
    }

    async init() {
        try {
            // Get latest Baileys version
            const { version, isLatest } = await fetchLatestBaileysVersion();
            console.log(`📱 Using WA version ${version.join('.')}, isLatest: ${isLatest}`);

            const authPath = join(__dirname, '..', 'auth_sessions', this.sessionId);
            const { state, saveCreds } = await useMultiFileAuthState(authPath);

            this.sock = makeWASocket({
                version,
                auth: state,
                logger: this.logger,
                printQRInTerminal: false,
                browser: ['WhatsApp Blast Pro', 'Chrome', '119.0.0'],
                syncFullHistory: false,
                defaultQueryTimeoutMs: undefined,
                keepAliveIntervalMs: 30000,
                connectTimeoutMs: 60000,
                getMessage: async () => undefined
            });

            this.sock.ev.on('creds.update', saveCreds);

            this.sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    try {
                        this.qr = await QRCode.toDataURL(qr);
                        console.log(`✅ QR generated for session: ${this.sessionId}`);
                        this.reconnectAttempts = 0; // Reset on successful QR
                        this.emitUpdate();
                    } catch (err) {
                        console.error(`❌ QR generation error:`, err.message);
                    }
                }

                if (connection === 'close') {
                    this.connected = false;
                    const statusCode = lastDisconnect?.error instanceof Boom 
                        ? lastDisconnect.error.output.statusCode 
                        : 500;

                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                    
                    console.log(`❌ Connection closed for ${this.sessionId}`);
                    console.log(`   Status code: ${statusCode}`);
                    console.log(`   Should reconnect: ${shouldReconnect}`);
                    console.log(`   Reconnect attempts: ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
                    
                    this.emitUpdate();

                    if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                        this.reconnectAttempts++;
                        const backoffDelay = Math.min(3000 * this.reconnectAttempts, 15000);
                        console.log(`⏳ Reconnecting in ${backoffDelay}ms...`);
                        await delay(backoffDelay);
                        this.init();
                    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                        console.log(`🛑 Max reconnect attempts reached for ${this.sessionId}`);
                    }
                }

                if (connection === 'connecting') {
                    console.log(`🔄 Connecting session: ${this.sessionId}`);
                }

                if (connection === 'open') {
                    console.log(`✅ Session ${this.sessionId} connected successfully!`);
                    this.connected = true;
                    this.qr = null;
                    this.reconnectAttempts = 0;
                    
                    const phone = this.sock.user?.id?.split(':')[0];
                    this.db.upsertSession(this.sessionId, phone, true);
                    
                    this.setupHourlyReset();
                    this.emitUpdate();
                }
            });

        } catch (error) {
            console.error(`❌ SessionManager init error for ${this.sessionId}:`, error.message);
            
            // Retry with backoff
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                const backoffDelay = Math.min(5000 * this.reconnectAttempts, 30000);
                console.log(`⏳ Retrying init in ${backoffDelay}ms...`);
                await delay(backoffDelay);
                this.init();
            }
        }
    }

    setupHourlyReset() {
        if (this.hourlyResetTimer) {
            clearInterval(this.hourlyResetTimer);
        }

        this.hourlyResetTimer = setInterval(() => {
            this.messagesThisHour = 0;
            console.log(`🔄 Hourly limit reset for ${this.sessionId}`);
            this.emitUpdate();
        }, 60 * 60 * 1000);
    }

    getQR() {
        return this.qr;
    }

    isConnected() {
        return this.connected;
    }

    canSendMessage() {
        return this.connected && this.messagesThisHour < STEALTH_CONFIG.hourlyLimit;
    }

    async sendMessage(number, message) {
        if (!this.canSendMessage()) {
            throw new Error('Session not ready or hourly limit reached');
        }

        try {
            const jid = number.includes('@s.whatsapp.net') 
                ? number 
                : `${number}@s.whatsapp.net`;

            await this.sock.sendPresenceUpdate('composing', jid);
            await delay(STEALTH_CONFIG.typingDuration);
            await this.sock.sendPresenceUpdate('paused', jid);

            const result = await this.sock.sendMessage(jid, { text: message });

            this.messageCount++;
            this.messagesThisHour++;
            this.lastMessageTime = Date.now();

            this.db.logMessage(this.sessionId, number, message, 'sent');
            this.emitUpdate();

            return { success: true, messageId: result.key.id };
        } catch (error) {
            console.error(`❌ Send message error:`, error.message);
            this.db.logMessage(this.sessionId, number, message, 'failed');
            throw error;
        }
    }

    async sendBulk(numbers, message, customDelay) {
        const results = [];
        const delayMs = customDelay || this.randomDelay();

        for (const number of numbers) {
            if (!this.canSendMessage()) {
                console.log(`⚠️ Hourly limit reached for ${this.sessionId}`);
                break;
            }

            try {
                const result = await this.sendMessage(number, message);
                results.push({ number, success: true, ...result });
                console.log(`✅ Message sent to ${number}`);
                await this.sleep(delayMs);
            } catch (error) {
                results.push({ number, success: false, error: error.message });
                console.log(`❌ Failed to send to ${number}: ${error.message}`);
            }
        }

        return results;
    }

    randomDelay() {
        return Math.floor(
            Math.random() * (STEALTH_CONFIG.maxDelay - STEALTH_CONFIG.minDelay) + STEALTH_CONFIG.minDelay
        );
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            id: this.sessionId,
            connected: this.connected,
            messagesSent: this.messageCount,
            messagesThisHour: this.messagesThisHour,
            hourlyCapacity: Math.floor((this.messagesThisHour / STEALTH_CONFIG.hourlyLimit) * 100),
            lastActive: this.lastMessageTime,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    getStatus() {
        return this.getStats();
    }

    emitUpdate() {
        if (this.io && typeof this.io.emit === 'function') {
            this.io.emit('session-update', this.getStats());
        }
    }

    async cleanup() {
        console.log(`🧹 Cleaning up session: ${this.sessionId}`);
        
        if (this.hourlyResetTimer) {
            clearInterval(this.hourlyResetTimer);
        }

        if (this.sock) {
            try {
                this.sock.ev.removeAllListeners();
                await this.sock.logout();
            } catch (err) {
                console.log(`⚠️ Cleanup error (non-critical):`, err.message);
            }
        }

        this.connected = false;
        this.db.upsertSession(this.sessionId, null, false);
    }
}

export default SessionManager;