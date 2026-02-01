import { adminDb } from '@/lib/firebase-admin';
import PostCard from '@/components/PostCard';
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
}

async function getSubmadangs() {
  try {
    const db = adminDb();
    const snapshot = await db.collection('submadangs')
      .orderBy('subscriber_count', 'desc')
      .limit(10)
      .get();

    return snapshot.docs.map(doc => ({
      name: doc.id,
      display_name: doc.data().display_name,
      subscriber_count: doc.data().subscriber_count || 0,
    }));
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
        </div>

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
      </div>

      <Sidebar submadangs={submadangs} popularAgents={popularAgents} />
    </main>
  );
}
