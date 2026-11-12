# Chai Ledger V4: Exhaustive Technical Architecture & Specification

This document serves as the definitive reference specification for **Chai Ledger V4**. It details every subsystem, module, architectural contract, data structure, and design pattern across the stack.

---

## 1. High-Level System Architecture

Chai Ledger V4 is a personal financial ledger application engineered for precision, privacy, and zero float drift. It is built as a unified Next.js 15 application utilizing Server Components, Server Actions, Edge Middleware, and MongoDB Atlas as the underlying data tier.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      Next.js 15 Frontend (Port 3000)                   │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ React 19 UI           │  │ Forms & Zod      │  │ Responsive Shell│  │
│  │ (DM Sans + DM Mono)   │  │ (entrySchema)    │  │ (SideNav+Bottom)│  │
│  └───────────┬───────────┘  └────────┬─────────┘  └─────────────────┘  │
└──────────────┼───────────────────────┼─────────────────────────────────┘
               │                       │
               ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Server Runtime & Application Services                │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ Server Actions        │  │ Server Readers   │  │ Security Engine │  │
│  │ (addEntry, delete)    │  │ (getHomeSummary) │  │ (jose JWT HS256)│  │
│  └───────────┬───────────┘  └────────┬─────────┘  └─────────────────┘  │
│              │                       │                                 │
│              ▼                       ▼                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Financial Arithmetic Isolation (Integer Paise amountCents)        │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas Database Tier                       │
│                                                                        │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ users Collection      │  │ people Collection│  │ entries Col     │  │
│  │ (Unique email index)  │  │ (ownerId, name)  │  │ (ownerId, date) │  │
│  └───────────────────────┘  └──────────────────┘  └─────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Aggregation Engine ($match ownerId, $cond sum for balances)      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Subsystems

### 2.1 Visual Design System ("Paper & Ink")
- **Palette Tokens**:
  - `--color-paper` (`#f5f5f0`): Warm tactile background.
  - `--color-ink` (`#1a1a1a`): High-contrast primary text and brand accents.
  - `--color-rule` (`#d4d0c8`): Divider lines mirroring notebook ruling.
  - `--color-debit` (`#c0392b`): Traditional red accounting ink for Udhar ("owes you").
  - `--color-credit` (`#2e7d32`): Green ink for received payments ("you owe").
- **Typography**:
  - **Interface & Display**: `DM Sans` (humanist, legible, non-templated).
  - **Monetary Digits**: `DM Mono` (strict tabular figures ensuring decimal point vertical alignment across columns).
- **Responsive Navigation**:
  - **Desktop (>=1024px)**: Fixed 224px slim sidebar (`SideNav`) with brand badge and sign-out controls.
  - **Mobile (<1024px)**: Pinned top brand bar + Fixed bottom navigation bar (`MobileNav`) with safe-area padding (`pb-[env(safe-area-inset-bottom)]`).
  - **iOS Zoom Defense**: Input font sizes are clamped to `text-base sm:text-sm` (16px base on touchscreens) preventing iOS Safari from forcing viewport zoom on field focus.
  - **Tap Target Floor**: Interactive elements maintain a minimum hit area of 44px (`min-h-[44px]`).

### 2.2 Routes & Views
- **Dashboard (`src/app/(app)/page.tsx`)**:
  - 3-Card Financial Health Overview:
    - **Net Balance**: Overall receivable vs. payable position.
    - **Udhar (You will get)**: Total debit balance with active debtor count.
    - **You will give**: Total credit balance with active creditor count.
  - Filterable Contact Directory: Tabs for **All**, **Owes you**, **You owe**, and **Settled**, paired with dynamic search.
  - Recent Activity Feed: Live list of latest transactions across all contacts with timestamps and notes.
- **Contact Ledger (`src/app/(app)/people/[id]/page.tsx`)**:
  - Prominent balance overview with cumulative given and received totals.
  - One-click WhatsApp reminder with pre-filled Hinglish message.
  - `ShareStatementModal`: Multi-channel statement sharing (Recent 5, Recent 10, All) via WhatsApp, native Web Share API (`navigator.share`), clipboard copy, and printable PDF statement.
  - Embedded `AddEntryCard` for recording Udhar and Received entries.
  - Chronological transaction list with running balance calculations.
- **Contact Creation & Editing (`src/app/(app)/people/new/`, `.../edit/`)**:
  - Full-name and optional phone number forms with Zod validation.
  - Danger zone with cascade deletion safeguards.

---

## 3. Backend Services & Server Actions

