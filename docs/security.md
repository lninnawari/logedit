# Security Notes

## npm audit

Current `npm audit` reports three moderate findings through Prisma CLI internals:

- `prisma`
- `@prisma/dev`
- `@hono/node-server`

As of the latest npm registry check, `prisma`, `@prisma/client`, and `@prisma/adapter-pg` are already at `7.8.0`.

`npm audit fix --force` currently suggests downgrading Prisma to `6.19.3`. Do not apply that fix because this project intentionally targets Prisma 7 and uses `prisma.config.ts` for datasource configuration.

Impact:

- The reported vulnerable path is inside Prisma CLI tooling, not the Express runtime routes.
- The app should keep tracking Prisma 7 patch releases and update once the advisory is fixed in a newer Prisma 7 version.

Recommended check before release:

```bash
npm audit
npm view prisma version
```

If a newer Prisma 7 patch exists, update these packages together:

```bash
npm install prisma@latest @prisma/client@latest @prisma/adapter-pg@latest
npm run prisma:validate
npm run prisma:generate
npm test
npm run render:build
```
