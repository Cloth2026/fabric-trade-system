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

## Create Fabric Flow

The create-fabric drawer is connected to the backend APIs:

- Config-backed fields load enabled Chinese labels from `GET /api/config-options` and submit stable keys.
- Supplier and factory selectors search the current tenant through `GET /api/suppliers`.
- A fabric can include multiple supplier relations and an optional first quote for each supplier.
- `POST /api/fabrics` creates the fabric, optional process details, supplier relations, quote history, and operation log in one transaction.
- `tenantId` and `pricingUnit` are server-controlled and are not accepted from the form payload.

The fabric list and detail drawer still use static example data. Reading and refreshing the real list is planned as a separate phase.
