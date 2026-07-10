# Hosted Web Deployment Guide

This guide is for the hosted web edition with public client upload.

## Required Services

- Neon PostgreSQL database.
- Render Web Service.

## Required Environment Variables

Set these in Render and in local `.env` when running locally:

- `DATABASE_URL`: Neon PostgreSQL connection string.
- `JWT_SECRET`: long random secret used for admin and share-session JWTs.

Do not set `ADMIN_EMAIL` or `ADMIN_PASSWORD` for normal installs. The first administrator is created in the browser on first launch.

Generate a local JWT secret with:

```bash
npm run generate:secret
```

## Local Check Before Deploy

```bash
npm install
npm run prisma:validate
npm run prisma:generate
npm test
npm run build
```

## Render Settings

This repo includes `render.yaml`.

Recommended settings if configuring manually:

- Runtime: Node
- Build command: `npm ci && npm run render:build`
- Start command: `npm run render:start`
- Health check path: `/health`

`npm run render:start` runs `prisma migrate deploy` before starting the server, so production migrations are applied at deploy time.

## First Launch

1. Open the deployed Render URL.
2. If the database has no administrator, the app shows the initial admin setup screen.
3. Create the first admin account.
4. After setup, the same URL shows the admin login screen.

## Public Upload URL

Clients can submit logs at:

```text
https://your-render-service.onrender.com/upload
```

Submitted projects are created with `submitted` status and appear in the admin project list with requester information.

## Admin Password Changes

The normal distribution flow does not require command-line password setup. If a recovery reset is needed, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` temporarily in the environment and run:

```bash
npm run seed:admin
```

Then remove those temporary variables if they are not needed.

## Deployment Verification

After deployment:

1. Open `/health` and confirm it returns `ok`.
2. Open `/` and create or log into the admin account.
3. Upload a sample HTML log.
4. Open the generated share link in another browser session.
5. Verify the share password.
6. Edit one block and save.
7. Return to admin and confirm preview/download includes the edit.
8. Delete the project and confirm the share link no longer works.

## Operator Flow

- Admin page: `/`
- Public client upload page: `/upload`
- Participant edit links: `/share/:projectId`
- Health check: `/health`
