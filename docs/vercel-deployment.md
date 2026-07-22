# Vercel Serverless Deployment Guide

This guide is for the personal serverless web edition. The previous always-on Express/Render structure is preserved on the `backup/express-render-server` Git branch.

## Required Services

- Vercel project connected to this GitHub repository.
- Neon PostgreSQL database.

## Required Environment Variables

Set these in Vercel Project Settings:

- `DATABASE_URL`: Neon PostgreSQL connection string.
- `JWT_SECRET`: long random secret used for admin and share-session JWTs.

Generate a JWT secret locally with:

```bash
npm run generate:secret
```

## Build Settings

This repo includes `vercel.json`.

Use:

- Framework Preset: Other
- Build Command: `npm run vercel:build`
- Output Directory: `dist/client`

`npm run vercel:build` generates Prisma Client and builds the Vite client.

When the Prisma schema changes, run the production migration separately with:

```bash
npm run prisma:deploy
```

Do this from a local shell with the production `DATABASE_URL` set, or from another controlled migration environment. The Vercel build intentionally does not mutate the database.

## Serverless Changes

Vercel does not keep a single always-on Express process. For that reason, spellcheck no longer depends on an in-memory background job for the browser flow. The editor calls `/api/projects/:id/spellcheck/run`, and that request returns the finished grouped spellcheck result directly.

The older `/spellcheck/start` and `/spellcheck/status/:jobId` endpoints remain for the backed-up always-on server flow, but the browser no longer depends on them.

## Important Limit

Vercel Functions have a 4.5 MB request/response body limit. Very large Roll20 HTML files can exceed this. If that happens, the next architecture step is client-side parsing plus chunked block upload, or direct browser upload to object storage.

For typical text-heavy logs below that limit, the current serverless structure should work without an idle server wake-up wait.

## First Launch

1. Deploy from Vercel.
2. Open the deployed URL.
3. If the database has no administrator, create the first admin account in the browser.
4. Upload a sample log and verify edit, preview, download, and spellcheck.
