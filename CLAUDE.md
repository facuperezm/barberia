# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a barbershop management application built with Next.js 15, featuring appointment booking, barber management, and payment processing. The app is designed for multi-tenant salon operations with comprehensive scheduling and customer management capabilities.

## Key Technologies

- **Next.js 15** with App Router and React Server Components
- **TypeScript** - strict typing throughout the codebase
- **Drizzle ORM** - type-safe database operations with PostgreSQL
- **Clerk** - authentication and user management
- **Tanstack Query** - server state management and caching
- **Tailwind CSS** + **Shadcn UI** - styling and component library
- **MercadoPago** - payment processing integration
- **Resend** - email notifications

## Development Commands

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Linting and formatting
pnpm lint          # Check for linting issues
pnpm lint:fix      # Fix linting issues automatically
pnpm format        # Format code with Prettier

# Database operations
pnpm db:push       # Push schema changes to database
pnpm db:studio     # Open Drizzle Studio for database management
pnpm db:generate   # Generate migration files
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed database with initial data
```

## Database Architecture

The application uses a multi-tenant PostgreSQL schema with the following core entities:

- **Salons** - Top-level tenant isolation with unique slugs
- **Barbers** - Salon employees with active status tracking
- **Services** - Configurable services with pricing and duration
- **Customers** - Customer profiles with preferences and notes
- **Appointments** - Core booking system with status tracking
- **WorkingHours** - Recurring weekly schedules per barber
- **ScheduleOverrides** - One-off date exceptions and custom availability
- **Payments** - MercadoPago integration with detailed transaction tracking
- **Ratings** - Post-appointment customer feedback

Key database patterns:
- All entities are salon-scoped for multi-tenancy
- Prices stored in cents for precision
- Timestamps with timezone support
- Comprehensive indexing for performance
- Check constraints for data integrity

## Application Structure

```
src/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── api/               # API routes
│   └── book/              # Public booking flow
├── components/
│   ├── emails/            # React Email templates
│   └── ui/                # Shadcn UI components
├── drizzle/               # Database schema and migrations
├── server/
│   ├── actions/           # Server Actions
│   └── queries/           # Database queries
├── hooks/                 # Custom React hooks
└── lib/                   # Utility functions
```

## Key Patterns

### Server Actions
- All database mutations use Server Actions in `src/server/actions/`
- Actions return `{ success: boolean, error?: string }` for consistent error handling
- Use Zod for input validation in Server Actions

### Database Queries
- Read operations in `src/server/queries/`
- Use Drizzle's query builder with proper relations
- Implement proper error handling and null checks

### Authentication
- Clerk provides authentication with `@clerk/nextjs`
- Protected routes use middleware for auth checking
- User context available throughout the app

### State Management
- Tanstack Query for server state caching
- Form state managed with React Hook Form + Zod validation
- Local state with useState for UI-only state

## Environment Configuration

Environment variables are validated using `@t3-oss/env-nextjs` in `src/env.ts`:

**Server Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `CLERK_SECRET_KEY` - Clerk authentication
- `OWNER_EMAIL` - Admin email for notifications
- `MERCADOPAGO_ACCESS_TOKEN` - Payment processing
- `MERCADOPAGO_WEBHOOK_SECRET` - Payment webhooks

**Client Variables:**
- `NEXT_PUBLIC_RESEND_API_KEY` - Email service
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk client config
- `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` - Payment client config

## Code Style Guidelines

Follow the rules defined in `.cursorrules`:
- Use functional and declarative TypeScript patterns
- Prefer Server Components over Client Components
- Use Zod for all form validation
- Implement proper error handling with early returns
- Use Shadcn UI and Tailwind for consistent styling
- Favor named exports and descriptive variable names
- Structure files: exported component, subcomponents, helpers, static content, types

## Testing and Quality

- Run `pnpm lint` before committing changes
- Use `pnpm format` to maintain consistent code style
- Test database changes with `pnpm db:studio`
- Verify email templates work correctly with appointment flows
