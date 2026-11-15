import os
import subprocess
import sys
import pypdfium2

HTML_FILE = os.path.abspath("docs/CHAI_LEDGER_V4_CLAUDE_SPEC.html")
PDF_FILE = os.path.abspath("CHAI_LEDGER_V4_CLAUDE_SPEC.pdf")
PDF_DOCS_FILE = os.path.abspath("docs/CHAI_LEDGER_V4_CLAUDE_SPEC.pdf")

html_content = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Chai Ledger V4 - Technical Specification & Feature Extension Guide</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,400;0,500;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
      @bottom-right {
        content: counter(page);
        font-family: 'DM Mono', monospace;
        font-size: 8pt;
        color: #888;
      }
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1e1b18;
      background: #ffffff;
      line-height: 1.55;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }

    h1, h2, h3, h4 {
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #1e1b18;
      font-weight: 700;
      margin-top: 1.3em;
      margin-bottom: 0.4em;
      line-height: 1.25;
      page-break-after: avoid;
      break-after: avoid;
    }

    .display-title {
      font-family: 'Newsreader', Georgia, serif;
      font-size: 28pt;
      font-weight: 700;
      color: #1e1b18;
      line-height: 1.15;
      margin: 0 0 8px 0;
    }

    .display-subtitle {
      font-size: 13pt;
      color: #6b665f;
      font-weight: 500;
      margin: 0 0 24px 0;
      line-height: 1.4;
    }

    h1 {
      font-size: 18pt;
      border-bottom: 2px solid #e5e0d4;
      padding-bottom: 6px;
      margin-top: 24px;
      color: #1e1b18;
    }

    h2 {
      font-size: 13pt;
      color: #b93826;
      border-bottom: 1px solid #f0ece3;
      padding-bottom: 4px;
      margin-top: 18px;
    }

    h3 {
      font-size: 11pt;
      color: #1e1b18;
      margin-top: 14px;
    }

    p, ul, ol {
      margin-top: 0;
      margin-bottom: 0.8em;
    }

    ul, ol {
      padding-left: 20px;
    }

    li {
      margin-bottom: 0.35em;
    }

    code, pre {
      font-family: 'DM Mono', monospace;
      font-size: 8.5pt;
    }

    code {
      background: #f8f6f0;
      border: 1px solid #e5e0d4;
      padding: 1.5px 4.5px;
      border-radius: 4px;
      color: #b93826;
    }

    pre {
      background: #23201c;
      color: #f8f6f0;
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin: 8px 0 12px 0;
      line-height: 1.45;
      page-break-inside: avoid;
      break-inside: avoid;
      border: 1px solid #38342e;
    }

    pre code {
      background: transparent;
      border: none;
      padding: 0;
      color: inherit;
      font-size: 8pt;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 16px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    th, td {
      border: 1px solid #e5e0d4;
      padding: 6px 9px;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: #f8f6f0;
      font-weight: 700;
      color: #1e1b18;
    }

    tr:nth-child(even) td {
      background: #fcfbf8;
    }

    .badge {
      display: inline-block;
      font-family: 'DM Mono', monospace;
      font-size: 7.5pt;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge-debit {
      background: #fdf2f0;
      color: #b93826;
      border: 1px solid #f8c9c4;
    }

    .badge-credit {
      background: #edf6f0;
      color: #246645;
      border: 1px solid #c2e2cc;
    }

    .badge-focus {
      background: #edf2ff;
      color: #3b5bdb;
      border: 1px solid #c5d4fb;
    }

    .badge-muted {
      background: #f4f3ef;
      color: #6b665f;
      border: 1px solid #e5e0d4;
    }

    .callout {
      border-left: 4px solid #3b5bdb;
      background: #f4f7fe;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin: 12px 0 16px 0;
      page-break-inside: avoid;
      break-inside: avoid;
      font-size: 9pt;
    }

    .callout.warning {
      border-left-color: #b93826;
      background: #fdf6f5;
    }

    .callout.success {
      border-left-color: #246645;
      background: #f2f8f4;
    }

    .callout-title {
      font-weight: 700;
      margin-bottom: 4px;
      color: #1e1b18;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Cover Page */
    .cover {
      padding: 40px 0 20px 0;
      border-bottom: 3px double #e5e0d4;
      margin-bottom: 30px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background: #f8f6f0;
      border: 1px solid #e5e0d4;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 20px 0;
      font-size: 8.5pt;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
    }

    .meta-label {
      font-family: 'DM Mono', monospace;
      font-size: 7.5pt;
      text-transform: uppercase;
      color: #8c857b;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .meta-value {
      font-weight: 600;
      color: #1e1b18;
      margin-top: 2px;
    }

    .toc {
      background: #ffffff;
      border: 1px solid #e5e0d4;
      border-radius: 8px;
      padding: 16px 20px;
      margin: 20px 0 30px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .toc-title {
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #6b665f;
    }

    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 24px;
      row-gap: 6px;
      font-size: 8.5pt;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #e5e0d4;
      padding-bottom: 2px;
    }

    .toc-num {
      font-family: 'DM Mono', monospace;
      color: #b93826;
      font-weight: 700;
      margin-right: 6px;
    }

    .mono-num {
      font-family: 'DM Mono', monospace;
    }

    .footer-note {
      font-size: 7.5pt;
      color: #a8a299;
      text-align: center;
      margin-top: 30px;
      border-top: 1px solid #e5e0d4;
      padding-top: 8px;
    }
  </style>
</head>
<body>

  <!-- COVER / HEADER -->
  <div class="cover">
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
      <span class="badge badge-debit" style="font-size: 9pt; padding: 4px 8px;">Technical Specification & Handoff Guide</span>
      <span class="badge badge-focus" style="font-size: 9pt; padding: 4px 8px;">Claude AI Feature Expansion</span>
    </div>
    <div class="display-title">Chai Ledger V4 (Ledger)</div>
    <div class="display-subtitle">
      Comprehensive Architecture, Zero Float Drift Specification, Security Model & Feature Extension Playbook
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Application Name</span>
        <span class="meta-value">Ledger (Personal Khata Book / Chai Ledger V4)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Primary Framework</span>
        <span class="meta-value">Next.js 15.5.29 (App Router) + React 19.1.0</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Database Tier</span>
        <span class="meta-value">MongoDB Atlas (Native Node.js Driver v7.8.0)</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Styling & Design System</span>
        <span class="meta-value">Tailwind CSS v4 · Paper & Ink Design System</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Auth & Session Engine</span>
        <span class="meta-value">Stateless JWT via jose (HS256) · HttpOnly Cookie</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Verification & Tests</span>
        <span class="meta-value">Vitest v5.1.0 · 78/78 Unit & Integration Tests Passing</span>
      </div>
    </div>
  </div>

  <!-- TABLE OF CONTENTS -->
  <div class="toc">
    <div class="toc-title">Document Contents</div>
    <div class="toc-grid">
      <div class="toc-item"><span><span class="toc-num">01.</span> Executive Summary & Domain Primer</span></div>
      <div class="toc-item"><span><span class="toc-num">08.</span> Server Actions & Readers API Catalog</span></div>
      <div class="toc-item"><span><span class="toc-num">02.</span> System Topology & Request Lifecycle</span></div>
      <div class="toc-item"><span><span class="toc-num">09.</span> Frontend Components & UI Design Tokens</span></div>
      <div class="toc-item"><span><span class="toc-num">03.</span> Tech Stack & Production Dependencies</span></div>
      <div class="toc-item"><span><span class="toc-num">10.</span> Multi-Channel Statements & WhatsApp</span></div>
      <div class="toc-item"><span><span class="toc-num">04.</span> MongoDB Data Tier & Schema Contracts</span></div>
      <div class="toc-item"><span><span class="toc-num">11.</span> Quality Gates & Vitest Test Suite</span></div>
      <div class="toc-item"><span><span class="toc-num">05.</span> Zero Float Drift Financial Precision</span></div>
      <div class="toc-item"><span><span class="toc-num">12.</span> Complete Repository File Dictionary</span></div>
      <div class="toc-item"><span><span class="toc-num">06.</span> Overdue Engine & Timezone Mechanics</span></div>
      <div class="toc-item"><span><span class="toc-num">13.</span> Claude Feature Extension Playbook</span></div>
      <div class="toc-item"><span><span class="toc-num">07.</span> Security, Auth & Query Isolation</span></div>
      <div class="toc-item"><span><span class="toc-num">14.</span> 6 High-Impact Feature Implementation Recipes</span></div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 1 -->
  <h1>1. Executive Summary & Domain Primer</h1>
  <p>
    <strong>Chai Ledger V4 (Ledger)</strong> is a lightning-fast, privacy-first personal financial accounting application tailored to the cultural and operational realities of Indian peer-to-peer and small merchant credit management (<em>Bahi-Khata</em>).
  </p>
  <p>
    The application tracks two fundamental transactional states between the user and their contacts:
  </p>
  <ul>
    <li><strong>Udhar (GAVE):</strong> Money you lent or goods/services provided on credit. The contact owes you this amount. Represented with traditional red accounting ink (<code>#b93826</code>).</li>
    <li><strong>Received (RECEIVED):</strong> Money returned by the contact or credit you received. You owe them or they settled debt. Represented with emerald green ink (<code>#246645</code>).</li>
  </ul>
  
  <div class="callout">
    <div class="callout-title">
      <span>💡 Purpose of this Specification for Claude</span>
    </div>
    <p>
      This document gives Claude full context on the application's architecture, data models, invariant financial arithmetic rules, security boundaries, and UI patterns. <strong>When adding any new feature, Claude must uphold these core principles:</strong> zero floating-point arithmetic, strict owner isolation in all queries, stateless JWT cookies, and the humanist Paper & Ink aesthetic.
    </div>

  <!-- SECTION 2 -->
  <h1>2. System Topology & Request Lifecycle</h1>
  <p>
    Ledger is built as a unified Next.js 15 full-stack application utilizing Server Components for deterministic server-rendered views, Server Actions for mutations, Edge Middleware for fast cookie gating, and direct MongoDB Atlas connectivity.
  </p>

  <pre><code>┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 15 Client Layer (Browser)                    │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ React 19 UI           │  │ Forms & Zod      │  │ Responsive Shell│  │
│  │ (Plus Jakarta + Mono) │  │ (entrySchema)    │  │ (SideNav+Bottom)│  │
│  └───────────┬───────────┘  └────────┬─────────┘  └─────────────────┘  │
└──────────────┼───────────────────────┼─────────────────────────────────┘
               │ (Server Actions)      │ (Server Component Fetch)
               ▼                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   Next.js 15 Server Runtime & Node.js                  │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ Server Actions        │  │ Server Readers   │  │ Edge Middleware │  │
│  │ (addEntry, delete)    │  │ (getHomeSummary) │  │ (jose JWT HS256)│  │
│  └───────────┬───────────┘  └────────┬─────────┘  └─────────────────┘  │
│              │                       │                                 │
│  ┌───────────▼───────────────────────▼──────────────────────────────┐  │
│  │ Financial Arithmetic Engine: Integer Paise (amountCents)         │  │
│  └───────────────────────────────────┬──────────────────────────────┘  │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       │ (Native MongoDB Driver 7.8)
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      MongoDB Atlas Database Tier                       │
│  ┌───────────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │ users Collection      │  │ people Collection│  │ entries Col     │  │
│  │ { email: 1 } (unique) │  │ { ownerId, name }│  │ { personId... } │  │
│  └───────────────────────┘  └──────────────────┘  └─────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Aggregation Engine: $match ownerId, $cond sum for exact balances │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘</code></pre>

  <h3>Key Request Lifecycle Phases</h3>
  <ol>
    <li><strong>Edge Middleware Verification (<code>src/middleware.ts</code>):</strong> Every incoming request is intercepted. The <code>ledger_session</code> cookie is inspected and cryptographically verified using <code>jose</code>. Unauthenticated requests are redirected to <code>/login?next=...</code> with sanitized paths via <code>safeNextPath()</code>.</li>
    <li><strong>Server Component Rendering (<code>src/app/(app)/page.tsx</code>):</strong> Data fetching runs entirely on the server via <code>getHomeSummary()</code> or <code>getPersonDetail(id)</code>. No public client-side REST/GraphQL APIs are exposed.</li>
    <li><strong>Server Action Mutations (<code>src/actions/</code>):</strong> Form submissions trigger direct asynchronous server functions (e.g. <code>addEntry</code>, <code>deletePerson</code>). Inputs are parsed with Zod, database operations execute with strict <code>ownerId</code> validation, and Next.js cache paths (<code>revalidatePath</code>) are invalidated before returning.</li>
  </ol>

  <!-- SECTION 3 -->
  <div class="page-break"></div>
  <h1>3. Tech Stack & Production Dependencies</h1>
  <p>The project uses a minimal, high-efficiency dependency footprint. No bulky ORMs, no heavy auth frameworks, and no extraneous UI libraries.</p>

  <table>
    <thead>
      <tr>
        <th style="width: 22%;">Technology</th>
        <th style="width: 15%;">Version</th>
        <th>Purpose & Architectural Role</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Next.js</strong></td>
        <td><code>15.5.29</code></td>
        <td>App Router framework, Server Components, Server Actions, Edge Middleware, Static/Dynamic routing.</td>
      </tr>
      <tr>
        <td><strong>React & DOM</strong></td>
        <td><code>19.1.0</code></td>
        <td>Concurrent features, Server Component primitives, <code>useActionState</code> for form transitions.</td>
      </tr>
      <tr>
        <td><strong>MongoDB Driver</strong></td>
        <td><code>^7.8.0</code></td>
        <td>Official native driver. Mongoose and Prisma were intentionally rejected to eliminate overhead, prevent cold-start lags, and retain native control over aggregation pipelines.</td>
      </tr>
      <tr>
        <td><strong>jose</strong></td>
        <td><code>^6.2.17</code></td>
        <td>High-performance, edge-compatible stateless JWT signing and verification using standard HS256.</td>
      </tr>
      <tr>
        <td><strong>bcryptjs</strong></td>
        <td><code>^3.0.3</code></td>
        <td>Password hashing with salt rounds = 10. Runs in pure JavaScript without native binary compilation.</td>
      </tr>
      <tr>
        <td><strong>Zod</strong></td>
        <td><code>^4.6.7</code></td>
        <td>Strict runtime validation for all inputs, form data, UUID parameters, and dates.</td>
      </tr>
      <tr>
        <td><strong>Tailwind CSS</strong></td>
        <td><code>^4.0.0</code></td>
        <td>CSS-first styling engine with native CSS custom properties and theme tokens.</td>
      </tr>
      <tr>
        <td><strong>Vitest</strong></td>
        <td><code>^5.1.0</code></td>
        <td>Fast unit and integration test runner with in-memory mocking of session and database layers.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 4 -->
  <h1>4. MongoDB Data Tier & Schema Contracts</h1>
  <p>The database tier runs on MongoDB Atlas. All document IDs are canonical UUID v4 strings generated via <code>crypto.randomUUID()</code>.</p>

  <h3>4.1 <code>users</code> Collection</h3>
  <pre><code>type UserDoc = {
  _id: string;          // UUID v4
  email: string;        // Normalized lowercase string (e.g. "you@example.com")
  passwordHash: string; // bcrypt hash (cost factor 10)
  createdAt: Date;      // Document insertion timestamp
};

// Required Index:
database.collection("users").createIndex({ email: 1 }, { unique: true });</code></pre>

  <h3>4.2 <code>people</code> Collection</h3>
  <pre><code>type PersonDoc = {
  _id: string;          // UUID v4
  ownerId: string;      // Scoped to UserDoc._id (strict tenant boundary)
  name: string;         // Trimmed string, 1 to 60 characters
  phone: string | null; // Optional phone number, max 20 characters
  createdAt: Date;
  updatedAt: Date;
};

// Required Index:
database.collection("people").createIndex({ ownerId: 1, name: 1 });</code></pre>

  <h3>4.3 <code>entries</code> Collection</h3>
  <pre><code>type EntryDoc = {
  _id: string;          // UUID v4
  ownerId: string;      // Scoped to UserDoc._id (enforces multi-tenancy)
  personId: string;     // Foreign key scoped to PersonDoc._id
  type: "GAVE" | "RECEIVED";
  amountCents: number;  // Exact integer paise (₹1.00 = 100 paise)
  note: string | null;  // Optional memo, max 200 characters
  dueDate?: Date | null;// Optional promised repayment date (Asia/Kolkata anchored)
  createdAt: Date;      // Transaction creation timestamp
};

// Required Indexes:
database.collection("entries").createIndex({ personId: 1, createdAt: 1, _id: 1 });
database.collection("entries").createIndex({ ownerId: 1, createdAt: -1 });
database.collection("entries").createIndex({ ownerId: 1, type: 1, dueDate: 1 });</code></pre>

  <h3>4.4 Multi-Document Atomic Transactions</h3>
  <p>
    When a contact is deleted, orphaned transactions are forbidden. <code>deletePerson()</code> opens a native MongoDB client session and runs an atomic transaction:
  </p>
  <pre><code>const session = mongoClient().startSession();
await session.withTransaction(async () => {
  await peopleCol().deleteOne({ _id: id.data, ownerId: owner }, { session });
  await entriesCol().deleteMany({ personId: id.data, ownerId: owner }, { session });
});</code></pre>

  <!-- SECTION 5 -->
  <div class="page-break"></div>
  <h1>5. Zero Float Drift Financial Precision Model</h1>

  <div class="callout warning">
    <div class="callout-title">⚠️ Non-Negotiable Financial Invariant</div>
    <p>
      JavaScript double-precision binary floats (IEEE 754) can produce rounding anomalies such as <code>0.1 + 0.2 === 0.30000000000000004</code>. In accounting software, this leads to ledger imbalances and user distrust. <strong>Floating-point arithmetic on currency is strictly prohibited across the entire codebase.</strong>
    </p>
  </div>

  <p>To eliminate rounding errors completely, Chai Ledger enforces a 4-tier money architecture:</p>
  <ol>
    <li><strong>Database Storage:</strong> All values in MongoDB are stored as exact 32-bit integers representing <strong>paise</strong> (1 Rupee = 100 paise). ₹560.50 is stored as <code>56050</code>.</li>
    <li><strong>Wire Transport:</strong> Between forms, APIs, and components, amounts are transferred as string literals (e.g. <code>"560.50"</code>).</li>
    <li><strong>Database Aggregation:</strong> Totals are aggregated inside MongoDB using integer addition:
      <pre><code>gave: { $sum: { $cond: [{ $eq: ["$type", "GAVE"] }, "$amountCents", 0] } }
received: { $sum: { $cond: [{ $eq: ["$type", "RECEIVED"] }, "$amountCents", 0] } }</code></pre>
    </li>
    <li><strong>Final Formatting:</strong> Conversion to rupees and paise occurs strictly at presentation time via <code>Intl.NumberFormat("en-IN")</code>.</li>
  </ol>

  <h3>Core Conversion Functions (<code>src/lib/money.ts</code>)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Function</th>
        <th style="width: 25%;">Signature</th>
        <th>Behavior & Safety Logic</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>decimalStringToPaise</code></td>
        <td><code>(amount: string) => number</code></td>
        <td>Splits string on <code>.</code>, pads paise to 2 digits, and multiplies integer rupees by 100. Never calls <code>parseFloat()</code>.</td>
      </tr>
      <tr>
        <td><code>paiseToDecimalString</code></td>
        <td><code>(paise: number) => string</code></td>
        <td>Computes <code>Math.floor(abs / 100)</code> and <code>abs % 100</code>, returning a canonical 2-decimal string like <code>"1250.50"</code>.</td>
      </tr>
      <tr>
        <td><code>formatMoney</code></td>
        <td><code>(val: string | number) => string</code></td>
        <td>Renders amount in the Indian Numbering System: <code>₹1,23,456.78</code>.</td>
      </tr>
      <tr>
        <td><code>balanceMeta</code></td>
        <td><code>(val: string | number) => Meta</code></td>
        <td>Returns <code>{ className, label }</code>: Positive = <code>"owes you"</code>, Negative = <code>"you owe"</code>, Zero = <code>"settled"</code>.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 6 -->
  <h1>6. Overdue Loan Engine & Timezone Mechanics</h1>
  <p>
    Vercel serverless functions run with clocks set to UTC. However, users in India operate on Indian Standard Time (IST / UTC+5:30). If overdue status were calculated using UTC <code>new Date()</code>, loans due on a given day would flip to "Overdue" 5.5 hours early.
  </p>
  
  <h3>6.1 Asia/Kolkata Timezone Anchoring</h3>
  <p>Both server readers (<code>readers.ts</code>) and client helpers (<code>due.ts</code>) pin "today" to IST:</p>
  <pre><code>const istTodayStr = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
}).format(new Date());
const today = new Date(`${istTodayStr}T00:00:00+05:30`);</code></pre>

  <h3>6.2 Repayment-Aware Overdue Detection</h3>
  <p>
    A critical innovation in Chai Ledger is that <strong>a past-due loan entry does NOT trigger an overdue alert if the borrower has already paid back enough total money to cover it</strong>.
  </p>
  <pre><code>// MongoDB Aggregation in readers.ts:
// For each person, sum overdue GAVE entries where dueDate < today
// Compare against total RECEIVED. Only flag if overdueGave > totalReceived!
entriesCol().aggregate([
  {
    $match: {
      ownerId: owner,
      $or: [
        { type: "GAVE", dueDate: { $lt: today, $ne: null } },
        { type: "RECEIVED" },
      ],
    },
  },
  {
    $group: {
      _id: "$personId",
      overdueGave: {
        $sum: {
          $cond: [
            { $and: [{ $eq: ["$type", "GAVE"] }, { $lt: ["$dueDate", today] }] },
            "$amountCents",
            0,
          ],
        },
      },
      totalReceived: {
        $sum: { $cond: [{ $eq: ["$type", "RECEIVED"] }, "$amountCents", 0] },
      },
    },
  },
  { $match: { $expr: { $gt: ["$overdueGave", "$totalReceived"] } } },
]);</code></pre>

  <!-- SECTION 7 -->
  <div class="page-break"></div>
  <h1>7. Security, Authentication & Query Isolation</h1>

  <h3>7.1 Stateless JWT Cookie Architecture</h3>
  <ul>
    <li>Tokens are signed with <strong>HS256</strong> via <code>jose</code> using <code>SESSION_SECRET</code>.</li>
    <li>Stored in cookie <code>ledger_session</code> with flags:
      <code>httpOnly: true</code>, <code>sameSite: "lax"</code>, <code>path: "/"</code>, <code>maxAge: 30 days</code>, and <code>secure: true</code> in production.
    </li>
    <li>Middleware and Server Actions verify the token in-memory with zero network overhead.</li>
  </ul>

  <h3>7.2 Timing-Attack Countermeasure on Login</h3>
  <p>
    To prevent user enumeration (where attackers measure bcrypt comparison latency to detect if an email exists), <code>login()</code> executes a constant-time comparison against a dummy bcrypt hash when an email is not found:
  </p>
  <pre><code>const DUMMY_HASH = "$2a$10$e8wNuUuY.1zO81k.U386r.Zg9737.mC3yH4G9V8q7NlU8O2YfD1uK";
const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
const isMatch = await compare(parsed.data.password, hashToCompare);
if (!user || !isMatch) {
  return { error: "Wrong email or password." };
}</code></pre>

  <h3>7.3 Open-Redirect Defense (<code>safeNextPath</code>)</h3>
  <p>
    When redirecting after login, the <code>next</code> parameter is sanitized via <code>src/lib/safe-next.ts</code>. It strictly rejects protocol-relative evasion (<code>//evil.com</code>), backslashes (<code>\\evil.com</code>), control characters, and non-relative URLs.
  </p>

  <h3>7.4 Strict Query Isolation Invariant</h3>
  <div class="callout warning">
    <div class="callout-title">⚠️ Mandatory Multi-Tenant Security Rule</div>
    <p>
      Every single database query, read, write, update, delete, and aggregation pipeline <strong>MUST explicitly include <code>{ ownerId: owner }</code></strong> in its filter. No query may ever execute on an unqualified collection filter.
    </p>
  </div>

  <!-- SECTION 8 -->
  <h1>8. Server Actions & Readers API Catalog</h1>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Function / Action</th>
        <th style="width: 25%;">File Path</th>
        <th>Input & Behavior</th>
        <th style="width: 20%;">Revalidations</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>login(prevState, fd)</code></td>
        <td><code>src/actions/auth.ts</code></td>
        <td>Validates email & password, sets 30-day session cookie, redirects via <code>safeNextPath</code>.</td>
        <td>None (redirects)</td>
      </tr>
      <tr>
        <td><code>logout()</code></td>
        <td><code>src/actions/auth.ts</code></td>
        <td>Deletes <code>ledger_session</code> cookie and redirects to <code>/login</code>.</td>
        <td>None (redirects)</td>
      </tr>
      <tr>
        <td><code>addEntry(prevState, fd)</code></td>
        <td><code>src/actions/entries.ts</code></td>
        <td>Parses <code>entrySchema</code>, verifies person ownership, stores integer paise, optional due date.</td>
        <td><code>/</code>, <code>/people/[id]</code></td>
      </tr>
      <tr>
        <td><code>deleteEntry(formData)</code></td>
        <td><code>src/actions/entries.ts</code></td>
        <td>Validates UUIDs, deletes entry matching <code>{ _id, ownerId }</code>.</td>
        <td><code>/</code>, <code>/people/[id]</code></td>
      </tr>
      <tr>
        <td><code>createPerson(prevState, fd)</code></td>
        <td><code>src/actions/people.ts</code></td>
        <td>Validates name and optional phone, inserts document, redirects to home.</td>
        <td><code>/</code> (redirects)</td>
      </tr>
      <tr>
        <td><code>updatePerson(prevState, fd)</code></td>
        <td><code>src/actions/people.ts</code></td>
        <td>Renames or updates phone for contact matching <code>{ _id, ownerId }</code>.</td>
        <td><code>/</code>, <code>/people/[id]</code>, <code>/people/[id]/edit</code></td>
      </tr>
      <tr>
        <td><code>deletePerson(formData)</code></td>
        <td><code>src/actions/people.ts</code></td>
        <td>Executes atomic transaction deleting person and all associated entries.</td>
        <td><code>/</code> (redirects)</td>
      </tr>
      <tr>
        <td><code>getHomeSummary()</code></td>
        <td><code>src/server/readers.ts</code></td>
        <td>Aggregates net balance, debtor count, creditor count, overdue count, contact list, and 6 recent entries.</td>
        <td>Server Reader</td>
      </tr>
      <tr>
        <td><code>getPersonDetail(id)</code></td>
        <td><code>src/server/readers.ts</code></td>
        <td>Retrieves contact, calculates chronological running balance across all entries, returns newest-first.</td>
        <td>Server Reader</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 9 -->
  <div class="page-break"></div>
  <h1>9. Frontend Components & UI Design Tokens</h1>
  <p>
    The visual theme is <strong>"Paper & Ink"</strong>, mirroring a handcrafted cloth-bound Indian ledger (<em>Bahi-Khata</em>).
  </p>

  <h3>9.1 CSS Theme Variables (<code>src/app/globals.css</code>)</h3>
  <table>
    <thead>
      <tr>
        <th>Token Name</th>
        <th>CSS Value</th>
        <th>Visual Meaning & Usage</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>--color-paper</code></td>
        <td><code>#f8f6f0</code></td>
        <td>Warm tactile paper background.</td>
      </tr>
      <tr>
        <td><code>--color-surface</code></td>
        <td><code>#ffffff</code></td>
        <td>Card surfaces, modal backgrounds, and elevated containers.</td>
      </tr>
      <tr>
        <td><code>--color-ink</code></td>
        <td><code>#1e1b18</code></td>
        <td>Primary high-contrast text and buttons.</td>
      </tr>
      <tr>
        <td><code>--color-rule</code></td>
        <td><code>#e5e0d4</code></td>
        <td>Divider rules mirroring ruled ledger paper lines.</td>
      </tr>
      <tr>
        <td><code>--color-debit</code></td>
        <td><code>#b93826</code></td>
        <td>Red accounting ink for Udhar ("owes you") and overdue alerts.</td>
      </tr>
      <tr>
        <td><code>--color-credit</code></td>
        <td><code>#246645</code></td>
        <td>Forest green ink for received repayments ("you owe").</td>
      </tr>
      <tr>
        <td><code>--color-focus</code></td>
        <td><code>#3b5bdb</code></td>
        <td>Architectural cobalt blue for focus rings and action highlights.</td>
      </tr>
    </tbody>
  </table>

  <h3>9.2 Mobile Ergonomics</h3>
  <ul>
    <li><strong>Input Font Size Floor:</strong> Inputs have a base font size of <code>text-base sm:text-sm</code> (16px on mobile) to permanently eliminate iOS Safari auto-zoom on field focus.</li>
    <li><strong>Touch Floor:</strong> Interactive buttons and touch targets enforce <code>min-h-[44px]</code> for effortless thumb navigation.</li>
    <li><strong>Dual Navigation:</strong> Desktop displays a 224px slim sidebar (<code>SideNav</code>); mobile displays a pinned header and bottom navigation bar (<code>MobileNav</code>) with safe-area padding: <code>pb-[env(safe-area-inset-bottom)]</code>.</li>
  </ul>

  <!-- SECTION 10 -->
  <h1>10. Multi-Channel Statements & WhatsApp</h1>
  <p>
    Chai Ledger features a built-in statement generation engine in <code>src/components/people/share-statement-modal.tsx</code> and <code>src/lib/whatsapp.ts</code>:
  </p>
  <ul>
    <li><strong>E.164 Phone Normalization:</strong> <code>normalizeWaPhone</code> accepts Indian 10-digit numbers (auto-prefixes <code>91</code>), strips leading <code>0</code> trunk codes, and preserves international country codes.</li>
    <li><strong>Pre-filled Hinglish Reminders:</strong>
      <pre><code>Namaste Ramesh ji 🙏

Aapke khate mein *₹1,250.00* baaki hai.
⚠️ Wada tha: 2026-11-10 tak (Overdue by 5 days)
(Total diye gaye: ₹3,000.00 · Total wapas mile: ₹1,750.00)

Kripya jaldi payment kar dijiye 🙏</code></pre>
    </li>
    <li><strong>Multi-Scope Statement Output:</strong> Users can export <strong>Recent 5</strong>, <strong>Recent 10</strong>, or <strong>All history</strong>.</li>
    <li><strong>Distribution Channels:</strong> Direct WhatsApp Web/App link, native device share sheet (<code>navigator.share</code>), 1-click clipboard copy, and print-optimized PDF statement (<code>@media print</code>).</li>
  </ul>

  <!-- SECTION 11 -->
  <div class="page-break"></div>
  <h1>11. Quality Gates & Vitest Test Suite</h1>
  <p>
    Ledger enforces strict automated verification gates. Before committing or deploying, every change must satisfy:
  </p>
  <pre><code>pnpm typecheck   # TypeScript compiler: strict mode, 0 errors
pnpm lint        # ESLint rules for Next.js 15 & React 19
pnpm test        # Vitest suite: 8 test suites, 78 passing tests</code></pre>

  <h3>Vitest Suite Breakdown</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 30%;">Test File</th>
        <th style="width: 15%;">Tests</th>
        <th>Coverage & Verified Subsystems</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>tests/money.test.ts</code></td>
        <td>13 tests</td>
        <td>Paise conversion, decimal string parsing, float drift elimination, INR formatting.</td>
      </tr>
      <tr>
        <td><code>tests/validation.test.ts</code></td>
        <td>22 tests</td>
        <td>Zod schema edge cases, UUID format enforcement, boundary lengths, nullish field handling.</td>
      </tr>
      <tr>
        <td><code>tests/due.test.ts</code></td>
        <td>7 tests</td>
        <td>Overdue date evaluation, Asia/Kolkata timezone stability, day difference calculation.</td>
      </tr>
      <tr>
        <td><code>tests/whatsapp.test.ts</code></td>
        <td>13 tests</td>
        <td>E.164 phone normalization, statement formatting, overdue clause injection.</td>
      </tr>
      <tr>
        <td><code>tests/readers.test.ts</code></td>
        <td>6 tests</td>
        <td>Mocked MongoDB aggregations, running balance accuracy, 1000+ entries scalability.</td>
      </tr>
      <tr>
        <td><code>tests/actions.test.ts</code></td>
        <td>8 tests</td>
        <td>Server action auth checks, atomic cascade transaction rollback, error isolation.</td>
      </tr>
      <tr>
        <td><code>tests/auth.test.ts</code></td>
        <td>4 tests</td>
        <td>Stateless JWT generation, cookie signing, tampered token rejection.</td>
      </tr>
      <tr>
        <td><code>tests/safe-next.test.ts</code></td>
        <td>5 tests</td>
        <td>Open-redirect prevention, protocol-relative evasion rejection.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 12 -->
  <h1>12. Complete Repository File Dictionary</h1>
  <table>
    <thead>
      <tr>
        <th style="width: 32%;">File Path</th>
        <th>Description & Responsibilities</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>src/actions/auth.ts</code></td>
        <td>Server actions for <code>login</code> (bcrypt timing attack protection, JWT issuance) and <code>logout</code>.</td>
      </tr>
      <tr>
        <td><code>src/actions/entries.ts</code></td>
        <td>Server actions for <code>addEntry</code> (Zod validation, owner check) and <code>deleteEntry</code>.</td>
      </tr>
      <tr>
        <td><code>src/actions/people.ts</code></td>
        <td>Server actions for <code>createPerson</code>, <code>updatePerson</code>, and atomic <code>deletePerson</code>.</td>
      </tr>
      <tr>
        <td><code>src/server/readers.ts</code></td>
        <td>Server readers: <code>getHomeSummary</code> (feed, counts, balances) and <code>getPersonDetail</code> (running balance).</td>
      </tr>
      <tr>
        <td><code>src/server/session.ts</code></td>
        <td>Session helper: <code>getOwner()</code> decodes the current user ID from the session cookie.</td>
      </tr>
      <tr>
        <td><code>src/server/env.ts</code></td>
        <td>Validates environment variables: <code>MONGODB_URI</code>, <code>MONGODB_DB</code>, <code>SESSION_SECRET</code>.</td>
      </tr>
      <tr>
        <td><code>src/lib/money.ts</code></td>
        <td>Core money engine: <code>decimalStringToPaise</code>, <code>paiseToDecimalString</code>, <code>formatMoney</code>.</td>
      </tr>
      <tr>
        <td><code>src/lib/validation.ts</code></td>
        <td>Zod schemas: <code>entrySchema</code>, <code>personSchema</code>, <code>loginSchema</code>, <code>idSchema</code>.</td>
      </tr>
      <tr>
        <td><code>src/lib/due.ts</code></td>
        <td>Due date calculations anchored to <code>Asia/Kolkata</code>; statuses: Overdue, Due Today, Due Soon.</td>
      </tr>
      <tr>
        <td><code>src/lib/whatsapp.ts</code></td>
        <td>E.164 phone normalizer, Hinglish reminder generator, multi-channel statement formatter.</td>
      </tr>
      <tr>
        <td><code>src/lib/mongo.ts</code></td>
        <td>MongoDB Atlas client singleton with connection pooling and typed collections (<code>users</code>, <code>people</code>, <code>entries</code>).</td>
      </tr>
      <tr>
        <td><code>src/lib/auth.ts</code></td>
        <td>JWT HS256 signing and verification via <code>jose</code>.</td>
      </tr>
      <tr>
        <td><code>src/lib/safe-next.ts</code></td>
        <td>Sanitizes redirect URLs after login to prevent open-redirect vulnerabilities.</td>
      </tr>
      <tr>
        <td><code>src/middleware.ts</code></td>
        <td>Edge middleware that gates authenticated routes and manages redirect routing.</td>
      </tr>
      <tr>
        <td><code>scripts/setup-db.mjs</code></td>
        <td>One-time CLI tool to create MongoDB indexes and seed the administrator account.</td>
      </tr>
    </tbody>
  </table>

  <!-- SECTION 13 -->
  <div class="page-break"></div>
  <h1>13. Claude Feature Extension Playbook</h1>

  <div class="callout">
    <div class="callout-title">📘 Instructions for Claude when Building New Features</div>
    <p>
      When the user asks you to implement a new feature in Ledger, follow this standardized 5-step engineering checklist to guarantee compatibility and prevent regressions:
    </p>
  </div>

  <h3>The 5-Step Feature Addition Process</h3>
  <ol>
    <li>
      <strong>Step 1: Schema & Type Definition (<code>src/lib/types.ts</code> & <code>src/lib/mongo.ts</code>):</strong><br>
      Define the TypeScript types first. If new fields are stored in MongoDB, update <code>EntryDoc</code> or <code>PersonDoc</code> in <code>mongo.ts</code>. Remember: monetary quantities must always be integer paise (<code>amountCents: number</code>).
    </li>
    <li>
      <strong>Step 2: Zod Validation (<code>src/lib/validation.ts</code>):</strong><br>
      Add or update the relevant Zod schema. Enforce length limits (e.g. <code>.max(50)</code>), sanitize string inputs with <code>.trim()</code>, and treat optional fields with <code>.nullish().transform(v => v || undefined)</code>.
    </li>
    <li>
      <strong>Step 3: Server Action / Reader Implementation (<code>src/actions/</code> or <code>src/server/readers.ts</code>):</strong><br>
      Implement the mutation or query. Always obtain the owner via <code>const owner = await getOwner()</code>. Enforce <code>{ ownerId: owner }</code> on every MongoDB operation. Call <code>revalidatePath()</code> on affected paths.
    </li>
    <li>
      <strong>Step 4: UI Component Integration (<code>src/components/</code>):</strong><br>
      Build or adapt components using React 19 <code>useActionState</code>. Style using Paper & Ink tokens (<code>bg-surface</code>, <code>border-rule</code>, <code>text-ink</code>, <code>text-muted</code>). Use <code>DM Mono</code> for all currency numbers via <code>&lt;Money /&gt;</code>.
    </li>
    <li>
      <strong>Step 5: Automated Test Verification (<code>tests/</code>):</strong><br>
      Write unit tests in Vitest covering both valid inputs and invalid edge cases. Run <code>pnpm typecheck</code> and <code>pnpm test</code> before concluding.
    </li>
  </ol>

  <!-- SECTION 14 -->
  <h1>14. Six High-Impact Feature Implementation Recipes</h1>
  <p>Below are detailed blueprints for the most commonly requested features. Claude can use these recipes directly when asked to implement them.</p>

  <h3>Recipe A: Transaction Categorization & Tags (Grocery, Rent, Chai, Business)</h3>
  <ul>
    <li><strong>Schema Change:</strong> Add <code>tag?: string | null</code> to <code>EntryDoc</code> in <code>mongo.ts</code> (max 24 chars).</li>
    <li><strong>Zod Schema:</strong> Add <code>tag: z.string().trim().max(24).nullish()</code> to <code>entrySchema</code> in <code>validation.ts</code>.</li>
    <li><strong>Action Update:</strong> In <code>addEntry</code>, store <code>tag: parsed.data.tag ?? null</code>.</li>
    <li><strong>UI Integration:</strong> Add quick tag pills in <code>AddEntryCard</code> (e.g. <code>["Chai / Snacks", "Inventory", "Salary", "Personal Loan"]</code>) and render pill badges in <code>RecentActivity</code> and the ledger entries list.</li>
    <li><strong>Filter View:</strong> Add a tag filter pill bar in <code>/people/[id]</code> to view totals per tag.</li>
  </ul>

  <h3>Recipe B: Direct PDF Statement & Invoice Generation</h3>
  <ul>
    <li><strong>Concept:</strong> Currently statements are shared via WhatsApp and printed via <code>@media print</code>. A native download button that generates a branded PDF directly adds huge utility for shopkeepers.</li>
    <li><strong>Implementation:</strong> Create an endpoint <code>src/app/api/people/[id]/statement/route.ts</code> that serves a printable HTML page with an automated <code>window.print()</code> trigger or renders a clean PDF.</li>
  </ul>

  <h3>Recipe C: Partial Settlement & Transaction Notes</h3>
  <ul>
    <li><strong>Concept:</strong> When a user settles partially rather than the full amount, automatically calculate and display the remaining balance.</li>
    <li><strong>Implementation:</strong> The <code>SettleBalanceModal</code> already accepts an editable amount. Add a quick 50% / 100% split button so the user can settle half or full balance with one tap.</li>
  </ul>

  <h3>Recipe D: Recurring Udhar / Subscriptions (Daily Milk, Monthly Rent)</h3>
  <ul>
    <li><strong>Concept:</strong> Automatically record recurring debits on a schedule.</li>
    <li><strong>Implementation:</strong> Add a new collection <code>recurring_entries</code>:
      <code>{ _id, ownerId, personId, amountCents, frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY', nextRunDate }</code>.
      Create a lightweight cron handler or Vercel Schedule to process due items.</li>
  </ul>

  <h3>Recipe E: Ledger Search & Date Range Filters</h3>
  <ul>
    <li><strong>Concept:</strong> Allow filtering transactions on a person's ledger by date range (e.g. "This Month", "Last 30 Days", "Custom Range").</li>
    <li><strong>Implementation:</strong> Add query parameter support to <code>src/app/(app)/people/[id]/page.tsx</code> for <code>from</code> and <code>to</code> dates. Pass them to <code>getPersonDetail()</code> to constrain the entries query.</li>
  </ul>

  <h3>Recipe F: Dark Mode (Ink & Paper Inversion)</h3>
  <ul>
    <li><strong>Concept:</strong> High-contrast nocturnal palette respecting the Paper & Ink aesthetic.</li>
    <li><strong>Implementation:</strong> In <code>globals.css</code>, define <code>@media (prefers-color-scheme: dark)</code> or a <code>.dark</code> class with:
      <code>--color-paper: #121110</code>, <code>--color-surface: #1e1b18</code>, <code>--color-ink: #f8f6f0</code>, <code>--color-rule: #38342e</code>.
    </li>
  </ul>

  <div class="footer-note">
    Chai Ledger V4 · Definitive Architecture & Specification Document · Generated for Claude AI Handoff
  </div>

</body>
</html>
"""

with open(HTML_FILE, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"HTML generated at: {HTML_FILE}")

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
file_url = "file:///" + HTML_FILE.replace("\\", "/")

cmd = [
    chrome_path,
    "--headless",
    "--no-sandbox",
    "--disable-gpu",
    f"--print-to-pdf={PDF_FILE}",
    "--no-pdf-header-footer",
    file_url
]

print("Rendering PDF with headless Chrome...")
res = subprocess.run(cmd, capture_output=True, text=True)
if res.returncode != 0:
    print("Chrome error:", res.stderr)
    sys.exit(1)

import shutil
shutil.copyfile(PDF_FILE, PDF_DOCS_FILE)

# Inspect generated PDF with pypdfium2
pdf = pypdfium2.PdfDocument(PDF_FILE)
page_count = len(pdf)
file_size = os.path.getsize(PDF_FILE)

print("SUCCESS!")
print(f"PDF Location 1: {PDF_FILE}")
print(f"PDF Location 2: {PDF_DOCS_FILE}")
print(f"Total Pages: {page_count}")
print(f"File Size: {file_size:,} bytes")
