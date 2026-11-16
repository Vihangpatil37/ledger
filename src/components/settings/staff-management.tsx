"use client";

import { useActionState, useEffect, useState } from "react";
import { createStaff, deleteStaff, toggleStaffStatus, updateShopCode } from "@/actions/staff";
import { UpiQrCode } from "@/components/qr-code";
import { Button, FieldError, Label, inputClass } from "@/components/ui";
import type { ActionState, StaffItem } from "@/lib/types";

export function StaffManagementSection({
  shopCode,
  staff,
}: {
  shopCode: string;
  staff: StaffItem[];
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingCode, setEditingCode] = useState(false);

  const [addState, addAction, addPending] = useActionState<ActionState, FormData>(
    createStaff,
    {}
  );

  const [codeState, codeAction, codePending] = useActionState<ActionState, FormData>(
    updateShopCode,
    {}
  );

  // Close add form on successful creation
  useEffect(() => {
    if (addState.ok) {
      setShowAddForm(false);
    }
  }, [addState.ok]);

  useEffect(() => {
    if (codeState.ok) {
      setEditingCode(false);
    }
  }, [codeState.ok]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const inviteUrl = `${origin}/login?shop=${encodeURIComponent(shopCode)}`;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shopCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="rounded-2xl border border-rule bg-surface p-5 sm:p-6 shadow-[0_2px_12px_0_rgba(30,27,24,0.04)] flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-sm font-bold text-ink tracking-tight">
          Staff & Munim Access
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Allow counter clerks to record daily Udhar & Jama without seeing total store balance.
        </p>
      </div>

      {/* Shop Code & Invite Card */}
      <div className="rounded-xl border border-rule/70 bg-paper/60 p-4 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted">
              Your Shop Identifier
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-lg font-bold tracking-wider text-ink bg-surface px-2.5 py-0.5 rounded-lg border border-rule">
                {shopCode}
              </span>
              <button
                type="button"
                onClick={copyCode}
                className="min-h-[36px] rounded-lg border border-rule bg-surface px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink hover:bg-paper transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
              >
                {copied ? "Copied! ✓" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() => setEditingCode((v) => !v)}
                className="text-xs font-medium text-muted hover:text-ink underline ml-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
              >
                {editingCode ? "Cancel" : "Change"}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            className="inline-flex min-h-[38px] items-center gap-1.5 self-start sm:self-auto rounded-xl border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-paper transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
          >
            <span aria-hidden="true">📱</span>
            <span>{showQr ? "Hide QR Invite" : "Show QR Invite"}</span>
          </button>
        </div>

        {/* Change Shop Code Form */}
        {editingCode ? (
          <form action={codeAction} className="pt-2 border-t border-rule/50 flex flex-col gap-2">
            <Label htmlFor="shopCode">New Shop Code (3-20 letters/digits)</Label>
            <div className="flex items-center gap-2">
              <input
                id="shopCode"
                name="shopCode"
                defaultValue={shopCode}
                autoCapitalize="characters"
                required
                className={`${inputClass} max-w-xs uppercase font-mono`}
              />
              <Button type="submit" disabled={codePending} isLoading={codePending}>
                {codePending ? "Saving…" : "Save Code"}
              </Button>
            </div>
            <FieldError message={codeState.fieldErrors?.shopCode || codeState.error} />
          </form>
        ) : null}

        {/* QR Code view */}
        {showQr && origin ? (
          <div className="flex flex-col items-center pt-3 border-t border-rule/50 gap-2 text-center">
            <p className="text-xs text-muted">
              Staff can scan this code to open the login page with your shop pre-filled:
            </p>
            <div className="flex justify-center">
              <UpiQrCode upiUrl={inviteUrl} size={150} />
            </div>
            <p className="font-mono text-[10px] text-muted max-w-xs truncate">
              {inviteUrl}
            </p>
          </div>
        ) : null}
      </div>

      {/* Staff Accounts List */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
            Staff Members ({staff.length})
          </h3>
          <Button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className="text-xs py-1.5 px-3 min-h-[36px]"
          >
            {showAddForm ? "Cancel" : "+ Add Staff"}
          </Button>
        </div>

        {/* Add Staff Collapsible Form */}
        {showAddForm ? (
          <form
            action={addAction}
            className="rounded-xl border border-rule/80 bg-surface p-4 flex flex-col gap-3.5 shadow-2xs"
          >
            <h4 className="text-xs font-bold text-ink">New Staff Profile</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="staffName">Staff Name *</Label>
                <input
                  id="staffName"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Ramesh Verma"
                  className={inputClass}
                />
                <FieldError message={addState.fieldErrors?.name} />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="staffPin">4-Digit PIN *</Label>
                <input
                  id="staffPin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  required
                  placeholder="••••"
                  className={`${inputClass} font-mono tracking-widest text-center`}
                />
                <FieldError message={addState.fieldErrors?.pin} />
              </div>

              <div className="flex flex-col gap-1">
                <Label htmlFor="staffPhone">Phone (Optional)</Label>
                <input
                  id="staffPhone"
                  name="phone"
                  type="tel"
                  placeholder="9876543210"
                  className={inputClass}
                />
              </div>
            </div>

            {addState.error ? (
              <p className="text-xs text-danger font-medium">{addState.error}</p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="min-h-[38px] px-3.5 py-1.5 text-xs font-semibold text-muted hover:text-ink cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
              >
                Cancel
              </button>
              <Button type="submit" disabled={addPending} isLoading={addPending}>
                {addPending ? "Adding…" : "Create Staff Account"}
              </Button>
            </div>
          </form>
        ) : null}

        {staff.length === 0 ? (
          <p className="rounded-xl border border-dashed border-rule p-4 text-center text-xs text-muted">
            No staff members created yet. Tap &quot;+ Add Staff&quot; above to create a login for your counter clerk.
          </p>
        ) : (
          <div className="divide-y divide-rule/60 rounded-xl border border-rule bg-surface overflow-hidden">
            {staff.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 sm:px-4 text-xs gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-ink truncate">{s.name}</p>
                    <span
                      className={`inline-block size-2 rounded-full ${
                        s.isActive ? "bg-credit" : "bg-muted"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-[10px] text-muted">
                      {s.isActive ? "Active" : "Disabled"}
                    </span>
                  </div>
                  {s.phone ? (
                    <p className="font-mono text-[11px] text-muted mt-0.5">
                      {s.phone}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle Active Status */}
                  <form action={toggleStaffStatus}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      className={`min-h-[32px] rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-focus ${
                        s.isActive
                          ? "bg-paper text-muted hover:text-ink hover:bg-rule/40"
                          : "bg-credit/10 text-credit hover:bg-credit/20"
                      }`}
                    >
                      {s.isActive ? "Disable" : "Enable"}
                    </button>
                  </form>

                  {/* Delete Button */}
                  <form action={deleteStaff}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      type="submit"
                      title="Remove Staff"
                      aria-label={`Remove staff member ${s.name}`}
                      className="min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-focus"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
