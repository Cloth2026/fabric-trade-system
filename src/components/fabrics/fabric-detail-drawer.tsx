"use client";

import {
  Activity,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Factory,
  FilePenLine,
  FlaskConical,
  Layers3,
  Plus,
  Ruler,
  ShieldAlert,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  developmentSourceLabels,
  fabricStatusLabels,
  fabricTypeLabels,
  getFabricSpecification,
  pricingUnitLabels,
} from "./fabric-library-prototype-data";
import type { FabricLibraryPrototype } from "./fabric-library-prototype-data";

export type FabricDetailTab = "basic" | "suppliers" | "process";

export type FabricDetailDrawerState = {
  activeTab: FabricDetailTab;
  isClosing: boolean;
  notice: string;
};

export function createInitialFabricDetailDrawerState(): FabricDetailDrawerState {
  return { activeTab: "basic", isClosing: false, notice: "" };
}

export function startFabricDetailDrawerClose(state: FabricDetailDrawerState): FabricDetailDrawerState {
  return { ...state, isClosing: true };
}

export function getFabricDetailDrawerKey(fabric: FabricLibraryPrototype | null) {
  return fabric?.code ?? "closed";
}

const tabs: Array<{ id: FabricDetailTab; label: string }> = [
  { id: "basic", label: "基础资料" },
  { id: "suppliers", label: "供应商与采购" },
  { id: "process", label: "工艺与质量" },
];

