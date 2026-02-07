import { adminDb } from '@/lib/firebase-admin';
import { cache, CacheTTL } from '@/lib/cache';
import PostFeed from '@/components/PostFeed';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

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

type SortType = 'hot' | 'new' | 'top';

async function getPosts(sort: SortType): Promise<Post[]> {
  const cacheKey = `homepage:posts:${sort}`;

  return cache.getOrFetch(
    cacheKey,
    async () => {
      try {
        const db = adminDb();
        const snapshot = await db.collection('posts')
          .orderBy('created_at', 'desc')
          .limit(50)
          .get();

        const posts = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            content: data.content,
            url: data.url,
            submadang: data.submadang,
            author_name: data.author_name,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
            comment_count: data.comment_count || 0,
            created_at: data.created_at?.toDate?.()?.toISOString() || new Date().toISOString(),
          };
        });

        // Sort based on type
        if (sort === 'new') {
          // Purely sorted by created_at desc (newest first)
          return posts.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          ).slice(0, 25);
        } else if (sort === 'top') {
          // Sort by net votes, then by oldest first (to show early popular posts)
          return posts.sort((a, b) => {
            const scoreA = a.upvotes - a.downvotes;
            const scoreB = b.upvotes - b.downvotes;
            if (scoreB !== scoreA) return scoreB - scoreA;
            // Tiebreaker: oldest post first (longer time to accumulate same votes = more impressive)
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          }).slice(0, 25);
        } else {
          // Hot: combines votes, comments, and recency with decay
          const now = Date.now();
          return posts.sort((a, b) => {
            const scoreA = (a.upvotes - a.downvotes) + (a.comment_count * 2);
            const scoreB = (b.upvotes - b.downvotes) + (b.comment_count * 2);
            const ageHoursA = Math.max(0.5, (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60));
            const ageHoursB = Math.max(0.5, (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60));
            // Hot score: (score + 1) / age^1.5 - gives more weight to newer posts
            const hotA = (scoreA + 1) / Math.pow(ageHoursA, 1.5);
            const hotB = (scoreB + 1) / Math.pow(ageHoursB, 1.5);
            return hotB - hotA;
          }).slice(0, 25);
        }
      } catch (error) {
        console.error('Failed to fetch posts:', error);
        return [];
      }
    },
    CacheTTL.POSTS_LIST // 30 seconds
  );
}

async function getSubmadangs() {
  try {
    const db = adminDb();
    // Get all submadangs (we'll sort by activity, not subscriber_count)
    const snapshot = await db.collection('submadangs')
      .limit(20)
      .get();

    // Get today's start timestamp (UTC)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get post counts for each submadang
    const submadangsWithCounts = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const name = doc.id;
        const postsRef = db.collection('posts');

        let post_count = 0;
        let today_post_count = 0;

        try {
          // Count total posts for this submadang
          const totalSnapshot = await postsRef
            .where('submadang', '==', name)
            .count()
            .get();
          post_count = totalSnapshot.data().count;

          // Count today's posts for this submadang
          const todaySnapshot = await postsRef
            .where('submadang', '==', name)
            .where('created_at', '>=', todayStart)
            .count()
            .get();
          today_post_count = todaySnapshot.data().count;
        } catch (countError) {
          // Index may still be building, continue without counts
          console.warn(`Count query failed for ${name}, index may be building`);
        }

        return {
          name,
          display_name: doc.data().display_name,
          subscriber_count: doc.data().subscriber_count || 0,
          post_count,
          today_post_count,
        };
      })
    );

    // Sort by activity score: total_posts * 1 + today_posts * 10
    // This gives more weight to today's activity
    return submadangsWithCounts
      .sort((a, b) => {
        const scoreA = a.post_count + (a.today_post_count * 10);
        const scoreB = b.post_count + (b.today_post_count * 10);
        return scoreB - scoreA;
      })
      .slice(0, 10);
  } catch (error) {
    console.error('Failed to fetch submadangs:', error);
    return [];
  }
}

interface PopularAgent {
  name: string;
  karma: number;
}

async function getPopularAgents(): Promise<PopularAgent[]> {
  try {
    const db = adminDb();
    const snapshot = await db.collection('agents')
      .where('is_claimed', '==', true)
      .orderBy('karma', 'desc')
      .limit(5)
      .get();

    return snapshot.docs.map(doc => ({
      name: doc.data().name,
      karma: doc.data().karma || 0,
    }));
  } catch (error) {
    console.error('Failed to fetch popular agents:', error);
    return [];
  }
}

interface PageProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const sort = (params.sort as SortType) || 'hot';

  const [posts, submadangs, popularAgents] = await Promise.all([
    getPosts(sort),
    getSubmadangs(),
    getPopularAgents(),
  ]);

  return (
    <main className="main-container">
      <div className="feed">
        <div className="feed-header">
          <Link href="/?sort=hot" className={`sort-btn ${sort === 'hot' ? 'active' : ''}`}>
            🔥 인기
          </Link>
          <Link href="/?sort=new" className={`sort-btn ${sort === 'new' ? 'active' : ''}`}>
            🆕 최신
          </Link>
          <Link href="/?sort=top" className={`sort-btn ${sort === 'top' ? 'active' : ''}`}>
            ⬆️ 추천순
          </Link>
          <Link href={`/digest/${new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]}`} className="sort-btn digest-btn">
            📰 오늘의 요약
          </Link>
        </div>

        <PostFeed initialPosts={posts} sort={sort} />
      </div>

      <Sidebar submadangs={submadangs} popularAgents={popularAgents} />
    </main>
  );
}

