"use client";

import {
  AlertCircle,
  Building2,
  CircleDollarSign,
  Factory,
  LoaderCircle,
  RotateCw,
  Save,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { FieldError, GlassInput, GlassSelect, GlassTextarea, ReadonlyField } from "@/components/form/glass-form-controls";
import { SupplierPicker } from "./fabric-supplier-fields";
import {
  pricingUnitLabels,
  supplierUnitFormLabels,
  type ConfigLabelMap,
} from "./fabric-library-prototype-data";
import {
  createEmptyQuoteDraft,
  createEmptySourceDraft,
  createSourceDraftFromSource,
  validateQuoteDraft,
  validateSourceDraft,
  type QuoteDraft,
  type SourceDraft,
  type SourceMaintenanceErrors,
} from "./fabric-source-maintenance-state";
import {
  getFabricSourceWriteErrorMessage,
  type ConfigOption,
  type FabricDetail,
  type FabricSupplierSource,
  type SupplierSearchItem,
  type SupplierUnitSummary,
} from "@/lib/api/fabric-client";
import { fetchSupplierUnits } from "@/lib/api/supplier-client";

function optionsFromLabels(labels: ConfigLabelMap, group: string): ConfigOption[] {
  return Object.entries(labels[group] ?? {}).map(([key, label], index) => ({
    group,
    key,
    label,
    sortOrder: index,
  }));
}

export function SupplierUnitPicker({
  supplierId,
  supplierName,
  value,
  onChange,
}: {
  supplierId: string | null;
  supplierName: string | null;
  value: SupplierUnitSummary | null;
  onChange: (unit: SupplierUnitSummary | null) => void;
}) {
  const [units, setUnits] = useState<SupplierUnitSummary[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(() => (supplierId ? "loading" : "ready"));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!supplierId) return;

    const controller = new AbortController();
    fetchSupplierUnits(supplierId, { status: "active", limit: 50 }, controller.signal)
      .then((records) => {
        setUnits(
          records.map((unit) => ({
            id: unit.id,
            name: unit.name,
            unitForm: unit.unitForm,
            status: unit.status,
          })),
        );
        setStatus("ready");
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") return;
        setStatus("error");
      });

    return () => controller.abort();
  }, [supplierId, attempt]);

  return (
    <div className="text-sm">
      <span className="text-stone-600">生产单元（{supplierName ?? "先选择供应商"}）</span>
      {status === "loading" ? (
        <div className="mt-1 flex h-10 items-center gap-2 rounded-xl border border-white/28 bg-white/24 px-3 text-stone-500"><LoaderCircle className="size-4 animate-spin" />正在读取该供应商的启用生产单元…</div>
      ) : status === "error" ? (
        <div className="mt-1 flex h-10 items-center justify-between gap-2 rounded-xl border border-red-200/60 bg-red-50/40 px-3 text-xs text-red-800">
          <span className="flex items-center gap-1.5"><AlertCircle className="size-3.5" />生产单元加载失败</span>
          <button className="flex items-center gap-1 rounded-lg border border-red-200/70 bg-white/60 px-2 py-1" onClick={() => { setStatus("loading"); setAttempt((current) => current + 1); }} type="button"><RotateCw className="size-3" />重试</button>
        </div>
      ) : !supplierId ? (
        <div className="mt-1 flex h-10 items-center rounded-xl border border-dashed border-white/40 bg-white/16 px-3 text-xs text-stone-500">选择供应商后可选择其生产单元</div>
      ) : (
        <>
          <div className="mt-1 grid gap-1.5">
            <button
              className={`flex h-10 items-center justify-between rounded-xl border px-3 text-left transition ${value === null ? "border-blue-400/50 bg-blue-500/12 text-blue-900" : "border-white/28 bg-white/24 text-stone-600 hover:bg-white/38"}`}
              onClick={() => onChange(null)}
              type="button"
            >
              <span>暂不指定生产单元</span>
              {value === null ? <Star className="size-3.5" /> : null}
            </button>
            {units.map((unit) => (
              <button
                className={`flex min-h-10 items-center justify-between rounded-xl border px-3 text-left transition ${value?.id === unit.id ? "border-blue-400/50 bg-blue-500/12 text-blue-900" : "border-white/28 bg-white/24 text-stone-700 hover:bg-white/38"}`}
                key={unit.id}
                onClick={() => onChange(unit)}
                type="button"
              >
                <span className="flex items-center gap-2"><Factory className="size-3.5 text-stone-500" /><span className="font-medium">{unit.name}</span><span className="text-xs text-stone-500">{supplierUnitFormLabels[unit.unitForm] ?? unit.unitForm}</span></span>
                {value?.id === unit.id ? <Star className="size-3.5" /> : null}
              </button>
            ))}
          </div>
          <div className="mt-1 text-xs text-stone-500">{units.length > 0 ? `共 ${units.length} 个启用生产单元，停用单元不在此列出。` : "该供应商暂无启用生产单元，可先不指定。"}</div>
        </>
      )}
    </div>
  );
}

