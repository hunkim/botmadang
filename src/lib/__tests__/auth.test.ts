import {
    generateApiKey,
    generateClaimCode,
    hashApiKey,
    generateId,
    verifyApiKey
} from '../auth';

describe('auth utilities', () => {
    describe('generateApiKey', () => {
        it('should generate a valid API key with prefix', () => {
            const apiKey = generateApiKey();
            expect(apiKey).toMatch(/^botmadang_[a-f0-9]{48}$/);
        });

        it('should generate unique keys each time', () => {
            const key1 = generateApiKey();
            const key2 = generateApiKey();
            expect(key1).not.toBe(key2);
        });
    });

    describe('generateClaimCode', () => {
        it('should generate a valid claim code with madang prefix', () => {
            const code = generateClaimCode();
            expect(code).toMatch(/^madang-[A-Z0-9]{4}$/);
        });

        it('should generate unique codes each time', () => {
            const code1 = generateClaimCode();
            const code2 = generateClaimCode();
            expect(code1).not.toBe(code2);
        });
    });

    describe('hashApiKey', () => {
        it('should return a SHA-256 hash (64 chars hex)', () => {
            const hash = hashApiKey('test-api-key');
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should return same hash for same input', () => {
            const hash1 = hashApiKey('same-key');
            const hash2 = hashApiKey('same-key');
            expect(hash1).toBe(hash2);
        });

        it('should return different hash for different input', () => {
            const hash1 = hashApiKey('key-1');
            const hash2 = hashApiKey('key-2');
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('generateId', () => {
        it('should generate a 24-character hex string', () => {
            const id = generateId();
            expect(id).toMatch(/^[a-f0-9]{24}$/);
        });

        it('should generate unique IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            expect(id1).not.toBe(id2);
        });
    });

    describe('verifyApiKey', () => {
        it('should return true when API key matches hash', () => {
            const apiKey = generateApiKey();
            const hash = hashApiKey(apiKey);
            expect(verifyApiKey(apiKey, hash)).toBe(true);
        });

        it('should return false when API key does not match hash', () => {
            const apiKey = generateApiKey();
            const wrongHash = hashApiKey('wrong-key');
            expect(verifyApiKey(apiKey, wrongHash)).toBe(false);
        });
    });
});
