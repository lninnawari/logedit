# TRPG 로그 편집·교정 프로그램 개발 명세서

> 이 문서는 AI 코딩 도구(Codex 등)에게 그대로 전달해서 개발을 진행하기 위한 문서입니다.
> 애매한 표현이 없도록 최대한 구체적으로 작성했습니다. 순서대로, 하나씩 완료 확인 후 다음으로 넘어가세요.

---

## 0. 프로젝트가 무엇인지 (한 번에 이해하기)

TRPG(테이블톡 롤플레잉 게임) 세션 채팅 로그를 편집·교정해서 출판(인디자인) 원고용 TXT로 만드는 프로그램입니다.

**전체 흐름 (사람이 하는 일 기준)**:
1. 의뢰인(또는 판매용 구매자)이 채팅 로그 HTML을 프로그램에 업로드한다.
2. 프로그램이 자동으로 HTML을 분석해서, "채팅 메시지 하나 = 블록 하나" 단위로 쪼갠다.
3. 프로그램이 아주 기본적인 정리만 먼저 한다 (숨김 메시지 삭제 등). 맞춤법 교정 규칙(따옴표, 말줄임표 등)은 **아직 적용하지 않는다.**
4. 프로그램이 "공유 편집 링크"와 "비밀번호"를 자동 생성한다.
5. 이 링크와 비밀번호를 실제 TRPG 참여자들(2명 이상)에게 전달한다.
6. 참여자들이 브라우저에서 링크에 접속 → 비밀번호 입력 → 자기 로그를 확인하고, 필요하면 채팅 메시지를 더블클릭해서 텍스트만 수정한다. **이때 채팅창의 원래 디자인(색, 폰트, 말풍선 모양)은 그대로 유지된 채로 텍스트만 고쳐진다.**
7. 모든 참여자가 수정을 마치면, 관리자(의뢰를 받은 사람)가 "TXT 다운로드" 버튼을 누른다.
8. 이 순간에 비로소 모든 교정 규칙(따옴표 통일, 말줄임표 통일, 화자명 뒤에 탭 넣기 등)이 한꺼번에 자동 적용된다.
9. 완성된 순수 텍스트 파일(.txt)이 다운로드된다. 이걸 인디자인에 넣어서 책을 만든다.

**왜 교정을 마지막에 하는가?**
참여자가 4번 단계에서 손으로 직접 고친 문장에는 맞춤법 규칙(따옴표 모양 등)이 안 지켜져 있을 수 있습니다. 그래서 사람이 다 고친 "이후"에 프로그램이 마지막으로 한 번 더 전체를 훑으면서 규칙을 강제로 맞춰주는 것입니다. 이 순서를 바꾸면 안 됩니다.

**두 가지 버전을 만듭니다** (이 문서는 두 버전 모두에 적용됩니다. 다른 부분은 표시해 두었습니다):
- **판매용**: 구매자가 이 프로그램을 다운받아서, 본인이 직접 서버/DB를 연결해 사용. 설치형 앱(Electron) 제공.
- **개인용(운영자용)**: 개발자 본인이 타인의 로그 편집을 대행하는 서비스로 운영. 판매용과 동일한 기반 + 의뢰 접수용 관리자 화면 추가.

---

## 1. 절대 원칙 (이 부분은 코드 어디를 고치든 절대 위반하면 안 됨)

1. **DB가 유일한 원본이다.** 원본 HTML, 정리된 로그, 편집 중인 블록, 최종본 — 전부 DB에만 저장한다. 로컬 파일이나 앱 안에 원본을 저장하는 코드는 작성하지 않는다.
2. 설치형 앱은 단지 서버 API를 호출하는 "클라이언트"일 뿐이다. 앱에 데이터를 캐싱해서 저장하지 않는다.
3. 공유 링크는 만료되지 않는다. 대신 비밀번호 없이는 절대 편집 화면에 들어갈 수 없어야 한다.
4. 비밀번호는 반드시 해시(bcrypt)로 저장한다. **평문 저장 절대 금지.**
5. 프로젝트가 삭제되면 관련된 모든 DB 데이터(원본, 블록, 수정이력, 링크)가 같이 삭제되어야 한다 (CASCADE).
6. 편집의 최소 단위는 "문단"이 아니라 "채팅 메시지 블록"이다. 참여자가 채팅으로 한 번 전송한 메시지 하나가 블록 하나다.
7. 편집 화면에서 블록을 더블클릭하면 텍스트만 수정 가능해야 하고, 그 블록의 HTML 스타일(색상, 폰트, 말풍선 등 마크업)은 절대 사라지거나 바뀌면 안 된다.
8. 교정 규칙(따옴표 변환, 말줄임표 변환, 화자명 탭 처리 등)은 TXT 다운로드를 누르는 그 순간에만 적용한다. 업로드 시점이나 편집 중에는 적용하지 않는다 (단, HTML 태그 제거와 hidden message 삭제만 업로드 시점에 미리 적용).
9. TXT 다운로드는 "스냅샷 저장"이 아니라, 매번 누를 때마다 그 시점의 DB 데이터를 기준으로 새로 생성한다.

