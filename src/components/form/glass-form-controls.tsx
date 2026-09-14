"use client";

import { CheckCircle2, ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { ConfigOption } from "@/lib/api/fabric-client";

export type PanelTone = "blue" | "indigo" | "emerald" | "lime" | "cyan" | "violet" | "amber" | "rose";

const panelToneClasses: Record<PanelTone, string> = {
  blue: "border-blue-300/36 bg-blue-500/12 text-blue-700",
  indigo: "border-indigo-300/36 bg-indigo-500/12 text-indigo-700",
  emerald: "border-emerald-300/36 bg-emerald-500/12 text-emerald-700",
  lime: "border-lime-300/38 bg-lime-500/14 text-lime-800",
  cyan: "border-cyan-300/36 bg-cyan-500/12 text-cyan-700",
  violet: "border-violet-300/36 bg-violet-500/12 text-violet-700",
  amber: "border-amber-300/42 bg-amber-400/16 text-amber-800",
  rose: "border-rose-300/36 bg-rose-500/12 text-rose-700",
};

export function PanelTitle({
  icon: Icon,
  title,
  description,
  tone = "blue",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  tone?: PanelTone;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-2xl border shadow-inner shadow-white/20 ${panelToneClasses[tone]}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <h3 className="font-semibold text-stone-950">{title}</h3>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>
    </div>
  );
}

export function FormPanel({
  icon,
  tone,
  title,
  description,
  children,
  actions,
}: {
  icon: LucideIcon;
  tone: PanelTone;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <PanelTitle icon={icon} tone={tone} title={title} description={description} />
        {actions}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <span className="text-stone-600">
      {label}
      {required ? <span className="ml-1 text-red-600">*</span> : null}
    </span>
  );
}

export function FieldError({ error }: { error?: string }) {
  return error ? <div className="mt-1 text-xs text-red-700">{error}</div> : null;
}

export function GlassInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  type = "text",
  maxLength,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  type?: "text" | "date" | "number";
  maxLength?: number;
  disabled?: boolean;
}) {
  return (
    <label className="text-sm">
      <FieldLabel label={label} required={required} />
      <input
        className={`mt-1 h-10 w-full rounded-xl border bg-white/24 px-3 text-stone-950 outline-none transition placeholder:text-stone-500/62 focus:bg-white/34 disabled:cursor-not-allowed disabled:opacity-55 ${error ? "border-red-400/70" : "border-white/28 focus:border-blue-400/70"}`}
        disabled={disabled}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step={type === "number" ? "any" : undefined}
        type={type}
        value={value}
      />
      <FieldError error={error} />
    </label>
  );
}

export function GlassTextarea({
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="text-sm md:col-span-2 xl:col-span-3">
      <FieldLabel label={label} />
      <textarea
        className={`mt-1 min-h-20 w-full resize-y rounded-xl border bg-white/24 px-3 py-2 text-stone-950 outline-none transition placeholder:text-stone-500/62 focus:bg-white/34 ${error ? "border-red-400/70" : "border-white/28 focus:border-blue-400/70"}`}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      <FieldError error={error} />
    </label>
  );
}

export function FabricCodeInput({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  return (
    <label className="text-sm">
      <FieldLabel label="面料编号" required />
      <div className={`mt-1 flex h-10 overflow-hidden rounded-xl border bg-white/24 text-stone-950 transition focus-within:bg-white/34 ${error ? "border-red-400/70" : "border-white/28 focus-within:border-blue-400/70"}`}>
        <span className="flex items-center border-r border-white/28 bg-stone-950/8 px-3 font-mono text-sm font-semibold text-stone-700">SDD-</span>
        <input
          className="min-w-0 flex-1 bg-transparent px-3 font-mono outline-none placeholder:text-stone-500/62"
          maxLength={60}
          onChange={(event) => onChange(event.target.value)}
          placeholder="手动填写，整码最长64字符"
          value={value}
        />
      </div>
      <FieldError error={error} />
    </label>
  );
}

export function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-stone-600">{label}</span>
      <div className="mt-1 flex h-10 items-center rounded-xl border border-white/24 bg-stone-950/8 px-3 font-medium text-stone-950">{value}</div>
    </div>
  );
}

export function GlassSelect({
  label,
  options,
  value,
  onChange,
  required,
  placeholder = "请选择",
  error,
  configurable = true,
}: {
  label: string;
  options: ConfigOption[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
  configurable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.key === value);

  return (
    <div
      className="relative text-sm"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <FieldLabel label={label} required={required} />
      <button
        aria-expanded={open}
        className={`mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left transition ${error ? "border-red-400/70" : open ? "border-white/48 bg-white/36" : "border-white/28 bg-white/24 hover:bg-white/32"}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={`truncate font-medium ${selected ? "text-stone-950" : "text-stone-500"}`}>{selected?.label ?? placeholder}</span>
        <span className="flex shrink-0 items-center gap-1">
          {configurable ? <span className="rounded-lg bg-white/28 px-1.5 py-0.5 text-[11px] text-stone-500">可配置</span> : null}
          <ChevronDown className={`size-4 text-stone-600 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[66px] z-40 max-h-64 overflow-auto rounded-2xl border border-white/38 bg-white/72 p-1.5 text-stone-900 shadow-[0_24px_70px_rgba(22,18,14,0.24),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-3xl">
          {options.map((option) => (
            <button
              className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${option.key === value ? "bg-white/88 text-stone-950 shadow-sm" : "text-stone-700 hover:bg-white/48 hover:text-stone-950"}`}
              key={option.key}
              onClick={() => {
                onChange(option.key);
                setOpen(false);
              }}
              type="button"
            >
              <span>{option.label}</span>
              {option.key === value ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}
            </button>
          ))}
          {options.length === 0 ? <div className="px-3 py-2 text-stone-500">暂无可用选项</div> : null}
        </div>
      ) : null}
      <FieldError error={error} />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-2xl border border-white/28 bg-white/18 p-1 text-sm shadow-inner shadow-white/12">
      {options.map((option) => (
        <button
          className={`rounded-xl px-3 py-1.5 transition ${value === option.value ? "bg-white/72 text-stone-950 shadow-sm" : "text-stone-600 hover:bg-white/24 hover:text-stone-950"}`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function GlassChipGroup({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: ConfigOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-stone-700">
        {label}
        <span className="rounded-lg bg-white/28 px-1.5 py-0.5 text-[11px] text-stone-500">可配置</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.key);
          return (
            <button
              className={`h-8 rounded-xl border px-3 text-sm transition ${active ? "border-blue-400/50 bg-blue-500/14 text-blue-800 shadow-inner shadow-white/20" : "border-white/30 bg-white/24 text-stone-700 hover:border-white/48 hover:bg-white/38 hover:text-stone-950"}`}
              key={option.key}
              onClick={() => onChange(active ? selected.filter((key) => key !== option.key) : [...selected, option.key])}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
