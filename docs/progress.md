# Progress

## Current Edition

- Product edition boundaries are defined in `docs/editions.md`.
- Current codebase has been expanded to the hosted original-log upload edition.
- It includes `AdminUser`, first-run admin setup, admin login, admin project management, one-time original-log upload links, shared editing, and TXT preview/download.
- It includes `/api/intake/:token/projects` and admin-generated `/intake/:token` links as the original-log upload path.
- Production Render deployment exists at `https://logedit.onrender.com/`; hosted intake code is deployed.

## Spec Phase Status

- Phase 1 Project scaffold: done and verified with Neon.
- Phase 2 HTML parsing: done for Roll20, Cocofolia, and generic fallback; more formats can be added from samples.
- Phase 3 Upload/project creation API: done.
- Phase 4 Shared link authentication: done.
- Phase 5 Block list/edit API with markup preservation: done.
- Phase 6 Correction engine: done.
- Phase 7 TXT preview/download API: done.
- Phase 8 Shared editing web page: done and verified with manual browser QA.
- Phase 9 Project delete/cascade: done and verified through e2e.
- Phase 10 Electron sales app: shell and installer packaging config implemented.
- Phase 11 Render/deployment preparation: done; production deployment is live.
- Phase 12 Public original-log upload: implemented as admin-generated one-time upload links with admin project visibility.

## Done

- Node/Express server scaffold.
- Prisma 7 configuration with `prisma.config.ts`.
- Initial PostgreSQL migration SQL.
- Initial migration applied to Neon PostgreSQL.
- Health endpoint.
- Project upload API with JSON HTML and multipart HTML file support.
- Share password verification with JWT.
- Shared block list and block update APIs.
- Password change API.
- Preview and TXT download APIs.
- React/Vite admin upload page.
- React/Vite shared editor page.
- Project list/delete/download entry UI.
- HTML parsing fallback for generic message blocks.
- Roll20 `msgdata` parser.
- Roll20 hidden-message filtering.
- Roll20 inline roll total substitution.
- Roll20 common sheet template cleanup.
- Cocofolia parser for span-based exported HTML, static HTML paragraphs, and plain text logs.
- Correction engine with rule toggles.
- Project-configurable image/handout marker icon.
- Image/handout blocks render as text markers instead of re-rendering image HTML.
- Admin login with JWT-protected operator APIs.
- First-run browser setup for creating the first administrator account.
- Admin seed script using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- Project status API for internal workflow values.
- Removed `Client` and `ProjectClient` from the Basic Distribution Edition schema/API/UI.
- Render deployment scripts, `render.yaml`, and `docs/deployment.md`.
- Electron client shell and `docs/electron.md`.
- Electron Builder packaging scripts.
- Buyer-facing sales distribution plan in `docs/sales-distribution.md`.
- Security notes in `docs/security.md`.
- Buyer quickstart guide in `docs/buyer-quickstart.ko.md`.
- JWT secret generator script and `npm run generate:secret`.
- Release verification script `npm run release:check`.
- DOMPurify sanitization before rendering raw HTML.
- Unit tests for parser, editor markup preservation, and correction engine.
- Sample analysis CLI.
- End-to-end sample test script with admin login support.
- Shared editor browser save flow fixed so admin/share authenticated JSON requests keep `Content-Type: application/json`.
- Shared editor edit drafts strip leading speaker labels before saving, preventing duplicated speaker text in generic HTML fallback blocks.
- One-time original-log upload pages at `/intake/:token`.
- Public intake API at `/api/intake/:token/projects`.
- Admin project list displays block count and last saved time.
- Public upload simplified to project title, memo, and HTML only.
- Pasted HTML is captured from clipboard `text/html` when available instead of being flattened to plain text.

## Verified

- `npm test`
- `npm run build`
- `npm run prisma:validate`
- Roll20 sample parse: 1039 blocks from 1046 messages after skipping 7 hidden messages.
- Neon e2e flow with admin login: upload -> share verify -> block fetch -> edit -> preview -> download -> delete cascade.
- Roll20 sample e2e after admin auth: 1039 blocks, edit persisted, preview/download include edit, cascade delete verified.
- Cocofolia sample e2e after admin auth using `新しい部屋[main].html`: 3 blocks, edit persisted, preview/download include edit, cascade delete verified.
- Local verification after handout marker change: Prisma generate, unit tests, and client build.
- Local verification after admin setup/status changes: unit tests, client build, and Prisma validate.
- Basic Distribution cleanup verified: Prisma validate/generate, unit tests, client build, Neon migration deploy, Cocofolia e2e, and DB check confirming `clients`/`project_clients` are absent.
- Render build script verified with `npm run render:build`.
- Electron package dependency installed, Electron binary verified, app shell added, Windows installer build verified, and Electron-only packaging configured.
- npm audit reviewed: current findings are Prisma CLI internals; latest Prisma is already installed and forced fix would downgrade to Prisma 6.
- `npm run generate:secret` verified.
- `npm run release:check` verified after granting network access for Electron packaging.
- Cocofolia sample e2e re-verified with Neon network access: upload -> share verify -> edit -> preview/download -> delete cascade.
- Manual browser QA verified: admin login, HTML paste upload, share password verification, block edit/save, and QA project cleanup.
- Public upload API verified against Neon: upload -> project visible in admin list -> cleanup.
- Production one-time intake flow should be re-verified after deployment.
- Production intake API smoke test succeeded with `201 Created`.

## Needs User Input

- Delete the production smoke-test project `660eb365-b109-4c0f-9ce6-dc25fad0cd0b` from the admin page if it is still present.
- Additional non-Roll20/non-Cocofolia TRPG HTML samples, if available.

## Next

- Parser tuning against additional export formats.
- Hosted-service product/pricing/ad strategy.
