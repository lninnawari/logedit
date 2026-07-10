# Sales Distribution Plan

This document describes how the Basic Distribution Edition should be prepared for buyers.

## Goal

Buyers should not need to understand Git branches, commits, migrations, or local development workflows.

The buyer-facing flow should be:

1. Create a Neon PostgreSQL database.
2. Deploy the provided repository/template to Render.
3. Set `DATABASE_URL` and `JWT_SECRET`.
4. Open the deployed URL.
5. Create the first administrator account in the browser.
6. Start uploading logs.

## Recommended Sales Format

Recommended:

- GitHub template or private repository access.
- Render Blueprint via `render.yaml`.
- Buyer guide with screenshots later.

Less recommended:

- ZIP-only distribution, because buyers would still need to upload the project to GitHub before Render can deploy cleanly.

## Seller Responsibilities

Before selling:

- Keep the Basic Distribution Edition branch clean.
- Include `render.yaml`.
- Include `.env.example`.
- Include all Prisma migrations.
- Include `docs/deployment.md`.
- Include `docs/electron.md`.
- Include `docs/buyer-quickstart.ko.md`.
- Verify a fresh Neon DB can migrate from zero.
- Verify first-run admin setup on a fresh DB.
- Verify sample upload/share/edit/download/delete.
- Build and test the Electron installer if shipping it.

## Buyer Responsibilities

The buyer should only need to:

- Have or create GitHub, Neon, and Render accounts.
- Create a Neon database.
- Connect the repository/template to Render.
- Paste `DATABASE_URL`.
- Generate and paste `JWT_SECRET`.
- Create the first admin account in the browser.

## What Buyers Should Not Need To Do

- Run `git` commands.
- Edit Prisma schema.
- Run migrations manually in a terminal.
- Create admin users with CLI commands.
- Understand branches or pull requests.
- Modify source code.

## Update Strategy

For future updates:

- Keep a tagged release history, for example `v1.0.0`, `v1.0.1`.
- Publish short release notes.
- Prefer backward-compatible migrations.
- Explain whether buyers need to redeploy only, or update environment variables too.

## Pre-Sale Checklist

- [ ] Fresh install from repository/template.
- [ ] Render deployment from `render.yaml`.
- [ ] Neon migration from empty DB.
- [ ] First admin setup screen appears.
- [ ] Admin login works after setup.
- [ ] Roll20 upload works.
- [ ] Cocofolia upload works.
- [ ] Shared edit link works.
- [ ] TXT preview/download works.
- [ ] Project delete cascades.
- [ ] Electron client connects to deployed server.
- [ ] Electron installer builds.
- [ ] Buyer-facing screenshots/gifs added to docs or sales page.
- [ ] Buyer quickstart guide reviewed.
