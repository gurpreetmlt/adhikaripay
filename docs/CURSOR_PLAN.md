# Adhikari Pay — Cursor Efficiency Plan

> Goal: **poore mahine Cursor limit** — har task fast, kam files read, kam tokens.
>
> **Brand:** product = **Adhikari Pay**. npm workspaces = `@adhikaripay/*`. Mobile folder = `apps/mobile`.

---

## Golden rules

| # | Rule |
|---|------|
| 1 | **Hamesha task file `@` karo** — repo explore mat karwao |
| 2 | **Ek chat = ek task** — bada kaam todo list mein todo, alag chats |
| 3 | **AGENTS.md pehle** — sirf jab naya area ho |
| 4 | **LOGIN.md** — credentials ke liye search band |
| 5 | **Legacy ignore** — `partner-web`, `retailer-web`, `packages/db` (unused mongoose) |
| 6 | **Chhota prompt** — "fix login" ❌ → `@docs/TASKS/02-auth-login.md OTP resend fix` ✅ |
| 7 | **Terminal = Mac** — build/install/migrate/dev Cursor ke andar mat chalao (limit + timeout) |
| 8 | **MCP = on-demand** — browser / Figma / Datadog / Slack MCP tabhi jab task ya user explicitly maange |
| 9 | **Task done** → `docs/CHECKLIST.md` tick; phir **nayi chat** next task |

---

## Terminal rule (Mac only — Cursor shell mat use karo)

**Cursor agent = code only.** Build / install / migrate / dev servers / seed — **kabhi Cursor shell mein mat.** Agent response mein **copy-paste `bash` block** de; tum **Mac Terminal** mein chalao.

| Kaam | Cursor agent | Mac Terminal (tum) |
|------|--------------|-------------------|
| Code / icons / config edit | ✅ | — |
| Copy-paste commands dena | ✅ (response mein) | — |
| `npm run android` / Gradle build | ❌ mat chalao | ✅ |
| `npm run dev` / Metro start | ❌ | ✅ alag window |
| `db:migrate`, `npm install`, seed | ❌ mat chalao | ✅ |
| App phone pe install | ❌ | ✅ script neeche |
| `git status` / chhota readonly peek | ⚠️ avoid unless task needs | ✅ preferred |

**Prompt tip:** "Mac Terminal command do, Cursor shell andar mat chalao."

### Web + API (copy-paste Mac Terminal)

```bash
cd "/Users/gurpreetchauhan/Desktop/Adhikari Pay"
npm run dev              # Agent web :3001 (+ Frontend if configured)
npm run dev:backend      # API :4000
npm run db:migrate
npm run seed:admin -w @adhikaripay/backend
```

### Android install (copy-paste Mac Terminal)

```bash
cd "/Users/gurpreetchauhan/Desktop/Adhikari Pay"
bash scripts/install-android.sh
```

Pehli baar / icon change: phone se purani app **uninstall**, phir script.

Metro alag chahiye ho toh **Terminal 1:**
```bash
cd "/Users/gurpreetchauhan/Desktop/Adhikari Pay" && npm run dev:mobile
```
**Terminal 2** (install only):
```bash
cd "/Users/gurpreetchauhan/Desktop/Adhikari Pay/apps/mobile"
export CI=true
npx react-native run-android --no-packager --active-arch-only
```

Scripts: `scripts/install-android.sh` · `scripts/reset-metro.sh` · `scripts/generate-app-icons.py`

### Red screen: `ENOENT ... Desktop/Adhikari Pay/...`

Purana Metro chal raha hai (folder rename se). **Mac Terminal:**

```bash
cd "/Users/gurpreetchauhan/Desktop/Adhikari Pay"
bash scripts/reset-metro.sh
```

Dusri window mein app reload — ya `bash scripts/install-android.sh` (Metro + install ek saath).

---

## MCP rule (same token discipline as code tools)

MCP (browser, Figma, Datadog, Slack, Linear, handoff, etc.) **bhi limit khati hai** — tools + context baar baar.

