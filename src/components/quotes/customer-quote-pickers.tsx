"use client";

import { Check, ChevronDown, LoaderCircle, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchCustomerContacts, fetchCustomers } from "@/lib/api/customer-client";
import { fetchFabricDetail, fetchFabrics, type FabricListItem } from "@/lib/api/fabric-client";

function useDebouncedValue(value: string, delay = 260) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

export type PickerOption = { id: string; label: string; note?: string };

export function SearchPicker({
  label,
  required,
  placeholder,
  selectedLabel,
  options,
  loading,
  error,
  hint,
  onSearch,
  onSelect,
  onClear,
  disabled,
}: {
  label: string;
  required?: boolean;
  placeholder: string;
  selectedLabel: string;
  options: PickerOption[];
  loading: boolean;
  error?: string;
  hint?: string;
  onSearch: (keyword: string) => void;
  onSelect: (option: PickerOption) => void;
  onClear?: () => void;
  disabled?: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(keyword);
  const searchRef = useRef(onSearch);

  useEffect(() => {
    searchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    if (!open) return;
    searchRef.current(debounced);
  }, [debounced, open]);

  return (
    <div className="relative text-sm">
      <span className="text-stone-600">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <button
        aria-expanded={open}
        className={`mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
          error
            ? "border-red-400/70"
            : open
              ? "border-white/48 bg-white/36"
              : "border-white/28 bg-white/24 hover:bg-white/32"
        }`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className={`truncate font-medium ${selectedLabel ? "text-stone-950" : "text-stone-500"}`}>
          {selectedLabel || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {selectedLabel && onClear ? (
            <X
              aria-label={`清空${label}`}
              className="size-3.5 rounded text-stone-500 hover:bg-white/44"
              onClick={(event) => {
                event.stopPropagation();
                onClear();
              }}
              role="button"
              tabIndex={0}
            />
          ) : null}
          <ChevronDown className={`size-4 text-stone-600 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-[68px] z-40 overflow-hidden rounded-2xl border border-white/38 bg-white/78 shadow-[0_24px_70px_rgba(22,18,14,0.24)] backdrop-blur-3xl">
          <div className="flex items-center gap-2 border-b border-white/40 px-3 py-2">
            <Search className="size-4 text-stone-500" />
            <input
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder={`搜索${label}`}
              value={keyword}
            />
            {loading ? <LoaderCircle className="size-3.5 animate-spin text-stone-500" /> : null}
          </div>
          <div className="max-h-56 overflow-auto p-1.5">
            {options.length === 0 && !loading ? (
              <div className="px-3 py-3 text-stone-500">没有匹配结果</div>
            ) : null}
            {options.map((option) => (
              <button
                className="flex min-h-9 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/62"
                key={option.id}
                onClick={() => {
                  onSelect(option);
                  setOpen(false);
                  setKeyword("");
                }}
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-stone-950">{option.label}</span>
                  {option.note ? <span className="block truncate text-xs text-stone-600">{option.note}</span> : null}
                </span>
                <Check className="size-3.5 shrink-0 text-emerald-700" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {error ? <div className="mt-1 text-xs text-red-700">{error}</div> : null}
      {!error && hint ? <div className="mt-1 text-xs text-stone-500">{hint}</div> : null}
    </div>
  );
}

export function useOptionsLoader(loader: (keyword: string) => Promise<PickerOption[]>, enabled = true) {
  const [options, setOptions] = useState<PickerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const loaderRef = useRef(loader);

  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  const search = useCallback(
    (keyword: string) => {
      if (!enabled) {
        setOptions([]);
        return;
      }
      const id = ++requestId.current;
      setLoading(true);
      loaderRef
        .current(keyword)
        .then((next) => {
          if (id === requestId.current) setOptions(next);
        })
        .catch(() => {
          if (id === requestId.current) setOptions([]);
        })
        .finally(() => {
          if (id === requestId.current) setLoading(false);
        });
    },
    [enabled],
  );

  return { options, loading, search };
}

export function QuoteCustomerPicker({
  value,
  onChange,
  error,
  disabled,
}: {
  value: { id: string; label: string };
  onChange: (next: { id: string; label: string; paymentTerms: string; currency: string }) => void;
  error?: string;
  disabled?: boolean;
}) {
  const customerMeta = useRef(new Map<string, { paymentTerms: string; currency: string }>());
  const { options, loading, search } = useOptionsLoader((keyword) =>
    fetchCustomers({ q: keyword, status: "active", limit: 20 }).then((customers) => {
      customerMeta.current = new Map(
        customers.map((customer) => [
          customer.id,
          {
            paymentTerms: customer.paymentTerms ?? "",
            currency: customer.defaultCurrency ?? "CNY",
          },
        ]),
      );
      return customers.map((customer) => ({
        id: customer.id,
        label: customer.name,
        note: [customer.city, customer.contactName].filter(Boolean).join(" · "),
      }));
    }),
  );

  return (
    <SearchPicker
      disabled={disabled}
      error={error}
      label="报价客户"
      loading={loading}
      onClear={() => onChange({ id: "", label: "", paymentTerms: "", currency: "CNY" })}
      onSearch={search}
      onSelect={(option) => {
        const meta = customerMeta.current.get(option.id);
        onChange({
          id: option.id,
          label: option.label,
          paymentTerms: meta?.paymentTerms ?? "",
          currency: meta?.currency ?? "CNY",
        });
      }}
      options={options}
      placeholder="选择客户"
      required
      selectedLabel={value.label}
    />
  );
}

export function QuoteContactPicker({
  customerId,
  value,
  onChange,
  disabled,
}: {
  customerId: string;
  value: { id: string; label: string };
  onChange: (next: { id: string; label: string }) => void;
  disabled?: boolean;
}) {
  const { options, loading, search } = useOptionsLoader(
    (keyword) =>
      fetchCustomerContacts(customerId, { q: keyword, status: "active", limit: 20 }).then(
        (contacts) =>
          contacts.map((contact) => ({
            id: contact.id,
            label: contact.name,
            note: [contact.title, contact.phone].filter(Boolean).join(" · "),
          })),
      ),
    Boolean(customerId),
  );

  return (
    <SearchPicker
      disabled={disabled || !customerId}
      label="客户联系人"
      loading={loading}
      onClear={() => onChange({ id: "", label: "" })}
      onSearch={search}
      onSelect={(option) => onChange({ id: option.id, label: option.label })}
      options={options}
      placeholder={customerId ? "选择联系人（可留空）" : "先选择客户"}
      selectedLabel={value.label}
    />
  );
}

export function QuoteFabricPicker({
  value,
  onChange,
  error,
}: {
  value: { id: string; label: string };
  onChange: (next: { id: string; label: string; fabric: FabricListItem }) => void;
  error?: string;
}) {
  const fabricMap = useRef(new Map<string, FabricListItem>());
  const { options, loading, search } = useOptionsLoader((keyword) =>
    fetchFabrics({ q: keyword, pageSize: 20 }).then((response) => {
      fabricMap.current = new Map(response.data.map((fabric) => [fabric.id, fabric]));
      return response.data.map((fabric) => ({
        id: fabric.id,
        label: `${fabric.code} · ${fabric.name}`,
        note: [fabric.composition, `${fabric.weight}g`].filter(Boolean).join(" · "),
      }));
    }),
  );

  return (
    <SearchPicker
      error={error}
      label="面料"
      loading={loading}
      onSearch={search}
      onSelect={(option) => {
        const fabric = fabricMap.current.get(option.id);
        onChange({ id: option.id, label: option.label, fabric: fabric ?? ({} as FabricListItem) });
      }}
      options={options}
      placeholder="搜索面料编号或名称"
      required
      selectedLabel={value.label}
    />
  );
}

export type PurchaseQuoteOption = {
  id: string;
  purchasePrice: string;
  currency: string;
  pricingUnit: string;
  minimumOrderQty: string | null;
  leadTime: string | null;
  supplierName: string;
};

// Purchase quotes hang off supplier sources, so they are read from the fabric
// detail. Like the other pickers the list is only fetched once the dropdown
// opens, which keeps a row with no fabric selected from firing a request.
export function PurchaseQuotePicker({
  fabricId,
  value,
  onChange,
  disabled,
}: {
  fabricId: string;
  value: { id: string; label: string };
  onChange: (next: { id: string; label: string; quote: PurchaseQuoteOption | null }) => void;
  disabled?: boolean;
}) {
  const quoteMap = useRef(new Map<string, PurchaseQuoteOption>());
  const { options, loading, search } = useOptionsLoader(
    (keyword) =>
      fetchFabricDetail(fabricId).then((fabric) => {
        const quotes: PurchaseQuoteOption[] = (fabric.supplierSources ?? []).flatMap((source) =>
          (source.quotes ?? []).map((quote) => ({
            id: quote.id,
            purchasePrice: quote.purchasePrice,
            currency: quote.currency,
            pricingUnit: quote.pricingUnit,
            minimumOrderQty: quote.minimumOrderQty,
            leadTime: quote.leadTime,
            supplierName: source.supplier?.name ?? "未命名货源",
          })),
        );
        quoteMap.current = new Map(quotes.map((quote) => [quote.id, quote]));
        const matched = keyword
          ? quotes.filter((quote) =>
              `${quote.supplierName} ${quote.purchasePrice} ${quote.currency}`.includes(keyword),
            )
          : quotes;
        return matched.map((quote) => ({
          id: quote.id,
          label: `${quote.supplierName} · ${quote.purchasePrice} ${quote.currency}/${quote.pricingUnit}`,
          note: [quote.minimumOrderQty ? `起订 ${quote.minimumOrderQty}` : null, quote.leadTime]
            .filter(Boolean)
            .join(" · "),
        }));
      }),
    Boolean(fabricId),
  );

  return (
    <SearchPicker
      disabled={disabled || !fabricId}
      hint={fabricId ? undefined : "先选择面料"}
      label="参考采购报价"
      loading={loading}
      onClear={() => onChange({ id: "", label: "", quote: null })}
      onSearch={search}
      onSelect={(option) =>
        onChange({ id: option.id, label: option.label, quote: quoteMap.current.get(option.id) ?? null })
      }
      options={options}
      placeholder={fabricId ? "选货源报价自动带出成本（可留空）" : "先选择面料"}
      selectedLabel={value.label}
    />
  );
}
