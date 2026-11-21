"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileEdit,
  CheckCircle2,
  Settings,
  ShieldCheck,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Revenue Analytics",
    href: "/dashboard/revenue",
    icon: TrendingUp,
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    label: "Customer Risk",
    href: "/dashboard/risk",
    icon: AlertTriangle,
  },
  {
    label: "Recovery Opportunities",
    href: "/dashboard/recovery",
    icon: RotateCcw,
  },
  {
    label: "Recommendations",
    href: "/dashboard/recommendations",
    icon: Sparkles,
  },
  {
    label: "Campaign Drafts",
    href: "/dashboard/drafts",
    icon: FileEdit,
  },
  {
    label: "Approvals",
    href: "/dashboard/approvals",
    icon: CheckCircle2,
    badge: "Owner",
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen text-slate-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">Bizora</span>
            <span className="block text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
              Intelligence
            </span>
          </div>
        </Link>
      </div>

      {/* Business Switcher Badge */}
      <div className="px-4 py-3 mx-4 my-3 bg-slate-800/60 rounded-lg border border-slate-700/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <Store className="w-4 h-4" />
        </div>
        <div className="overflow-hidden">
          <div className="text-xs font-semibold text-white truncate">Apex Hardware & Trade</div>
          <div className="text-[10px] text-slate-400">Retail & Quotations</div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-1 py-2 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Platform Navigation
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/70"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Human In The Loop Safety Badge */}
      <div className="p-3.5 m-4 bg-slate-800/40 rounded-xl border border-slate-700/40">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>HITL Governance Active</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Zero automated messaging. Every customer outreach requires explicit human Owner sign-off.
        </p>
      </div>

      {/* Footer User Info */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200">
            AO
          </div>
          <div className="text-xs">
            <div className="font-medium text-white">Apex Owner</div>
            <div className="text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Owner (Admin)
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
