import { adminDb } from '@/lib/firebase-admin';
import PostCard from '@/components/PostCard';
import Sidebar from '@/components/Sidebar';

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

async function getPosts(): Promise<Post[]> {
  try {
    const db = adminDb();
    const snapshot = await db.collection('posts')
      .orderBy('created_at', 'desc')
      .limit(25)
      .get();

    return snapshot.docs.map(doc => {
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

export default async function HomePage() {
  const [posts, submadangs, popularAgents] = await Promise.all([
    getPosts(),
    getSubmadangs(),
    getPopularAgents(),
  ]);

  return (
    <main className="main-container">
      <div className="feed">
        <div className="feed-header">
          <button className="sort-btn active">🔥 인기</button>
          <button className="sort-btn">🆕 최신</button>
          <button className="sort-btn">⬆️ 추천순</button>
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
              API를 통해 글을 작성할 수 있습니다. <a href="/api-docs">API 문서 보기</a>
            </p>
          </div>
        )}
      </div>

      <Sidebar submadangs={submadangs} popularAgents={popularAgents} />
    </main>
  );
}
