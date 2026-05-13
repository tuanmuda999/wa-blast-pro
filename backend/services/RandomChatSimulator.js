class RandomChatSimulator {
    constructor() {
        this.greetings = [
            'Hi!', 'Hello!', 'Hey there!', 'Good morning!', 
            'Good afternoon!', 'How are you?', 'Hope you\'re doing well!',
            'Hai!', 'Halo!', 'Apa kabar?', 'Selamat pagi!', 'Selamat siang!'
        ];

        this.smallTalk = [
            'How\'s your day going?',
            'What are you up to?',
            'Long time no talk!',
            'Hope everything is going well',
            'Just wanted to say hi',
            'Gimana kabarnya?',
            'Lagi ngapain?',
            'Udah lama ga ngobrol',
            'Semoga sehat selalu ya'
        ];

        this.closings = [
            'Take care!', 'Talk soon!', 'Have a great day!',
            'Catch you later!', 'Stay safe!', 'Cheers!',
            'Sampai jumpa!', 'Semangat ya!', 'Hati-hati!'
        ];
    }

    /**
     * Generate random natural message
     * @param {string} type - 'greeting', 'smalltalk', 'closing'
     * @returns {string} - Random message
     */
    generateMessage(type = 'smalltalk') {
        switch(type) {
            case 'greeting':
                return this.greetings[Math.floor(Math.random() * this.greetings.length)];
            case 'smalltalk':
                return this.smallTalk[Math.floor(Math.random() * this.smallTalk.length)];
            case 'closing':
                return this.closings[Math.floor(Math.random() * this.closings.length)];
            default:
                return this.smallTalk[Math.floor(Math.random() * this.smallTalk.length)];
        }
    }

    /**
     * Send random chats to simulate human behavior
     * @param {Object} session - WhatsApp session
     * @param {Array<string>} numbers - Target numbers
     * @param {number} count - How many random chats to send (default 5)
     */
    async sendRandomChats(session, numbers, count = 5) {
        console.log(`💬 Sending ${count} random chats for warmup...`);

        if (!numbers || numbers.length === 0) {
            console.log('⚠️ No numbers provided for random chat');
            return;
        }

        // Pick random numbers
        const selectedNumbers = [];
        for (let i = 0; i < Math.min(count, numbers.length); i++) {
            const randomIndex = Math.floor(Math.random() * numbers.length);
            if (!selectedNumbers.includes(numbers[randomIndex])) {
                selectedNumbers.push(numbers[randomIndex]);
            }
        }

        for (const number of selectedNumbers) {
            try {
                // Random message type
                const types = ['greeting', 'smalltalk', 'closing'];
                const randomType = types[Math.floor(Math.random() * types.length)];
                const message = this.generateMessage(randomType);

                // Send message
                const jid = number + '@s.whatsapp.net';
                await session.sock.sendMessage(jid, { text: message });

                console.log(`✅ Random chat sent to ${number}: "${message}"`);

                // Random delay (3-10 seconds)
                const delay = 3000 + Math.random() * 7000;
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (err) {
                console.error(`❌ Failed random chat to ${number}:`, err.message);
            }
        }

        console.log(`✅ Random chat warmup complete!`);
    }

    /**
     * Simulate reading messages (mark as read)
     * @param {Object} session - WhatsApp session
     * @param {number} count - How many to mark read
     */
    async simulateReadMessages(session, count = 3) {
        console.log(`👀 Simulating reading ${count} messages...`);
        
        // This would require accessing recent messages
        // Implementation depends on your message storage
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`✅ Read simulation complete`);
    }

    /**
     * Simulate checking status updates
     * @param {Object} session - WhatsApp session
     */
    async simulateStatusViews(session) {
        console.log(`📱 Simulating status views...`);
        
        // Simulate viewing statuses
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log(`✅ Status view simulation complete`);
    }

    /**
     * Full warmup routine
     * @param {Object} session - WhatsApp session
     * @param {Array<string>} numbers - Available numbers
     */
    async fullWarmup(session, numbers) {
        console.log(`🔥 Starting full account warmup...`);

        // Step 1: Read messages
        await this.simulateReadMessages(session, 3);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 2: View statuses
        await this.simulateStatusViews(session);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 3: Send random chats
        await this.sendRandomChats(session, numbers, 5);

        console.log(`✅ Full warmup complete!`);
    }
}

export default RandomChatSimulator;