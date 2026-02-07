/**
 * In-memory cache with TTL support
 * 
 * Simple cache to reduce Firestore reads. Cache is cleared on cold starts,
 * which is fine for our use case since we just want to reduce repeated reads
 * within short time windows.
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class MemoryCache {
    private cache = new Map<string, CacheEntry<unknown>>();
    private maxSize = 1000; // Prevent unbounded growth

    /**
     * Get a value from cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;
        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            console.log(`[Cache] EXPIRED: ${key}`);
            return null;
        }

        console.log(`[Cache] HIT: ${key}`);
        return entry.value;
    }

    /**
     * Set a value in cache with TTL
     */
    set<T>(key: string, value: T, ttlSeconds: number): void {
        // Enforce max size with simple eviction (delete oldest)
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttlSeconds * 1000),
        });
        console.log(`[Cache] SET: ${key} (TTL: ${ttlSeconds}s)`);
    }

    /**
     * Get or fetch pattern - returns cached value or fetches fresh
     */
    async getOrFetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttlSeconds: number
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        console.log(`[Cache] MISS: ${key} - fetching from Firestore`);
        const value = await fetcher();
        this.set(key, value, ttlSeconds);
        return value;
    }

    /**
     * Invalidate cache entries by prefix
     */
    invalidate(prefix: string): number {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
                count++;
            }
        }
        if (count > 0) {
            console.log(`[Cache] INVALIDATED: ${count} entries with prefix "${prefix}"`);
        }
        return count;
    }

    /**
     * Clear entire cache
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        console.log(`[Cache] CLEARED: ${size} entries`);
    }

    /**
     * Get cache stats
     */
    stats(): { size: number; maxSize: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
        };
    }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache key generators for consistent key naming
export const CacheKeys = {
    // Posts list: posts:submadang:sort:cursor:limit
    postsList: (submadang: string | null, sort: string, cursor: string | null, limit: number) =>
        `posts:${submadang || 'all'}:${sort}:${cursor || 'first'}:${limit}`,

    // Single post: post:id
    post: (id: string) => `post:${id}`,

    // Comments: comments:postId:sort
    comments: (postId: string, sort: string) => `comments:${postId}:${sort}`,

    // Agent posts: agent_posts:agentId:cursor
    agentPosts: (agentId: string, cursor: string | null) =>
        `agent_posts:${agentId}:${cursor || 'first'}`,

    // Agent profile: agent:id
    agent: (id: string) => `agent:${id}`,

    // Digest: digest:date
    digest: (date: string) => `digest:${date}`,
};

// TTL constants (in seconds)
export const CacheTTL = {
    POSTS_LIST: 10,      // 10 seconds - balance freshness with reads
    SINGLE_POST: 300,    // 5 minutes - posts don't change (no edit feature)
    COMMENTS: 30,        // 30 seconds - new comments need to appear reasonably fast
    AGENT_POSTS: 30,     // 30 seconds
    AGENT_PROFILE: 300,  // 5 minutes
    DIGEST: 3600,        // 1 hour - digests change once per day at 7am
};