---

## 2. 기술 스택 (이 조합을 그대로 사용할 것. 임의로 다른 라이브러리로 바꾸지 말 것)

| 영역 | 선택 | 비고 |
|---|---|---|
| 서버 언어/프레임워크 | Node.js + Express | 최신 LTS Node 버전 사용 |
| ORM | Prisma 7 이상 | DB 스키마 관리와 마이그레이션에 사용. **Prisma 7부터 DB 연결 URL을 `schema.prisma`가 아니라 별도의 `prisma.config.ts` 파일에서 지정하는 방식으로 바뀌었습니다.** 반드시 이 방식을 따르세요 (구버전인 Prisma 6 방식으로 되돌리지 마세요). |
| DB | PostgreSQL (Neon 무료 티어에 연결) | 로컬 개발 시에도 Postgres 사용 (SQLite로 임의 대체 금지 — 문법 차이로 나중에 문제 생김) |
| 인증 | bcrypt (비밀번호 해시) + JWT (편집 세션 토큰) | |
| HTML 파싱 | cheerio (Node.js용 HTML 파서, jQuery 문법과 유사) | |
| 프론트(공유 편집 페이지) | React (Vite로 빌드) | 서버가 정적 파일로 같이 서빙 |
| 설치형 앱(판매용) | Electron | |
| 서버 호스팅 | Render (무료 웹서비스) | |
| DB 호스팅 | Neon (무료 Postgres) | |

---

## 3. DB 스키마 (Prisma 기준으로 명시)

**이 프로젝트는 별도로 제공된 `schema.prisma` 파일을 그대로 사용합니다.** 아래 내용은 그 파일과 완전히 동일하며, 이 문서 안에서도 참고할 수 있도록 그대로 포함해둔 것입니다. 필드명, 관계, `@@map` 값을 절대 임의로 바꾸지 마세요.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  // Prisma 7부터는 연결 URL을 schema.prisma가 아니라
  // 프로젝트 루트의 prisma.config.ts에서 지정한다. (아래 안내 참고)
}

// ------------------------------------------------------------
// 1. 프로젝트 (로그 하나 = 프로젝트 하나)
// ------------------------------------------------------------
model Project {
  id           String   @id @default(uuid())
  title        String
  // "editing"    : 참여자들이 아직 수정 중
  // "confirmed"  : 관리자가 확정, 더 이상 수정 권장 안 함 (편집 자체는 계속 가능)
  // "downloaded" : TXT 다운로드 완료
  status       String   @default("editing")

  // 업로드된 원본 HTML 전체. 참고/복구용으로 보관하며, 실제 편집은 MessageBlock 단위로 진행.
  originalHtml String   @db.Text

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  blocks             MessageBlock[]
  shareLink          ShareLink?
  correctionSettings CorrectionSettings?
  projectClients     ProjectClient[]

  @@map("projects")
}

// ------------------------------------------------------------
// 2. 메시지 블록 (채팅 메시지 하나 = 블록 하나. 편집의 최소 단위)
// ------------------------------------------------------------
model MessageBlock {
  id        String  @id @default(uuid())
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // 로그 내 순서. 0부터 시작. 이 값 기준으로 정렬해서 화면에 표시하고 TXT로 출력.
  orderIndex Int

  // 화자명. 시스템 메시지나 지문에는 없을 수 있음 (null 허용)
  speakerName String?

  // 이 블록의 원본 HTML 마크업 전체 (스타일 포함). 편집 화면 렌더링에 그대로 사용.
  rawHtml String @db.Text

  // rawHtml에서 텍스트만 추출한 현재 버전. 더블클릭 편집 시 이 값을 기준으로 화면에 보여주고 수정.
  textContent String @db.Text

  // 참여자가 손대기 전 최초 텍스트. 비교/복구/검수용으로 보관, 절대 덮어쓰지 않음.
  originalText String @db.Text

  // "dialogue"(대사) | "narration"(지문) | "handout"(핸드아웃/이미지 위치)
  blockType String @default("dialogue")

  // 참여자가 한 번이라도 수정했는지 여부. 검수 시 "뭘 고쳤는지" 필터링 용도.
  isEdited Boolean @default(false)

  updatedAt DateTime @updatedAt

  @@index([projectId, orderIndex])
  @@map("message_blocks")
}

