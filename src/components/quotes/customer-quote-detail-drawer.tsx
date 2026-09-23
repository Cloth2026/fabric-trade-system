"use client";

import {
  AlertCircle,
  ArrowRight,
  Building2,
  Calculator,
  ClipboardList,
  FileText,
  LoaderCircle,
  Pencil,
  Timer,
  X,
} from "lucide-react";
import { useState } from "react";
import type { CustomerQuoteDetailRecord } from "@/lib/api/customer-quote-client";
import type { CustomerQuoteStatus } from "@/server/customer-quotes/constants";
import { customerQuoteStatusLabels } from "@/server/customer-quotes/constants";
import {
  formatCny,
  formatMoney,
  formatPercent,
  formatQuoteDate,
  quoteStatusLabel,
  quoteStatusTones,
  quoteTransitions,
} from "./customer-quote-prototype-data";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/22 py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-stone-600">{label}</span>
      <span className="text-right text-stone-950">{value}</span>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div
      className={`rounded-2xl border px-3 py-2 ${
        tone === "warn" ? "border-amber-300/42 bg-amber-400/14" : "border-white/28 bg-white/20"
      }`}
    >
      <div className="text-xs text-stone-600">{label}</div>
      <div className="mt-0.5 text-base font-semibold text-stone-950">{value}</div>
    </div>
  );
}

