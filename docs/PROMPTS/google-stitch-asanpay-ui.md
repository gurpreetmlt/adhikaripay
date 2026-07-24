# Google Stitch Prompt — AsanPay Full UI (Web + Mobile App)

Complete, feature-accurate prompt set — covers every screen that actually exists in the
built product (not a generic template). Organized by role. Paste the **Design System**
block first in each Stitch project, then paste screens one at a time (see notes at the
bottom on why).

---

## 0. Brand & Design System (paste first, every project)

```
Design a fintech agent-network app called "AsanPay" — an Indian financial services platform
where retail shop owners (Retailers), Distributors, and Super Distributors offer banking
services (AEPS cash withdrawal, DMT money transfer, bill payments, recharge) to walk-in
customers at their shop counter — similar in spirit to Paytm/PayNearby agent apps, but with
a full multi-level distributor hierarchy and an admin back-office.

Brand name: AsanPay
Tone: simple, trustworthy, fast. "Asaan" means "easy" in Hindi — the brand should feel
approachable, not corporate. Primary users are small shop owners on budget Android phones,
not tech-savvy office workers. Admin/back-office screens can be denser and more data-rich.

Theme requirement — CRITICAL:
- Every single screen must be generated in BOTH light mode and dark mode, fully polished in
  each — not an inverted palette. Financial apps get used in bright shop-counter daylight AND
  dim back-office settings, so dark mode needs strong contrast, never muddy gray-on-gray.
- Include a visible theme toggle (sun/moon icon) in the header on web, and in
  Settings/Account on mobile.

Color system:
- Primary: trustworthy blue (banking/trust signal)
- Accent/CTA: confident green (money/growth/success signal)
- Status colors used consistently everywhere: green = success, amber/orange = pending,
  red = failed/error, gray = inactive/disabled
- Wallet/money amounts always in bold, large numerals — money is the hero content on most
  screens

Visual style:
- Rounded corners (16-20px on cards), generous spacing, LARGE tap targets (shop-counter use)
- Simple line icons, consistent stroke weight — clean and credible, not cartoonish (real
  money is handled here)
- Clean sans-serif type, strong size hierarchy: big bold numbers for amounts, medium weight
  for labels, muted gray for secondary text
- Card-based layout throughout — dashboards are grids of cards, not dense spreadsheets
  (except admin data tables, which can be denser)
```

---

## 1. WEB APP — Shared Login & Auth Flow

```
Generate these auth screens for the AsanPay web portal, light + dark mode. This is the
SAME login flow for all four roles (Admin, Super Distributor, Distributor, Retailer) — the
system detects the role after login and routes to the right dashboard, so the login screen
itself has no role selector.

1. LOGIN SCREEN
   - AsanPay logo + tagline, centered card on a soft branded background
   - Mobile number field (10-digit, +91 prefix shown) + password field
   - A toggle/link to switch to "Login with OTP instead"
   - "Forgot password?" link
   - Primary CTA button "Log In"
   - Error states: wrong password (inline red text under field), account locked (banner)

2. OTP LOGIN VARIANT
   - Mobile number entry → "Send OTP" → 6-box OTP input screen with resend timer (30s
     countdown, then "Resend OTP" becomes active)

3. FORGOT PASSWORD FLOW
   - Enter mobile number → OTP verification → new password + confirm password screen →
     success confirmation

4. QUICK MPIN UNLOCK (returning session)
   - 4-digit PIN pad for a user who's already logged in on this browser once before,
     "Not you? Log out" link below
```

---

## 2. WEB APP — Retailer Role (inner pages, after login)

