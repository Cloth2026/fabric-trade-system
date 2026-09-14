"use client";

import { Building2, CircleDollarSign, LoaderCircle, Search, Star, Trash2, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { FieldError, GlassInput, GlassSelect, PanelTitle } from "@/components/form/glass-form-controls";
import type { ConfigOption, SupplierSearchItem } from "@/lib/api/fabric-client";
import { searchSuppliers } from "@/lib/api/fabric-client";
import type { FabricFormState, FieldErrors } from "./create-fabric-state";
import { addSupplierToDraft, removeSupplierFromDraft, setPreferredSupplier } from "./create-fabric-state";

export function SupplierPicker({
  label,
  placeholder,
  selectedName,
  excludedIds = [],
  onSelect,
  onClear,
}: {
  label: string;
  placeholder: string;
  selectedName?: string;
  excludedIds?: string[];
  onSelect: (supplier: SupplierSearchItem) => void;
  onClear?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SupplierSearchItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || selectedName) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        setResults(await searchSuppliers(query, controller.signal));
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setError("供应商加载失败，请重新搜索");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, selectedName]);

  return (
    <div
      className="relative text-sm"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span className="text-stone-600">{label}</span>
      {selectedName ? (
        <div className="mt-1 flex h-10 items-center justify-between rounded-xl border border-white/28 bg-white/32 px-3">
          <span className="truncate font-medium text-stone-950">{selectedName}</span>
          {onClear ? (
            <button aria-label="清除供应商" className="rounded-lg p-1 text-stone-500 transition hover:bg-white/50 hover:text-stone-950" onClick={onClear} type="button">
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-1 flex h-10 items-center gap-2 rounded-xl border border-white/28 bg-white/24 px-3 transition focus-within:border-blue-400/70 focus-within:bg-white/34">
            {loading ? <LoaderCircle className="size-4 animate-spin text-blue-600" /> : <Search className="size-4 text-stone-500" />}
            <input
              className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/62"
              onChange={(event) => {
                setQuery(event.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              value={query}
            />
          </div>
          {open ? (
            <div className="absolute left-0 right-0 top-[66px] z-50 max-h-60 overflow-auto rounded-2xl border border-white/38 bg-white/78 p-1.5 text-stone-900 shadow-[0_24px_70px_rgba(22,18,14,0.24)] backdrop-blur-3xl">
              {error ? <div className="px-3 py-2 text-red-700">{error}</div> : null}
              {!error && !loading && results.filter((supplier) => !excludedIds.includes(supplier.id)).length === 0 ? (
                <div className="px-3 py-2 text-stone-500">没有匹配的可用供应商</div>
              ) : null}
              {results
                .filter((supplier) => !excludedIds.includes(supplier.id))
                .map((supplier) => (
                  <button
                    className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-white/56"
                    key={supplier.id}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onSelect(supplier);
                      setQuery("");
                      setOpen(false);
                    }}
                    type="button"
                  >
                    <span>
                      <span className="block font-medium text-stone-950">{supplier.name}</span>
                      <span className="mt-0.5 block text-xs text-stone-500">{[supplier.contactName, supplier.phone].filter(Boolean).join(" · ") || "暂无联系人信息"}</span>
                    </span>
                    <Building2 className="size-4 text-stone-500" />
                  </button>
                ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function FabricSupplierFields({
  state,
  setState,
  sampleStatusOptions,
  errors,
}: {
  state: FabricFormState;
  setState: Dispatch<SetStateAction<FabricFormState>>;
  sampleStatusOptions: ConfigOption[];
  errors: FieldErrors;
}) {
  const [supplierError, setSupplierError] = useState("");
  const [expandedQuotes, setExpandedQuotes] = useState<string[]>([]);

  const updateSupplier = (draftId: string, updater: (supplier: FabricFormState["suppliers"][number]) => FabricFormState["suppliers"][number]) => {
    setState((current) => ({
      ...current,
      suppliers: current.suppliers.map((supplier) => (supplier.id === draftId ? updater(supplier) : supplier)),
    }));
  };

  return (
    <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PanelTitle icon={Building2} tone="emerald" title="多供应商货源" description="同一面料可关联多家供应商，每家可保存独立货号、样品状态和首次报价。" />
        <div className="w-full xl:max-w-sm">
          <SupplierPicker
            excludedIds={state.suppliers.map((supplier) => supplier.supplierId)}
            label="搜索并添加供应商"
            onSelect={(supplier) => {
              setState((current) => {
                const result = addSupplierToDraft(current, supplier);
                setSupplierError(result.error ?? "");
                return result.state;
              });
            }}
            placeholder="输入供应商名称"
          />
          <FieldError error={supplierError || errors.suppliers} />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {state.suppliers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/38 bg-white/12 px-4 py-6 text-center text-sm text-stone-600">暂未添加供应商，可先保存轻档案后补全。</div>
        ) : null}

        {state.suppliers.map((supplier, index) => {
          const quoteExpanded = expandedQuotes.includes(supplier.id);
          const quoteErrorPrefix = `suppliers.${index}.initialQuote`;
          return (
            <article className="rounded-2xl border border-white/34 bg-white/24 p-4" key={supplier.id}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-stone-950">{supplier.supplierName}</h4>
                    {supplier.isPreferred ? <span className="rounded-full bg-amber-100/70 px-2 py-0.5 text-xs text-amber-900">首选</span> : null}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">供应商关系 #{index + 1}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-sm transition ${supplier.isPreferred ? "border-amber-300/60 bg-amber-100/60 text-amber-900" : "border-white/30 bg-white/24 text-stone-700 hover:bg-white/42"}`}
                    onClick={() => setState((current) => setPreferredSupplier(current, supplier.id))}
                    type="button"
                  >
                    <Star className={`size-4 ${supplier.isPreferred ? "fill-current" : ""}`} />
                    设为首选
                  </button>
                  <button
                    aria-label={`移除${supplier.supplierName}`}
                    className="flex size-9 items-center justify-center rounded-xl border border-rose-200/50 bg-rose-50/30 text-rose-700 transition hover:bg-rose-100/60"
                    onClick={() => setState((current) => removeSupplierFromDraft(current, supplier.id))}
                    type="button"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <GlassInput label="供应商货号" value={supplier.supplierFabricCode} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, supplierFabricCode: value }))} placeholder="供应商内部货号" />
                <GlassSelect label="样品状态" options={sampleStatusOptions} value={supplier.sampleStatus} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, sampleStatus: value }))} />
                <GlassInput label="质量差异" value={supplier.qualityDifferences} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, qualityDifferences: value }))} placeholder="与标准样的差异" />
                <GlassInput label="供应关系备注" value={supplier.remarks} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, remarks: value }))} placeholder="供货稳定性、沟通事项等" />
              </div>

              <button
                className="mt-4 flex h-9 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-3 text-sm text-stone-700 transition hover:bg-white/42"
                onClick={() => setExpandedQuotes((current) => (current.includes(supplier.id) ? current.filter((id) => id !== supplier.id) : [...current, supplier.id]))}
                type="button"
              >
                <CircleDollarSign className="size-4 text-emerald-700" />
                {quoteExpanded ? "收起首次报价" : "填写首次报价（可选）"}
              </button>

              {quoteExpanded ? (
                <div className="mt-3 grid gap-3 rounded-2xl border border-emerald-200/34 bg-emerald-50/16 p-3 md:grid-cols-2 xl:grid-cols-4">
                  <GlassInput label="采购价" required type="number" value={supplier.initialQuote.purchasePrice} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, initialQuote: { ...item.initialQuote, purchasePrice: value } }))} placeholder="0.00" error={errors[`${quoteErrorPrefix}.purchasePrice`]} />
                  <GlassInput label="币种" value={supplier.initialQuote.currency} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, initialQuote: { ...item.initialQuote, currency: value.toUpperCase().slice(0, 3) } }))} placeholder="CNY" maxLength={3} error={errors[`${quoteErrorPrefix}.currency`]} />
                  <GlassInput label="MOQ" value={supplier.initialQuote.minimumOrderQty} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, initialQuote: { ...item.initialQuote, minimumOrderQty: value } }))} placeholder="如 300kg" />
                  <GlassInput label="交期" value={supplier.initialQuote.leadTime} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, initialQuote: { ...item.initialQuote, leadTime: value } }))} placeholder="如 7-10天" />
                  <GlassInput label="联系人" value={supplier.initialQuote.contactName} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, initialQuote: { ...item.initialQuote, contactName: value } }))} placeholder="报价联系人" />
                  <GlassInput label="报价日期" type="date" value={supplier.initialQuote.quoteDate} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, initialQuote: { ...item.initialQuote, quoteDate: value } }))} />
                  <div className="md:col-span-2">
                    <GlassInput label="报价备注" value={supplier.initialQuote.remarks} onChange={(value) => updateSupplier(supplier.id, (item) => ({ ...item, initialQuote: { ...item.initialQuote, remarks: value } }))} placeholder="税费、运费、价格有效期等" />
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
