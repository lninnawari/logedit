# TRPG Log Editor

TRPG chat log editor and correction tool for turning HTML chat archives into clean TXT manuscripts.

This repository is currently fixed to the Basic Distribution Edition. See `docs/editions.md` for edition boundaries, `docs/deployment.md` for Render/Neon deployment, `docs/buyer-quickstart.ko.md` for the buyer quickstart, `docs/electron.md` for the Electron client, `docs/sales-distribution.md` for buyer-facing distribution planning, and `docs/security.md` for security notes.

## Current Stack

- Node.js + Express
- React + Vite
- PostgreSQL
- Prisma 7 with `prisma.config.ts`
- bcrypt + JWT
- cheerio + DOMPurify

## Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL` to a real Neon PostgreSQL connection string. Prefer `sslmode=verify-full`.
3. Set `JWT_SECRET` to a long random string.
4. Install dependencies:

```bash
npm install
```

5. Validate Prisma:

```bash
npm run prisma:validate
```

6. Run migrations:

```bash
npm run prisma:migrate
```

7. Build the client:

```bash
npm run build
```

8. Start the server:

```bash
npm start
```

9. Open the admin page and create the first administrator account in the browser.

For Render deployment, see `docs/deployment.md`.

Generate a `JWT_SECRET` with:

```bash
npm run generate:secret
```

The app serves:

- Admin/upload page: `http://localhost:3000/`
- Shared editor page: `http://localhost:3000/share/:projectId`
- Health check: `http://localhost:3000/health`

## Analyze A Sample HTML

Use this before tuning the parser for a new export format:

```bash
npm run analyze:html -- "C:\path\to\chat-log.html"
```

The command prints block count, block type distribution, speakers, and the first parsed blocks.

## Important Notes

- The database is the only source of truth.
- If no administrator exists, the admin page shows the initial account setup screen.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` are not required for normal setup. `npm run seed:admin` is only a development/recovery helper.
- Shared-link passwords are stored only as bcrypt hashes.
- Correction rules run at TXT preview/download time, not during upload or editing.
- Raw HTML is preserved for visual rendering, and edit saves replace text while keeping markup.
- Roll20 `msgdata` chat archives are supported, including hidden-message filtering, inline roll totals, and common sheet template cleanup.
- Cocofolia logs are supported for span-based exported HTML, static HTML paragraphs, and plain text logs with `[channel] speaker : message` lines.
- Image/handout blocks are rendered as text markers, not as images. The marker icon is project-configurable through `customHandoutIcon`.
