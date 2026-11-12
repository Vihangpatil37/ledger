# Ledger (Chai Ledger V4)

A fast, responsive, and privacy-focused personal khata book for tracking **Udhar** (money you gave / they owe you) and **Received** payments (money returned / you owe) with running balances, multi-channel statement sharing, and a comprehensive financial dashboard.

Built with **Next.js 15 (App Router)**, **React 19**, **Tailwind CSS v4**, and **MongoDB Atlas** (using app-owned stateless JWT cookie sessions via `jose` and `bcryptjs` — with zero third-party auth dependencies).

---

## Features

- **Modern Paper & Ink Design**: Clean, tactile accounting visual identity with humanist typography (**DM Sans**) and tabular numeric digits (**DM Mono**) for aligned financial columns.
- **Financial Health Dashboard**:
  - **Net Balance**: Instant view of your overall receivable vs. payable position.
  - **Udhar (You will get)**: Total debit balance with active debtor count.
  - **You will give**: Total credit balance with active creditor count.
  - **Recent Activity Feed**: Real-time list of latest transactions across all contacts with timestamps and notes.
- **Filterable Contact Directory**:
  - Filter tabs: **All**, **Owes you (Udhar)**, **You owe**, and **Settled**.
  - Real-time client-side search by contact name or phone number.
  - Contact initials avatar badges and one-tap WhatsApp reminder shortcuts.
- **Multi-Channel Statement Sharing**:
  - Export and share statements directly from any contact ledger.
  - Scope selector: **Recent 5**, **Recent 10**, or **All history**.
  - **WhatsApp Direct**: Opens WhatsApp with pre-filled formatted statement.
  - **Native Device Share**: Triggers the iOS/Android system share drawer (`navigator.share`).
  - **1-Click Copy**: Instant clipboard copy with feedback confirmation.
  - **Print / PDF**: Clean printer-friendly statement layout via `@media print`.
- **Zero Float Drift Money Model**:
  - Money is stored in MongoDB as exact integer paise (`amountCents`).
  - JavaScript never performs floating-point math; aggregations are performed in the database.
  - Amounts are transported as string literals and rendered in the Indian Numbering System (`₹1,23,456.78`).
- **Mobile-First Responsive Shell**:
  - Desktop: Fixed sidebar with brand badge and clear sign-out controls.
  - Mobile: Pinned header + bottom navigation bar with safe-area insets.
  - 16px touch font sizes preventing unwanted iOS Safari auto-zoom.
  - 44px minimum tap targets for comfortable thumb interactions.

---

## Quickstart

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
# Copy .env.example to .env.local and set:
#   MONGODB_URI    = your Atlas connection string
#   MONGODB_DB     = ledger (or your database name)
#   SESSION_SECRET = random 32-byte hex string

# 3. Create indexes and seed owner account
node scripts/setup-db.mjs you@example.com yourpassword

# 4. Start local development server
pnpm dev
# or run .\start.bat on Windows
```

Open [http://localhost:3000](http://localhost:3000) and log in with your credentials.

---

## Verification & Quality Gates

```bash
pnpm typecheck   # Typecheck TypeScript (tsc --noEmit)
pnpm lint        # Run ESLint rules
pnpm build       # Production Next.js build
```

---

## Architecture & Technical Documentation

For an exhaustive breakdown of every subsystem, data schema, aggregation pipeline, security boundary, and request lifecycle, refer to:
👉 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, import the repository (Next.js preset is auto-detected).
3. Add environment variables:
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `SESSION_SECRET`
4. Deploy.
