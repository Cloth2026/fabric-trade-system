"use client";

import { AlertCircle, CheckCircle2, FilePenLine, LoaderCircle, NotebookTabs, Ribbon, RotateCw, Save, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createSingleFlightSubmitter,
  fetchConfigOptions,
  patchFabric,
  type ConfigOption,
  type FabricDetail,
} from "@/lib/api/fabric-client";
import { FormPanel, GlassChipGroup, GlassInput, GlassSelect, GlassTextarea, PanelTitle } from "@/components/form/glass-form-controls";
import {
  buildEditFabricPayload,
  createEditFabricFormState,
  getEditFabricErrorMessage,
  validateEditFabricDraft,
} from "./edit-fabric-state";
import { FabricBasicFields } from "./fabric-basic-fields";
import type { FabricFormState, FieldErrors, FabricType } from "./create-fabric-state";

const EDIT_CONFIG_GROUPS = [
  "development_source",
  "fabric_status",
  "knitted_category",
  "woven_category",
  "fabric_structure",
  "elasticity_level",
  "repurchase_status",
  "inspection_conclusion",
  "fabric_usage",
  "fabric_season",
  "fabric_certification",
] as const;

function groupOptions(options: ConfigOption[]) {
  return options.reduce<Record<string, ConfigOption[]>>((groups, option) => {
    groups[option.group] = [...(groups[option.group] ?? []), option];
    return groups;
  }, {});
}

