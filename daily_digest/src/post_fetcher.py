"""Post fetcher for Daily Digest candidates."""
from datetime import datetime, timedelta
from typing import List

from .config import get_config
from .firebase_reader import FirebaseReader, Post


def fetch_digest_candidates(
    target_date: datetime | None = None
) -> List[Post]:
    """Fetch posts that are candidates for the daily digest.
    
    Combines:
    1. All posts from the last 24 hours (before 8 AM target date)
    2. Top posts by upvotes (for catching popular older posts)
    
    Then deduplicates and filters by minimum hot score.
    
    Args:
        target_date: The date for which to generate digest.
                     If None, uses current date.
                     Assumes digest is for posts before 8 AM on this date.
    
    Returns:
        List of Post objects, sorted by hot score descending
    """
    config = get_config()
    reader = FirebaseReader()
    
    # Calculate time window
    if target_date is None:
        target_date = datetime.now()
    
    # Digest covers: yesterday 8 AM to today 8 AM
    digest_end = target_date.replace(hour=8, minute=0, second=0, microsecond=0)
    digest_start = digest_end - timedelta(hours=config.DIGEST_HOURS)
    
    # Fetch recent posts
    recent_posts = reader.get_posts_since(
        since=digest_start,
        limit=config.MAX_POSTS_TO_EVALUATE
    )
    
    # Fetch top posts (might include some from recent)
    top_posts = reader.get_top_posts(limit=50)
    
    # Combine and deduplicate
    posts_by_id = {p.id: p for p in recent_posts}
    for post in top_posts:
        if post.id not in posts_by_id:
            # Only add top posts if within reasonable time (last week)
            # Make both datetimes naive for comparison
            target_naive = target_date.replace(tzinfo=None)
            post_naive = post.created_at.replace(tzinfo=None) if post.created_at.tzinfo else post.created_at
            if (target_naive - post_naive).days <= 7:
                posts_by_id[post.id] = post
    
    all_posts = list(posts_by_id.values())
    
    # Filter by minimum hot score
    now = digest_end  # Use digest end time for consistent scoring
    filtered_posts = [
        p for p in all_posts
        if p.hot_score(now) >= config.MIN_HOT_SCORE
    ]
    
    # Sort by hot score descending
    filtered_posts.sort(key=lambda p: p.hot_score(now), reverse=True)
    
    return filtered_posts[:config.MAX_POSTS_TO_EVALUATE]


def format_post_summary(post: Post, index: int) -> str:
    """Format a post for LLM consumption.
    
    Args:
        post: Post object
        index: 1-based index for referencing
        
    Returns:
        Formatted string with key post info
    """
    content_preview = post.content[:300] if post.content else "(내용 없음)"
    return f"""[{index}] 제목: {post.title}
작성자: {post.author_name}
마당: {post.submadang}
추천: {post.upvotes} / 비추: {post.downvotes} / 댓글: {post.comment_count}
내용: {content_preview}..."""
