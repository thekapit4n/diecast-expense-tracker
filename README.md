# Diecast Expense Tracker

Admin portal for tracking diecast collection expenses.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd diecast-expense-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_connection_string
```

4. Install Supabase CLI (if not already installed):
```bash
npm install -g supabase
```

5. Link to your Supabase project:
```bash
supabase link --project-ref your-project-ref
```

6. Run database migrations:
```bash
npm run db:migrate
```

This will create all necessary tables and seed initial data.

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:4000](http://localhost:4000) in your browser.

## Database Migrations

See [supabase/README.md](./supabase/README.md) for detailed information about database migrations.

### Quick Commands

- `npm run db:migrate` - Apply all migrations
- `npm run db:status` - Check migration status
- `npm run db:new <name>` - Create a new migration
- `npm run db:reset` - Reset database (WARNING: deletes all data)

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── expenses/          # Expense management pages
│   ├── collection/        # Collection pages
│   ├── management/        # Management pages (brands, etc.)
│   └── ...
├── components/            # React components
├── lib/                   # Utility functions
├── supabase/             # Database migrations
│   └── migrations/       # SQL migration files
└── data/                 # Static data files
```

## Features

- Expense tracking
- Collection management
- Brand management
- Category management
- Purchase tracking

## Tech Stack

- **Framework**: Next.js 16
- **Database**: Supabase (PostgreSQL)
- **UI**: React, Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form, Zod
- **Tables**: AG Grid