// ------------------------------------------------------------
// 3. 공유 링크 (프로젝트당 항상 1개, 항상 발급)
// ------------------------------------------------------------
model ShareLink {
  id        String  @id @default(uuid()) // 이 값 자체가 공유 링크의 URL 일부로 사용됨
  projectId String  @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // bcrypt 해시. 평문 저장 절대 금지.
  passwordHash String

  createdAt DateTime @default(now())

  @@map("share_links")
}

// ------------------------------------------------------------
// 4. 교정 규칙 설정 (프로젝트별로 어떤 규칙을 켜고 끌지, 커스텀 문자는 뭘로 할지)
// ------------------------------------------------------------
model CorrectionSettings {
  id        String  @id @default(uuid())
  projectId String  @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  removeHtmlTags      Boolean @default(true)
  removeHiddenMessage Boolean @default(true)
  normalizeEllipsis   Boolean @default(true)
  normalizeQuotes     Boolean @default(true)
  speakerTabFormat    Boolean @default(true)
  cleanBlankLines     Boolean @default(true)
  markHandoutPosition Boolean @default(true)

  // 사용자가 직접 지정 가능한 문자들
  customQuoteOpen  String @default("\u201C") // “
  customQuoteClose String @default("\u201D") // ”
  customEllipsis   String @default("\u2026") // …

  @@map("correction_settings")
}

// ------------------------------------------------------------
// 5. 아래부터는 "개인용(운영자용)" 버전에만 필요한 테이블
//    판매용 배포본에는 이 3개 모델을 빼고 배포해도 무방함
// ------------------------------------------------------------

model AdminUser {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())

  @@map("admin_users")
}

model Client {
  id        String   @id @default(uuid())
  name      String
  contact   String? // 이메일/디스코드 등 연락처. 선택 입력.
  createdAt DateTime @default(now())

  projectClients ProjectClient[]

  @@map("clients")
}

// 프로젝트 1개가 여러 의뢰인과 연결될 수도 있는 구조 대비 (예: 합동 세션 로그)
model ProjectClient {
  id        String  @id @default(uuid())
  projectId String
  clientId  String

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  client  Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([projectId, clientId])
  @@map("project_clients")
}
```

**필드 설계 이유 (반드시 이해하고 넘어갈 것)**:

- **`rawHtml` vs `textContent` vs `originalText`를 왜 3개로 나눴는가**
  - `rawHtml`: 편집 화면에 그대로 뿌려서 원본 스타일(색상, 폰트, 말풍선 모양)을 보여주는 용도. 이 값은 텍스트 수정 시에도 태그/스타일 부분은 그대로 두고 텍스트 부분만 바뀐 채로 갱신됨.
  - `textContent`: 현재 시점의 "텍스트만" 값. 더블클릭 편집 화면에 입력창으로 띄울 때 이 값을 보여줌.
  - `originalText`: 참여자가 한 번도 손대지 않은 최초 텍스트. **이 값은 편집 API에서 절대 덮어쓰지 않는다.** 나중에 "원래 뭐였는지" 비교하거나 관리자가 검수할 때 사용.
- **`ShareLink`와 `CorrectionSettings`가 `Project`와 1:1 관계(`@unique`)인 이유**: 프로젝트 하나당 링크는 항상 정확히 1개만 존재해야 하고(여러 개 생기면 혼란), 교정 설정도 프로젝트마다 하나씩 고정으로 존재해야 하기 때문입니다. `POST /api/projects`로 프로젝트를 생성하는 그 순간, `ShareLink`와 `CorrectionSettings`도 함께 자동 생성해야 합니다 (기본값으로).
- **`onDelete: Cascade`가 모든 관계에 걸려 있는 이유**: 원칙 5번("프로젝트 삭제 시 관련 데이터 전부 삭제")을 DB 레벨에서 강제하기 위함입니다. 애플리케이션 코드에서 일일이 지우는 로직을 짜지 않아도, `Project`를 지우면 Prisma가 알아서 연결된 `MessageBlock`, `ShareLink`, `CorrectionSettings`, `ProjectClient`를 다 지워줍니다.
- **`AdminUser`, `Client`, `ProjectClient`는 판매용에는 필요 없음**: 판매용 배포본을 빌드할 때는 이 3개 모델을 스키마에서 제외한 별도의 `schema.prisma`를 사용하거나, 아예 사용하지 않도록(관련 API 라우트를 등록하지 않는 방식으로) 처리하세요. 개인용(운영자용) 서버에만 이 3개를 포함한 전체 스키마를 사용합니다.

### 3-1. Prisma 7 연결 설정 (`prisma.config.ts`) — 반드시 별도 파일로 추가할 것

**중요**: Prisma 7부터 DB 연결 URL을 더 이상 `schema.prisma` 안에 적지 않습니다. 만약 `npx prisma migrate dev` 실행 시 `"The datasource property url is no longer supported in schema files"` 같은 에러가 나면, 이는 `schema.prisma`가 잘못된 게 아니라 `prisma.config.ts` 파일이 없거나 잘못된 것입니다. **Prisma 6 방식으로 되돌리거나 Prisma 버전을 낮추지 마세요.** 프로젝트 루트(schema.prisma가 아니라 프로젝트 최상위 폴더)에 아래 파일을 그대로 추가하세요.

```typescript
// prisma.config.ts (프로젝트 루트에 위치, prisma/schema.prisma와는 다른 위치)

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

