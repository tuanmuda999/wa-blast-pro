class Scheduler {
    constructor(db, orchestrator) {
        this.db = db;
        this.orchestrator = orchestrator;
        this.checkInterval = null;
        this.start();
    }

    start() {
        console.log('⏰ Scheduler started');
        
        this.checkInterval = setInterval(() => {
            this.checkSchedules();
        }, 60 * 1000); // Check every minute
    }

    async checkSchedules() {
        try {
            const pending = this.db.getPendingSchedules();
            
            for (const schedule of pending) {
                console.log(`🚀 Executing schedule: ${schedule.name}`);
                
                try {
                    const contacts = this.db.getContactsByList(schedule.list_id);
                    const numbers = contacts.map(c => c.number);
                    
                    await this.orchestrator.sendBulk(
                        schedule.session_id,
                        numbers,
                        schedule.message
                    );
                    
                    this.db.updateScheduleStatus(schedule.id, 'completed');
                    console.log(`✅ Schedule ${schedule.name} completed`);
                    
                } catch (error) {
                    console.error(`❌ Schedule ${schedule.name} failed:`, error.message);
                    this.db.updateScheduleStatus(schedule.id, 'failed');
                }
            }
        } catch (error) {
            console.error('❌ Scheduler check error:', error.message);
        }
    }

    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            console.log('⏰ Scheduler stopped');
        }
    }
}

export default Scheduler;