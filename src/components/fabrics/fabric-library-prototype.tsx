"use client";

import {
  AlertCircle,
  Archive,
  BadgeCheck,
  Building2,
  CalendarPlus2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Factory,
  Filter,
  Grid2X2,
  LoaderCircle,
  Menu,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  SwatchBook,
  TableProperties,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createLatestRequestGuard,
  fetchConfigOptions,
  fetchFabrics,
  type ConfigOption,
  type FabricListItem,
  type FabricListResponse,
} from "@/lib/api/fabric-client";
import { FabricDetailDrawer, getFabricDetailDrawerKey } from "./fabric-detail-drawer";
import {
  buildFabricListRequest,
  createConfigLabelMap,
  defaultFabricLibraryView,
  developmentSourceLabels,
  fabricStatusLabels,
  formatDate,
  getFabricLibraryMetrics,
  getFabricTexture,
  initialFabricLibraryFilters,
  toFabricListDisplayData,
} from "./fabric-library-prototype-data";
import type { FabricLibraryFilters } from "./fabric-library-prototype-data";

type FabricLibraryView = "table" | "cards";
type LoadState = "loading" | "refreshing" | "ready" | "error";

const LABEL_GROUPS = [
  "development_source",
  "fabric_status",
  "knitted_category",
  "woven_category",
  "fabric_structure",
  "elasticity_level",
  "repurchase_status",
  "dyeing_process_type",
  "post_process_type",
  "inspection_conclusion",
  "fabric_usage",
  "fabric_season",
  "fabric_certification",
  "sample_status",
];

const typeOptions = [
  { value: "all", label: "全部" },
  { value: "knitted", label: "针织" },
  { value: "woven", label: "梭织" },
] as const;
const completenessOptions = [
  { value: "all", label: "全部" },
  { value: "complete", label: "完整度 ≥ 85%" },
  { value: "needs_attention", label: "需要补全" },
] as const;

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

