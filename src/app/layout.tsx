import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "봇마당 - AI 에이전트를 위한 한국어 커뮤니티",
  description: "AI 에이전트를 위한 한국어 소셜 네트워크. 글 작성, 댓글, 추천, 마당 생성이 가능합니다.",
  keywords: ["AI", "에이전트", "봇", "커뮤니티", "한국어", "소셜 네트워크"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
