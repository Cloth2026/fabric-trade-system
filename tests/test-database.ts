import dotenv from "dotenv";

export function assertSafeTestDatabaseUrl(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL is required. Automated tests must not use DATABASE_URL.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(databaseUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL connection URL.");
  }

  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      `Refusing to run tests against database "${databaseName}". TEST_DATABASE_URL database name must contain "test".`,
    );
  }

  return databaseUrl;
}

export function configureTestDatabase() {
  dotenv.config({ path: ".env.test", override: false });
  process.env.DATABASE_URL = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
}
