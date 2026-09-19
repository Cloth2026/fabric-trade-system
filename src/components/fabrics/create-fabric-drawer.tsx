"use client";

import { AlertCircle, CheckCircle2, LoaderCircle, Plus, RotateCw, Save, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FabricBasicFields } from "./fabric-basic-fields";
import { FabricProcessFields } from "./fabric-process-fields";
import { FabricSupplierFields } from "./fabric-supplier-fields";
import {
  buildCreateFabricPayload,
  createInitialFabricFormState,
  flattenValidationErrors,
  validateCreateFabricDraft,
} from "./create-fabric-state";
import type { FabricFormState, FieldErrors, FabricType } from "./create-fabric-state";
import { ApiClientError, createSingleFlightSubmitter, fetchConfigOptions, getCreateFabricErrorMessage, postCreateFabric } from "@/lib/api/fabric-client";
import type { ConfigOption } from "@/lib/api/fabric-client";

const CONFIG_GROUPS = [
  "development_source",
  "fabric_status",
  "knitted_category",
  "woven_category",
  "fabric_structure",
  "elasticity_level",
  "repurchase_status",
  "dyeing_process_type",
  "post_process_type",
  "inspection_conclusion",
  "fabric_usage",
  "fabric_season",
  "fabric_certification",
  "sample_status",
] as const;

function groupOptions(options: ConfigOption[]) {
  return options.reduce<Record<string, ConfigOption[]>>((groups, option) => {
    groups[option.group] = [...(groups[option.group] ?? []), option];
    return groups;
  }, {});
}

function requiredProgress(state: FabricFormState) {
  const values = [state.codeSuffix, state.name, state.developmentSource, state.composition, state.weight, state.width];
  return Math.round((values.filter((value) => value.trim()).length / values.length) * 100);
}

type CreatedFabric = { id: string; code: string; name: string };

