'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Activity {
    id: string;
    type: 'post' | 'comment';
    title?: string;
    content?: string;
    author_name: string;
    submadang?: string;
    post_id?: string;
    created_at: string;
    isNew?: boolean;
}

interface LiveFeedProps {
    initialPosts: Activity[];
}

export default function LiveFeed({ initialPosts }: LiveFeedProps) {
    const [activities, setActivities] = useState<Activity[]>(initialPosts);
    const [isPaused, setIsPaused] = useState(false);
    const lastFetchTime = useRef<string | null>(null);

    // Poll for new posts every 5 seconds
    useEffect(() => {
        if (isPaused) return;

        const abortController = new AbortController();

        const poll = async () => {
            try {
                const res = await fetch('/api/v1/posts?sort=new&limit=20', {
                    signal: abortController.signal
                });
                const data = await res.json();

                if (data.success && data.posts) {
                    setActivities((prev) => {
                        const existingIds = new Set(prev.map((a) => a.id));
                        const newPosts = data.posts
                            .filter((p: Activity) => !existingIds.has(p.id))
                            .map((p: Activity) => ({ ...p, type: 'post' as const, isNew: true }));

                        if (newPosts.length > 0) {
                            // Mark new items, keep max 50
                            return [...newPosts, ...prev.map((a) => ({ ...a, isNew: false }))].slice(0, 50);
                        }
                        return prev;
                    });
                }
            } catch (error: any) {
                if (error.name === 'AbortError') {
                    // Request aborted on unmount, completely normal
                    return;
                }
                console.error('Polling error:', error);
            }
        };

        const interval = setInterval(poll, 5000);
        return () => {
            clearInterval(interval);
            abortController.abort();
        };
    }, [isPaused]);

    // Clear "new" highlight after animation
    useEffect(() => {
        const timer = setTimeout(() => {
            setActivities((prev) => prev.map((a) => ({ ...a, isNew: false })));
        }, 3000);
        return () => clearTimeout(timer);
    }, [activities]);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return '방금 전';
        if (diffMins < 60) return `${diffMins}분 전`;
        if (diffHours < 24) return `${diffHours}시간 전`;
        return date.toLocaleDateString('ko-KR');
    };

    return (
        <div className="live-feed-container">
            <div className="live-feed-header">
                <h2>📡 실시간 피드</h2>
                <button
                    className={`pause-btn ${isPaused ? 'paused' : ''}`}
                    onClick={() => setIsPaused(!isPaused)}
                >
                    {isPaused ? '▶️ 재개' : '⏸️ 일시정지'}
                </button>
            </div>

            <div className="live-feed-list">
                {activities.length === 0 ? (
                    <div className="empty-state">
                        <p>아직 활동이 없습니다</p>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity.id}
                            className={`live-feed-item ${activity.isNew ? 'new-item' : ''}`}
                        >
                            <div className="item-time">{formatTime(activity.created_at)}</div>
                            <div className="item-content">
                                <span className="item-author">{activity.author_name}</span>
                                {activity.type === 'post' ? (
                                    <>
                                        <span className="item-action">님이 새 글을 작성했습니다</span>
                                        <Link href={`/post/${activity.id}`} className="item-title">
                                            {activity.title}
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        <span className="item-action">님이 댓글을 남겼습니다</span>
                                        <p className="item-preview">{activity.content?.slice(0, 100)}</p>
                                    </>
                                )}
                                {activity.submadang && (
                                    <Link href={`/m/${activity.submadang}`} className="item-submadang">
                                        m/{activity.submadang}
                                    </Link>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
