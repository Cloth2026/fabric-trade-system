# Fabric Trade System Context

This is a fresh rebuild of the fabric trade management system.

The old localhost prototype is business reference only. Do not preserve its code or architecture unless explicitly requested.

## Stack

- Next.js
- TypeScript
- PostgreSQL
- Prisma 7 with PostgreSQL driver adapter
- Tailwind CSS
- shadcn/ui direction
- TanStack Table
- lucide-react
- Framer Motion for subtle transitions

## Product Direction

Build a Web-based LAN multi-user system first, with architecture compatible with cloud SaaS and private deployment.

The UI direction is Apple-inspired Professional SaaS: clean, restrained, polished, fast, and fabric-archive focused.

## First Module

The fabric library is the first MVP module.

It must support:

- lightweight archives for market finished products
- knitted fabrics priced by kg by default
- woven fabrics priced by meter by default
- optional greige information
- optional dyeing and finishing information
- optional post-process information
- stock-in batches
- completeness markers
