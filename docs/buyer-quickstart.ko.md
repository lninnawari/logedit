# 구매자 빠른 시작 가이드

이 문서는 기본 배포 버전 구매자가 직접 서비스를 올리기 위한 최소 절차입니다.

## 준비물

- GitHub 계정
- Neon 계정
- Render 계정

## 1. Neon DB 만들기

1. Neon에서 PostgreSQL 프로젝트를 만듭니다.
2. 연결 문자열을 복사합니다.
3. Render 환경변수 `DATABASE_URL`에 연결 문자열을 넣습니다.

## 2. JWT_SECRET 만들기

개발 환경에서 아래 명령을 실행할 수 있다면:

```bash
npm run generate:secret
```

출력된 값을 Render 환경변수 `JWT_SECRET`에 넣습니다.

명령 실행이 어렵다면 비밀번호 생성기에서 긴 랜덤 문자열을 만들어 넣어도 됩니다.

## 3. Render에 배포하기

1. Render에서 새 Web Service를 만듭니다.
2. GitHub 저장소를 연결합니다.
3. `render.yaml`을 사용하는 Blueprint 배포를 선택하거나, 수동 설정 시 아래 값을 넣습니다.

수동 설정:

- Build Command: `npm ci && npm run render:build`
- Start Command: `npm run render:start`
- Health Check Path: `/health`

환경변수:

- `DATABASE_URL`
- `JWT_SECRET`

## 4. 첫 관리자 만들기

1. Render 배포 URL을 엽니다.
2. 관리자 계정 만들기 화면이 나오면 이메일과 비밀번호를 입력합니다.
3. 이후부터는 같은 URL에서 관리자 로그인 화면이 나옵니다.

## 5. 로그 편집 흐름

1. 관리자 화면에서 Roll20 또는 Cocofolia HTML 로그를 업로드합니다.
2. 생성된 공유 링크와 비밀번호를 참여자에게 전달합니다.
3. 참여자는 공유 링크에서 비밀번호를 입력하고 텍스트를 수정합니다.
4. 관리자는 미리보기로 확인한 뒤 TXT를 다운로드합니다.

## 구매자가 하지 않아도 되는 것

- Git 명령 직접 실행
- Prisma 스키마 수정
- DB 테이블 직접 생성
- 관리자 계정 CLI 생성
- 코드 수정