function FilterSelect<T extends string>({ label, options, value, onChange }: { label: string; options: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (value: T) => void }) {
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

function FabricStatusBadge({ status, label }: { status: string; label: string }) {
  const style = status === "sellable" ? "bg-emerald-50/82 text-emerald-800" : status === "incomplete" ? "bg-amber-50/82 text-amber-800" : "bg-stone-200/76 text-stone-700";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${style}`}>{status === "sellable" ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}{label}</span>;
}

function Completeness({ value }: { value: number }) {
  return (
    <div className="flex w-28 items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-white/56"><div className={`h-1.5 rounded-full ${value >= 85 ? "bg-emerald-700/76" : "bg-amber-600/78"}`} style={{ width: `${value}%` }} /></div>
      <span className="text-xs text-stone-600">{value}%</span>
    </div>
  );
}

function PreferredSource({ fabric }: { fabric: FabricListItem }) {
  const source = fabric.preferredSupplierSource;
  if (!source) return <span className="text-xs text-stone-500">尚未建立货源</span>;
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 font-medium text-stone-900"><Building2 className="size-3.5 shrink-0 text-blue-700" /><span className="truncate">{source.supplierName}</span></div>
      <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500"><Factory className="size-3 shrink-0" /><span className="truncate">{source.supplierUnitName || "未指定生产单元"}</span></div>
      {fabric.supplierSourceCount > 1 ? <div className="mt-1 text-[11px] text-blue-700">另有 {fabric.supplierSourceCount - 1} 个货源</div> : null}
    </div>
  );
}

function FabricTable({ fabrics, statusLabels, onSelect }: { fabrics: FabricListItem[]; statusLabels: Record<string, string>; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-white/26 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl" data-testid="fabric-professional-table">
      <table className="w-full min-w-[1480px] table-fixed border-collapse text-left text-sm">
        <colgroup><col className="w-[250px]" /><col className="w-[110px]" /><col className="w-[170px]" /><col className="w-[190px]" /><col className="w-[240px]" /><col className="w-[130px]" /><col className="w-[90px]" /><col className="w-[100px]" /><col className="w-[120px]" /><col className="w-[120px]" /></colgroup>
        <thead className="sticky top-0 z-10 bg-white/64 text-xs text-stone-700 backdrop-blur-2xl"><tr>{["面料", "类型 / 计价", "成分", "规格", "首选货源", "最新采购价", "货源数量", "资料状态", "完整度", "更新时间"].map((header) => <th className="px-4 py-3 font-medium" key={header}>{header}</th>)}</tr></thead>
        <tbody className="divide-y divide-white/26">
          {fabrics.map((fabric) => {
            const display = toFabricListDisplayData(fabric, { fabric_status: statusLabels });
            return (
              <tr aria-label={`查看面料${fabric.code}`} className="cursor-pointer transition hover:bg-white/34 focus:bg-white/40 focus:outline-none" key={fabric.id} onClick={() => onSelect(fabric.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(fabric.id); } }} tabIndex={0}>
                <td className="px-4 py-3"><div className="font-mono text-[11px] text-stone-500">{fabric.code}</div><div className="mt-1 font-semibold text-stone-950">{fabric.name}</div><div className="mt-0.5 truncate text-xs text-stone-500">{fabric.englishName || "暂无英文名称"}</div></td>
                <td className="px-4 py-3"><div className="font-medium text-stone-900">{display.typeLabel}</div><div className="mt-1 text-xs text-stone-500">按{display.pricingUnitLabel}计价</div></td>
                <td className="px-4 py-3 leading-5 text-stone-700">{fabric.composition || "待补充"}</td>
                <td className="px-4 py-3 text-xs leading-5 text-stone-700">{display.specification}</td>
                <td className="px-4 py-3"><PreferredSource fabric={fabric} /></td>
                <td className="px-4 py-3"><div className="font-semibold text-stone-950">{display.latestPrice}</div><div className="mt-1 text-[11px] text-stone-500">{display.latestQuoteDate}</div></td>
                <td className="px-4 py-3"><span className="inline-flex size-8 items-center justify-center rounded-xl border border-white/42 bg-white/38 text-sm font-semibold text-stone-800">{fabric.supplierSourceCount}</span></td>
                <td className="px-4 py-3"><FabricStatusBadge status={fabric.status} label={display.statusLabel} /></td>
                <td className="px-4 py-3"><Completeness value={fabric.completenessPercent} /></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-600">{formatDate(fabric.updatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FabricCards({ fabrics, statusLabels, onSelect }: { fabrics: FabricListItem[]; statusLabels: Record<string, string>; onSelect: (id: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {fabrics.map((fabric) => {
        const source = fabric.preferredSupplierSource;
        const display = toFabricListDisplayData(fabric, { fabric_status: statusLabels });
        return (
          <button className="group overflow-hidden rounded-[18px] border border-white/26 bg-white/20 text-left shadow-[0_18px_48px_rgba(18,16,13,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:-translate-y-0.5 hover:bg-white/30" key={fabric.id} onClick={() => onSelect(fabric.id)} type="button">
            <div className="relative h-24" style={{ background: getFabricTexture(fabric) }}><div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.12)_0,rgba(255,255,255,0.12)_1px,transparent_1px,transparent_5px)]" /><span className="absolute bottom-2 left-2 rounded-full border border-white/44 bg-white/44 px-2 py-1 text-[11px] font-medium text-stone-800 backdrop-blur-xl">{display.typeLabel} / {display.pricingUnitLabel}</span></div>
            <div className="p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-mono text-[11px] text-stone-500">{fabric.code}</div><div className="mt-1 truncate font-semibold text-stone-950">{fabric.name}</div><div className="mt-0.5 truncate text-xs text-stone-500">{fabric.englishName || "暂无英文名称"}</div></div><FabricStatusBadge status={fabric.status} label={display.statusLabel} /></div>
              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/32 pt-3 text-xs"><div><div className="text-stone-500">成分</div><div className="mt-1 line-clamp-2 text-stone-800">{fabric.composition || "待补充"}</div></div><div><div className="text-stone-500">最新采购价</div><div className="mt-1 font-semibold text-stone-900">{display.latestPrice}</div></div></div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-white/28 px-2.5 py-2 text-xs text-stone-600"><span className="flex min-w-0 items-center gap-1.5"><Building2 className="size-3.5 shrink-0" /><span className="truncate">{source?.supplierName || "暂无货源"}</span></span><span className="shrink-0">{fabric.supplierSourceCount} 个货源</span></div>
              <div className="mt-3 flex items-center justify-between"><Completeness value={fabric.completenessPercent} />{source ? <BadgeCheck className="size-4 text-emerald-700" /> : null}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function optionsForGroup(options: ConfigOption[], group: string, fallback: Record<string, string>) {
  const configured = options.filter((option) => option.group === group);
  const source = configured.length > 0
    ? configured.map(({ key, label }) => ({ value: key, label }))
    : Object.entries(fallback).map(([value, label]) => ({ value, label }));
  return [{ value: "all", label: "全部" }, ...source];
}

export function FabricLibraryPrototype({ onCreateFabric, refreshToken = 0 }: { onCreateFabric: () => void; refreshToken?: number }) {
  const [view, setView] = useState<FabricLibraryView>(defaultFabricLibraryView);
  const [filters, setFilters] = useState<FabricLibraryFilters>(initialFabricLibraryFilters);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<FabricListResponse | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState("");
  const [retryToken, setRetryToken] = useState(0);
  const [selectedFabricId, setSelectedFabricId] = useState<string | null>(null);
  const [configOptions, setConfigOptions] = useState<ConfigOption[]>([]);
  const requestGuard = useRef(createLatestRequestGuard());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setDebouncedQuery(filters.query.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [filters.query]);

  useEffect(() => {
    const controller = new AbortController();
    fetchConfigOptions(LABEL_GROUPS, controller.signal).then(setConfigOptions).catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const guard = requestGuard.current;
    const requestId = guard.begin();
    Promise.resolve().then(() => {
      if (!guard.isLatest(requestId)) return;
      setLoadError("");
      setLoadState((current) => current === "ready" || current === "refreshing" ? "refreshing" : "loading");
    });

    fetchFabrics(buildFabricListRequest({
      query: "",
      type: filters.type,
      status: filters.status,
      developmentSource: filters.developmentSource,
      completeness: filters.completeness,
    }, debouncedQuery, page), controller.signal)
      .then((nextResult) => {
        if (!guard.isLatest(requestId)) return;
        if (nextResult.pagination.totalPages > 0 && page > nextResult.pagination.totalPages) {
          setPage(nextResult.pagination.totalPages);
          return;
        }
        setResult(nextResult);
        setLoadState("ready");
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError" || !guard.isLatest(requestId)) return;
        setLoadError("面料数据加载失败，请检查服务后重试。");
        setLoadState("error");
      });

    return () => {
      controller.abort();
      if (guard.isLatest(requestId)) guard.invalidate();
    };
  }, [debouncedQuery, filters.completeness, filters.developmentSource, filters.status, filters.type, page, refreshToken, retryToken]);

  const labelMap = useMemo(() => createConfigLabelMap(configOptions), [configOptions]);
  const statusOptions = useMemo(() => optionsForGroup(configOptions, "fabric_status", fabricStatusLabels), [configOptions]);
  const sourceOptions = useMemo(() => optionsForGroup(configOptions, "development_source", developmentSourceLabels), [configOptions]);
  const fabrics = result?.data ?? [];
  const metrics = getFabricLibraryMetrics(fabrics, result?.pagination.total ?? 0);
  const hasFilters = Boolean(debouncedQuery) || filters.type !== "all" || filters.status !== "all" || filters.developmentSource !== "all" || filters.completeness !== "all";
  const closeFabricDetail = useCallback(() => setSelectedFabricId(null), []);
  const changeFilter = <K extends keyof FabricLibraryFilters>(key: K, value: FabricLibraryFilters[K]) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
        <div className="flex items-center gap-3"><button aria-label="打开导航" className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden" type="button"><Menu className="size-4" /></button><div><div className="text-sm font-semibold text-stone-950">面料库</div><div className="text-xs text-stone-700/72">档案、结构、工艺与多供应商货源</div></div></div>
        <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800" onClick={onCreateFabric} type="button"><Plus className="size-4" />新增面料</button>
      </header>

      <section className="grid shrink-0 gap-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="面料总数" value={metrics.total} note="数据库真实档案" icon={SwatchBook} tone="blue" />
        <MetricCard label="可销售" value={metrics.sellable} note="当前页可销售面料" icon={CheckCircle2} tone="emerald" />
        <MetricCard label="待完善" value={metrics.incomplete} note="当前页待完善资料" icon={Archive} tone="amber" />
        <MetricCard label="本月新增" value={metrics.addedThisMonth} note="当前页本月建档" icon={CalendarPlus2} tone="violet" />
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-white/14 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div><div className="flex items-center gap-2 text-sm font-medium text-stone-700"><Sparkles className="size-4 text-blue-600" />面料专业档案<span className="rounded-full border border-emerald-200/60 bg-emerald-50/58 px-2 py-0.5 text-xs text-emerald-800">实时数据</span></div><h1 className="mt-2 text-2xl font-semibold text-stone-950">快速定位面料、货源与采购条件</h1></div>
          <div className="flex flex-wrap gap-2">
            <label className="flex h-9 min-w-72 flex-1 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-3 text-xs shadow-inner shadow-white/12 2xl:min-w-80"><Search className="size-4 text-stone-500" /><input className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70" onChange={(event) => changeFilter("query", event.target.value)} placeholder="搜索编号、名称、成分、供应商货号…" value={filters.query} />{filters.query ? <button aria-label="清空面料搜索" className="rounded-lg p-1 text-stone-500 hover:bg-white/46" onClick={() => changeFilter("query", "")} type="button"><X className="size-3.5" /></button> : null}</label>
            <FilterSelect label="类型" options={typeOptions} value={filters.type} onChange={(value) => changeFilter("type", value)} />
            <FilterSelect label="状态" options={statusOptions} value={filters.status} onChange={(value) => changeFilter("status", value)} />
            <FilterSelect label="开发来源" options={sourceOptions} value={filters.developmentSource} onChange={(value) => changeFilter("developmentSource", value)} />
            <FilterSelect label="资料完整性" options={completenessOptions} value={filters.completeness} onChange={(value) => changeFilter("completeness", value)} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/44 pt-3">
          <div className="flex rounded-xl border border-white/38 bg-white/30 p-1 text-xs shadow-inner shadow-white/20">
            <button aria-label="专业表格" className={`flex h-8 items-center gap-1.5 rounded-lg px-3 transition ${view === "table" ? "bg-white/88 text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`} onClick={() => setView("table")} type="button"><TableProperties className="size-3.5" />专业表格</button>
            <button aria-label="卡片视图" className={`flex h-8 items-center gap-1.5 rounded-lg px-3 transition ${view === "cards" ? "bg-white/88 text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`} onClick={() => setView("cards")} type="button"><Grid2X2 className="size-3.5" />卡片视图</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-stone-600">{loadState === "refreshing" ? <LoaderCircle className="size-3.5 animate-spin text-blue-700" /> : <Filter className="size-3.5" />}本页 {fabrics.length} 款，共 {result?.pagination.total ?? 0} 款面料</div>
        </div>

        {loadError ? <div className="mt-3 flex items-center justify-between rounded-xl border border-red-200/60 bg-red-50/58 px-3 py-2 text-xs text-red-900"><span className="flex items-center gap-2"><AlertCircle className="size-4" />{loadError}</span><button className="flex items-center gap-1.5 rounded-lg bg-white/64 px-2.5 py-1.5" onClick={() => setRetryToken((current) => current + 1)} type="button"><RotateCw className="size-3.5" />重试</button></div> : null}

        <div className={`mt-3 min-h-0 flex-1 overflow-y-auto pr-1 transition ${loadState === "refreshing" ? "opacity-55" : ""}`}>
          {loadState === "loading" ? <div className="flex h-48 flex-col items-center justify-center text-sm text-stone-600"><LoaderCircle className="mb-3 size-7 animate-spin text-blue-700" />正在读取面料档案…</div> : null}
          {loadState !== "loading" && fabrics.length > 0 ? (view === "table" ? <FabricTable fabrics={fabrics} statusLabels={labelMap.fabric_status ?? fabricStatusLabels} onSelect={setSelectedFabricId} /> : <FabricCards fabrics={fabrics} statusLabels={labelMap.fabric_status ?? fabricStatusLabels} onSelect={setSelectedFabricId} />) : null}
          {loadState !== "loading" && !loadError && fabrics.length === 0 ? <div className="flex h-48 flex-col items-center justify-center text-sm text-stone-500"><SwatchBook className="mb-3 size-7 text-stone-400" /><span>{hasFilters ? "没有符合当前筛选条件的面料" : "面料库暂无面料，点击右上角开始建档"}</span></div> : null}
        </div>

        {result && result.pagination.totalPages > 1 ? <div className="mt-3 flex shrink-0 items-center justify-end gap-2 border-t border-white/32 pt-3 text-xs text-stone-600"><button aria-label="上一页" className="flex size-8 items-center justify-center rounded-lg border border-white/38 bg-white/28 disabled:opacity-40" disabled={page <= 1 || loadState === "refreshing"} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button"><ChevronLeft className="size-4" /></button><span>第 {result.pagination.page} / {result.pagination.totalPages} 页</span><button aria-label="下一页" className="flex size-8 items-center justify-center rounded-lg border border-white/38 bg-white/28 disabled:opacity-40" disabled={page >= result.pagination.totalPages || loadState === "refreshing"} onClick={() => setPage((current) => current + 1)} type="button"><ChevronRight className="size-4" /></button></div> : null}
      </section>

      <FabricDetailDrawer fabricId={selectedFabricId} key={getFabricDetailDrawerKey(selectedFabricId)} labels={labelMap} onClose={closeFabricDetail} />
    </section>
  );
}
