import {
    containsKorean,
    getKoreanRatio,
    hasMinimumKoreanRatio,
    validateKoreanContent,
} from '../korean-validator';

describe('Korean Validator - Extended Tests', () => {
    // ========================================
    // containsKorean Tests (30 cases)
    // ========================================
    describe('containsKorean', () => {
        // Basic Korean syllables (가-힣)
        it('should detect single Korean syllable', () => {
            expect(containsKorean('가')).toBe(true);
        });

        it('should detect Korean word', () => {
            expect(containsKorean('안녕하세요')).toBe(true);
        });

        it('should detect Korean sentence', () => {
            expect(containsKorean('오늘 날씨가 좋습니다.')).toBe(true);
        });

        // Korean Jamo (ㄱ-ㅎ)
        it('should detect Korean consonant jamo ㄱ', () => {
            expect(containsKorean('ㄱ')).toBe(true);
        });

        it('should detect Korean consonant jamo ㅎ', () => {
            expect(containsKorean('ㅎ')).toBe(true);
        });

        it('should detect Korean initial consonant ㄲ', () => {
            expect(containsKorean('ㄲ')).toBe(true);
        });

        // Korean vowels (ㅏ-ㅣ)
        it('should detect Korean vowel jamo ㅏ', () => {
            expect(containsKorean('ㅏ')).toBe(true);
        });

        it('should detect Korean vowel jamo ㅣ', () => {
            expect(containsKorean('ㅣ')).toBe(true);
        });

        it('should detect combined vowel ㅘ', () => {
            expect(containsKorean('ㅘ')).toBe(true);
        });

        // Mixed content
        it('should detect Korean in mixed content with English', () => {
            expect(containsKorean('Hello 안녕 World')).toBe(true);
        });

        it('should detect Korean in mixed content with numbers', () => {
            expect(containsKorean('123 테스트 456')).toBe(true);
        });

        it('should detect Korean with special characters', () => {
            expect(containsKorean('!@# 한글 $%^')).toBe(true);
        });

        it('should detect Korean with emojis', () => {
            expect(containsKorean('😀 안녕 🎉')).toBe(true);
        });

        // Non-Korean content
        it('should return false for pure English', () => {
            expect(containsKorean('Hello World')).toBe(false);
        });

        it('should return false for numbers only', () => {
            expect(containsKorean('123456789')).toBe(false);
        });

        it('should return false for special characters only', () => {
            expect(containsKorean('!@#$%^&*()')).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(containsKorean('')).toBe(false);
        });

        it('should return false for whitespace only', () => {
            expect(containsKorean('   \t\n  ')).toBe(false);
        });

        it('should return false for emojis only', () => {
            expect(containsKorean('😀🎉🔥💯')).toBe(false);
        });

        // Other Asian scripts
        it('should return false for Japanese hiragana', () => {
            expect(containsKorean('こんにちは')).toBe(false);
        });

        it('should return false for Japanese katakana', () => {
            expect(containsKorean('コンニチハ')).toBe(false);
        });

        it('should return false for Chinese characters', () => {
            expect(containsKorean('你好世界')).toBe(false);
        });

        // Edge cases
        it('should detect Korean at very end', () => {
            expect(containsKorean('test 가')).toBe(true);
        });

        it('should detect Korean at very start', () => {
            expect(containsKorean('가 test')).toBe(true);
        });

        it('should handle very long string with Korean', () => {
            expect(containsKorean('a'.repeat(10000) + '가')).toBe(true);
        });

        it('should return false for very long string without Korean', () => {
            expect(containsKorean('a'.repeat(10000))).toBe(false);
        });

        it('should handle null bytes', () => {
            expect(containsKorean('test\x00가')).toBe(true);
        });

        it('should handle URL-encoded Korean look', () => {
            // This is percent-encoded, not real Korean chars
            expect(containsKorean('%ED%95%9C%EA%B8%80')).toBe(false);
        });

        it('should detect Korean in markdown', () => {
            expect(containsKorean('**볼드** 텍스트')).toBe(true);
        });

        it('should detect Korean in code blocks', () => {
            expect(containsKorean('```\n한글코드\n```')).toBe(true);
        });
    });

    // ========================================
    // getKoreanRatio Tests (25 cases)
    // ========================================
    describe('getKoreanRatio', () => {
        it('should return 1 for 100% Korean', () => {
            expect(getKoreanRatio('한글만있음')).toBe(1);
        });

        it('should return 0 for 0% Korean', () => {
            expect(getKoreanRatio('English only')).toBe(0);
        });

        it('should return 0 for empty string', () => {
            expect(getKoreanRatio('')).toBe(0);
        });

        it('should return 0 for whitespace only', () => {
            expect(getKoreanRatio('   ')).toBe(0);
        });

        it('should return 0.5 for 50% Korean', () => {
            const ratio = getKoreanRatio('가나ab'); // 2 Korean, 2 English
            expect(ratio).toBeCloseTo(0.5, 1);
        });

        it('should return approximately 0.25 for 25% Korean', () => {
            const ratio = getKoreanRatio('가abc'); // 1 Korean, 3 English
            expect(ratio).toBeCloseTo(0.25, 1);
        });

        it('should return approximately 0.75 for 75% Korean', () => {
            const ratio = getKoreanRatio('가나다a'); // 3 Korean, 1 English
            expect(ratio).toBeCloseTo(0.75, 1);
        });

        it('should ignore whitespace in calculation', () => {
            // '가 나 다' = 3 Korean chars, spaces ignored
            const ratio = getKoreanRatio('가 나 다');
            expect(ratio).toBe(1);
        });

        it('should count Jamo as Korean', () => {
            const ratio = getKoreanRatio('ㄱㄴㄷ');
            expect(ratio).toBe(1);
        });

        it('should not count numbers as denominator reduction', () => {
            const ratio = getKoreanRatio('가123'); // 1 Korean, 3 numbers = 4 total
            expect(ratio).toBeCloseTo(0.25, 1);
        });

        it('should handle special characters', () => {
            const ratio = getKoreanRatio('가!@#'); // 1 Korean, 3 special = 4 total
            expect(ratio).toBeCloseTo(0.25, 1);
        });

        it('should handle emojis correctly', () => {
            const ratio = getKoreanRatio('가😀'); // 1 Korean, 1 emoji (may count as 1-2 chars)
            expect(ratio).toBeGreaterThan(0);
            expect(ratio).toBeLessThanOrEqual(1);
        });

        it('should handle mixed Korean Jamo and syllables', () => {
            const ratio = getKoreanRatio('가ㄱ'); // 2 Korean chars
            expect(ratio).toBe(1);
        });

        it('should return consistent results for same input', () => {
            const text = '테스트 test 123';
            const ratio1 = getKoreanRatio(text);
            const ratio2 = getKoreanRatio(text);
            expect(ratio1).toBe(ratio2);
        });

        it('should handle very long Korean text', () => {
            const longKorean = '한'.repeat(1000);
            expect(getKoreanRatio(longKorean)).toBe(1);
        });

        it('should handle very long mixed text', () => {
            const text = ('한a').repeat(500); // 50% Korean
            expect(getKoreanRatio(text)).toBeCloseTo(0.5, 1);
        });

        it('should handle markdown syntax', () => {
            const ratio = getKoreanRatio('**굵게**'); // 2 Korean chars, 4 asterisks = 6 total -> 2/6 ≈ 0.33
            expect(ratio).toBeCloseTo(0.33, 1);
        });

        it('should handle URLs (no Korean)', () => {
            const ratio = getKoreanRatio('https://example.com');
            expect(ratio).toBe(0);
        });

        it('should handle URLs with Korean path', () => {
            const ratio = getKoreanRatio('https://example.com/한글');
            expect(ratio).toBeGreaterThan(0);
        });

        it('should handle code with Korean comments', () => {
            const code = 'const x = 1; // 설명';
            const ratio = getKoreanRatio(code);
            expect(ratio).toBeGreaterThan(0);
            expect(ratio).toBeLessThan(0.5);
        });

        it('should return value between 0 and 1', () => {
            const testCases = [
                'test', '한글', 'mixed 혼합', '123', '!@#', '가나다abc123!@#'
            ];
            for (const text of testCases) {
                const ratio = getKoreanRatio(text);
                expect(ratio).toBeGreaterThanOrEqual(0);
                expect(ratio).toBeLessThanOrEqual(1);
            }
        });

        it('should handle newlines and tabs', () => {
            const ratio = getKoreanRatio('가\n나\t다'); // 3 Korean, whitespace ignored
            expect(ratio).toBe(1);
        });

        it('should handle Korean with parentheses', () => {
            const ratio = getKoreanRatio('(한글)'); // 2 Korean, 2 parens
            expect(ratio).toBeCloseTo(0.5, 1);
        });

        it('should handle programming keywords with Korean', () => {
            const ratio = getKoreanRatio('function 함수() {}');
            expect(ratio).toBeGreaterThan(0);
        });
    });

    // ========================================
    // hasMinimumKoreanRatio Tests (15 cases)
    // ========================================
    describe('hasMinimumKoreanRatio', () => {
        it('should pass for 100% Korean with 10% minimum', () => {
            expect(hasMinimumKoreanRatio('한글만', 0.1)).toBe(true);
        });

        it('should fail for 0% Korean with 10% minimum', () => {
            expect(hasMinimumKoreanRatio('English only', 0.1)).toBe(false);
        });

        it('should pass for exactly 10% with 10% minimum', () => {
            // 1 Korean + 9 English = 10%
            expect(hasMinimumKoreanRatio('가abcdefghi', 0.1)).toBe(true);
        });

        it('should fail for 9% with 10% minimum', () => {
            // 1 Korean + 10 English = 9.09%
            expect(hasMinimumKoreanRatio('가abcdefghij', 0.1)).toBe(false);
        });

        it('should use default 20% minimum', () => {
            // 2 Korean + 8 English = 20%
            expect(hasMinimumKoreanRatio('가나abcdefgh')).toBe(true);
            // 1 Korean + 9 English = 10% (below 20%)
            expect(hasMinimumKoreanRatio('가abcdefghi')).toBe(false);
        });

        it('should pass for edge case at boundary', () => {
            // Exactly at 20%
            expect(hasMinimumKoreanRatio('가나abcdefgh', 0.2)).toBe(true);
        });

        it('should fail just below boundary', () => {
            // 1 Korean + 5 English = 16.6% (below 20%)
            expect(hasMinimumKoreanRatio('가abcde', 0.2)).toBe(false);
        });

        it('should handle 0% minimum (always pass if has any char)', () => {
            expect(hasMinimumKoreanRatio('test', 0)).toBe(true);
        });

        it('should handle 100% minimum', () => {
            expect(hasMinimumKoreanRatio('한글만', 1)).toBe(true);
            expect(hasMinimumKoreanRatio('한글 test', 1)).toBe(false);
        });

        it('should handle empty string', () => {
            expect(hasMinimumKoreanRatio('', 0.1)).toBe(false);
        });

        it('should handle whitespace only', () => {
            expect(hasMinimumKoreanRatio('   ', 0.1)).toBe(false);
        });

        it('should ignore whitespace in ratio calculation', () => {
            // 3 Korean chars, 3 spaces ignored
            expect(hasMinimumKoreanRatio('가 나 다', 1)).toBe(true);
        });

        it('should handle very small minimum', () => {
            expect(hasMinimumKoreanRatio('가' + 'a'.repeat(99), 0.01)).toBe(true);
        });

        it('should handle floating point precision', () => {
            expect(hasMinimumKoreanRatio('가나다abcdefg', 0.3)).toBe(true); // 3/10 = 0.3
        });

        it('should compare correctly with different ratios', () => {
            const text = '가나abc'; // 2/5 = 0.4
            expect(hasMinimumKoreanRatio(text, 0.39)).toBe(true);
            expect(hasMinimumKoreanRatio(text, 0.4)).toBe(true);
            expect(hasMinimumKoreanRatio(text, 0.41)).toBe(false);
        });
    });

    // ========================================
    // validateKoreanContent Tests (50 cases)
    // ========================================
    describe('validateKoreanContent', () => {
        // Valid content
        it('should return null for valid Korean content', () => {
            expect(validateKoreanContent('안녕하세요! 반갑습니다.')).toBeNull();
        });

        it('should return null for Korean with some English', () => {
            expect(validateKoreanContent('Hello 안녕하세요!')).toBeNull();
        });

        it('should return null for Korean with code', () => {
            expect(validateKoreanContent('const x = 1; // 변수 선언입니다')).toBeNull();
        });

        it('should return null for Korean with URLs', () => {
            expect(validateKoreanContent('링크입니다: https://example.com 확인해보세요')).toBeNull();
        });

        it('should return null for Korean with emojis', () => {
            expect(validateKoreanContent('좋아요! 😀🎉 정말 좋습니다!')).toBeNull();
        });

        it('should return null for Korean markdown', () => {
            expect(validateKoreanContent('**제목입니다**\n\n본문 내용이에요.')).toBeNull();
        });

        it('should return null for Korean with numbers', () => {
            expect(validateKoreanContent('2024년 1월 1일 새해입니다!')).toBeNull();
        });

        // Invalid content - no Korean
        it('should return error for English only', () => {
            const result = validateKoreanContent('This is English only.');
            expect(result).not.toBeNull();
            expect(result).toContain('한국어');
        });

        it('should return error for numbers only', () => {
            const result = validateKoreanContent('123456789');
            expect(result).not.toBeNull();
        });

        it('should return error for special characters only', () => {
            const result = validateKoreanContent('!@#$%^&*()');
            expect(result).not.toBeNull();
        });

        it('should return error for emojis only', () => {
            const result = validateKoreanContent('😀🎉🔥💯');
            expect(result).not.toBeNull();
        });

        it('should return error for URL only', () => {
            const result = validateKoreanContent('https://example.com');
            expect(result).not.toBeNull();
        });

        it('should return error for code only', () => {
            const result = validateKoreanContent('const x = 1; // comment');
            expect(result).not.toBeNull();
        });

        // Invalid content - empty/whitespace
        it('should return error for empty string', () => {
            const result = validateKoreanContent('');
            expect(result).not.toBeNull();
            expect(result).toContain('입력');
        });

        it('should return error for whitespace only', () => {
            const result = validateKoreanContent('   \t\n  ');
            expect(result).not.toBeNull();
        });

        it('should return error for single space', () => {
            const result = validateKoreanContent(' ');
            expect(result).not.toBeNull();
        });

        // Ratio tests (minimum 10%)
        it('should return null for exactly 10% Korean', () => {
            // 2 Korean + 18 other = 10%
            expect(validateKoreanContent('가나abcdefghijklmnop')).toBeNull();
        });

        it('should return error for below 10% Korean', () => {
            // 1 Korean + 20 other = 4.7%
            const result = validateKoreanContent('가abcdefghijklmnopqrst');
            expect(result).not.toBeNull();
            expect(result).toContain('비율');
        });

        it('should return null for just above 10%', () => {
            // 3 Korean + 17 other = 15%
            expect(validateKoreanContent('가나다abcdefghijklmnop')).toBeNull();
        });

        // Edge cases
        it('should return null for single Korean character', () => {
            expect(validateKoreanContent('가')).toBeNull();
        });

        it('should return null for Korean Jamo only', () => {
            expect(validateKoreanContent('ㄱㄴㄷ')).toBeNull();
        });

        it('should return null for very long Korean content', () => {
            expect(validateKoreanContent('가'.repeat(10000))).toBeNull();
        });

        it('should handle mixed Jamo and syllables', () => {
            expect(validateKoreanContent('가나다ㄱㄴㄷ')).toBeNull();
        });

        // Real-world content examples
        it('should return null for blog post style content', () => {
            const content = `
# 오늘의 블로그 포스트

안녕하세요! 오늘은 **JavaScript**에 대해 이야기해볼게요.

\`\`\`javascript
const greeting = "안녕하세요!";
console.log(greeting);
\`\`\`

질문 있으시면 댓글 남겨주세요! 😊
            `;
            expect(validateKoreanContent(content)).toBeNull();
        });

        it('should return null for technical documentation', () => {
            const content = `
## API 사용법

\`POST /api/v1/posts\` 엔드포인트를 사용하세요.

요청 예시:
\`\`\`json
{"title": "제목", "content": "내용"}
\`\`\`
            `;
            expect(validateKoreanContent(content)).toBeNull();
        });

        it('should return null for casual chat', () => {
            expect(validateKoreanContent('ㅋㅋㅋ 진짜???')).toBeNull();
        });

        it('should return null for exclamation with Korean', () => {
            expect(validateKoreanContent('와!!! 대박!!!')).toBeNull();
        });

        // Error message content
        it('should include Korean instruction in error message', () => {
            const result = validateKoreanContent('English only');
            expect(result).toContain('한국어');
        });

        it('should mention ratio in low ratio error', () => {
            const result = validateKoreanContent('가' + 'a'.repeat(30));
            expect(result).toContain('비율');
        });

        it('should mention input in empty error', () => {
            const result = validateKoreanContent('');
            expect(result).toContain('입력');
        });

        // Unicode edge cases
        it('should handle zero-width characters', () => {
            const result = validateKoreanContent('\u200B\u200C\u200D');
            expect(result).not.toBeNull();
        });

        it('should handle combining characters', () => {
            expect(validateKoreanContent('가\u0301나다')).toBeNull();
        });

        it('should handle right-to-left marks', () => {
            expect(validateKoreanContent('\u200F한글\u200E')).toBeNull();
        });

        it('should handle Korean with Arabic', () => {
            expect(validateKoreanContent('مرحبا 안녕하세요')).toBeNull();
        });

        it('should handle Korean with Russian', () => {
            expect(validateKoreanContent('Привет 안녕하세요')).toBeNull();
        });

        // Social media style
        it('should return null for hashtags with Korean', () => {
            expect(validateKoreanContent('#프로그래밍 #개발 #한글태그')).toBeNull();
        });

        it('should return null for mentions with Korean', () => {
            expect(validateKoreanContent('@user님 안녕하세요!')).toBeNull();
        });

        it('should return null for Korean internet slang', () => {
            expect(validateKoreanContent('ㅇㅇ ㄱㅅ ㅎㅎ')).toBeNull();
        });

        // Punctuation heavy
        it('should handle Korean with heavy punctuation', () => {
            const content = '와!!!!!!!!! 대박!!!!!!!';
            expect(validateKoreanContent(content)).toBeNull();
        });

        it('should fail for punctuation only', () => {
            expect(validateKoreanContent('!!!!!!????......')).not.toBeNull();
        });

        // Mathematical content
        it('should return null for Korean math explanation', () => {
            expect(validateKoreanContent('1 + 1 = 2 입니다. 계산해보세요!')).toBeNull();
        });

        it('should fail for pure math', () => {
            expect(validateKoreanContent('1 + 1 = 2')).not.toBeNull();
        });

        // Repetitive content
        it('should handle repetitive Korean', () => {
            expect(validateKoreanContent('가가가가가가')).toBeNull();
        });

        it('should fail for repetitive English', () => {
            expect(validateKoreanContent('aaaaaaaaaa')).not.toBeNull();
        });

        // Boundary testing
        it('should handle content at ratio boundary precisely', () => {
            // Test at exactly 9.9% - should fail
            // Test at exactly 10.1% - should pass
            const baseEnglish = 'a'.repeat(89);
            expect(validateKoreanContent('가가가가가가가가가가' + baseEnglish)).toBeNull(); // 10/99 ≈ 10.1%
        });

        it('should handle Japanese lookalike (katakana)', () => {
            // Japanese katakana looks similar but is not Korean
            expect(validateKoreanContent('カタカナ')).not.toBeNull();
        });

        it('should handle Chinese lookalike', () => {
            // Chinese characters are not Korean
            expect(validateKoreanContent('中文字')).not.toBeNull();
        });

        it('should return null for mixed CJK with Korean majority', () => {
            expect(validateKoreanContent('한글입니다 中 あ')).toBeNull();
        });
    });
});
