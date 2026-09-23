"use client";

import {
  AlertCircle,
  Calculator,
  ClipboardList,
  Coins,
  LoaderCircle,
  MapPin,
  PackagePlus,
  Save,
  Sparkles,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { FormPanel, GlassInput, GlassTextarea, ReadonlyField } from "@/components/form/glass-form-controls";
import { getOrderFieldErrors } from "@/lib/api/sales-order-client";
import type { SalesOrderUpdatePayload } from "@/lib/api/sales-order-client";
import { computeSalesOrderItemFigures, computeSalesOrderTotals } from "@/lib/sales-order-math";
import type { SalesOrderCurrency } from "@/server/sales-orders/constants";
import { salesOrderCurrencyOptions } from "@/server/sales-orders/constants";
import {
  formatCny,
  formatMoney,
  formatPercent,
} from "@/components/quotes/customer-quote-prototype-data";
import {
  PurchaseQuotePicker,
  QuoteContactPicker,
  QuoteCustomerPicker,
  QuoteFabricPicker,
  type PurchaseQuoteOption,
} from "@/components/quotes/customer-quote-pickers";
import { FabricSupplierSourcePicker } from "./sales-order-pickers";
import {
  createEmptyOrderFormState,
  createEmptyOrderItem,
  orderFormToPayload,
  orderFormToUpdatePayload,
  validateOrderForm,
  type OrderFormErrors,
  type OrderFormState,
  type OrderItemDraft,
} from "./sales-order-form-data";

// Same rule as the server: cost is always stored in CNY, so a purchase quote
// quoted in the order currency is converted with this order's own rate and
// anything else has to be typed in by hand.
function costFromPurchaseQuote(quote: PurchaseQuoteOption, currency: string, exchangeRate: string) {
  const price = Number(quote.purchasePrice);
  if (!Number.isFinite(price)) return "";
  if (quote.currency === "CNY") return String(price);
  if (quote.currency === currency) {
    const rate = Number(exchangeRate || "1");
    if (!Number.isFinite(rate)) return "";
    return String(Math.round(price * rate * 100) / 100);
  }
  return "";
}

function ItemRow({
  item,
  index,
  canRemove,
  currency,
  exchangeRate,
  defaultTaxRate,
  error,
  onPatch,
  onRemove,
}: {
  item: OrderItemDraft;
  index: number;
  canRemove: boolean;
  currency: SalesOrderCurrency;
  exchangeRate: string;
  defaultTaxRate: string;
  error?: string;
  onPatch: (changes: Partial<OrderItemDraft>) => void;
  onRemove: () => void;
}) {
  const figures = useMemo(
    () =>
      computeSalesOrderItemFigures(
        {
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: item.costPrice,
          taxRate: item.taxRate === "" ? undefined : Number(item.taxRate) / 100,
        },
        {
          currency,
          exchangeRate,
          taxRate: item.taxRate === "" ? Number(defaultTaxRate || "0") / 100 : undefined,
        },
      ),
    [currency, defaultTaxRate, exchangeRate, item.costPrice, item.quantity, item.taxRate, item.unitPrice],
  );

  return (
    <div className="rounded-2xl border border-white/26 bg-white/16 p-3 md:col-span-2 xl:col-span-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-600">明细行 {index + 1}</span>
        <span className="text-xs text-stone-500">
          不含税 {formatMoney(figures.unitPrice, currency)} / 含税{" "}
          {formatMoney(figures.taxInclusiveUnitPrice, currency)}
        </span>
      </div>

      <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <QuoteFabricPicker
          error={error}
          onChange={(next) =>
            onPatch({
              fabricId: next.id,
              fabricCode: next.fabric.code ?? "",
              fabricName: next.fabric.name ?? "",
              fabricUnit: next.fabric.pricingUnit ?? "",
              fabricSupplierId: "",
              fabricSupplierLabel: "",
              fabricSupplierQuoteId: "",
              purchaseQuoteLabel: "",
              costPrice: "",
            })
          }
          value={{ id: item.fabricId, label: item.fabricId ? `${item.fabricCode} · ${item.fabricName}` : "" }}
        />
        <FabricSupplierSourcePicker
          disabled={!item.fabricId}
          fabricId={item.fabricId}
          onChange={(next) => onPatch({ fabricSupplierId: next.id, fabricSupplierLabel: next.label })}
          value={{ id: item.fabricSupplierId, label: item.fabricSupplierLabel }}
        />
        <PurchaseQuotePicker
          disabled={!item.fabricId}
          fabricId={item.fabricId}
          onChange={(next) => {
            const cost = next.quote ? costFromPurchaseQuote(next.quote, currency, exchangeRate) : "";
            onPatch({
              fabricSupplierQuoteId: next.id,
              purchaseQuoteLabel: next.label,
              ...(next.quote
                ? { costPrice: cost, leadTime: item.leadTime || next.quote.leadTime || "" }
                : {}),
            });
          }}
          value={{ id: item.fabricSupplierQuoteId, label: item.purchaseQuoteLabel }}
        />
        <GlassInput
          label="数量"
          onChange={(value) => onPatch({ quantity: value })}
          placeholder={item.fabricUnit ? `单位 ${item.fabricUnit}` : "如 500"}
          required
          type="number"
          value={item.quantity}
        />
        <GlassInput
          label={`单价（${currency}）`}
          onChange={(value) => onPatch({ unitPrice: value })}
          placeholder="如 12.5"
          required
          type="number"
          value={item.unitPrice}
        />
        <GlassInput
          label="参考成本（CNY）"
          onChange={(value) => onPatch({ costPrice: value })}
          placeholder="选报价自动带出，可覆盖"
          type="number"
          value={item.costPrice}
        />
        <GlassInput
          label="行税率（%）"
          onChange={(value) => onPatch({ taxRate: value })}
          placeholder={defaultTaxRate ? `留空则用 ${defaultTaxRate}%` : "如 13"}
          type="number"
          value={item.taxRate}
        />
        <GlassInput
          label="行交期"
          onChange={(value) => onPatch({ leadTime: value })}
          placeholder="如 15 天"
          value={item.leadTime}
        />
        <GlassInput
          label="色号 / 备注"
          onChange={(value) => onPatch({ colorOrRemark: value })}
          placeholder="如 藏青 / 大货"
          value={item.colorOrRemark}
        />
        <div className="flex items-end">
          <button
            aria-label={`删除第${index + 1}行明细`}
            className="flex h-10 items-center gap-1.5 rounded-xl border border-white/30 bg-white/24 px-3 text-sm text-stone-700 transition hover:bg-white/40 disabled:opacity-45"
            disabled={!canRemove}
            onClick={onRemove}
            type="button"
          >
            <Trash2 className="size-4" />删除
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 border-t border-white/24 pt-2 text-xs text-stone-600">
        <span>
          行金额 <span className="font-medium text-stone-950">{formatMoney(figures.taxInclusiveAmount, currency)}</span>
        </span>
        <span>
          折算单价 <span className="font-medium text-stone-950">{formatCny(figures.unitPriceCny)}</span>
        </span>
        <span>
          单位毛利 <span className="font-medium text-stone-950">{formatCny(figures.unitMarginCny)}</span>
        </span>
        <span>
          毛利率 <span className="font-medium text-stone-950">{formatPercent(figures.marginRate)}</span>
        </span>
      </div>
    </div>
  );
}

export function SalesOrderFormDrawer({
  mode,
  initialState,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  initialState?: OrderFormState;
  onClose: () => void;
  onSave: (payload: SalesOrderUpdatePayload) => Promise<void>;
}) {
  const [state, setState] = useState<OrderFormState>(() => initialState ?? createEmptyOrderFormState());
  const [errors, setErrors] = useState<OrderFormErrors>({});
  const [topError, setTopError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patch = (changes: Partial<OrderFormState>) =>
    setState((current) => ({ ...current, ...changes }));

  const patchItem = (key: string, changes: Partial<OrderItemDraft>) =>
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    }));

  const addItem = () =>
    setState((current) => ({ ...current, items: [...current.items, createEmptyOrderItem()] }));

  const removeItem = (key: string) =>
    setState((current) => ({
      ...current,
      items: current.items.length <= 1 ? current.items : current.items.filter((item) => item.key !== key),
    }));

  const changeCurrency = (currency: SalesOrderCurrency) =>
    setState((current) => ({
      ...current,
      currency,
      exchangeRate: currency === "CNY" ? "1" : current.exchangeRate === "1" ? "" : current.exchangeRate,
    }));

  const totals = useMemo(() => {
    const figures = state.items
      .filter((item) => item.fabricId.trim())
      .map((item) =>
        computeSalesOrderItemFigures(
          {
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            costPrice: item.costPrice,
            taxRate: item.taxRate === "" ? undefined : Number(item.taxRate) / 100,
          },
          {
            currency: state.currency,
            exchangeRate: state.exchangeRate,
            taxRate: item.taxRate === "" ? Number(state.taxRate || "0") / 100 : undefined,
          },
        ),
      );
    return computeSalesOrderTotals(figures, {
      currency: state.currency,
      exchangeRate: state.exchangeRate,
    });
  }, [state.currency, state.exchangeRate, state.items, state.taxRate]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const clientErrors = validateOrderForm(state);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setTopError("订单数量必填；请先完成标记为必填的字段");
      return;
    }

    setIsSubmitting(true);
    setTopError("");
    setErrors({});

    try {
      await onSave(mode === "create" ? orderFormToPayload(state) : orderFormToUpdatePayload(state));
    } catch (error) {
      const fieldErrors = getOrderFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors as OrderFormErrors);
        setTopError("请检查标记字段后重新保存");
      } else {
        setTopError(error instanceof Error ? error.message : "保存失败，请稍后重试");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-md fabric-create-backdrop-enter"
      data-testid="sales-order-form-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <aside
        aria-label={mode === "create" ? "新增销售订单" : "编辑销售订单"}
        className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/42 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl fabric-create-drawer-enter"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-300/36 bg-violet-500/12 text-violet-700 shadow-inner shadow-white/24">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Sparkles className="size-4 text-violet-600" />销售订单
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">
                {mode === "create" ? "新增销售订单" : "编辑订单"}
              </h2>
            </div>
          </div>
          <button
            aria-label="关闭订单表单"
            className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {topError ? (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900">
              <AlertCircle className="size-4 shrink-0" />
              {topError}
            </div>
          ) : null}

          <FormPanel
            icon={Coins}
            tone="violet"
            title="订单抬头"
            description="订单号自动生成。币种决定金额单位，成本恒为人民币并按汇率折算毛利。"
          >
            <QuoteCustomerPicker
              error={errors.customerId}
              onChange={(next) =>
                patch({
                  customerId: next.id,
                  customerName: next.label,
                  contactId: "",
                  contactName: "",
                  paymentTerms: next.paymentTerms || "",
                })
              }
              value={{ id: state.customerId, label: state.customerName }}
            />
            <QuoteContactPicker
              customerId={state.customerId}
              onChange={(next) => patch({ contactId: next.id, contactName: next.label })}
              value={{ id: state.contactId, label: state.contactName }}
            />
            <div className="text-sm">
              <span className="text-stone-600">计价币种</span>
              <div className="mt-1 flex rounded-xl border border-white/28 bg-white/24 p-1">
                {salesOrderCurrencyOptions.map((option) => (
                  <button
                    className={`flex-1 rounded-lg px-3 py-1.5 text-sm transition ${
                      state.currency === option.value
                        ? "bg-white/78 text-stone-950 shadow-sm"
                        : "text-stone-600 hover:bg-white/28"
                    }`}
                    key={option.value}
                    onClick={() => changeCurrency(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <GlassInput
              disabled={state.currency === "CNY"}
              error={errors.exchangeRate}
              label="汇率（1 外币 = ? CNY）"
              onChange={(value) => patch({ exchangeRate: value })}
              placeholder={state.currency === "CNY" ? "人民币固定为 1" : "如 7.2"}
              required={state.currency !== "CNY"}
              type="number"
              value={state.exchangeRate}
            />
            <GlassInput
              error={errors.orderDate}
              label="下单日期"
              onChange={(value) => patch({ orderDate: value })}
              type="date"
              value={state.orderDate}
            />
            <GlassInput
              error={errors.requestedDeliveryDate}
              label="客户要求交期"
              onChange={(value) => patch({ requestedDeliveryDate: value })}
              type="date"
              value={state.requestedDeliveryDate}
            />
            <GlassInput
              label="贸易条款"
              onChange={(value) => patch({ priceTerms: value })}
              placeholder="如 FOB Shanghai"
              value={state.priceTerms}
            />
            <GlassInput
              label="交货条款"
              onChange={(value) => patch({ deliveryTerms: value })}
              placeholder="如 送货到厂"
              value={state.deliveryTerms}
            />
            <GlassInput
              label="付款条款"
              onChange={(value) => patch({ paymentTerms: value })}
              placeholder="如 月结30天"
              value={state.paymentTerms}
            />
            <GlassInput
              error={errors.taxRate}
              label="默认税率（%）"
              onChange={(value) => patch({ taxRate: value })}
              placeholder="如 13"
              type="number"
              value={state.taxRate}
            />
            <ReadonlyField label="明细行不含税合计" value={formatMoney(totals.netAmount, state.currency)} />
            <ReadonlyField label="含税合计" value={formatMoney(totals.taxInclusiveAmount, state.currency)} />
          </FormPanel>

          <FormPanel icon={PackagePlus} tone="cyan" title="订单明细" description="同一面料可按色号分多行下单；数量必填且必须大于 0。">
            {state.items.map((item, index) => (
              <ItemRow
                canRemove={state.items.length > 1}
                currency={state.currency}
                defaultTaxRate={state.taxRate}
                error={errors.itemErrors?.[item.key]}
                exchangeRate={state.exchangeRate}
                index={index}
                item={item}
                key={item.key}
                onPatch={(changes) => patchItem(item.key, changes)}
                onRemove={() => removeItem(item.key)}
              />
            ))}
            <div className="md:col-span-2 xl:col-span-3">
              <button
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/30 bg-white/24 px-3 text-sm text-stone-800 transition hover:bg-white/40"
                onClick={addItem}
                type="button"
              >
                <PackagePlus className="size-4" />添加明细行
              </button>
            </div>
            {errors.items ? (
              <div className="text-xs text-red-700 md:col-span-2 xl:col-span-3">{errors.items}</div>
            ) : null}
          </FormPanel>

          <FormPanel icon={MapPin} tone="blue" title="收货信息" description="发货前可补录，不影响金额计算。">
            <GlassInput
              label="收货联系人"
              onChange={(value) => patch({ receiverName: value })}
              placeholder="如 王先生"
              value={state.receiverName}
            />
            <GlassInput
              label="联系电话"
              onChange={(value) => patch({ receiverPhone: value })}
              placeholder="如 13800000000"
              value={state.receiverPhone}
            />
            <div className="md:col-span-2 xl:col-span-3">
              <GlassInput
                label="收货地址"
                onChange={(value) => patch({ receiverAddress: value })}
                placeholder="如 上海市松江区xx路 xx 号仓库"
                value={state.receiverAddress}
              />
            </div>
          </FormPanel>

          <FormPanel icon={Calculator} tone="emerald" title="毛利预览" description="按当前汇率将售价折算为人民币后计算，仅供内部参考。">
            <ReadonlyField label="不含税金额" value={formatMoney(totals.netAmount, state.currency)} />
            <ReadonlyField label="税额" value={formatMoney(totals.taxAmount, state.currency)} />
            <ReadonlyField label="含税金额" value={formatMoney(totals.taxInclusiveAmount, state.currency)} />
            <ReadonlyField label="成本（CNY）" value={formatCny(totals.costCny)} />
            <ReadonlyField label="毛利（CNY）" value={formatCny(totals.marginCny)} />
            <ReadonlyField label="毛利率" value={formatPercent(totals.marginRate)} />
            {totals.linesWithoutCost > 0 ? (
              <div className="text-xs text-stone-600 md:col-span-2 xl:col-span-3">
                有 {totals.linesWithoutCost} 行未填成本，未计入成本与毛利合计。
              </div>
            ) : null}
          </FormPanel>

          <FormPanel icon={Sparkles} tone="amber" title="备注" description="客户特殊要求、包装要求等说明。">
            <div className="md:col-span-2 xl:col-span-3">
              <GlassTextarea
                label="订单备注"
                onChange={(value) => patch({ remark: value })}
                placeholder="如 需船样确认后再投产"
                value={state.remark}
              />
            </div>
          </FormPanel>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/24 px-6 py-4">
          <span className="flex items-center gap-1.5 text-xs text-stone-600">
            <Truck className="size-3.5" />
            {mode === "create" ? "保存后自动生成订单号，状态为「草稿」" : "草稿与已确认可以修改，保存后覆盖原有明细"}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="h-10 rounded-2xl border border-white/30 bg-white/24 px-4 text-sm text-stone-800 transition hover:bg-white/40 disabled:opacity-50"
              disabled={isSubmitting}
              onClick={onClose}
              type="button"
            >
              取消
            </button>
            <button
              className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60"
              disabled={isSubmitting}
              onClick={handleSubmit}
              type="button"
            >
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {mode === "create" ? "创建订单" : "保存修改"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
