# Progress

## Current Edition

- Product edition boundaries are defined in `docs/editions.md`.
- Current codebase is fixed to the Basic Distribution Edition.
- It includes `AdminUser`, first-run admin setup, admin login, admin-only project management, shared editing, and TXT preview/download.
- It does not include `Client`, `ProjectClient`, `/api/clients`, client intake, or public client upload.
- It is not yet Render-deployed production. Local server + Neon DB have been verified.
- Client Upload Form Edition remains a future expansion from this basic baseline.

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
- Phase 11 Render/deployment preparation: config and guide added; actual Render deployment is still pending.
- Phase 12 Personal admin features: deferred to the Client Upload Form Edition.

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
- Project status update UI and API.
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

## Needs User Input

- Actual Render/GitHub/Neon account actions for production deployment.
- Additional non-Roll20/non-Cocofolia TRPG HTML samples, if available.

## Next

- Parser tuning against additional export formats.
- Actual Render deployment and production smoke test.
- Electron packaging polish: custom icon.
- Buyer-facing screenshots/gifs for sales documentation.
