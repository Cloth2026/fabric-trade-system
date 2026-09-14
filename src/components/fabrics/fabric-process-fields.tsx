"use client";

import { Factory, FlaskConical, NotebookTabs, Plus, Ribbon, Trash2, Trees } from "lucide-react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { ConfigOption } from "@/lib/api/fabric-client";
import {
  FieldError,
  FormPanel,
  GlassChipGroup,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  PanelTitle,
  SegmentedControl,
} from "@/components/form/glass-form-controls";
import type { FabricFormState, FieldErrors, ProcessStatus } from "./create-fabric-state";
import { changeProcessStatus, createPostProcessDraft, getPricingUnitLabel } from "./create-fabric-state";
import { SupplierPicker } from "./fabric-supplier-fields";

function ProcessPanel({
  icon,
  tone,
  title,
  status,
  onStatusChange,
  children,
  error,
}: {
  icon: typeof Trees;
  tone: "lime" | "cyan" | "violet";
  title: string;
  status: ProcessStatus;
  onStatusChange: (status: ProcessStatus) => void;
  children: ReactNode;
  error?: string;
}) {
  const labels: Record<ProcessStatus, string> = { none: "无", pending: "待确认", available: "有" };
  return (
    <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <PanelTitle icon={icon} tone={tone} title={title} description="选择“有”后展开详细字段；“无”会清空明细，“待确认”允许后续补全。" />
        <SegmentedControl
          options={[
            { value: "none", label: "无" },
            { value: "pending", label: "待确认" },
            { value: "available", label: "有" },
          ]}
          value={status}
          onChange={onStatusChange}
        />
      </div>
      {status === "available" ? children : (
        <div className="mt-4 rounded-2xl border border-white/24 bg-white/16 p-4 text-sm text-stone-600">当前状态：{labels[status]}。保存时不会提交隐藏的工艺明细。</div>
      )}
      <FieldError error={error} />
    </section>
  );
}

