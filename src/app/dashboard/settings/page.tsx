"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ShieldCheck, Lock, Building, Database, Key, CheckCircle2 } from "lucide-react";

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("Apex Hardware & Trade Ltd");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState("UTC");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your organization profile, currency standards, tenant isolation, and security configuration.
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Organization settings updated successfully.</span>
        </div>
      )}

      {/* Organization Profile */}
      <Card className="p-6">
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
          <Building className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Organization & Tenant Profile</h3>
            <p className="text-xs text-slate-500">Tenant identifier and base operating configuration.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Business Legal Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Tenant UUID (Immutable)</label>
              <input
                type="text"
                readOnly
                value="11111111-1111-4111-8111-111111111111"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-xs text-slate-600 select-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Base Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: "USD", label: "USD ($) — Exponent 2 (Cents)" },
                { value: "EUR", label: "EUR (€) — Exponent 2 (Cents)" },
                { value: "GBP", label: "GBP (£) — Exponent 2 (Pence)" },
                { value: "JPY", label: "JPY (¥) — Exponent 0 (Zero-decimal)" },
                { value: "BHD", label: "BHD (BD) — Exponent 3 (Fils)" },
              ]}
              helperText="Stored as integer minor units in database."
            />
            <Select
              label="Reporting Timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={[
                { value: "UTC", label: "UTC (Coordinated Universal Time)" },
                { value: "EST", label: "America/New_York (EST)" },
                { value: "PST", label: "America/Los_Angeles (PST)" },
                { value: "GMT", label: "Europe/London (GMT)" },
              ]}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm">
              Save Organization Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Security & Access Control */}
      <Card className="p-6">
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-slate-500">Active session authorization and capabilities.</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between border border-slate-100">
            <div>
              <span className="font-semibold text-slate-800">Current User Identity:</span>
              <p className="text-slate-500">Apex Owner (owner@bizora.app)</p>
            </div>
            <Badge variant="success">Role: OWNER</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 border border-slate-200 rounded-lg">
              <span className="font-bold text-slate-800 block mb-1">Owner</span>
              <p className="text-[11px] text-slate-500">
                Full authority: approve recovery drafts, execute client-side handoffs, manage users, modify billing.
              </p>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg opacity-70">
              <span className="font-bold text-slate-800 block mb-1">Manager</span>
              <p className="text-[11px] text-slate-500">
                Operational: create customers, record sales, prepare draft outreach. Cannot approve or dispatch.
              </p>
            </div>
            <div className="p-3 border border-slate-200 rounded-lg opacity-70">
              <span className="font-bold text-slate-800 block mb-1">Analyst</span>
              <p className="text-[11px] text-slate-500">
                Read-only: view revenue dashboards, risk scores, and audit reports. All write operations disabled.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Database & Cryptographic Audit Status */}
      <Card className="p-6">
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-100">
          <Database className="w-5 h-5 text-slate-700" />
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Data Architecture & Integrity</h3>
            <p className="text-xs text-slate-500">Database security policies and cryptographic ledgers.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-lg space-y-1">
            <span className="font-semibold text-slate-800 block">Row-Level Security (RLS)</span>
            <p className="text-slate-500">
              Status: <strong className="text-emerald-700">Enforced & Forced</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Every query binds to <code>app.current_tenant_id</code>. Cross-tenant leakage is blocked at the SQL engine level.
            </p>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-lg space-y-1">
            <span className="font-semibold text-slate-800 block">Audit Ledger Hash Chain</span>
            <p className="text-slate-500">
              Algorithm: <strong className="text-slate-900 font-mono">SHA-256 Chained</strong>
            </p>
            <p className="text-[11px] text-slate-400">
              Append-only immutability. Every event links to the cryptographic hash of the preceding record.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
