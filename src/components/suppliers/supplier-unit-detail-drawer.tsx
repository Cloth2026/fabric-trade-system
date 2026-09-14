"use client";

import { BriefcaseBusiness, Building2, CheckCircle2, CircleDashed, Contact, Factory, Handshake, Pencil, Power, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { SupplierPrototype } from "./supplier-prototype-data";
import type { SupplierUnitPrototype } from "./supplier-unit-prototype-data";

function UnitDetailSection({ icon: Icon, title, children, tone }: { icon: LucideIcon; title: string; children: ReactNode; tone: "blue" | "emerald" | "violet" | "amber" | "cyan" }) {
  const tones = {
    blue: "border-blue-300/40 bg-blue-500/12 text-blue-700",
    emerald: "border-emerald-300/40 bg-emerald-500/12 text-emerald-700",
    violet: "border-violet-300/40 bg-violet-500/12 text-violet-700",
    amber: "border-amber-300/50 bg-amber-400/16 text-amber-800",
    cyan: "border-cyan-300/40 bg-cyan-500/12 text-cyan-700",
  };
  return (
    <section className="border-t border-white/30 py-5 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2.5">
        <span className={`flex size-8 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="size-4" /></span>
        <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      </div>
      <div className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function UnitDetailField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return <div className={wide ? "sm:col-span-2" : ""}><div className="text-xs text-stone-500">{label}</div><div className="mt-1 text-sm leading-6 text-stone-800">{value || "未填写"}</div></div>;
}

export function SupplierUnitDetailDrawer({
  unit,
  supplier,
  onClose,
  onEdit,
  onToggleStatus,
}: {
  unit: SupplierUnitPrototype | null;
  supplier: SupplierPrototype | null;
  onClose: () => void;
  onEdit: (unit: SupplierUnitPrototype) => void;
  onToggleStatus: (unit: SupplierUnitPrototype) => void;
}) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  if (!unit || !supplier) return null;

  return (
    <div className={`fixed inset-0 z-40 bg-stone-950/18 backdrop-blur-[2px] ${isClosing ? "fabric-create-backdrop-exit" : "fabric-create-backdrop-enter"}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsClosing(true); }}>
      <aside className={`absolute bottom-3 right-3 top-12 flex w-[calc(100%-1.5rem)] max-w-[540px] flex-col overflow-hidden rounded-[22px] border border-white/38 bg-white/58 shadow-[0_36px_110px_rgba(20,18,15,0.36),inset_0_1px_0_rgba(255,255,255,0.26)] backdrop-blur-3xl ${isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`}>
        <div className="shrink-0 border-b border-white/28 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-violet-700"><Factory className="size-4" />生产单元详情<span className="rounded-full border border-violet-200/54 bg-violet-50/64 px-2 py-0.5 text-[11px]">静态原型</span></div>
              <h2 className="mt-2 truncate text-xl font-semibold text-stone-950">{unit.name}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-white/44 bg-white/50 px-2 py-1 text-xs text-stone-700">{unit.type}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${unit.status === "启用" ? "bg-emerald-50/82 text-emerald-800" : "bg-amber-50/82 text-amber-800"}`}>{unit.status === "启用" ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}{unit.status}</span>
              </div>
            </div>
            <button aria-label="关闭生产单元详情" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/28 transition hover:bg-white/48" onClick={() => setIsClosing(true)} type="button"><X className="size-4" /></button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {unit.riskNote ? <div className="mb-5 flex gap-3 rounded-2xl border border-amber-300/46 bg-amber-50/66 p-3 text-sm text-amber-950"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><div><div className="font-medium">风险提示</div><p className="mt-1 leading-6 text-amber-900/86">{unit.riskNote}</p></div></div> : null}

          <UnitDetailSection icon={Building2} title="基础信息" tone="blue">
            <UnitDetailField label="单元名称" value={unit.name} />
            <UnitDetailField label="单元类型" value={unit.type} />
            <UnitDetailField label="所属供应商" value={supplier.name} wide />
            <UnitDetailField label="合作状态" value={unit.status} />
          </UnitDetailSection>

          <UnitDetailSection icon={BriefcaseBusiness} title="业务能力" tone="violet">
            <UnitDetailField label="主要业务" value={unit.primaryBusiness} wide />
            <UnitDetailField label="主要产品 / 面料" value={unit.primaryProducts} wide />
            <UnitDetailField label="原料范围" value={unit.materialScope} />
            <UnitDetailField label="工艺能力" value={unit.processCapabilities} wide />
            <UnitDetailField label="不承接的产品或限制" value={unit.restrictions} wide />
          </UnitDetailSection>

          <UnitDetailSection icon={Handshake} title="合作条件" tone="emerald">
            <UnitDetailField label="MOQ" value={unit.moq} />
            <UnitDetailField label="常规交期" value={unit.leadTime} />
            <UnitDetailField label="旺季交期" value={unit.peakLeadTime} />
            <UnitDetailField label="打样能力" value={unit.samplingSupport} />
          </UnitDetailSection>

          <UnitDetailSection icon={Contact} title="联系信息" tone="cyan">
            <UnitDetailField label="负责人" value={unit.manager} />
            <UnitDetailField label="电话" value={unit.phone} />
            <UnitDetailField label="微信 / 其他联系方式" value={unit.wechat} wide />
          </UnitDetailSection>

          <UnitDetailSection icon={ShieldCheck} title="质量与合作记录" tone="amber">
            <UnitDetailField label="质量特点" value={unit.qualityFeatures} wide />
            <UnitDetailField label="风险提示" value={unit.riskNote} wide />
            <UnitDetailField label="合作备注" value={unit.remarks} wide />
          </UnitDetailSection>
        </div>

        <div className="shrink-0 border-t border-white/28 bg-white/28 p-4 backdrop-blur-2xl">
          <div className="mb-3 text-xs text-stone-500">静态 UI 原型，本轮不会写入数据库</div>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex h-10 items-center justify-center gap-2 rounded-xl border border-white/34 bg-white/36 text-sm text-stone-800 transition hover:bg-white/56" onClick={() => onEdit(unit)} type="button"><Pencil className="size-4" />编辑生产单元</button>
            <button className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-sm transition ${unit.status === "启用" ? "border-amber-200/70 bg-amber-50/54 text-amber-900 hover:bg-amber-100/68" : "border-emerald-200/70 bg-emerald-50/54 text-emerald-900 hover:bg-emerald-100/68"}`} onClick={() => onToggleStatus(unit)} type="button"><Power className="size-4" />{unit.status === "启用" ? "暂停合作" : "重新启用"}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
