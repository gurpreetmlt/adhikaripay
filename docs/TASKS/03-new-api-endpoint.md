# Task 03 — New API Endpoint

## Steps
1. Schema (if needed): `apps/backend/src/db/postgres/schema/`
2. Service: `apps/backend/src/modules/<name>/<name>.service.ts`
3. Controller + validators
4. Route: mount in `apps/backend/src/app.ts`
5. Types: `packages/shared-types/index.ts` (if shared)

## Patterns
- Auth: `requireAuth` middleware
- Role: `requireRole('admin', ...)` 
- Money: `verifyTxnPinOrThrow` in controller
- Response: `sendSuccess(res, data, message)`

## Key imports
```ts
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/rbac.middleware";
```

## Test
```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/api/...
```

## Files to skip
- `apps/partner-web`, `apps/retailer-web` (legacy)