export function CreateFabricDrawer({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (fabric: CreatedFabric) => void }) {
  const [state, setState] = useState(createInitialFabricFormState);
  const [optionsByGroup, setOptionsByGroup] = useState<Record<string, ConfigOption[]>>({});
  const [configStatus, setConfigStatus] = useState<"loading" | "ready" | "error">("loading");
  const [configAttempt, setConfigAttempt] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [topError, setTopError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const pendingCreatedFabric = useRef<CreatedFabric | null>(null);
  const submitFabric = useMemo(() => createSingleFlightSubmitter(postCreateFabric), []);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    fetchConfigOptions([...CONFIG_GROUPS], controller.signal)
      .then((options) => {
        const grouped = groupOptions(options);
        setOptionsByGroup(grouped);
        setState((current) => ({
          ...current,
          developmentSource:
            current.developmentSource ||
            grouped.development_source?.find((option) => option.key === "market_purchase")?.key ||
            grouped.development_source?.[0]?.key ||
            "",
          status:
            current.status ||
            grouped.fabric_status?.find((option) => option.key === "incomplete")?.key ||
            grouped.fabric_status?.[0]?.key ||
            "",
        }));
        setConfigStatus("ready");
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setConfigStatus("error");
      });

    return () => controller.abort();
  }, [open, configAttempt]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) setIsClosing(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isSubmitting]);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      onClose();
      if (pendingCreatedFabric.current) {
        onCreated?.(pendingCreatedFabric.current);
        pendingCreatedFabric.current = null;
      }
    }, 220);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose, onCreated]);

  const requestClose = useCallback(() => {
    if (!isClosing && !isSubmitting) setIsClosing(true);
  }, [isClosing, isSubmitting]);

  const progress = useMemo(() => requiredProgress(state), [state]);
  const pendingItems = [
    state.greigeStatus === "pending" ? "坯布待确认" : null,
    state.dyeingStatus === "pending" ? "染整待确认" : null,
    state.postProcessStatus === "pending" ? "后工艺待确认" : null,
    state.suppliers.length === 0 ? "供应商待补充" : null,
  ].filter((item): item is string => Boolean(item));

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
    setState((current) => ({
      ...current,
      fabricType,
      category: "",
      warpWeftDensity: fabricType === "knitted" ? "" : current.warpWeftDensity,
      tubeWeight: fabricType === "woven" ? "" : current.tubeWeight,
    }));
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const clientErrors = validateCreateFabricDraft(state);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setTopError("请先完成标记为必填的字段，并检查报价内容");
      return;
    }

    setIsSubmitting(true);
    setTopError("");
    setFieldErrors({});

    try {
      const result = await submitFabric(buildCreateFabricPayload(state));
      pendingCreatedFabric.current = result.fabric;
      setSuccessMessage(`已创建 ${result.fabric.code} · ${result.fabric.name}`);
      window.setTimeout(() => {
        setState(createInitialFabricFormState());
        setSuccessMessage("");
        setIsSubmitting(false);
        setIsClosing(true);
      }, 900);
    } catch (error) {
      setTopError(getCreateFabricErrorMessage(error));
      if (error instanceof ApiClientError && error.status === 400) {
        const mapped = flattenValidationErrors(error.details);
        if (mapped.code) {
          mapped.codeSuffix = mapped.code;
          delete mapped.code;
        }
        setFieldErrors(mapped);
      }
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-md ${isClosing ? "fabric-create-backdrop-exit" : "fabric-create-backdrop-enter"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <aside className={`absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/42 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl ${isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-400/24 bg-blue-500/12 text-blue-700 shadow-inner shadow-white/24">
              <Plus className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-500"><Sparkles className="size-4 text-blue-600" />面料档案创建</div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">新增面料</h2>
            </div>
          </div>
          <button aria-label="关闭新增面料" className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42" onClick={requestClose} type="button"><X className="size-4" /></button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[280px_1fr]">
          <aside className="border-b border-white/22 bg-stone-950/10 p-5 xl:border-b-0 xl:border-r">
            <div className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-950">基础必填完成度</span>
                <span className="text-stone-600">{progress}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/38"><div className="h-2 rounded-full bg-stone-950/86 transition-all" style={{ width: `${progress}%` }} /></div>
              <p className="mt-3 text-xs leading-5 text-stone-500">最终资料完整度由服务器在保存时根据供应商、报价和工艺状态统一计算。</p>
            </div>

            <div className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
              <div className="text-sm font-medium text-stone-950">待补信息</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {pendingItems.map((item) => <span className="rounded-full border border-amber-200/50 bg-amber-50/62 px-2 py-1 text-xs text-amber-900" key={item}>{item}</span>)}
                {pendingItems.length === 0 ? <span className="text-xs text-emerald-800">当前工艺状态均已确认</span> : null}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 text-xs leading-5 text-stone-600 shadow-inner shadow-white/12">
              <div className="font-medium text-stone-950">系统规则</div>
              <p className="mt-2">针织自动按公斤计价，梭织自动按米计价。租户由服务端确定，不会包含在提交数据中。</p>
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5">
            {configStatus === "loading" ? (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-blue-200/50 bg-blue-50/44 px-4 py-3 text-sm text-blue-900"><LoaderCircle className="size-4 animate-spin" />正在加载面料配置项…</div>
            ) : null}
            {configStatus === "error" ? (
              <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-2"><AlertCircle className="size-4" />配置项加载失败，暂时不能提交面料。</span>
                <button className="flex h-9 items-center gap-2 rounded-xl border border-red-200/70 bg-white/50 px-3" onClick={() => { setConfigStatus("loading"); setConfigAttempt((attempt) => attempt + 1); }} type="button"><RotateCw className="size-4" />重试</button>
              </div>
            ) : null}
            {topError ? <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900"><AlertCircle className="size-4 shrink-0" />{topError}</div> : null}
            {successMessage ? <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/56 px-4 py-3 text-sm text-emerald-900"><CheckCircle2 className="size-4 shrink-0" />{successMessage}</div> : null}

            <div className={configStatus !== "ready" ? "pointer-events-none opacity-55" : ""}>
              <FabricBasicFields state={state} errors={fieldErrors} optionsByGroup={optionsByGroup} onFieldChange={onFieldChange} onFabricTypeChange={onFabricTypeChange} />
              <FabricSupplierFields state={state} setState={setState} sampleStatusOptions={optionsByGroup.sample_status ?? []} errors={fieldErrors} />
              <FabricProcessFields state={state} setState={setState} optionsByGroup={optionsByGroup} errors={fieldErrors} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-white/24 bg-white/22 px-6 py-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600">保存后将同时创建面料档案、工艺明细、供应商关系和首条报价历史。</div>
          <div className="flex gap-2">
            <button className="h-10 rounded-2xl border border-white/28 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/38 disabled:opacity-50" disabled={isSubmitting} onClick={requestClose} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-55" disabled={configStatus !== "ready" || isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSubmitting ? "正在保存" : "保存面料"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
