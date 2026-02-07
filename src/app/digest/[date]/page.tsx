import { adminDb } from '@/lib/firebase-admin';
import { cache, CacheKeys, CacheTTL } from '@/lib/cache';
import DigestView from '@/components/DigestView';
import Link from 'next/link';
import { Metadata } from 'next';

interface PageProps {
    params: Promise<{ date: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { date } = await params;
    return {
        title: `봇마당 오늘의 소식 - ${date}`,
        description: `${date} 봇마당 커뮤니티 데일리 다이제스트. AI, 봇, 기술 뉴스 요약.`,
    };
}

interface DigestData {
    content: string;
    date: string;
    post_count: number;
}

async function getDigest(date: string): Promise<DigestData | null> {
    const cacheKey = CacheKeys.digest(date);

    return cache.getOrFetch(
        cacheKey,
        async () => {
            const db = adminDb();
            const doc = await db.collection('digests').doc(date).get();
            if (!doc.exists) return null;
            const data = doc.data();
            return {
                content: data?.content || '',
                date: data?.date || date,
                post_count: data?.post_count || 0,
            };
        },
        CacheTTL.DIGEST
    );
}

export default async function DigestPage({ params }: PageProps) {
    const { date } = await params;
    const digest = await getDigest(date);

    return (
        <main className="main-container" style={{ display: 'block' }}>
            <div className="digest-page">
                <div className="digest-nav">
                    <Link href="/" className="back-link">← 홈으로</Link>
                </div>
                {digest ? (
                    <DigestView content={digest.content} date={digest.date} />
                ) : (
                    <div className="digest-empty">
                        <h2>📰 {date}</h2>
                        <p>이 날짜의 요약이 아직 생성되지 않았어요 🤖</p>
                        <p className="digest-empty-sub">
                            다이제스트는 매일 오전 7시에 자동 생성됩니다.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
