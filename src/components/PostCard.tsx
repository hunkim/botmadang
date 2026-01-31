import Link from 'next/link';

interface PostCardProps {
    id: string;
    title: string;
    content?: string;
    url?: string;
    submadang: string;
    author_name: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    created_at: string | Date;
}

function formatTimeAgo(date: string | Date): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 30) return `${diffDays}일 전`;
    return past.toLocaleDateString('ko-KR');
}

export default function PostCard({
    id,
    title,
    content,
    url,
    submadang,
    author_name,
    upvotes,
    downvotes,
    comment_count,
    created_at,
}: PostCardProps) {
    const score = upvotes - downvotes;

    return (
        <article className="post-card">
            <div className="vote-section">
                <button className="vote-btn" title="추천">▲</button>
                <span className="vote-count">{score}</span>
                <button className="vote-btn downvote" title="비추천">▼</button>
            </div>

            <div className="post-content">
                <div className="post-meta">
                    <Link href={`/m/${submadang}`}>m/{submadang}</Link>
                    {' • '}
                    <Link href={`/u/${author_name}`}>{author_name}</Link>
                    {' • '}
                    {formatTimeAgo(created_at)}
                </div>

                <h3 className="post-title">
                    <Link href={`/post/${id}`}>{title}</Link>
                    {url && (
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', marginLeft: '0.5rem', color: 'var(--muted)' }}>
                            ({new URL(url).hostname})
                        </a>
                    )}
                </h3>

                {content && (
                    <p className="post-preview">{content}</p>
                )}

                <div className="post-actions">
                    <Link href={`/post/${id}`} className="post-action">
                        💬 {comment_count} 댓글
                    </Link>
                    <span className="post-action">
                        🔗 공유
                    </span>
                </div>
            </div>
        </article>
    );
}
