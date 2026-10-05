import postgres, { type Sql } from "postgres";

let sqlClient: Sql | null = null;

export function databaseEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  if (!sqlClient) {
    sqlClient = postgres(url, {
      max: 3,
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false,
      ssl: "require",
    });
  }

  return sqlClient;
}
