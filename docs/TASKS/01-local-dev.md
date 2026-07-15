# Task 01 — Local Dev Start

## Prerequisites
- Node 20+, Postgres running, Mongo running
- `apps/backend/.env` exists (copy from `.env.example`)

## Commands
```bash
cd "/Users/gurpreetchauhan/Desktop/Adhikari Pay"
npm install
npm run db:migrate -w @adhikaripay/backend
npm run seed:admin -w @adhikaripay/backend
npm run seed:catalog -w @adhikaripay/backend
npm run dev
```

## URLs
See [`LOGIN.md`](../../LOGIN.md)

## Files (only if broken)
- `apps/backend/.env`
- `apps/backend/src/server.ts`
- `apps/*/\.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

## Verify
```bash
curl http://localhost:4000/health
```