function MaintenanceDialogShell({
  icon: Icon,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  icon: typeof Building2;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-4 backdrop-blur-md fabric-create-backdrop-enter"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section aria-label={title} className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-[22px] border border-white/40 bg-white/56 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.30)] backdrop-blur-3xl fabric-create-drawer-enter" data-testid="fabric-source-maintenance-dialog">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-white/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl border border-emerald-300/46 bg-emerald-500/12 text-emerald-700"><Icon className="size-5" /></span>
            <div>
              <div className="text-xs font-medium text-emerald-800">{subtitle}</div>
              <h2 className="mt-0.5 text-lg font-semibold text-stone-950">{title}</h2>
            </div>
          </div>
          <button aria-label="关闭" className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/34 bg-white/28 text-stone-700 transition hover:bg-white/52" onClick={onClose} type="button"><X className="size-4" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        <footer className="shrink-0 border-t border-white/30 bg-white/26 p-4 backdrop-blur-2xl">
          {footer}
        </footer>
      </section>
    </div>
  );
}

function SubmitError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mb-3 flex items-start gap-2 rounded-xl border border-red-200/60 bg-red-50/52 px-3 py-2 text-xs leading-5 text-red-800">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

function useSubmitState() {
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setServerError(null);
    setSubmitting(true);
    try {
      await action();
    } catch (error) {
      setServerError(getFabricSourceWriteErrorMessage(error));
      setSubmitting(false);
    }
  };

  return { submitting, serverError, run };
}