이 파일이 있으면 `.env`의 `DATABASE_URL` 값을 그대로 읽어서 마이그레이션/클라이언트 생성에 사용합니다. `dotenv` 패키지가 devDependency로 필요할 수 있으니 `npm install --save-dev dotenv`도 같이 실행하세요.

---

## 4. HTML → 블록 분리 로직 (가장 중요하고 가장 어려운 부분)

### 4-1. 목표
사용자가 붙여넣거나 업로드한 원본 채팅 로그 HTML을 분석해서, "메시지 하나"마다 별도의 `MessageBlock` 레코드로 쪼갭니다.

### 4-2. 왜 어려운가
TRPG 로그를 뽑는 도구가 여러 가지입니다 (디스코드 채팅 내보내기, 채팅 로그 뷰어 프로그램 등). 각 도구마다 HTML 구조(태그 이름, 클래스 이름)가 다 다릅니다. 그래서 "이 구조에서만 동작하는 파서"를 만들면 안 되고, 최대한 유연하게 만들어야 합니다.

### 4-3. 개발 순서 (반드시 이 순서로 진행)

**1단계**: 실제 TRPG 로그 샘플 HTML을 최소 2~3개 확보한다 (사용자에게 요청해서 받을 것). 짧은 것 1개, 긴 것 1개를 포함할 것.

**2단계**: 받은 샘플들의 HTML 구조를 직접 열어서 눈으로 확인한다. 보통 다음과 같은 패턴 중 하나입니다:
```html
<!-- 패턴 예시 A: div 하나가 메시지 하나 -->
<div class="message">
  <span class="speaker">화자명</span>
  <span class="text">대사 내용</span>
</div>

<!-- 패턴 예시 B: p 태그 여러개 -->
<p><b>화자명:</b> 대사 내용</p>
```
실제 샘플을 열어보기 전까지는 어떤 구조인지 알 수 없으므로, 하드코딩하지 말고 샘플을 먼저 확인해야 합니다.

**3단계**: cheerio로 파싱해서, "메시지 하나로 보이는 최상위 반복 요소"를 찾아 배열로 만든다. 이 반복 요소 하나가 블록 하나가 된다.

**4단계**: 각 블록에서 다음을 추출한다:
- `speakerName`: 화자명으로 보이는 부분 (없으면 null)
- `rawHtml`: 그 블록 전체의 HTML 마크업 (스타일 유지를 위해 원본 그대로 보관)
- `textContent`: 그 블록에서 태그를 제외한 순수 텍스트만

**5단계**: 이미지나 핸드아웃으로 보이는 블록(예: `<img>` 태그 포함)은 `blockType`을 `"handout"`으로 표시하고, `textContent`에는 `"★ (핸드아웃 위치)"` 같은 표시만 남긴다. **실제 이미지 파일은 저장하지 않는다** (이미지는 이 시스템에서 다루지 않음. 위치 표시만).

**6단계**: 파싱이 실패하거나 애매한 경우 (구조를 알 수 없는 HTML) — 전체를 하나의 큰 블록으로라도 저장해서 최소한 데이터 유실은 없게 만든다. 절대 에러를 던지고 멈추지 않는다.

### 4-4. 텍스트만 수정하고 스타일은 유지하는 방법 (더블클릭 편집 저장 로직)

이 부분이 이번 프로젝트에서 기술적으로 가장 까다로운 지점입니다. 천천히, 정확하게 구현하세요.

