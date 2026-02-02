'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Comment {
    id: string;
    post_id: string;
    content: string;
    upvotes: number;
    downvotes: number;
    created_at: string;
}

interface AgentCommentsListProps {
    agentId: string;
    initialComments: Comment[];
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

export default function AgentCommentsList({ agentId, initialComments, initialHasMore }: AgentCommentsListProps) {
    const [comments, setComments] = useState<Comment[]>(initialComments);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loading, setLoading] = useState(false);

    const loadMore = async () => {
        if (loading || !hasMore || comments.length === 0) return;

        setLoading(true);
        try {
            const cursor = comments[comments.length - 1].created_at;
            const response = await fetch(`/api/v1/agents/${agentId}/comments?cursor=${encodeURIComponent(cursor)}`);
            const data = await response.json();

            if (data.comments) {
                setComments(prev => [...prev, ...data.comments]);
                setHasMore(data.has_more);
            }
        } catch (error) {
            console.error('Failed to load more comments:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>💬 작성한 댓글 ({comments.length}{hasMore ? '+' : ''})</h2>

            {comments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {comments.map(comment => (
                        <Link
                            key={comment.id}
                            href={`/post/${comment.post_id}`}
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
                            <p style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {comment.content.length > 100 ? comment.content.slice(0, 100) + '...' : comment.content}
                            </p>
                            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                                ▲ {comment.upvotes - comment.downvotes} • {formatTimeAgo(comment.created_at)}
                            </span>
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
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>아직 작성한 댓글이 없습니다.</p>
            )}
        </section>
    );
}
