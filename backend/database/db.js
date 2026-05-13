import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseManager {
    constructor() {
        const dbPath = join(__dirname, 'blast.db');
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.initTables();
    }

    initTables() {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                phone TEXT,
                connected INTEGER DEFAULT 0,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contact_lists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                list_id INTEGER,
                number TEXT NOT NULL,
                name TEXT,
                valid INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                variables TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS message_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT,
                recipient TEXT,
                message TEXT,
                status TEXT,
                sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                session_id TEXT,
                list_id INTEGER,
                message TEXT,
                scheduled_time DATETIME,
                status TEXT DEFAULT 'pending',
                executed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (list_id) REFERENCES contact_lists(id) ON DELETE CASCADE
            )
        `);

        this.db.exec(`
            CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE DEFAULT CURRENT_DATE,
                messages_sent INTEGER DEFAULT 0,
                messages_failed INTEGER DEFAULT 0,
                unique_recipients INTEGER DEFAULT 0
            )
        `);
    }

    getSession(sessionId) {
        const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
        return stmt.get(sessionId);
    }

    getAllSessions() {
        const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY last_active DESC');
        return stmt.all();
    }

    upsertSession(sessionId, phone, connected) {
        const stmt = this.db.prepare(`
            INSERT INTO sessions (id, phone, connected, last_active)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                phone = excluded.phone,
                connected = excluded.connected,
                last_active = CURRENT_TIMESTAMP
        `);
        return stmt.run(sessionId, phone, connected ? 1 : 0);
    }

    deleteSession(sessionId) {
        const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
        return stmt.run(sessionId);
    }

    createContactList(name, description = '') {
        const stmt = this.db.prepare('INSERT INTO contact_lists (name, description) VALUES (?, ?)');
        const result = stmt.run(name, description);
        return result.lastInsertRowid;
    }

    getContactLists() {
        const stmt = this.db.prepare(`
            SELECT l.*, COUNT(c.id) as contact_count 
            FROM contact_lists l
            LEFT JOIN contacts c ON l.id = c.list_id
            GROUP BY l.id
            ORDER BY l.created_at DESC
        `);
        return stmt.all();
    }

    getContactList(listId) {
        const stmt = this.db.prepare('SELECT * FROM contact_lists WHERE id = ?');
        return stmt.get(listId);
    }

    deleteContactList(listId) {
        const stmt = this.db.prepare('DELETE FROM contact_lists WHERE id = ?');
        return stmt.run(listId);
    }

    addContact(listId, number, name = '') {
        const stmt = this.db.prepare('INSERT INTO contacts (list_id, number, name) VALUES (?, ?, ?)');
        const result = stmt.run(listId, number, name);
        return result.lastInsertRowid;
    }

    getContactsByList(listId) {
        const stmt = this.db.prepare('SELECT * FROM contacts WHERE list_id = ? AND valid = 1 ORDER BY created_at DESC');
        return stmt.all(listId);
    }

    updateContactValidity(contactId, valid) {
        const stmt = this.db.prepare('UPDATE contacts SET valid = ? WHERE id = ?');
        return stmt.run(valid ? 1 : 0, contactId);
    }

    createTemplate(name, content, variables = '[]') {
        const stmt = this.db.prepare('INSERT INTO templates (name, content, variables) VALUES (?, ?, ?)');
        const result = stmt.run(name, content, variables);
        return result.lastInsertRowid;
    }

    getTemplates() {
        const stmt = this.db.prepare('SELECT * FROM templates ORDER BY created_at DESC');
        return stmt.all();
    }

    getTemplate(templateId) {
        const stmt = this.db.prepare('SELECT * FROM templates WHERE id = ?');
        return stmt.get(templateId);
    }

    updateTemplate(templateId, name, content, variables) {
        const stmt = this.db.prepare('UPDATE templates SET name = ?, content = ?, variables = ? WHERE id = ?');
        return stmt.run(name, content, variables, templateId);
    }

    deleteTemplate(templateId) {
        const stmt = this.db.prepare('DELETE FROM templates WHERE id = ?');
        return stmt.run(templateId);
    }

    logMessage(sessionId, recipient, message, status) {
        const stmt = this.db.prepare('INSERT INTO message_logs (session_id, recipient, message, status) VALUES (?, ?, ?, ?)');
        return stmt.run(sessionId, recipient, message, status);
    }

    getMessageLogs(limit = 100, sessionId = null) {
        let query = 'SELECT * FROM message_logs';
        if (sessionId) {
            query += ' WHERE session_id = ?';
        }
        query += ' ORDER BY sent_at DESC LIMIT ?';
        
        const stmt = this.db.prepare(query);
        return sessionId ? stmt.all(sessionId, limit) : stmt.all(limit);
    }

    createSchedule(name, sessionId, listId, message, scheduledTime) {
        const stmt = this.db.prepare(`
            INSERT INTO schedules (name, session_id, list_id, message, scheduled_time)
            VALUES (?, ?, ?, ?, ?)
        `);
        const result = stmt.run(name, sessionId, listId, message, scheduledTime);
        return result.lastInsertRowid;
    }

    getSchedules() {
        const stmt = this.db.prepare('SELECT * FROM schedules ORDER BY scheduled_time ASC');
        return stmt.all();
    }

    getSchedulesByStatus(status) {
        const stmt = this.db.prepare('SELECT * FROM schedules WHERE status = ? ORDER BY scheduled_time ASC');
        return stmt.all(status);
    }

    getPendingSchedules() {
        const stmt = this.db.prepare(`
            SELECT * FROM schedules 
            WHERE status = 'pending' 
            AND scheduled_time <= datetime('now')
            ORDER BY scheduled_time ASC
        `);
        return stmt.all();
    }

    updateScheduleStatus(scheduleId, status) {
        const stmt = this.db.prepare(`
            UPDATE schedules 
            SET status = ?, executed_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `);
        return stmt.run(status, scheduleId);
    }

    deleteSchedule(scheduleId) {
        const stmt = this.db.prepare('DELETE FROM schedules WHERE id = ?');
        return stmt.run(scheduleId);
    }

    updateDailyStats(messagesSent, messagesFailed, uniqueRecipients) {
        const stmt = this.db.prepare(`
            INSERT INTO analytics (date, messages_sent, messages_failed, unique_recipients)
            VALUES (CURRENT_DATE, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                messages_sent = messages_sent + excluded.messages_sent,
                messages_failed = messages_failed + excluded.messages_failed,
                unique_recipients = unique_recipients + excluded.unique_recipients
        `);
        return stmt.run(messagesSent, messagesFailed, uniqueRecipients);
    }

    getOverallStats() {
        const stmt = this.db.prepare(`
            SELECT 
                SUM(messages_sent) as total_sent,
                SUM(messages_failed) as total_failed,
                SUM(unique_recipients) as total_recipients
            FROM analytics
        `);
        return stmt.get();
    }

    getDailyStats(days = 7) {
        const stmt = this.db.prepare(`
            SELECT * FROM analytics 
            WHERE date >= date('now', '-' || ? || ' days')
            ORDER BY date DESC
        `);
        return stmt.all(days);
    }

    close() {
        this.db.close();
    }
}

export default DatabaseManager;