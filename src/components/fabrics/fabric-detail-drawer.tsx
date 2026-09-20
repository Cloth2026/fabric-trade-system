"use client";

import {
  Activity,
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Factory,
  FilePenLine,
  FlaskConical,
  Layers3,
  LoaderCircle,
  Plus,
  RotateCw,
  Ruler,
  Settings2,
  ShieldAlert,
  Sparkles,
  Star,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ApiClientError,
  createLatestRequestGuard,
  fetchFabricDetail,
  getFabricSourceWriteErrorMessage,
  patchFabricSource,
  postFabricSource,
  postFabricSourceQuote,
  type FabricDetail,
  type FabricQuote,
  type FabricSupplierSource,
} from "@/lib/api/fabric-client";
import {
  fabricTypeLabels,
  formatDate,
  formatPrice,
  getConfigLabel,
  getQuoteSupplierUnitLabel,
  missingInfoLabels,
  pricingUnitLabels,
  processStatusLabels,
  supplierUnitFormLabels,
  type ConfigLabelMap,
} from "./fabric-library-prototype-data";
import {
  buildQuotePayload,
  buildSourcePayload,
  buildSourceUpdatePayload,
  type QuoteDraft,
  type SourceDraft,
} from "./fabric-source-maintenance-state";
import { QuoteDrawer, SourceMaintenanceDrawer } from "./fabric-source-maintenance-drawers";
import { EditFabricDrawer } from "./edit-fabric-drawer";

export type FabricDetailTab = "basic" | "suppliers" | "process";

export type FabricDetailDrawerState = {
  activeTab: FabricDetailTab;
  isClosing: boolean;
  notice: string;
  noticeTone: "success" | "error";
};

export function createInitialFabricDetailDrawerState(): FabricDetailDrawerState {
  return { activeTab: "basic", isClosing: false, notice: "", noticeTone: "success" };
}

export function startFabricDetailDrawerClose(state: FabricDetailDrawerState): FabricDetailDrawerState {
  return { ...state, isClosing: true };
}

export function getFabricDetailDrawerKey(fabricId: string | null) {
  return fabricId ?? "closed";
}

const tabs: Array<{ id: FabricDetailTab; label: string }> = [
  { id: "basic", label: "基础资料" },
  { id: "suppliers", label: "供应商与采购" },
  { id: "process", label: "工艺与质量" },
];

function DetailField({ label, value, wide = false }: { label: string; value: string | null | undefined; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 break-words text-sm leading-6 text-stone-900">{value || "待补充"}</div>
    </div>
  );
}

