"""LLM-based post evaluation for digest inclusion."""
from dataclasses import dataclass
from typing import List

from .firebase_reader import Post
from .llm_client import LLMClient
from .post_fetcher import format_post_summary


@dataclass
class EvaluationResult:
    """Result of post evaluation."""
    post: Post
    include: bool
    reason: str
    score: int  # 1-10


EVALUATION_SYSTEM_PROMPT = """당신은 봇마당 커뮤니티의 편집자입니다. 
일일 다이제스트에 포함할 포스트를 선별합니다.
JSON 형식으로만 응답합니다."""

EVALUATION_USER_PROMPT = """다음 포스트가 일일 다이제스트에 포함되면 좋을지 평가해주세요.

{post_info}

=== 평가 기준 ===
1. 정보 가치: 새로운 정보나 인사이트가 있는가?
2. 커뮤니티 관심: AI/봇/기술 관련 주제인가?
3. 토론 가치: 다른 봇/유저가 관심 가질 내용인가?
4. 품질: 잘 작성되었는가?

=== 제외 기준 ===
- 단순 인사/테스트 포스트
- 중복/반복 내용
- 저품질 스팸

다음 JSON 형식으로 응답:
{{"include": true/false, "reason": "한줄 이유", "score": 1-10}}"""


def evaluate_posts(posts: List[Post]) -> List[EvaluationResult]:
    """Evaluate posts for digest inclusion using LLM.
    
    Args:
        posts: List of candidate posts
        
    Returns:
        List of EvaluationResult, only including posts marked for inclusion
    """
    llm = LLMClient()
    results = []
    
    for i, post in enumerate(posts, 1):
        post_info = format_post_summary(post, i)
        
        try:
            response = llm.chat_json(
                user_prompt=EVALUATION_USER_PROMPT.format(post_info=post_info),
                system_prompt=EVALUATION_SYSTEM_PROMPT,
                temperature=0.3,
            )
            
            result = EvaluationResult(
                post=post,
                include=response.get("include", False),
                reason=response.get("reason", ""),
                score=response.get("score", 5),
            )
            results.append(result)
            
        except Exception as e:
            # On error, skip this post
            print(f"⚠️  포스트 평가 오류 [{post.id}]: {e}")
            continue
    
    # Filter to only included posts, sorted by score
    included = [r for r in results if r.include]
    included.sort(key=lambda r: r.score, reverse=True)
    
    return included


# Batch evaluation for efficiency
BATCH_EVALUATION_PROMPT = """다음 포스트들 중 봇마당 일일 다이제스트에 포함할 것들을 선별해주세요.

{posts_list}

=== 선별 기준 ===
- 정보 가치가 있는 포스트 (새로운 정보, 인사이트)
- AI/봇/기술 관련 흥미로운 주제
- 커뮤니티에서 토론할 가치가 있는 내용
- 잘 작성된 품질 좋은 글

=== 제외 대상 ===
- 단순 인사/테스트
- 중복/반복 내용
- 저품질 스팸

다음 JSON 형식으로 응답 (최대 15개 선별):
{{
  "selected": [
    {{"index": 1, "reason": "선정 이유", "score": 8}},
    ...
  ]
}}"""


def evaluate_posts_batch(posts: List[Post]) -> List[EvaluationResult]:
    """Evaluate posts in batch for efficiency.
    
    Args:
        posts: List of candidate posts (max ~30 for context limits)
        
    Returns:
        List of EvaluationResult for selected posts
    """
    llm = LLMClient()
    
    # Format posts list
    posts_list = "\n\n".join(
        format_post_summary(p, i) 
        for i, p in enumerate(posts, 1)
    )
    
    try:
        response = llm.chat_json(
            user_prompt=BATCH_EVALUATION_PROMPT.format(posts_list=posts_list),
            system_prompt=EVALUATION_SYSTEM_PROMPT,
            temperature=0.3,
            max_tokens=3000,
        )
        
        # Handle both {"selected": [...]} and direct list [...] formats
        if isinstance(response, list):
            selected = response
        else:
            selected = response.get("selected", [])
        
        results = []
        
        for item in selected:
            idx = item.get("index", 0) - 1  # Convert to 0-based
            if 0 <= idx < len(posts):
                results.append(EvaluationResult(
                    post=posts[idx],
                    include=True,
                    reason=item.get("reason", ""),
                    score=item.get("score", 5),
                ))
        
        # Sort by score
        results.sort(key=lambda r: r.score, reverse=True)
        return results
        
    except Exception as e:
        print(f"⚠️  배치 평가 오류: {e}")
        # Fallback to individual evaluation
        return evaluate_posts(posts[:15])
