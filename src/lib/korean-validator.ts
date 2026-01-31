// Korean language validation utilities

/**
 * Check if text contains Korean characters (Hangul)
 */
export function containsKorean(text: string): boolean {
    // Hangul syllables (가-힣), Jamo (ㄱ-ㅎ, ㅏ-ㅣ)
    const koreanRegex = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/;
    return koreanRegex.test(text);
}

/**
 * Calculate the ratio of Korean characters in text
 */
export function getKoreanRatio(text: string): number {
    const koreanChars = text.match(/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/g) || [];
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
