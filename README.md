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

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Update the `DATABASE_URL` with your MariaDB connection string:
     ```
     DATABASE_URL="mysql://user:password@localhost:3306/xmas_gifter"
     ```
   - Generate a secret for NextAuth and add it to `NEXTAUTH_SECRET`:
     ```
     NEXTAUTH_SECRET="your-secret-key-here"
     ```
   - Set `NEXTAUTH_URL` to your application URL (default: `http://localhost:3000`)

4. Set up the database:
```bash
npx prisma migrate dev --name init
```

5. Generate Prisma Client:
```bash
npx prisma generate
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
xmas-gifter/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # NextAuth handler
│   │   │   ├── register/route.ts         # User registration
│   │   │   └── onboarding-complete/route.ts
│   │   ├── people/route.ts               # People CRUD operations
│   │   └── gifts/route.ts                # Gifts CRUD operations
│   ├── dashboard/                        # Main dashboard page
│   ├── login/                            # Login/Register page
│   ├── onboarding/                       # Onboarding flow
│   ├── layout.tsx                        # Root layout
│   ├── page.tsx                          # Home page (redirects to login)
│   └── providers.tsx                     # NextAuth SessionProvider
├── lib/
│   ├── auth.ts                           # NextAuth configuration
│   └── prisma.ts                         # Prisma client instance
├── prisma/
│   └── schema.prisma                     # Database schema
├── types/
│   └── next-auth.d.ts                    # NextAuth type definitions
└── middleware.ts                         # NextAuth middleware

```

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