export function CustomerQuoteDetailDrawer({
  quote,
  loading,
  error,
  onClose,
  onStatusChange,
  onEdit,
  onConvertToOrder,
}: {
  quote: CustomerQuoteDetailRecord | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onStatusChange: (status: CustomerQuoteStatus) => Promise<void>;
  onEdit: (quote: CustomerQuoteDetailRecord) => void;
  onConvertToOrder?: () => Promise<void>;
}) {
  const [statusBusy, setStatusBusy] = useState<CustomerQuoteStatus | null>(null);
  const [converting, setConverting] = useState(false);

  if (!quote) return null;

  const transitions = quoteTransitions(quote.status);

  const changeStatus = async (status: CustomerQuoteStatus) => {
    setStatusBusy(status);
    try {
      await onStatusChange(status);
    } finally {
      setStatusBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-stone-950/26 backdrop-blur-md"
      data-testid="customer-quote-detail-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        aria-label={`报价单 ${quote.code} 详情`}
        className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-4xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/44 shadow-[0_36px_120px_rgba(26,22,18,0.32),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-emerald-300/36 bg-emerald-500/12 text-emerald-700 shadow-inner shadow-white/24">
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
                客户报价单
                <span className={`rounded-full px-2 py-0.5 text-xs ${quoteStatusTones[quote.status]}`}>
                  {quoteStatusLabel(quote.status)}
                </span>
                {quote.isOverdue && quote.status !== "expired" ? (
                  <span className="flex items-center gap-1 rounded-full bg-rose-50/82 px-2 py-0.5 text-xs text-rose-800">
                    <Timer className="size-3" />已超期 {quote.overdueDays} 天
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1 font-mono text-2xl font-semibold text-stone-950">{quote.code}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-stone-700">
                <Building2 className="size-3.5" />
                {quote.customer.name}
                {quote.contact ? ` · ${quote.contact.name}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {quote.status === "accepted" && onConvertToOrder ? (
              <button
                aria-label="转为订单"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-violet-300/50 bg-violet-500/16 px-3 text-sm text-violet-800 transition hover:bg-violet-500/26 disabled:opacity-60"
                disabled={converting}
                onClick={async () => {
                  setConverting(true);
                  try {
                    await onConvertToOrder();
                  } finally {
                    setConverting(false);
                  }
                }}
                type="button"
              >
                {converting ? <LoaderCircle className="size-3.5 animate-spin" /> : <ClipboardList className="size-3.5" />}
                转为订单
              </button>
            ) : null}
            {quote.status === "draft" ? (
              <button
                aria-label="编辑报价单"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-white/30 bg-white/26 px-3 text-sm text-stone-800 transition hover:bg-white/44"
                onClick={() => onEdit(quote)}
                type="button"
              >
                <Pencil className="size-3.5" />编辑
              </button>
            ) : null}
            <button
              aria-label="关闭报价详情"
              className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-950">状态推进</h3>
              {loading ? <LoaderCircle className="size-4 animate-spin text-stone-500" /> : null}
            </div>
            {transitions.length === 0 ? (
              <p className="mt-2 text-sm text-stone-600">报价单已结束，没有可推进的状态。</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {transitions.map((status) => (
                  <button
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-stone-950/90 px-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60"
                    disabled={statusBusy !== null}
                    key={status}
                    onClick={() => changeStatus(status)}
                    type="button"
                  >
                    {statusBusy === status ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="size-3.5" />
                    )}
                    标记为「{customerQuoteStatusLabels[status]}」
                  </button>
                ))}
              </div>
            )}
            {quote.status === "draft" || quote.status === "sent" ? (
              <p className="mt-2 text-xs text-stone-600">
                超期只在列表与此处红字提示，不会自动改状态；确认作废时点「标记为已过期」。
              </p>
            ) : null}
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <h3 className="font-semibold text-stone-950">单据信息</h3>
            <div className="mt-2 grid gap-x-6 md:grid-cols-2">
              <div>
                <InfoRow label="计价币种" value={`${quote.currency}${quote.currency === "CNY" ? "（人民币）" : "（美元）"}`} />
                <InfoRow label="汇率" value={quote.currency === "CNY" ? "1（人民币）" : `1 ${quote.currency} = ${quote.exchangeRate} CNY`} />
                <InfoRow label="报价日期" value={formatQuoteDate(quote.quoteDate)} />
                <InfoRow label="有效期至" value={formatQuoteDate(quote.validUntil)} />
                <InfoRow label="版本" value={`第 ${quote.version} 版`} />
              </div>
              <div>
                <InfoRow label="贸易条款" value={quote.priceTerms ?? "—"} />
                <InfoRow label="交货条款" value={quote.deliveryTerms ?? "—"} />
                <InfoRow label="付款条款" value={quote.paymentTerms ?? "—"} />
                <InfoRow label="整单交期" value={quote.leadTime ?? "—"} />
                <InfoRow label="默认税率" value={quote.taxRate ? `${Number(quote.taxRate) * 100}%` : "—"} />
              </div>
            </div>
            {quote.remark ? (
              <div className="mt-3 rounded-xl bg-white/28 px-3 py-2 text-sm text-stone-700">{quote.remark}</div>
            ) : null}
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-emerald-600" />
              <h3 className="font-semibold text-stone-950">金额汇总</h3>
              <span className="rounded-full bg-white/40 px-2 py-0.5 text-xs text-stone-700">
                {quote.items.length} 行
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <Metric label={`不含税（${quote.currency}）`} value={formatMoney(quote.totals.netAmount, quote.currency)} />
              <Metric label="税额" value={formatMoney(quote.totals.taxAmount, quote.currency)} />
              <Metric label="含税合计" value={formatMoney(quote.totals.taxInclusiveAmount, quote.currency)} />
              <Metric label="成本（CNY）" value={formatCny(quote.totals.costCny)} />
              <Metric
                label="毛利（CNY）"
                tone={(quote.totals.marginCny ?? 0) < 0 ? "warn" : undefined}
                value={formatCny(quote.totals.marginCny)}
              />
              <Metric label="毛利率" value={formatPercent(quote.totals.marginRate)} />
            </div>
            {quote.totals.linesWithoutQuantity > 0 ? (
              <p className="mt-2 text-xs text-stone-600">
                {quote.totals.linesWithoutQuantity} 行只报单价（未填数量），未计入金额与毛利。
              </p>
            ) : null}
            {quote.totals.linesWithoutCost > 0 ? (
              <p className="mt-1 text-xs text-stone-600">
                {quote.totals.linesWithoutCost} 行没有成本快照，未计入成本与毛利合计。
              </p>
            ) : null}
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <h3 className="font-semibold text-stone-950">报价明细</h3>
            <div className="mt-3 space-y-3">
              {quote.items.map((item) => (
                <div className="rounded-2xl border border-white/26 bg-white/20 p-3" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-stone-950">
                        <span className="font-mono">{item.fabric.code}</span>
                        <span className="truncate">{item.fabric.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-stone-600">
                        {[
                          item.colorOrRemark,
                          item.quantity ? `数量 ${item.quantity}${item.unit ?? ""}` : "只报单价",
                          item.minimumOrderQty ? `起订 ${item.minimumOrderQty}` : null,
                          item.leadTime ? `交期 ${item.leadTime}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "无备注"}
                      </div>
                      {item.fabricSupplierQuote ? (
                        <div className="mt-1 text-xs text-stone-500">
                          参考货源报价 {item.fabricSupplierQuote.purchasePrice}{" "}
                          {item.fabricSupplierQuote.currency}/{item.fabricSupplierQuote.pricingUnit}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-semibold text-stone-950">
                        {formatMoney(item.amounts.unitPrice, quote.currency)}
                        <span className="ml-1 text-xs font-normal text-stone-600">
                          /{item.unit ?? "单位"}
                        </span>
                      </div>
                      <div className="text-xs text-stone-600">
                        含税 {formatMoney(item.amounts.taxInclusiveUnitPrice, quote.currency)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/24 pt-2 text-xs text-stone-600">
                    <span>
                      金额{" "}
                      <span className="font-medium text-stone-950">
                        {item.amounts.taxInclusiveAmount === null
                          ? "—"
                          : formatMoney(item.amounts.taxInclusiveAmount, quote.currency)}
                      </span>
                    </span>
                    <span>
                      单位成本 <span className="font-medium text-stone-950">{formatCny(item.amounts.unitCostCny)}</span>
                    </span>
                    <span>
                      单位毛利 <span className="font-medium text-stone-950">{formatCny(item.amounts.unitMarginCny)}</span>
                    </span>
                    <span>
                      毛利率 <span className="font-medium text-stone-950">{formatPercent(item.amounts.marginRate)}</span>
                    </span>
                    <span>
                      税率 <span className="font-medium text-stone-950">{(item.amounts.taxRate * 100).toFixed(2)}%</span>
                    </span>
                  </div>
                  {item.remark ? (
                    <div className="mt-2 rounded-xl bg-white/28 px-3 py-2 text-xs text-stone-700">{item.remark}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-white/24 px-6 py-4 text-xs text-stone-600">
          <span>
            创建于 {formatQuoteDate(quote.createdAt)}
            {quote.sentAt ? ` · 发送于 ${formatQuoteDate(quote.sentAt)}` : ""}
            {quote.decidedAt ? ` · 结案于 ${formatQuoteDate(quote.decidedAt)}` : ""}
          </span>
          <button
            className="h-9 rounded-2xl border border-white/30 bg-white/24 px-4 text-sm text-stone-800 transition hover:bg-white/40"
            onClick={onClose}
            type="button"
          >
            关闭
          </button>
        </div>
      </aside>
    </div>
  );
}
