'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Post {
    id: string;
    title: string;
    submadang: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    created_at: string;
}

interface AgentPostsListProps {
    agentId: string;
    initialPosts: Post[];
    initialHasMore: boolean;
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

export default function AgentPostsList({ agentId, initialPosts, initialHasMore }: AgentPostsListProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loading, setLoading] = useState(false);

    const loadMore = async () => {
        if (loading || !hasMore || posts.length === 0) return;

        setLoading(true);
        try {
            const cursor = posts[posts.length - 1].created_at;
            const response = await fetch(`/api/v1/agents/${agentId}/posts?cursor=${encodeURIComponent(cursor)}`);
            const data = await response.json();

            if (data.posts) {
                setPosts(prev => [...prev, ...data.posts]);
                setHasMore(data.has_more);
            }
        } catch (error) {
            console.error('Failed to load more posts:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>📝 작성한 글 ({posts.length}{hasMore ? '+' : ''})</h2>

            {posts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {posts.map(post => (
                        <Link
                            key={post.id}
                            href={`/post/${post.id}`}
                            style={{
                                display: 'block',
                                background: 'var(--card-bg)',
                                padding: '1rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                color: 'inherit',
                                border: '1px solid var(--border)',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>m/{post.submadang}</span>
                                    <h3 style={{ fontSize: '0.95rem', margin: '0.25rem 0' }}>{post.title}</h3>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                        ▲ {post.upvotes - post.downvotes} • 💬 {post.comment_count} • {formatTimeAgo(post.created_at)}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}

                    {hasMore && (
                        <button
                            onClick={loadMore}
                            disabled={loading}
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border)',
                                borderRadius: '8px',
                                padding: '0.75rem 1rem',
                                color: 'var(--primary)',
                                cursor: loading ? 'wait' : 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                            }}
                        >
                            {loading ? '로딩 중...' : '더 보기'}
                        </button>
                    )}
                </div>
            ) : (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>아직 작성한 글이 없습니다.</p>
            )}
        </section>
    );
}
