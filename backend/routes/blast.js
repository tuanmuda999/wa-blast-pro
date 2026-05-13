import UltimateBlastOrchestrator from '../services/backend/services/BlastOrchestratorAdvanced.js';

// FEATURE 1: Single Message
router.post('/message/single', async (req, res) => {
    try {
        const { sessionId, recipient, message } = req.body;
        const result = await global.orchestrator.sendSingleMessage(sessionId, recipient, message);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FEATURE 2: Group Message
router.post('/message/group', async (req, res) => {
    try {
        const { sessionId, groupId, message } = req.body;
        const result = await global.orchestrator.sendGroupMessage(sessionId, groupId, message);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FEATURE 3: Media Send
router.post('/message/media', async (req, res) => {
    try {
        const { sessionId, recipient, mediaPath, caption } = req.body;
        const result = await global.orchestrator.sendMedia(sessionId, recipient, mediaPath, caption);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FEATURE 4: Auto-Reply Setup
router.post('/auto-reply/setup', async (req, res) => {
    try {
        const { sessionId, trigger, response } = req.body;
        const result = await global.orchestrator.setupAutoReply(sessionId, trigger, response);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FEATURE 5: Scheduled Message
router.post('/message/schedule', async (req, res) => {
    try {
        const { sessionId, recipient, message, scheduleTime } = req.body;
        const result = await global.orchestrator.scheduleMessage(
            sessionId, recipient, message, scheduleTime
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// FEATURE 6-10: Blast Modes (already exist, just make sure they use new orchestrator)
router.post('/blast/safe', async (req, res) => {
    try {
        const { sessionId, listId, message } = req.body;
        const contacts = req.db.db.prepare('SELECT number FROM contacts WHERE list_id = ?').all(listId);
        const result = await global.orchestrator.blastSafeMode(sessionId, contacts, message);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ... (repeat for balanced, fast, instant, stealth-instant)