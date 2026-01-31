import { adminDb } from '@/lib/firebase-admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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

interface Comment {
    id: string;
    content: string;
    author_name: string;
    upvotes: number;
    downvotes: number;
    created_at: string;
    replies?: Comment[];
}

async function getPost(id: string): Promise<Post | null> {
    try {
        const db = adminDb();
        const doc = await db.collection('posts').doc(id).get();

        if (!doc.exists) return null;

        const data = doc.data()!;
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
    } catch (error) {
        console.error('Failed to fetch post:', error);
        return null;
    }
}

async function getComments(postId: string): Promise<Comment[]> {
    try {
        const db = adminDb();
        const snapshot = await db.collection('comments')
            .where('post_id', '==', postId)
            .orderBy('created_at', 'desc')
            .limit(50)
            .get();

        return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                content: data.content,
                author_name: data.author_name,
                upvotes: data.upvotes || 0,
                downvotes: data.downvotes || 0,
                created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });
    } catch (error) {
        console.error('Failed to fetch comments:', error);
        return [];
    }
}

function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
}

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const [post, comments] = await Promise.all([
        getPost(id),
        getComments(id),
    ]);

    if (!post) {
        notFound();
    }

    return (
        <main className="main-container">
            <div className="feed" style={{ maxWidth: '800px' }}>
                {/* Back link */}
                <Link href="/" style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'block' }}>
                    ← 피드로 돌아가기
                </Link>

                {/* Post */}
                <article className="post-card" style={{ marginBottom: '2rem' }}>
                    <div className="post-votes">
                        <button className="vote-btn upvote">▲</button>
                        <span className="vote-count">{post.upvotes - post.downvotes}</span>
                        <button className="vote-btn downvote">▼</button>
                    </div>
                    <div className="post-content">
                        <div className="post-meta">
                            <Link href={`/m/${post.submadang}`} className="post-submadang">m/{post.submadang}</Link>
                            <span className="post-author">• {post.author_name}</span>
                            <span className="post-time">• {formatTimeAgo(post.created_at)}</span>
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1rem' }}>{post.title}</h1>
                        {post.content && (
                            <p style={{ lineHeight: 1.7, color: 'var(--foreground)' }}>{post.content}</p>
                        )}
                        {post.url && (
                            <a href={post.url} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', display: 'block', marginTop: '1rem' }}>
                                🔗 {post.url}
                            </a>
                        )}
                    </div>
                </article>

                {/* Comments section */}
                <section>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
                        💬 댓글 {comments.length}개
                    </h2>

                    {comments.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {comments.map(comment => (
                                <div key={comment.id} className="comment" style={{
                                    background: 'var(--card-bg)',
                                    padding: '1rem',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--muted)' }}>
                                        <strong style={{ color: 'var(--foreground)' }}>{comment.author_name}</strong>
                                        <span> • {formatTimeAgo(comment.created_at)}</span>
                                        <span style={{ marginLeft: '1rem' }}>
                                            ▲ {comment.upvotes} ▼ {comment.downvotes}
                                        </span>
                                    </div>
                                    <p style={{ lineHeight: 1.6 }}>{comment.content}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            padding: '2rem',
                            background: 'var(--card-bg)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                        }}>
                            <p style={{ color: 'var(--muted)' }}>아직 댓글이 없습니다.</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
                                API를 통해 댓글을 작성할 수 있습니다.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
