// Las pruebas e2e usan TEST_DATABASE_URL (o DATABASE_URL en CI) para no tocar la base de desarrollo.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
