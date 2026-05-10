# SportsTracker

SportsTracker is a React + Vite frontend with an Express backend. The backend can run against PostgreSQL for normal development, or it can fall back to a local JSON demo store when `DATABASE_URL` is not set.

## Requirements

- Node.js LTS
- npm
- PostgreSQL 14+ for the real database path
- Docker Desktop, optional, if you want the included PostgreSQL container

## First-Time Setup

Install dependencies from the repo root:

```sh
npm run install:all
```

Create local env files from the templates:

```sh
copy server\.env.example server\.env
copy my-react-app\.env.example my-react-app\.env
```

On macOS/Linux, use `cp` instead of `copy`.

## Database Setup

If you use Docker, start the included PostgreSQL container:

```sh
docker compose up -d postgres
```

Or create a local PostgreSQL database named `sportstracker` yourself:

```sql
CREATE DATABASE sportstracker;
```

Then set `DATABASE_URL` in `server/.env`. The default template is:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sportstracker
```

Update the username and password to match your local PostgreSQL account. When the backend starts, it creates and updates the application tables automatically.

If `DATABASE_URL` is removed or left unset, the backend uses `server/data/app-data.json` as a demo store. That is useful for quick local testing, but PostgreSQL is the intended database setup.

## Environment Variables

Frontend file: `my-react-app/.env`

```env
VITE_API_BASE_URL=http://localhost:5001
VITE_SOCCER_API_KEY=your_rapidapi_key_here
VITE_SPORTSDB_API_KEY=your_sportsdb_api_key_here
```

Server file: `server/.env`

```env
PORT=5001
CLIENT_BASE_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sportstracker
JWT_SECRET=replace_with_a_long_random_secret
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sportstrackercmsc447@gmail.com
SMTP_PASS=your_gmail_app_password_here
SMTP_FROM="Sports Tracker <sportstrackercmsc447@gmail.com>"
APP_NAME=Sports Tracker
```

Do not commit real `.env` files or real SMTP passwords.

## Running The App

Start the backend:

```sh
npm run dev:server
```

Start the frontend in a second terminal:

```sh
npm run dev:client
```

The frontend runs at `http://localhost:5173`, and the backend runs at `http://localhost:5001`.

The first registered account becomes an admin account automatically.

## Useful Commands

```sh
npm run build
npm run test
```
