"use client";

import {
  Building2,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Contact,
  Factory,
  Filter,
  MapPin,
  Menu,
  Phone,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { SupplierDetailDrawer } from "./supplier-detail-drawer";
import { SupplierFormDrawer } from "./supplier-form-drawer";
import {
  filterSupplierPrototypes,
  initialSupplierPrototypes,
  supplierRoles,
} from "./supplier-prototype-data";
import type { SupplierFormState, SupplierPrototype, SupplierRole, SupplierStatus } from "./supplier-prototype-data";

type SupplierFilterValue = "全部角色" | SupplierRole;
type StatusFilterValue = "全部状态" | SupplierStatus;
type FormMode = { kind: "create" } | { kind: "edit"; supplierId: string } | null;

function StaticFilterSelect<T extends string>({ label, options, value, onChange }: { label: string; options: T[]; value: T; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button aria-expanded={open} className={`flex h-9 min-w-36 items-center justify-between gap-3 rounded-xl border px-3 text-sm shadow-inner shadow-white/12 transition ${open ? "border-white/52 bg-white/40" : "border-white/30 bg-white/24 hover:bg-white/36"}`} onClick={() => setOpen((current) => !current)} type="button">
        <span className="text-stone-500">{label}</span>
        <span className="flex items-center gap-1.5 font-medium text-stone-950"><span className="max-w-24 truncate">{value}</span><ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} /></span>
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-30 max-h-72 w-48 overflow-auto rounded-2xl border border-white/40 bg-white/76 p-1.5 text-sm shadow-[0_24px_70px_rgba(22,18,14,0.24)] backdrop-blur-3xl">
          {options.map((option) => (
            <button className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${option === value ? "bg-white/90 text-stone-950 shadow-sm" : "text-stone-700 hover:bg-white/52"}`} key={option} onClick={() => { onChange(option); setOpen(false); }} type="button">
              {option}{option === value ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SupplierMetric({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: LucideIcon; tone: "blue" | "emerald" | "violet" | "amber" }) {
  const tones = {
    blue: "border-blue-300/34 bg-blue-500/12 text-blue-700",
    emerald: "border-emerald-300/34 bg-emerald-500/12 text-emerald-700",
    violet: "border-violet-300/34 bg-violet-500/12 text-violet-700",
    amber: "border-amber-300/42 bg-amber-400/16 text-amber-800",
  };
  return (
    <div className="rounded-[18px] border border-white/26 bg-white/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl transition hover:bg-white/28">
      <div className="flex items-center justify-between"><span className="text-xs text-stone-700">{label}</span><span className={`flex size-8 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="size-4" /></span></div>
      <div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div>
      <div className="mt-1 truncate text-xs text-stone-600">{note}</div>
    </div>
  );
}

function RoleTags({ roles }: { roles: SupplierRole[] }) {
  return <div className="flex max-w-64 flex-wrap gap-1.5">{roles.map((role) => <span className="rounded-full border border-white/42 bg-white/42 px-2 py-1 text-xs text-stone-700" key={role}>{role}</span>)}</div>;
}

function StatusPill({ status }: { status: SupplierStatus }) {
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${status === "启用" ? "bg-emerald-50/82 text-emerald-800" : "bg-stone-200/72 text-stone-700"}`}>{status === "启用" ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}{status}</span>;
}

function calculatePrototypeCompleteness(state: SupplierFormState) {
  const checks = [state.name, state.roles.length ? "roles" : "", state.country, state.city, state.address, state.contactName, state.phone, state.specialties, state.leadTime, state.moq, state.paymentTerms];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function SupplierManagementPage() {
  const [suppliers, setSuppliers] = useState(initialSupplierPrototypes);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<SupplierFilterValue>("全部角色");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("全部状态");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  const selectedSupplier = suppliers.find((supplier) => supplier.id === selectedId) ?? null;
  const filteredSuppliers = useMemo(
    () => filterSupplierPrototypes(suppliers, { query, role: roleFilter, status: statusFilter }),
    [query, roleFilter, statusFilter, suppliers],
  );
  const activeCount = suppliers.filter((supplier) => supplier.status === "启用").length;
  const factoryRoles: SupplierRole[] = ["织厂", "染厂", "印花厂", "后整理厂"];
  const factoryCount = suppliers.filter((supplier) => supplier.roles.some((role) => factoryRoles.includes(role))).length;
  const incompleteCount = suppliers.filter((supplier) => supplier.completeness < 80).length;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  };

  const saveStaticSupplier = (form: SupplierFormState) => {
    if (formMode?.kind === "edit") {
      setSuppliers((current) => current.map((supplier) => supplier.id === formMode.supplierId ? { ...supplier, ...form, completeness: calculatePrototypeCompleteness(form), updatedAt: "刚刚" } : supplier));
      showToast(`已更新 ${form.name} 的静态草稿`);
      setSelectedId(formMode.supplierId);
    } else {
      const id = `supplier-prototype-${Date.now()}`;
      const created: SupplierPrototype = {
        id,
        ...form,
        completeness: calculatePrototypeCompleteness(form),
        updatedAt: "刚刚",
        linkedFabricCount: 0,
        latestQuoteDate: "暂无",
        latestCooperation: "暂无关联合作记录",
      };
      setSuppliers((current) => [created, ...current]);
      setSelectedId(id);
      showToast(`已创建 ${form.name} 的静态草稿`);
    }
    setFormMode(null);
  };

  const toggleStaticStatus = (supplier: SupplierPrototype) => {
    const nextStatus: SupplierStatus = supplier.status === "启用" ? "停用" : "启用";
    setSuppliers((current) => current.map((item) => item.id === supplier.id ? { ...item, status: nextStatus, updatedAt: "刚刚" } : item));
    showToast(`${supplier.name} 已在静态原型中${nextStatus === "启用" ? "重新启用" : "停用"}`);
  };

  const editingSupplier = formMode?.kind === "edit" ? suppliers.find((supplier) => supplier.id === formMode.supplierId) : undefined;

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
        <div className="flex items-center gap-3">
          <button aria-label="打开导航" className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden" type="button"><Menu className="size-4" /></button>
          <div><div className="text-sm font-semibold text-stone-950">供应商</div><div className="text-xs text-stone-700/72">合作方档案、角色、联系人与合作信息</div></div>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800" onClick={() => setFormMode({ kind: "create" })} type="button"><Plus className="size-4" />新增供应商</button>
      </header>

      <section className="grid shrink-0 gap-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
        <SupplierMetric label="供应商总数" value={suppliers.length} note="当前浏览器静态示例" icon={Building2} tone="blue" />
        <SupplierMetric label="启用供应商" value={activeCount} note="可用于当前合作" icon={CheckCircle2} tone="emerald" />
        <SupplierMetric label="加工厂" value={factoryCount} note="织造、染整、印花、后整理" icon={Factory} tone="violet" />
        <SupplierMetric label="待完善资料" value={incompleteCount} note="完整度低于 80%" icon={CircleDashed} tone="amber" />
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-white/14 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700"><Sparkles className="size-4 text-blue-600" />合作方名录<span className="rounded-full border border-blue-200/50 bg-blue-50/54 px-2 py-0.5 text-xs text-blue-800">静态原型</span></div>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950">管理面料来源与加工合作方</h1>
            <p className="mt-1 text-sm text-stone-600">管理面料来源、坯布、织造、染整、印花及后整理合作方</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="flex h-9 min-w-72 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-3 text-sm shadow-inner shadow-white/12">
              <Search className="size-4 text-stone-500" />
              <input className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70" onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、联系人或电话" value={query} />
              {query ? <button aria-label="清空供应商搜索" className="rounded-lg p-1 text-stone-500 hover:bg-white/44" onClick={() => setQuery("")} type="button"><X className="size-3.5" /></button> : null}
            </label>
            <StaticFilterSelect label="角色" options={["全部角色", ...supplierRoles]} value={roleFilter} onChange={setRoleFilter} />
            <StaticFilterSelect label="状态" options={["全部状态", "启用", "停用"]} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/44 pt-3 text-xs text-stone-600">
          <span>主要联系人仅展示一位，点击供应商查看分区详情</span>
          <span className="flex items-center gap-1.5"><Filter className="size-3.5" />已筛选 {filteredSuppliers.length} / {suppliers.length} 家</span>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-[18px] border border-white/26 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
          <table className="w-full min-w-[1000px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[13%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-white/60 text-xs text-stone-700 backdrop-blur-2xl">
              <tr>{["供应商名称", "角色", "主要联系人", "电话", "所在地", "合作状态", "资料完整度", "最近更新"].map((header) => <th className="px-4 py-3 font-medium" key={header}>{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/24">
              {filteredSuppliers.map((supplier) => (
                <tr
                  aria-label={`查看${supplier.name}详情`}
                  className={`cursor-pointer transition hover:bg-white/34 focus:bg-white/38 focus:outline-none ${selectedId === supplier.id ? "bg-white/30" : ""}`}
                  key={supplier.id}
                  onClick={() => setSelectedId(supplier.id)}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(supplier.id); }}
                  tabIndex={0}
                >
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-blue-200/40 bg-blue-50/42 text-blue-700"><Building2 className="size-4" /></span><div className="flex min-w-0 items-center gap-1.5"><div className="font-medium text-stone-950">{supplier.name}</div>{supplier.riskNote ? <span aria-label="有风险提醒" className="shrink-0 text-amber-700" title={`风险提醒：${supplier.riskNote}`}><ShieldAlert className="size-3.5" /></span> : null}</div></div></td>
                  <td className="px-4 py-3"><RoleTags roles={supplier.roles} /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-stone-800"><Contact className="size-3.5 text-stone-500" />{supplier.contactName || "未填写"}</div></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 whitespace-nowrap text-stone-700"><Phone className="size-3.5 text-stone-500" />{supplier.phone || "未填写"}</div></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-stone-700"><MapPin className="size-3.5 shrink-0 text-stone-500" />{supplier.city || "未填写"}</div></td>
                  <td className="px-4 py-3"><StatusPill status={supplier.status} /></td>
                  <td className="px-4 py-3"><div className="flex w-28 items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-white/54"><div className={`h-1.5 rounded-full ${supplier.completeness < 80 ? "bg-amber-600/78" : "bg-stone-800/82"}`} style={{ width: `${supplier.completeness}%` }} /></div><span className="text-xs text-stone-600">{supplier.completeness}%</span></div></td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-stone-600">{supplier.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSuppliers.length === 0 ? <div className="flex h-40 items-center justify-center text-sm text-stone-500">没有符合当前条件的供应商</div> : null}
        </div>
      </section>

      {toast ? <div className="fixed right-5 top-20 z-[60] flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/82 px-4 py-3 text-sm text-emerald-900 shadow-xl backdrop-blur-2xl"><CheckCircle2 className="size-4" />{toast}</div> : null}

      <SupplierDetailDrawer
        supplier={selectedSupplier}
        onClose={() => setSelectedId(null)}
        onEdit={(supplier) => setFormMode({ kind: "edit", supplierId: supplier.id })}
        onToggleStatus={toggleStaticStatus}
        onViewFabrics={(supplier) => showToast(`${supplier.name} 的关联面料为静态占位，本轮不读取数据库`)}
      />
      {formMode ? (
        <SupplierFormDrawer
          key={`${formMode.kind}-${editingSupplier?.id ?? "new"}`}
          mode={formMode.kind}
          supplier={editingSupplier}
          onClose={() => setFormMode(null)}
          onSave={saveStaticSupplier}
        />
      ) : null}
    </section>
  );
}