export function EditFabricDrawer({
  fabric,
  onClose,
  onSaved,
}: {
  fabric: FabricDetail;
  onClose: () => void;
  onSaved: (updated: FabricDetail) => void;
}) {
  // Drawer state initializers run once per mount; parent supplies a stable
  // `key` so opening a different fabric remounts and re-initializes cleanly.
  const [state, setState] = useState<FabricFormState>(() => createEditFabricFormState(fabric));
  const [optionsByGroup, setOptionsByGroup] = useState<Record<string, ConfigOption[]>>({});
  const [configStatus, setConfigStatus] = useState<"loading" | "ready" | "error">("loading");
  const [configAttempt, setConfigAttempt] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [topError, setTopError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // createSingleFlightSubmitter forwards exactly one argument, so pass the
  // (fabricId, payload) pair as a single object — a raw `patchFabric` here
  // would silently drop the payload and send a body-less PATCH (400).
  const submitFabric = useMemo(
    () => createSingleFlightSubmitter((input: { fabricId: string; payload: ReturnType<typeof buildEditFabricPayload> }) => patchFabric(input.fabricId, input.payload)),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchConfigOptions([...EDIT_CONFIG_GROUPS], controller.signal)
      .then((options) => {
        setOptionsByGroup(groupOptions(options));
        setConfigStatus("ready");
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setConfigStatus("error");
      });
    return () => controller.abort();
  }, [configAttempt]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onClose]);

  const options = (group: string) => optionsByGroup[group] ?? [];
  const pricingUnitLabel = state.fabricType === "knitted" ? "公斤" : "米";

  const onFieldChange = (field: keyof FabricFormState, value: string | string[]) => {
    setState((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const onFabricTypeChange = (fabricType: FabricType) => {
    setState((current) => {
      if (current.fabricType === fabricType) return current;
      return {
        ...current,
        fabricType,
        category: "",
        warpWeftDensity: fabricType === "knitted" ? "" : current.warpWeftDensity,
        tubeWeight: fabricType === "woven" ? "" : current.tubeWeight,
      };
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const clientErrors = validateEditFabricDraft(state);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setTopError("请先完成标记为必填的字段");
      return;
    }

    setIsSubmitting(true);
    setTopError("");
    setFieldErrors({});

    try {
      const updated = await submitFabric({ fabricId: fabric.id, payload: buildEditFabricPayload(state) });
      setSuccessMessage(`已保存 ${updated.code} · ${updated.name}`);
      window.setTimeout(() => {
        onSaved(updated);
      }, 700);
    } catch (error) {
      setTopError(getEditFabricErrorMessage(error));
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-md fabric-create-backdrop-enter"
      data-testid="fabric-edit-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <aside
        aria-label="编辑面料"
        className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/42 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl fabric-create-drawer-enter"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-indigo-300/36 bg-indigo-500/12 text-indigo-700 shadow-inner shadow-white/24">
              <FilePenLine className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-500"><Sparkles className="size-4 text-indigo-600" />面料档案编辑</div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">编辑面料 · {fabric.code}</h2>
            </div>
          </div>
          <button
            aria-label="关闭编辑"
            className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {configStatus === "loading" ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-blue-200/50 bg-blue-50/44 px-4 py-3 text-sm text-blue-900">
              <LoaderCircle className="size-4 animate-spin" />正在加载面料配置项…
            </div>
          ) : null}
          {configStatus === "error" ? (
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-2"><AlertCircle className="size-4" />配置项加载失败，暂时不能提交面料。</span>
              <button
                className="flex h-9 items-center gap-2 rounded-xl border border-red-200/70 bg-white/50 px-3"
                onClick={() => {
                  setConfigStatus("loading");
                  setConfigAttempt((attempt) => attempt + 1);
                }}
                type="button"
              >
                <RotateCw className="size-4" />重试
              </button>
            </div>
          ) : null}
          {topError ? <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900"><AlertCircle className="size-4 shrink-0" />{topError}</div> : null}
          {successMessage ? <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/56 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="size-4 shrink-0" />{successMessage}</div> : null}

          <div className={configStatus !== "ready" ? "pointer-events-none opacity-55" : ""}>
            <FabricBasicFields
              errors={fieldErrors}
              lockIdentity={{ code: fabric.code, fabricType: state.fabricType, pricingUnitLabel }}
              onFabricTypeChange={onFabricTypeChange}
              onFieldChange={onFieldChange}
              optionsByGroup={optionsByGroup}
              state={state}
            />

            <FormPanel icon={NotebookTabs} tone="amber" title="质量与备注" description="色牢度、起毛起球和检测结论用于档案检索与提醒。">
              <GlassInput label="色牢度" value={state.colorFastness} onChange={(value) => onFieldChange("colorFastness", value)} placeholder="如 3-4级" />
              <GlassInput label="起毛起球" value={state.pilling} onChange={(value) => onFieldChange("pilling", value)} placeholder="等级或备注" />
              <GlassSelect label="检测结论" options={options("inspection_conclusion")} value={state.inspectionConclusion} onChange={(value) => onFieldChange("inspectionConclusion", value)} />
              <GlassInput label="手感评价" value={state.handFeel} onChange={(value) => onFieldChange("handFeel", value)} placeholder="软、挺、糯、滑等" />
              <GlassTextarea label="备注" value={state.remarks} onChange={(value) => onFieldChange("remarks", value)} placeholder="其他业务说明" />
            </FormPanel>

            <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
              <PanelTitle icon={Ribbon} tone="rose" title="用途 / 季节 / 认证" description="用于检索和筛选，选项由配置中心统一维护。" />
              <div className="mt-4 space-y-4">
                <GlassChipGroup label="用途（多选）" options={options("fabric_usage")} selected={state.usageOptionKeys} onChange={(keys) => onFieldChange("usageOptionKeys", keys)} />
                <GlassChipGroup label="适用季节（多选）" options={options("fabric_season")} selected={state.seasonOptionKeys} onChange={(keys) => onFieldChange("seasonOptionKeys", keys)} />
                <GlassChipGroup label="认证标准（多选）" options={options("fabric_certification")} selected={state.certificationOptionKeys} onChange={(keys) => onFieldChange("certificationOptionKeys", keys)} />
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-white/24 bg-white/22 px-6 py-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600">
            将修改面料主档的基础资料、规格、来源、价格、质量与标签。供应商货源、工艺明细、报价历史请使用对应模块维护。
            <span className="ml-1 text-stone-500">计价单位：{pricingUnitLabel}</span>
          </div>
          <div className="flex gap-2">
            <button className="h-10 rounded-2xl border border-white/28 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/38 disabled:opacity-50" disabled={isSubmitting} onClick={onClose} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-55" disabled={configStatus !== "ready" || isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSubmitting ? "正在保存" : "保存修改"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}