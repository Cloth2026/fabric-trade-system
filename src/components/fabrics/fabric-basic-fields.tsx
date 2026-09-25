"use client";

import { DollarSign, Info, Layers3 } from "lucide-react";
import type { ConfigOption } from "@/lib/api/fabric-client";
import {
  FabricCodeInput,
  FormPanel,
  GlassInput,
  GlassSelect,
  PanelTitle,
  ReadonlyField,
  SegmentedControl,
} from "@/components/form/glass-form-controls";
import type { FabricFormState, FieldErrors, FabricType } from "./create-fabric-state";
import { getPricingUnitLabel } from "./create-fabric-state";

type Props = {
  state: FabricFormState;
  errors: FieldErrors;
  optionsByGroup: Record<string, ConfigOption[]>;
  onFieldChange: (field: keyof FabricFormState, value: string | string[]) => void;
  onFabricTypeChange: (fabricType: FabricType) => void;
  // Editing passes only the fields that must stay read-only. Anything omitted
  // stays editable.
  lockIdentity?: {
    code?: string;
    codeHint?: string;
    fabricType?: FabricType;
    fabricTypeHint?: string;
  };
};

export function FabricBasicFields({ state, errors, optionsByGroup, onFieldChange, onFabricTypeChange, lockIdentity }: Props) {
  const options = (group: string) => optionsByGroup[group] ?? [];
  const categoryGroup = state.fabricType === "knitted" ? "knitted_category" : "woven_category";
  const unitLabel = getPricingUnitLabel(state.fabricType);
  const fabricTypeLabel = state.fabricType === "knitted" ? "针织" : "梭织";

  return (
    <>
      <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <PanelTitle icon={Info} title="基础信息" description="编号、名称、来源和成品规格构成面料档案的最小信息集。" tone="blue" />
          {lockIdentity?.fabricType ? (
            <div className="flex h-10 items-center gap-2 rounded-2xl border border-white/28 bg-white/24 px-3 text-sm text-stone-700">
              <span className="font-medium">{fabricTypeLabel}</span>
              <span className="text-xs text-stone-500">{lockIdentity.fabricTypeHint ?? "当前不可修改"}</span>
            </div>
          ) : (
            <SegmentedControl
              options={[
                { value: "knitted", label: "针织" },
                { value: "woven", label: "梭织" },
              ]}
              value={state.fabricType}
              onChange={onFabricTypeChange}
            />
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <GlassInput label="面料英文名称" value={state.englishName} onChange={(value) => onFieldChange("englishName", value)} placeholder="如 Cotton Spandex Jersey" />
          <GlassInput label="面料名称" required value={state.name} onChange={(value) => onFieldChange("name", value)} placeholder="如 精梳棉氨纶汗布" error={errors.name} />
          {lockIdentity?.code ? (
            <ReadonlyField label="面料编号" value={lockIdentity.code} hint={lockIdentity.codeHint ?? "当前不可修改"} />
          ) : (
            <FabricCodeInput value={state.codeSuffix} onChange={(value) => onFieldChange("codeSuffix", value)} error={errors.codeSuffix ?? errors.code} />
          )}
          <ReadonlyField label="计价单位（系统自动确定）" value={unitLabel} />
          <GlassSelect label="开发来源" required options={options("development_source")} value={state.developmentSource} onChange={(value) => onFieldChange("developmentSource", value)} error={errors.developmentSource} />
          <GlassSelect label="面料状态" options={options("fabric_status")} value={state.status} onChange={(value) => onFieldChange("status", value)} />
          <GlassInput label="成分" required value={state.composition} onChange={(value) => onFieldChange("composition", value)} placeholder="如 95%棉 5%氨纶" error={errors.composition} />
          <GlassInput label="克重" required value={state.weight} onChange={(value) => onFieldChange("weight", value)} placeholder="如 180g" error={errors.weight} />
          <GlassInput label="门幅" required value={state.width} onChange={(value) => onFieldChange("width", value)} placeholder="如 165cm" error={errors.width} />
          <GlassInput label="纱支" value={state.yarnCount} onChange={(value) => onFieldChange("yarnCount", value)} placeholder={state.fabricType === "knitted" ? "如 32S" : "如 40S x 40S"} />
          {state.fabricType === "woven" ? (
            <GlassInput label="经纬密" value={state.warpWeftDensity} onChange={(value) => onFieldChange("warpWeftDensity", value)} placeholder="如 133x72" />
          ) : null}
        </div>
      </section>

      <FormPanel icon={Layers3} tone="indigo" title="分类结构" description="枚举值由配置中心维护，保存时提交稳定的配置 key。">
        <GlassSelect label={state.fabricType === "knitted" ? "针织细类" : "梭织细类"} options={options(categoryGroup)} value={state.category} onChange={(value) => onFieldChange("category", value)} />
        <GlassSelect label="组织结构" options={options("fabric_structure")} value={state.structure} onChange={(value) => onFieldChange("structure", value)} />
        <GlassSelect label="弹力等级" options={options("elasticity_level")} value={state.elasticity} onChange={(value) => onFieldChange("elasticity", value)} />
      </FormPanel>

      <FormPanel icon={DollarSign} tone="emerald" title="来源与价格" description="成品参考价区分不含税与含税，税点手工填写；采购报价在下方按供应商独立保存。">
        <GlassInput label="来源联系人" value={state.sourceContact} onChange={(value) => onFieldChange("sourceContact", value)} placeholder="联系人 / 业务员" />
        <GlassInput label="来源日期" type="date" value={state.sourceDate} onChange={(value) => onFieldChange("sourceDate", value)} />
        <GlassInput label="成品参考价（不含税）" type="number" value={state.finishedReferencePriceExclTax} onChange={(value) => onFieldChange("finishedReferencePriceExclTax", value)} placeholder={`¥ / ${unitLabel}`} error={errors.finishedReferencePriceExclTax} />
        <GlassInput label="成品参考价（含税）" type="number" value={state.finishedReferencePriceInclTax} onChange={(value) => onFieldChange("finishedReferencePriceInclTax", value)} placeholder={`¥ / ${unitLabel}`} error={errors.finishedReferencePriceInclTax} />
        <GlassInput label="成品参考价税点" type="number" value={state.finishedReferenceTaxRate} onChange={(value) => onFieldChange("finishedReferenceTaxRate", value)} placeholder="如 13 表示 13%" error={errors.finishedReferenceTaxRate} />
        <GlassSelect label="是否可复购" options={options("repurchase_status")} value={state.repurchaseStatus} onChange={(value) => onFieldChange("repurchaseStatus", value)} />
        {state.fabricType === "knitted" ? (
          <GlassInput label="纸管重量" value={state.tubeWeight} onChange={(value) => onFieldChange("tubeWeight", value)} placeholder="如 1.2kg/卷" />
        ) : null}
        <GlassInput label="空差" value={state.tolerance} onChange={(value) => onFieldChange("tolerance", value)} placeholder={state.fabricType === "knitted" ? "如 +/- 0.3kg" : "如 +/- 2m"} />
      </FormPanel>
    </>
  );
}