```
Generate these screens for the AsanPay web portal, Retailer role, light + dark mode.
Persistent left sidebar nav: Dashboard, Passbook, Support. Top header: AsanPay logo, theme
toggle, notification bell, user avatar with role label "Retailer".

1. DASHBOARD
   - Two-wallet balance hero card (Main Wallet + AEPS Wallet side by side or stacked),
     gradient background, pending-amount subtext, "today's commission earned" highlight
   - Today's stats row: transaction count, success rate %, volume
   - Quick Services grid: icon tiles for AEPS Withdraw, AEPS Mini Statement, AEPS Balance
     Enquiry, DMT / Money Transfer, Recharge, Bill Pay (BBPS), Nepal Remittance, UPI Cash
     Point — each a tappable icon card with a small star/favourite toggle
   - Favourites strip (starred shortcuts) shown above the full grid when any exist
   - Announcements/Notices card (empty state: "No announcements right now")
   - KYC status card: green "Verified" state, OR amber "Pending/Rejected" state with a
     "Register Now" CTA linking to outlet onboarding
   - Recent Transactions list (last 5): service icon, name, time-ago, amount, status badge

2. AEPS SERVICE SCREEN (tabbed: Withdraw / Mini Statement / Deposit / Balance Enquiry)
   - Aadhaar number input (masked/formatted as it's typed)
   - Amount keypad for Withdraw/Deposit tabs
   - "Capture Fingerprint" waiting state with animated biometric icon
   - Success screen: green check, amount, txn ref, receipt actions
   - Failure screen: red icon, reason text, retry CTA

3. DMT (MONEY TRANSFER) SCREEN
   - Beneficiary list (saved recipients) + "Add Beneficiary" form (name, mobile, account
     number, IFSC, bank name auto-filled from IFSC)
   - Amount entry + OTP confirmation step
   - Transaction status screens (success/pending/failed)

4. OUTLET ONBOARDING / KYC FORM (multi-step)
   - Step 1: Personal details (name, PAN, Aadhaar — formatted input with auto-spacing)
   - Step 2: Outlet details (shop name, address with an auto-detect-location button that
     fills city/pincode, a resolved-address confirmation banner)
   - Step 3: Document upload (PAN card photo, Aadhaar photo, shop photo — drag/tap upload
     tiles with preview thumbnails)
   - Step 4: Review & submit, then a "Pending Verification" success state

5. PASSBOOK / TRANSACTION HISTORY
   - Filterable list (date range, service type, status), grouped by date
   - Each row: service icon, name, amount, status badge, time
   - Tap row → detail panel/modal: full txn ref, provider response summary, commission
     earned on this txn

6. SUPPORT PAGE
   - "My Tickets" list with status badges (Open amber / Resolved green)
   - "+ New Ticket" button opens a form: subject, description, optional linked transaction
   - Resolved ticket shows the admin's resolution note in a highlighted box
```

---

## 3. WEB APP — Distributor Role (inner pages)

```
Generate these screens for the AsanPay web portal, Distributor role, light + dark mode.
Sidebar nav: Dashboard, Network, Action Queue, KYC Assistant, Float & Earnings, Passbook,
Support.

1. DASHBOARD
   - Wallet balance hero card
   - Retailer network stat cards: Total Retailers, Active This Month, Inactive
   - Today's Volume + Commission Today cards
   - Top Retailers table (name, avatar initials, today's volume) — sorted highest first
   - 6-month retailer activity bar chart (total / transacted / no-activity per month)
   - Quick Actions row: Add Retailer, Fund Transfer, View Network

2. NETWORK / MY RETAILERS
   - Table view: retailer name, mobile, UID, KYC status badge, wallet balance, active
     toggle switch, action buttons (view, move to another distributor)
   - Toggle to switch to Tree view: expandable hierarchy nodes
   - A shared "Move Agent" modal: single or multi-select (checkboxes), shows "Currently
     under [distributor name]" ancestor chain, search-by-mobile field, confirm button
   - Mobile search bar with live filtering

3. ACTION QUEUE
   - Filter chips: All / KYC Pending / Low Balance / Inactive, each showing a count badge
   - List of flagged retailers: name, mobile, UID, issue-type badge (color-coded), for
     low-balance shows the actual balance amount
   - Empty state: "Nothing needs attention right now 🎉"

4. KYC COMPLETION ASSISTANT
   - List of not-yet-verified retailers in the network
   - Each card: retailer info, current KYC status badge, and a row of red "Missing" chips
     for exactly which fields are incomplete (PAN / Aadhaar / Outlet Registration / Outlet
     Location) — or a "awaiting admin verification" note if nothing is missing

5. FLOAT & EARNINGS PLANNER
   - Three stat cards: Your Balance, Deployed Float (into network, shows agent count),
     Total Network Float
   - Commission Earned panel: Today / Last 7 Days / This Month mini-stats

6. SUPPORT PAGE
   - Same pattern as Retailer support page
```

---

## 4. WEB APP — Super Distributor Role (inner pages)

