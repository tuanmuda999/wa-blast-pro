export const ANTI_DETECTION_CONFIG = {
    // ==================== MESSAGE RANDOMIZATION ====================
    MESSAGE_VARIATIONS: {
        enabled: true,
        minVariations: 5,
        techniques: {
            synonyms: true,           // Replace words with synonyms
            emojis: true,             // Random emoji insertion
            formatting: true,          // Random spacing/newlines
            greetings: true,          // Random greetings
            signatures: true,          // Random signatures
            typos: true               // Intentional typos (human-like)
        }
    },

    // ==================== TIMING EVASION ====================
    TIMING: {
        randomDelay: {
            min: 2000,
            max: 8000,
            variance: 0.3           // 30% variance per message
        },
        humanPatterns: {
            enabled: true,
            typingSpeed: {         // Simulate typing
                min: 50,           // ms per character
                max: 150
            },
            thinkingPause: {       // Random pauses
                probability: 0.3,
                min: 3000,
                max: 10000
            },
            breakTime: {           // Periodic breaks
                every: 50,         // messages
                duration: {
                    min: 300000,   // 5 min
                    max: 900000    // 15 min
                }
            }
        }
    },

    // ==================== SESSION WARMING ====================
    SESSION_WARMING: {
        enabled: true,
        beforeBlast: {
            enabled: true,
            actions: [
                'read_status',      // Read some statuses
                'check_groups',     // Check groups
                'view_contacts',    // Browse contacts
                'send_test'         // Send test to known contact
            ],
            duration: 60000        // 1 minute warm-up
        },
        cooldown: {
            enabled: true,
            after: 100,           // messages
            duration: 1800000     // 30 min
        }
    },

    // ==================== PROXY CONFIGURATION ====================
    PROXY: {
        enabled: true,
        rotation: {
            enabled: true,
            perMessages: 50,      // Rotate every 50 messages
            perSession: true      // Different proxy per session
        },
        pools: {
            residential: [],      // Add residential proxies here
            datacenter: [],       // Add datacenter proxies
            mobile: []           // Add mobile proxies (best)
        },
        validation: {
            testBeforeUse: true,
            timeout: 5000,
            retries: 3
        }
    },

    // ==================== DEVICE FINGERPRINTING ====================
    DEVICE_SPOOFING: {
        enabled: true,
        rotation: {
            userAgent: true,
            screenResolution: true,
            timezone: true,
            language: true
        },
        realistic: {
            mobileOnly: true,     // Only mobile user agents
            popularDevices: [
                'iPhone 13 Pro',
                'Samsung Galaxy S21',
                'Pixel 6',
                'OnePlus 9'
            ]
        }
    },

    // ==================== RECIPIENT VALIDATION ====================
    RECIPIENT_CHECK: {
        enabled: true,
        validateBeforeSend: true,
        skipInvalid: true,
        checkOnWhatsApp: true,    // Verify number exists
        cacheResults: true,
        cacheExpiry: 86400000    // 24 hours
    },

    // ==================== CONTENT OBFUSCATION ====================
    OBFUSCATION: {
        enabled: true,
        techniques: {
            zeroWidthChars: true,     // Invisible characters
            unicodeVariants: true,     // Similar-looking chars
            whitespaceVariation: true, // Random spaces/tabs
            linkShortening: true       // Shorten URLs
        }
    },

    // ==================== RATE LIMITING (AGGRESSIVE) ====================
    RATE_LIMITS: {
        perHour: {
            safe: 50,
            aggressive: 200,
            insane: 1000
        },
        perDay: {
            safe: 500,
            aggressive: 2000,
            insane: 10000
        },
        adaptive: {
            enabled: true,
            reduceOnError: 0.5,    // Reduce 50% on error
            increaseOnSuccess: 1.1  // Increase 10% on success
        }
    }
};

