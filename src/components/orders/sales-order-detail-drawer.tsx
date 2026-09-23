"use client";

import {
  AlertCircle,
  ArrowRight,
  Ban,
  Building2,
  Calculator,
  ClipboardList,
  LoaderCircle,
  Pencil,
  Save,
  Timer,
  Truck,
  X,
} from "lucide-react";
import { useState } from "react";
import type { SalesOrderDetailRecord } from "@/lib/api/sales-order-client";
import type { SalesOrderStatus } from "@/server/sales-orders/constants";
import {
  canBookSalesOrderDelivery,
  canEditSalesOrder,
  salesOrderDeliveryStatusLabels,
  salesOrderStatusLabels,
} from "@/server/sales-orders/constants";
import {
  formatCny,
  formatMoney,
  formatPercent,
  formatQuoteDate,
} from "@/components/quotes/customer-quote-prototype-data";
import {
  orderDeliveryLabel,
  orderDeliveryTones,
  orderStatusLabel,
  orderStatusTones,
  orderTransitions,
} from "./sales-order-form-data";

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

export function SalesOrderDetailDrawer({
  order,
  loading,
  error,
  onClose,
  onStatusChange,
  onSaveDelivery,
  onEdit,
}: {
  order: SalesOrderDetailRecord | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onStatusChange: (status: SalesOrderStatus, cancelReason?: string) => Promise<void>;
  onSaveDelivery: (items: Array<{ id: string; deliveredQuantity: string }>) => Promise<void>;
  onEdit: (order: SalesOrderDetailRecord) => void;
}) {
  const [statusBusy, setStatusBusy] = useState<SalesOrderStatus | null>(null);
  const [pendingCancel, setPendingCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [deliveryDraft, setDeliveryDraft] = useState<Record<string, string>>({});
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [draftSource, setDraftSource] = useState("");

  // The booking inputs follow the stored order: every time the record is
  // reloaded (status change, edit, delivery save) the draft is rebuilt from
  // it, so a stale number can never be sent back.
  const draftSourceKey = `${order?.id ?? ""}-${order?.updatedAt ?? ""}`;
  if (draftSourceKey !== draftSource) {
    setDraftSource(draftSourceKey);
    setDeliveryDraft(
      Object.fromEntries(
        (order?.items ?? []).map((item) => [item.id, Number(item.deliveredQuantity).toString()]),
      ),
    );
    setPendingCancel(false);
    setCancelReason("");
  }

  const deliveredValue = (order?.items ?? []).reduce(
    (sum, item) => sum + Number(item.amounts.delivery.deliveredQuantity ?? 0) * Number(item.unitPrice),
    0,
  );

  if (!order) return null;

  const transitions = orderTransitions(order.status);
  const editable = canEditSalesOrder(order.status);
  const deliverable = canBookSalesOrderDelivery(order.status);

  const changeStatus = async (status: SalesOrderStatus) => {
    if (status === "cancelled" && !cancelReason.trim()) {
      setPendingCancel(true);
      return;
    }
    setStatusBusy(status);
    try {
      await onStatusChange(status, status === "cancelled" ? cancelReason.trim() : undefined);
      setPendingCancel(false);
      setCancelReason("");
    } finally {
      setStatusBusy(null);
    }
  };

  const submitDelivery = async () => {
    setDeliveryBusy(true);
    try {
      await onSaveDelivery(
        order.items.map((item) => ({
          id: item.id,
          deliveredQuantity: deliveryDraft[item.id] ?? "0",
        })),
      );
    } finally {
      setDeliveryBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-stone-950/26 backdrop-blur-md"
      data-testid="sales-order-detail-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        aria-label={`订单 ${order.code} 详情`}
        className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/44 shadow-[0_36px_120px_rgba(26,22,18,0.32),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-300/36 bg-violet-500/12 text-violet-700 shadow-inner shadow-white/24">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-stone-500">
                销售订单
                <span className={`rounded-full px-2 py-0.5 text-xs ${orderStatusTones[order.status]}`}>
                  {orderStatusLabel(order.status)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs ${orderDeliveryTones[order.delivery.deliveryStatus]}`}>
                  {orderDeliveryLabel(order.delivery.deliveryStatus)}
                </span>
                {order.isOverdue ? (
                  <span className="flex items-center gap-1 rounded-full bg-rose-50/82 px-2 py-0.5 text-xs text-rose-800">
                    <Timer className="size-3" />已超交期 {order.overdueDays} 天
                  </span>
                ) : null}
              </div>
              <h2 className="mt-1 font-mono text-2xl font-semibold text-stone-950">{order.code}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-stone-700">
                <Building2 className="size-3.5" />
                {order.customer.name}
                {order.contact ? ` · ${order.contact.name}` : ""}
                {order.sourceQuote ? ` · 源自报价 ${order.sourceQuote.code}` : ""}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editable ? (
              <button
                aria-label="编辑订单"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-white/30 bg-white/26 px-3 text-sm text-stone-800 transition hover:bg-white/44"
                onClick={() => onEdit(order)}
                type="button"
              >
                <Pencil className="size-3.5" />编辑
              </button>
            ) : null}
            <button
              aria-label="关闭订单详情"
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
              <p className="mt-2 text-sm text-stone-600">订单已结束，没有可推进的状态。</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {transitions.map((status) => (
                  <button
                    className={`flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-white transition hover:-translate-y-0.5 disabled:opacity-60 ${
                      status === "cancelled"
                        ? "bg-rose-700/88 hover:bg-rose-800"
                        : "bg-stone-950/90 hover:bg-stone-800"
                    }`}
                    disabled={statusBusy !== null}
                    key={status}
                    onClick={() => changeStatus(status)}
                    type="button"
                  >
                    {statusBusy === status ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : status === "cancelled" ? (
                      <Ban className="size-3.5" />
                    ) : (
                      <ArrowRight className="size-3.5" />
                    )}
                    标记为「{salesOrderStatusLabels[status]}」
                  </button>
                ))}
              </div>
            )}

            {pendingCancel ? (
              <div className="mt-3 rounded-2xl border border-rose-200/60 bg-rose-50/56 p-3">
                <label className="text-sm text-stone-700" htmlFor="order-cancel-reason">
                  取消原因（必填）
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-white/40 bg-white/70 p-2 text-sm text-stone-950 outline-none"
                  id="order-cancel-reason"
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="如 客户临时取消此批"
                  rows={2}
                  value={cancelReason}
                />
                <div className="mt-2 flex gap-2">
                  <button
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-rose-700/90 px-3 text-sm font-medium text-white transition hover:bg-rose-800 disabled:opacity-60"
                    disabled={statusBusy !== null || !cancelReason.trim()}
                    onClick={() => changeStatus("cancelled")}
                    type="button"
                  >
                    确认取消订单
                  </button>
                  <button
                    className="h-9 rounded-xl border border-white/40 bg-white/40 px-3 text-sm text-stone-700"
                    onClick={() => {
                      setPendingCancel(false);
                      setCancelReason("");
                    }}
                    type="button"
                  >
                    放弃
                  </button>
                </div>
              </div>
            ) : null}

            {order.status === "cancelled" && order.cancelReason ? (
              <p className="mt-3 text-sm text-rose-800">取消原因：{order.cancelReason}</p>
            ) : null}
            <p className="mt-2 text-xs text-stone-600">
              超交期只在列表与此处红字提示，不会自动改单；草稿与已确认可以改单，发货后只读。
            </p>
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <h3 className="font-semibold text-stone-950">单据信息</h3>
            <div className="mt-2 grid gap-x-6 md:grid-cols-2">
              <div>
                <InfoRow
                  label="计价币种"
                  value={`${order.currency}${order.currency === "CNY" ? "（人民币）" : "（美元）"}`}
                />
                <InfoRow
                  label="汇率"
                  value={order.currency === "CNY" ? "1（人民币）" : `1 ${order.currency} = ${order.exchangeRate} CNY`}
                />
                <InfoRow label="下单日期" value={formatQuoteDate(order.orderDate)} />
                <InfoRow
                  label="客户要求交期"
                  value={order.requestedDeliveryDate ? formatQuoteDate(order.requestedDeliveryDate) : "未约定"}
                />
                <InfoRow label="明细行数" value={`${order.items.length} 行`} />
              </div>
              <div>
                <InfoRow label="贸易条款" value={order.priceTerms ?? "—"} />
                <InfoRow label="交货条款" value={order.deliveryTerms ?? "—"} />
                <InfoRow label="付款条款" value={order.paymentTerms ?? "—"} />
                <InfoRow label="默认税率" value={order.taxRate ? `${Number(order.taxRate) * 100}%` : "—"} />
                <InfoRow
                  label="收货信息"
                  value={
                    [order.receiverName, order.receiverPhone, order.receiverAddress].filter(Boolean).join(" · ") ||
                    "未填写"
                  }
                />
              </div>
            </div>
            {order.remark ? (
              <div className="mt-3 rounded-xl bg-white/28 px-3 py-2 text-sm text-stone-700">{order.remark}</div>
            ) : null}
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <div className="flex items-center gap-2">
              <Calculator className="size-4 text-emerald-600" />
              <h3 className="font-semibold text-stone-950">金额汇总</h3>
              <span className="rounded-full bg-white/40 px-2 py-0.5 text-xs text-stone-700">
                {order.items.length} 行
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
              <Metric label={`不含税（${order.currency}）`} value={formatMoney(order.totals.netAmount, order.currency)} />
              <Metric label="税额" value={formatMoney(order.totals.taxAmount, order.currency)} />
              <Metric label="含税合计" value={formatMoney(order.totals.taxInclusiveAmount, order.currency)} />
              <Metric label="成本（CNY）" value={formatCny(order.totals.costCny)} />
              <Metric
                label="毛利（CNY）"
                tone={(order.totals.marginCny ?? 0) < 0 ? "warn" : undefined}
                value={formatCny(order.totals.marginCny)}
              />
              <Metric label="毛利率" value={formatPercent(order.totals.marginRate)} />
            </div>
            {order.totals.linesWithoutCost > 0 ? (
              <p className="mt-2 text-xs text-stone-600">
                {order.totals.linesWithoutCost} 行没有成本快照，未计入成本与毛利合计。
              </p>
            ) : null}
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <h3 className="font-semibold text-stone-950">订单明细</h3>
            <div className="mt-3 space-y-3">
              {order.items.map((item) => {
                const delivery = item.amounts.delivery;
                return (
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
                            item.quantity ? `数量 ${item.quantity}${item.unit ?? ""}` : "数量待补",
                            item.leadTime ? `交期 ${item.leadTime}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "无备注"}
                        </div>
                        {item.fabricSupplier ? (
                          <div className="mt-1 text-xs text-stone-500">
                            采购货源{" "}
                            {[item.fabricSupplier.supplier?.name, item.fabricSupplier.supplierFabricCode]
                              .filter(Boolean)
                              .join(" · ") || "未命名货源"}
                            {item.fabricSupplierQuote
                              ? ` · 参考报价 ${item.fabricSupplierQuote.purchasePrice} ${item.fabricSupplierQuote.currency}/${item.fabricSupplierQuote.pricingUnit}`
                              : ""}
                          </div>
                        ) : null}
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold text-stone-950">
                          {formatMoney(item.amounts.unitPrice, order.currency)}
                          <span className="ml-1 text-xs font-normal text-stone-600">/{item.unit ?? "单位"}</span>
                        </div>
                        <div className="text-xs text-stone-600">
                          含税 {formatMoney(item.amounts.taxInclusiveUnitPrice, order.currency)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/24 pt-2 text-xs text-stone-600">
                      <span>
                        金额{" "}
                        <span className="font-medium text-stone-950">
                          {item.amounts.taxInclusiveAmount === null
                            ? "数量待补"
                            : formatMoney(item.amounts.taxInclusiveAmount, order.currency)}
                        </span>
                      </span>
                      <span>
                        已交付{" "}
                        <span className="font-medium text-stone-950">
                          {delivery.deliveredQuantity}
                          {item.quantity ? ` / ${delivery.quantity}` : ""}
                          {item.unit ?? ""}
                        </span>
                        {delivery.remainingQuantity !== null ? ` · 未交付 ${delivery.remainingQuantity}` : ""}
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
                );
              })}
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="size-4 text-cyan-600" />
                <h3 className="font-semibold text-stone-950">交付登记</h3>
                <span className="rounded-full bg-white/40 px-2 py-0.5 text-xs text-stone-700">
                  {salesOrderDeliveryStatusLabels[order.delivery.deliveryStatus]}
                </span>
              </div>
              <span className="text-xs text-stone-600">
                已完成 {order.delivery.deliveredLines} 行 / 部分 {order.delivery.partialLines} 行 / 未交付{" "}
                {order.delivery.pendingLines} 行
              </span>
            </div>

            {!deliverable ? (
              <p className="mt-2 text-sm text-stone-600">
                备货中与已发货可以登记交付数量；草稿或已确认还没有货可发。
              </p>
            ) : (
              <>
                <div className="mt-3 space-y-2">
                  {order.items.map((item) => (
                    <div className="flex flex-wrap items-center gap-3 text-sm" key={item.id}>
                      <span className="w-40 shrink-0 truncate text-stone-700">
                        <span className="font-mono">{item.fabric.code}</span> · {item.fabric.name}
                      </span>
                      <span className="w-28 shrink-0 text-xs text-stone-600">
                        订单数量 {item.quantity ?? "待补"}
                        {item.unit ?? ""}
                      </span>
                      <input
                        aria-label={`登记 ${item.fabric.code} 已交付数量`}
                        className="h-9 w-32 rounded-xl border border-white/30 bg-white/34 px-3 text-stone-950 outline-none"
                        onChange={(event) =>
                          setDeliveryDraft((current) => ({ ...current, [item.id]: event.target.value }))
                        }
                        type="number"
                        value={deliveryDraft[item.id] ?? "0"}
                      />
                      <span className="text-xs text-stone-500">不得大于订单数量</span>
                    </div>
                  ))}
                </div>
                <button
                  className="mt-3 flex h-9 items-center gap-1.5 rounded-xl bg-stone-950/90 px-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60"
                  disabled={deliveryBusy}
                  onClick={submitDelivery}
                  type="button"
                >
                  {deliveryBusy ? <LoaderCircle className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                  保存交付数量
                </button>
                <p className="mt-2 text-xs text-stone-600">
                  交付登记只在本模块内部计数，暂不联动库存。已交付货值约 {formatMoney(deliveredValue, order.currency)}
                </p>
              </>
            )}
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-white/24 px-6 py-4 text-xs text-stone-600">
          <span>
            创建于 {formatQuoteDate(order.createdAt)}
            {order.confirmedAt ? ` · 确认于 ${formatQuoteDate(order.confirmedAt)}` : ""}
            {order.completedAt ? ` · 完成于 ${formatQuoteDate(order.completedAt)}` : ""}
            {order.cancelledAt ? ` · 取消于 ${formatQuoteDate(order.cancelledAt)}` : ""}
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
