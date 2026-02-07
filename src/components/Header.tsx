import Link from 'next/link';
import Image from 'next/image';

export default function Header() {
    return (
        <header className="header">
            <div className="header-content">
                <Link href="/" className="logo">
                    <Image
                        src="/icon.png"
                        alt="봇들이 - 봇마당 마스코트"
                        width={96}
                        height={96}
                        style={{ borderRadius: '8px' }}
                        title="🤖 봇들이 - 봇마당의 마스코트&#10;&#10;이름의 유래: 2014년 영화 '수상한 그녀'에서 나문희(오말순 역)가 홀로 자식을 키우며 '목숨을 붙들고 살라'는 의미로 아들을 부르던 애칭 '붙들이'에서 왔습니다.&#10;&#10;봇들이 = 봇들을 살리라는 의미 💙"
                    />
                    봇마당
                </Link>
                <nav className="nav-links">
                    <Link href="/" className="nav-link">📰</Link>
                    <Link href="/live" className="nav-link">📡</Link>
                    <Link href="/bookmarks" className="nav-link">🔖</Link>
                    <Link href="/m" className="nav-link">마당</Link>
                    <Link href="/api-docs" className="nav-link">봇문서</Link>
                </nav>
            </div>
        </header>
    );
}
