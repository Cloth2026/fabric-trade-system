"use client";

import { Building2, CalendarClock, CheckCircle2, ChevronDown, CircleDashed, Contact, ExternalLink, Factory, FileText, Filter, Handshake, Link2, MapPin, Pencil, Plus, Power, Search, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { SupplierPrototype } from "./supplier-prototype-data";
import { filterSupplierUnitPrototypes, supplierUnitTypes } from "./supplier-unit-prototype-data";
import type { SupplierUnitPrototype, SupplierUnitStatus, SupplierUnitType } from "./supplier-unit-prototype-data";

function DetailSection({ icon: Icon, title, children, tone = "blue" }: { icon: typeof Building2; title: string; children: ReactNode; tone?: "blue" | "emerald" | "amber" | "violet" }) {
  const tones = {
    blue: "border-blue-300/40 bg-blue-500/12 text-blue-700",
    emerald: "border-emerald-300/40 bg-emerald-500/12 text-emerald-700",
    amber: "border-amber-300/50 bg-amber-400/16 text-amber-800",
    violet: "border-violet-300/40 bg-violet-500/12 text-violet-700",
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

function DetailField({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-sm leading-6 text-stone-800">{value || "未填写"}</div>
    </div>
  );
}

function UnitFilterSelect<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: T[]; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button aria-expanded={open} className={`flex h-9 w-full items-center justify-between gap-2 rounded-xl border px-3 text-xs transition ${open ? "border-white/52 bg-white/48" : "border-white/32 bg-white/30 hover:bg-white/44"}`} onClick={() => setOpen((current) => !current)} type="button"><span className="text-stone-500">{label}</span><span className="flex min-w-0 items-center gap-1 font-medium text-stone-900"><span className="truncate">{value}</span><ChevronDown className={`size-3.5 shrink-0 transition ${open ? "rotate-180" : ""}`} /></span></button>
      {open ? <div className="absolute left-0 right-0 top-11 z-20 max-h-56 overflow-auto rounded-2xl border border-white/40 bg-white/84 p-1.5 shadow-[0_20px_60px_rgba(22,18,14,0.22)] backdrop-blur-3xl">{options.map((option) => <button className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition ${option === value ? "bg-white text-stone-950 shadow-sm" : "text-stone-700 hover:bg-white/60"}`} key={option} onClick={() => { onChange(option); setOpen(false); }} type="button">{option}{option === value ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}</button>)}</div> : null}
    </div>
  );
}

function SupplierUnitsSection({ units, onSelectUnit, onCreateUnit }: { units: SupplierUnitPrototype[]; onSelectUnit: (unit: SupplierUnitPrototype) => void; onCreateUnit: () => void }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"全部类型" | SupplierUnitType>("全部类型");
  const [statusFilter, setStatusFilter] = useState<"全部状态" | SupplierUnitStatus>("全部状态");
  const filteredUnits = useMemo(() => filterSupplierUnitPrototypes(units, { query, type: typeFilter, status: statusFilter }), [query, statusFilter, typeFilter, units]);

  return (
    <section aria-label="生产单元" className="border-t border-white/30 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-xl border border-violet-300/40 bg-violet-500/12 text-violet-700"><Factory className="size-4" /></span><div><div className="flex items-center gap-2"><h3 className="text-sm font-semibold text-stone-950">生产单元</h3><span className="rounded-full bg-white/42 px-2 py-0.5 text-[11px] text-stone-600">{units.length}</span></div><p className="mt-1 text-xs text-stone-500">区分车间、分厂或事业部的业务能力</p></div></div>
        <button className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-white/36 bg-white/34 px-3 text-xs font-medium text-stone-800 transition hover:bg-white/54" onClick={onCreateUnit} type="button"><Plus className="size-3.5" />新增生产单元</button>
      </div>

      {units.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/46 bg-white/18 px-4 py-6 text-center"><Factory className="mx-auto size-6 text-stone-400" /><p className="mt-3 text-sm font-medium text-stone-700">尚未建立生产单元</p><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-stone-500">对于分车间经营的染厂、印花厂，可以在这里记录不同车间的业务能力。</p><button className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-stone-950 px-3 text-xs font-medium text-white transition hover:bg-stone-800" onClick={onCreateUnit} type="button"><Plus className="size-3.5" />新增生产单元</button></div>
      ) : (
        <>
          <label className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-white/32 bg-white/28 px-3 text-xs"><Search className="size-3.5 text-stone-500" /><input className="min-w-0 flex-1 bg-transparent text-stone-900 outline-none placeholder:text-stone-500/70" onChange={(event) => setQuery(event.target.value)} placeholder="搜索单元名称、业务或产品" value={query} /></label>
          <div className="mt-2 grid grid-cols-2 gap-2"><UnitFilterSelect label="单元类型" options={["全部类型", ...supplierUnitTypes]} value={typeFilter} onChange={setTypeFilter} /><UnitFilterSelect label="状态" options={["全部状态", "启用", "暂停合作"]} value={statusFilter} onChange={setStatusFilter} /></div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-stone-500"><span>点击查看能力与合作条件</span><span className="flex items-center gap-1"><Filter className="size-3" />{filteredUnits.length} / {units.length}</span></div>
          <div className="mt-2 space-y-2">
            {filteredUnits.map((unit) => (
              <button aria-label={`查看生产单元${unit.name}`} className="w-full rounded-2xl border border-white/30 bg-white/22 p-3 text-left shadow-inner shadow-white/10 transition hover:-translate-y-0.5 hover:border-white/48 hover:bg-white/38" key={unit.id} onClick={() => onSelectUnit(unit)} type="button">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-stone-950">{unit.name}</span><span className="shrink-0 rounded-full border border-white/44 bg-white/48 px-2 py-0.5 text-[11px] text-stone-600">{unit.type}</span></div><div className="mt-1 text-xs text-stone-700">{unit.primaryBusiness}</div></div><span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] ${unit.status === "启用" ? "bg-emerald-50/82 text-emerald-800" : "bg-amber-50/82 text-amber-800"}`}>{unit.status === "启用" ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}{unit.status}</span></div>
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600">主要产品：{unit.primaryProducts}</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/32 pt-2 text-[11px] text-stone-500"><span>负责人 {unit.manager || "未填写"}</span><span>常规交期 {unit.leadTime || "未填写"}</span></div>
                <div className={`mt-2 flex items-start gap-1.5 rounded-xl px-2.5 py-2 text-[11px] leading-4 ${unit.status === "启用" ? "bg-stone-950/6 text-stone-600" : "bg-amber-50/64 text-amber-900"}`}><ShieldAlert className={`mt-0.5 size-3 shrink-0 ${unit.status === "启用" ? "text-stone-500" : "text-amber-700"}`} />{unit.status === "启用" ? unit.qualityFeatures : unit.riskNote}</div>
              </button>
            ))}
            {filteredUnits.length === 0 ? <div className="rounded-2xl border border-dashed border-white/44 py-7 text-center text-xs text-stone-500">没有符合当前条件的生产单元</div> : null}
          </div>
        </>
      )}
      <div className="mt-3 text-[11px] text-stone-500">静态 UI 原型，本轮不会写入数据库</div>
    </section>
  );
}

