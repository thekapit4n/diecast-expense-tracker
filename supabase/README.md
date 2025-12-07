# Supabase Migrations

This directory contains database migration files for the diecast expense tracker project.

## Setup

1. Install Supabase CLI (if not already installed):
```bash
npm install -g supabase
```

2. Link to your Supabase project:
```bash
supabase link --project-ref iqfturorjeunuwhozsmd
```

You'll need your Supabase access token. Get it from: https://supabase.com/dashboard/account/tokens

## Running Migrations

### Apply all migrations to your database:
```bash
npm run db:migrate
```

Or using Supabase CLI directly:
```bash
supabase db push
```

### Check migration status:
```bash
npm run db:status
```

Or:
```bash
supabase migration list
```

### Reset database (WARNING: This will delete all data):
```bash
npm run db:reset
```

Or:
```bash
supabase db reset
```

## Creating New Migrations

1. Create a new migration file:
```bash
supabase migration new your_migration_name
```

This will create a file like: `supabase/migrations/YYYYMMDDHHMMSS_your_migration_name.sql`

2. Write your SQL in the migration file

3. Apply the migration:
```bash
npm run db:migrate
```

## Migration Files

- `20240101000000_create_tbl_master_brand.sql` - Creates the brands table
- `20240101000001_seed_tbl_master_brand.sql` - Seeds initial brand data

## Best Practices

1. **Never edit existing migration files** - Always create new migrations for changes
2. **Use IF NOT EXISTS** - Makes migrations idempotent (safe to run multiple times)
3. **Use ON CONFLICT** - For seed data, use `ON CONFLICT DO NOTHING` to prevent duplicates
4. **Test locally first** - Use `supabase start` to test migrations locally before pushing to production
5. **Version control** - Always commit migration files to git

## Local Development

To run Supabase locally for testing:

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# View local database
supabase db diff
```