export function FabricProcessFields({
  state,
  setState,
  optionsByGroup,
  errors,
}: {
  state: FabricFormState;
  setState: Dispatch<SetStateAction<FabricFormState>>;
  optionsByGroup: Record<string, ConfigOption[]>;
  errors: FieldErrors;
}) {
  const options = (group: string) => optionsByGroup[group] ?? [];
  const unitLabel = getPricingUnitLabel(state.fabricType);
  const setGreige = (field: keyof FabricFormState["greige"], value: string) =>
    setState((current) => ({ ...current, greige: { ...current.greige, [field]: value } }));
  const setDyeing = (field: keyof FabricFormState["dyeingFinishing"], value: string) =>
    setState((current) => ({ ...current, dyeingFinishing: { ...current.dyeingFinishing, [field]: value } }));
  const setPostProcess = (id: string, field: keyof FabricFormState["postProcesses"][number], value: string) =>
    setState((current) => ({
      ...current,
      postProcesses: current.postProcesses.map((process) => (process.id === id ? { ...process, [field]: value } : process)),
    }));

  return (
    <>
      <ProcessPanel
        icon={Trees}
        tone="lime"
        title="坯布信息"
        status={state.greigeStatus}
        onStatusChange={(status) => setState((current) => changeProcessStatus(current, "greige", status))}
        error={errors.greige}
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <GlassInput label="坯布编号" value={state.greige.code} onChange={(value) => setGreige("code", value)} placeholder="坯布内部编号" />
          <GlassInput label="坯布名称" value={state.greige.name} onChange={(value) => setGreige("name", value)} placeholder="坯布名称" />
          <SupplierPicker
            label="坯布供应商"
            placeholder="搜索织厂 / 坯布供应商"
            selectedName={state.greige.supplierName}
            onSelect={(supplier) => {
              setGreige("supplierId", supplier.id);
              setGreige("supplierName", supplier.name);
            }}
            onClear={() => {
              setGreige("supplierId", "");
              setGreige("supplierName", "");
            }}
          />
          <GlassInput label="坯布成分" value={state.greige.composition} onChange={(value) => setGreige("composition", value)} placeholder="可与成品不同" />
          <GlassInput label="坯布克重" value={state.greige.weight} onChange={(value) => setGreige("weight", value)} placeholder="如 170g" />
          <GlassInput label="坯布门幅" value={state.greige.width} onChange={(value) => setGreige("width", value)} placeholder="如 175cm" />
          <GlassInput label="纱支 / 经纬密" value={state.greige.yarnOrDensity} onChange={(value) => setGreige("yarnOrDensity", value)} />
          <GlassInput label="坯布单价" type="number" value={state.greige.unitPrice} onChange={(value) => setGreige("unitPrice", value)} placeholder={`¥ / ${unitLabel}`} />
          <GlassInput label="坯布损耗率" value={state.greige.lossRate} onChange={(value) => setGreige("lossRate", value)} placeholder="如 3%" />
          <GlassTextarea label="坯布备注" value={state.greige.remarks} onChange={(value) => setGreige("remarks", value)} />
        </div>
      </ProcessPanel>

      <ProcessPanel
        icon={FlaskConical}
        tone="cyan"
        title="染整信息"
        status={state.dyeingStatus}
        onStatusChange={(status) => setState((current) => changeProcessStatus(current, "dyeing", status))}
        error={errors.dyeingFinishing}
      >
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <GlassSelect label="染整类型" options={options("dyeing_process_type")} value={state.dyeingFinishing.processType} onChange={(value) => setDyeing("processType", value)} />
          <SupplierPicker
            label="染整厂"
            placeholder="搜索染厂 / 印花厂"
            selectedName={state.dyeingFinishing.factoryName}
            onSelect={(supplier) => {
              setDyeing("factoryId", supplier.id);
              setDyeing("factoryName", supplier.name);
            }}
            onClear={() => {
              setDyeing("factoryId", "");
              setDyeing("factoryName", "");
            }}
          />
          <GlassInput label="染整单价" type="number" value={state.dyeingFinishing.unitPrice} onChange={(value) => setDyeing("unitPrice", value)} placeholder={`¥ / ${unitLabel}`} />
          <GlassInput label="损耗率" value={state.dyeingFinishing.lossRate} onChange={(value) => setDyeing("lossRate", value)} placeholder="如 5%" />
          <GlassInput label="交期" value={state.dyeingFinishing.leadTime} onChange={(value) => setDyeing("leadTime", value)} placeholder="如 7天" />
          <GlassInput label="注意事项" value={state.dyeingFinishing.cautions} onChange={(value) => setDyeing("cautions", value)} placeholder="色差、手感、批次稳定性等" />
        </div>
      </ProcessPanel>

      <ProcessPanel
        icon={Factory}
        tone="violet"
        title="后工艺信息"
        status={state.postProcessStatus}
        onStatusChange={(status) => setState((current) => changeProcessStatus(current, "postProcess", status))}
        error={errors.postProcesses}
      >
        <div className="mt-4 space-y-3">
          {state.postProcesses.map((process, index) => (
            <div className="rounded-2xl border border-white/30 bg-white/20 p-3" key={process.id}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-stone-800">后工艺 #{index + 1}</span>
                <button
                  aria-label="移除后工艺"
                  className="flex size-8 items-center justify-center rounded-xl border border-rose-200/50 bg-rose-50/30 text-rose-700 transition hover:bg-rose-100/60"
                  onClick={() => setState((current) => ({ ...current, postProcesses: current.postProcesses.filter((item) => item.id !== process.id) }))}
                  type="button"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <GlassSelect label="后工艺类型" options={options("post_process_type")} value={process.processType} onChange={(value) => setPostProcess(process.id, "processType", value)} />
                <SupplierPicker
                  label="后工艺厂"
                  placeholder="搜索后工艺加工厂"
                  selectedName={process.factoryName}
                  onSelect={(supplier) => {
                    setPostProcess(process.id, "factoryId", supplier.id);
                    setPostProcess(process.id, "factoryName", supplier.name);
                  }}
                  onClear={() => {
                    setPostProcess(process.id, "factoryId", "");
                    setPostProcess(process.id, "factoryName", "");
                  }}
                />
                <GlassInput label="效果描述" value={process.effectDescription} onChange={(value) => setPostProcess(process.id, "effectDescription", value)} placeholder="位置、效果、手感" />
                <GlassInput label="单价" type="number" value={process.unitPrice} onChange={(value) => setPostProcess(process.id, "unitPrice", value)} placeholder={`¥ / ${unitLabel}`} />
                <GlassInput label="损耗率" value={process.lossRate} onChange={(value) => setPostProcess(process.id, "lossRate", value)} placeholder="如 5%" />
                <GlassInput label="MOQ" value={process.minimumOrderQty} onChange={(value) => setPostProcess(process.id, "minimumOrderQty", value)} />
                <GlassInput label="交期" value={process.leadTime} onChange={(value) => setPostProcess(process.id, "leadTime", value)} />
                <GlassInput label="风险说明" value={process.riskNotes} onChange={(value) => setPostProcess(process.id, "riskNotes", value)} />
                <GlassInput label="备注" value={process.remarks} onChange={(value) => setPostProcess(process.id, "remarks", value)} />
              </div>
            </div>
          ))}
          <button
            className="flex h-10 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/42"
            onClick={() => setState((current) => ({ ...current, postProcesses: [...current.postProcesses, createPostProcessDraft()] }))}
            type="button"
          >
            <Plus className="size-4" />
            增加后工艺
          </button>
        </div>
      </ProcessPanel>

      <FormPanel icon={NotebookTabs} tone="amber" title="质量与备注" description="第一版保留轻量检测结论，后续可扩展独立检测报告。">
        <GlassInput label="色牢度" value={state.colorFastness} onChange={(value) => setState((current) => ({ ...current, colorFastness: value }))} placeholder="如 3-4级" />
        <GlassInput label="起毛起球" value={state.pilling} onChange={(value) => setState((current) => ({ ...current, pilling: value }))} placeholder="等级或备注" />
        <GlassSelect label="检测结论" options={options("inspection_conclusion")} value={state.inspectionConclusion} onChange={(value) => setState((current) => ({ ...current, inspectionConclusion: value }))} />
        <GlassInput label="手感评价" value={state.handFeel} onChange={(value) => setState((current) => ({ ...current, handFeel: value }))} placeholder="软、挺、糯、滑等" />
        <GlassTextarea label="备注" value={state.remarks} onChange={(value) => setState((current) => ({ ...current, remarks: value }))} placeholder="其他业务说明" />
      </FormPanel>

      <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
        <PanelTitle icon={Ribbon} tone="rose" title="用途 / 季节 / 认证" description="用于检索和筛选，选项由配置中心统一维护。" />
        <div className="mt-4 space-y-4">
          <GlassChipGroup label="用途（多选）" options={options("fabric_usage")} selected={state.usageOptionKeys} onChange={(usageOptionKeys) => setState((current) => ({ ...current, usageOptionKeys }))} />
          <GlassChipGroup label="适用季节（多选）" options={options("fabric_season")} selected={state.seasonOptionKeys} onChange={(seasonOptionKeys) => setState((current) => ({ ...current, seasonOptionKeys }))} />
          <GlassChipGroup label="认证标准（多选）" options={options("fabric_certification")} selected={state.certificationOptionKeys} onChange={(certificationOptionKeys) => setState((current) => ({ ...current, certificationOptionKeys }))} />
        </div>
      </section>
    </>
  );
}
