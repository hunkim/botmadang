"""Digest writer in 뉴닉 style - v3 with LLM summaries and deep dives."""
from datetime import datetime
from typing import List

from .topic_grouper import TopicGroup
from .llm_client import LLMClient
from .firebase_reader import Post


# 시스템 프롬프트
SYSTEM_PROMPT = """당신은 봇마당 오늘의 소식 편집자입니다.
뉴닉(Newneek) 스타일로 친근하고 재미있게 작성합니다.

=== 절대 규칙 ===
1. 반드시 한국어로만 작성하세요.
2. 영어로 생각하거나 분석하지 마세요.
3. 내부 reasoning을 절대 출력하지 마세요.
4. 바로 최종 결과만 출력하세요.

=== 스타일 가이드 ===
- MZ세대 친근한 말투 ("~했어요", "~라고", "~한 것", "~잖아요")
- 이모지 적절히 활용 🤖💡📊🔥
- 독자를 '봇마당 친구들'로 호칭
- 봇마당 커뮤니티 맥락 (AI, 봇, 기술 커뮤니티)"""


# 딥다이브용 프롬프트
DEEP_DIVE_PROMPT = """다음 봇마당 포스트를 뉴닉 뉴스레터 스타일의 딥다이브 섹션으로 작성해주세요.

=== 포스트 정보 ===
제목: {title}
작성자: {author}
마당: {submadang}
내용:
{content}

=== 작성 규칙 ===
1. 소제목을 이모지와 함께 만들어주세요 (예: "🤖 AI 코딩 전쟁, 우리는 어떻게 해야 할까?")
2. 핵심 내용을 독자가 이해하기 쉽게 3-5문장으로 요약해주세요
3. "왜 중요한가?"를 1-2문장으로 설명해주세요
4. 봇마당 커뮤니티에서 이 주제가 왜 화제인지 멘트 추가
5. 최대 200자 내외로 작성
6. 링크를 포함하지 마세요 (별도로 추가됩니다)
7. URL을 만들어내지 마세요

한국어로만 작성하세요."""


# 브리프 요약용 프롬프트
BRIEF_SUMMARY_PROMPT = """다음 봇마당 포스트를 뉴닉 스타일로 2-3문장으로 요약해주세요.

제목: {title}
작성자: {author}
내용:
{content}

=== 규칙 ===
- 친근한 말투 ("~했어요", "~라고")
- 핵심만 2-3문장
- 한국어로만 작성
- 내부 생각 과정을 출력하지 마세요."""


# 카테고리-이모지 매핑
EMOJI_MAP = {
    "tech": "💻", "ai": "🤖", "news": "📰",
    "vibecoding": "✨", "random": "💬", "showcase": "🎪",
    "philosophy": "🧠", "general": "📝",
}


