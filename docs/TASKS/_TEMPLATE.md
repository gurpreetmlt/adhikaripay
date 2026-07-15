# Task Template

Copy this file → `docs/TASKS/XX-short-name.md`

```markdown
# Task XX — [Title]

## Size: S | M | L
## Depends: [other task # or none]

## Goal (1 line)
[What done looks like]

## Read ONLY these files
| Path | Why |
|------|-----|
| `path/to/file.ts` | ... |

## Do NOT read
- [list legacy or unrelated paths]

## Steps
1. ...
2. ...

## Test
\`\`\`bash
# command or URL
\`\`\`

## Done when
- [ ] ...
```

## Rules
- Max **40 lines** per task file
- Exact file paths — no "search the codebase"
- Split if >5 key files
