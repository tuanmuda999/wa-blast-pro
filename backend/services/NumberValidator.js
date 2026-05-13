import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js';

class NumberValidator {
    constructor(orchestrator = null) {
        this.orchestrator = orchestrator;
        this.validCache = new Map(); // Cache valid numbers
        this.cacheExpiry = 86400000; // 24 hours
    }

    // ==================== FORMAT & VALIDATION METHODS ====================

    /**
     * Format phone number using libphonenumber
     * @param {string} number - Phone number
     * @param {string} defaultCountry - Default country code
     * @returns {string|null} - Formatted number or null
     */
    formatNumber(number, defaultCountry = 'US') {
        try {
            // Remove spaces, dashes, parentheses
            let cleaned = number.replace(/[\s\-\(\)]/g, '');
            
            // Add + if missing
            if (!cleaned.startsWith('+')) {
                cleaned = '+' + cleaned;
            }

            // Parse and format
            const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);
            
            if (phoneNumber && phoneNumber.isValid()) {
                return phoneNumber.number.replace('+', '');
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Check if number format is valid
     * @param {string} number - Phone number
     * @param {string} defaultCountry - Default country code
     * @returns {boolean} - True if valid format
     */
    isValidFormat(number, defaultCountry = 'US') {
        try {
            let cleaned = number.replace(/[\s\-\(\)]/g, '');
            
            if (!cleaned.startsWith('+')) {
                cleaned = '+' + cleaned;
            }

            return isValidPhoneNumber(cleaned, defaultCountry);
        } catch (error) {
            return false;
        }
    }

    // ==================== WHATSAPP VALIDATION (WITH ORCHESTRATOR) ====================

    /**
     * Check if number is on WhatsApp using session from orchestrator
     * @param {string} sessionId - Session ID
     * @param {string} number - Phone number
     * @returns {Promise<boolean>} - True if on WhatsApp
     */
    async checkWhatsApp(sessionId, number) {
        try {
            if (!this.orchestrator) {
                throw new Error('Orchestrator not provided');
            }

            const session = this.orchestrator.getSession(sessionId);
            
            if (!session || !session.isConnected()) {
                throw new Error('Session not available');
            }

            const jid = number.includes('@s.whatsapp.net') 
                ? number 
                : `${number}@s.whatsapp.net`;

            const [result] = await session.sock.onWhatsApp(jid);
            
            return result && result.exists;
        } catch (error) {
            console.error('WhatsApp check error:', error.message);
            return false;
        }
    }

    /**
     * Validate batch with session ID (using orchestrator)
     * @param {string} sessionId - Session ID
     * @param {Array<string>} numbers - Phone numbers
     * @param {string} defaultCountry - Default country
     * @returns {Promise<Array>} - Validation results
     */
    async validateBatchWithSession(sessionId, numbers, defaultCountry = 'US') {
        const results = [];

        for (const number of numbers) {
            const formatted = this.formatNumber(number, defaultCountry);
            
            if (!formatted) {
                results.push({
                    original: number,
                    formatted: null,
                    valid: false,
                    onWhatsApp: false,
                    error: 'Invalid format'
                });
                continue;
            }

            const onWhatsApp = await this.checkWhatsApp(sessionId, formatted);

            results.push({
                original: number,
                formatted,
                valid: true,
                onWhatsApp
            });

            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return results;
    }

    // ==================== DIRECT WHATSAPP VALIDATION (WITH SOCK) ====================

    /**
     * Check if number is on WhatsApp (direct with sock)
     * @param {Object} sock - WhatsApp socket
     * @param {string} number - Phone number (e.g., "6283827959229")
     * @returns {Promise<Object>} - {valid: boolean, exists: boolean, number: string}
     */
    async checkNumber(sock, number) {
        // Check cache first
        const cached = this.validCache.get(number);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.result;
        }

        try {
            // Format number
            const jid = number + '@s.whatsapp.net';
            
            // Check if number exists on WhatsApp
            const [result] = await sock.onWhatsApp(jid);
            
            const validResult = {
                valid: !!result,
                exists: !!result?.exists,
                number: number,
                jid: result?.jid || null
            };

            // Cache result
            this.validCache.set(number, {
                result: validResult,
                timestamp: Date.now()
            });

            return validResult;

        } catch (err) {
            console.error(`Validation error for ${number}:`, err.message);
            return {
                valid: false,
                exists: false,
                number: number,
                error: err.message
            };
        }
    }

    /**
     * Batch validate multiple numbers (direct with sock)
     * @param {Object} sock - WhatsApp socket
     * @param {Array<string>} numbers - Array of phone numbers
     * @param {Function} onProgress - Progress callback
     * @returns {Promise<Object>} - {valid: [], invalid: [], total: number}
     */
    async validateBatch(sock, numbers, onProgress = null) {
        console.log(`🔍 Validating ${numbers.length} numbers...`);
        
        const results = {
            valid: [],
            invalid: [],
            total: numbers.length
        };

        for (let i = 0; i < numbers.length; i++) {
            const number = numbers[i];
            
            try {
                const result = await this.checkNumber(sock, number);
                
                if (result.valid && result.exists) {
                    results.valid.push(number);
                } else {
                    results.invalid.push(number);
                }

                // Progress callback
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: numbers.length,
                        valid: results.valid.length,
                        invalid: results.invalid.length
                    });
                }

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));

            } catch (err) {
                console.error(`Failed to validate ${number}:`, err.message);
                results.invalid.push(number);
            }
        }

        console.log(`✅ Validation complete:`);
        console.log(`   Valid: ${results.valid.length}`);
        console.log(`   Invalid: ${results.invalid.length}`);

        return results;
    }

    // ==================== CACHE MANAGEMENT ====================

    /**
     * Clear validation cache
     */
    clearCache() {
        this.validCache.clear();
        console.log('✅ Validation cache cleared');
    }

    /**
     * Get cache size
     * @returns {number} - Number of cached entries
     */
    getCacheSize() {
        return this.validCache.size;
    }

    /**
     * Get cached result for number
     * @param {string} number - Phone number
     * @returns {Object|null} - Cached result or null
     */
    getCachedResult(number) {
        const cached = this.validCache.get(number);
        if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
            return cached.result;
        }
        return null;
    }
}

export default NumberValidator;