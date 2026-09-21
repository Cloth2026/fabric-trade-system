"use client";

import { AlertCircle, Building2, CheckCircle2, CircleDashed, Contact, LoaderCircle, MapPin, Pencil, Phone, Plus, RefreshCw, Star, X } from "lucide-react";
import type { CustomerContactRecord, CustomerDetailRecord } from "@/lib/api/customer-client";
import { customerLevelLabels, customerStatusLabels, customerTypeLabels, formatCustomerDate } from "./customer-prototype-data";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/16 py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-stone-600">{label}</span>
      <span className="text-right text-stone-950">{value || "—"}</span>
    </div>
  );
}

export function CustomerDetailDrawer({
  customer,
  loading,
  error,
  onClose,
  onEdit,
  onToggleStatus,
  onCreateContact,
  onEditContact,
  onToggleContactStatus,
}: {
  customer: CustomerDetailRecord | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onEdit: (customer: CustomerDetailRecord) => void;
  onToggleStatus: (customer: CustomerDetailRecord) => void;
  onCreateContact: (customer: CustomerDetailRecord) => void;
  onEditContact: (contact: CustomerContactRecord) => void;
  onToggleContactStatus: (contact: CustomerContactRecord) => void;
}) {
  if (!customer) return null;

  const contactCount = customer.contacts?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-40 bg-stone-950/28 backdrop-blur-md"
      data-testid="customer-detail-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/44 shadow-[0_36px_120px_rgba(26,22,18,0.34),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl">
        <div className="flex shrink-0 items-start justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-300/36 bg-blue-500/12 text-blue-700 shadow-inner shadow-white/24">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-stone-950">{customer.name}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${customer.status === "active" ? "bg-emerald-50/82 text-emerald-800" : "bg-stone-200/72 text-stone-700"}`}>
                  {customer.status === "active" ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}
                  {customerStatusLabels[customer.status]}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                {customer.type ? <span className="rounded-full border border-white/42 bg-white/42 px-2 py-0.5">{customerTypeLabels[customer.type]}</span> : null}
                {customer.level ? <span className="rounded-full border border-amber-200/60 bg-amber-50/58 px-2 py-0.5 text-amber-800">{customerLevelLabels[customer.level]}</span> : null}
                <span>{contactCount} 位联系人</span>
                <span>更新于 {formatCustomerDate(customer.updatedAt)}</span>
              </div>
            </div>
          </div>
          <button aria-label="关闭客户详情" className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? <div className="mb-4 flex items-center gap-2 rounded-2xl border border-blue-200/50 bg-blue-50/44 px-4 py-3 text-sm text-blue-900"><LoaderCircle className="size-4 animate-spin" />正在读取客户详情…</div> : null}
          {error ? <div className="mb-4 flex items-center justify-between rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900"><span className="flex items-center gap-2"><AlertCircle className="size-4" />{error}</span><button className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white/50 px-3 py-1.5" onClick={onClose} type="button"><RefreshCw className="size-3.5" />关闭</button></div> : null}

          <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-800"><Building2 className="size-4 text-blue-600" />客户主体</div>
            <div className="mt-3">
              <InfoRow label="主要联系人" value={customer.contactName ?? ""} />
              <InfoRow label="联系电话" value={customer.phone ?? ""} />
              <InfoRow label="邮箱" value={customer.email ?? ""} />
              <InfoRow label="社交账号" value={customer.socialContact ?? ""} />
              <InfoRow label="客户类型" value={customer.type ? customerTypeLabels[customer.type] : ""} />
              <InfoRow label="客户等级" value={customer.level ? customerLevelLabels[customer.level] : ""} />
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <div className="flex items-center gap-2 text-sm font-medium text-stone-800"><MapPin className="size-4 text-emerald-600" />所在地与商务信息</div>
            <div className="mt-3">
              <InfoRow label="国家 / 地区" value={customer.country ?? ""} />
              <InfoRow label="城市" value={customer.city ?? ""} />
              <InfoRow label="详细地址" value={customer.address ?? ""} />
              <InfoRow label="主营品类" value={customer.mainProducts ?? ""} />
              <InfoRow label="合作品牌" value={customer.cooperationBrands ?? ""} />
              <InfoRow label="结算币种" value={customer.defaultCurrency ?? ""} />
              <InfoRow label="账期与结算" value={customer.paymentTerms ?? ""} />
              <InfoRow label="备注" value={customer.remarks ?? ""} />
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12" data-testid="customer-detail-contacts">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-stone-800"><Contact className="size-4 text-violet-600" />联系人（{contactCount}）</div>
              <button className="flex h-8 items-center gap-1.5 rounded-xl border border-white/34 bg-white/28 px-3 text-xs text-stone-700 transition hover:bg-white/44" onClick={() => onCreateContact(customer)} type="button"><Plus className="size-3.5" />新增联系人</button>
            </div>
            <div className="mt-3 space-y-2">
              {contactCount === 0 ? <div className="rounded-xl border border-white/24 bg-white/18 px-3 py-4 text-center text-sm text-stone-500">还没有联系人，点击右上角新增</div> : null}
              {(customer.contacts ?? []).map((contact) => (
                <div className="rounded-xl border border-white/26 bg-white/22 px-3 py-2.5" key={contact.id}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-medium text-stone-950">{contact.name}</span>
                      {contact.isPrimary ? <span className="flex items-center gap-1 rounded-full border border-amber-200/60 bg-amber-50/60 px-2 py-0.5 text-xs text-amber-800"><Star className="size-3" />主要</span> : null}
                      {contact.status !== "active" ? <span className="rounded-full bg-stone-200/70 px-2 py-0.5 text-xs text-stone-700">已停用</span> : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button aria-label={`编辑联系人${contact.name}`} className="rounded-lg border border-white/30 bg-white/26 p-1.5 transition hover:bg-white/44" onClick={() => onEditContact(contact)} type="button"><Pencil className="size-3.5" /></button>
                      <button className="rounded-lg border border-white/30 bg-white/26 px-2 py-1 text-xs transition hover:bg-white/44" onClick={() => onToggleContactStatus(contact)} type="button">{contact.status === "active" ? "停用" : "启用"}</button>
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
                    {contact.title ? <span>{contact.title}</span> : null}
                    {contact.department ? <span>{contact.department}</span> : null}
                    {contact.phone ? <span className="flex items-center gap-1"><Phone className="size-3" />{contact.phone}</span> : null}
                    {contact.email ? <span>{contact.email}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-white/24 bg-white/22 px-6 py-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600">寄样、报价单等后续模块将复用此处客户主档。</div>
          <div className="flex gap-2">
            <button className="h-10 rounded-2xl border border-white/28 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/38" onClick={() => onToggleStatus(customer)} type="button">{customer.status === "active" ? "停用客户" : "重新启用"}</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-4 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800" onClick={() => onEdit(customer)} type="button"><Pencil className="size-4" />编辑客户</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
