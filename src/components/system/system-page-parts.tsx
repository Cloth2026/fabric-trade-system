"use client";

import { CheckCircle2, ChevronDown, CircleDashed, EyeOff, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { SYSTEM_PROTOTYPE_NOTICE, userRoleLabels, userStatusLabels } from "./system-prototype-data";
import type { UserRoleKey, UserStatusKey } from "./system-prototype-data";

export function SystemFilterSelect<T extends string>({ label, options, value, onChange }: { label: string; options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button
        aria-expanded={open}
        className={`flex h-9 min-w-36 items-center justify-between gap-3 rounded-xl border px-3 text-sm shadow-inner shadow-white/12 transition ${open ? "border-white/52 bg-white/40" : "border-white/30 bg-white/24 hover:bg-white/36"}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="text-stone-500">{label}</span>
        <span className="flex items-center gap-1.5 font-medium text-stone-950">
          <span className="max-w-28 truncate">{selectedLabel}</span>
          <ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-30 max-h-72 w-52 overflow-auto rounded-2xl border border-white/40 bg-white/76 p-1.5 text-sm shadow-[0_24px_70px_rgba(22,18,14,0.24)] backdrop-blur-3xl">
          {options.map((option) => (
            <button
              className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${option.value === value ? "bg-white/90 text-stone-950 shadow-sm" : "text-stone-700 hover:bg-white/52"}`}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              type="button"
            >
              {option.label}
              {option.value === value ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SystemDateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-9 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-3 text-sm shadow-inner shadow-white/12">
      <span className="text-stone-500">{label}</span>
      <input
        className="w-32 bg-transparent font-medium text-stone-950 outline-none"
        onChange={(event) => onChange(event.target.value)}
        type="date"
        value={value}
      />
    </label>
  );
}

export function SearchBox({ placeholder, value, onChange, ariaLabel }: { placeholder: string; value: string; onChange: (value: string) => void; ariaLabel: string }) {
  return (
    <label className="flex h-9 min-w-72 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-3 text-sm shadow-inner shadow-white/12">
      <Search className="size-4 text-stone-500" />
      <input aria-label={ariaLabel} className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
      {value ? (
        <button aria-label="清空搜索" className="rounded-lg p-1 text-stone-500 hover:bg-white/44" onClick={() => onChange("")} type="button">
          <X className="size-3.5" />
        </button>
      ) : null}
    </label>
  );
}

const metricTones = {
  blue: "border-blue-300/34 bg-blue-500/12 text-blue-700",
  emerald: "border-emerald-300/34 bg-emerald-500/12 text-emerald-700",
  violet: "border-violet-300/34 bg-violet-500/12 text-violet-700",
  amber: "border-amber-300/42 bg-amber-400/16 text-amber-800",
};

export function SystemMetric({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: LucideIcon; tone: "blue" | "emerald" | "violet" | "amber" }) {
  return (
    <div className="rounded-[18px] border border-white/26 bg-white/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl transition hover:bg-white/28">
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-700">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-xl border ${metricTones[tone]}`}><Icon className="size-4" /></span>
      </div>
      <div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div>
      <div className="mt-1 truncate text-xs text-stone-600">{note}</div>
    </div>
  );
}

export function RolePills({ roles }: { roles: UserRoleKey[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {roles.map((role) => (
        <span className="rounded-full border border-white/42 bg-white/42 px-2 py-0.5 text-xs text-stone-700" key={role}>
          {userRoleLabels[role]}
        </span>
      ))}
    </div>
  );
}

export function StatusPill({ status }: { status: UserStatusKey }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${status === "active" ? "bg-emerald-50/82 text-emerald-800" : "bg-stone-200/72 text-stone-700"}`}>
      {status === "active" ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}
      {userStatusLabels[status]}
    </span>
  );
}

export function PrototypeBadge({ children }: { children: string }) {
  return <span className="rounded-full border border-amber-200/60 bg-amber-50/58 px-2 py-0.5 text-xs text-amber-800">{children}</span>;
}

export function PrototypeNotice({ children }: { children: string }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-white/34 bg-white/26 px-4 py-3 text-sm text-stone-700 shadow-inner shadow-white/12">
      <EyeOff className="mt-0.5 size-4 shrink-0 text-amber-700" />
      <span>{children || SYSTEM_PROTOTYPE_NOTICE}</span>
    </div>
  );
}

export function DemoToast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="fixed right-5 top-20 z-[60] flex items-center gap-2 rounded-2xl border border-amber-200/60 bg-amber-50/86 px-4 py-3 text-sm text-amber-900 shadow-xl backdrop-blur-2xl">
      <EyeOff className="size-4" />
      {message}
    </div>
  );
}