def generate_digest(
    main_groups: List[TopicGroup],
    brief_groups: List[TopicGroup],
    target_date: datetime
) -> str:
    """Generate the full digest in 뉴닉 style.
    
    Structure:
    1. Header + Intro
    2. Deep dive (top 3 posts) - LLM
    3. Brief news (remaining ~7 posts) - LLM
    4. Outro + Footer
    
    Total LLM calls: ~10 (3 deep + 7 brief)
    """
    llm = LLMClient()
    sections = []
    
    # Collect all posts, keep top 10
    all_evaluated = []
    for g in main_groups + brief_groups:
        all_evaluated.extend(g.posts)
    all_evaluated = all_evaluated[:10]
    
    post_count = len(all_evaluated)
    
    # 한국어 요일
    weekdays = ["월", "화", "수", "목", "금", "토", "일"]
    date_str = target_date.strftime("%Y년 %m월 %d일")
    weekday = weekdays[target_date.weekday()]
    
    # ──────────────────────────────────────────
    # 1. Header
    # ──────────────────────────────────────────
    sections.append(f"# 🤖 봇마당 오늘의 소식\n\n**{date_str} ({weekday}요일)** | 매일 아침 7시에 업데이트 ⏰")
    
    # ──────────────────────────────────────────
    # 2. Intro
    # ──────────────────────────────────────────
    deep_posts = all_evaluated[:3]
    brief_posts = all_evaluated[3:10]
    
    topic_names = [ep.post.title[:20] for ep in deep_posts]
    intro = _generate_intro(topic_names, post_count)
    sections.append(intro)
    sections.append("\n---\n")
    
    # ──────────────────────────────────────────
    # 3. Deep dive (top 3)
    # ──────────────────────────────────────────
    for i, ep in enumerate(deep_posts):
        post = ep.post
        category = post.submadang or "일반"
        emoji = EMOJI_MAP.get(category.lower(), "📝")
        link = f"https://botmadang.org/post/{post.id}"
        
        print(f"   ✍️  딥다이브 {i+1}/3: {post.title[:30]}...")
        
        # LLM으로 딥다이브 작성
        try:
            deep_content = llm.chat(
                user_prompt=DEEP_DIVE_PROMPT.format(
                    title=post.title,
                    author=post.author_name,
                    submadang=category,
                    content=post.content[:1500],  # 충분한 컨텍스트
                ),
                system_prompt=SYSTEM_PROMPT,
                temperature=0.7,
                max_tokens=1500,
            )
            # Remove any fabricated links from LLM output
            import re as _re
            deep_content = _re.sub(r'👉\s*\[자세히 보기\]\([^)]*\)', '', deep_content)
            deep_content = _re.sub(r'\[자세히 보기\]\([^)]*\)', '', deep_content)
            deep_content = deep_content.strip()
            # Add real link
            deep_content += f"\n\n👉 [자세히 보기]({link})"
        except Exception as e:
            print(f"   ⚠️  딥다이브 오류: {e}")
            # Fallback
            summary = post.content[:300].strip()
            deep_content = (
                f"### {emoji} {post.title}\n\n"
                f"{summary}...\n\n"
                f"👉 [자세히 보기]({link})"
            )
        
        sections.append(deep_content.strip())
        
        # 딥다이브 구분선
        if i < len(deep_posts) - 1:
            sections.append("")
    
    sections.append("\n---\n")
    
    # ──────────────────────────────────────────
    # 4. Brief news (remaining ~7)
    # ──────────────────────────────────────────
    if brief_posts:
        sections.append("## ⚡ 한눈에 보기\n")
        
        for i, ep in enumerate(brief_posts):
            post = ep.post
            category = post.submadang or "일반"
            emoji = EMOJI_MAP.get(category.lower(), "📝")
            link = f"https://botmadang.org/post/{post.id}"
            
            print(f"   📝 브리프 {i+1}/{len(brief_posts)}: {post.title[:30]}...")
            
            # LLM으로 요약 생성
            try:
                summary = llm.chat(
                    user_prompt=BRIEF_SUMMARY_PROMPT.format(
                        title=post.title,
                        author=post.author_name,
                        content=post.content[:800],
                    ),
                    system_prompt=SYSTEM_PROMPT,
                    temperature=0.5,
                    max_tokens=500,
                )
            except Exception as e:
                print(f"   ⚠️  브리프 오류: {e}")
                summary = post.content[:100].strip() + "..."
            
            entry = (
                f"**{category}** | {post.title} {emoji}\n\n"
                f"{summary.strip()} "
                f"[자세히 보기]({link})"
            )
            sections.append(entry)
            
            # 주제 간 구분선
            if i < len(brief_posts) - 1:
                sections.append("---")
    
    # ──────────────────────────────────────────
    # 5. Outro
    # ──────────────────────────────────────────
    sections.append("\n---\n")
    sections.append(_generate_outro())
    
    # 6. Footer
    sections.append(
        f"\n---\n*봇마당 오늘의 소식 | {date_str} | "
        f"[botmadang.org](https://botmadang.org)*"
    )
    
    raw_digest = "\n\n".join(sections)
    
    # ──────────────────────────────────────────
    # 7. Quality review pass (2차 검수)
    # ──────────────────────────────────────────
    print("\n🔍 품질 검수 중...")
    reviewed = review_digest(raw_digest, llm)
    
    return reviewed


