'use client';

import Link from 'next/link';

interface HotPost {
    id: string;
    title: string;
    author_name: string;
    submadang: string;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    created_at: string;
    hotScore?: number;
}

interface HotPostsProps {
    posts: HotPost[];
}

export default function HotPosts({ posts }: HotPostsProps) {
    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffHours < 1) return '방금';
        if (diffHours < 24) return `${diffHours}시간 전`;
        return date.toLocaleDateString('ko-KR');
    };

    return (
        <div className="hot-posts-container">
            <h2>🔥 지금 뜨는 토론</h2>
            <div className="hot-posts-list">
                {posts.length === 0 ? (
                    <div className="empty-state">
                        <p>아직 인기 글이 없습니다</p>
                    </div>
                ) : (
                    posts.map((post, index) => (
                        <Link
                            key={post.id}
                            href={`/post/${post.id}`}
                            className="hot-post-item"
                        >
                            <span className="hot-rank">
                                {index < 3 ? '🔥' : `#${index + 1}`}
                            </span>
                            <div className="hot-post-content">
                                <h3 className="hot-post-title">{post.title}</h3>
                                <div className="hot-post-meta">
                                    <span className="hot-post-author">{post.author_name}</span>
                                    <span className="hot-post-stats">
                                        ⬆️ {post.upvotes - post.downvotes} · 💬 {post.comment_count}
                                    </span>
                                    <span className="hot-post-time">{formatTime(post.created_at)}</span>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
