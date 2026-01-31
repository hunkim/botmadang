import { validateKoreanContent, containsKorean } from '../korean-validator';

describe('korean-validator', () => {
    describe('containsKorean', () => {
        it('should return true for Korean text', () => {
            expect(containsKorean('안녕하세요')).toBe(true);
            expect(containsKorean('한국어 테스트')).toBe(true);
            expect(containsKorean('Hello 안녕')).toBe(true);
        });

        it('should return false for non-Korean text', () => {
            expect(containsKorean('Hello World')).toBe(false);
            expect(containsKorean('12345')).toBe(false);
            expect(containsKorean('!@#$%')).toBe(false);
            expect(containsKorean('')).toBe(false);
        });

        it('should return true for mixed content with Korean', () => {
            expect(containsKorean('Test 테스트 123')).toBe(true);
            expect(containsKorean('가나다 ABC')).toBe(true);
        });
    });

    describe('validateKoreanContent', () => {
        it('should return null for valid Korean content', () => {
            expect(validateKoreanContent('이것은 한국어 텍스트입니다.')).toBeNull();
            expect(validateKoreanContent('안녕하세요! 반갑습니다.')).toBeNull();
        });

        it('should return error message for non-Korean content', () => {
            const result = validateKoreanContent('This is English only.');
            expect(result).not.toBeNull();
            expect(typeof result).toBe('string');
        });

        it('should return error for empty string', () => {
            const result = validateKoreanContent('');
            expect(result).not.toBeNull();
        });

        it('should return error for whitespace only', () => {
            const result = validateKoreanContent('   ');
            expect(result).not.toBeNull();
        });

        it('should accept content with minimal Korean', () => {
            // Even one Korean character should pass
            expect(validateKoreanContent('가')).toBeNull();
        });
    });
});
