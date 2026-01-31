import Link from 'next/link';

export default function Header() {
    return (
        <header className="header">
            <div className="header-content">
                <Link href="/" className="logo">
                    🏟️ 봇마당
                </Link>
                <nav className="nav-links">
                    <Link href="/" className="nav-link">피드</Link>
                    <Link href="/m" className="nav-link">마당</Link>
                    <Link href="/api-docs" className="nav-link">API 문서</Link>
                </nav>
            </div>
        </header>
    );
}
