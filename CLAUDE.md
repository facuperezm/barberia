# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix ESLint issues
pnpm format           # Format with Prettier

# Database (Drizzle ORM with Neon PostgreSQL)
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio
pnpm db:generate      # Generate migrations
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed database (tsx --env-file .env src/drizzle/seed/seed.ts)
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15 with App Router (React 19)
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Auth**: Clerk
- **Payments**: MercadoPago
- **Styling**: Tailwind CSS with shadcn/ui (Radix primitives)
- **Data Fetching**: TanStack Query for client state, Server Components for server data
- **Forms**: react-hook-form with Zod validation
- **Email**: Resend with React Email templates

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth routes (sign-in)
│   ├── (dashboard)/       # Admin dashboard (protected)
│   ├── api/               # API routes (appointments, availability, payments)
│   └── book/              # Public booking flow
├── components/
│   ├── emails/            # React Email templates
│   └── ui/                # shadcn/ui components
├── drizzle/
│   ├── schema.ts          # Database schema (single file)
│   ├── migrations/        # SQL migrations
│   └── seed/              # Seed data
├── server/
│   ├── actions/           # Server actions (barbers, appointments, schedule, payments, services)
│   └── queries/           # Database queries
├── lib/                   # Utilities (email, logger, utils, salon-context)
└── hooks/                 # React hooks
```

### Multi-tenant Database Schema
The app is designed for multi-tenant barbershop management. Core entities:
- `salons` - Multi-tenant root (all entities have `salonId`)
- `barbers` - Employees who provide services
- `services` - Available services with price (stored as cents) and duration
- `customers` - Customer records per salon
- `appointments` - Bookings linking barber, service, and customer
- `workingHours` - Recurring weekly schedule per barber
- `scheduleOverrides` - One-off date exceptions (days off, special hours)
- `payments` - Payment records (MercadoPago integration)
- `ratings` - Customer feedback per appointment

### Key Patterns

**Route Groups**: Uses Next.js route groups - `(auth)` for auth pages, `(dashboard)` for admin area with sidebar layout.

**Booking Flow**: Multi-step wizard at `/book` using URL search params for state. Steps: barber selection → date/time → service → customer info.

**Server Actions**: Located in `src/server/actions/`. Use `"use server"` directive. Handle CRUD for all entities.

**Environment Variables**: Validated with `@t3-oss/env-nextjs` in `src/env.ts`. Server vars: `DATABASE_URL`, `CLERK_SECRET_KEY`, `MERCADOPAGO_ACCESS_TOKEN`. Client vars prefixed with `NEXT_PUBLIC_`.

## Code Style

From `.cursorrules`:
- Use functional/declarative patterns, avoid classes
- Prefer interfaces over types; avoid enums (use maps)
- Use Zod for form validation
- Use descriptive variable names with auxiliary verbs (isLoading, hasError)
- Desktop-first responsive design with Tailwind
- Minimize `useEffect` and `setState`; favor React Server Components
- Limit `"use client"` to small components needing Web API access
- Use early returns and guard clauses for error handling
- Model expected errors as return values in Server Actions
