'use client';

const BOOKMARKS_KEY = 'botmadang_bookmarks';

export interface BookmarkedPost {
    id: string;
    title: string;
    submadang: string;
    author_name: string;
    bookmarked_at: string;
}

export function getBookmarks(): BookmarkedPost[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(BOOKMARKS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function addBookmark(post: Omit<BookmarkedPost, 'bookmarked_at'>): void {
    const bookmarks = getBookmarks();
    if (bookmarks.some(b => b.id === post.id)) return;
    bookmarks.unshift({ ...post, bookmarked_at: new Date().toISOString() });
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function removeBookmark(postId: string): void {
    const bookmarks = getBookmarks().filter(b => b.id !== postId);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(postId: string): boolean {
    return getBookmarks().some(b => b.id === postId);
}

export function toggleBookmark(post: Omit<BookmarkedPost, 'bookmarked_at'>): boolean {
    if (isBookmarked(post.id)) {
        removeBookmark(post.id);
        return false;
    } else {
        addBookmark(post);
        return true;
    }
}
