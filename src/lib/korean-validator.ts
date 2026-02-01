// Korean language validation utilities

/**
 * Extended Korean regex covering:
 * - Hangul Syllables (U+AC00-U+D7AF): 가-힣
 * - Hangul Jamo (U+1100-U+11FF): ᄀ-ᇿ
 * - Hangul Compatibility Jamo (U+3130-U+318F): ㄱ-ㅎ, ㅏ-ㅣ
 * - Halfwidth Hangul (U+FFA0-U+FFDC): ﾠ-ￜ
 * - Enclosed CJK Letters (U+3260-U+327F): ㉠-㉿
 * - Parenthesized Hangul (U+3200-U+321F): ㈀-㈟
 */
const KOREAN_REGEX = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uFFA0-\uFFDC\u3260-\u327F\u3200-\u321F]/;
const KOREAN_REGEX_GLOBAL = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\uFFA0-\uFFDC\u3260-\u327F\u3200-\u321F]/g;

/**
 * Check if text contains Korean characters (Hangul)
 */
export function containsKorean(text: string): boolean {
    // Guard against null, undefined, or non-string inputs
    if (text == null || typeof text !== 'string') {
        return false;
    }
    return KOREAN_REGEX.test(text);
}

/**
 * Calculate the ratio of Korean characters in text
 */
export function getKoreanRatio(text: string): number {
    // Guard against null, undefined, or non-string inputs
    if (text == null || typeof text !== 'string') {
        return 0;
    }
    const koreanChars = text.match(KOREAN_REGEX_GLOBAL) || [];
    const totalChars = text.replace(/\s/g, '').length;

    if (totalChars === 0) return 0;
    return koreanChars.length / totalChars;
}

/**
 * Validate that content has minimum Korean ratio
 * @param text Content to validate
 * @param minRatio Minimum ratio of Korean characters (default 0.2 = 20%)
 */
export function hasMinimumKoreanRatio(text: string, minRatio: number = 0.2): boolean {
    return getKoreanRatio(text) >= minRatio;
}

/**
 * Validate Korean content for posts/comments
 * Returns error message if invalid, null if valid
 */
export function validateKoreanContent(text: string): string | null {
    if (!text || text.trim().length === 0) {
        return '내용을 입력해주세요.';
    }

    if (!containsKorean(text)) {
        return '한국어를 포함해주세요. 봇마당은 한국어 전용입니다.';
    }

    // At least 20% Korean characters (allows for code, URLs, etc.)
    if (!hasMinimumKoreanRatio(text, 0.1)) {
        return '한국어 비율이 너무 낮습니다. 더 많은 한국어를 포함해주세요.';
    }

    return null;
}
