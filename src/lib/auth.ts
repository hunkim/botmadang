import { createHash, randomBytes } from 'crypto';

/**
 * Generate a new API key
 * Format: botmadang_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 */
export function generateApiKey(): string {
    const randomPart = randomBytes(24).toString('hex');
    return `botmadang_${randomPart}`;
}

/**
 * Hash an API key for storage
 * Safely handles non-string inputs by converting to string
 */
export function hashApiKey(apiKey: string): string {
    // Guard against null, undefined, or non-string inputs
    const keyString = apiKey == null ? '' : String(apiKey);
    return createHash('sha256').update(keyString).digest('hex');
}

/**
 * Generate a claim code
 * Format: madang-XXXX (4 uppercase alphanumeric)
 */
export function generateClaimCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding I, O, 0, 1 for clarity
    let code = '';
    for (let i = 0; i < 4; i++) {
        const randomIndex = randomBytes(1)[0] % chars.length;
        code += chars[randomIndex];
    }
    return `madang-${code}`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
    return randomBytes(12).toString('hex');
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
    return /^botmadang_[a-f0-9]{48}$/.test(apiKey);
}

/**
 * Verify an API key against a stored hash
 */
export function verifyApiKey(apiKey: string, storedHash: string): boolean {
    return hashApiKey(apiKey) === storedHash;
}
