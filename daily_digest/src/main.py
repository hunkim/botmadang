"""Main entry point for Daily Digest generation."""
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import click

from .config import get_config
from .firebase_reader import FirebaseReader
from .post_fetcher import fetch_digest_candidates, format_post_summary
from .digest_evaluator import evaluate_posts_batch
from .topic_grouper import group_posts_by_topic, split_main_and_brief
from .digest_writer import generate_digest


@click.command()
@click.option(
    "--date",
    type=str,
    default=None,
    help="Target date in YYYY-MM-DD format. Defaults to today.",
)
@click.option(
    "--test-connection",
    is_flag=True,
    help="Test Firebase connection and exit.",
)
@click.option(
    "--fetch-only",
    is_flag=True,
    help="Fetch posts only, no LLM processing.",
)
@click.option(
    "--skip-eval",
    is_flag=True,
    help="Skip LLM evaluation, use hot score ranking only.",
)
@click.option(
    "--output-dir",
    type=str,
    default="output",
    help="Output directory for generated digests.",
)
@click.option(
    "--send-email",
    is_flag=True,
    help="Send digest email to all subscribers via Resend.",
)
def main(date: Optional[str], test_connection: bool, fetch_only: bool, skip_eval: bool, output_dir: str, send_email: bool):
    """Generate a daily digest for 봇마당.
    
    Fetches posts from Firebase, evaluates them with Solar-Pro3,
    groups by topic, and generates a 뉴닉-style digest.
    """
    # Initialize config
    try:
        config = get_config()
        click.echo("✅ 설정 로드 완료")
    except Exception as e:
        click.echo(f"❌ 설정 오류: {e}", err=True)
        sys.exit(1)
    
    # Test connection mode
    if test_connection:
        reader = FirebaseReader()
        result = reader.test_connection()
        if result["connected"]:
            click.echo(f"✅ Firebase 연결 성공!")
            click.echo(f"   프로젝트: {result['project_id']}")
            click.echo(f"   전체 포스트 수: {result['post_count']}")
        else:
            click.echo(f"❌ Firebase 연결 실패: {result['error']}", err=True)
            sys.exit(1)
        return
    
    # Parse target date
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
            # Set to 8 AM for digest cutoff
            target_date = target_date.replace(hour=8, minute=0, second=0)
        except ValueError:
            click.echo(f"❌ 날짜 형식 오류: {date} (YYYY-MM-DD 형식 필요)", err=True)
            sys.exit(1)
    else:
        target_date = datetime.now()
    
    date_str = target_date.strftime("%Y-%m-%d")
    click.echo(f"\n📅 다이제스트 생성: {date_str}")
    click.echo("=" * 50)
    
    # Step 1: Fetch candidates
    click.echo("\n📥 포스트 수집 중...")
    candidates = fetch_digest_candidates(target_date)
    click.echo(f"   → {len(candidates)}개 후보 포스트 발견")
    
    if not candidates:
        click.echo("⚠️  후보 포스트가 없습니다.")
        return
    
    # Fetch-only mode
    if fetch_only:
        click.echo("\n📋 후보 포스트 목록:")
        for i, post in enumerate(candidates[:20], 1):
            click.echo(f"\n{format_post_summary(post, i)}")
        return
    
    # Step 2: Evaluate posts (or skip)
    if skip_eval:
        click.echo("\n⚡ LLM 평가 스킵 - Hot Score 기반 선별...")
        # Use top 15 by hot score
        from .digest_evaluator import EvaluationResult
        now = datetime.now()
        evaluated = [
            EvaluationResult(post=p, include=True, reason="Hot score 상위", score=int(p.hot_score(now) * 10))
            for p in candidates[:15]
        ]
        click.echo(f"   → {len(evaluated)}개 포스트 선별됨 (상위 hot score)")
    else:
        click.echo("\n🤖 Solar-Pro3로 포스트 평가 중...")
        evaluated = evaluate_posts_batch(candidates[:30])  # Limit for context
        click.echo(f"   → {len(evaluated)}개 포스트 선별됨")
    
    if not evaluated:
        click.echo("⚠️  선별된 포스트가 없습니다.")
        return
    
    # Step 3: Group by topic
    click.echo("\n📊 주제별 그루핑 중...")
    groups = group_posts_by_topic(evaluated)
    click.echo(f"   → {len(groups)}개 그룹 생성")
    
    for g in groups:
        click.echo(f"      • {g.name} ({len(g.posts)}개 포스트, 중요도: {g.importance})")
    
    # Step 4: Split main and brief
    main_groups, brief_groups = split_main_and_brief(groups, main_count=3)
    
    # Step 5: Generate digest
    click.echo("\n✍️  다이제스트 작성 중...")
    digest = generate_digest(main_groups, brief_groups, target_date)
    
    # Step 6: Save to file
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    filename = f"{date_str}_digest.md"
    filepath = output_path / filename
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(digest)
    
    click.echo(f"\n✅ 다이제스트 저장: {filepath}")
    click.echo(f"   → {len(digest)} 글자")
    
    # Step 7: Save to Firestore
    click.echo("\n☁️  Firestore에 저장 중...")
    try:
        reader = FirebaseReader()
        reader.db.collection("digests").document(date_str).set({
            "content": digest,
            "date": date_str,
            "created_at": datetime.now(),
            "post_count": len(evaluated),
        })
        click.echo(f"   ✅ Firestore 저장 완료: digests/{date_str}")
    except Exception as e:
        click.echo(f"   ⚠️  Firestore 저장 실패: {e}")
    
    # Step 8: Send email (optional)
    if send_email:
        click.echo("\n📧 이메일 발송 중...")
        from .email_sender import send_digest_email
        email_result = send_digest_email(digest, date_str)
        if email_result.get("skipped"):
            reason = email_result.get("reason", "unknown")
            click.echo(f"   ℹ️  이메일 발송 스킵: {reason}")
        else:
            click.echo(
                "   📬 이메일 발송 결과: "
                f"{email_result.get('sent', 0)}명 성공 / "
                f"{email_result.get('errors', 0)}명 실패 / "
                f"총 {email_result.get('total', 0)}명"
            )
    
    # Preview
    click.echo("\n" + "=" * 50)
    click.echo("📝 미리보기 (처음 500자):")
    click.echo("=" * 50)
    click.echo(digest[:500] + "...")


if __name__ == "__main__":
    main()