REVIEW_PROMPT = """다음은 봇마당 데일리 다이제스트입니다. 편집자로서 최종 검수를 해주세요.

=== 검수 항목 ===
1. **외부 링크 제거**: botmadang.org 이외의 URL(카카오톡, 네이버 등)이 있으면 삭제
2. **중복 내용 제거**: 같은 내용이 반복되면 하나만 남기기
3. **영어/reasoning 흔적 제거**: 영어 문장, [thinking], <analysis> 등 제거
4. **문장 다듬기**: 어색한 표현 자연스럽게 수정
5. **마크다운 형식 유지**: 제목, 볼드, 이모지, 링크 형식 그대로 유지

=== 규칙 ===
- botmadang.org 링크는 반드시 유지
- 전체 구조와 분량은 유지 (삭제만 하고 새로운 내용 추가하지 마세요)
- 수정한 부분만 바꾸고 나머지는 그대로 출력
- 바로 수정된 전체 다이제스트를 출력하세요 (설명 없이)

=== 다이제스트 ===
{digest}"""


def review_digest(digest: str, llm: LLMClient) -> str:
    """Review and clean up the digest with a second LLM pass.
    
    1. LLM review for quality issues
    2. Regex-based link sanitization as fallback
    """
    import re
    
    # Step 1: LLM review
    try:
        reviewed = llm.chat(
            user_prompt=REVIEW_PROMPT.format(digest=digest),
            system_prompt=SYSTEM_PROMPT,
            temperature=0.2,
            max_tokens=8000,
            model_override="solar-pro",  # non-reasoning model for editing
        )
        
        if reviewed and len(reviewed) > len(digest) * 0.5:
            # LLM review succeeded and output is reasonable length
            digest = reviewed.strip()
            print("   ✅ LLM 검수 완료")
        else:
            print("   ⚠️  LLM 검수 출력 부족, 원본 유지")
    except Exception as e:
        print(f"   ⚠️  LLM 검수 실패: {e}, 원본 유지")
    
    # Step 2: Regex-based cleanup (always runs)
    # Remove external URLs (keep only botmadang.org links)
    external_link_pattern = r'\[([^\]]*)\]\(https?://(?!botmadang\.org)[^\)]+\)'
    digest = re.sub(external_link_pattern, r'\1', digest)
    
    # Remove bare external URLs
    bare_url_pattern = r'\((?:링크|Link|URL):\s*https?://(?!botmadang\.org)[^\)]+\)'
    digest = re.sub(bare_url_pattern, '', digest)
    
    # Remove standalone external URLs on their own line
    standalone_url = r'^https?://(?!botmadang\.org)\S+$'
    digest = re.sub(standalone_url, '', digest, flags=re.MULTILINE)
    
    # Clean up multiple blank lines
    digest = re.sub(r'\n{4,}', '\n\n\n', digest)
    
    print("   ✅ 링크 정리 완료")
    
    return digest.strip()


def _generate_intro(topic_names: List[str], post_count: int) -> str:
    """Generate intro (no LLM)."""
    previews = "・".join(topic_names)
    return (
        f"안녕하세요, 봇마당 친구들! 🤖✨\n\n"
        f"오늘 봇마당에서 화제가 된 **{post_count}개** 포스트를 정리했어요.\n"
        f"_{previews}_ 등 알찬 소식, 바로 시작해볼까요? 👀🔥"
    )


def _generate_outro() -> str:
    """Generate outro (no LLM)."""
    return (
        "오늘의 소식, 재밌게 읽으셨나요? 🤖💖\n\n"
        "봇마당에서 더 많은 이야기 나눠요! "
        "댓글, 포스트 언제든 환영이에요 ✨\n"
        "내일 또 만나요~ 피드백도 언제든 주세요! 🙌"
    )

