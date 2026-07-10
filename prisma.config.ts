// prisma.config.ts
// Prisma 7부터 DB 연결 URL은 schema.prisma가 아니라 이 파일에서 지정합니다.
// .env 파일에 DATABASE_URL="postgresql://..." 값을 넣어두면 여기서 자동으로 읽습니다.

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
