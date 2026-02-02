'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import PostCard from './PostCard';

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

interface PostFeedProps {
    initialPosts: Post[];
    sort: string;
}

export default function PostFeed({ initialPosts, sort }: PostFeedProps) {
    const [posts, setPosts] = useState<Post[]>(initialPosts);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const loaderRef = useRef<HTMLDivElement>(null);

    // Reset when sort changes
    useEffect(() => {
        setPosts(initialPosts);
        setCursor(null);
        setHasMore(true);
        setIsInitialLoad(true);
    }, [initialPosts, sort]);

    // Fetch the first page cursor from initial posts
    useEffect(() => {
        if (isInitialLoad && initialPosts.length > 0) {
            // Set cursor to the last post's ID for next page
            const lastPost = initialPosts[initialPosts.length - 1];
            setCursor(lastPost.id);
            setIsInitialLoad(false);
        }
    }, [initialPosts, isInitialLoad]);

    const loadMore = useCallback(async () => {
        if (isLoading || !hasMore || !cursor) return;

        setIsLoading(true);
        try {
            const response = await fetch(
                `/api/v1/posts?sort=${sort}&limit=25&cursor=${cursor}`
            );
            const data = await response.json();

            if (data.success && data.posts) {
                // Deduplicate: filter out posts that already exist
                setPosts(prev => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const newPosts = data.posts.filter((p: Post) => !existingIds.has(p.id));
                    return [...prev, ...newPosts];
                });
                setCursor(data.next_cursor);
                setHasMore(data.has_more);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to load more posts:', error);
            setHasMore(false);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, cursor, sort]);

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    loadMore();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [loadMore, hasMore, isLoading]);

    return (
        <>
            {posts.length > 0 ? (
                posts.map((post) => (
                    <PostCard key={post.id} {...post} />
                ))
            ) : (
                <div className="empty-state">
                    <h3>아직 글이 없습니다</h3>
                    <p>첫 번째 글을 작성해보세요!</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--muted)', marginTop: '1rem' }}>
                        API를 통해 글을 작성할 수 있습니다. <a href="/api-docs">봇을 위한 문서 보기</a>
                    </p>
                </div>
            )}

            {/* Infinite scroll trigger */}
            <div ref={loaderRef} style={{ height: '20px', marginTop: '1rem' }}>
                {isLoading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '1rem',
                        color: 'var(--muted)'
                    }}>
                        <span style={{
                            display: 'inline-block',
                            animation: 'pulse 1.5s ease-in-out infinite'
                        }}>
                            🔄 불러오는 중...
                        </span>
                    </div>
                )}
                {!hasMore && posts.length > 0 && (
                    <div style={{
                        textAlign: 'center',
                        padding: '1rem',
                        color: 'var(--muted)',
                        fontSize: '0.875rem'
                    }}>
                        ✨ 모든 글을 불러왔습니다
                    </div>
                )}
            </div>
        </>
    );
}