function DetailField({ label, value, wide = false }: { label: string; value: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-sm leading-6 text-stone-900">{value || "待补充"}</div>
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
      <div className="flex items-center gap-2.5">
        <span className={`flex size-8 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="size-4" /></span>
        <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      </div>
      <div className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function StatusBadge({ fabric }: { fabric: FabricLibraryPrototype }) {
  const style = fabric.status === "sellable"
    ? "bg-emerald-50/82 text-emerald-800"
    : fabric.status === "incomplete"
      ? "bg-amber-50/82 text-amber-800"
      : "bg-stone-200/76 text-stone-700";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${style}`}><CheckCircle2 className="size-3" />{fabricStatusLabels[fabric.status]}</span>;
}

function BasicTab({ fabric }: { fabric: FabricLibraryPrototype }) {
  return (
    <div data-testid="fabric-detail-basic">
      <DetailSection icon={Layers3} title="分类与结构" tone="blue">
        <DetailField label="面料类型" value={fabricTypeLabels[fabric.type]} />
        <DetailField label="计价单位" value={pricingUnitLabels[fabric.pricingUnit]} />
        <DetailField label="细分类" value={fabric.category} />
        <DetailField label="组织结构" value={fabric.structure} />
      </DetailSection>
      <DetailSection icon={Ruler} title="成分与规格" tone="emerald">
        <DetailField label="成分" value={fabric.composition} wide />
        <DetailField label="克重" value={fabric.weight} />
        <DetailField label="门幅" value={fabric.width} />
        <DetailField label="纱支" value={fabric.yarnCount} />
        <DetailField label="经纬密" value={fabric.density} />
      </DetailSection>
      <DetailSection icon={Tag} title="来源与用途" tone="violet">
        <DetailField label="开发来源" value={developmentSourceLabels[fabric.developmentSource]} />
        <DetailField label="复购状态" value={fabric.repurchaseStatus} />
        <DetailField label="用途 / 季节" value={fabric.tags.join(" · ")} wide />
        <DetailField label="档案备注" value={fabric.remarks} wide />
      </DetailSection>
    </div>
  );
}

function SupplierTab({ fabric }: { fabric: FabricLibraryPrototype }) {
  return (
    <div className="space-y-3 py-5" data-testid="fabric-detail-suppliers">
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>同一面料可维护多家供应商及独立报价历史</span>
        <span>{fabric.supplierSources.length} 个货源</span>
      </div>
      {fabric.supplierSources.map((source) => (
        <article className="rounded-[18px] border border-white/34 bg-white/24 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]" key={source.id}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="size-4 shrink-0 text-blue-700" />
                <h3 className="truncate text-sm font-semibold text-stone-950">{source.supplierName}</h3>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-600"><Factory className="size-3.5" />{source.supplierUnitName || "未指定生产单元"}</div>
            </div>
            {source.isPreferred ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-200/70 bg-emerald-50/76 px-2 py-1 text-[11px] text-emerald-800"><BadgeCheck className="size-3" />首选货源</span> : null}
          </div>
          <div className="mt-4 grid gap-x-4 gap-y-3 border-t border-white/36 pt-4 sm:grid-cols-2">
            <DetailField label="供应商货号" value={source.supplierFabricCode} />
            <DetailField label="最新采购价" value={source.latestPurchasePrice} />
            <DetailField label="MOQ" value={source.minimumOrderQty} />
            <DetailField label="交期" value={source.leadTime} />
            <DetailField label="联系人" value={source.contactName} />
            <DetailField label="报价日期" value={source.quoteDate} />
            <DetailField label="供应商样品状态" value={source.sampleStatus} />
            <DetailField label="历史报价" value={`${source.quoteHistoryCount} 条`} />
            <DetailField label="质量差异" value={source.qualityDifferences} wide />
          </div>
        </article>
      ))}
    </div>
  );
}

function ProcessTab({ fabric }: { fabric: FabricLibraryPrototype }) {
  return (
    <div data-testid="fabric-detail-process">
      <DetailSection icon={Layers3} title="坯布信息" tone="blue">
        <DetailField label="资料状态" value={fabric.greigeStatus} />
        <DetailField label="参考规格" value={getFabricSpecification(fabric)} />
        <DetailField label="坯布说明" value={fabric.greigeDetails} wide />
      </DetailSection>
      <DetailSection icon={FlaskConical} title="染整信息" tone="violet">
        <DetailField label="资料状态" value={fabric.dyeingStatus} />
        <DetailField label="染整说明" value={fabric.dyeingDetails} wide />
      </DetailSection>
      <DetailSection icon={Sparkles} title="后工艺信息" tone="amber">
        <DetailField label="资料状态" value={fabric.postProcessStatus} />
        <DetailField label="后工艺说明" value={fabric.postProcessDetails} wide />
      </DetailSection>
      <DetailSection icon={ClipboardCheck} title="质量记录" tone="emerald">
        <DetailField label="检验结论" value={fabric.inspectionConclusion} />
        <DetailField label="质量提示" value={fabric.qualityNotes} wide />
      </DetailSection>
    </div>
  );
}

export function FabricDetailDrawer({ fabric, onClose }: { fabric: FabricLibraryPrototype | null; onClose: () => void }) {
  const [drawerState, setDrawerState] = useState<FabricDetailDrawerState>(createInitialFabricDetailDrawerState);
  const noticeTimer = useRef<number | null>(null);

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

  if (!fabric) return null;

  const beginClose = () => setDrawerState(startFabricDetailDrawerClose);

  const staticAction = (message: string) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setDrawerState((current) => ({ ...current, notice: `${message}：静态原型，本轮不会写入数据库` }));
    noticeTimer.current = window.setTimeout(() => {
      setDrawerState((current) => ({ ...current, notice: "" }));
      noticeTimer.current = null;
    }, 2600);
  };

  return (
    <>
      <button aria-label="关闭面料详情遮罩" className={`fixed inset-0 z-30 bg-stone-950/10 backdrop-blur-[2px] ${drawerState.isClosing ? "fabric-create-backdrop-exit" : "fabric-create-backdrop-enter"}`} onClick={beginClose} type="button" />
      <aside className={`fixed bottom-2 right-2 top-2 z-40 flex w-[calc(100%-1rem)] flex-col overflow-hidden rounded-[22px] border border-white/40 bg-white/54 shadow-[0_34px_110px_rgba(20,18,15,0.34),inset_0_1px_0_rgba(255,255,255,0.30)] backdrop-blur-3xl sm:w-[560px] ${drawerState.isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`} data-testid="fabric-detail-drawer">
        <header className="shrink-0 border-b border-white/30 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700"><Activity className="size-4" />{fabric.code}<span className="rounded-full border border-white/46 bg-white/42 px-2 py-0.5 text-[11px] text-stone-600">静态原型</span></div>
              <h2 className="mt-2 text-xl font-semibold text-stone-950">{fabric.name}</h2>
              <p className="mt-1 truncate text-sm text-stone-600">{fabric.englishName}</p>
            </div>
            <button aria-label="关闭面料详情" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/34 bg-white/28 text-stone-700 transition hover:bg-white/52" onClick={beginClose} type="button"><X className="size-4" /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200/60 bg-blue-50/68 px-2.5 py-1 text-xs text-blue-800">{fabricTypeLabels[fabric.type]} / {pricingUnitLabels[fabric.pricingUnit]}</span>
            <StatusBadge fabric={fabric} />
            <span className="rounded-full border border-white/42 bg-white/40 px-2.5 py-1 text-xs text-stone-700">完整度 {fabric.completeness}%</span>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/48 bg-amber-50/52 px-3 py-2 text-xs leading-5 text-amber-900"><ShieldAlert className="mt-0.5 size-3.5 shrink-0" /><span>缺失信息：{fabric.missingInfo.length ? fabric.missingInfo.join("、") : "无"}</span></div>
        </header>

        <div className="shrink-0 border-b border-white/30 bg-white/16 px-4 py-2">
          <div className="grid grid-cols-3 rounded-xl border border-white/38 bg-white/28 p-1">
            {tabs.map((tab) => <button aria-selected={drawerState.activeTab === tab.id} className={`h-9 rounded-lg text-xs font-medium transition ${drawerState.activeTab === tab.id ? "bg-white/88 text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"}`} key={tab.id} onClick={() => setDrawerState((current) => ({ ...current, activeTab: tab.id }))} role="tab" type="button">{tab.label}</button>)}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          {drawerState.activeTab === "basic" ? <BasicTab fabric={fabric} /> : null}
          {drawerState.activeTab === "suppliers" ? <SupplierTab fabric={fabric} /> : null}
          {drawerState.activeTab === "process" ? <ProcessTab fabric={fabric} /> : null}
        </div>

        <footer className="shrink-0 border-t border-white/30 bg-white/26 p-4 backdrop-blur-2xl">
          {drawerState.notice ? <div className="mb-3 rounded-xl border border-blue-200/60 bg-blue-50/70 px-3 py-2 text-xs text-blue-800">{drawerState.notice}</div> : null}
          <div className="grid grid-cols-3 gap-2">
            <button className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/38 bg-white/34 px-2 text-xs text-stone-800 transition hover:bg-white/58" onClick={() => staticAction("编辑面料")} type="button"><FilePenLine className="size-4" />编辑面料</button>
            <button className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/38 bg-white/34 px-2 text-xs text-stone-800 transition hover:bg-white/58" onClick={() => staticAction("添加供应商货源")} type="button"><Plus className="size-4" />添加货源</button>
            <button className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-2 text-xs text-white transition hover:bg-stone-800" onClick={() => staticAction("新增采购报价")} type="button"><CircleDollarSign className="size-4" />新增报价</button>
          </div>
        </footer>
      </aside>
    </>
  );
}