### 3.1 Server Actions (`src/actions/`)
- **`addEntry(prevState, formData)`**:
  - Authenticates caller via `getOwner()`.
  - Validates input using `entrySchema`.
  - Validates foreign-key ownership: confirms `personId` belongs to `ownerId`.
  - Converts decimal amount to exact integer paise: `Math.round(amount * 100)`.
  - Inserts document into `entries` collection.
  - Revalidates cached paths (`/` and `/people/[id]`).
- **`deleteEntry(formData)`**:
  - Validates `entryId` and `personId`.
  - Deletes entry matching `{ _id: entryId, ownerId: owner }`.
  - Revalidates paths.
- **`createPerson` / `updatePerson` / `deletePerson`**:
  - Contact management. Deleting a contact cascades to remove all associated entries under `{ personId, ownerId }`.
- **`login` / `logout`**:
  - Verifies credentials against `users` collection using `bcryptjs`.
  - Issues 30-day signed JWT stored in `ledger_session` cookie.

### 3.2 Server Readers (`src/server/readers.ts`)
- **`getHomeSummary()`**:
  - Aggregates balances across contacts via MongoDB pipeline.
  - Calculates net balance, debtor count, creditor count, and settled count.
  - Fetches the 6 most recent entries across the ledger for the dashboard feed.
- **`getPersonDetail(personId)`**:
  - Retrieves contact document, calculates aggregate given/received totals, and computes cumulative running balance for each historical entry.

---

## 4. Money & Financial Arithmetic Isolation Model

### 4.1 Zero Float Drift Principle
JavaScript numbers are double-precision binary floats (IEEE 754), which are prone to rounding errors (e.g., `0.1 + 0.2 === 0.30000000000000004`). In Chai Ledger V4:
1. **Storage Tier**: All monetary values in MongoDB are stored as integer paise (`amountCents`). ₹1.00 = `100`, ₹560.00 = `56000`.
2. **Wire Transport**: Amounts transferred between forms, APIs, and client components are string literals (e.g., `"560.00"`).
3. **Database Aggregation**: All sums are computed within MongoDB via integer additions:
   ```javascript
   $sum: { $cond: [{ $eq: ["$type", "GAVE"] }, "$amountCents", 0] }
   ```
4. **Display Formatting**: Conversion to rupees occurs only at the final display step via `Intl.NumberFormat("en-IN")`.

---

## 5. Data Tier: MongoDB Atlas Architecture

### 5.1 Collections & Schemas
- **`users`**:
  ```typescript
  type UserDoc = {
    _id: string;          // UUID v4
    email: string;        // Stored lowercase, unique index
    passwordHash: string; // bcrypt hash (cost factor 10)
    createdAt: Date;
  };
  ```
- **`people`**:
  ```typescript
  type PersonDoc = {
    _id: string;          // UUID v4
    ownerId: string;      // Scoped to UserDoc._id
    name: string;         // Max 60 chars
    phone: string | null; // Optional phone
    createdAt: Date;
    updatedAt: Date;
  };
  ```
- **`entries`**:
  ```typescript
  type EntryDoc = {
    _id: string;          // UUID v4
    ownerId: string;      // Scoped to UserDoc._id
    personId: string;     // Scoped to PersonDoc._id
    type: "GAVE" | "RECEIVED";
    amountCents: number;  // Exact integer paise
    note: string | null;  // Max 200 chars
    createdAt: Date;
  };
  ```

### 5.2 Indexes
1. `users`: `{ email: 1 }` (unique)
2. `people`: `{ ownerId: 1, name: 1 }` (owner isolation & alphabetical sorting)
3. `entries`: `{ personId: 1, createdAt: 1, _id: 1 }` (chronological running balance)
4. `entries`: `{ ownerId: 1, createdAt: -1 }` (global dashboard activity feed)

---

## 6. Security Enforcement

1. **Session Management**:
   - 30-day stateless JWT signed with HS256 via `jose`.
   - Stored in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie (`ledger_session`).
   - Zero master service-role credentials; database access is authenticated at the application layer.
2. **Deterministic Query Scoping**:
   - Every read, write, and aggregation query enforces `{ ownerId: owner }`.
3. **Validation & Sanitization**:
   - Strict Zod schemas with regex numerical checking, UUID enforcement, and string length boundaries.
   - Formula injection prevention (`=`, `+`, `-`, `@`, `\t` escaping) for exports.
   - Phone number sanitization with E.164 normalization for WhatsApp click-to-chat links.

---

## 7. Verification & Quality Gates

- **Typecheck**: `pnpm exec tsc --noEmit --incremental false` (Strict TypeScript, 0 errors).
- **ESLint**: `pnpm lint` (Next.js & React 19 rules, 0 warnings/errors).
- **Database Initialization**: `node scripts/setup-db.mjs <email> <password>`.
