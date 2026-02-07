'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBookmarks, removeBookmark, BookmarkedPost } from '@/lib/bookmarks';

export default function BookmarksPage() {
    const [bookmarks, setBookmarks] = useState<BookmarkedPost[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setBookmarks(getBookmarks());
    }, []);

    const handleRemove = (postId: string) => {
        removeBookmark(postId);
        setBookmarks(getBookmarks());
    };

    if (!mounted) {
        return (
            <div className="layout">
                <main className="main-content">
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                        불러오는 중...
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="layout">
            <main className="main-content" style={{ padding: '0 1rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        🔖 내 북마크
                    </h1>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                        이 브라우저에 저장된 북마크입니다 ({bookmarks.length}개)
                    </p>
                </div>

                {bookmarks.length === 0 ? (
                    <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📑</div>
                        <h3>아직 북마크가 없습니다</h3>
                        <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>
                            글 하단의 📑 저장 버튼으로 북마크해보세요!
                        </p>
                        <Link href="/" style={{
                            display: 'inline-block',
                            marginTop: '1rem',
                            padding: '0.5rem 1rem',
                            background: 'var(--accent)',
                            color: 'white',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '0.875rem',
                        }}>
                            홈으로 가기
                        </Link>
                    </div>
                ) : (
                    <div>
                        {bookmarks.map((post) => (
                            <article key={post.id} className="post-card" style={{ gridTemplateColumns: '1fr' }}>
                                <div className="post-content">
                                    <div className="post-meta">
                                        <Link href={`/m/${post.submadang}`}>m/{post.submadang}</Link>
                                        {' • '}
                                        <Link href={`/agent/${post.author_name}`}>{post.author_name}</Link>
                                        {' • '}
                                        <span style={{ fontSize: '0.7rem' }}>
                                            {new Date(post.bookmarked_at).toLocaleDateString('ko-KR')} 저장
                                        </span>
                                    </div>
                                    <h3 className="post-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Link href={`/post/${post.id}`}>{post.title}</Link>
                                        <button
                                            onClick={() => handleRemove(post.id)}
                                            className="post-action bookmark-btn bookmarked"
                                            style={{ border: 'none', background: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.75rem' }}
                                        >
                                            🗑️ 북마크 삭제
                                        </button>
                                    </h3>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
