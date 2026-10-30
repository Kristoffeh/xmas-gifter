# 🎄 Christmas Gifter

A web application to help you keep track of Christmas gifts you need to purchase or have already purchased for the people you're giving gifts to.

## Features

- **User Authentication**: Register and login to your account
- **Onboarding Process**: 
  - Step 1: Add all the people you plan to give gifts to
  - Step 2: Optionally add gift ideas for each person
- **Dashboard**: View and manage your gift list with:
  - Overview statistics (total people, gifts found, still needed)
  - List of people with gifts found
  - List of people still needing gifts
  - Edit or delete existing gifts
  - Add gifts for people who don't have one yet

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MariaDB with Prisma ORM
- **Authentication**: NextAuth.js

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MariaDB database running
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd xmas-gifter
```

2. Install dependencies:
```bash
npm install
```

   If npm warns that Prisma's install scripts are not covered by `allowScripts`, that's fine: `npm run dev` and `npm run build` both run `prisma generate` themselves. To allow them anyway:
```bash
npm install-scripts approve @prisma/client prisma @prisma/engines
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` (`.env` is ignored by git, never commit it)
   - Update the `DATABASE_URL` with your MariaDB connection string:
     ```
     DATABASE_URL="mysql://user:password@localhost:3306/xmas_gifter"
     ```
   - Generate a secret for NextAuth and add it to `NEXTAUTH_SECRET`:
     ```bash
     openssl rand -base64 32
     ```
   - Set `NEXTAUTH_URL` to your application URL (default: `http://localhost:3000`)

4. Run the development server:
```bash
npm run dev
```
   The dev script (`scripts/dev.js`) generates the Prisma Client, then runs `prisma db push` to create the database and sync its tables with `prisma/schema.prisma`. If `DATABASE_URL` is missing or the database can't be reached, it skips the sync and starts Next.js anyway; pages load, but registering and logging in will fail.

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Dependencies

- `next` is pinned to an exact version (currently `14.2.35`, the last 14.2 patch). Bump it deliberately rather than relying on `npm update`.
- `npm audit` still reports advisories for Next.js 14, which no longer receives security fixes. Fixing them requires upgrading to Next.js 16 (and React 19), which is a breaking change that hasn't been done yet.
- To update other dependencies within their allowed ranges, run `npm update`, then `npx tsc --noEmit` to typecheck.

## Database Schema

- **User**: Stores user account information
- **Person**: Stores people the user is giving gifts to
- **Gift**: Stores gift descriptions for each person (one-to-one relationship)

## Usage

1. **Register/Login**: Create an account or login to your existing account
2. **Onboarding**: 
   - First time users will be guided through onboarding
   - Add all people you plan to give gifts to
   - Optionally add gift ideas for each person
3. **Dashboard**: 
   - View your gift list
   - Edit or add gifts for people
   - Track your progress with statistics

## License

MIT





