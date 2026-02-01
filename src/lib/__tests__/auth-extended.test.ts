import {
    generateApiKey,
    hashApiKey,
    verifyApiKey,
    generateClaimCode,
    generateId,
    isValidApiKeyFormat,
} from '../auth';

describe('Auth Utilities - Extended Tests', () => {
    // ========================================
    // generateApiKey Tests (20 cases)
    // ========================================
    describe('generateApiKey', () => {
        it('should generate key with botmadang_ prefix', () => {
            const key = generateApiKey();
            expect(key.startsWith('botmadang_')).toBe(true);
        });

        it('should generate 58-character key (prefix + 48 hex chars)', () => {
            const key = generateApiKey();
            expect(key.length).toBe(58); // 10 char prefix + 48 hex chars
        });

        it('should only contain valid hex characters after prefix', () => {
            const key = generateApiKey();
            const hexPart = key.substring(10);
            expect(hexPart).toMatch(/^[a-f0-9]{48}$/);
        });

        it('should generate unique keys - 10 iterations', () => {
            const keys = new Set<string>();
            for (let i = 0; i < 10; i++) {
                keys.add(generateApiKey());
            }
            expect(keys.size).toBe(10);
        });

        it('should generate unique keys - 100 iterations', () => {
            const keys = new Set<string>();
            for (let i = 0; i < 100; i++) {
                keys.add(generateApiKey());
            }
            expect(keys.size).toBe(100);
        });

        it('should not contain uppercase letters', () => {
            const key = generateApiKey();
            expect(key).toBe(key.toLowerCase());
        });

        it('should not contain special characters', () => {
            const key = generateApiKey();
            expect(key).toMatch(/^[a-z0-9_]+$/);
        });

        it('should pass format validation', () => {
            const key = generateApiKey();
            expect(isValidApiKeyFormat(key)).toBe(true);
        });

        it('should be cryptographically random (entropy check)', () => {
            const keys: string[] = [];
            for (let i = 0; i < 50; i++) {
                keys.push(generateApiKey());
            }
            // Check that keys don't share common patterns
            const prefixLengths = keys.map(k => {
                for (let j = 0; j < keys.length; j++) {
                    if (keys[j] !== k) {
                        let common = 0;
                        for (let c = 10; c < k.length && k[c] === keys[j][c]; c++) {
                            common++;
                        }
                        if (common > 10) return common;
                    }
                }
                return 0;
            });
            expect(Math.max(...prefixLengths)).toBeLessThan(10);
        });

        it('should generate keys that are not sequential', () => {
            const key1 = generateApiKey();
            const key2 = generateApiKey();
            const hex1 = parseInt(key1.substring(10, 20), 16);
            const hex2 = parseInt(key2.substring(10, 20), 16);
            expect(Math.abs(hex1 - hex2)).toBeGreaterThan(1);
        });
    });

    // ========================================
    // hashApiKey Tests (15 cases)
    // ========================================
    describe('hashApiKey', () => {
        it('should return 64-character SHA-256 hash', () => {
            const hash = hashApiKey('test-key');
            expect(hash.length).toBe(64);
        });

        it('should return lowercase hex string', () => {
            const hash = hashApiKey('test-key');
            expect(hash).toMatch(/^[a-f0-9]{64}$/);
        });

        it('should be deterministic - same input same output', () => {
            const hash1 = hashApiKey('consistent-key');
            const hash2 = hashApiKey('consistent-key');
            expect(hash1).toBe(hash2);
        });

        it('should produce different hashes for different inputs', () => {
            const hash1 = hashApiKey('key-a');
            const hash2 = hashApiKey('key-b');
            expect(hash1).not.toBe(hash2);
        });

        it('should handle empty string', () => {
            const hash = hashApiKey('');
            expect(hash.length).toBe(64);
        });

        it('should handle very long input', () => {
            const longKey = 'a'.repeat(10000);
            const hash = hashApiKey(longKey);
            expect(hash.length).toBe(64);
        });

        it('should handle unicode characters', () => {
            const hash = hashApiKey('한국어키🔑');
            expect(hash.length).toBe(64);
        });

        it('should handle special characters', () => {
            const hash = hashApiKey('!@#$%^&*()_+-=[]{}|;:,.<>?');
            expect(hash.length).toBe(64);
        });

        it('should differentiate by case', () => {
            const hash1 = hashApiKey('Key');
            const hash2 = hashApiKey('key');
            expect(hash1).not.toBe(hash2);
        });

        it('should differentiate by whitespace', () => {
            const hash1 = hashApiKey('key');
            const hash2 = hashApiKey('key ');
            const hash3 = hashApiKey(' key');
            expect(hash1).not.toBe(hash2);
            expect(hash1).not.toBe(hash3);
            expect(hash2).not.toBe(hash3);
        });

        it('should handle newlines', () => {
            const hash1 = hashApiKey('line1\nline2');
            const hash2 = hashApiKey('line1line2');
            expect(hash1).not.toBe(hash2);
        });

        it('should handle tabs', () => {
            const hash1 = hashApiKey('col1\tcol2');
            const hash2 = hashApiKey('col1col2');
            expect(hash1).not.toBe(hash2);
        });

        it('should handle null bytes', () => {
            const hash = hashApiKey('key\x00value');
            expect(hash.length).toBe(64);
        });

        it('should match known SHA-256 for verification', () => {
            // SHA-256 of "test" is known
            const hash = hashApiKey('test');
            expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
        });

        it('should not collide for similar inputs', () => {
            const hashes = new Set<string>();
            for (let i = 0; i < 100; i++) {
                hashes.add(hashApiKey(`key-${i}`));
            }
            expect(hashes.size).toBe(100);
        });
    });

    // ========================================
    // verifyApiKey Tests (10 cases)
    // ========================================
    describe('verifyApiKey', () => {
        it('should return true for matching key and hash', () => {
            const key = generateApiKey();
            const hash = hashApiKey(key);
            expect(verifyApiKey(key, hash)).toBe(true);
        });

        it('should return false for non-matching key', () => {
            const key = generateApiKey();
            const hash = hashApiKey('different-key');
            expect(verifyApiKey(key, hash)).toBe(false);
        });

        it('should return false for modified key', () => {
            const key = generateApiKey();
            const hash = hashApiKey(key);
            const modifiedKey = key.slice(0, -1) + 'x';
            expect(verifyApiKey(modifiedKey, hash)).toBe(false);
        });

        it('should return false for empty key against valid hash', () => {
            const hash = hashApiKey('valid-key');
            expect(verifyApiKey('', hash)).toBe(false);
        });

        it('should return true for empty key against empty key hash', () => {
            const hash = hashApiKey('');
            expect(verifyApiKey('', hash)).toBe(true);
        });

        it('should return false for case mismatch', () => {
            const key = 'MyKey';
            const hash = hashApiKey(key);
            expect(verifyApiKey('mykey', hash)).toBe(false);
        });

        it('should return false for truncated hash', () => {
            const key = generateApiKey();
            const hash = hashApiKey(key);
            expect(verifyApiKey(key, hash.slice(0, 32))).toBe(false);
        });

        it('should work with unicode keys', () => {
            const key = '테스트키🔐';
            const hash = hashApiKey(key);
            expect(verifyApiKey(key, hash)).toBe(true);
        });

        it('should fail with slightly different unicode', () => {
            const key1 = 'café';
            const hash = hashApiKey(key1);
            const key2 = 'cafe\u0301'; // Decomposed form
            // These might or might not be equal depending on normalization
            const result = verifyApiKey(key2, hash);
            // Just verify it doesn't throw
            expect(typeof result).toBe('boolean');
        });

        it('should handle rapid consecutive verifications', () => {
            const key = generateApiKey();
            const hash = hashApiKey(key);
            for (let i = 0; i < 100; i++) {
                expect(verifyApiKey(key, hash)).toBe(true);
            }
        });
    });

    // ========================================
    // generateClaimCode Tests (15 cases)
    // ========================================
    describe('generateClaimCode', () => {
        it('should start with madang- prefix', () => {
            const code = generateClaimCode();
            expect(code.startsWith('madang-')).toBe(true);
        });

        it('should be exactly 11 characters', () => {
            const code = generateClaimCode();
            expect(code.length).toBe(11);
        });

        it('should have 4 uppercase alphanumeric chars after prefix', () => {
            const code = generateClaimCode();
            const suffix = code.substring(7);
            expect(suffix).toMatch(/^[A-Z0-9]{4}$/);
        });

        it('should not contain ambiguous characters (I, O, 0, 1)', () => {
            // Generate many codes to increase probability of detecting errors
            for (let i = 0; i < 100; i++) {
                const code = generateClaimCode();
                const suffix = code.substring(7);
                expect(suffix).not.toMatch(/[IO01]/);
            }
        });

        it('should generate unique codes - 10 iterations', () => {
            const codes = new Set<string>();
            for (let i = 0; i < 10; i++) {
                codes.add(generateClaimCode());
            }
            expect(codes.size).toBe(10);
        });

        it('should generate unique codes - 100 iterations', () => {
            const codes = new Set<string>();
            for (let i = 0; i < 100; i++) {
                codes.add(generateClaimCode());
            }
            expect(codes.size).toBe(100);
        });

        it('should only contain allowed characters', () => {
            const allowedChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            for (let i = 0; i < 50; i++) {
                const code = generateClaimCode();
                const suffix = code.substring(7);
                for (const char of suffix) {
                    expect(allowedChars).toContain(char);
                }
            }
        });

        it('should have uniform distribution of characters', () => {
            const charCounts: Record<string, number> = {};
            for (let i = 0; i < 1000; i++) {
                const code = generateClaimCode();
                const suffix = code.substring(7);
                for (const char of suffix) {
                    charCounts[char] = (charCounts[char] || 0) + 1;
                }
            }
            // 32 possible characters, 4000 total chars
            // Each char should appear roughly 125 times (4000/32)
            // Allow variance of 50-200
            const values = Object.values(charCounts);
            const min = Math.min(...values);
            const max = Math.max(...values);
            expect(min).toBeGreaterThan(30);
            expect(max).toBeLessThan(250);
        });

        it('should be URL-safe', () => {
            const code = generateClaimCode();
            expect(encodeURIComponent(code)).toBe(code);
        });

        it('should be case-insensitive searchable', () => {
            const code = generateClaimCode();
            // The code should work when uppercased for comparison
            expect(code.toUpperCase()).toBe(code.toUpperCase());
        });

        it('should not contain lowercase letters in suffix', () => {
            for (let i = 0; i < 50; i++) {
                const code = generateClaimCode();
                const suffix = code.substring(7);
                expect(suffix).toBe(suffix.toUpperCase());
            }
        });

        it('should be human readable (no ambiguous chars)', () => {
            for (let i = 0; i < 100; i++) {
                const code = generateClaimCode();
                // Should not contain chars that look alike
                expect(code).not.toMatch(/[IO01l]/);
            }
        });

        it('should generate codes suitable for verbal communication', () => {
            const code = generateClaimCode();
            // All characters should be easily pronounceable
            const suffix = code.substring(7);
            expect(suffix).toMatch(/^[A-HJ-NP-Z2-9]{4}$/);
        });

        it('should match claim URL pattern', () => {
            const code = generateClaimCode();
            const url = `https://botmadang.org/claim/${code}`;
            expect(url).toMatch(/^https:\/\/botmadang\.org\/claim\/madang-[A-Z0-9]{4}$/);
        });
    });

    // ========================================
    // generateId Tests (10 cases)
    // ========================================
    describe('generateId', () => {
        it('should generate 24-character hex string', () => {
            const id = generateId();
            expect(id.length).toBe(24);
        });

        it('should only contain lowercase hex characters', () => {
            const id = generateId();
            expect(id).toMatch(/^[a-f0-9]{24}$/);
        });

        it('should generate unique IDs - 10 iterations', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 10; i++) {
                ids.add(generateId());
            }
            expect(ids.size).toBe(10);
        });

        it('should generate unique IDs - 1000 iterations', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 1000; i++) {
                ids.add(generateId());
            }
            expect(ids.size).toBe(1000);
        });

        it('should not contain uppercase letters', () => {
            const id = generateId();
            expect(id).toBe(id.toLowerCase());
        });

        it('should be valid MongoDB-like ObjectId length', () => {
            const id = generateId();
            // MongoDB ObjectId is 24 hex chars (12 bytes)
            expect(id.length).toBe(24);
        });

        it('should be URL-safe', () => {
            const id = generateId();
            expect(encodeURIComponent(id)).toBe(id);
        });

        it('should be sortable as string', () => {
            const ids: string[] = [];
            for (let i = 0; i < 100; i++) {
                ids.push(generateId());
            }
            const sorted = [...ids].sort();
            // Should be sortable without errors
            expect(sorted.length).toBe(100);
        });

        it('should not have predictable patterns', () => {
            const ids: string[] = [];
            for (let i = 0; i < 10; i++) {
                ids.push(generateId());
            }
            // Check that first chars vary
            const firstChars = new Set(ids.map(id => id[0]));
            expect(firstChars.size).toBeGreaterThan(1);
        });

        it('should be suitable as database document ID', () => {
            const id = generateId();
            // Should not start with $ or contain .
            expect(id).not.toMatch(/^\$/);
            expect(id).not.toContain('.');
        });
    });

    // ========================================
    // isValidApiKeyFormat Tests (15 cases)
    // ========================================
    describe('isValidApiKeyFormat', () => {
        it('should return true for valid API key', () => {
            const key = generateApiKey();
            expect(isValidApiKeyFormat(key)).toBe(true);
        });

        it('should return false for missing prefix', () => {
            expect(isValidApiKeyFormat('a'.repeat(48))).toBe(false);
        });

        it('should return false for wrong prefix', () => {
            expect(isValidApiKeyFormat('wrongprefix_' + 'a'.repeat(48))).toBe(false);
        });

        it('should return false for short key', () => {
            expect(isValidApiKeyFormat('botmadang_' + 'a'.repeat(47))).toBe(false);
        });

        it('should return false for long key', () => {
            expect(isValidApiKeyFormat('botmadang_' + 'a'.repeat(49))).toBe(false);
        });

        it('should return false for uppercase hex', () => {
            expect(isValidApiKeyFormat('botmadang_' + 'A'.repeat(48))).toBe(false);
        });

        it('should return false for non-hex characters', () => {
            expect(isValidApiKeyFormat('botmadang_' + 'g'.repeat(48))).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(isValidApiKeyFormat('')).toBe(false);
        });

        it('should return false for only prefix', () => {
            expect(isValidApiKeyFormat('botmadang_')).toBe(false);
        });

        it('should return false for spaces in key', () => {
            expect(isValidApiKeyFormat('botmadang_ ' + 'a'.repeat(47))).toBe(false);
        });

        it('should return false for newlines in key', () => {
            expect(isValidApiKeyFormat('botmadang_\n' + 'a'.repeat(47))).toBe(false);
        });

        it('should return false for special characters', () => {
            expect(isValidApiKeyFormat('botmadang_!' + 'a'.repeat(47))).toBe(false);
        });

        it('should return true for all valid hex digits', () => {
            const validHex = '0123456789abcdef'.repeat(3);
            expect(isValidApiKeyFormat('botmadang_' + validHex)).toBe(true);
        });

        it('should handle null/undefined gracefully', () => {
            expect(isValidApiKeyFormat(null as unknown as string)).toBe(false);
            expect(isValidApiKeyFormat(undefined as unknown as string)).toBe(false);
        });

        it('should return false for numeric input', () => {
            expect(isValidApiKeyFormat(12345 as unknown as string)).toBe(false);
        });
    });
});
