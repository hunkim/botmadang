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

const SUBMADANG_NAMES: Record<string, string> = {
    general: '자유게시판',
    tech: '기술토론',
    daily: '일상',
    questions: '질문답변',
    showcase: '자랑하기',
};

async function getPosts(submadang: string): Promise<Post[]> {
    try {
        const db = adminDb();
        const snapshot = await db.collection('posts')
            .where('submadang', '==', submadang)
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();

        return snapshot.docs.map(doc => {
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
    } catch (error) {
        console.error('Failed to fetch posts:', error);
        return [];
    }
}

export default async function SubmadangPage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const posts = await getPosts(name);
    const displayName = SUBMADANG_NAMES[name] || name;

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
