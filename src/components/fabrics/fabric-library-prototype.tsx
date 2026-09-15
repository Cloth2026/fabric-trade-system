"use client";

import {
  Archive,
  BadgeCheck,
  Building2,
  CalendarPlus2,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Factory,
  Filter,
  Grid2X2,
  Menu,
  Plus,
  Search,
  Sparkles,
  SwatchBook,
  TableProperties,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { FabricDetailDrawer } from "./fabric-detail-drawer";
import {
  defaultFabricLibraryView,
  developmentSourceLabels,
  fabricLibraryPrototypes,
  fabricStatusLabels,
  fabricTypeLabels,
  filterFabricLibrary,
  getFabricLibraryMetrics,
  getFabricSpecification,
  getPreferredFabricSource,
  initialFabricLibraryFilters,
  pricingUnitLabels,
} from "./fabric-library-prototype-data";
import type {
  FabricCompletenessFilter,
  FabricLibraryPrototype,
  FabricPrototypeSource,
  FabricPrototypeStatus,
  FabricPrototypeType,
} from "./fabric-library-prototype-data";

type FabricLibraryView = "table" | "cards";

const typeOptions: Array<{ value: "all" | FabricPrototypeType; label: string }> = [
  { value: "all", label: "全部" },
  { value: "knitted", label: "针织" },
  { value: "woven", label: "梭织" },
];
const statusOptions: Array<{ value: "all" | FabricPrototypeStatus; label: string }> = [
  { value: "all", label: "全部" },
  { value: "sellable", label: "可销售" },
  { value: "incomplete", label: "待完善" },
  { value: "inactive", label: "停用" },
];
const sourceOptions: Array<{ value: "all" | FabricPrototypeSource; label: string }> = [
  { value: "all", label: "全部" },
  ...Object.entries(developmentSourceLabels).map(([value, label]) => ({ value: value as FabricPrototypeSource, label })),
];
const completenessOptions: Array<{ value: FabricCompletenessFilter; label: string }> = [
  { value: "all", label: "全部" },
  { value: "complete", label: "完整度 ≥ 85%" },
  { value: "needs_attention", label: "需要补全" },
];

function MetricCard({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: LucideIcon; tone: "blue" | "emerald" | "amber" | "violet" }) {
  const tones = {
    blue: "border-blue-300/36 bg-blue-500/12 text-blue-700",
    emerald: "border-emerald-300/36 bg-emerald-500/12 text-emerald-700",
    amber: "border-amber-300/44 bg-amber-400/16 text-amber-800",
    violet: "border-violet-300/36 bg-violet-500/12 text-violet-700",
  };
  return (
    <div className="rounded-[18px] border border-white/24 bg-white/18 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl transition hover:bg-white/26">
      <div className="flex items-center justify-between"><span className="text-xs text-stone-700">{label}</span><span className={`flex size-8 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="size-4" /></span></div>
      <div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div>
      <div className="mt-1 truncate text-xs text-stone-600">{note}</div>
    </div>
  );
}

function FilterSelect<T extends string>({ label, options, value, onChange }: { label: string; options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button aria-expanded={open} className={`flex h-9 min-w-32 items-center justify-between gap-3 rounded-xl border px-3 text-xs shadow-inner shadow-white/12 transition ${open ? "border-white/52 bg-white/40" : "border-white/30 bg-white/24 hover:bg-white/36"}`} onClick={() => setOpen((current) => !current)} type="button">
        <span className="text-stone-500">{label}</span><span className="flex min-w-0 items-center gap-1.5 font-medium text-stone-950"><span className="max-w-28 truncate">{selectedLabel}</span><ChevronDown className={`size-3.5 shrink-0 transition ${open ? "rotate-180" : ""}`} /></span>
      </button>
      {open ? <div className="absolute right-0 top-11 z-30 w-48 rounded-2xl border border-white/40 bg-white/82 p-1.5 text-xs shadow-[0_24px_70px_rgba(22,18,14,0.24)] backdrop-blur-3xl">{options.map((option) => <button className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${option.value === value ? "bg-white text-stone-950 shadow-sm" : "text-stone-700 hover:bg-white/58"}`} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} type="button">{option.label}{option.value === value ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}</button>)}</div> : null}
    </div>
  );
}

