# Chai Ledger (V4)

[![Next.js](https://img.shields.io/badge/Next.js-15.5.29-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47a248?logo=mongodb)](https://www.mongodb.com/)
[![Vitest](https://img.shields.io/badge/Tests-187%20Passed-brightgreen?logo=vitest)](https://vitest.dev/)

A fast, tactile, and privacy-focused digital khata (ledger) crafted specifically for Indian shopkeepers, micro-business owners, and informal lenders. Built to streamline **Udhar** (credit given / money owed to you) and **Jama** (repayments received / customer deposits) with running balance ledgers, automated follow-up queues, customer reliability scoring, dual-layer trash safety, and instant multi-channel WhatsApp statement sharing.

---

## Table of Contents

- [Core Principles & Financial Invariants](#core-principles--financial-invariants)
- [Feature Highlights](#feature-highlights)
  - [1. Financial Health Dashboard](#1-financial-health-dashboard)
  - [2. Today's Follow-Up Queue & Reminder Tracking](#2-todays-follow-up-queue--reminder-tracking)
  - [3. Customer Reliability Scoring Engine](#3-customer-reliability-scoring-engine)
  - [4. Promise-to-Pay Commitments](#4-promise-to-pay-commitments)
  - [5. Trash with Dual-Layer Safety & Undo](#5-trash-with-dual-layer-safety--undo)
  - [6. Data Portability: JSON Backup & CSV Khata Import](#6-data-portability-json-backup--csv-khata-import)
  - [7. Trilingual Localization (i18n)](#7-trilingual-localization-i18n)
  - [8. NPCI UPI Settlement & Dynamic QR Codes](#8-npci-upi-settlement--dynamic-qr-codes)
  - [9. Multi-Channel Statements & Formula-Safe CSV Export](#9-multi-channel-statements--formula-safe-csv-export)
- [Tech Stack & Architecture](#tech-stack--architecture)
- [Data Models & Collections](#data-models--collections)
- [Quickstart & Local Setup](#quickstart--local-setup)
- [Testing & Quality Verification](#testing--quality-verification)
- [Deployment Guide (Vercel & Atlas)](#deployment-guide-vercel--atlas)

---

## Core Principles & Financial Invariants

1. **Owner-Never-Owes Invariant**:
   In informal Indian trade, the shopkeeper is an intermediary or creditor. Balances are cleanly separated into active receivables (**You'll Get / Lene Baaki**) and customer advance deposits (**You'll Give / Advance Jama**). The UI never displays confusing negative signs or confusing accounting jargon.
2. **Zero Float Drift (Exact Integer Arithmetic)**:
   Floating-point calculations (`0.1 + 0.2 = 0.30000000000000004`) have zero tolerance in accounting. All currency values are stored in MongoDB as exact 64-bit integer paise (`amountCents`). Conversion to Rupees (`₹`) occurs strictly at display boundaries using the Indian Numbering System (`₹1,23,456.78`).
3. **Strict IST Pinning (`Asia/Kolkata`)**:
   All due dates, follow-up queues, range aggregations, and promise expirations are pinned to the Indian Standard Timezone (`UTC+05:30`), preventing date shifts across UTC boundaries or serverless cold starts.
4. **App-Owned Zero-Dependency Auth**:
   Stateless HMAC-SHA256 authenticated sessions using encrypted HTTP-only cookie tokens (`jose`) and salted password hashing (`bcryptjs`), eliminating external auth provider lock-in and vendor latency.

---

## Feature Highlights

### 1. Financial Health Dashboard
- **Net Position Summary**: Visual breakdown of total receivables (**You'll Get**), total liabilities (**You'll Give**), and Net Balance.
- **Counter Metrics**: Live breakdown of active Debtors (Udhar), Creditors (Advance deposit), Settled customers, and Overdue accounts.
- **Recent Activity Ledger**: Chronological feed of latest entries across all customers with timestamp, transaction note, due date, and edited flags.
- **Filterable Customer Directory**: Quick tabs (**All**, **Owes You**, **You Owe**, **Settled**) with real-time name and phone search.

### 2. Today's Follow-Up Queue & Reminder Tracking
- **Smart Collection Queue**: Pinned home dashboard banner surfacing customers requiring immediate recovery attention.
- **Urgency Classification**:
  - `BROKEN_PROMISE`: Highest priority — customer committed to pay by a specific date and missed it.
  - `OVERDUE`: Customer balance is past the loan's repayment due date.
  - `DUE_TODAY`: Repayment or promise scheduled for today.
  - `DUE_SOON`: Repayment approaching within the next 3 days.
- **One-Tap WhatsApp Nudges**: Instant direct link to WhatsApp with a pre-filled, respectful Hinglish reminder including the exact outstanding balance, overdue notices, and shopkeeper's UPI handle.
- **Reminder History (`lastRemindedAt`)**: Automatically logs the timestamp when a reminder is sent, displaying *"Reminded 3 days ago"* on the card to prevent chasing or spamming customers.

### 3. Customer Reliability Scoring Engine
- **Algorithmic 0–100 Creditworthiness Score**: Helps owners make data-backed credit extension decisions.
- **Multi-Factor Scoring**:
  - **On-Time Rate (40 pts)**: Ratio of on-time settlements vs. overdue settlements.
  - **Turnaround Velocity (40 pts)**: Average repayment cycle in days (faster repayment yields higher score).
  - **Promise Integrity (20 pts)**: Penalties applied for broken promises-to-pay.
- **Visual Tier Badges**:
  - `EXCELLENT` (80–100, Emerald): Trustworthy, pays on time.
  - `MODERATE` (50–79, Amber): Reliable with occasional minor delays.
  - `RISKY` (1–49, Rose): Frequent delays or broken promises; proceed with caution.
  - `NEW` (0, Slate): New customer with insufficient settlement history.
- **Interactive Breakdown Popover**: Clickable badge displaying on-time percentage, average repayment days, and total settled count.

### 4. Promise-to-Pay Commitments
- **Separate Commitment Log**: Distinct from loan due dates. Records specific customer promises (e.g. *"Friday ko pakka dunga"*).
- **Date Shortcut Chips**: One-tap quick presets (`+3 Days`, `Next Monday`, `End of Month`) or manual date picker.
- **Lifecycle Management**: Promises can be updated, marked fulfilled upon settlement, or cleared at any time.

### 5. Trash with Dual-Layer Safety & Undo
- **Dual-Layer Protection**:
  1. **Instant Client-Side Undo Toast**: A 10-second floating toast allows accidental deletions of entries or contacts to be reversed instantly.
  2. **Dedicated `/trash` Page**: 30-day retention buffer displaying all soft-deleted contacts and entries with days remaining countdown.
- **Soft-Delete Architecture**: Contact deletions automatically cascade soft-delete to associated entries via MongoDB transactions without data loss.
- **Safe Recovery**: Restore contacts and transactions back to the active ledger with a single click, or permanently purge with explicit confirmation.

### 6. Data Portability: JSON Backup & CSV Khata Import
- **Full Offline JSON Backup**: One-click complete ledger export containing all contacts, entries, promises, and owner profile in a versioned JSON schema.
- **Disaster Recovery Restore**: Upload an exported JSON backup to reconstruct or restore ledger data at any time.
- **CSV Khata Importer**: Built for migrating from paper khatas, Khatabook, OkCredit, or Excel.
- **Interactive Dry-Run Preview**:
  - Validates row format, phone number digits, entry type (`GAVE` vs `RECEIVED`), and paise amounts.
  - Identifies existing contacts to prevent duplicate contact creation.
  - Displays validation errors per line before any database writes are executed.

### 7. Trilingual Localization (i18n)
- Seamless, zero-bundle-overhead localization across:
  - **English** (`en`)
  - **Hindi (हिंदी)** (`hi`)
  - **Gujarati (ગુજરાતી)** (`gu`)
- Cookie-persisted locale selection (`chai_locale`) with server-side translation rendering and client hook integration (`useLanguage`).
- Includes Devanagari and Gujarati font optimization in CSS.

### 8. NPCI UPI Settlement & Dynamic QR Codes
- **NPCI Specification Compliance**: Generates standard `upi://pay` URIs with transaction references, merchant payee names, and pre-filled amounts.
- **Dynamic Inline SVG QR Codes**: Rendered directly in settlement modals for instant scanning by Google Pay, PhonePe, Paytm, or BHIM.
- **Partial Payment Split Buttons**: One-tap quick settlement splits for `25%`, `50%`, `75%`, or `100%` of outstanding balances.

### 9. Multi-Channel Statements & Formula-Safe CSV Export
- **Flexible Statement Scopes**: Generate ledger summaries for **Recent 5**, **Recent 10**, or **Full History**.
- **Date Range Filters**: Filter customer ledgers by **Today**, **This Week**, **This Month**, or **Custom Date Range** with automatic **Opening Balance** carry-forward aggregation.
- **Multi-Channel Distribution**:
  - **WhatsApp Direct**: Formatted Hinglish transaction statement with ASCII separators.
  - **Native OS Share**: Web Share API integration (`navigator.share`) for Telegram, SMS, or AirDrop.
  - **1-Click Clipboard Copy**: Formatted plain-text copy with feedback state.
  - **Print / PDF**: Dedicated print stylesheet (`@media print`) rendering clean, printable statement sheets.
  - **Formula-Safe CSV Export**: Sanitizes leading spreadsheet formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`) to prevent CSV injection attacks.

---

## Tech Stack & Architecture

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 15.5 (App Router, Server Actions, RSC) | Server-driven architecture with zero client waterfall |
| **UI Runtime** | React 19 | Server actions, modern form actions, optimized hooks |
| **Styling** | Tailwind CSS v4 (`@tailwindcss/postcss`) | Semantic color tokens (`paper`, `ink`, `rule`, `surface`) |
| **Database** | MongoDB Atlas (Node Driver v6) | Transactional document store with connection pooling |
| **Typography** | DM Sans, DM Mono, Noto Sans Devanagari, Noto Sans Gujarati | Humanist ledger typography with tabular financial figures |
| **Security** | `jose` (JWT) + `bcryptjs` + CSP Headers | Stateless HTTP-only sessions, salted password hashes |
| **Testing** | Vitest 5.1 | High-speed unit and integration test suite |

---

## Data Models & Collections

### `users`
```typescript
type UserDoc = {
  _id: string;
  email: string;        // Lowercase, unique indexed
  passwordHash: string; // bcrypt hash
  upiId?: string | null;
  upiName?: string | null;
  createdAt: Date;
};
```

### `people`
```typescript
type PersonDoc = {
  _id: string;
  ownerId: string;
  name: string;
  phone: string | null;
  promiseDate?: Date | null;
  promiseNote?: string | null;
  lastRemindedAt?: Date | null;
  deletedAt?: Date | null; // Soft-delete timestamp
  createdAt: Date;
  updatedAt: Date;
};
```

### `entries`
```typescript
type EntryDoc = {
  _id: string;
  ownerId: string;
  personId: string;
  type: "GAVE" | "RECEIVED";
  amountCents: number;      // Exact integer paise (Rupees × 100)
  note: string | null;
  dueDate?: Date | null;
  editedAt?: Date | null;
  deletedAt?: Date | null;  // Soft-delete timestamp
  createdAt: Date;
};
```

### `promises`
```typescript
type PromiseDoc = {
  _id: string;
  ownerId: string;
  personId: string;
  promiseDate: Date;
  note: string | null;
  status: "PENDING" | "FULFILLED" | "BROKEN";
  createdAt: Date;
};
```

---

## Quickstart & Local Setup

### 1. Prerequisites
- Node.js 20+ (recommended v22+)
- pnpm 9+
- A running MongoDB Atlas cluster or local MongoDB instance

### 2. Installation
```bash
git clone https://github.com/Vihangpatil37/ledger.git
cd ledger
pnpm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=ledger
SESSION_SECRET=your-32-byte-secret-hex-key-here
```

### 4. Database Initialization & Admin Seeding
Run the database setup script to configure required compound indexes (including soft-delete filters and promise lookups) and seed the initial owner account:
```bash
node scripts/setup-db.mjs your-email@example.com your-password
```

### 5. Launch Development Server
```bash
pnpm dev
# On Windows, you can also run: .\start.bat
```
Navigate to [http://localhost:3000](http://localhost:3000) and sign in.

---

## Testing & Quality Verification

Chai Ledger maintains high test coverage across arithmetic invariants, date boundaries, soft-delete operations, and translation parity:

```bash
# Run all unit and integration tests (187 tests)
pnpm test

# Type-check TypeScript without emitting JS
pnpm typecheck

# Lint codebase against ESLint rules
pnpm lint

# Create optimized production build
pnpm build
```

---

## Deployment Guide (Vercel & Atlas)

1. **Push to GitHub**:
   Ensure the latest commits on `main` are pushed to your remote repository.
2. **Connect to Vercel**:
   Import your GitHub repository into Vercel (Next.js preset is automatically configured).
3. **Configure Environment Variables**:
   In your Vercel Project Settings, add:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI (configured with `appName=ledger&maxPoolSize=10&maxIdleTimeMS=10000`).
   - `MONGODB_DB`: Database name (e.g. `ledger`).
   - `SESSION_SECRET`: Cryptographically secure secret string for cookie encryption.
4. **Deploy**:
   Trigger deployment. Vercel Fluid Compute and serverless edge functions will handle build and runtime execution.
