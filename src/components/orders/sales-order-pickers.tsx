"use client";

import { useRef } from "react";
import { fetchFabricDetail } from "@/lib/api/fabric-client";
import { SearchPicker, useOptionsLoader } from "@/components/quotes/customer-quote-pickers";

// Which supplier source we intend to buy from. Reference only: choosing one
// here never writes anything back to the fabric or its purchase quotes.
export function FabricSupplierSourcePicker({
  fabricId,
  value,
  onChange,
  disabled,
}: {
  fabricId: string;
  value: { id: string; label: string };
  onChange: (next: { id: string; label: string }) => void;
  disabled?: boolean;
}) {
  const sourceMap = useRef(new Map<string, string>());
  const { options, loading, search } = useOptionsLoader(
    (keyword) =>
      fetchFabricDetail(fabricId).then((fabric) => {
        const sources = fabric.supplierSources ?? [];
        sourceMap.current = new Map(
          sources.map((source) => [
            source.id,
            [source.supplier?.name ?? "未命名货源", source.supplierUnit?.name ?? null]
              .filter(Boolean)
              .join(" · "),
          ]),
        );
        const matched = keyword
          ? sources.filter((source) => (sourceMap.current.get(source.id) ?? "").includes(keyword))
          : sources;
        return matched.map((source) => ({
          id: source.id,
          label: sourceMap.current.get(source.id) ?? "未命名货源",
          note: source.isPreferred
            ? `首选货源${source.supplierFabricCode ? ` · ${source.supplierFabricCode}` : ""}`
            : (source.supplierFabricCode ?? undefined),
        }));
      }),
    Boolean(fabricId),
  );

  return (
    <SearchPicker
      disabled={disabled || !fabricId}
      hint={fabricId ? undefined : "先选择面料"}
      label="采购货源"
      loading={loading}
      onClear={() => onChange({ id: "", label: "" })}
      onSearch={search}
      onSelect={(option) => onChange({ id: option.id, label: option.label })}
      options={options}
      placeholder={fabricId ? "选货源便于追溯进货来源（可留空）" : "先选择面料"}
      selectedLabel={value.label}
    />
  );
}
