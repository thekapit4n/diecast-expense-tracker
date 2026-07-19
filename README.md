# Diecast Expense Tracker

Tools for tracking a diecast collection and its expenses. The project is a
monorepo with two apps that share the **same Supabase database**:

| App | Folder | Tech | Purpose |
|-----|--------|------|---------|
| **Web admin** | `app/`, `components/`, `lib/` | Next.js | Full management: bulk edits, imports, reports, brand/shop management |
| **Mobile companion** | `mobile/` | Flutter | Quick daily tasks on a phone: scan a box, check owned/pre-order status, add a purchase, update pre-orders |

The web admin is the primary tool; the mobile app is a lightweight companion.
Because they share one Supabase project, there is no data syncing to maintain.

> The instructions below cover the **web admin**. For the mobile app, see
> [Mobile App](#mobile-app) and [documents/mobile/mobile-app-mvp.md](./documents/mobile/mobile-app-mvp.md).

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
├── app/                    # Next.js app directory (web admin)
│   ├── catalog/           # Public/admin catalog pages
│   ├── collection/        # Collection pages
│   ├── purchase/          # Purchase + pre-order pages
│   ├── management/        # Management pages (brands, shops, etc.)
│   └── ...
├── components/            # React components
├── lib/                   # Shared web utility functions
├── supabase/             # Database migrations (shared by both apps)
│   └── migrations/       # SQL migration files
├── data/                 # Static data files
├── mobile/               # Flutter companion app (see Mobile App section)
│   ├── lib/              # Dart source (features/, data/, core/)
│   ├── ios/              # iOS project
│   └── android/          # Android project
└── documents/            # Project docs
    ├── changes/          # Web admin daily changelog
    └── mobile/           # Mobile app spec + its own daily changelog
```

## Features

- Expense tracking
- Collection management
- Brand management
- Category management
- Purchase tracking
- Pre-order tracking

## Mobile App

A Flutter companion app in [`mobile/`](./mobile) that connects to the same
Supabase project. It focuses on quick phone tasks: sign in, view a collection
dashboard, browse the catalog, scan a diecast box (barcode + on-device OCR) to
check owned/pre-order status, add a purchase, and manage the pre-order
lifecycle.

- **Spec:** [documents/mobile/mobile-app-mvp.md](./documents/mobile/mobile-app-mvp.md)
- **Changelog:** [documents/mobile/changes/](./documents/mobile/changes)

### Prerequisites

- Flutter SDK (stable) and Dart
- Xcode (for iOS) — the scanner's OCR (Google ML Kit) needs a **real iOS
  device**; it does not run on Apple Silicon simulators

### Setup

```bash
cd mobile
flutter pub get
```

Create `mobile/.env` (gitignored) with the Supabase client credentials:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Run

```bash
# list devices, then run on one
flutter devices
flutter run -d <device-id>
```

### Test / analyze

```bash
flutter analyze
flutter test
```

## Tech Stack

**Web admin**

- **Framework**: Next.js 16
- **Database**: Supabase (PostgreSQL)
- **UI**: React, Tailwind CSS, shadcn/ui
- **Forms**: React Hook Form, Zod
- **Tables**: AG Grid

**Mobile app**

- **Framework**: Flutter (Dart)
- **State**: Riverpod
- **Navigation**: go_router
- **Backend**: supabase_flutter (same Supabase project)
- **Scanner**: mobile_scanner (barcode) + Google ML Kit (OCR)
