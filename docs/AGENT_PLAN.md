# Adhikari Pay — Agent Efficiency Plan

> **Global:** Cursor `~/.cursor/rules/token-efficiency.mdc` · Claude `~/.claude/CLAUDE.md`  
> **Kit:** `~/Documents/AI-Agent-Plan/` (copy to any new project)

## Project extras
| Rule | Detail |
|------|--------|
| Brand | Adhikari Pay · `@adhikaripay/*` |
| DB | Postgres only · Redis cache optional |
| Ignore | `partner-web`, `retailer-web` |
| Creds | `LOGIN.md` |
| Tasks | `docs/TASKS/INDEX.md` → one file |
| Done | `docs/CHECKLIST.md` → new chat |

## Terminal (Mac)
```bash
cd "/Users/gurpreetchauhan/Desktop/Adhikari Pay"
npm run dev:backend
npm run db:migrate
bash scripts/install-android.sh
```

## Prompt
```
@docs/TASKS/XX.md @AGENTS.md
[goal]. No explore. No MCP. Mac Terminal cmds in reply.
```

## Size
S/M = 1 chat · L/XL = split · never one-shot full features

## Docs
`AGENTS.md` · `CLAUDE.md` · `TASKS/INDEX.md` · `ROADMAP.md` · `CHECKLIST.md`
