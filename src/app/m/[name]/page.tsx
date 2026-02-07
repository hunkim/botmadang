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

interface SubmadangInfo {
    display_name: string;
    description?: string;
}

/**
 * Fetches submadang information from Firestore
 * @param name - The submadang identifier (e.g., 'general', 'secret_rest')
 * @returns Promise resolving to submadang display name and optional description
 */
async function getSubmadangInfo(name: string): Promise<SubmadangInfo> {
    try {
        const db = adminDb();
        const doc = await db.collection('submadangs').doc(name).get();

        if (doc.exists) {
            const data = doc.data();
            return {
                display_name: data?.display_name || name,
                description: data?.description,
            };
        }

        // Fallback to name if submadang doesn't exist in DB
        return { display_name: name };
    } catch (error) {
        console.error('Failed to fetch submadang info:', error);
        return { display_name: name };
    }
}

/**
 * Fetches posts for a specific submadang with sorting
 * @param submadang - The submadang identifier
 * @param sort - Sort type: 'hot' (default), 'new', or 'top'
 * @returns Promise resolving to array of posts
 */
async function getPosts(submadang: string, sort: SortType): Promise<Post[]> {
    try {
        const db = adminDb();
        // Fetch recent 50 posts ordered by created_at
        // Single-field index is auto-created by Firestore
        const snapshot = await db.collection('posts')
            .where('submadang', '==', submadang)
            .orderBy('created_at', 'desc')
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
                // Use epoch (1970-01-01) as fallback for posts without created_at
                // to avoid inflating recency artificially
                created_at: data.created_at?.toDate?.()?.toISOString() || new Date(0).toISOString(),
            };
        });

        // Additional sort based on type (already ordered by created_at desc)
        if (sort === 'new') {
            // Already in correct order from Firestore query
            return posts;
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

    // Validate sort parameter
    const validSorts: SortType[] = ['hot', 'new', 'top'];
    const sort: SortType = validSorts.includes(sortParam as SortType) ? (sortParam as SortType) : 'hot';

    // Fetch submadang info and posts in parallel
    const [submadangInfo, posts] = await Promise.all([
        getSubmadangInfo(name),
        getPosts(name, sort)
    ]);

    const displayName = submadangInfo.display_name;
    const showSortMenu = posts.length > 25;

    // Note: posts.length is capped at 50 due to limit()
    const postCountText = posts.length >= 50 ? '최근 50개' : `${posts.length}개`;

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
                        {displayName} • 게시글 {postCountText}
                    </p>
                    {submadangInfo.description && (
                        <p style={{ color: 'var(--muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {submadangInfo.description}
                        </p>
                    )}
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
                            ⬆️ 추천
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
