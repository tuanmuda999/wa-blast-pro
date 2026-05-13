import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from './database/db.js';
import BlastOrchestrator from './services/BlastOrchestrator.js';
import AdvancedBlastOrchestrator from './services/BlastOrchestratorAdvanced.js';
import BlastOrchestratorUltimate from './services/BlastOrchestratorUltimate.js';
import Scheduler from './services/Scheduler.js';

// ==================== EXPRESS & SERVER SETUP ====================
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Enhanced CORS configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ==================== INITIALIZE DATABASE & ORCHESTRATORS ====================
// CRITICAL: Initialize db and io FIRST, THEN orchestrators
const db = new Database();
const orchestrator = new BlastOrchestrator(db, io);
const advancedOrchestrator = new AdvancedBlastOrchestrator(db, io);
const ultimateOrchestrator = new BlastOrchestratorUltimate(db, io);
const scheduler = new Scheduler(db, orchestrator);

// CRITICAL: Make orchestrator globally accessible (uses AdvancedBlastOrchestrator with 50+ techniques)
global.orchestrator = advancedOrchestrator;

console.log('💀 ULTIMATE STEALTH SYSTEM INITIALIZED');
console.log('   50+ Bypass Techniques: ACTIVE');
console.log('   All Features: PROTECTED');
console.log('✓ Database initialized');
console.log('✓ Advanced Orchestrator (50+ techniques) set globally');
console.log('✓ Scheduler started');

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        sessions: global.orchestrator.getAllSessions().length,
        bypassTechniques: 50,
        stealthLevel: 'MAXIMUM'
    });
});

// ==================== SESSION MANAGEMENT ====================