```
Generate these screens for the AsanPay web portal, Super Distributor role, light + dark
mode. Same sidebar structure as Distributor, plus a Distributors sub-view.

1. DASHBOARD
   - Wallet balance hero card
   - Network overview stat cards: Distributors, Total Retailers, Active Retailers
   - Revenue summary: Today's Volume (with up/down % vs yesterday), Yesterday's Volume,
     Commission Today
   - Distributor Performance table: distributor name (avatar initials), retailer count,
     volume — sortable
   - Alerts panel: inactive retailer count warning, "coming soon" placeholders for fund
     requests / KYC alerts
   - Quick Actions: Add Distributor, Fund Transfer, Network Tree

2. NETWORK TREE (full hierarchy)
   - Same tree/table dual-view and Move Agent modal as Distributor role, but spans the
     entire downline (Distributors → Retailers)

3. ACTION QUEUE, KYC ASSISTANT, FLOAT & EARNINGS, SUPPORT
   - Same screens as Distributor role, scoped to the full multi-level downline instead of
     direct retailers only
```

---

## 5. WEB APP — Admin Role (back-office, denser data screens)

```
Generate these screens for the AsanPay admin back-office, light + dark mode. Sidebar
grouped into sections: "Full Control" (Dashboard, Network, KYC Queue, Transactions,
Wallet & Fund, Passbook), "Platform" (Service Badges, Commissions, Reconciliation, Risk
Alerts, Recovery Workbench, Support Tickets), "Developer" (Providers, Audit Log).

1. ADMIN DASHBOARD — platform-wide KPI overview (total users by role, total volume, total
   commission paid out, active vs inactive agents)

2. PROVIDER MANAGEMENT (Developer > Providers)
   - Category-grouped cards (AEPS, DMT, Recharge, Bill Pay) each showing member providers
     with a health-percentage bar, priority order (drag-handle icons), active/inactive
     toggle per provider
   - A typed-confirm "Disable All" danger modal (must type the category name to confirm)
   - A risk-warning modal before activating a risky provider/category combination

3. NETWORK TREE (admin — full org from every Super Distributor root down)

4. USERS TABLE (all agents)
   - Filterable/searchable table: name, mobile, UID, role badge, KYC status, wallet
     balance, active toggle, action icons (view, move, commission edit)
   - Bulk-select checkboxes + bulk action bar (bulk move)

5. KYC QUEUE
   - Pending KYC submissions list, tap to open a detail view with submitted documents,
     Approve / Reject buttons with a rejection-reason field

6. COMMISSIONS EDITOR
   - Per-agent commission rate table, grouped by service category (collapsible groups),
     AEPS services shown as one collapsible group with a shared-rate control plus
     per-service override when expanded

7. SITE CONTROL / SERVICE BADGES
   - Catalog services list with badge editor (e.g. "New", "Popular") and a Min/Max
     transaction-limit column with inline-editable number inputs

8. RECONCILIATION
   - Two summary stat cards (Status Mismatches count, Still Pending count)
   - Table: txn ref, retailer, amount, Our Status badge vs Provider Status badge
     side-by-side, mismatch rows highlighted with a warning icon

9. RISK ALERTS
   - List of agents with 3+ failed transactions in 24h, each row showing the fail count
     in a red badge, links to the agent's profile
   - A note banner clarifying this is threshold-based, not a scored/AI model

10. RECOVERY WORKBENCH
    - Pending/Failed tab toggle
    - Transactions grouped by service name, each row has a "Recheck" button (spinner state
      while rechecking)

11. SUPPORT TICKETS (admin)
    - Open/Resolved tab toggle
    - Ticket cards with reporter info, description, and an inline resolution-note input +
      Resolve button for open tickets

12. AUDIT LOG
    - Chronological table of admin actions: actor, action type, target, timestamp,
      expandable detail row
```

---

## 6. MOBILE APP — Shared Login & Auth Flow (Android)

```
Generate these auth screens for the AsanPay Android app, light + dark mode, optimized for
360-412dp width. Same flow for all roles — role is detected after login.

1. SPLASH SCREEN — AsanPay logo centered, gradient background, brief tagline, auto-advances

2. LOGIN SCREEN
   - Mobile number input (large, numeric keypad, +91 prefix)
   - Password field with show/hide toggle
   - "Login with OTP instead" link
   - "Forgot password?" link

3. OTP VERIFICATION SCREEN
   - 6-box OTP input, auto-focus advance, resend timer, "auto-read from SMS" hint text

4. MPIN QUICK-UNLOCK SCREEN (returning session)
   - 4-digit PIN pad, biometric fingerprint icon as an alternate unlock option, "Not you?"
     logout link

5. FORGOT PASSWORD / RESET FLOW
   - Same step pattern as web: mobile entry → OTP → new password → success
```

