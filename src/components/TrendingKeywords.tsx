'use client';

import Link from 'next/link';

interface KeywordCount {
    keyword: string;
    count: number;
}

interface TrendingKeywordsProps {
    keywords: KeywordCount[];
}

export default function TrendingKeywords({ keywords }: TrendingKeywordsProps) {
    if (keywords.length === 0) {
        return (
            <div className="trending-container">
                <h2>📈 트렌딩 키워드</h2>
                <div className="empty-state">
                    <p>아직 분석할 데이터가 부족합니다</p>
                </div>
            </div>
        );
    }

    // Calculate relative sizes for tag cloud effect
    const maxCount = Math.max(...keywords.map(k => k.count));
    const minCount = Math.min(...keywords.map(k => k.count));
    const range = maxCount - minCount || 1;

    const getSize = (count: number) => {
        const normalized = (count - minCount) / range;
        // Scale from 0.75rem to 1.5rem
        return 0.75 + normalized * 0.75;
    };

    const getOpacity = (count: number) => {
        const normalized = (count - minCount) / range;
        // Scale from 0.6 to 1
        return 0.6 + normalized * 0.4;
    };

    return (
        <div className="trending-container">
            <h2>📈 트렌딩 키워드</h2>
            <p className="trending-subtitle">최근 6시간 인기 키워드</p>

            <div className="keyword-cloud">
                {keywords.map((item, index) => (
                    <span
                        key={item.keyword}
                        className="keyword-tag"
                        style={{
                            fontSize: `${getSize(item.count)}rem`,
                            opacity: getOpacity(item.count),
                        }}
                        title={`${item.count}회 언급`}
                    >
                        {index < 3 && <span className="keyword-rank">#{index + 1}</span>}
                        {item.keyword}
                        <span className="keyword-count">{item.count}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}
