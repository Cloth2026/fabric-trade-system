"use client";

import { Building2, CheckCircle2, ChevronDown, CircleDashed, Contact, Filter, LoaderCircle, Menu, Plus, RefreshCw, Search, Sparkles, Star, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCustomer,
  createCustomerContact,
  fetchCustomer,
  fetchCustomers,
  getCustomerErrorMessage,
  patchCustomer,
  patchCustomerContact,
  type CustomerContactPayload,
  type CustomerContactRecord,
  type CustomerDetailRecord,
  type CustomerPayload,
  type CustomerRecord,
} from "@/lib/api/customer-client";
import type { CustomerContactStatus, CustomerLevel, CustomerStatus, CustomerType } from "@/server/customers/constants";
import { CustomerContactDrawer } from "./customer-contact-drawer";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import { CustomerFormDrawer } from "./customer-form-drawer";
import {
  calculateCustomerCompleteness,
  customerLevelLabels,
  customerLevelOptions,
  customerStatusLabels,
  customerTypeLabels,
  customerTypeOptions,
  formatCustomerDate,
} from "./customer-prototype-data";

type TypeFilter = CustomerType | "all";
type LevelFilter = CustomerLevel | "all";
type StatusFilter = CustomerStatus | "all";
type FormMode = { kind: "create" } | { kind: "edit"; customerId: string } | null;
type ContactMode = { kind: "create"; customerId: string } | { kind: "edit"; contact: CustomerContactRecord } | null;