// Create session (POST - for extension)
app.post('/api/session/create', async (req, res) => {
    try {
        const { sessionId } = req.body;
        
        console.log('🔵 Create session request:', sessionId);
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        console.log('🔵 Adding session to orchestrator...');
        const session = await global.orchestrator.addSession(sessionId);
        console.log('✅ Session added successfully:', sessionId);
        
        res.json({ 
            success: true, 
            sessionId,
            message: 'Session created successfully'
        });
    } catch (error) {
        console.error('🔴 Session creation error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Create session (GET - for browser testing)
app.get('/api/session/create-browser/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        console.log('🌐 Browser session creation:', sessionId);
        
        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID required' });
        }

        const session = await global.orchestrator.addSession(sessionId);
        console.log('✅ Browser session created:', sessionId);
        
        res.json({ 
            success: true, 
            sessionId,
            message: `Session created! Wait 3 seconds, then visit: /api/session/qr/${sessionId}`
        });
    } catch (error) {
        console.error('🔴 Browser session error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get QR code
app.get('/api/session/qr/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = global.orchestrator.getSession(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const qr = session.getQR();
        
        if (!qr) {
            return res.status(400).json({ 
                error: 'QR code not available yet. Please wait a moment and try again.' 
            });
        }

        console.log('✅ QR code retrieved for:', sessionId);
        
        res.json({ 
            qr,
            qrImage: qr 
        });
    } catch (error) {
        console.error('🔴 QR retrieval error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get session status
app.get('/api/session/status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = global.orchestrator.getSession(sessionId);
        
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const status = session.getStatus();
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all sessions
app.get('/api/sessions', (req, res) => {
    try {
        const sessions = global.orchestrator.getAllSessions();
        res.json({ 
            sessions: sessions.map(s => s.getStatus()),
            total: sessions.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete session
app.delete('/api/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await global.orchestrator.removeSession(sessionId);
        
        console.log('🗑️ Session deleted:', sessionId);
        
        res.json({ 
            success: true, 
            message: 'Session deleted successfully' 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== CONTACT MANAGEMENT ====================

// Create contact list
app.post('/api/contacts/list', (req, res) => {
    try {
        const { name, description } = req.body;
        const listId = db.createContactList(name, description);
        res.json({ success: true, listId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all contact lists
app.get('/api/contacts/lists', (req, res) => {
    try {
        const lists = db.getContactLists();
        res.json({ lists });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get specific list with contacts
app.get('/api/contacts/list/:id', (req, res) => {
    try {
        const { id } = req.params;
        const list = db.getContactList(id);
        const contacts = db.getContactsByList(id);
        res.json({ list, contacts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add contacts to list
app.post('/api/contacts/add', (req, res) => {
    try {
        const { listId, contacts } = req.body;
        
        contacts.forEach(contact => {
            db.addContact(listId, contact.number, contact.name);
        });
        
        res.json({ success: true, added: contacts.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete contact list
app.delete('/api/contacts/list/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.deleteContactList(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== TEMPLATES ====================

// Create template
app.post('/api/templates', (req, res) => {
    try {
        const { name, content, variables } = req.body;
        const id = db.createTemplate(name, content, variables);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all templates
app.get('/api/templates', (req, res) => {
    try {
        const templates = db.getTemplates();
        res.json({ templates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get template by ID
app.get('/api/templates/:id', (req, res) => {
    try {
        const { id } = req.params;
        const template = db.getTemplate(id);
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update template
app.put('/api/templates/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, content, variables } = req.body;
        db.updateTemplate(id, name, content, variables);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete template
app.delete('/api/templates/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.deleteTemplate(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== SCHEDULER ====================

// Schedule blast
app.post('/api/schedule/blast', async (req, res) => {
    try {
        const { sessionId, listId, message, scheduledTime, mode } = req.body;
        
        const jobId = await scheduler.scheduleBlast(
            sessionId,
            listId,
            message,
            new Date(scheduledTime),
            mode
        );
        
        res.json({ success: true, jobId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get scheduled jobs
app.get('/api/schedule/jobs', (req, res) => {
    try {
        const jobs = scheduler.getScheduledJobs();
        res.json({ jobs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Cancel scheduled job
app.delete('/api/schedule/job/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await scheduler.cancelJob(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== MESSAGE LOGS ====================

// Get message logs
app.get('/api/logs', (req, res) => {
    try {
        const { sessionId, limit = 100 } = req.query;
        const logs = db.getMessageLogs(sessionId, parseInt(limit));
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get stats
app.get('/api/stats', (req, res) => {
    try {
        const { sessionId } = req.query;
        const stats = db.getStats(sessionId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== ANALYTICS ENDPOINTS (FOR EXTENSION) ====================

// Get analytics overview
app.get('/analytics/overview', (req, res) => {
    try {
        const sessions = global.orchestrator.getAllSessions();
        const totalSessions = sessions.length;
        const activeSessions = sessions.filter(s => s.isConnected()).length;
        
        // Get message stats from database
        const todayStats = db.db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM message_logs 
            WHERE DATE(sent_at) = DATE('now')
        `).get();

        const weekStats = db.db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM message_logs 
            WHERE DATE(sent_at) >= DATE('now', '-7 days')
        `).get();

        const monthStats = db.db.prepare(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            FROM message_logs 
            WHERE DATE(sent_at) >= DATE('now', '-30 days')
        `).get();

        res.json({
            success: true,
            sessions: {
                total: totalSessions,
                active: activeSessions,
                inactive: totalSessions - activeSessions
            },
            messages: {
                today: {
                    total: todayStats?.total || 0,
                    success: todayStats?.success || 0,
                    failed: todayStats?.failed || 0,
                    successRate: todayStats?.total > 0 
                        ? ((todayStats.success / todayStats.total) * 100).toFixed(1) 
                        : 0
                },
                week: {
                    total: weekStats?.total || 0,
                    success: weekStats?.success || 0,
                    failed: weekStats?.failed || 0,
                    successRate: weekStats?.total > 0 
                        ? ((weekStats.success / weekStats.total) * 100).toFixed(1) 
                        : 0
                },
                month: {
                    total: monthStats?.total || 0,
                    success: monthStats?.success || 0,
                    failed: monthStats?.failed || 0,
                    successRate: monthStats?.total > 0 
                        ? ((monthStats.success / monthStats.total) * 100).toFixed(1) 
                        : 0
                }
            },
            system: {
                bypassTechniques: 50,
                stealthLevel: 'MAXIMUM',
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            }
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get recent activities
app.get('/analytics/recent-activities', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        // Query WITHOUT operation column (doesn't exist in schema)
        const activities = db.db.prepare(`
            SELECT 
                session_id,
                recipient,
                message,
                status,
                sent_at
            FROM message_logs 
            ORDER BY sent_at DESC 
            LIMIT ?
        `).all(limit);

        res.json({
            success: true,
            activities: activities.map(a => ({
                sessionId: a.session_id,
                recipient: a.recipient,
                message: a.message?.substring(0, 50) + (a.message?.length > 50 ? '...' : ''),
                status: a.status,
                operation: 'blast', // Default value since column doesn't exist
                timestamp: a.sent_at
            }))
        });
    } catch (error) {
        console.error('Recent activities error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get session analytics
app.get('/analytics/sessions', (req, res) => {
    try {
        const sessions = global.orchestrator.getAllSessions();
        
        const sessionData = sessions.map(s => {
            const status = s.getStatus();
            
            // Get session message stats
            const sessionStats = db.db.prepare(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as success,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM message_logs 
                WHERE session_id = ?
            `).get(s.sessionId);

            return {
                sessionId: s.sessionId,
                connected: s.isConnected(),
                phoneNumber: status.user?.id || 'Not connected',
                messages: {
                    total: sessionStats?.total || 0,
                    success: sessionStats?.success || 0,
                    failed: sessionStats?.failed || 0
                },
                lastActivity: sessionStats?.total > 0 ? 'Active' : 'Idle'
            };
        });

        res.json({
            success: true,
            sessions: sessionData,
            total: sessionData.length
        });
    } catch (error) {
        console.error('Session analytics error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message 
        });
    }
});

// Get analytics logs (MISSING ENDPOINT - FIXED!)
app.get('/analytics/logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const sessionId = req.query.sessionId || null;
        
        // Query WITHOUT operation column (doesn't exist in schema)
        let query = `
            SELECT 
                id,
                session_id,
                recipient,
                message,
                status,
                sent_at
            FROM message_logs 
        `;
        
        const params = [];
        
        if (sessionId) {
            query += ' WHERE session_id = ?';
            params.push(sessionId);
        }
        
        query += ' ORDER BY sent_at DESC LIMIT ?';
        params.push(limit);
        
        const logs = db.db.prepare(query).all(...params);
        
        res.json({
            success: true,
            total_sent: logs.filter(l => l.status === 'sent').length,
            total_failed: logs.filter(l => l.status === 'failed').length,
            total_recipients: logs.length,
            logs: logs.map(log => ({
                id: log.id,
                sessionId: log.session_id,
                recipient: log.recipient,
                message: log.message?.substring(0, 100) + (log.message?.length > 100 ? '...' : ''),
                status: log.status,
                operation: 'blast', // Default value since column doesn't exist
                timestamp: log.sent_at
            }))
        });
    } catch (error) {
        console.error('Analytics logs error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message,
            total_sent: 0,
            total_failed: 0,
            total_recipients: 0,
            logs: []
        });
    }
});

// ==================== NEW FEATURES - SINGLE MESSAGE (50+ BYPASS) ====================

app.post('/api/message/single', async (req, res) => {
    try {
        const { sessionId, recipient, message } = req.body;
        
        if (!sessionId || !recipient || !message) {
            return res.status(400).json({ 
                error: 'Missing required fields: sessionId, recipient, message' 
            });
        }

        console.log('📤 SINGLE MESSAGE - 50+ BYPASS ACTIVE');
        console.log(`   Recipient: ${recipient}`);
        
        const result = await global.orchestrator.sendSingleMessage(sessionId, recipient, message);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Single message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== NEW FEATURES - GROUP MESSAGE (50+ BYPASS) ====================

app.post('/api/message/group', async (req, res) => {
    try {
        const { sessionId, groupId, message } = req.body;
        
        if (!sessionId || !groupId || !message) {
            return res.status(400).json({ 
                error: 'Missing required fields: sessionId, groupId, message' 
            });
        }

        console.log('👥 GROUP MESSAGE - 50+ BYPASS ACTIVE');
        console.log(`   Group: ${groupId}`);
        
        const result = await global.orchestrator.sendGroupMessage(sessionId, groupId, message);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Group message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== NEW FEATURES - MEDIA SEND (50+ BYPASS) ====================

app.post('/api/message/media', async (req, res) => {
    try {
        const { sessionId, recipient, mediaPath, caption } = req.body;
        
        if (!sessionId || !recipient || !mediaPath) {
            return res.status(400).json({ 
                error: 'Missing required fields: sessionId, recipient, mediaPath' 
            });
        }

        console.log('🖼️ MEDIA SEND - 50+ BYPASS ACTIVE');
        console.log(`   Recipient: ${recipient}`);
        console.log(`   Media: ${mediaPath}`);
        
        const result = await global.orchestrator.sendMedia(
            sessionId, 
            recipient, 
            mediaPath, 
            caption || ''
        );
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Media send error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== NEW FEATURES - AUTO-REPLY (50+ BYPASS) ====================

app.post('/api/auto-reply/setup', async (req, res) => {
    try {
        const { sessionId, trigger, response } = req.body;
        
        if (!sessionId || !trigger || !response) {
            return res.status(400).json({ 
                error: 'Missing required fields: sessionId, trigger, response' 
            });
        }

        console.log('🤖 AUTO-REPLY - 50+ BYPASS ACTIVE');
        console.log(`   Trigger: "${trigger}"`);
        
        const result = await global.orchestrator.setupAutoReply(
            sessionId, 
            trigger, 
            response
        );
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Auto-reply setup error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== NEW FEATURES - SCHEDULED MESSAGE (50+ BYPASS) ====================

app.post('/api/message/schedule', async (req, res) => {
    try {
        const { sessionId, recipient, message, scheduleTime } = req.body;
        
        if (!sessionId || !recipient || !message || !scheduleTime) {
            return res.status(400).json({ 
                error: 'Missing required fields: sessionId, recipient, message, scheduleTime' 
            });
        }

        console.log('⏰ SCHEDULED MESSAGE - 50+ BYPASS ACTIVE');
        console.log(`   Recipient: ${recipient}`);
        console.log(`   Schedule: ${new Date(scheduleTime).toLocaleString()}`);
        
        const result = await global.orchestrator.scheduleMessage(
            sessionId, 
            recipient, 
            message, 
            scheduleTime
        );
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Scheduled message error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== BLAST MODES (ALL WITH 50+ BYPASS) ====================

// Blast Safe Mode
app.post('/api/blast/safe', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        
        if (!sessionId || !listId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, listId, message'
            });
        }

        console.log('🛡️ SAFE MODE - 50+ BYPASS ACTIVE');
        
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        
        if (contacts.length === 0) {
            return res.status(404).json({ error: 'No contacts found in list' });
        }

        const result = await global.orchestrator.blastSafeMode(sessionId, contacts, message);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Safe mode error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Blast Balanced Mode
app.post('/api/blast/balanced', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        
        if (!sessionId || !listId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, listId, message'
            });
        }

        console.log('⚖️ BALANCED MODE - 50+ BYPASS ACTIVE');
        
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        
        if (contacts.length === 0) {
            return res.status(404).json({ error: 'No contacts found in list' });
        }

        const result = await global.orchestrator.blastBalancedMode(sessionId, contacts, message);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Balanced mode error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Blast Fast Mode
app.post('/api/blast/fast', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        
        if (!sessionId || !listId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, listId, message'
            });
        }

        console.log('⚡ FAST MODE - 50+ BYPASS ACTIVE');
        
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        
        if (contacts.length === 0) {
            return res.status(404).json({ error: 'No contacts found in list' });
        }

        const result = await global.orchestrator.blastFastMode(sessionId, contacts, message);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Fast mode error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Blast Instant Mode
app.post('/api/blast/instant', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        
        if (!sessionId || !listId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, listId, message'
            });
        }

        console.log('💀 INSTANT MODE - 50+ BYPASS - PARALLEL');
        
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        
        if (contacts.length === 0) {
            return res.status(404).json({ error: 'No contacts found in list' });
        }

        const result = await global.orchestrator.blastInstantMode(sessionId, contacts, message);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Instant mode error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Blast Stealth Instant Mode
app.post('/api/blast/stealth-instant', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        
        if (!sessionId || !listId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, listId, message'
            });
        }

        console.log('⚫ STEALTH INSTANT - 50+ BYPASS');
        
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        
        if (contacts.length === 0) {
            return res.status(404).json({ error: 'No contacts found in list' });
        }

        const result = await global.orchestrator.blastStealthInstant(sessionId, contacts, message);
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Stealth instant error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== LEGACY BLAST ENDPOINTS (BACKWARDS COMPATIBILITY) ====================

// Basic blast
app.post('/api/send/blast', async (req, res) => {
    try {
        const { sessionId, listId, message, delay } = req.body;
        
        if (!sessionId || !listId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, listId, message'
            });
        }

        const result = await orchestrator.sendBlast(
            sessionId,
            listId,
            message,
            delay || 5000
        );

        res.json({
            success: true,
            jobId: result.jobId,
            total: result.total,
            success: result.success,
            failed: result.failed
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Advanced blast with full anti-detection
app.post('/api/blast/advanced', async (req, res) => {
    try {
        const { sessionId, listId, message, mode } = req.body;
        
        console.log(`🚀 Advanced blast request:`);
        console.log(`   Session: ${sessionId}`);
        console.log(`   List: ${listId}`);
        console.log(`   Mode: ${mode || 'default'}`);
        
        const result = await advancedOrchestrator.sendBlastAdvanced(
            sessionId,
            listId,
            message,
            { mode }
        );
        
        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        console.error(`❌ Advanced blast error:`, err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ==================== SMART BULK (WITH MODE SELECTION) ====================
app.post('/api/send/smart', async (req, res) => {
    try {
        const { sessionId, listId, message, mode } = req.body;
        
        if (!sessionId || !listId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, listId, message'
            });
        }

        const contactsResult = db.getQuery('SELECT number FROM contacts WHERE list_id = ?', [listId]);
        const numbers = contactsResult?.map(c => c.number) || [];

        if (numbers.length === 0) {
            return res.status(404).json({ error: 'No contacts found in list' });
        }

        console.log(`🚀 Smart bulk request: ${numbers.length} contacts, mode: ${mode || 'instant'}`);

        const result = await orchestrator.sendBulkSmart(sessionId, numbers, message, mode || 'instant');

        res.json({
            success: true,
            jobId: result.jobId,
            mode: result.mode,
            total: result.total,
            success: result.success,
            failed: result.failed
        });

    } catch (err) {
        console.error('Smart bulk error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== INSTANT MEGA BLAST ====================
app.post('/api/send/instant', async (req, res) => {
    console.log('⚡ INSTANT MEGA BLAST REQUEST');
    
    try {
        const { sessionId, listId, message } = req.body;
        
        if (!sessionId || !listId || !message) {
            return res.status(400).json({
                error: 'Missing required fields: sessionId, listId, message'
            });
        }
        
        console.log(`⚡ Starting instant blast:`);
        console.log(`   Session: ${sessionId}`);
        console.log(`   List ID: ${listId}`);
        console.log(`   Message length: ${message.length} chars`);
        
        const result = await orchestrator.sendInstantMega(sessionId, listId, message);
        
        res.json({
            success: true,
            jobId: result.jobId,
            total: result.total,
            success: result.success,
            failed: result.failed,
            message: `⚡ Instant blast completed! Sent: ${result.success}/${result.total}`
        });
        
    } catch (err) {
        console.error('❌ Instant blast endpoint error:', err);
        res.status(500).json({
            error: err.message
        });
    }
});

// ==================== ULTRA SAFE BLAST ENDPOINTS ====================

// Validate contact list
app.post('/api/contacts/validate', async (req, res) => {
    try {
        const { sessionId, listId } = req.body;
        
        console.log(`🔍 Validation request: Session ${sessionId}, List ${listId}`);
        
        const result = await ultimateOrchestrator.validateContactList(sessionId, listId);
        
        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        console.error(`❌ Validation error:`, err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Warmup with random chats
app.post('/api/warmup/random-chats', async (req, res) => {
    try {
        const { sessionId, listId } = req.body;
        
        console.log(`🔥 Warmup request: Session ${sessionId}, List ${listId}`);
        
        const result = await ultimateOrchestrator.warmupWithRandomChats(sessionId, listId);
        
        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        console.error(`❌ Warmup error:`, err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// Ultra safe blast
app.post('/api/blast/ultra-safe', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        
        console.log(`🛡️ Ultra safe blast request:`);
        console.log(`   Session: ${sessionId}`);
        console.log(`   List: ${listId}`);
        
        const result = await ultimateOrchestrator.sendUltraSafeBlast(sessionId, listId, message);
        
        res.json({
            success: true,
            ...result
        });
    } catch (err) {
        console.error(`❌ Ultra safe blast error:`, err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// ==================== TEST ENDPOINT ====================
app.get('/sessions', (req, res) => {
    const sessions = global.orchestrator.getAllSessions();
    res.json({
        success: true,
        sessions: sessions.map(s => ({
            id: s.sessionId,
            connected: s.isConnected(),
            messagesSent: s.messagesSent || 0,
            messagesThisHour: s.messagesThisHour || 0
        }))
    });
});

// ==================== COMPATIBILITY LAYER - ENDPOINTS WITHOUT /api/ PREFIX ====================
// These duplicate endpoints ensure extension works with both /api/* and /* paths

console.log('🔧 Loading compatibility layer...');

// Session endpoints (no /api/)
app.post('/session/create', async (req, res) => {
    try {
        const { sessionId } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'Session ID required' });
        const session = await global.orchestrator.addSession(sessionId);
        res.json({ success: true, sessionId, message: 'Session created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/session/qr/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = global.orchestrator.getSession(sessionId);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        const qr = session.getQR();
        if (!qr) return res.status(400).json({ error: 'QR code not available yet' });
        res.json({ qr, qrImage: qr });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/session/status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = global.orchestrator.getSession(sessionId);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json(session.getStatus());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await global.orchestrator.removeSession(sessionId);
        res.json({ success: true, message: 'Session deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Contact endpoints (no /api/)
app.post('/contacts/list', (req, res) => {
    try {
        const { name, description } = req.body;
        const listId = db.createContactList(name, description);
        res.json({ success: true, listId });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/contacts/lists', (req, res) => {
    try {
        const lists = db.getContactLists();
        res.json({ lists });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/contacts/list/:id', (req, res) => {
    try {
        const { id } = req.params;
        const list = db.getContactList(id);
        const contacts = db.getContactsByList(id);
        res.json({ list, contacts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/contacts/add', (req, res) => {
    try {
        const { listId, contacts } = req.body;
        contacts.forEach(contact => {
            db.addContact(listId, contact.number, contact.name);
        });
        res.json({ success: true, added: contacts.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/contacts/list/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.deleteContactList(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Template endpoints (no /api/)
app.post('/templates', (req, res) => {
    try {
        const { name, content, variables } = req.body;
        const id = db.createTemplate(name, content, variables);
        res.json({ success: true, id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/templates', (req, res) => {
    try {
        const templates = db.getTemplates();
        res.json({ templates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/templates/:id', (req, res) => {
    try {
        const { id } = req.params;
        const template = db.getTemplate(id);
        res.json(template);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Blast endpoints (no /api/)
app.post('/blast/safe', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        if (!sessionId || !listId || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        if (contacts.length === 0) return res.status(404).json({ error: 'No contacts found' });
        const result = await global.orchestrator.blastSafeMode(sessionId, contacts, message);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/blast/balanced', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        if (!sessionId || !listId || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        if (contacts.length === 0) return res.status(404).json({ error: 'No contacts found' });
        const result = await global.orchestrator.blastBalancedMode(sessionId, contacts, message);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/blast/fast', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        if (!sessionId || !listId || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        if (contacts.length === 0) return res.status(404).json({ error: 'No contacts found' });
        const result = await global.orchestrator.blastFastMode(sessionId, contacts, message);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/blast/instant', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        if (!sessionId || !listId || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        if (contacts.length === 0) return res.status(404).json({ error: 'No contacts found' });
        const result = await global.orchestrator.blastInstantMode(sessionId, contacts, message);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/blast/stealth-instant', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        if (!sessionId || !listId || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const contacts = db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        if (contacts.length === 0) return res.status(404).json({ error: 'No contacts found' });
        const result = await global.orchestrator.blastStealthInstant(sessionId, contacts, message);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Message endpoints (no /api/)
app.post('/message/single', async (req, res) => {
    try {
        const { sessionId, recipient, message } = req.body;
        if (!sessionId || !recipient || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await global.orchestrator.sendSingleMessage(sessionId, recipient, message);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/message/group', async (req, res) => {
    try {
        const { sessionId, groupId, message } = req.body;
        if (!sessionId || !groupId || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await global.orchestrator.sendGroupMessage(sessionId, groupId, message);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Logs endpoints (no /api/)
app.get('/logs', (req, res) => {
    try {
        const { sessionId, limit = 100 } = req.query;
        const logs = db.getMessageLogs(sessionId, parseInt(limit));
        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/stats', (req, res) => {
    try {
        const { sessionId } = req.query;
        const stats = db.getStats(sessionId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Schedules endpoint (no /api/) - FOR EXTENSION COMPATIBILITY
app.get('/schedules', (req, res) => {
    try {
        const schedules = db.db.prepare(`
            SELECT 
                id,
                name,
                session_id,
                list_id,
                message,
                scheduled_time,
                status,
                created_at
            FROM schedules 
            ORDER BY scheduled_time DESC
            LIMIT 100
        `).all();
        
        res.json({ 
            success: true,
            schedules: schedules || [],
            total: schedules?.length || 0
        });
    } catch (error) {
        console.error('Schedules endpoint error:', error);
        // Return empty array instead of error to avoid breaking extension
        res.json({ 
            success: true,
            schedules: [],
            total: 0
        });
    }
});

// ==================== MISSING ENDPOINTS - DASHBOARD COMPATIBILITY ====================

// POST /send/bulk - BULK MESSAGE SENDING (Dashboard line 478)
app.post('/send/bulk', async (req, res) => {
    try {
        const { sessionId, recipients, message } = req.body;
        
        console.log('📤 BULK SEND REQUEST');
        console.log('   Session:', sessionId);
        console.log('   Recipients:', recipients?.length || 0);
        
        if (!sessionId || !recipients || !Array.isArray(recipients) || recipients.length === 0 || !message) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: sessionId, recipients (array), message'
            });
        }

        // Convert recipients to contact format expected by orchestrator
        const contacts = recipients.map(number => ({ number }));
        
        console.log(`   Starting bulk send to ${contacts.length} recipients with 50+ bypass techniques...`);
        
        // Use orchestrator's sendBulk method with instant mode (delay 0)
        const result = await global.orchestrator.sendBulk(sessionId, contacts, message, 0);
        
        res.json({
            success: true,
            total: contacts.length,
            ...result,
            message: 'Bulk send completed'
        });
    } catch (error) {
        console.error('❌ /send/bulk error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to send bulk messages'
        });
    }
});

// POST /schedules - CREATE SCHEDULE (Dashboard line 1401)
app.post('/schedules', async (req, res) => {
    try {
        const { name, sessionId, listId, message, scheduledTime, mode } = req.body;
        
        console.log('📅 CREATE SCHEDULE REQUEST');
        console.log('   Name:', name);
        console.log('   Session:', sessionId);
        console.log('   List:', listId);
        console.log('   Scheduled Time:', scheduledTime);
        console.log('   Mode:', mode || 'safe');
        
        // Validate required fields
        if (!name || !sessionId || !listId || !message || !scheduledTime) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: name, sessionId, listId, message, scheduledTime'
            });
        }

        // Insert schedule into database
        const result = db.db.prepare(`
            INSERT INTO schedules (
                name, 
                session_id, 
                list_id, 
                message, 
                scheduled_time, 
                status, 
                mode, 
                created_at
            )
            VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'))
        `).run(name, sessionId, listId, message, scheduledTime, mode || 'safe');

        console.log('✅ Schedule created with ID:', result.lastInsertRowid);

        res.json({
            success: true,
            scheduleId: result.lastInsertRowid,
            message: 'Schedule created successfully',
            schedule: {
                id: result.lastInsertRowid,
                name,
                sessionId,
                listId,
                scheduledTime,
                status: 'pending',
                mode: mode || 'safe'
            }
        });
    } catch (error) {
        console.error('❌ /schedules POST error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to create schedule'
        });
    }
});

// DELETE /schedules/:id - DELETE SCHEDULE (Dashboard line 1422)
app.delete('/schedules/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ DELETE SCHEDULE REQUEST');
        console.log('   Schedule ID:', id);
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Schedule ID is required'
            });
        }

        // Check if schedule exists
        const schedule = db.db.prepare('SELECT id, name, status FROM schedules WHERE id = ?').get(id);
        
        if (!schedule) {
            return res.status(404).json({
                success: false,
                error: 'Schedule not found'
            });
        }

        console.log('   Found schedule:', schedule.name, '- Status:', schedule.status);

        // Delete the schedule
        db.db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
        
        console.log('✅ Schedule deleted successfully');

        res.json({
            success: true,
            message: 'Schedule deleted successfully',
            deletedSchedule: {
                id: schedule.id,
                name: schedule.name
            }
        });
    } catch (error) {
        console.error('❌ /schedules/:id DELETE error:', error);
        res.status(500).json({ 
            success: false,
            error: error.message || 'Failed to delete schedule'
        });
    }
});

console.log('✅ Compatibility layer loaded (endpoints without /api/ prefix)');
console.log('✅ All dashboard endpoints enabled and ready');

// ==================== WEBSOCKET ====================

io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('🔌 Client disconnected:', socket.id);
    });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log('');
    console.log('='.repeat(60));
    console.log('💀 WA BLAST PRO - ULTIMATE STEALTH SYSTEM');
    console.log('='.repeat(60));
    console.log('✓ Server running on port', PORT);
    console.log('✓ API: http://localhost:' + PORT);
    console.log('✓ WebSocket: ws://localhost:' + PORT);
    console.log('✓ 50+ Bypass Techniques: ACTIVE');
    console.log('✓ All Features: PROTECTED');
    console.log('✓ Maximum Stealth: ENGAGED');
    console.log('='.repeat(60));
    console.log('Ready to blast! 🚀💀⚡');
    console.log('');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await global.orchestrator.cleanup();
    await orchestrator.cleanup();
    await advancedOrchestrator.cleanup();
    await ultimateOrchestrator.cleanup();
    process.exit(0);
});