// ==================== PROXY POOL MANAGER ====================
export class ProxyManager {
    constructor(proxies) {
        this.proxies = proxies;
        this.currentIndex = 0;
        this.failedProxies = new Set();
    }

    getNext() {
        if (this.proxies.length === 0) return null;
        
        let attempts = 0;
        while (attempts < this.proxies.length) {
            const proxy = this.proxies[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
            
            if (!this.failedProxies.has(proxy)) {
                return proxy;
            }
            attempts++;
        }
        
        return null; // All proxies failed
    }

    markFailed(proxy) {
        this.failedProxies.add(proxy);
    }

    reset() {
        this.failedProxies.clear();
    }

    async testProxy(proxy) {
        try {
            const agent = new HttpsProxyAgent(proxy);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch('https://api.ipify.org?format=json', {
                agent,
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            return response.ok;
        } catch (err) {
            return false;
        }
    }
}

// ==================== MESSAGE RANDOMIZER ====================
export class MessageRandomizer {
    static variations = {
        greetings: [
            'Hi', 'Hello', 'Hey', 'Hi there', 'Good day',
            'Greetings', 'Yo', 'Hai', 'Halo', 'Hei'
        ],
        connectors: [
            ', ', '! ', '. ', ' - ', '\n',
            '. ', ', btw ', ' anyway, '
        ],
        emojis: [
            '😊', '👍', '🙏', '✨', '💫', '🔥',
            '👌', '💪', '🎯', '⭐', '🌟', '💯'
        ],
        fillers: [
            'by the way', 'btw', 'also', 'oh',
            'anyway', 'just', 'so', 'well'
        ]
    };

    static randomize(text, intensity = 'medium') {
        let result = text;
        
        // Add random greeting (10% chance)
        if (Math.random() < 0.1) {
            const greeting = this.variations.greetings[
                Math.floor(Math.random() * this.variations.greetings.length)
            ];
            result = `${greeting}! ${result}`;
        }

        // Add random emoji (20% chance)
        if (Math.random() < 0.2) {
            const emoji = this.variations.emojis[
                Math.floor(Math.random() * this.variations.emojis.length)
            ];
            result = `${result} ${emoji}`;
        }

        // Add random spacing variations
        if (intensity === 'high' && Math.random() < 0.3) {
            result = result.replace(/\./g, (match) => 
                Math.random() < 0.5 ? '. ' : '.\n'
            );
        }

        // Add zero-width characters (invisible, breaks fingerprinting)
        if (intensity === 'high') {
            const zeroWidthChars = ['\u200B', '\u200C', '\u200D'];
            const positions = [0.2, 0.5, 0.8].map(p => 
                Math.floor(result.length * p)
            );
            
            positions.forEach(pos => {
                const char = zeroWidthChars[
                    Math.floor(Math.random() * zeroWidthChars.length)
                ];
                result = result.slice(0, pos) + char + result.slice(pos);
            });
        }

        return result;
    }

    static generateVariations(text, count = 5) {
        const variations = new Set();
        variations.add(text); // Original

        while (variations.size < count) {
            variations.add(this.randomize(text, 'high'));
        }

        return Array.from(variations);
    }
}

// ==================== HUMAN BEHAVIOR SIMULATOR ====================
export class HumanBehavior {
    static async simulateTyping(text) {
        const chars = text.length;
        const avgSpeed = 80; // ms per character
        const variance = 40;
        
        const typingTime = chars * (avgSpeed + (Math.random() - 0.5) * variance);
        await new Promise(resolve => setTimeout(resolve, typingTime));
    }

    static async randomPause() {
        if (Math.random() < 0.3) { // 30% chance
            const pauseDuration = 3000 + Math.random() * 7000;
            await new Promise(resolve => setTimeout(resolve, pauseDuration));
        }
    }

    static async sessionWarmup(session) {
        console.log('🔥 Warming up session...');
        
        // Simulate reading status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate checking groups
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Random browsing behavior
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('✅ Session warmed up');
    }
}