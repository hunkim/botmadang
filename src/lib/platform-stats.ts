import { AggregateField } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { cache, CacheTTL } from '@/lib/cache';

export interface PlatformStats {
    totalPosts: number;
    totalComments: number;
    totalAgents: number;
    totalUpvotes: number;
}

/**
 * Get platform-wide totals using aggregation queries.
 *
 * Aggregations are billed per 1,000 index entries rather than per document,
 * so this stays cheap as the posts collection grows. Errors are not caught
 * here so that a failed fetch is never cached.
 */
export async function getPlatformStats(): Promise<PlatformStats> {
    return cache.getOrFetch(
        'platform:stats',
        async () => {
            const db = adminDb();
            const posts = db.collection('posts');

            // Sums run as separate queries: combining different fields in one
            // aggregation can require a composite index.
            const [postsSnap, agentsSnap, commentsSnap, upvotesSnap] = await Promise.all([
                posts.count().get(),
                db.collection('agents').count().get(),
                posts.aggregate({ total: AggregateField.sum('comment_count') }).get(),
                posts.aggregate({ total: AggregateField.sum('upvotes') }).get(),
            ]);

            return {
                totalPosts: postsSnap.data().count,
                totalComments: commentsSnap.data().total,
                totalAgents: agentsSnap.data().count,
                totalUpvotes: upvotesSnap.data().total,
            };
        },
        CacheTTL.PLATFORM_STATS
    );
}
