# Fabric Trade System

Fabric Trade System is a web-based backend management system for fabric trading workflows. The current MVP focuses on the fabric library, supplier sources, and supplier quote history.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- PostgreSQL
- Prisma 7
- Tailwind CSS
- Zod

## Development

```bash
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev
```

Use `.env.example` or `.env.development.example` as templates. Do not commit real `.env` files.

## Testing

Automated tests must use a dedicated test database through `TEST_DATABASE_URL`. The test runner refuses to use `DATABASE_URL` directly, and it refuses database names that do not contain `test`.

Create a local `.env.test` from `.env.test.example`:

```text
TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/fabric_trade_test"
```

Prepare the test database before running tests:

```bash
$env:DATABASE_URL=$env:TEST_DATABASE_URL
npm run prisma:migrate:dev
npm run prisma:seed
npm test
```

On macOS/Linux, set the same variables with your shell's `export` syntax.

## Current Backend APIs

- `POST /api/fabrics`
- `GET /api/suppliers`
- `GET /api/config-options?groups=fabric_usage,fabric_season`

The create-fabric UI is still a static prototype and is not yet bound to the backend API.
