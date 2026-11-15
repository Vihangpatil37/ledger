export type EntryType = "GAVE" | "RECEIVED";

export type PersonListRow = {
  id: string;
  name: string;
  phone: string | null;
  balance: string;
  isOverdue?: boolean;
};

export type RecentEntryItem = {
  id: string;
  personId: string;
  personName: string;
  type: EntryType;
  amount: string;
  note: string | null;
  dueDate?: string | null;
  editedAt?: string | null;
  createdAt: string;
};

export type HomeSummary = {
  /** Sum of positive balances — money you can expect back. */
  youllGet: string;
  /** Sum of negative balances (absolute) — money you owe others. */
  youllGive: string;
  /** Net balance = youllGet - youllGive */
  netBalance: string;
  debtorsCount: number;
  creditorsCount: number;
  settledCount: number;
  overdueCount: number;
  rows: PersonListRow[];
  recentEntries: RecentEntryItem[];
};

export type EntryRow = {
  id: string;
  type: EntryType;
  amount: string;
  note: string | null;
  dueDate?: string | null;
  editedAt?: string | null;
  createdAt: string;
};

export type DateRange = {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
};

export type PersonDetail = {
  id: string;
  name: string;
  phone: string | null;
  gaveTotal: string;
  receivedTotal: string;
  balance: string;
  openingBalance?: string | null;
  range?: DateRange;
  ownerUpi?: {
    upiId: string | null;
    upiName: string | null;
  } | null;
  /** Newest first; running balance is after that entry was added. */
  entries: Array<EntryRow & { running: string }>;
};

export type OwnerProfile = {
  email: string;
  upiId: string | null;
  upiName: string | null;
};

export type ActionState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};
