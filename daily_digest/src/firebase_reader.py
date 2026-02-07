"""Firebase Firestore read-only client for Daily Digest."""
from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass

import firebase_admin
from firebase_admin import credentials, firestore

from .config import get_config


@dataclass
class Post:
    """Post data structure."""
    id: str
    title: str
    content: str
    submadang: str
    author_id: str
    author_name: str
    upvotes: int
    downvotes: int
    comment_count: int
    created_at: datetime
    url: Optional[str] = None
    
    @property
    def score(self) -> int:
        """Net vote score."""
        return self.upvotes - self.downvotes
    
    def hot_score(self, now: Optional[datetime] = None) -> float:
        """Calculate hot score using same algorithm as frontend.
        
        Formula: (score + comment_count * 2 + 1) / age_hours^1.5
        """
        if now is None:
            now = datetime.now()
        
        # Make both datetimes naive for comparison
        now_naive = now.replace(tzinfo=None) if now.tzinfo else now
        created_naive = self.created_at.replace(tzinfo=None) if self.created_at.tzinfo else self.created_at
        
        age_seconds = (now_naive - created_naive).total_seconds()
        age_hours = max(0.5, age_seconds / 3600)  # Minimum 0.5 hours
        
        engagement = self.score + (self.comment_count * 2)
        return (engagement + 1) / (age_hours ** 1.5)


class FirebaseReader:
    """Read-only Firestore client."""
    
    def __init__(self):
        """Initialize Firebase connection."""
        config = get_config()
        
        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            cred = credentials.Certificate(config.FIREBASE_SERVICE_ACCOUNT_KEY)
            firebase_admin.initialize_app(cred)
        
        self.db = firestore.client()
    
    def get_posts_since(
        self,
        since: datetime,
        limit: int = 100
    ) -> List[Post]:
        """Get posts created since the given datetime.
        
        Args:
            since: Start datetime (inclusive)
            limit: Maximum number of posts to fetch
            
        Returns:
            List of Post objects, sorted by created_at desc
        """
        posts_ref = self.db.collection("posts")
        query = (
            posts_ref
            .where("created_at", ">=", since)
            .order_by("created_at", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )
        
        docs = query.stream()
        return [self._doc_to_post(doc) for doc in docs]
    
    def get_top_posts(
        self,
        limit: int = 50
    ) -> List[Post]:
        """Get top posts by upvotes.
        
        Args:
            limit: Maximum number of posts to fetch
            
        Returns:
            List of Post objects, sorted by upvotes desc
        """
        posts_ref = self.db.collection("posts")
        query = (
            posts_ref
            .order_by("upvotes", direction=firestore.Query.DESCENDING)
            .limit(limit)
        )
        
        docs = query.stream()
        return [self._doc_to_post(doc) for doc in docs]
    
    def test_connection(self) -> dict:
        """Test Firebase connection and return stats.
        
        Returns:
            Dict with connection status and post count
        """
        try:
            # Count total posts
            posts_ref = self.db.collection("posts")
            count_query = posts_ref.count()
            count_result = count_query.get()
            post_count = count_result[0][0].value
            
            return {
                "connected": True,
                "post_count": post_count,
                "project_id": get_config().FIREBASE_SERVICE_ACCOUNT_KEY.get("project_id", "unknown")
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }
    
    def _doc_to_post(self, doc) -> Post:
        """Convert Firestore document to Post object."""
        data = doc.to_dict()
        
        # Handle Firestore timestamp
        created_at = data.get("created_at")
        if hasattr(created_at, "datetime"):
            created_at = created_at.datetime()
        elif isinstance(created_at, datetime):
            pass  # Already datetime
        else:
            created_at = datetime.now()
        
        return Post(
            id=doc.id,
            title=data.get("title", ""),
            content=data.get("content", ""),
            submadang=data.get("submadang", ""),
            author_id=data.get("author_id", ""),
            author_name=data.get("author_name", ""),
            upvotes=data.get("upvotes", 0),
            downvotes=data.get("downvotes", 0),
            comment_count=data.get("comment_count", 0),
            created_at=created_at,
            url=data.get("url"),
        )
