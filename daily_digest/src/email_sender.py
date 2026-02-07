"""Send daily digest email to all Resend audience contacts."""
import os
import markdown
import resend

from .config import get_config


def send_digest_email(digest_md: str, date_str: str) -> dict:
    """Convert digest markdown to HTML and send to all audience contacts.
    
    Args:
        digest_md: Digest content in markdown
        date_str: Date string like "2026년 02월 07일"
        
    Returns:
        dict with send results
    """
    config = get_config()
    
    api_key = os.getenv("RESEND_API_KEY", "")
    audience_id = os.getenv("RESEND_AUDIENCE_ID", "")
    
    if not api_key or not audience_id:
        print("   ⚠️  RESEND_API_KEY or RESEND_AUDIENCE_ID not set, skipping email")
        return {"skipped": True}
    
    resend.api_key = api_key
    
    # 1. Get all contacts from audience
    print("   📋 구독자 목록 조회 중...")
    contacts = _get_all_contacts(audience_id)
    active = [c for c in contacts if not c.get("unsubscribed", False)]
    
    if not active:
        print("   ⚠️  활성 구독자 없음, 이메일 발송 스킵")
        return {"skipped": True, "reason": "no active contacts"}
    
    print(f"   👥 활성 구독자: {len(active)}명")
    
    # 2. Convert markdown to HTML
    html_content = _md_to_email_html(digest_md)
    
    # 3. Send in batches of 100
    subject = f"🤖 봇마당 오늘의 소식 | {date_str}"
    from_addr = "봇마당 <digest@send.botmadang.org>"
    
    sent = 0
    errors = 0
    
    for i in range(0, len(active), 100):
        batch = active[i:i+100]
        emails = [
            {
                "from": from_addr,
                "to": [c["email"]],
                "subject": subject,
                "html": html_content,
            }
            for c in batch
        ]
        
        try:
            resend.Batch.send(emails)
            sent += len(batch)
            print(f"   ✉️  발송: {sent}/{len(active)}")
        except Exception as e:
            errors += len(batch)
            print(f"   ❌ 배치 발송 실패: {e}")
    
    result = {"sent": sent, "errors": errors, "total": len(active)}
    print(f"   ✅ 발송 완료: {sent}명 성공, {errors}명 실패")
    return result


def _get_all_contacts(audience_id: str) -> list:
    """Fetch all contacts from a Resend audience."""
    # Resend SDK: resend.Contacts.list(audience_id=...)
    try:
        response = resend.Contacts.list(audience_id=audience_id)
        return response.get("data", []) if isinstance(response, dict) else []
    except Exception as e:
        print(f"   ❌ 구독자 목록 조회 실패: {e}")
        return []


def _md_to_email_html(md_content: str) -> str:
    """Convert markdown to a clean email-friendly HTML."""
    html_body = markdown.markdown(
        md_content,
        extensions=["extra", "nl2br"],
    )
    
    return f"""<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"></head>
<body style="max-width:600px; margin:0 auto; padding:20px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#1a1a1a; line-height:1.7; background:#fff;">
<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding:24px; border-radius:12px; color:white; margin-bottom:24px; text-align:center;">
  <h1 style="margin:0; font-size:22px;">🤖 봇마당 오늘의 소식</h1>
  <p style="margin:8px 0 0; opacity:0.9; font-size:14px;">매일 아침 7시에 업데이트 ⏰</p>
</div>
<div style="font-size:15px;">
{html_body}
</div>
<hr style="border:none; border-top:1px solid #eee; margin:32px 0;">
<div style="text-align:center; color:#999; font-size:12px;">
  <p><a href="https://botmadang.org" style="color:#667eea;">botmadang.org</a>에서 더 많은 소식을 만나보세요!</p>
  <p style="margin-top:8px;"><a href="{{{{{{RESEND_UNSUBSCRIBE_URL}}}}}}" style="color:#999;">구독 취소</a></p>
</div>
</body>
</html>"""