**저장 시 처리 순서**:
1. 서버는 블록의 `rawHtml`을 cheerio로 다시 파싱한다.
2. 그 안의 텍스트 노드(태그가 아닌 순수 글자 부분)들을 순서대로 찾는다.
3. 사용자가 편집 화면에서 새로 입력한 텍스트로, 그 텍스트 노드 내용을 교체한다.
4. 태그, 클래스, 인라인 스타일(style="...")은 **절대 건드리지 않는다.**
5. 교체가 끝난 HTML을 다시 문자열로 만들어서 `rawHtml`에 덮어쓰고, `textContent`도 함께 갱신한다.
6. `isEdited`를 `true`로 바꾼다.

**주의**: "텍스트 노드만 교체"가 어렵게 느껴지면, 가장 단순한 방식으로 시작해도 됩니다 — 블록 안에 텍스트 노드가 하나뿐인 단순한 구조라면, 그 노드 하나만 통째로 새 텍스트로 바꾸는 걸로 충분합니다. 복잡한 다중 텍스트노드 케이스는 나중에 실제 샘플을 보면서 점진적으로 개선하세요. 처음부터 완벽하게 만들려 하지 말고, 단순한 경우부터 동작하게 만드세요.

---

## 5. 교정 규칙 엔진 (TXT 다운로드 시점에만 실행)

별도 모듈 파일(`correctionEngine.js` 또는 `.ts`)로 분리해서 작성하세요. 서버 어디서든 이 모듈을 import해서 사용합니다.

**함수 시그니처 예시**:
```javascript
function applyCorrections(blocks, settings) {
  // blocks: MessageBlock 배열
  // settings: CorrectionSettings 레코드
  // return: 최종 TXT 문자열
}
```

**각 규칙의 정확한 동작 정의**:

| 규칙 | 입력 예시 | 출력 예시 | 설명 |
|---|---|---|---|
| HTML 태그 제거 | `<b>안녕</b>` | `안녕` | 모든 HTML 태그를 벗겨내고 순수 텍스트만 남긴다 |
| hidden message 삭제 | (숨김 처리된 메시지 블록) | (해당 블록 자체가 결과에서 제외됨) | 업로드 시점에 이미 처리되지만, 다운로드 시점에도 한번 더 확인 |
| 말줄임표 정리 | `...` | `…` | 마침표 3개 → 말줄임표 1글자. `......`(6개)는 `……`(말줄임표 2개)로 |
| 따옴표 정리 | `"대사"` | `"대사"` → `"대사"` | 직선 따옴표를 곡선 따옴표로. `settings.customQuoteOpen`/`customQuoteClose` 값 사용 |
| 화자명 뒤 탭 처리 | `민수: 안녕` | `민수[TAB]안녕` | 화자명과 대사 사이의 콜론(:)이나 공백을 탭 문자(\t)로 교체 |
| 본문/대사 사이 공백줄 정리 | (빈 줄 2개 이상 연속) | (빈 줄 1개로 통일) | 불필요하게 중복된 빈 줄을 하나로 줄인다 |
| 핸드아웃/이미지 위치 표시 | `blockType === "handout"` | `★ (이미지/핸드아웃 위치)` | 이미지 자체는 넣지 않고 위치 표시 문자만 남긴다 |

**설정 반영 방식**: `settings`의 각 boolean 값(`removeHtmlTags`, `normalizeEllipsis` 등)이 `false`면 해당 규칙을 건너뛴다. 사용자가 일부 규칙만 선택 적용할 수 있어야 하므로, 각 규칙은 독립된 함수로 분리해서 켜고 끌 수 있게 만드세요.

```javascript
// 올바른 구조 예시
function applyCorrections(blocks, settings) {
  let result = blocks;

  if (settings.removeHtmlTags) result = removeHtmlTags(result);
  if (settings.normalizeEllipsis) result = normalizeEllipsis(result, settings.customEllipsis);
  if (settings.normalizeQuotes) result = normalizeQuotes(result, settings.customQuoteOpen, settings.customQuoteClose);
  if (settings.speakerTabFormat) result = applySpeakerTabFormat(result);
  if (settings.cleanBlankLines) result = cleanBlankLines(result);
  if (settings.markHandoutPosition) result = markHandoutPosition(result);

  return blocksToTxt(result);
}
```

**절대 하지 말 것**: 이 규칙들을 한 개의 거대한 함수 안에 정규식 여러 개로 뒤섞어 넣지 마세요. 반드시 규칙 하나당 함수 하나로 분리해야, 나중에 사용자가 규칙을 커스터마이징할 때 유지보수가 가능합니다.

