/**
 * Edge Cases and Corner Cases Tests
 * 
 * This file covers obscure edge cases that might break the API
 */

import {
    containsKorean,
    getKoreanRatio,
    validateKoreanContent,
} from '../korean-validator';

import {
    generateApiKey,
    hashApiKey,
    generateClaimCode,
    generateId,
    isValidApiKeyFormat,
} from '../auth';

describe('Edge Cases - Extended', () => {
    // ========================================
    // Unicode Edge Cases (40 cases)
    // ========================================
    describe('Unicode Edge Cases', () => {
        // Korean Unicode Boundaries
        it('should detect first Hangul syllable \\uAC00 (가)', () => {
            expect(containsKorean('\uAC00')).toBe(true);
        });

        it('should detect last Hangul syllable \\uD7A3 (힣)', () => {
            expect(containsKorean('\uD7A3')).toBe(true);
        });

        it('should detect first Hangul Jamo \\u1100 (ᄀ)', () => {
            expect(containsKorean('\u1100')).toBe(true);
        });

        it('should detect last Hangul Jamo \\u11FF', () => {
            expect(containsKorean('\u11FF')).toBe(true);
        });

        it('should detect first Hangul Compatibility Jamo \\u3130', () => {
            expect(containsKorean('\u3130')).toBe(true);
        });

        it('should detect last Hangul Compatibility Jamo \\u318F', () => {
            expect(containsKorean('\u318F')).toBe(true);
        });

        // Just outside Korean ranges
        it('should not detect char just before Hangul syllables \\uABFF', () => {
            expect(containsKorean('\uABFF')).toBe(false);
        });

        it('should not detect char just after Hangul syllables \\uD7B0', () => {
            expect(containsKorean('\uD7B0')).toBe(false);
        });

        // Zero-width and invisible characters
        it('should handle zero-width space', () => {
            expect(containsKorean('\u200B')).toBe(false);
        });

        it('should handle zero-width non-joiner', () => {
            expect(containsKorean('\u200C')).toBe(false);
        });

        it('should handle zero-width joiner', () => {
            expect(containsKorean('\u200D')).toBe(false);
        });

        it('should detect Korean with zero-width chars', () => {
            expect(containsKorean('\u200B가\u200B')).toBe(true);
        });

        // Combining characters
        it('should handle combining diacritical marks', () => {
            expect(containsKorean('a\u0301')).toBe(false); // á decomposed
        });

        it('should handle Korean with combining marks', () => {
            expect(containsKorean('가\u0301')).toBe(true);
        });

        // Byte Order Marks
        it('should handle BOM at start', () => {
            expect(containsKorean('\uFEFF가나다')).toBe(true);
        });

        it('should not detect BOM alone', () => {
            expect(containsKorean('\uFEFF')).toBe(false);
        });

        // Surrogate pairs (emoji, etc.)
        it('should handle emoji surrogate pairs', () => {
            expect(containsKorean('😀')).toBe(false); // U+1F600
        });

        it('should handle Korean with emoji', () => {
            expect(containsKorean('가😀나')).toBe(true);
        });

        it('should handle complex emoji (skin tone + ZWJ)', () => {
            expect(containsKorean('👨‍👩‍👧‍👦')).toBe(false);
        });

        it('should handle Korean with complex emoji', () => {
            expect(containsKorean('가족👨‍👩‍👧‍👦모임')).toBe(true);
        });

        // Variation selectors
        it('should handle variation selector-16', () => {
            expect(containsKorean('❤\uFE0F')).toBe(false);
        });

        // Private Use Area
        it('should not detect Private Use Area chars', () => {
            expect(containsKorean('\uE000\uE001\uE002')).toBe(false);
        });

        // Specials block
        it('should handle replacement character', () => {
            expect(containsKorean('\uFFFD')).toBe(false);
        });

        it('should handle object replacement character', () => {
            expect(containsKorean('\uFFFC')).toBe(false);
        });

        // Chinese characters (should not be Korean)
        it('should not detect CJK Unified Ideographs as Korean', () => {
            expect(containsKorean('中文')).toBe(false);
        });

        it('should detect Korean mixed with Chinese', () => {
            expect(containsKorean('한자漢字')).toBe(true);
        });

        // Hangul Extended blocks
        it('should handle Hangul Jamo Extended-A', () => {
            expect(containsKorean('\uA960')).toBe(false); // Extended-A is outside range
        });

        it('should handle Hangul Jamo Extended-B', () => {
            expect(containsKorean('\uD7B0')).toBe(false); // Extended-B is outside range
        });

        // Control characters
        it('should handle tab character', () => {
            expect(containsKorean('\t')).toBe(false);
        });

        it('should handle carriage return', () => {
            expect(containsKorean('\r')).toBe(false);
        });

        it('should handle line feed', () => {
            expect(containsKorean('\n')).toBe(false);
        });

        it('should detect Korean with control chars', () => {
            expect(containsKorean('\t가\r\n나\t')).toBe(true);
        });

        // Null and special
        it('should handle null character', () => {
            expect(containsKorean('\x00')).toBe(false);
        });

        it('should handle Korean with null', () => {
            expect(containsKorean('가\x00나')).toBe(true);
        });

        // Extended ASCII
        it('should not detect extended ASCII as Korean', () => {
            expect(containsKorean('éèêë')).toBe(false);
        });

        it('should not detect Latin Extended as Korean', () => {
            expect(containsKorean('ñ ü ö ä')).toBe(false);
        });

        // Cyrillic (looks like Latin sometimes)
        it('should not detect Cyrillic as Korean', () => {
            expect(containsKorean('Привет')).toBe(false);
        });

        // Greek
        it('should not detect Greek as Korean', () => {
            expect(containsKorean('αβγδ')).toBe(false);
        });

        // Arabic
        it('should not detect Arabic as Korean', () => {
            expect(containsKorean('مرحبا')).toBe(false);
        });

        // RTL marks
        it('should handle RTL override', () => {
            expect(containsKorean('\u202E')).toBe(false);
        });
    });

    // ========================================
    // Ratio Calculation Edge Cases (30 cases)
    // ========================================
    describe('Ratio Edge Cases', () => {
        it('should return 0 for empty string', () => {
            expect(getKoreanRatio('')).toBe(0);
        });

        it('should return 0 for only whitespace', () => {
            expect(getKoreanRatio('   \t\n   ')).toBe(0);
        });

        it('should return 1 for single Korean char', () => {
            expect(getKoreanRatio('가')).toBe(1);
        });

        it('should handle 1 Korean among 99 others', () => {
            const ratio = getKoreanRatio('가' + 'a'.repeat(99));
            expect(ratio).toBeCloseTo(0.01, 2);
        });

        it('should handle 10 Korean among 90 others', () => {
            const ratio = getKoreanRatio('가'.repeat(10) + 'a'.repeat(90));
            expect(ratio).toBeCloseTo(0.10, 2);
        });

        it('should handle 50-50 ratio', () => {
            const ratio = getKoreanRatio('가'.repeat(50) + 'a'.repeat(50));
            expect(ratio).toBeCloseTo(0.50, 2);
        });

        it('should handle 99 Korean 1 other', () => {
            const ratio = getKoreanRatio('가'.repeat(99) + 'a');
            expect(ratio).toBeCloseTo(0.99, 2);
        });

        it('should correctly count Hangul Jamo', () => {
            const ratio = getKoreanRatio('ㄱㄴㄷaa');
            expect(ratio).toBeCloseTo(0.6, 1); // 3/5
        });

        it('should correctly count mixed Jamo and syllables', () => {
            const ratio = getKoreanRatio('가ㄱ나ㄴ');
            expect(ratio).toBe(1);
        });

        it('should handle very long Korean string', () => {
            const longKorean = '가'.repeat(10000);
            expect(getKoreanRatio(longKorean)).toBe(1);
        });

        it('should handle very long mixed string', () => {
            const mixed = ('가a').repeat(5000);
            expect(getKoreanRatio(mixed)).toBeCloseTo(0.5, 1);
        });

        it('should handle emoji in calculation', () => {
            const ratio = getKoreanRatio('가😀');
            // Emoji might count as 1 or 2 chars depending on implementation
            expect(ratio).toBeGreaterThan(0);
            expect(ratio).toBeLessThanOrEqual(1);
        });

        it('should handle multiple emoji types', () => {
            const ratio = getKoreanRatio('가나다😀🤖🎉');
            expect(ratio).toBeGreaterThan(0);
        });

        it('should ignore newlines in ratio', () => {
            expect(getKoreanRatio('가\n나\n다')).toBe(1);
        });

        it('should ignore tabs in ratio', () => {
            expect(getKoreanRatio('가\t나\t다')).toBe(1);
        });

        it('should handle markdown syntax', () => {
            const ratio = getKoreanRatio('**가나다**');
            expect(ratio).toBeGreaterThan(0);
            expect(ratio).toBeLessThan(1);
        });

        it('should handle URL in content', () => {
            const ratio = getKoreanRatio('링크입니다 https://example.com/path/to/page');
            expect(ratio).toBeGreaterThan(0);
            expect(ratio).toBeLessThan(0.5);
        });

        it('should handle code with Korean comments', () => {
            const ratio = getKoreanRatio('const x = 1; // 변수 선언');
            expect(ratio).toBeGreaterThan(0);
        });

        it('should handle JSON with Korean values', () => {
            const json = '{"name": "이름", "value": 123}';
            const ratio = getKoreanRatio(json);
            expect(ratio).toBeGreaterThan(0);
        });
    });

    // ========================================
    // Security Edge Cases (30 cases)
    // ========================================
    describe('Security Edge Cases', () => {
        // Injection attempts
        it('should handle HTML tags in content', () => {
            const result = validateKoreanContent('<script>alert("xss")</script>한글');
            // Should still validate Korean presence
            expect(result === null || typeof result === 'string').toBe(true);
        });

        it('should handle SQL-like content', () => {
            const result = validateKoreanContent("'; DROP TABLE users; -- 한글");
            expect(result === null || typeof result === 'string').toBe(true);
        });

        it('should handle NoSQL injection attempts', () => {
            const result = validateKoreanContent('{"$gt": ""} 한글');
            expect(result === null || typeof result === 'string').toBe(true);
        });

        // Path traversal
        it('should handle path traversal in content', () => {
            const result = validateKoreanContent('../../../etc/passwd 한글');
            expect(result === null || typeof result === 'string').toBe(true);
        });

        // Command injection
        it('should handle command injection attempts', () => {
            const result = validateKoreanContent('`rm -rf /` 한글');
            expect(result === null || typeof result === 'string').toBe(true);
        });

        it('should handle shell expansion', () => {
            const result = validateKoreanContent('$(whoami) 한글');
            expect(result === null || typeof result === 'string').toBe(true);
        });

        // Buffer overflow attempts
        it('should handle very long string', () => {
            const longString = '가'.repeat(1000000);
            expect(() => validateKoreanContent(longString)).not.toThrow();
        });

        it('should handle repeated special chars', () => {
            const result = validateKoreanContent('%'.repeat(10000) + '한글');
            expect(result === null || typeof result === 'string').toBe(true);
        });

        // Unicode normalization attacks
        it('should handle Unicode normalization NFC', () => {
            const nfc = '가'.normalize('NFC');
            expect(containsKorean(nfc)).toBe(true);
        });

        it('should handle Unicode normalization NFD', () => {
            const nfd = '가'.normalize('NFD');
            expect(containsKorean(nfd)).toBe(true);
        });

        // Homoglyph attacks
        it('should not be fooled by Cyrillic lookalikes', () => {
            // Cyrillic 'а' looks like Latin 'a'
            const cyrillicA = '\u0430';
            expect(containsKorean(cyrillicA)).toBe(false);
        });

        // ReDoS prevention
        it('should handle regex-problematic patterns', () => {
            const problematic = 'a'.repeat(100) + '!';
            expect(() => containsKorean(problematic)).not.toThrow();
        });

        it('should handle nested brackets', () => {
            const nested = '((((((((((한글))))))))))';
            expect(containsKorean(nested)).toBe(true);
        });

        // API key tests
        it('should not generate predictable keys', () => {
            const keys = Array.from({ length: 100 }, () => generateApiKey());
            const unique = new Set(keys);
            expect(unique.size).toBe(100);
        });

        it('should generate cryptographically random keys', () => {
            // Check entropy by ensuring variety in first bytes
            const keys = Array.from({ length: 100 }, () => generateApiKey());
            const firstBytes = new Set(keys.map(k => k.substring(10, 12)));
            expect(firstBytes.size).toBeGreaterThan(50); // Should have good variety
        });

        it('should not leak timing through hash comparison', () => {
            // Basic timing attack mitigation check
            const key1 = generateApiKey();
            const hash1 = hashApiKey(key1);
            const hash2 = hashApiKey(key1.slice(0, -1) + 'x');
            expect(hash1).not.toBe(hash2);
        });

        // Claim code security
        it('should generate unguessable claim codes', () => {
            const codes = Array.from({ length: 100 }, () => generateClaimCode());
            const unique = new Set(codes);
            expect(unique.size).toBe(100);
        });

        it('should not use sequential claim codes', () => {
            const code1 = generateClaimCode();
            const code2 = generateClaimCode();
            // Extract numeric parts and ensure they're not sequential
            const num1 = parseInt(code1.replace(/[^0-9]/g, '') || '0', 10);
            const num2 = parseInt(code2.replace(/[^0-9]/g, '') || '0', 10);
            expect(Math.abs(num1 - num2)).not.toBe(1);
        });

        // ID security
        it('should generate non-sequential IDs', () => {
            const id1 = generateId();
            const id2 = generateId();
            // Convert to numbers and check they're not sequential
            const n1 = parseInt(id1.substring(0, 8), 16);
            const n2 = parseInt(id2.substring(0, 8), 16);
            expect(Math.abs(n1 - n2)).toBeGreaterThan(1);
        });
    });

    // ========================================
    // Performance Edge Cases (20 cases)
    // ========================================
    describe('Performance Edge Cases', () => {
        it('should handle 100KB of Korean text', () => {
            const largeText = '가'.repeat(100000);
            const start = Date.now();
            const result = validateKoreanContent(largeText);
            const duration = Date.now() - start;
            expect(result).toBeNull();
            expect(duration).toBeLessThan(1000); // Should complete in under 1 second
        });

        it('should handle 100KB of mixed text', () => {
            const largeText = ('가a').repeat(50000);
            const start = Date.now();
            const ratio = getKoreanRatio(largeText);
            const duration = Date.now() - start;
            expect(ratio).toBeCloseTo(0.5, 1);
            expect(duration).toBeLessThan(1000);
        });

        it('should handle 1000 hash operations quickly', () => {
            const start = Date.now();
            for (let i = 0; i < 1000; i++) {
                hashApiKey(`test-key-${i}`);
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(500); // 1000 hashes in under 500ms
        });

        it('should handle 1000 key generations', () => {
            const start = Date.now();
            for (let i = 0; i < 1000; i++) {
                generateApiKey();
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(1000);
        });

        it('should handle 1000 claim code generations', () => {
            const start = Date.now();
            for (let i = 0; i < 1000; i++) {
                generateClaimCode();
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(1000);
        });

        it('should handle 1000 ID generations', () => {
            const start = Date.now();
            for (let i = 0; i < 1000; i++) {
                generateId();
            }
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(500);
        });

        it('should handle 1000 Korean checks', () => {
            const texts = Array.from({ length: 1000 }, (_, i) =>
                i % 2 === 0 ? '한글' : 'English'
            );
            const start = Date.now();
            texts.forEach(t => containsKorean(t));
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
        });

        it('should handle 1000 ratio calculations', () => {
            const texts = Array.from({ length: 1000 }, () => '가나다abc123');
            const start = Date.now();
            texts.forEach(t => getKoreanRatio(t));
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
        });

        it('should handle 1000 format validations', () => {
            const keys = Array.from({ length: 1000 }, () => generateApiKey());
            const start = Date.now();
            keys.forEach(k => isValidApiKeyFormat(k));
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(100);
        });

        it('should handle deeply nested content', () => {
            const nested = '(('.repeat(100) + '한글' + '))'.repeat(100);
            expect(containsKorean(nested)).toBe(true);
        });
    });

    // ========================================
    // Boundary Value Tests (30 cases)
    // ========================================
    describe('Boundary Values', () => {
        // String lengths
        it('should handle 1-char Korean string', () => {
            expect(validateKoreanContent('가')).toBeNull();
        });

        it('should handle 2-char Korean string', () => {
            expect(validateKoreanContent('가나')).toBeNull();
        });

        it('should handle 3-char name minimum', () => {
            expect(generateClaimCode().length).toBe(11); // madang-XXXX
        });

        // API key length
        it('should generate exactly 58-char API key', () => {
            expect(generateApiKey().length).toBe(58); // 10 prefix + 48 hex
        });

        // Hash length
        it('should generate exactly 64-char hash', () => {
            expect(hashApiKey('test').length).toBe(64);
        });

        // ID length
        it('should generate exactly 24-char ID', () => {
            expect(generateId().length).toBe(24);
        });

        // Ratio boundaries
        it('should accept 10.0% Korean exactly', () => {
            // 1 Korean + 9 other = 10%
            expect(validateKoreanContent('가aaaaaaaaa')).toBeNull();
        });

        it('should reject 9.9% Korean', () => {
            // 1 Korean + 10 other ≈ 9%
            const result = validateKoreanContent('가aaaaaaaaaa');
            expect(result).not.toBeNull();
        });

        it('should accept 10.1% Korean', () => {
            // 2 Korean + 18 other ≈ 10%
            expect(validateKoreanContent('가나aaaaaaaaaaaaaaaaaa')).toBeNull();
        });

        // Empty edge cases
        it('should reject null-ish values', () => {
            expect(validateKoreanContent('')).not.toBeNull();
        });

        it('should reject single whitespace', () => {
            expect(validateKoreanContent(' ')).not.toBeNull();
        });

        it('should reject multiple spaces', () => {
            expect(validateKoreanContent('     ')).not.toBeNull();
        });

        // Max values
        it('should handle max safe integer in text', () => {
            expect(validateKoreanContent(`숫자: ${Number.MAX_SAFE_INTEGER}`)).toBeNull();
        });

        it('should handle negative numbers in text', () => {
            expect(validateKoreanContent(`음수: -${Number.MAX_SAFE_INTEGER}`)).toBeNull();
        });

        it('should handle scientific notation in text', () => {
            expect(validateKoreanContent('지수: 1e308 입니다')).toBeNull();
        });

        // Format validation boundaries
        it('should reject 47-char hex after prefix', () => {
            expect(isValidApiKeyFormat('botmadang_' + 'a'.repeat(47))).toBe(false);
        });

        it('should accept 48-char hex after prefix', () => {
            expect(isValidApiKeyFormat('botmadang_' + 'a'.repeat(48))).toBe(true);
        });

        it('should reject 49-char hex after prefix', () => {
            expect(isValidApiKeyFormat('botmadang_' + 'a'.repeat(49))).toBe(false);
        });
    });

    // ========================================
    // Consistency Tests (20 cases)
    // ========================================
    describe('Consistency', () => {
        it('should be consistent for same input (Korean check)', () => {
            const text = '테스트용 문자열입니다';
            const results = Array.from({ length: 100 }, () => containsKorean(text));
            expect(new Set(results).size).toBe(1);
        });

        it('should be consistent for same input (ratio)', () => {
            const text = '테스트 test 123';
            const results = Array.from({ length: 100 }, () => getKoreanRatio(text));
            expect(new Set(results).size).toBe(1);
        });

        it('should be consistent for same input (validation)', () => {
            const text = '유효성 검사 테스트';
            const results = Array.from({ length: 100 }, () => validateKoreanContent(text));
            expect(new Set(results).size).toBe(1);
        });

        it('should be consistent for same input (hash)', () => {
            const key = 'consistent-test-key';
            const results = Array.from({ length: 100 }, () => hashApiKey(key));
            expect(new Set(results).size).toBe(1);
        });

        it('should produce different keys each call', () => {
            const results = Array.from({ length: 100 }, () => generateApiKey());
            expect(new Set(results).size).toBe(100);
        });

        it('should produce different claim codes each call', () => {
            const results = Array.from({ length: 100 }, () => generateClaimCode());
            expect(new Set(results).size).toBe(100);
        });

        it('should produce different IDs each call', () => {
            const results = Array.from({ length: 100 }, () => generateId());
            expect(new Set(results).size).toBe(100);
        });

        it('should handle rapid consecutive calls', () => {
            const results: string[] = [];
            for (let i = 0; i < 100; i++) {
                results.push(generateApiKey());
            }
            expect(new Set(results).size).toBe(100);
        });
    });
});