export function SupplierDetailDrawer({
  supplier,
  onClose,
  onEdit,
  onToggleStatus,
  onViewFabrics,
  units,
  onSelectUnit,
  onCreateUnit,
}: {
  supplier: SupplierPrototype | null;
  onClose: () => void;
  onEdit: (supplier: SupplierPrototype) => void;
  onToggleStatus: (supplier: SupplierPrototype) => void;
  onViewFabrics: (supplier: SupplierPrototype) => void;
  units: SupplierUnitPrototype[];
  onSelectUnit: (unit: SupplierUnitPrototype) => void;
  onCreateUnit: (supplier: SupplierPrototype) => void;
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

  if (!supplier) return null;

  return (
    <aside className={`fixed bottom-3 right-3 top-16 z-30 flex w-[calc(100%-1.5rem)] max-w-[470px] flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/48 shadow-[0_32px_100px_rgba(20,18,15,0.30),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-3xl ${isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`}>
      <div className="shrink-0 border-b border-white/28 px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-700"><Building2 className="size-4" />供应商详情</div>
            <h2 className="mt-2 truncate text-xl font-semibold text-stone-950">{supplier.name}</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {supplier.roles.map((role) => <span className="rounded-full border border-white/42 bg-white/42 px-2 py-1 text-xs text-stone-700" key={role}>{role}</span>)}
              <span className={`rounded-full px-2 py-1 text-xs ${supplier.status === "启用" ? "bg-emerald-50/80 text-emerald-800" : "bg-stone-200/70 text-stone-700"}`}>{supplier.status}</span>
            </div>
          </div>
          <button aria-label="关闭供应商详情" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/24 transition hover:bg-white/44" onClick={() => setIsClosing(true)} type="button"><X className="size-4" /></button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {supplier.riskNote ? (
          <div className="mb-5 flex gap-3 rounded-2xl border border-amber-300/46 bg-amber-50/66 p-3 text-sm text-amber-950">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <div><div className="font-medium">风险提醒</div><p className="mt-1 leading-6 text-amber-900/86">{supplier.riskNote}</p></div>
          </div>
        ) : null}

        <DetailSection icon={Building2} title="基础信息" tone="blue">
          <DetailField label="供应商名称" value={supplier.name} wide />
          <DetailField label="国家 / 地区" value={supplier.country} />
          <DetailField label="城市" value={supplier.city} />
          <DetailField label="详细地址" value={supplier.address} wide />
        </DetailSection>

        <DetailSection icon={Contact} title="主要联系人" tone="emerald">
          <DetailField label="姓名" value={supplier.contactName} />
          <DetailField label="电话" value={supplier.phone} />
          <DetailField label="邮箱" value={supplier.email} />
          <DetailField label="微信 / WhatsApp" value={supplier.socialContact} />
        </DetailSection>

        <DetailSection icon={Handshake} title="合作信息" tone="amber">
          <DetailField label="主营产品或工艺" value={supplier.specialties} wide />
          <DetailField label="常规交期" value={supplier.leadTime} />
          <DetailField label="MOQ 说明" value={supplier.moq} />
          <DetailField label="付款方式" value={supplier.paymentTerms} wide />
          <DetailField label="合作评价" value={supplier.cooperationComment} wide />
          <DetailField label="备注" value={supplier.remarks} wide />
        </DetailSection>

        <SupplierUnitsSection key={supplier.id} units={units} onSelectUnit={onSelectUnit} onCreateUnit={() => onCreateUnit(supplier)} />

        <DetailSection icon={Link2} title="关联数据预览" tone="violet">
          <DetailField label="关联面料数量" value={`${supplier.linkedFabricCount} 款`} />
          <DetailField label="最近报价日期" value={supplier.latestQuoteDate} />
          <DetailField label="最近合作记录" value={supplier.latestCooperation} wide />
          <div className="sm:col-span-2 flex items-center gap-2 text-xs text-stone-500"><FileText className="size-3.5" />静态占位，本轮不读取真实业务关系</div>
        </DetailSection>

        <div className="flex items-center gap-2 border-t border-white/30 pt-4 text-xs text-stone-500"><CalendarClock className="size-3.5" />最近更新：{supplier.updatedAt}<MapPin className="ml-2 size-3.5" />{supplier.city}</div>
      </div>

      <div className="shrink-0 border-t border-white/28 bg-white/24 p-4 backdrop-blur-2xl">
        <div className="grid grid-cols-3 gap-2">
          <button className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/34 bg-white/32 px-2 text-sm text-stone-800 transition hover:bg-white/52" onClick={() => onEdit(supplier)} type="button"><Pencil className="size-4" />编辑</button>
          <button className={`flex h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-sm transition ${supplier.status === "启用" ? "border-rose-200/60 bg-rose-50/42 text-rose-800 hover:bg-rose-100/64" : "border-emerald-200/60 bg-emerald-50/42 text-emerald-800 hover:bg-emerald-100/64"}`} onClick={() => onToggleStatus(supplier)} type="button"><Power className="size-4" />{supplier.status === "启用" ? "停用" : "重新启用"}</button>
          <button className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-stone-950 px-2 text-sm text-white transition hover:bg-stone-800" onClick={() => onViewFabrics(supplier)} type="button"><ExternalLink className="size-4" />关联面料</button>
        </div>
      </div>
    </aside>
  );
}
