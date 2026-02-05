/**
 * Unit tests for the cache module
 * Tests TTL expiration, getOrFetch, invalidation, and cache stats
 */

import { cache, CacheKeys, CacheTTL } from '../cache';

describe('MemoryCache', () => {
    beforeEach(() => {
        // Clear cache before each test
        cache.clear();
    });

    describe('get/set', () => {
        it('should store and retrieve values', () => {
            cache.set('test-key', { data: 'hello' }, 60);
            expect(cache.get('test-key')).toEqual({ data: 'hello' });
        });

        it('should return null for non-existent keys', () => {
            expect(cache.get('non-existent')).toBeNull();
        });

        it('should return null for expired entries', async () => {
            cache.set('expiring-key', 'value', 0.1); // 100ms TTL

            // Should exist immediately
            expect(cache.get('expiring-key')).toBe('value');

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));

            // Should be expired now
            expect(cache.get('expiring-key')).toBeNull();
        });

        it('should handle various data types', () => {
            cache.set('string', 'hello', 60);
            cache.set('number', 42, 60);
            cache.set('array', [1, 2, 3], 60);
            cache.set('object', { nested: { deep: true } }, 60);
            cache.set('null', null, 60);

            expect(cache.get('string')).toBe('hello');
            expect(cache.get('number')).toBe(42);
            expect(cache.get('array')).toEqual([1, 2, 3]);
            expect(cache.get('object')).toEqual({ nested: { deep: true } });
            expect(cache.get('null')).toBeNull(); // null values are treated as missing
        });
    });

    describe('getOrFetch', () => {
        it('should fetch and cache on miss', async () => {
            const fetcher = jest.fn().mockResolvedValue({ posts: [] });

            const result1 = await cache.getOrFetch('posts-key', fetcher, 60);

            expect(result1).toEqual({ posts: [] });
            expect(fetcher).toHaveBeenCalledTimes(1);
        });

        it('should return cached value on hit (no fetch)', async () => {
            const fetcher = jest.fn().mockResolvedValue({ posts: ['new'] });

            // Pre-populate cache
            cache.set('cached-key', { posts: ['cached'] }, 60);

            const result = await cache.getOrFetch('cached-key', fetcher, 60);

            expect(result).toEqual({ posts: ['cached'] });
            expect(fetcher).not.toHaveBeenCalled(); // Fetcher should NOT be called
        });

        it('should fetch again after TTL expires', async () => {
            let callCount = 0;
            const fetcher = jest.fn().mockImplementation(() => {
                callCount++;
                return Promise.resolve({ count: callCount });
            });

            // First call - cache miss
            const result1 = await cache.getOrFetch('expiring', fetcher, 0.1);
            expect(result1).toEqual({ count: 1 });
            expect(fetcher).toHaveBeenCalledTimes(1);

            // Second call immediately - cache hit
            const result2 = await cache.getOrFetch('expiring', fetcher, 0.1);
            expect(result2).toEqual({ count: 1 });
            expect(fetcher).toHaveBeenCalledTimes(1); // Still 1

            // Wait for expiration
            await new Promise(resolve => setTimeout(resolve, 150));

            // Third call after expiration - cache miss again
            const result3 = await cache.getOrFetch('expiring', fetcher, 0.1);
            expect(result3).toEqual({ count: 2 });
            expect(fetcher).toHaveBeenCalledTimes(2);
        });
    });

    describe('invalidate', () => {
        it('should invalidate entries by prefix', () => {
            cache.set('posts:all:hot', { data: 1 }, 60);
            cache.set('posts:all:new', { data: 2 }, 60);
            cache.set('posts:tech:hot', { data: 3 }, 60);
            cache.set('comments:123', { data: 4 }, 60);

            // Invalidate all posts
            const count = cache.invalidate('posts:');

            expect(count).toBe(3);
            expect(cache.get('posts:all:hot')).toBeNull();
            expect(cache.get('posts:all:new')).toBeNull();
            expect(cache.get('posts:tech:hot')).toBeNull();
            expect(cache.get('comments:123')).toEqual({ data: 4 }); // Not invalidated
        });

        it('should return 0 when no entries match', () => {
            cache.set('foo', 'bar', 60);
            const count = cache.invalidate('non-existent-prefix:');
            expect(count).toBe(0);
        });
    });

    describe('stats', () => {
        it('should return correct cache size', () => {
            expect(cache.stats().size).toBe(0);

            cache.set('a', 1, 60);
            cache.set('b', 2, 60);
            cache.set('c', 3, 60);

            expect(cache.stats().size).toBe(3);
        });
    });

    describe('clear', () => {
        it('should remove all entries', () => {
            cache.set('a', 1, 60);
            cache.set('b', 2, 60);

            cache.clear();

            expect(cache.stats().size).toBe(0);
            expect(cache.get('a')).toBeNull();
            expect(cache.get('b')).toBeNull();
        });
    });
});

describe('CacheKeys', () => {
    it('should generate consistent postsList keys', () => {
        expect(CacheKeys.postsList(null, 'hot', null, 25))
            .toBe('posts:all:hot:first:25');

        expect(CacheKeys.postsList('tech', 'new', 'abc123', 10))
            .toBe('posts:tech:new:abc123:10');
    });

    it('should generate consistent comments keys', () => {
        expect(CacheKeys.comments('post123', 'top'))
            .toBe('comments:post123:top');
    });

    it('should generate consistent agentPosts keys', () => {
        expect(CacheKeys.agentPosts('agent99', null))
            .toBe('agent_posts:agent99:first');

        expect(CacheKeys.agentPosts('agent99', 'cursor123'))
            .toBe('agent_posts:agent99:cursor123');
    });
});

describe('CacheTTL', () => {
    it('should have reasonable TTL values', () => {
        expect(CacheTTL.POSTS_LIST).toBe(10);
        expect(CacheTTL.SINGLE_POST).toBe(300);
        expect(CacheTTL.COMMENTS).toBe(30);
        expect(CacheTTL.AGENT_POSTS).toBe(30);
        expect(CacheTTL.AGENT_PROFILE).toBe(300);
    });
});
