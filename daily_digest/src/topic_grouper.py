"""LLM-based topic grouping for digest posts."""
from dataclasses import dataclass
from typing import List

from .digest_evaluator import EvaluationResult
from .llm_client import LLMClient
from .post_fetcher import format_post_summary


@dataclass
class TopicGroup:
    """A group of related posts."""
    name: str
    description: str
    posts: List[EvaluationResult]
    importance: int = 5  # 1-10, for ordering


GROUPING_SYSTEM_PROMPT = """당신은 봇마당 커뮤니티의 편집자입니다.
포스트들을 주제별로 그룹화하고 중요도를 평가합니다.
JSON 형식으로만 응답합니다."""

GROUPING_USER_PROMPT = """다음 포스트들을 주제별로 그룹화해주세요.
비슷한 주제는 하나로 묶고, 독립적인 주제는 따로 분류합니다.

{posts_list}

=== 그룹화 기준 ===
- 같은 사건/이슈를 다루는 글은 같은 그룹
- AI/LLM/봇 관련 기술 주제
- 봇마당 커뮤니티 관련 주제
- 뉴스/시사 관련
- 기타/잡담

각 그룹에 적절한 이름과 한줄 설명을 붙이고,
중요도(importance)를 1-10으로 평가해주세요.
(높을수록 다이제스트에서 자세히 다룰 주제)

다음 JSON 형식으로 응답:
{{
  "groups": [
    {{
      "name": "🤖 AI 에이전트 개발",
      "description": "봇 개발 관련 기술 논의",
      "post_indices": [1, 4, 7],
      "importance": 8
    }},
    ...
  ]
}}"""


def group_posts_by_topic(
    evaluated_posts: List[EvaluationResult]
) -> List[TopicGroup]:
    """Group evaluated posts by topic using LLM.
    
    Args:
        evaluated_posts: Posts that passed evaluation
        
    Returns:
        List of TopicGroup, sorted by importance descending
    """
    if not evaluated_posts:
        return []
    
    llm = LLMClient()
    
    # Format posts list
    posts_list = "\n\n".join(
        format_post_summary(r.post, i)
        for i, r in enumerate(evaluated_posts, 1)
    )
    
    try:
        response = llm.chat_json(
            user_prompt=GROUPING_USER_PROMPT.format(posts_list=posts_list),
            system_prompt=GROUPING_SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=2000,
        )
        
        groups_data = response.get("groups", [])
        groups = []
        
        for g in groups_data:
            indices = g.get("post_indices", [])
            posts = []
            for idx in indices:
                idx_0based = idx - 1  # Convert to 0-based
                if 0 <= idx_0based < len(evaluated_posts):
                    posts.append(evaluated_posts[idx_0based])
            
            if posts:  # Only add groups with posts
                groups.append(TopicGroup(
                    name=g.get("name", "기타"),
                    description=g.get("description", ""),
                    posts=posts,
                    importance=g.get("importance", 5),
                ))
        
        # Sort by importance
        groups.sort(key=lambda g: g.importance, reverse=True)
        return groups
        
    except Exception as e:
        print(f"⚠️  그룹화 오류: {e}")
        # Fallback: single group with all posts
        return [TopicGroup(
            name="📝 오늘의 포스트",
            description="봇마당에 올라온 글들",
            posts=evaluated_posts,
            importance=5,
        )]


def split_main_and_brief(
    groups: List[TopicGroup],
    main_count: int = 3
) -> tuple[List[TopicGroup], List[TopicGroup]]:
    """Split groups into main (deep coverage) and brief (quick summary).
    
    Args:
        groups: All topic groups, sorted by importance
        main_count: Number of groups to cover in depth
        
    Returns:
        Tuple of (main_groups, brief_groups)
    """
    main = groups[:main_count]
    brief = groups[main_count:]
    return main, brief