function FilterSelect<T extends string>({ label, options, value, onChange }: { label: string; options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button aria-expanded={open} className={`flex h-9 min-w-32 items-center justify-between gap-3 rounded-xl border px-3 text-sm shadow-inner shadow-white/12 transition ${open ? "border-white/52 bg-white/40" : "border-white/30 bg-white/24 hover:bg-white/36"}`} onClick={() => setOpen((current) => !current)} type="button">
        <span className="text-stone-500">{label}</span>
        <span className="flex items-center gap-1.5 font-medium text-stone-950"><span className="max-w-24 truncate">{selectedLabel}</span><ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} /></span>
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-30 max-h-72 w-44 overflow-auto rounded-2xl border border-white/40 bg-white/76 p-1.5 text-sm shadow-[0_24px_70px_rgba(22,18,14,0.24)] backdrop-blur-3xl">
          {options.map((option) => (
            <button className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${option.value === value ? "bg-white/90 text-stone-950 shadow-sm" : "text-stone-700 hover:bg-white/52"}`} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} type="button">
              {option.label}{option.value === value ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: LucideIcon; tone: "blue" | "emerald" | "violet" | "amber" }) {
  const tones = { blue: "border-blue-300/34 bg-blue-500/12 text-blue-700", emerald: "border-emerald-300/34 bg-emerald-500/12 text-emerald-700", violet: "border-violet-300/34 bg-violet-500/12 text-violet-700", amber: "border-amber-300/42 bg-amber-400/16 text-amber-800" };
  return <div className="rounded-[18px] border border-white/26 bg-white/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl transition hover:bg-white/28"><div className="flex items-center justify-between"><span className="text-xs text-stone-700">{label}</span><span className={`flex size-8 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="size-4" /></span></div><div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div><div className="mt-1 truncate text-xs text-stone-600">{note}</div></div>;
}

export function CustomerManagementPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [listRefresh, setListRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [contactMode, setContactMode] = useState<ContactMode>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const detailRequestId = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setListLoading(true);
      setListError("");
      fetchCustomers({ q: query, type: typeFilter, level: levelFilter, status: statusFilter, limit: 50 }, controller.signal)
        .then(setCustomers)
        .catch((error) => { if (!controller.signal.aborted) setListError(getCustomerErrorMessage(error, "客户读取失败，请重试")); })
        .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [levelFilter, listRefresh, query, statusFilter, typeFilter]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const requestId = ++detailRequestId.current;
    fetchCustomer(selectedId, controller.signal)
      .then((customer) => {
        if (!controller.signal.aborted && requestId === detailRequestId.current) setDetailCustomer(customer);
      })
      .catch((error) => {
        if (!controller.signal.aborted && requestId === detailRequestId.current) setDetailError(getCustomerErrorMessage(error, "客户详情读取失败"));
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === detailRequestId.current) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [detailRefresh, selectedId]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2800);
  }, []);

  const selectCustomer = (customer: CustomerRecord) => {
    detailRequestId.current += 1;
    setSelectedId(customer.id);
    setDetailCustomer(null);
    setDetailError("");
    setDetailLoading(true);
    setContactMode(null);
  };

  const closeDetail = () => {
    detailRequestId.current += 1;
    setSelectedId(null);
    setDetailCustomer(null);
    setDetailError("");
    setDetailLoading(false);
    setContactMode(null);
  };

  const refreshDetail = () => {
    setDetailLoading(true);
    setDetailRefresh((value) => value + 1);
  };

  const saveCustomer = async (payload: CustomerPayload) => {
    const saved = formMode?.kind === "edit" ? await patchCustomer(formMode.customerId, payload) : await createCustomer(payload);
    setFormMode(null);
    setSelectedId(saved.id);
    // Contacts are (re)loaded by the detail effect; seed the drawer immediately.
    setDetailCustomer({ ...saved, contacts: [] });
    setListRefresh((value) => value + 1);
    showToast(`${saved.name} 已保存`);
  };

  const toggleCustomerStatus = async (customer: CustomerDetailRecord) => {
    try {
      const nextStatus: CustomerStatus = customer.status === "active" ? "inactive" : "active";
      const saved = await patchCustomer(customer.id, { status: nextStatus });
      setDetailCustomer(saved);
      setListRefresh((value) => value + 1);
      showToast(`${saved.name} 已${saved.status === "active" ? "重新启用" : "停用"}`);
    } catch (error) {
      showToast(getCustomerErrorMessage(error, "状态更新失败，请重试"));
    }
  };

  const saveContact = async (payload: CustomerContactPayload) => {
    if (!contactMode || !detailCustomer) return;
    const saved = contactMode.kind === "create"
      ? await createCustomerContact(detailCustomer.id, payload)
      : await patchCustomerContact(detailCustomer.id, contactMode.contact.id, payload);
    setContactMode(null);
    refreshDetail();
    showToast(`${saved.name} 已保存`);
  };

  const toggleContactStatus = async (contact: CustomerContactRecord) => {
    if (!detailCustomer) return;
    try {
      const nextStatus: CustomerContactStatus = contact.status === "active" ? "inactive" : "active";
      await patchCustomerContact(detailCustomer.id, contact.id, { status: nextStatus });
      refreshDetail();
      showToast(`${contact.name} 已${contact.status === "active" ? "停用" : "启用"}`);
    } catch (error) {
      showToast(getCustomerErrorMessage(error, "联系人状态更新失败"));
    }
  };

  const activeCount = customers.filter((customer) => customer.status === "active").length;
  const keyAccountCount = customers.filter((customer) => customer.level === "strategic" || customer.level === "a").length;
  const incompleteCount = customers.filter((customer) => calculateCustomerCompleteness(customer) < 70).length;

  const typeOptions = useMemo(() => [{ value: "all" as const, label: "全部类型" }, ...customerTypeOptions], []);
  const levelOptions = useMemo(() => [{ value: "all" as const, label: "全部等级" }, ...customerLevelOptions], []);
  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: "all", label: "全部状态" },
    { value: "active", label: customerStatusLabels.active },
    { value: "inactive", label: customerStatusLabels.inactive },
  ];

  const editingCustomer = detailCustomer && formMode?.kind === "edit" && formMode.customerId === detailCustomer.id ? detailCustomer : undefined;
  const contactCustomer = detailCustomer;

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
        <div className="flex items-center gap-3">
          <button aria-label="打开导航" className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden" type="button"><Menu className="size-4" /></button>
          <div>
            <div className="text-sm font-semibold text-stone-950">客户</div>
            <div className="text-xs text-stone-700/72">客户主档、联系人、等级与合作状态</div>
          </div>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800" onClick={() => setFormMode({ kind: "create" })} type="button"><Plus className="size-4" />新增客户</button>
      </header>

      <section className="grid shrink-0 gap-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="当前结果" value={customers.length} note="最多显示 50 家" icon={Building2} tone="blue" />
        <Metric label="合作中客户" value={activeCount} note="当前筛选结果" icon={CheckCircle2} tone="emerald" />
        <Metric label="重点客户" value={keyAccountCount} note="战略客户与 A 级客户" icon={Star} tone="violet" />
        <Metric label="待完善资料" value={incompleteCount} note="完整度低于 70%" icon={CircleDashed} tone="amber" />
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-white/14 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700"><Sparkles className="size-4 text-blue-600" />客户名录<span className="rounded-full border border-emerald-200/60 bg-emerald-50/58 px-2 py-0.5 text-xs text-emerald-800">实时数据</span></div>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950">管理客户主档与联系人</h1>
            <p className="mt-1 text-sm text-stone-600">客户主档是寄样与报价单的基础，先维护客户再进入后续流程</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="flex h-9 min-w-72 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-3 text-sm shadow-inner shadow-white/12">
              <Search className="size-4 text-stone-500" />
              <input className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70" onChange={(event) => setQuery(event.target.value)} placeholder="搜索名称、联系人、电话或品类" value={query} />
              {query ? <button aria-label="清空客户搜索" className="rounded-lg p-1 text-stone-500 hover:bg-white/44" onClick={() => setQuery("")} type="button"><X className="size-3.5" /></button> : null}
            </label>
            <FilterSelect label="类型" options={typeOptions} value={typeFilter} onChange={setTypeFilter} />
            <FilterSelect label="等级" options={levelOptions} value={levelFilter} onChange={setLevelFilter} />
            <FilterSelect label="状态" options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/44 pt-3 text-xs text-stone-600">
          <span>点击客户查看主档与联系人明细</span>
          <span className="flex items-center gap-1.5"><Filter className="size-3.5" />{listLoading ? "正在读取" : `已读取 ${customers.length} 家`}</span>
        </div>

        {listError ? <div className="mt-3 flex items-center justify-between rounded-2xl border border-rose-200/60 bg-rose-50/66 px-4 py-3 text-sm text-rose-800"><span>{listError}</span><button className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white/60 px-3 py-2" onClick={() => setListRefresh((value) => value + 1)} type="button"><RefreshCw className="size-4" />重试</button></div> : null}

        <div className="relative mt-3 min-h-0 flex-1 overflow-auto rounded-[18px] border border-white/26 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
          {listLoading && customers.length > 0 ? <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-xl bg-white/72 px-3 py-2 text-xs text-stone-600 shadow-sm"><LoaderCircle className="size-3.5 animate-spin" />更新中</div> : null}
          <table className="w-full min-w-[980px] table-fixed border-collapse text-left text-sm">
            <colgroup><col className="w-[20%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[13%]" /><col className="w-[12%]" /><col className="w-[11%]" /><col className="w-[9%]" /><col className="w-[10%]" /><col className="w-[6%]" /></colgroup>
            <thead className="sticky top-0 z-10 bg-white/60 text-xs text-stone-700 backdrop-blur-2xl">
              <tr>{["客户名称", "类型", "等级", "主要联系人", "电话", "所在地", "联系人", "最近更新", "状态"].map((header) => <th className="px-4 py-3 font-medium" key={header}>{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/24">
              {customers.length === 0 && !listLoading ? <tr><td className="px-4 py-10 text-center text-stone-500" colSpan={9}>当前筛选条件下没有客户，点击右上角新增客户</td></tr> : null}
              {customers.map((customer) => (
                <tr aria-label={`查看${customer.name}详情`} className={`cursor-pointer transition hover:bg-white/34 focus:bg-white/38 focus:outline-none ${selectedId === customer.id ? "bg-white/30" : ""}`} key={customer.id} onClick={() => selectCustomer(customer)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectCustomer(customer); } }} tabIndex={0}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-blue-200/40 bg-blue-50/42 text-blue-700"><Building2 className="size-4" /></span>
                      <span className="truncate font-medium text-stone-950">{customer.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{customer.type ? customerTypeLabels[customer.type] : "—"}</td>
                  <td className="px-4 py-3">{customer.level ? <span className="rounded-full border border-amber-200/60 bg-amber-50/58 px-2 py-0.5 text-xs text-amber-800">{customerLevelLabels[customer.level]}</span> : "—"}</td>
                  <td className="px-4 py-3 text-stone-700">{customer.contactName ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-700">{customer.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-stone-700">{[customer.country, customer.city].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-4 py-3"><span className="flex items-center gap-1 text-stone-700"><Contact className="size-3.5" />{customer._count.contacts}</span></td>
                  <td className="px-4 py-3 text-stone-600">{formatCustomerDate(customer.updatedAt)}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${customer.status === "active" ? "bg-emerald-50/82 text-emerald-800" : "bg-stone-200/72 text-stone-700"}`}>{customer.status === "active" ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}{customerStatusLabels[customer.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {toast ? <div className="fixed right-5 top-20 z-[60] flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/82 px-4 py-3 text-sm text-emerald-900 shadow-xl backdrop-blur-2xl"><CheckCircle2 className="size-4" />{toast}</div> : null}

      <CustomerDetailDrawer
        customer={detailCustomer}
        loading={detailLoading}
        error={detailError}
        onClose={closeDetail}
        onEdit={(customer) => setFormMode({ kind: "edit", customerId: customer.id })}
        onToggleStatus={toggleCustomerStatus}
        onCreateContact={(customer) => setContactMode({ kind: "create", customerId: customer.id })}
        onEditContact={(contact) => setContactMode({ kind: "edit", contact })}
        onToggleContactStatus={toggleContactStatus}
      />

      {formMode ? <CustomerFormDrawer key={`${formMode.kind}-${editingCustomer?.id ?? "new"}`} mode={formMode.kind} customer={editingCustomer} onClose={() => setFormMode(null)} onSave={saveCustomer} /> : null}

      {contactMode && contactCustomer ? (
        <CustomerContactDrawer
          key={`${contactMode.kind}-${contactMode.kind === "edit" ? contactMode.contact.id : "new"}`}
          mode={contactMode.kind}
          customerName={contactCustomer.name}
          contact={contactMode.kind === "edit" ? contactMode.contact : undefined}
          onClose={() => setContactMode(null)}
          onSave={saveContact}
        />
      ) : null}
    </section>
  );
}