| Do | Don't |
|----|--------|
| Pehle local docs: task file, `AGENTS.md`, `LOGIN.md`, `CURSOR_PLAN.md` | Exploratory MCP ("dekho kya servers hain") |
| MCP **sirf** jab task file / user explicitly maange (e.g. Figma → code, visual verify) | Browser automation default pe open karna |
| Visual check → user bole tab browser MCP; warna skip | Har bug pe Datadog / logs MCP |
| Schema / tool catalog dubara-dubara list mat karo | Unused MCP parallel spam |

**Default:** MCP off. Local file read + code edit + Mac Terminal commands enough hain most tasks ke liye.

**Prompt tip:**
```
@docs/TASKS/XX-task.md
No MCP, no browser, no explore. Sirf task paths. Mac Terminal commands response mein do.
```

---

## Prompt templates (copy-paste)

### Bug fix
```
@docs/TASKS/XX-task.md @AGENTS.md
[1 line problem]. Sirf task file ke paths edit karo. Poori repo mat padho.
No MCP, no Cursor shell — Mac Terminal commands reply mein do.
```

### Naya feature
```
@docs/TASKS/XX-task.md
Task file follow karo. Pehle sirf "Key files" wale paths read karo, phir implement.
Build/test commands Mac Terminal ke liye copy-paste do.
```

### Review only
```
@docs/TASKS/XX-task.md
Sirf [file path] review karo, change mat karo unless bug ho. No MCP unless main bolo.
```

---

## Task size guide (1 chat = kitna kaam)

| Size | Time | Cursor cost | Example |
|------|------|-------------|---------|
| **S** | 5–15 min | Low | Login text change, env fix |
| **M** | 15–45 min | Medium | New API route + web form |
| **L** | 1–2 hr | High | Full AEPS flow |
| **XL** | 2+ hr | Very high | **Split into S/M tasks** |

**XL task mat ek chat mein daalo** — `docs/ROADMAP.md` se phase todo banao.

---

## Chat split strategy (limit bachao)

```
❌ "Poora retailer app banao AEPS DMT BBPS ke saath"
✅ Chat 1: @09-retailer-aeps.md — withdraw form only
✅ Chat 2: @10-retailer-dmt.md — beneficiary add only
✅ Chat 3: @11-mobile-bottom-tabs.md — navigation only
```

---

## File read order (agent ke liye fixed)

```
1. docs/TASKS/XX-task.md     (~30 lines)
2. AGENTS.md                 (only if task references unknown area)
3. Key files from task       (2–5 files max)
4. STOP — implement
```

**Kabhi mat padho (unless task says):**
- `node_modules/`, `.next/`, `dist/`
- Legacy apps
- Full migration SQL history
- Entire `apps/backend/src/modules/`

---

## Monthly usage tips

| Tip | Detail |
|-----|--------|
| **Composer vs Chat** | Chhote fixes → Chat + 1 task file. Bade features → todo split |
| **Auto mode** | Simple tasks OK; complex money/ledger → normal chat + task file |
| **Context** | `@file` specific files — `@Codebase` avoid karo |
| **MCP** | Default off — sirf task/user need; dekh [`MCP rule`](#mcp-rule-same-token-discipline-as-code-tools) |
| **Terminal** | Agent commands copy-paste; tum Mac Terminal — Cursor shell heavy cmds mat |
| **Repeat work** | Same task file dubara `@` — agent ko dubara explore nahi karna |
| **End chat** | Task complete → `CHECKLIST.md` update → nayi chat (context clean) |

---

## When to add new task file

Naya task file banao jab:
- Same area par **3+ baar** kaam ho
- 5+ files involved hon
- Next agent ko **10 min se kam** mein context chahiye

Template: `docs/TASKS/_TEMPLATE.md`

---

## Emergency (limit kam bache)

1. Sirf `@docs/TASKS/XX.md` + exact file path do
2. "Read only these 3 files" likho
3. "No explore, no refactor, no MCP, no Cursor shell" likho
4. Kal ke liye bacha lo — XL task split karo

---

## Quick reference

| Doc | Use |
|-----|-----|
| [LOGIN.md](../LOGIN.md) | Credentials |
| [AGENTS.md](../AGENTS.md) | Project map |
| [TASKS/INDEX.md](TASKS/INDEX.md) | Pick task |
| [ROADMAP.md](ROADMAP.md) | What's next, phased |
| [CHECKLIST.md](CHECKLIST.md) | Done / pending |
