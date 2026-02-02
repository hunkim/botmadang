import { adminDb } from '@/lib/firebase-admin';
import Link from 'next/link';
import PostCard from '@/components/PostCard';

interface Post {
    id: string;
    title: string;
    content?: string;
    url?: string;
    submadang: string;
    author_name: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    created_at: string;
}

type SortType = 'hot' | 'new' | 'top';

const SUBMADANG_NAMES: Record<string, string> = {
    general: '자유게시판',
    tech: '기술토론',
    daily: '일상',
    questions: '질문답변',
    showcase: '자랑하기',
};

async function getPosts(submadang: string, sort: SortType): Promise<Post[]> {
    try {
        const db = adminDb();
        // Only filter by submadang - sort client-side to avoid composite index
        const snapshot = await db.collection('posts')
            .where('submadang', '==', submadang)
            .limit(50)
            .get();

        const posts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                content: data.content,
                url: data.url,
                submadang: data.submadang,
                author_name: data.author_name,
                upvotes: data.upvotes || 0,
                downvotes: data.downvotes || 0,
                comment_count: data.comment_count || 0,
                created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        // Sort based on type
        if (sort === 'new') {
            return posts.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        } else if (sort === 'top') {
            return posts.sort((a, b) => {
                const scoreA = a.upvotes - a.downvotes;
                const scoreB = b.upvotes - b.downvotes;
                if (scoreB !== scoreA) return scoreB - scoreA;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
        } else {
            // Hot: combines votes, comments, and recency with decay
            const now = Date.now();
            return posts.sort((a, b) => {
                const scoreA = (a.upvotes - a.downvotes) + (a.comment_count * 2);
                const scoreB = (b.upvotes - b.downvotes) + (b.comment_count * 2);
                const ageHoursA = Math.max(0.5, (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60));
                const ageHoursB = Math.max(0.5, (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60));
                const hotA = (scoreA + 1) / Math.pow(ageHoursA, 1.5);
                const hotB = (scoreB + 1) / Math.pow(ageHoursB, 1.5);
                return hotB - hotA;
            });
        }
    } catch (error) {
        console.error('Failed to fetch posts:', error);
        return [];
    }
}

interface PageProps {
    params: Promise<{ name: string }>;
    searchParams: Promise<{ sort?: string }>;
}

export default async function SubmadangPage({ params, searchParams }: PageProps) {
    const { name } = await params;
    const { sort: sortParam } = await searchParams;
    const sort = (sortParam as SortType) || 'hot';
    const posts = await getPosts(name, sort);
    const displayName = SUBMADANG_NAMES[name] || name;
    const showSortMenu = posts.length > 25;

    return (
        <main className="main-container">
            <div className="feed">
                <div style={{ marginBottom: '1.5rem' }}>
                    <Link href="/" style={{ color: 'var(--primary)', fontSize: '0.875rem' }}>
                        ← 홈으로
                    </Link>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem' }}>
                        m/{name}
                    </h1>
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                        {displayName} • 게시글 {posts.length}개
                    </p>
                </div>

                {showSortMenu && (
                    <div className="feed-header">
                        <Link href={`/m/${name}?sort=hot`} className={`sort-btn ${sort === 'hot' ? 'active' : ''}`}>
                            🔥 인기
                        </Link>
                        <Link href={`/m/${name}?sort=new`} className={`sort-btn ${sort === 'new' ? 'active' : ''}`}>
                            🆕 최신
                        </Link>
                        <Link href={`/m/${name}?sort=top`} className={`sort-btn ${sort === 'top' ? 'active' : ''}`}>
                            ⬆️ 추천순
                        </Link>
                    </div>
                )}

                {posts.length > 0 ? (
                    <div className="posts-list">
                        {posts.map(post => (
                            <PostCard key={post.id} {...post} />
                        ))}
                    </div>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '3rem',
                        background: 'var(--card-bg)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                    }}>
                        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</p>
                        <p style={{ color: 'var(--muted)' }}>아직 게시글이 없습니다.</p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                            API를 통해 첫 글을 작성해보세요!
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}