---

## 6. API 명세

| Method | Path | 설명 | 인증 필요 |
|---|---|---|---|
| POST | `/api/projects` | 로그 업로드, 프로젝트 생성, 초기 처리(태그 정리+hidden 삭제) + 블록 분리 + 링크/비밀번호 자동 발급 | 없음(판매용) / 관리자(개인용) |
| GET | `/api/projects/:id` | 프로젝트 정보 조회 | 관리자 |
| DELETE | `/api/projects/:id` | 프로젝트 삭제 (CASCADE) | 관리자 |
| POST | `/api/share/:projectId/verify` | 비밀번호 검증, 세션 토큰(JWT) 발급 | 비밀번호 |
| GET | `/api/share/:projectId/blocks` | 블록 목록 조회 (편집 화면 렌더링용) | 세션 토큰 |
| PATCH | `/api/share/:projectId/blocks/:blockId` | 블록 텍스트 수정 저장 (4-4 로직 실행) | 세션 토큰 |
| PATCH | `/api/projects/:id/share-link/password` | 비밀번호 변경 | 관리자 |
| GET | `/api/projects/:id/download` | 교정 규칙 전체 적용 후 TXT 생성·다운로드 | 관리자 |
| GET | `/api/projects/:id/preview` | 다운로드 전 결과 미리보기 (다운로드와 동일 로직, 파일 대신 화면 표시) | 관리자 |
| PATCH | `/api/projects/:id/correction-settings` | 교정 규칙 개별 on/off 및 커스텀 문자 설정 | 관리자 |

---

## 7. 개발 순서 (반드시 이 순서를 지킬 것 — 순서를 건너뛰면 나중에 되돌아와야 함)

### Phase 1. 프로젝트 뼈대 세팅
- [ ] Node.js 프로젝트 생성, Express 설치
- [ ] Prisma(7 이상) 설치, 제공된 `schema.prisma` 파일을 `prisma/schema.prisma` 위치에 그대로 사용 (직접 타이핑해서 새로 만들지 말 것)
- [ ] 프로젝트 루트에 `prisma.config.ts` 파일 추가 (3-1번 섹션 내용 그대로, 직접 타이핑해서 새로 만들지 말 것)
- [ ] `npm install --save-dev dotenv` 실행
- [ ] Neon에 실제 Postgres 프로젝트 생성 (무료), `.env`에 `DATABASE_URL` 넣기
- [ ] `npx prisma migrate dev`로 로컬 마이그레이션 실행 → DB 테이블 실제로 생성되는지 확인
- [ ] 서버 실행 후 `/health` 같은 더미 엔드포인트로 정상 구동 확인

**만약 마이그레이션 실행 시 datasource url 관련 에러가 나면**: `prisma.config.ts` 파일이 프로젝트 루트에 제대로 있는지, `.env`에 `DATABASE_URL`이 실제로 설정돼 있는지 확인하세요. Prisma 버전을 낮추는 방식으로 해결하지 마세요.

**완료 기준**: 서버 실행 → Neon DB에 테이블이 실제로 생겼는지 Neon 콘솔에서 직접 눈으로 확인.

### Phase 2. HTML 파싱 로직 (4번 섹션)
- [ ] 실제 샘플 로그 HTML 최소 2개 확보
- [ ] cheerio로 블록 단위 분리 함수 작성
- [ ] 텍스트만 추출하는 함수 작성
- [ ] 콘솔에 결과 출력해서, 블록이 올바르게 나뉘었는지 사람이 눈으로 확인

**완료 기준**: 샘플 로그를 넣었을 때, 실제 메시지 개수만큼 블록이 정확히 나뉘어 출력됨.

### Phase 3. 업로드 → 프로젝트 생성 API
- [ ] `POST /api/projects` 구현: HTML 받기 → 태그 정리+hidden 삭제 → 블록 분리 → DB 저장
- [ ] 링크 ID(uuid) 생성, 비밀번호 랜덤 생성 → bcrypt 해시 후 저장
- [ ] Postman이나 curl로 실제 HTML 파일을 넣어서 테스트, DB에 블록들이 잘 저장됐는지 확인

**완료 기준**: 실제 로그 파일 업로드 → DB에서 `message_blocks` 테이블에 블록들이 순서대로 저장된 것을 직접 조회해서 확인.

### Phase 4. 공유 링크 인증
- [ ] `POST /api/share/:projectId/verify` 구현: 비밀번호 확인 → JWT 발급
- [ ] JWT 검증 미들웨어 작성 (이후 블록 조회/수정 API에서 사용)

