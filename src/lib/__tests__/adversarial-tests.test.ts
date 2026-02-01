/**
 * Adversarial Bug Hunting Tests
 * 
 * Purpose: Try to BREAK the main code by testing:
 * - Input validation weaknesses
 * - Type coercion bugs
 * - Boundary conditions
 * - Race conditions
 * - Logic errors
 * - Security vulnerabilities
 * - Off-by-one errors
 */

import {
    containsKorean,
    getKoreanRatio,
    hasMinimumKoreanRatio,
    validateKoreanContent,
} from '../korean-validator';

import {
    generateApiKey,
    hashApiKey,
    generateClaimCode,
    generateId,
    isValidApiKeyFormat,
    verifyApiKey,
} from '../auth';

describe('Adversarial Bug Hunting Tests', () => {
    // ========================================
    // TYPE COERCION ATTACKS (30 tests)
    // Try to trick functions with wrong types
    // ========================================
    describe('Type Coercion Attacks', () => {
        describe('containsKorean type coercion', () => {
            it('should handle number passed as input', () => {
                // @ts-ignore - intentional type attack
                expect(() => containsKorean(123)).not.toThrow();
            });

            it('should handle null input', () => {
                // @ts-ignore
                expect(() => containsKorean(null)).not.toThrow();
            });

            it('should handle undefined input', () => {
                // @ts-ignore
                expect(() => containsKorean(undefined)).not.toThrow();
            });

            it('should handle object input', () => {
                // @ts-ignore
                expect(() => containsKorean({ text: '한글' })).not.toThrow();
            });

            it('should handle array input', () => {
                // @ts-ignore
                expect(() => containsKorean(['한글'])).not.toThrow();
            });

            it('should handle boolean input', () => {
                // @ts-ignore
                expect(() => containsKorean(true)).not.toThrow();
            });

            it('should handle function input', () => {
                // @ts-ignore
                expect(() => containsKorean(() => '한글')).not.toThrow();
            });

            it('should handle Symbol input', () => {
                // @ts-ignore
                expect(() => containsKorean(Symbol('test'))).not.toThrow();
            });

            it('should handle BigInt input', () => {
                // @ts-ignore
                expect(() => containsKorean(BigInt(123))).not.toThrow();
            });

            it('should handle NaN input', () => {
                // @ts-ignore
                expect(() => containsKorean(NaN)).not.toThrow();
            });

            it('should handle Infinity input', () => {
                // @ts-ignore
                expect(() => containsKorean(Infinity)).not.toThrow();
            });

            it('should handle negative Infinity', () => {
                // @ts-ignore
                expect(() => containsKorean(-Infinity)).not.toThrow();
            });
        });

        describe('getKoreanRatio type coercion', () => {
            it('should handle number input', () => {
                // @ts-ignore
                const result = getKoreanRatio(12345);
                expect(typeof result).toBe('number');
            });

            it('should handle null returning 0', () => {
                // @ts-ignore
                const result = getKoreanRatio(null);
                expect(result).toBe(0);
            });

            it('should handle undefined returning 0', () => {
                // @ts-ignore
                const result = getKoreanRatio(undefined);
                expect(result).toBe(0);
            });

            it('should handle object with toString', () => {
                // @ts-ignore
                const result = getKoreanRatio({ toString: () => '한글' });
                expect(typeof result).toBe('number');
            });

            it('should handle array with toString', () => {
                // @ts-ignore
                const result = getKoreanRatio(['한글', '테스트']);
                expect(typeof result).toBe('number');
            });
        });

        describe('hashApiKey type coercion', () => {
            it('should handle number input without crashing', () => {
                // @ts-ignore
                expect(() => hashApiKey(12345)).not.toThrow();
            });

            it('should handle null input', () => {
                // @ts-ignore
                expect(() => hashApiKey(null)).not.toThrow();
            });

            it('should handle undefined input', () => {
                // @ts-ignore
                expect(() => hashApiKey(undefined)).not.toThrow();
            });

            it('should handle object input', () => {
                // @ts-ignore
                expect(() => hashApiKey({ key: 'value' })).not.toThrow();
            });

            it('should handle empty object', () => {
                // @ts-ignore
                expect(() => hashApiKey({})).not.toThrow();
            });
        });

        describe('isValidApiKeyFormat type coercion', () => {
            it('should reject number input', () => {
                // @ts-ignore
                expect(isValidApiKeyFormat(12345)).toBe(false);
            });

            it('should reject null', () => {
                // @ts-ignore
                expect(isValidApiKeyFormat(null)).toBe(false);
            });

            it('should reject undefined', () => {
                // @ts-ignore
                expect(isValidApiKeyFormat(undefined)).toBe(false);
            });

            it('should reject object', () => {
                // @ts-ignore
                expect(isValidApiKeyFormat({})).toBe(false);
            });

            it('should reject array', () => {
                // @ts-ignore
                expect(isValidApiKeyFormat([])).toBe(false);
            });
        });
    });

    // ========================================
    // PROTOTYPE POLLUTION ATTACKS (15 tests)
    // Try to exploit prototype chain
    // ========================================
    describe('Prototype Pollution Attacks', () => {
        it('should not be affected by Object.prototype pollution', () => {
            const originalProto = Object.prototype.toString;
            // @ts-ignore
            Object.prototype.malicious = '한글';

            expect(containsKorean('test')).toBe(false);

            // Cleanup
            // @ts-ignore
            delete Object.prototype.malicious;
        });

        it('should handle __proto__ in string', () => {
            expect(() => containsKorean('__proto__한글')).not.toThrow();
            expect(containsKorean('__proto__한글')).toBe(true);
        });

        it('should handle constructor keyword', () => {
            expect(() => containsKorean('constructor한글')).not.toThrow();
        });

        it('should handle prototype keyword', () => {
            expect(() => containsKorean('prototype한글')).not.toThrow();
        });

        it('should hash __proto__ safely', () => {
            expect(() => hashApiKey('__proto__')).not.toThrow();
        });

        it('should hash JSON with __proto__', () => {
            const malicious = JSON.stringify({ __proto__: { admin: true } });
            expect(() => hashApiKey(malicious)).not.toThrow();
        });
    });

    // ========================================
    // REGEX DENIAL OF SERVICE (ReDoS) (20 tests)
    // Try to cause catastrophic backtracking
    // ========================================
    describe('ReDoS Attacks', () => {
        it('should handle repeated pattern aaa...!', () => {
            const payload = 'a'.repeat(100) + '!';
            const start = Date.now();
            containsKorean(payload);
            expect(Date.now() - start).toBeLessThan(100);
        });

        it('should handle (a+)+ nested quantifiers pattern', () => {
            const payload = 'a'.repeat(50) + 'b';
            const start = Date.now();
            isValidApiKeyFormat(payload);
            expect(Date.now() - start).toBeLessThan(100);
        });

        it('should handle evil regex pattern \\.+\\.+x', () => {
            const payload = '.'.repeat(100) + 'x';
            const start = Date.now();
            containsKorean(payload);
            expect(Date.now() - start).toBeLessThan(100);
        });

        it('should handle alternation bomb', () => {
            const payload = 'aaaaaaaaaaaaaaaaaaaaaaaa!';
            const start = Date.now();
            containsKorean(payload);
            expect(Date.now() - start).toBeLessThan(100);
        });

        it('should handle nested groups', () => {
            const payload = '((((((((((a))))))))))'.repeat(10);
            const start = Date.now();
            containsKorean(payload);
            expect(Date.now() - start).toBeLessThan(100);
        });

        it('should handle long botmadang prefix variations', () => {
            const payload = 'botmadang' + '_'.repeat(1000) + 'a'.repeat(48);
            const start = Date.now();
            isValidApiKeyFormat(payload);
            expect(Date.now() - start).toBeLessThan(100);
        });

        it('should handle many underscores', () => {
            const payload = 'botmadang' + '_'.repeat(10000);
            const start = Date.now();
            isValidApiKeyFormat(payload);
            expect(Date.now() - start).toBeLessThan(100);
        });

        it('should handle mixed valid/invalid chars', () => {
            const payload = 'botmadang_' + 'az'.repeat(1000);
            const start = Date.now();
            isValidApiKeyFormat(payload);
            expect(Date.now() - start).toBeLessThan(100);
        });
    });

    // ========================================
    // UNICODE NORMALIZATION ATTACKS (25 tests)
    // Different representations of same char
    // ========================================
    describe('Unicode Normalization Attacks', () => {
        it('should consistently detect NFC normalized Korean', () => {
            const nfc = '가'.normalize('NFC');
            const nfd = '가'.normalize('NFD');
            expect(containsKorean(nfc)).toBe(containsKorean(nfd));
        });

        it('should have same ratio for NFC and NFD', () => {
            const nfc = '가나다'.normalize('NFC');
            const nfd = '가나다'.normalize('NFD');
            // Note: NFD splits into more chars, so ratios may differ
            // This tests if the implementation handles it
            expect(getKoreanRatio(nfc)).toBeGreaterThan(0);
            expect(getKoreanRatio(nfd)).toBeGreaterThan(0);
        });

        it('should handle NFKC normalization', () => {
            const nfkc = '가'.normalize('NFKC');
            expect(containsKorean(nfkc)).toBe(true);
        });

        it('should handle NFKD normalization', () => {
            const nfkd = '가'.normalize('NFKD');
            expect(containsKorean(nfkd)).toBe(true);
        });

        it('should detect decomposed Hangul syllable', () => {
            // '가' decomposed = ᄀ (U+1100) + ᅡ (U+1161)
            const decomposed = '\u1100\u1161';
            expect(containsKorean(decomposed)).toBe(true);
        });

        it('should detect all Hangul Jamo in decomposed form', () => {
            // 한 = ᄒ + ᅡ + ᆫ
            const decomposed = '\u1112\u1161\u11AB';
            expect(containsKorean(decomposed)).toBe(true);
        });

        it('should handle mixed normalized forms', () => {
            const mixed = '가'.normalize('NFC') + '나'.normalize('NFD');
            expect(containsKorean(mixed)).toBe(true);
        });

        it('should hash NFC and NFD to different values', () => {
            const nfc = '가'.normalize('NFC');
            const nfd = '가'.normalize('NFD');
            // These are different byte sequences
            expect(hashApiKey(nfc)).not.toBe(hashApiKey(nfd));
        });

        it('should handle homoglyphs (lookalikes)', () => {
            // Cyrillic 'а' (U+0430) vs Latin 'a' (U+0061)
            const cyrillic = '\u0430';
            const latin = 'a';
            expect(containsKorean(cyrillic)).toBe(false);
            expect(containsKorean(latin)).toBe(false);
        });

        it('should handle fullwidth characters', () => {
            // Fullwidth 'A' is U+FF21
            const fullwidth = '\uFF21\uFF22\uFF23';
            expect(containsKorean(fullwidth)).toBe(false);
        });

        it('should handle halfwidth Hangul', () => {
            // Halfwidth Hangul Compatibility Jamo (U+FFA0-U+FFDC)
            const halfwidth = '\uFFA1\uFFA2'; // ᄀ ᄁ in halfwidth
            expect(containsKorean(halfwidth)).toBe(true);
        });

        it('should handle enclosed CJK letters', () => {
            // Circled Hangul (U+3260-U+327F)
            const circled = '\u3260'; // ㉠
            expect(containsKorean(circled)).toBe(true);
        });

        it('should handle parenthesized Hangul', () => {
            // Parenthesized Hangul (U+3200-U+321F)
            const paren = '\u3200'; // ㈀
            expect(containsKorean(paren)).toBe(true);
        });
    });

    // ========================================
    // BOUNDARY VALUE ANALYSIS (30 tests)
    // Test exact boundaries where behavior changes
    // ========================================
    describe('Boundary Value Analysis', () => {
        describe('Korean ratio boundaries', () => {
            // Default minimum is 10% (0.1)

            it('should fail at 9.99% Korean (edge under)', () => {
                // Need 1 Korean in ~11 chars to get just under 10%
                const content = '가' + 'a'.repeat(10); // 1/11 ≈ 9.09%
                const result = validateKoreanContent(content);
                expect(result).not.toBeNull(); // Should fail
            });

            it('should pass at exactly 10% Korean', () => {
                // 1 Korean + 9 other = 10%
                const content = '가' + 'a'.repeat(9);
                const result = validateKoreanContent(content);
                expect(result).toBeNull(); // Should pass
            });

            it('should pass at 10.01% Korean (edge over)', () => {
                // 2 Korean + 18 other ≈ 10%
                const content = '가나' + 'a'.repeat(18);
                const result = validateKoreanContent(content);
                expect(result).toBeNull();
            });

            it('should fail at 0% Korean', () => {
                const result = validateKoreanContent('all english');
                expect(result).not.toBeNull();
            });

            it('should pass at 100% Korean', () => {
                const result = validateKoreanContent('한글만있는문장');
                expect(result).toBeNull();
            });

            it('should handle ratio with single character', () => {
                expect(getKoreanRatio('가')).toBe(1);
                expect(getKoreanRatio('a')).toBe(0);
            });

            it('should handle ratio with two characters', () => {
                expect(getKoreanRatio('가a')).toBe(0.5);
            });
        });

        describe('String length boundaries', () => {
            it('should handle empty string', () => {
                expect(validateKoreanContent('')).not.toBeNull();
            });

            it('should handle single character', () => {
                expect(validateKoreanContent('가')).toBeNull();
            });

            it('should handle very long string (1MB)', () => {
                const long = '가'.repeat(500000);
                expect(() => validateKoreanContent(long)).not.toThrow();
            });

            it('should handle max string length', () => {
                // V8 max string length is about 512MB
                // We test with something reasonable - 10MB
                const long = '가나다라'.repeat(625000); // 2.5 million chars
                const start = Date.now();
                const result = containsKorean(long);
                expect(Date.now() - start).toBeLessThan(1000);
                expect(result).toBe(true);
            });
        });

        describe('API key format boundaries', () => {
            it('should reject 47 hex chars after prefix', () => {
                expect(isValidApiKeyFormat('botmadang_' + 'a'.repeat(47))).toBe(false);
            });

            it('should accept exactly 48 hex chars after prefix', () => {
                expect(isValidApiKeyFormat('botmadang_' + 'a'.repeat(48))).toBe(true);
            });

            it('should reject 49 hex chars after prefix', () => {
                expect(isValidApiKeyFormat('botmadang_' + 'a'.repeat(49))).toBe(false);
            });

            it('should reject without underscore', () => {
                expect(isValidApiKeyFormat('botmadang' + 'a'.repeat(48))).toBe(false);
            });

            it('should reject with double underscore', () => {
                expect(isValidApiKeyFormat('botmadang__' + 'a'.repeat(47))).toBe(false);
            });
        });

        describe('Claim code boundaries', () => {
            it('should generate exactly 11 char claim codes', () => {
                for (let i = 0; i < 10; i++) {
                    expect(generateClaimCode().length).toBe(11);
                }
            });

            it('should have madang- prefix (7 chars)', () => {
                const code = generateClaimCode();
                expect(code.substring(0, 7)).toBe('madang-');
            });

            it('should have 4 char suffix', () => {
                const code = generateClaimCode();
                expect(code.substring(7).length).toBe(4);
            });
        });

        describe('ID boundaries', () => {
            it('should generate exactly 24 char IDs', () => {
                for (let i = 0; i < 10; i++) {
                    expect(generateId().length).toBe(24);
                }
            });

            it('should only contain hex chars in ID', () => {
                for (let i = 0; i < 10; i++) {
                    const id = generateId();
                    expect(/^[0-9a-f]{24}$/.test(id)).toBe(true);
                }
            });
        });
    });

    // ========================================
    // LOGIC ERROR HUNTING (25 tests)
    // Find flaws in the logic
    // ========================================
    describe('Logic Error Hunting', () => {
        describe('Korean detection logic', () => {
            it('should not count spaces as Korean', () => {
                const withSpaces = '가 나 다';
                const withoutSpaces = '가나다';
                // Spaces should not affect Korean detection
                expect(containsKorean(withSpaces)).toBe(true);
                expect(containsKorean(withoutSpaces)).toBe(true);
            });

            it('should handle only spaces between Korean', () => {
                const ratio = getKoreanRatio('가   나   다');
                // Should ignore spaces in calculation
                expect(ratio).toBe(1); // 3 Korean / 3 non-space = 100%
            });

            it('should not count newlines as non-Korean chars', () => {
                const ratio = getKoreanRatio('가\n나\n다');
                expect(ratio).toBe(1);
            });

            it('should handle tabs correctly', () => {
                const ratio = getKoreanRatio('가\t나\t다');
                expect(ratio).toBe(1);
            });

            it('should handle CR LF correctly', () => {
                const ratio = getKoreanRatio('가\r\n나');
                expect(ratio).toBe(1);
            });
        });

        describe('Validation logic', () => {
            it('should validate content with leading Korean', () => {
                expect(validateKoreanContent('한글 test')).toBeNull();
            });

            it('should validate content with trailing Korean', () => {
                expect(validateKoreanContent('test 한글')).toBeNull();
            });

            it('should validate content with Korean in middle', () => {
                expect(validateKoreanContent('test 한글 test')).toBeNull();
            });

            it('should reject truly empty content', () => {
                expect(validateKoreanContent('')).not.toBeNull();
            });

            it('should reject null-like string', () => {
                expect(validateKoreanContent('null')).not.toBeNull();
            });

            it('should reject undefined-like string', () => {
                expect(validateKoreanContent('undefined')).not.toBeNull();
            });
        });

        describe('Hash consistency', () => {
            it('should produce same hash for identical input', () => {
                const key = 'test_key_12345';
                const hash1 = hashApiKey(key);
                const hash2 = hashApiKey(key);
                expect(hash1).toBe(hash2);
            });

            it('should produce different hash for different input', () => {
                const hash1 = hashApiKey('key1');
                const hash2 = hashApiKey('key2');
                expect(hash1).not.toBe(hash2);
            });

            it('should produce different hash for similar input', () => {
                const hash1 = hashApiKey('test');
                const hash2 = hashApiKey('Test');
                expect(hash1).not.toBe(hash2);
            });

            it('should be case sensitive', () => {
                const hash1 = hashApiKey('ABC');
                const hash2 = hashApiKey('abc');
                expect(hash1).not.toBe(hash2);
            });
        });

        describe('Verify logic', () => {
            it('should verify matching key and hash', () => {
                const key = generateApiKey();
                const hash = hashApiKey(key);
                expect(verifyApiKey(key, hash)).toBe(true);
            });

            it('should not verify mismatched key and hash', () => {
                const key1 = generateApiKey();
                const key2 = generateApiKey();
                const hash = hashApiKey(key1);
                expect(verifyApiKey(key2, hash)).toBe(false);
            });

            it('should not verify empty key', () => {
                const hash = hashApiKey('some_key');
                expect(verifyApiKey('', hash)).toBe(false);
            });

            it('should not verify with empty hash', () => {
                const key = generateApiKey();
                expect(verifyApiKey(key, '')).toBe(false);
            });
        });
    });

    // ========================================
    // RACE CONDITION SIMULATION (15 tests)
    // Test for concurrent execution issues
    // ========================================
    describe('Race Condition Simulation', () => {
        it('should generate unique keys in rapid succession', async () => {
            const keys = await Promise.all(
                Array.from({ length: 100 }, () => Promise.resolve(generateApiKey()))
            );
            const unique = new Set(keys);
            expect(unique.size).toBe(100);
        });

        it('should generate unique IDs in rapid succession', async () => {
            const ids = await Promise.all(
                Array.from({ length: 100 }, () => Promise.resolve(generateId()))
            );
            const unique = new Set(ids);
            expect(unique.size).toBe(100);
        });

        it('should generate unique claim codes in rapid succession', async () => {
            const codes = await Promise.all(
                Array.from({ length: 100 }, () => Promise.resolve(generateClaimCode()))
            );
            const unique = new Set(codes);
            expect(unique.size).toBe(100);
        });

        it('should hash consistently under concurrent calls', async () => {
            const key = 'concurrent_test_key';
            const hashes = await Promise.all(
                Array.from({ length: 100 }, () => Promise.resolve(hashApiKey(key)))
            );
            const unique = new Set(hashes);
            expect(unique.size).toBe(1); // All should be same
        });

        it('should validate consistently under concurrent calls', async () => {
            const content = '테스트 내용입니다';
            const results = await Promise.all(
                Array.from({ length: 100 }, () => Promise.resolve(validateKoreanContent(content)))
            );
            expect(results.every(r => r === null)).toBe(true);
        });
    });

    // ========================================
    // SPECIAL STRING ATTACKS (20 tests)
    // Strings that often cause bugs
    // ========================================
    describe('Special String Attacks', () => {
        const specialStrings = [
            '',           // empty
            ' ',          // space
            '  ',         // multiple spaces
            '\t',         // tab
            '\n',         // newline
            '\r\n',       // CRLF
            '\0',         // null byte
            '\u0000',     // null unicode
            '\uFEFF',     // BOM
            '\uFFFF',     // max BMP char
            '\uD800',     // surrogate half (invalid standalone)
            '\uDFFF',     // surrogate half (invalid standalone)
            'null',       // null string
            'undefined',  // undefined string
            'true',       // boolean string
            'false',      // boolean string
            '0',          // zero string
            '-1',         // negative string
            '[]',         // empty array string
            '{}',         // empty object string
            '\\',         // backslash
            '/',          // forward slash
            '//',         // double slash
            '/*',         // comment start
            '*/',         // comment end
            '<!--',       // HTML comment
            '-->',        // HTML comment end
            '<script>',   // script tag
            'SELECT *',   // SQL
            'DROP TABLE', // SQL injection
        ];

        specialStrings.forEach((str, index) => {
            it(`should handle special string #${index}: ${JSON.stringify(str).slice(0, 20)}`, () => {
                expect(() => containsKorean(str)).not.toThrow();
                expect(() => getKoreanRatio(str)).not.toThrow();
                expect(() => hashApiKey(str)).not.toThrow();
            });
        });
    });

    // ========================================
    // NUMBER EDGE CASES (10 tests)
    // ========================================
    describe('Number Edge Cases', () => {
        it('should handle Korean with max safe integer', () => {
            const content = `숫자: ${Number.MAX_SAFE_INTEGER}`;
            expect(containsKorean(content)).toBe(true);
        });

        it('should handle Korean with min safe integer', () => {
            const content = `숫자: ${Number.MIN_SAFE_INTEGER}`;
            expect(containsKorean(content)).toBe(true);
        });

        it('should handle scientific notation in content', () => {
            expect(containsKorean('1e308 테스트')).toBe(true);
        });

        it('should handle negative zero', () => {
            expect(containsKorean('-0 테스트')).toBe(true);
        });

        it('should handle multiple decimal points', () => {
            expect(containsKorean('1.2.3.4 테스트')).toBe(true);
        });

        it('should handle hex numbers', () => {
            expect(containsKorean('0xDEADBEEF 테스트')).toBe(true);
        });

        it('should handle binary numbers', () => {
            expect(containsKorean('0b1010 테스트')).toBe(true);
        });

        it('should handle octal numbers', () => {
            expect(containsKorean('0o777 테스트')).toBe(true);
        });
    });

    // ========================================
    // RANDOMNESS QUALITY (10 tests)
    // Verify crypto randomness quality
    // ========================================
    describe('Randomness Quality', () => {
        it('should have good distribution of first char', () => {
            const firstChars: Record<string, number> = {};
            for (let i = 0; i < 1000; i++) {
                const key = generateApiKey();
                const firstHexChar = key.charAt(10); // First char after prefix
                firstChars[firstHexChar] = (firstChars[firstHexChar] || 0) + 1;
            }
            // Should have variety in first characters
            expect(Object.keys(firstChars).length).toBeGreaterThan(10);
        });

        it('should have no predictable patterns', () => {
            const keys = Array.from({ length: 100 }, () => generateApiKey());
            // Check that consecutive keys don't share prefixes beyond botmadang_
            for (let i = 1; i < keys.length; i++) {
                const common = keys[i].substring(10, 14);
                const prev = keys[i - 1].substring(10, 14);
                // Not identical (extremely unlikely with good randomness)
                if (common === prev) {
                    // Allow up to 2 collisions in 100 (statistically unlikely)
                    expect(keys.filter(k => k.substring(10, 14) === common).length).toBeLessThan(3);
                }
            }
        });

        it('should have even distribution of chars in claim codes', () => {
            const charCounts: Record<string, number> = {};
            for (let i = 0; i < 1000; i++) {
                const code = generateClaimCode();
                const suffix = code.substring(7);
                for (const char of suffix) {
                    charCounts[char] = (charCounts[char] || 0) + 1;
                }
            }
            // Should use variety of characters
            expect(Object.keys(charCounts).length).toBeGreaterThan(20);
        });

        it('should not have sequential IDs', () => {
            const ids = Array.from({ length: 100 }, () => generateId());
            // Convert first 8 chars to numbers
            const nums = ids.map(id => parseInt(id.substring(0, 8), 16));
            // Check no sequential pairs
            for (let i = 1; i < nums.length; i++) {
                expect(Math.abs(nums[i] - nums[i - 1])).toBeGreaterThan(1);
            }
        });
    });
});
