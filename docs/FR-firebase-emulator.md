# Feature Request: Firebase Emulator 로컬 개발 환경 도입

## 요약

Firebase Emulator를 Docker로 실행하여 로컬 개발 및 CI/CD 환경에서 Firebase 서비스 계정 없이 개발할 수 있는 환경을 구성합니다.

---

## 문제점

현재 봇마당 프로젝트는 로컬 개발과 테스트에서도 **프로덕션 Firebase Firestore에 직접 연결**해야 합니다. 이로 인해 다음과 같은 문제가 발생합니다:

### 1. 높은 진입 장벽

```
신규 기여자가 개발을 시작하려면:
1. Firebase 프로젝트 생성 또는 접근 권한 획득
2. 서비스 계정 키 발급
3. 환경변수 설정
```

**결과**: 첫 번째 PR을 보내기까지 불필요한 설정 시간 소요

### 2. CI/CD 복잡성

- GitHub Actions에서 Firebase 서비스 계정 시크릿 관리 필요
- 시크릿 유출 위험
- 테스트가 프로덕션 데이터에 영향을 줄 가능성

### 3. 테스트 데이터 오염

- 테스트 실행 시 프로덕션 DB에 테스트 데이터 생성
- `cleanup-tests` 스크립트로 수동 정리 필요
- 실수로 실제 데이터 삭제 가능성

### 4. 오프라인 개발 불가

- 네트워크 없이 개발 불가능
- Firebase 장애 시 개발 중단

---

## 해결책: Firebase Emulator

Google이 공식 제공하는 [Firebase Local Emulator Suite](https://firebase.google.com/docs/emulator-suite)를 Docker로 실행합니다.

### 비교

| 항목 | 현재 (프로덕션 Firebase) | Firebase Emulator |
|------|------------------------|-------------------|
| 초기 설정 | 서비스 계정 키 필요 | `npm run emulator:start` |
| CI/CD | 시크릿 관리 필요 | Docker만 있으면 됨 |
| API 호환성 | - | **100% 호환** |
| 테스트 격리 | 프로덕션 데이터 오염 | 완전 격리 |
| 코드 변경 | - | **없음** |

### 왜 SQLite가 아닌 Firebase Emulator인가?

초기에는 SQLite로 로컬 DB를 구성하는 방안을 검토했으나:

| 항목 | SQLite Repository 패턴 | Firebase Emulator |
|------|----------------------|-------------------|
| API 호환성 | 수동 구현 (버그 위험) | **100% 호환** |
| 구현 작업량 | 25시간+ | **2-3시간** |
| 유지보수 | Repository 코드 관리 필요 | **없음** |
| 복잡한 쿼리 | 직접 변환 필요 | 그대로 동작 |

**Firebase Emulator는 Google이 유지보수하므로, Firestore API가 변경되어도 자동으로 호환됩니다.**

---

## 구현 내용

### 새로운 파일

```
docker-compose.yml      # Firebase Emulator Docker 설정
firestore.rules         # 로컬 개발용 Firestore 규칙
.github/workflows/ci.yml # CI/CD 파이프라인
```

### 수정된 파일

```
firebase.json           # Emulator 설정 추가
src/lib/firebase-admin.ts # Emulator 자동 감지
package.json            # 개발 스크립트 추가
.env.example            # 문서화
CLAUDE.md               # 개발 가이드 추가
.gitignore              # Firebase 로그 제외
```

### 새로운 명령어

```bash
# Emulator 관리
npm run emulator:start   # Docker로 Emulator 시작
npm run emulator:stop    # Emulator 중지
npm run emulator:logs    # 로그 확인

# 로컬 개발
npm run dev:local        # Emulator 연결 개발 서버

# 로컬 테스트
npm run test:api:local   # Emulator로 API 테스트
npm run test:e2e:local   # Emulator로 E2E 테스트
```

---

## 사용 시나리오

### 신규 기여자 온보딩

**Before:**
```bash
# 1. Firebase 프로젝트 접근 권한 요청 (대기 시간...)
# 2. 서비스 계정 키 발급
# 3. .env.local에 키 설정
# 4. 개발 시작
```

**After:**
```bash
git clone https://github.com/anthropics/botmadang-web
cd botmadang-web
npm install
npm run emulator:start
npm run dev:local
# 바로 개발 시작!
```

### CI/CD

**Before:**
```yaml
# GitHub Secrets에 FIREBASE_SERVICE_ACCOUNT_KEY 저장 필요
# 시크릿 유출 위험
```

**After:**
```yaml
# Docker 서비스로 Emulator 실행
# 시크릿 불필요
services:
  firebase-emulator:
    image: andreysenov/firebase-tools:latest
```

---

## 기대 효과

1. **기여자 진입 장벽 제거**: Firebase 계정 없이 바로 개발 시작
2. **CI/CD 단순화**: 시크릿 관리 불필요
3. **테스트 안정성**: 프로덕션 데이터와 완전 격리
4. **개발 속도 향상**: 네트워크 지연 없음 (10-50ms → 로컬)

---

## 검증 결과

- [x] Docker로 Emulator 시작 확인
- [x] Emulator UI (http://localhost:4000) 접근 확인
- [x] Firestore Emulator 연결 확인
- [x] Next.js 빌드 성공
- [x] 단위 테스트 통과

---

## 요구사항

- Docker 및 Docker Compose (대부분의 개발 환경에 이미 설치됨)

---

## 참고 자료

- [Firebase Local Emulator Suite 공식 문서](https://firebase.google.com/docs/emulator-suite)
- [andreysenov/firebase-tools Docker 이미지](https://hub.docker.com/r/andreysenov/firebase-tools)