**완료 기준**: 틀린 비밀번호로는 접근 거부, 맞는 비밀번호로는 토큰 발급되는 것을 테스트로 확인.

### Phase 5. 블록 조회·수정 API (4-4번 텍스트 교체 로직 포함)
- [ ] `GET /api/share/:projectId/blocks` 구현
- [ ] `PATCH /api/share/:projectId/blocks/:blockId` 구현 — **여기서 4-4번의 "텍스트만 교체, 스타일 유지" 로직이 핵심**
- [ ] 단순한 구조의 블록으로 먼저 테스트 (텍스트 노드 하나짜리) → 성공하면 복잡한 구조로 확장

**완료 기준**: 블록 텍스트를 수정 API로 바꿨을 때, `rawHtml`의 스타일(태그, class)은 그대로인데 글자만 바뀐 것을 직접 확인.

### Phase 6. 교정 규칙 엔진 (5번 섹션)
- [ ] 규칙별로 함수 하나씩 작성 (표에 나온 7개 규칙)
- [ ] 각 함수를 개별적으로 유닛테스트 (입력→출력이 표와 일치하는지)
- [ ] `applyCorrections` 함수로 전체 묶기

**완료 기준**: 각 규칙 함수에 표에 있는 입력 예시를 넣었을 때 출력 예시와 정확히 일치.

### Phase 7. TXT 다운로드 API
- [ ] `GET /api/projects/:id/download` 구현: DB에서 현재 블록들 조회 → `applyCorrections` 실행 → txt 파일로 응답
- [ ] `GET /api/projects/:id/preview` 구현 (다운로드와 로직 동일, 응답만 JSON/텍스트로)

**완료 기준**: 실제로 편집을 몇 개 한 뒤 다운로드했을 때, 결과 txt 파일이 교정 규칙을 다 반영해서 나오는지 확인.

### Phase 8. 공유 편집 웹페이지 (프론트)
- [ ] 링크 접속 → 비밀번호 입력 화면
- [ ] 블록 목록을 `rawHtml` 그대로 렌더링 (dangerouslySetInnerHTML 또는 동등 방식 사용)
- [ ] 블록 더블클릭 → 편집 모드 전환 (contentEditable 또는 별도 입력창)
- [ ] 저장 버튼 또는 자동저장 → PATCH API 호출

**완료 기준**: 브라우저에서 실제로 더블클릭해서 텍스트를 고치고 저장, 새로고침해도 수정 내용이 유지되는지 확인.

### Phase 9. 프로젝트 삭제 (CASCADE 확인)
- [ ] `DELETE /api/projects/:id` 구현
- [ ] 삭제 후 관련 블록, 링크 테이블에서도 데이터가 실제로 사라졌는지 DB에서 직접 확인

### Phase 10. 설치형 앱(Electron) — 판매용
- [ ] 서버 URL 입력/저장 설정 화면
- [ ] 로그 업로드 화면 (파일 선택 또는 붙여넣기) → `POST /api/projects` 호출
- [ ] 프로젝트 목록, 링크/비밀번호 확인 화면
- [ ] TXT 다운로드 버튼 → `GET /api/projects/:id/download` 호출 → 로컬에 파일 저장

### Phase 11. 배포 준비 (판매용)
- [ ] GitHub 템플릿 레포 구성
- [ ] Render에 실제로 처음부터 배포해보기 (개발자 본인이 구매자인 것처럼 처음부터 테스트)
- [ ] 배포 시 자동으로 `npx prisma migrate deploy`가 실행되도록 빌드 스크립트 설정
- [ ] `.env.example` 파일 작성 (실제 값 없이 필요한 변수 이름만)

### Phase 12. 개인용 관리자 기능 추가
- [ ] 관리자 로그인 (AdminUser 테이블 사용)
- [ ] 의뢰 인테이크 화면 (Client 등록 + 프로젝트 연결)
- [ ] 프로젝트 상태(대기/편집중/완료) 표시 대시보드

---

## 8. 주의사항 모음 (실수하기 쉬운 지점)

### 8-1. HTML 관련
- 사용자가 붙여넣는 HTML에 `<script>` 태그가 섞여 있을 수 있습니다. 편집 화면에서 `rawHtml`을 렌더링할 때 **스크립트가 실행되지 않도록** 반드시 정제(sanitize)하세요. `DOMPurify` 같은 라이브러리를 프론트에서 사용해서, 렌더링 직전에 스크립트/이벤트 핸들러 속성을 제거하세요. 이건 보안 문제이므로 절대 생략하지 마세요.
- HTML 구조가 도구마다 다르다는 것을 항상 기억하세요. 하나의 샘플에서만 동작하는 파서를 만들고 "완성됐다"고 판단하지 마세요.

