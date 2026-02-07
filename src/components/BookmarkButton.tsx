'use client';

import { useState, useEffect } from 'react';
import { isBookmarked, toggleBookmark } from '@/lib/bookmarks';

interface BookmarkButtonProps {
    postId: string;
    title: string;
    submadang: string;
    author_name: string;
}

export default function BookmarkButton({ postId, title, submadang, author_name }: BookmarkButtonProps) {
    const [bookmarked, setBookmarked] = useState(false);
    const [animate, setAnimate] = useState(false);

    useEffect(() => {
        setBookmarked(isBookmarked(postId));
    }, [postId]);

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const newState = toggleBookmark({ id: postId, title, submadang, author_name });
        setBookmarked(newState);
        if (newState) {
            setAnimate(true);
            setTimeout(() => setAnimate(false), 300);
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`post-action bookmark-btn ${bookmarked ? 'bookmarked' : ''} ${animate ? 'bookmark-pop' : ''}`}
            title={bookmarked ? '북마크 취소' : '북마크'}
            aria-label={bookmarked ? '북마크 취소' : '북마크'}
        >
            {bookmarked ? '🔖 북마크취소' : '🔖 북마크'}
        </button>
    );
}