function FabricStatusBadge({ status }: { status: FabricPrototypeStatus }) {
  const style = status === "sellable" ? "bg-emerald-50/82 text-emerald-800" : status === "incomplete" ? "bg-amber-50/82 text-amber-800" : "bg-stone-200/76 text-stone-700";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${style}`}>{status === "sellable" ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}{fabricStatusLabels[status]}</span>;
}

function Completeness({ value }: { value: number }) {
  return (
    <div className="flex w-28 items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/56"><div className={`h-1.5 rounded-full ${value >= 85 ? "bg-emerald-700/76" : "bg-amber-600/78"}`} style={{ width: `${value}%` }} /></div>
      <span className="text-xs text-stone-600">{value}%</span>
    </div>
  );
}

function PreferredSource({ fabric }: { fabric: FabricLibraryPrototype }) {
  const source = getPreferredFabricSource(fabric);
  if (!source) return <span className="text-xs text-stone-500">尚未建立货源</span>;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 font-medium text-stone-900"><Building2 className="size-3.5 shrink-0 text-blue-700" /><span className="truncate">{source.supplierName}</span></div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500"><Factory className="size-3 shrink-0" /><span className="truncate">{source.supplierUnitName || "未指定生产单元"}</span></div>
      {fabric.supplierSources.length > 1 ? <div className="mt-1 text-[11px] text-blue-700">另有 {fabric.supplierSources.length - 1} 个货源</div> : null}
    </div>
  );
}

function FabricTable({ fabrics, onSelect }: { fabrics: FabricLibraryPrototype[]; onSelect: (fabric: FabricLibraryPrototype) => void }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-white/26 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl" data-testid="fabric-professional-table">
      <table className="w-full min-w-[1480px] table-fixed border-collapse text-left text-sm">
        <colgroup><col className="w-[250px]" /><col className="w-[110px]" /><col className="w-[170px]" /><col className="w-[190px]" /><col className="w-[240px]" /><col className="w-[130px]" /><col className="w-[90px]" /><col className="w-[100px]" /><col className="w-[120px]" /><col className="w-[120px]" /></colgroup>
        <thead className="sticky top-0 z-10 bg-white/64 text-xs text-stone-700 backdrop-blur-2xl"><tr>{["面料", "类型 / 计价", "成分", "规格", "首选货源", "最新采购价", "货源数量", "资料状态", "完整度", "更新时间"].map((header) => <th className="px-4 py-3 font-medium" key={header}>{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/26">
          {fabrics.map((fabric) => {
            const preferred = getPreferredFabricSource(fabric);
            return (
              <tr aria-label={`查看面料${fabric.code}`} className="cursor-pointer transition hover:bg-white/34 focus:bg-white/40 focus:outline-none" key={fabric.code} onClick={() => onSelect(fabric)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(fabric); } }} tabIndex={0}>
                <td className="px-4 py-3"><div className="font-mono text-[11px] text-stone-500">{fabric.code}</div><div className="mt-1 font-semibold text-stone-950">{fabric.name}</div><div className="mt-0.5 truncate text-xs text-stone-500">{fabric.englishName}</div></td>
                <td className="px-4 py-3"><div className="font-medium text-stone-900">{fabricTypeLabels[fabric.type]}</div><div className="mt-1 text-xs text-stone-500">按{pricingUnitLabels[fabric.pricingUnit]}计价</div></td>
                <td className="px-4 py-3 leading-5 text-stone-700">{fabric.composition}</td>
                <td className="px-4 py-3 text-xs leading-5 text-stone-700">{getFabricSpecification(fabric)}</td>
                <td className="px-4 py-3"><PreferredSource fabric={fabric} /></td>
                <td className="px-4 py-3"><div className="font-semibold text-stone-950">{preferred?.latestPurchasePrice || "待报价"}</div><div className="mt-1 text-[11px] text-stone-500">{preferred?.quoteDate || "暂无日期"}</div></td>
                <td className="px-4 py-3"><span className="inline-flex size-8 items-center justify-center rounded-xl border border-white/42 bg-white/38 text-sm font-semibold text-stone-800">{fabric.supplierSources.length}</span></td>
                <td className="px-4 py-3"><FabricStatusBadge status={fabric.status} /></td>
                <td className="px-4 py-3"><Completeness value={fabric.completeness} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-600">{new Date(fabric.updatedAt).toLocaleDateString("zh-CN")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FabricCards({ fabrics, onSelect }: { fabrics: FabricLibraryPrototype[]; onSelect: (fabric: FabricLibraryPrototype) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {fabrics.map((fabric) => {
        const preferred = getPreferredFabricSource(fabric);
        return (
          <button className="group overflow-hidden rounded-[18px] border border-white/26 bg-white/20 text-left shadow-[0_18px_48px_rgba(18,16,13,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-white/30" key={fabric.code} onClick={() => onSelect(fabric)} type="button">
            <div className="relative h-24" style={{ background: fabric.texture }}><div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.12)_0,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_5px)]" /><span className="absolute bottom-2 left-2 rounded-full border border-white/44 bg-white/44 px-2 py-1 text-[11px] font-medium text-stone-800 backdrop-blur-xl">{fabricTypeLabels[fabric.type]} / {pricingUnitLabels[fabric.pricingUnit]}</span></div>
            <div className="p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-mono text-[11px] text-stone-500">{fabric.code}</div><div className="mt-1 truncate font-semibold text-stone-950">{fabric.name}</div><div className="mt-0.5 truncate text-xs text-stone-500">{fabric.englishName}</div></div><FabricStatusBadge status={fabric.status} /></div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/32 pt-3 text-xs"><div><div className="text-stone-500">成分</div><div className="mt-1 line-clamp-2 text-stone-800">{fabric.composition}</div></div><div><div className="text-stone-500">最新采购价</div><div className="mt-1 font-semibold text-stone-900">{preferred?.latestPurchasePrice || "待报价"}</div></div></div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white/28 px-2.5 py-2 text-xs text-stone-600"><span className="flex min-w-0 items-center gap-1.5"><Building2 className="size-3.5 shrink-0" /><span className="truncate">{preferred?.supplierName || "暂无货源"}</span></span><span className="shrink-0">{fabric.supplierSources.length} 个货源</span></div>
              <div className="mt-3 flex items-center justify-between"><Completeness value={fabric.completeness} />{preferred?.isPreferred ? <BadgeCheck className="size-4 text-emerald-700" /> : null}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function FabricLibraryPrototype({ onCreateFabric }: { onCreateFabric: () => void }) {
  const [view, setView] = useState<FabricLibraryView>(defaultFabricLibraryView);
  const [filters, setFilters] = useState(initialFabricLibraryFilters);
  const [selectedFabric, setSelectedFabric] = useState<FabricLibraryPrototype | null>(null);
  const filteredFabrics = useMemo(() => filterFabricLibrary(fabricLibraryPrototypes, filters), [filters]);
  const metrics = getFabricLibraryMetrics(fabricLibraryPrototypes);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
        <div className="flex items-center gap-3"><button aria-label="打开导航" className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden" type="button"><Menu className="size-4" /></button><div><div className="text-sm font-semibold text-stone-950">面料库</div><div className="text-xs text-stone-700/72">档案、结构、工艺与多供应商货源</div></div></div>
        <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800" onClick={onCreateFabric} type="button"><Plus className="size-4" />新增面料</button>
      </header>

      <section className="grid shrink-0 gap-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="面料总数" value={metrics.total} note="当前原型示例档案" icon={SwatchBook} tone="blue" />
        <MetricCard label="可销售" value={metrics.sellable} note="可用于选样与业务报价" icon={CheckCircle2} tone="emerald" />
        <MetricCard label="待完善" value={metrics.incomplete} note="需要补齐工艺或质量资料" icon={Archive} tone="amber" />
        <MetricCard label="本月新增" value={metrics.addedThisMonth} note="按建档日期统计" icon={CalendarPlus2} tone="violet" />
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-white/14 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-medium text-stone-700"><Sparkles className="size-4 text-blue-600" />面料专业档案<span className="rounded-full border border-blue-200/60 bg-blue-50/58 px-2 py-0.5 text-xs text-blue-800">静态重设计原型</span></div><h1 className="mt-2 text-2xl font-semibold text-stone-950">快速定位面料、货源与采购条件</h1></div>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-9 min-w-72 flex-1 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-3 text-xs shadow-inner shadow-white/12 2xl:min-w-80"><Search className="size-4 text-stone-500" /><input className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70" onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="搜索编号、名称、成分、供应商货号…" value={filters.query} />{filters.query ? <button aria-label="清空面料搜索" className="rounded-lg p-1 text-stone-500 hover:bg-white/46" onClick={() => setFilters((current) => ({ ...current, query: "" }))} type="button"><X className="size-3.5" /></button> : null}</label>
            <FilterSelect label="类型" options={typeOptions} value={filters.type} onChange={(type) => setFilters((current) => ({ ...current, type }))} />
            <FilterSelect label="状态" options={statusOptions} value={filters.status} onChange={(status) => setFilters((current) => ({ ...current, status }))} />
            <FilterSelect label="开发来源" options={sourceOptions} value={filters.developmentSource} onChange={(developmentSource) => setFilters((current) => ({ ...current, developmentSource }))} />
            <FilterSelect label="资料完整性" options={completenessOptions} value={filters.completeness} onChange={(completeness) => setFilters((current) => ({ ...current, completeness }))} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/44 pt-3">
          <div className="flex rounded-xl border border-white/38 bg-white/30 p-1 text-xs shadow-inner shadow-white/20">
            <button aria-label="专业表格" className={`flex h-8 items-center gap-1.5 rounded-lg px-3 transition ${view === "table" ? "bg-white/88 text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`} onClick={() => setView("table")} type="button"><TableProperties className="size-3.5" />专业表格</button>
            <button aria-label="卡片视图" className={`flex h-8 items-center gap-1.5 rounded-lg px-3 transition ${view === "cards" ? "bg-white/88 text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`} onClick={() => setView("cards")} type="button"><Grid2X2 className="size-3.5" />卡片视图</button>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-stone-600"><Filter className="size-3.5" />已筛选 {filteredFabrics.length} / {fabricLibraryPrototypes.length} 款面料</div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          {view === "table" ? <FabricTable fabrics={filteredFabrics} onSelect={setSelectedFabric} /> : <FabricCards fabrics={filteredFabrics} onSelect={setSelectedFabric} />}
          {filteredFabrics.length === 0 ? <div className="flex h-48 flex-col items-center justify-center text-sm text-stone-500"><SwatchBook className="mb-3 size-7 text-stone-400" /><span>没有符合当前条件的面料</span></div> : null}
        </div>
      </section>

      <FabricDetailDrawer fabric={selectedFabric} onClose={() => setSelectedFabric(null)} />
    </section>
  );
}