---

## 7. MOBILE APP — Retailer Role (inner screens)

```
Generate these screens for the AsanPay Android app, Retailer role, light + dark mode.
Bottom tab bar: Home, Passbook, Services, Support, Account — floating-pill active-tab style.

1. HOME
   - Wallet balance hero card with an eye icon to hide/reveal the balance, secondary AEPS
     wallet balance shown smaller alongside
   - Today's earnings highlight strip
   - Horizontal scrollable service icon row (AEPS, DMT, Recharge, Bill Pay, Nepal, UPI Cash
     Point) — large tappable tiles
   - Favourites row above the full service grid
   - Recent transactions mini-list, "View All" link to Passbook

2. AEPS FLOW (tab: Withdraw / Mini Statement / Deposit / Balance Enquiry)
   - Amount entry with large numeric keypad and running total display
   - Aadhaar number masked input field
   - "Place finger on device" animated waiting state
   - Success screen: full-screen green check animation, amount, txn ref, Share/Print
     receipt buttons
   - Failure screen: red icon, plain-language reason, Try Again CTA

3. DMT FLOW
   - Beneficiary list (bottom-sheet style add-new-beneficiary form: name, mobile, account,
     IFSC with bank-name auto-fill)
   - Amount entry + OTP confirmation bottom sheet
   - Success/failure screens matching the AEPS pattern

4. OUTLET ONBOARDING (KYC) — mobile stepper
   - Same 4-step flow as web (Personal → Outlet → Documents → Review), but each step is a
     full screen with a progress dots indicator at top, camera-capture tiles for document
     photos

5. PASSBOOK (bottom tab)
   - Date-grouped transaction list, status-colored left border on each row
   - Tap → bottom sheet with full transaction detail

6. SUPPORT (bottom tab)
   - Ticket list, floating "+" button to raise a new ticket (opens a bottom sheet form)

7. ACCOUNT (bottom tab)
   - Shop/outlet summary card, KYC status, Settings list: Change MPIN, Theme toggle
     (light/dark/system), Notification preferences, Logout

8. NOTIFICATIONS SCREEN
   - Alert list: low balance, KYC reminders, transaction status updates — icon + color
     coded by type
```

---

## 8. MOBILE APP — Distributor / Super Distributor Role (inner screens)

```
Generate these screens for the AsanPay Android app, Distributor/Super Distributor role,
light + dark mode. Bottom tab bar: Home, Network, Action Queue, More.

1. HOME
   - Wallet balance hero card
   - Network stat tiles (Total Retailers/Distributors, Active, Volume Today, Commission
     Today) in a 2x2 grid
   - Top performers mini-list

2. NETWORK
   - Searchable agent list (avatar initials, name, mobile, KYC badge, balance)
   - Tree/Table toggle at top
   - Tap an agent → detail bottom sheet with a "Move to different upline" action

3. ACTION QUEUE
   - Filter chip row (All / KYC Pending / Low Balance / Inactive) with counts
   - Card list matching the web version's issue-type badges

4. MORE tab (fans out to)
   - KYC Assistant screen (same missing-field-chip pattern as web, mobile card layout)
   - Float & Earnings screen (stat cards stacked vertically on mobile)
   - Support (same as retailer's Support screens)
   - Account/Settings
```

---

## 9. Notes for using Stitch effectively

- Paste the Design System prompt (section 0) once per project, then generate ONE screen at
  a time — asking for 8-10 screens in a single prompt visibly drops quality and consistency.
- Get light mode approved first, then ask "generate the exact same layout in dark mode" as
  a follow-up on that screen — don't request both in the same generation.
- After the first 2-3 screens look right, tell Stitch: "keep this exact component style
  (cards, buttons, badges) and design [next screen name] to match" — this locks visual
  consistency instead of drifting style screen to screen.
- Do the Login flow and one role's Dashboard first as your style anchor before moving to
  the rest — every other screen should visually derive from those two.