function DetailSection({ icon: Icon, title, tone, children }: { icon: typeof Layers3; title: string; tone: "blue" | "emerald" | "amber" | "violet"; children: ReactNode }) {
  const tones = {
    blue: "border-blue-300/46 bg-blue-500/12 text-blue-700",
    emerald: "border-emerald-300/46 bg-emerald-500/12 text-emerald-700",
    amber: "border-amber-300/50 bg-amber-400/16 text-amber-800",
    violet: "border-violet-300/46 bg-violet-500/12 text-violet-700",
  };
  return (
    <section className="border-b border-white/34 py-5 last:border-b-0">
      <div className="flex items-center gap-2.5"><span className={`flex size-8 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="size-4" /></span><h3 className="text-sm font-semibold text-stone-950">{title}</h3></div>
      <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function StatusBadge({ status, labels }: { status: string; labels: ConfigLabelMap }) {
  const style = status === "sellable" ? "bg-emerald-50/82 text-emerald-800" : status === "incomplete" ? "bg-amber-50/82 text-amber-800" : "bg-stone-200/76 text-stone-700";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${style}`}><CheckCircle2 className="size-3" />{getConfigLabel(labels, "fabric_status", status)}</span>;
}

function optionList(labels: ConfigLabelMap, group: string, keys: string[]) {
  return keys.length > 0 ? keys.map((key) => getConfigLabel(labels, group, key)).join(" · ") : null;
}

function BasicTab({ fabric, labels }: { fabric: FabricDetail; labels: ConfigLabelMap }) {
  const categoryGroup = fabric.fabricType === "knitted" ? "knitted_category" : "woven_category";
  return (
    <div data-testid="fabric-detail-basic">
      <DetailSection icon={Layers3} title="分类与结构" tone="blue">
        <DetailField label="面料类型" value={fabricTypeLabels[fabric.fabricType]} />
        <DetailField label="计价单位" value={pricingUnitLabels[fabric.pricingUnit]} />
        <DetailField label="细分类" value={getConfigLabel(labels, categoryGroup, fabric.category)} />
        <DetailField label="组织结构" value={getConfigLabel(labels, "fabric_structure", fabric.structure)} />
        <DetailField label="弹力等级" value={getConfigLabel(labels, "elasticity_level", fabric.elasticity)} />
      </DetailSection>
      <DetailSection icon={Ruler} title="成分与规格" tone="emerald">
        <DetailField label="成分" value={fabric.composition} wide />
        <DetailField label="克重" value={fabric.weight} />
        <DetailField label="门幅" value={fabric.width} />
        <DetailField label="纱支" value={fabric.yarnCount} />
        <DetailField label="经纬密" value={fabric.warpWeftDensity} />
      </DetailSection>
      <DetailSection icon={Tag} title="来源与用途" tone="violet">
        <DetailField label="开发来源" value={getConfigLabel(labels, "development_source", fabric.developmentSource)} />
        <DetailField label="复购状态" value={getConfigLabel(labels, "repurchase_status", fabric.repurchaseStatus)} />
        <DetailField label="来源联系人" value={fabric.sourceContact} />
        <DetailField label="来源日期" value={fabric.sourceDate ? formatDate(fabric.sourceDate) : null} />
        <DetailField label="成品参考价" value={fabric.finishedReferencePrice ? formatPrice(fabric.finishedReferencePrice, "CNY", fabric.pricingUnit) : null} />
        <DetailField label="纸管重量" value={fabric.tubeWeight} />
        <DetailField label="空差" value={fabric.tolerance} />
        <DetailField label="用途" value={optionList(labels, "fabric_usage", fabric.usageOptionKeys)} wide />
        <DetailField label="适用季节" value={optionList(labels, "fabric_season", fabric.seasonOptionKeys)} />
        <DetailField label="认证标准" value={optionList(labels, "fabric_certification", fabric.certificationOptionKeys)} />
        <DetailField label="标签" value={fabric.tags.length > 0 ? fabric.tags.join(" · ") : null} wide />
        <DetailField label="档案备注" value={fabric.remarks} wide />
      </DetailSection>
    </div>
  );
}

function QuoteCard({ quote, latest }: { quote: FabricQuote; latest: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${latest ? "border-blue-200/70 bg-blue-50/48" : "border-white/36 bg-white/24"}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[11px] font-medium text-stone-500">
          {latest ? "最新报价" : formatDate(quote.quoteDate)}
        </span>
        <span className="text-sm font-semibold text-stone-950">{formatPrice(quote.purchasePrice, quote.currency, quote.pricingUnit)}</span>
      </div>
      <div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2">
        <DetailField label="报价日期" value={formatDate(quote.quoteDate)} />
        <DetailField label="报价对应生产单元" value={getQuoteSupplierUnitLabel(quote)} />
        <DetailField label="MOQ" value={quote.minimumOrderQty} />
        <DetailField label="交期" value={quote.leadTime} />
        <DetailField label="联系人" value={quote.contactName} />
        <DetailField label="质量差异" value={quote.qualityDifferences} />
        <DetailField label="报价备注" value={quote.remarks} wide />
      </div>
    </div>
  );
}

function SupplierSourceCard({
  source,
  labels,
  expanded,
  onToggle,
  onAddQuote,
  onEditSource,
  onSetPreferred,
}: {
  source: FabricSupplierSource;
  labels: ConfigLabelMap;
  expanded: boolean;
  onToggle: () => void;
  onAddQuote: () => void;
  onEditSource: () => void;
  onSetPreferred: () => void;
}) {
  const latestQuote = source.quotes[0];
  const historicalQuotes = source.quotes.slice(1);
  return (
    <article className="rounded-[18px] border border-white/34 bg-white/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2"><Building2 className="size-4 shrink-0 text-blue-700" /><h3 className="truncate text-sm font-semibold text-stone-950">{source.supplier.name}</h3></div><div className="mt-2 flex items-center gap-1.5 text-xs text-stone-600"><Factory className="size-3.5" />{source.supplierUnit ? `${source.supplierUnit.name} · ${supplierUnitFormLabels[source.supplierUnit.unitForm] ?? source.supplierUnit.unitForm}` : "当前未指定生产单元"}</div></div>
        {source.isPreferred ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/76 px-2 py-1 text-[11px] text-emerald-800"><BadgeCheck className="size-3" />首选货源</span> : null}
      </div>
      <div className="mt-4 grid gap-x-4 gap-y-3 border-t border-white/36 pt-4 sm:grid-cols-2">
        <DetailField label="供应商货号" value={source.supplierFabricCode} />
        <DetailField label="供应商状态" value={source.supplier.status === "active" ? "启用" : "停用"} />
        <DetailField label="供应商样品状态" value={getConfigLabel(labels, "sample_status", source.sampleStatus)} />
        <DetailField label="质量差异" value={source.qualityDifferences} />
        <DetailField label="货源备注" value={source.remarks} wide />
      </div>
      <div className="mt-4 space-y-2 border-t border-white/36 pt-4">
        {latestQuote ? <QuoteCard quote={latestQuote} latest /> : <div className="rounded-xl border border-dashed border-white/46 bg-white/18 px-3 py-4 text-center text-xs text-stone-500">该货源暂无采购报价</div>}
        {historicalQuotes.length > 0 ? <button aria-expanded={expanded} className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-white/36 bg-white/26 text-xs text-stone-700 transition hover:bg-white/48" onClick={onToggle} type="button"><ChevronDown className={`size-3.5 transition ${expanded ? "rotate-180" : ""}`} />{expanded ? "收起历史报价" : `展开其余 ${historicalQuotes.length} 条历史报价`}</button> : null}
        {expanded ? historicalQuotes.map((quote) => <QuoteCard key={quote.id} quote={quote} latest={false} />) : null}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-2 text-xs text-white transition hover:bg-stone-800" onClick={onAddQuote} type="button"><CircleDollarSign className="size-3.5" />新增报价</button>
        <button className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/38 bg-white/34 px-2 text-xs text-stone-800 transition hover:bg-white/58" onClick={onEditSource} type="button"><Settings2 className="size-3.5" />维护货源</button>
        {source.isPreferred ? <span className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-emerald-200/56 bg-emerald-50/56 px-2 text-xs text-emerald-800"><BadgeCheck className="size-3.5" />首选货源</span> : <button className="flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/38 bg-white/34 px-2 text-xs text-stone-800 transition hover:bg-white/58" onClick={onSetPreferred} type="button"><Star className="size-3.5" />设为首选</button>}
      </div>
    </article>
  );
}

function SupplierTab({
  sources,
  labels,
  expandedSourceIds,
  onToggleSource,
  onAddQuote,
  onEditSource,
  onSetPreferred,
}: {
  sources: FabricSupplierSource[];
  labels: ConfigLabelMap;
  expandedSourceIds: Set<string>;
  onToggleSource: (id: string) => void;
  onAddQuote: (id: string) => void;
  onEditSource: (id: string) => void;
  onSetPreferred: (id: string) => void;
}) {
  return (
    <div className="space-y-3 py-5" data-testid="fabric-detail-suppliers">
      <div className="flex items-center justify-between text-xs text-stone-500"><span>全部供应商货源与独立报价历史</span><span>{sources.length} 个货源</span></div>
      {sources.map((source) => <SupplierSourceCard key={source.id} source={source} labels={labels} expanded={expandedSourceIds.has(source.id)} onToggle={() => onToggleSource(source.id)} onAddQuote={() => onAddQuote(source.id)} onEditSource={() => onEditSource(source.id)} onSetPreferred={() => onSetPreferred(source.id)} />)}
      {sources.length === 0 ? <div className="rounded-[18px] border border-dashed border-white/46 bg-white/18 px-4 py-10 text-center text-sm text-stone-500">尚未建立供应商货源，可点击底部“添加货源”创建。</div> : null}
    </div>
  );
}

function ProcessTab({ fabric, labels }: { fabric: FabricDetail; labels: ConfigLabelMap }) {
  return (
    <div data-testid="fabric-detail-process">
      <DetailSection icon={Layers3} title="坯布信息" tone="blue">
        <DetailField label="资料状态" value={processStatusLabels[fabric.greigeStatus]} />
        <DetailField label="坯布供应商" value={fabric.greige?.supplier?.name} />
        <DetailField label="坯布编号" value={fabric.greige?.code} />
        <DetailField label="坯布名称" value={fabric.greige?.name} />
        <DetailField label="成分" value={fabric.greige?.composition} />
        <DetailField label="克重 / 门幅" value={fabric.greige ? [fabric.greige.weight, fabric.greige.width].filter(Boolean).join(" · ") : null} />
        <DetailField label="纱支或经纬密" value={fabric.greige?.yarnOrDensity} />
        <DetailField label="坯布单价" value={fabric.greige?.unitPrice ? `¥${fabric.greige.unitPrice}` : null} />
        <DetailField label="损耗" value={fabric.greige?.lossRate} />
        <DetailField label="备注" value={fabric.greige?.remarks} wide />
      </DetailSection>
      <DetailSection icon={FlaskConical} title="染整信息" tone="violet">
        <DetailField label="资料状态" value={processStatusLabels[fabric.dyeingStatus]} />
        <DetailField label="工艺类型" value={getConfigLabel(labels, "dyeing_process_type", fabric.dyeingFinishing?.processType)} />
        <DetailField label="染整厂" value={fabric.dyeingFinishing?.factory?.name} />
        <DetailField label="加工单价" value={fabric.dyeingFinishing?.unitPrice ? `¥${fabric.dyeingFinishing.unitPrice}` : null} />
        <DetailField label="损耗" value={fabric.dyeingFinishing?.lossRate} />
        <DetailField label="交期" value={fabric.dyeingFinishing?.leadTime} />
        <DetailField label="注意事项" value={fabric.dyeingFinishing?.cautions} wide />
      </DetailSection>
      <DetailSection icon={Sparkles} title="后工艺信息" tone="amber">
        <DetailField label="资料状态" value={processStatusLabels[fabric.postProcessStatus]} />
        <DetailField label="工艺数量" value={fabric.postProcesses.length ? `${fabric.postProcesses.length} 项` : null} />
        {fabric.postProcesses.map((process, index) => <div className="rounded-xl border border-white/36 bg-white/22 p-3 sm:col-span-2" key={process.id}><div className="text-xs font-medium text-stone-900">{index + 1}. {getConfigLabel(labels, "post_process_type", process.processType)}</div><div className="mt-2 grid gap-2 text-xs text-stone-600 sm:grid-cols-2"><span>工厂：{process.factory?.name || "待补充"}</span><span>单价：{process.unitPrice ? `¥${process.unitPrice}` : "待补充"}</span><span>效果：{process.effectDescription || "待补充"}</span><span>交期：{process.leadTime || "待补充"}</span><span className="sm:col-span-2">风险：{process.riskNotes || "暂无"}</span></div></div>)}
      </DetailSection>
      <DetailSection icon={ClipboardCheck} title="质量记录" tone="emerald">
        <DetailField label="检验结论" value={getConfigLabel(labels, "inspection_conclusion", fabric.inspectionConclusion)} />
        <DetailField label="色牢度" value={fabric.colorFastness} />
        <DetailField label="起球" value={fabric.pilling} />
        <DetailField label="手感" value={fabric.handFeel} />
        <DetailField label="质量备注" value={fabric.remarks} wide />
      </DetailSection>
    </div>
  );
}

type SourceMaintenanceDialog =
  | { type: "add-source" }
  | { type: "edit-source"; sourceId: string }
  | { type: "add-quote"; sourceId: string }
  | { type: "edit-fabric" };

export function FabricDetailDrawer({ fabricId, labels, onClose }: { fabricId: string | null; labels: ConfigLabelMap; onClose: () => void }) {
  const [drawerState, setDrawerState] = useState<FabricDetailDrawerState>(createInitialFabricDetailDrawerState);
  const [fabric, setFabric] = useState<FabricDetail | null>(null);
  const [sources, setSources] = useState<FabricSupplierSource[]>([]);
  const [dialog, setDialog] = useState<SourceMaintenanceDialog | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "not-found">("loading");
  const [retryToken, setRetryToken] = useState(0);
  const [expandedSourceIds, setExpandedSourceIds] = useState<Set<string>>(new Set());
  const noticeTimer = useRef<number | null>(null);
  const requestGuard = useRef(createLatestRequestGuard());

  useEffect(() => {
    if (!fabricId) return;
    const controller = new AbortController();
    const guard = requestGuard.current;
    const requestId = guard.begin();

    fetchFabricDetail(fabricId, controller.signal)
      .then((detail) => {
        if (!guard.isLatest(requestId)) return;
        setFabric(detail);
        setSources(detail.supplierSources);
        setLoadState("ready");
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError" || !guard.isLatest(requestId)) return;
        setLoadState(error instanceof ApiClientError && error.status === 404 ? "not-found" : "error");
      });

    return () => {
      controller.abort();
      if (guard.isLatest(requestId)) guard.invalidate();
    };
  }, [fabricId, retryToken]);

  useEffect(() => {
    if (!drawerState.isClosing) return;
    const timer = window.setTimeout(() => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = null;
      setDrawerState(createInitialFabricDetailDrawerState());
      onClose();
    }, 200);
    return () => window.clearTimeout(timer);
  }, [drawerState.isClosing, onClose]);

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  if (!fabricId) return null;

const beginClose = () => setDrawerState(startFabricDetailDrawerClose);
const showNotice = (message: string, tone: "success" | "error") => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setDrawerState((current) => ({ ...current, notice: message, noticeTone: tone }));
    noticeTimer.current = window.setTimeout(() => {
      setDrawerState((current) => ({ ...current, notice: "", noticeTone: "success" }));
      noticeTimer.current = null;
    }, 3200);
  };
  const toggleSource = (sourceId: string) => setExpandedSourceIds((current) => {
    const next = new Set(current);
    if (next.has(sourceId)) next.delete(sourceId); else next.add(sourceId);
    return next;
  });
  const retryDetail = () => {
    setDrawerState(createInitialFabricDetailDrawerState());
    setExpandedSourceIds(new Set());
    setFabric(null);
    setSources([]);
    setDialog(null);
    setLoadState("loading");
    setRetryToken((current) => current + 1);
  };

  const applyFabricDetail = (detail: FabricDetail) => {
    setFabric(detail);
    setSources(detail.supplierSources);
  };

  const submitAddSource = async (draft: SourceDraft) => {
    if (!fabric) return;
    const detail = await postFabricSource(fabric.id, buildSourcePayload(draft));
    applyFabricDetail(detail);
    setDialog(null);
    showNotice(`已添加货源「${draft.supplierName}」`, "success");
  };

  const submitEditSource = async (sourceId: string, draft: SourceDraft) => {
    if (!fabric) return;
    const detail = await patchFabricSource(fabric.id, sourceId, buildSourceUpdatePayload(draft));
    applyFabricDetail(detail);
    setDialog(null);
    showNotice(`已更新货源「${draft.supplierName}」`, "success");
  };

  const submitAddQuote = async (sourceId: string, draft: QuoteDraft) => {
    if (!fabric) return;
    const target = sources.find((source) => source.id === sourceId);
    const detail = await postFabricSourceQuote(fabric.id, sourceId, buildQuotePayload(draft));
    applyFabricDetail(detail);
    setDialog(null);
    showNotice(`已新增报价至「${target?.supplier.name ?? "货源"}」`, "success");
  };

  const handleSetPreferred = async (sourceId: string) => {
    if (!fabric) return;
    const target = sources.find((source) => source.id === sourceId);
    try {
      const detail = await patchFabricSource(fabric.id, sourceId, { isPreferred: true });
      applyFabricDetail(detail);
      showNotice(`已将「${target?.supplier.name ?? "该货源"}」设为首选`, "success");
    } catch (error) {
      showNotice(getFabricSourceWriteErrorMessage(error), "error");
    }
  };

  return (
    <>
      <button aria-label="关闭面料详情遮罩" className={`fixed inset-0 z-30 bg-stone-950/10 backdrop-blur-[2px] ${drawerState.isClosing ? "fabric-create-backdrop-exit" : "fabric-create-backdrop-enter"}`} onClick={beginClose} type="button" />
      <aside className={`fixed bottom-2 right-2 top-2 z-40 flex w-[calc(100%-1rem)] flex-col overflow-hidden rounded-[22px] border border-white/40 bg-white/54 shadow-[0_34px_110px_rgba(20,18,15,0.34),inset_0_1px_0_rgba(255,255,255,0.30)] backdrop-blur-3xl sm:w-[560px] ${drawerState.isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`} data-testid="fabric-detail-drawer">
        <header className="shrink-0 border-b border-white/30 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2 text-xs font-medium text-blue-700"><Activity className="size-4" />{fabric?.code || "正在读取面料详情"}<span className="rounded-full border border-emerald-200/60 bg-emerald-50/58 px-2 py-0.5 text-[11px] text-emerald-800">实时数据</span></div><h2 className="mt-2 text-xl font-semibold text-stone-950">{fabric?.name || "面料档案"}</h2><p className="mt-1 truncate text-sm text-stone-600">{fabric?.englishName || (fabric ? "暂无英文名称" : "请稍候…")}</p></div><button aria-label="关闭面料详情" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/34 bg-white/28 text-stone-700 transition hover:bg-white/52" onClick={beginClose} type="button"><X className="size-4" /></button></div>
          {fabric ? <><div className="mt-4 flex flex-wrap items-center gap-2"><span className="rounded-full border border-blue-200/60 bg-blue-50/68 px-2.5 py-1 text-xs text-blue-800">{fabricTypeLabels[fabric.fabricType]} / {pricingUnitLabels[fabric.pricingUnit]}</span><StatusBadge status={fabric.status} labels={labels} /><span className="rounded-full border border-white/42 bg-white/40 px-2.5 py-1 text-xs text-stone-700">完整度 {fabric.completenessPercent}%</span></div><div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/48 bg-amber-50/52 px-3 py-2 text-xs leading-5 text-amber-900"><ShieldAlert className="mt-0.5 size-3.5 shrink-0" /><span>缺失信息：{fabric.missingInfoFlags.length ? fabric.missingInfoFlags.map((flag) => missingInfoLabels[flag] ?? flag).join("、") : "无"}</span></div></> : null}
        </header>

        {fabric ? <div className="shrink-0 border-b border-white/30 bg-white/16 px-4 py-2"><div className="grid grid-cols-3 rounded-xl border border-white/38 bg-white/28 p-1">{tabs.map((tab) => <button aria-selected={drawerState.activeTab === tab.id} className={`h-9 rounded-lg text-xs font-medium transition ${drawerState.activeTab === tab.id ? "bg-white/88 text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`} key={tab.id} onClick={() => setDrawerState((current) => ({ ...current, activeTab: tab.id }))} role="tab" type="button">{tab.label}</button>)}</div></div> : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {loadState === "loading" ? <div className="flex h-full min-h-56 flex-col items-center justify-center text-sm text-stone-600"><LoaderCircle className="mb-3 size-7 animate-spin text-blue-700" />正在加载真实面料详情…</div> : null}
          {loadState === "error" || loadState === "not-found" ? <div className="flex h-full min-h-56 flex-col items-center justify-center text-center text-sm text-stone-600"><AlertCircle className="mb-3 size-7 text-amber-700" /><div className="font-medium text-stone-900">{loadState === "not-found" ? "该面料不存在或已不可访问" : "面料详情加载失败"}</div><button className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-white/42 bg-white/40 px-3 text-xs" onClick={retryDetail} type="button"><RotateCw className="size-3.5" />重试</button></div> : null}
          {fabric && drawerState.activeTab === "basic" ? <BasicTab fabric={fabric} labels={labels} /> : null}
          {fabric && drawerState.activeTab === "suppliers" ? <SupplierTab sources={sources} labels={labels} expandedSourceIds={expandedSourceIds} onToggleSource={toggleSource} onAddQuote={(sourceId) => setDialog({ type: "add-quote", sourceId })} onEditSource={(sourceId) => setDialog({ type: "edit-source", sourceId })} onSetPreferred={handleSetPreferred} /> : null}
          {fabric && drawerState.activeTab === "process" ? <ProcessTab fabric={fabric} labels={labels} /> : null}
        </div>

        {fabric ? <footer className="shrink-0 border-t border-white/30 bg-white/26 p-4 backdrop-blur-2xl">{drawerState.notice ? <div className={`mb-3 rounded-xl border px-3 py-2 text-xs ${drawerState.noticeTone === "error" ? "border-red-200/60 bg-red-50/60 text-red-800" : "border-blue-200/60 bg-blue-50/70 text-blue-800"}`}>{drawerState.notice}</div> : null}<div className="grid grid-cols-2 gap-2"><button className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/38 bg-white/34 px-2 text-xs text-stone-800 transition hover:bg-white/58" onClick={() => setDialog({ type: "edit-fabric" })} type="button"><FilePenLine className="size-4" />编辑面料</button><button className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-2 text-xs text-white transition hover:bg-stone-800" onClick={() => setDialog({ type: "add-source" })} type="button"><Plus className="size-4" />添加货源</button></div></footer> : null}
      </aside>

      {fabric && dialog?.type === "add-source" ? (
        <SourceMaintenanceDrawer mode="create" fabric={fabric} existingSources={sources} labels={labels} onClose={() => setDialog(null)} onSubmit={submitAddSource} />
      ) : null}
      {fabric && dialog?.type === "edit-source" ? (() => {
        const target = sources.find((source) => source.id === dialog.sourceId);
        return target ? (
          <SourceMaintenanceDrawer mode="edit" fabric={fabric} source={target} existingSources={sources} labels={labels} onClose={() => setDialog(null)} onSubmit={(draft) => submitEditSource(target.id, draft)} />
        ) : null;
      })() : null}
      {fabric && dialog?.type === "add-quote" ? (() => {
        const target = sources.find((source) => source.id === dialog.sourceId);
        return target ? (
          <QuoteDrawer fabric={fabric} source={target} onClose={() => setDialog(null)} onSubmit={(draft) => submitAddQuote(target.id, draft)} />
        ) : null;
      })() : null}
      {fabric && dialog?.type === "edit-fabric" ? (
        <EditFabricDrawer
          fabric={fabric}
          key={fabric.id}
          onClose={() => setDialog(null)}
          onSaved={(updated) => {
            setFabric(updated);
            setDialog(null);
            showNotice(`已保存 ${updated.code} · ${updated.name}`, "success");
          }}
        />
      ) : null}
    </>
  );
}