### 8-2. 동시 편집 관련
- 여러 참여자가 동시에 접속해서 서로 다른 블록을 수정할 수 있습니다. 블록 단위로 저장하기 때문에, 서로 다른 블록을 수정하는 경우는 문제없습니다.
- 하지만 같은 블록을 두 명이 동시에 고치면 나중에 저장한 사람 것으로 덮어써집니다(last-write-wins). 이건 이번 개발 범위에서는 허용되는 정책입니다. 별도의 락(lock) 시스템은 만들지 마세요 (범위 초과).

### 8-3. 인증/보안 관련
- 비밀번호를 절대 평문으로 DB에 저장하거나 로그에 출력하지 마세요.
- JWT 시크릿 키는 `.env`에 넣고, 코드에 하드코딩하지 마세요.
- 공유 링크의 프로젝트 ID(uuid)는 추측하기 어려운 값이어야 합니다. 순차 증가하는 숫자 ID를 링크에 노출하지 마세요 (반드시 uuid 사용).

### 8-4. 교정 규칙 관련
- 규칙 적용 순서가 중요합니다. 예를 들어 HTML 태그를 먼저 제거해야 그 다음 따옴표/말줄임표 정규식이 태그 속성 값까지 잘못 건드리는 일이 없습니다. Phase 6에서 작성한 순서(표에 나온 순서)를 지키세요.
- 정규식으로 따옴표나 말줄임표를 바꿀 때, 이미 올바른 형태(예: 이미 `…`로 되어 있는 경우)를 다시 건드려서 깨지게 만들지 않도록 테스트하세요.

### 8-5. 배포/인프라 관련
- Render 무료 웹서비스는 15분간 요청이 없으면 잠들고, 다음 요청 때 30~60초 정도 걸려서 다시 깨어납니다. 이건 정상 동작입니다. 프론트에서 "서버를 깨우는 중입니다..." 같은 로딩 안내를 반드시 넣으세요. 에러로 처리하지 마세요.
- Neon 무료 DB는 프로젝트당 0.5GB 저장 공간 제한이 있습니다. 텍스트만 다루므로 넉넉하지만, 혹시 저장 실패 에러가 나면 용량 초과 가능성을 먼저 의심하세요.
- 로컬 개발 시에도 SQLite가 아니라 실제 Postgres(Neon 또는 로컬 Postgres)를 사용하세요. SQLite는 문법이 달라서 나중에 Neon 배포 시 오류가 날 수 있습니다.

### 8-6. 일반적인 개발 태도
- 한 번에 전체 기능을 다 만들려고 하지 마세요. 위 Phase 순서대로, 각 Phase의 "완료 기준"을 실제로 눈으로 확인한 뒤에만 다음 단계로 넘어가세요.
- 애매한 부분(예: HTML 구조가 예상과 다름)이 생기면, 임의로 추측해서 진행하지 말고 일단 에러 없이 동작하도록 안전하게 처리한 뒤 (8-6 참고), 나중에 실제 샘플로 검증하세요.
- 테스트할 때는 반드시 실제 TRPG 로그 샘플로 확인하세요. 가짜로 만든 간단한 HTML로만 테스트하면 실제 사용 시 파싱이 깨질 수 있습니다.

---

## 9. 최종 완료 판단 기준 (전체 흐름 검수용)

아래 순서를 실제로 처음부터 끝까지 사람이 손으로 해보고, 전부 성공해야 개발이 끝난 것으로 간주합니다.

1. 실제 TRPG 로그 HTML 파일을 업로드한다.
2. 프로젝트가 생성되고 링크+비밀번호가 발급된다.
3. 그 링크에 다른 브라우저(시크릿 모드 등)로 접속해서 비밀번호를 입력한다.
4. 채팅 로그가 원래 스타일 그대로 화면에 보인다.
5. 임의의 메시지 블록을 더블클릭해서 텍스트를 고치고 저장한다.
6. 새로고침해도 수정 내용이 유지된다. 스타일도 그대로 유지된다.
7. 관리자 화면(또는 앱)에서 TXT 다운로드를 누른다.
8. 다운로드된 txt 파일을 열어서, 6번에서 고친 내용이 반영되어 있고, 동시에 모든 교정 규칙(따옴표, 말줄임표, 화자명 탭 등)이 적용되어 있는지 확인한다.
9. 프로젝트를 삭제하고, 링크에 다시 접속하면 더 이상 접속되지 않는 것을 확인한다.
