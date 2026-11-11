"use client";

import Link from "next/link";
import { useState } from "react";
import { Money } from "@/components/ui";
import { balanceMeta } from "@/lib/money";
import { normalizeWaPhone, waLink } from "@/lib/whatsapp";
import type { PersonListRow } from "@/lib/types";

type FilterTab = "ALL" | "OWES_YOU" | "YOU_OWE" | "OVERDUE" | "SETTLED";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function PeopleList({ rows }: { rows: PersonListRow[] }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<FilterTab>("ALL");

  const trimmed = query.trim().toLowerCase();

  // Tab filtering
  const tabFiltered = rows.filter((row) => {
    const val = Number(row.balance);
    if (tab === "OWES_YOU") return val > 0;
    if (tab === "YOU_OWE") return val < 0;
    if (tab === "OVERDUE") return row.isOverdue;
    if (tab === "SETTLED") return val === 0;
    return true;
  });

  // Search filtering
  const filtered = trimmed
    ? tabFiltered.filter(
        (row) =>
          row.name.toLowerCase().includes(trimmed) ||
          (row.phone ?? "").toLowerCase().includes(trimmed)
      )
    : tabFiltered;

  const owesYouCount = rows.filter((r) => Number(r.balance) > 0).length;
  const youOweCount = rows.filter((r) => Number(r.balance) < 0).length;
  const overdueCount = rows.filter((r) => r.isOverdue).length;
  const settledCount = rows.filter((r) => Number(r.balance) === 0).length;

  return (
    <div className="space-y-3.5">
      {/* Search and Filters Header */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "ALL", label: "All", count: rows.length },
            { id: "OWES_YOU", label: "Owes you", count: owesYouCount },
            { id: "YOU_OWE", label: "You owe", count: youOweCount },
            { id: "OVERDUE", label: "Overdue", count: overdueCount },
            { id: "SETTLED", label: "Settled", count: settledCount },
          ].map((item) => {
            const active = tab === item.id;
            const isOverdueTab = item.id === "OVERDUE" && item.count > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as FilterTab)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  active
                    ? "bg-ink text-paper shadow-[0_1px_2px_0_rgba(30,27,24,0.12)]"
                    : isOverdueTab
                      ? "border border-debit/30 bg-debit-light text-debit hover:bg-debit-light/80"
                      : "border border-rule bg-surface text-muted hover:bg-paper hover:text-ink"
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] leading-tight font-mono ${
                    active
                      ? "bg-paper/20 text-paper"
                      : isOverdueTab
                        ? "bg-debit text-white"
                        : "bg-paper text-muted"
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        {rows.length > 0 ? (
          <div className="relative w-full sm:w-64">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-xs text-muted">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-3.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or phone…"
              aria-label="Search people"
              className="w-full min-h-[36px] rounded-lg border border-rule bg-surface pl-8 pr-7 py-1 text-xs text-ink placeholder:text-faint focus-visible:border-focus focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs text-muted hover:text-ink"
              >
                ✕
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Directory List */}
      {filtered.length === 0 ? (
        trimmed ? (
          <Nothing
            title="No matches found"
            hint={`No contacts matched "${trimmed}". Try searching by a different name or phone number.`}
          />
        ) : tab !== "ALL" ? (
          <Nothing
            title={`No ${
              tab === "OWES_YOU"
                ? "pending collections"
                : tab === "YOU_OWE"
                  ? "pending payables"
                  : tab === "OVERDUE"
                    ? "overdue payments"
                    : "settled contacts"
            }`}
            hint="Contacts in this category will appear here once balance changes."
          />
        ) : (
          <Nothing
            title="Your khata book is empty"
            hint="Add your first contact to start recording Udhar and received payments."
          />
        )
      ) : (
        <ul className="divide-y divide-rule/60 overflow-hidden rounded-xl border border-rule bg-surface shadow-[0_2px_8px_0_rgba(30,27,24,0.03)]">
          {filtered.map((row) => {
            const meta = balanceMeta(row.balance);
            const value = Number(row.balance);
            const isOwesYou = value > 0;
            const isSettled = value === 0;
            const waNumber = isOwesYou && row.phone ? normalizeWaPhone(row.phone) : null;
            const quickWaHref = waNumber
              ? waLink(
                  waNumber,
                  `Namaste ${row.name} ji 🙏 Aapke khate mein balance baki hai.`
                )
              : null;

            return (
              <li
                key={row.id}
                className="group flex items-center justify-between gap-3 px-3.5 py-3 transition-all duration-150 hover:bg-paper/70 sm:px-4"
              >
                <Link
                  href={`/people/${row.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  {/* Initials Avatar */}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-rule/80 bg-paper font-mono text-xs font-bold text-ink group-hover:border-rule group-hover:bg-surface transition-colors shadow-2xs">
                    {getInitials(row.name)}
                  </div>

                  {/* Name and Phone */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="truncate text-sm font-semibold text-ink group-hover:text-focus transition-colors">
                        {row.name}
                      </p>
                      {row.isOverdue ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-debit-light text-debit border border-debit/30">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate font-mono text-xs text-muted">
                      {row.phone ? row.phone : "No phone saved"}
                    </p>
                  </div>
                </Link>

                {/* Right Side: Quick WhatsApp & Balance */}
                <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                  {quickWaHref ? (
                    <a
                      href={quickWaHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Remind ${row.name} on WhatsApp`}
                      className="hidden sm:inline-flex size-8 items-center justify-center rounded-lg border border-rule bg-surface text-[#25d366] transition-colors hover:bg-[#25d366] hover:text-white"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                        className="size-3.5"
                      >
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  ) : null}

                  <Link href={`/people/${row.id}`} className="text-right">
                    {isSettled ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase bg-credit-light text-credit border border-credit/30">
                        Settled
                      </span>
                    ) : (
                      <>
                        <Money
                          amount={row.balance}
                          abs={value < 0}
                          className={`${meta.className} text-sm sm:text-base font-bold block leading-tight`}
                        />
                        <span
                          className={`inline-block mt-0.5 font-mono text-[10px] uppercase font-semibold tracking-wider ${
                            isOwesYou
                              ? "text-debit"
                              : "text-credit"
                          }`}
                        >
                          {meta.label}
                        </span>
                      </>
                    )}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Nothing({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-lg border border-dashed border-rule bg-surface px-4 py-8 sm:px-6 sm:py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-xs text-muted max-w-sm mx-auto">{hint}</p>
    </div>
  );
}

