/**
 * Korean keyword extraction utility
 * Extracts and counts keywords from Korean text
 */

// Common Korean stopwords to filter out
const STOPWORDS = new Set([
    // 조사 (Particles)
    '은', '는', '이', '가', '을', '를', '의', '에', '에서', '로', '으로', '와', '과', '도', '만', '까지',
    '에게', '한테', '께', '부터', '처럼', '같이', '보다', '마다', '대로', '밖에', '뿐', '따라',
    // 접속사 (Conjunctions)
    '그리고', '하지만', '그러나', '그래서', '그러면', '또는', '혹은', '및', '더불어', '또한', '게다가',
    // 대명사 (Pronouns)
    '나', '너', '우리', '저', '저희', '제', '제가', '저는', '나는', '내가',
    '이것', '그것', '저것', '여기', '거기', '저기', '이런', '그런', '저런',
    '무엇', '어디', '언제', '누구', '어떤', '어떻게', '왜',
    // 일반 동사/형용사 어간 (Common verb/adjective stems)
    '있다', '없다', '하다', '되다', '이다', '아니다', '같다', '다르다',
    '있는', '없는', '하는', '되는', '있습니다', '없습니다', '합니다', '됩니다',
    '있어요', '없어요', '해요', '돼요', '있었', '없었', '했다', '됐다',
    '보다', '가다', '오다', '알다', '모르다', '주다', '받다', '만들다',
    // 수식어 (Modifiers)
    '것', '수', '등', '더', '매우', '아주', '정말', '진짜', '너무', '많이', '조금', '가장', '모든',
    '새로운', '다른', '같은', '어떤', '이런', '그런', '좋은', '나쁜', '큰', '작은', '많은', '적은',
    // 보조 표현 (Auxiliary expressions)
    '위해', '대한', '통해', '따라', '관련', '대해', '위', '아래', '앞', '뒤', '안', '밖',
    '경우', '때문', '이후', '이전', '동안', '사이', '중', '내',
    // 일반적인 서술어 (Common predicates)
    '생각', '감사', '부탁', '안녕', '반갑', '죄송', '미안',
    // 흔한 문장 시작/끝 (Common sentence starters/enders)
    '글을', '것을', '수도', '거나', '지만', '에요', '이에요', '예요',
]);

// Minimum word length
const MIN_WORD_LENGTH = 2;

// Maximum words to return
const MAX_KEYWORDS = 20;

export interface KeywordCount {
    keyword: string;
    count: number;
}

/**
 * Extract Korean words from text
 */
function extractKoreanWords(text: string): string[] {
    // Match Korean characters (Hangul) sequences of 2+ characters
    const regex = /[가-힣]{2,}/g;
    const matches = text.match(regex) || [];
    return matches.filter(word =>
        word.length >= MIN_WORD_LENGTH && !STOPWORDS.has(word)
    );
}

/**
 * Extract and count keywords from multiple texts
 */
export function extractKeywords(texts: string[]): KeywordCount[] {
    const wordCounts = new Map<string, number>();

    for (const text of texts) {
        if (!text) continue;

        const words = extractKoreanWords(text);
        for (const word of words) {
            wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
        }
    }

    // Convert to array and sort by count
    const sorted = Array.from(wordCounts.entries())
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, MAX_KEYWORDS);

    return sorted;
}

/**
 * Get top N keywords from texts
 */
export function getTopKeywords(texts: string[], limit: number = 10): KeywordCount[] {
    return extractKeywords(texts).slice(0, limit);
}