export function SourceMaintenanceDrawer({
  mode,
  fabric,
  source,
  existingSources,
  labels,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  fabric: FabricDetail;
  source?: FabricSupplierSource;
  existingSources: FabricSupplierSource[];
  labels: ConfigLabelMap;
  onClose: () => void;
  onSubmit: (draft: SourceDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SourceDraft>(() =>
    mode === "edit" && source ? createSourceDraftFromSource(source) : createEmptySourceDraft(),
  );
  const [errors, setErrors] = useState<SourceMaintenanceErrors>({});
  const { submitting, serverError, run } = useSubmitState();

  const update = (patch: Partial<SourceDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
  };

  const handleSubmit = () => {
    const validation = mode === "create" ? validateSourceDraft(draft, existingSources) : {};
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    void run(() => onSubmit(draft));
  };

  const canSetPreferred = mode === "edit" || existingSources.length > 0;

  return (
    <MaintenanceDialogShell
      icon={Building2}
      onClose={onClose}
      subtitle={`SDD 面料货源维护 · ${fabric.code}`}
      title={mode === "create" ? "添加供应商货源" : `维护货源 · ${draft.supplierName}`}
      footer={
        <div>
          <SubmitError message={serverError} />
          <div className="flex items-center justify-end gap-2">
            <button className="h-10 rounded-2xl border border-white/28 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/38" onClick={onClose} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} onClick={handleSubmit} type="button">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{submitting ? "正在保存…" : mode === "create" ? "保存货源" : "保存修改"}</button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        {mode === "create" ? (
          <SupplierPicker
            label="搜索并选择供应商"
            placeholder="输入供应商名称，仅显示启用供应商"
            selectedName={draft.supplierName || undefined}
            onSelect={(supplier: SupplierSearchItem) =>
              update({ supplierId: supplier.id, supplierName: supplier.name, supplierUnit: null })
            }
            onClear={() => update({ supplierId: "", supplierName: "", supplierUnit: null })}
          />
        ) : (
          <ReadonlyField label="供应商" value={draft.supplierName} />
        )}
        <FieldError error={errors.supplier} />

        <SupplierUnitPicker
          key={draft.supplierId || "none"}
          supplierId={draft.supplierId || null}
          supplierName={draft.supplierName || null}
          value={draft.supplierUnit}
          onChange={(unit) => update({ supplierUnit: unit })}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <GlassInput label="供应商货号" value={draft.supplierFabricCode} onChange={(value) => update({ supplierFabricCode: value })} placeholder="供应商内部货号 / 品号" />
          <GlassSelect label="供应商样品状态" options={optionsFromLabels(labels, "sample_status")} value={draft.sampleStatus} onChange={(value) => update({ sampleStatus: value })} />
        </div>

        <GlassTextarea label="质量差异" value={draft.qualityDifferences} onChange={(value) => update({ qualityDifferences: value })} placeholder="同款面料不同供应商的品质差异，如手感、色差、稳定性" />
        <GlassTextarea label="货源备注" value={draft.remarks} onChange={(value) => update({ remarks: value })} placeholder="供货稳定性、沟通事项、合作约定等" />

        <button
          className={`flex h-10 items-center justify-center gap-2 rounded-2xl border text-sm transition ${draft.isPreferred ? "border-amber-300/60 bg-amber-100/60 text-amber-900" : "border-white/30 bg-white/24 text-stone-700 hover:bg-white/42"}`}
          disabled={mode === "create" && existingSources.length === 0}
          onClick={() => update({ isPreferred: !draft.isPreferred })}
          type="button"
        >
          <Star className={`size-4 ${draft.isPreferred ? "fill-current" : ""}`} />
          {draft.isPreferred ? "已设为首选货源（保存后生效）" : canSetPreferred ? "设为首选货源" : "首个货源将自动成为首选"}
        </button>
        {canSetPreferred && draft.isPreferred ? <p className="-mt-2 text-xs text-amber-800">保存后原有首选货源将自动取消首选。</p> : null}
      </div>
    </MaintenanceDialogShell>
  );
}

export function QuoteDrawer({
  fabric,
  source,
  onClose,
  onSubmit,
}: {
  fabric: FabricDetail;
  source: FabricSupplierSource;
  onClose: () => void;
  onSubmit: (draft: QuoteDraft) => Promise<void>;
}) {
  const [draft, setDraft] = useState<QuoteDraft>(() => createEmptyQuoteDraft());
  const [errors, setErrors] = useState<SourceMaintenanceErrors>({});
  const { submitting, serverError, run } = useSubmitState();

  const update = (patch: Partial<QuoteDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
  };

  const handleSubmit = () => {
    const validation = validateQuoteDraft(draft);
    setErrors(validation);
    if (Object.keys(validation).length > 0) return;
    void run(() => onSubmit(draft));
  };

  return (
    <MaintenanceDialogShell
      icon={CircleDollarSign}
      onClose={onClose}
      subtitle={`采购报价快照 · ${fabric.code}`}
      title={`新增报价 · ${source.supplier.name}`}
      footer={
        <div>
          <SubmitError message={serverError} />
          <div className="flex items-center justify-end gap-2">
            <button className="h-10 rounded-2xl border border-white/28 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/38" onClick={onClose} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting} onClick={handleSubmit} type="button">{submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}{submitting ? "正在保存…" : "保存报价"}</button>
          </div>
        </div>
      }
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <GlassInput error={errors.purchasePrice} label="采购价" onChange={(value) => update({ purchasePrice: value })} placeholder="0.00" required type="number" value={draft.purchasePrice} />
          <GlassInput error={errors.currency} label="币种" maxLength={3} onChange={(value) => update({ currency: value.toUpperCase() })} placeholder="CNY" value={draft.currency} />
          <ReadonlyField label="计价单位（服务器派生）" value={pricingUnitLabels[fabric.pricingUnit]} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <GlassInput label="MOQ" onChange={(value) => update({ minimumOrderQty: value })} placeholder="如 300kg" value={draft.minimumOrderQty} />
          <GlassInput label="交期" onChange={(value) => update({ leadTime: value })} placeholder="如 7-10天" value={draft.leadTime} />
          <GlassInput label="联系人" onChange={(value) => update({ contactName: value })} placeholder="报价联系人" value={draft.contactName} />
          <GlassInput label="报价日期" onChange={(value) => update({ quoteDate: value })} type="date" value={draft.quoteDate} />
        </div>

        <SupplierUnitPicker
          supplierId={source.supplierId}
          supplierName={source.supplier.name}
          value={draft.supplierUnit}
          onChange={(unit) => update({ supplierUnit: unit })}
        />
        <p className="-mt-2 text-xs text-stone-500">报价生产单元作为历史快照保存，之后修改货源当前生产单元不会改写该报价。</p>

        <GlassTextarea label="质量差异" onChange={(value) => update({ qualityDifferences: value })} placeholder="本批报价相关的品质差异" value={draft.qualityDifferences} />
        <GlassTextarea label="报价备注" onChange={(value) => update({ remarks: value })} placeholder="税费、运费、价格有效期等" value={draft.remarks} />
      </div>
    </MaintenanceDialogShell>
  );
}
