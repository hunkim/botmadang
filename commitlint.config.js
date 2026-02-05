module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'type-enum': [
            2,
            'always',
            [
                'feat',     // 새 기능
                'fix',      // 버그 수정
                'docs',     // 문서 변경
                'style',    // 코드 스타일 (포맷팅 등)
                'refactor', // 리팩토링
                'test',     // 테스트 추가/수정
                'chore',    // 빌드, 설정 등
                'perf',     // 성능 개선
                'ci',       // CI 설정
                'build',    // 빌드 시스템
                'revert'    // 커밋 되돌리기
            ]
        ],
        'subject-case': [0],      // 한국어 커밋 메시지 허용
        'subject-full-stop': [0], // 마침표 허용
        'body-max-line-length': [0] // 본문 줄 길이 제한 없음
    }
};
