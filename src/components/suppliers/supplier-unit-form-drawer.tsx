"use client";

import { BriefcaseBusiness, Building2, Contact, Factory, Handshake, Pencil, Plus, Save, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FormPanel, GlassInput, GlassSelect, GlassTextarea, PanelTitle, SegmentedControl } from "@/components/form/glass-form-controls";
import type { ConfigOption } from "@/lib/api/fabric-client";
import type { SupplierPrototype } from "./supplier-prototype-data";
import { createEmptySupplierUnitForm, supplierUnitToForm, supplierUnitTypes } from "./supplier-unit-prototype-data";
import type { SamplingSupport, SupplierUnitFormState, SupplierUnitPrototype, SupplierUnitStatus } from "./supplier-unit-prototype-data";

const supplierUnitTypeOptions: ConfigOption[] = supplierUnitTypes.map((type, sortOrder) => ({ key: type, label: type, group: "supplier_unit_type", sortOrder }));

export function SupplierUnitFormDrawer({
  mode,
  supplier,
  unit,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  supplier: SupplierPrototype;
  unit?: SupplierUnitPrototype;
  onClose: () => void;
  onSave: (state: SupplierUnitFormState) => void;
}) {
  const [state, setState] = useState<SupplierUnitFormState>(() => (unit ? supplierUnitToForm(unit) : createEmptySupplierUnitForm()));
  const [errors, setErrors] = useState<{ name?: string; type?: string }>({});
  const [isClosing, setIsClosing] = useState(false);
  const filledCount = useMemo(() => [state.name, state.primaryBusiness, state.primaryProducts, state.materialScope, state.processCapabilities, state.moq, state.leadTime, state.manager, state.phone, state.qualityFeatures].filter((value) => value.trim()).length, [state]);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  const update = <K extends keyof SupplierUnitFormState>(field: K, value: SupplierUnitFormState[K]) => {
    setState((current) => ({ ...current, [field]: value }));
    if (field === "name" || field === "type") setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submitStaticDraft = () => {
    const nextErrors = {
      name: state.name.trim() ? undefined : "请填写生产单元名称",
      type: state.type ? undefined : "请选择单元类型",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.type) return;
    onSave({ ...state, name: state.name.trim() });
  };

  return (
    <div className={`fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-md ${isClosing ? "fabric-create-backdrop-exit" : "fabric-create-backdrop-enter"}`} onMouseDown={(event) => { if (event.target === event.currentTarget) setIsClosing(true); }}>
      <aside className={`absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-[22px] border border-white/38 bg-white/52 shadow-[0_36px_120px_rgba(26,22,18,0.38),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-3xl ${isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/26 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex size-11 items-center justify-center rounded-2xl border shadow-inner shadow-white/24 ${mode === "create" ? "border-emerald-300/38 bg-emerald-500/14 text-emerald-700" : "border-violet-300/38 bg-violet-500/14 text-violet-700"}`}>{mode === "create" ? <Plus className="size-5" /> : <Pencil className="size-5" />}</div>
            <div><div className="flex items-center gap-2 text-sm text-stone-500"><Sparkles className="size-4 text-blue-600" />生产单元档案</div><h2 className="mt-1 text-2xl font-semibold text-stone-950">{mode === "create" ? "新增生产单元" : "编辑生产单元"}</h2></div>
          </div>
          <button aria-label={`关闭${mode === "create" ? "新增" : "编辑"}生产单元`} className="flex size-9 items-center justify-center rounded-xl border border-white/30 bg-white/24 transition hover:bg-white/44" onClick={() => setIsClosing(true)} type="button"><X className="size-4" /></button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[250px_1fr]">
          <aside className="border-b border-white/24 bg-stone-950/8 p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-2xl border border-violet-200/52 bg-violet-50/46 p-4 text-sm text-violet-950"><div className="font-semibold">静态 UI 原型</div><p className="mt-2 text-xs leading-5 text-violet-900/76">保存只更新当前浏览器状态，刷新页面即可恢复示例数据。本轮不会写入数据库。</p></div>
            <div className="mt-4 rounded-2xl border border-white/30 bg-white/22 p-4"><div className="text-xs text-stone-500">所属供应商</div><div className="mt-2 flex items-start gap-2 text-sm font-medium text-stone-900"><Building2 className="mt-0.5 size-4 shrink-0 text-blue-700" />{supplier.name}</div></div>
            <div className="mt-4 rounded-2xl border border-white/30 bg-white/22 p-4"><div className="flex items-center justify-between text-sm"><span className="font-medium text-stone-900">资料填写预览</span><span className="text-stone-600">{filledCount}/10</span></div><div className="mt-3 h-2 rounded-full bg-white/46"><div className="h-2 rounded-full bg-stone-950/84 transition-all" style={{ width: `${filledCount * 10}%` }} /></div><p className="mt-3 text-xs leading-5 text-stone-500">仅用于评估表单信息密度，不代表正式完整度规则。</p></div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5">
            <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
              <PanelTitle icon={Factory} tone="blue" title="基础信息" description="生产单元隶属于当前供应商，不作为独立供应商建档。" />
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <GlassInput label="生产单元名称" required value={state.name} onChange={(value) => update("name", value)} placeholder="如 染色一车间" error={errors.name} />
                <GlassSelect label="单元类型" required options={supplierUnitTypeOptions} value={state.type} onChange={(value) => update("type", value as SupplierUnitFormState["type"])} configurable={false} error={errors.type} />
                <div><div className="mb-1 text-sm text-stone-600">合作状态</div><SegmentedControl<SupplierUnitStatus> options={[{ value: "启用", label: "启用" }, { value: "暂停合作", label: "暂停合作" }]} value={state.status} onChange={(value) => update("status", value)} /></div>
              </div>
            </section>

            <FormPanel icon={BriefcaseBusiness} tone="violet" title="业务能力" description="记录该生产单元真正擅长和明确不承接的业务范围。">
              <GlassInput label="主要业务" value={state.primaryBusiness} onChange={(value) => update("primaryBusiness", value)} placeholder="如 涤纶梭织染色" />
              <GlassInput label="主要产品 / 面料" value={state.primaryProducts} onChange={(value) => update("primaryProducts", value)} placeholder="如 春亚纺、四面弹" />
              <GlassInput label="原料范围" value={state.materialScope} onChange={(value) => update("materialScope", value)} placeholder="如 涤纶、锦氨" />
              <GlassTextarea label="工艺能力" value={state.processCapabilities} onChange={(value) => update("processCapabilities", value)} placeholder="染色、印花、定型或后整理能力" />
              <GlassTextarea label="不承接范围" value={state.restrictions} onChange={(value) => update("restrictions", value)} placeholder="不承接产品、原料或订单限制" />
            </FormPanel>

            <FormPanel icon={Handshake} tone="emerald" title="合作条件" description="单独维护该车间的起订量、排期和打样能力。">
              <GlassInput label="MOQ" value={state.moq} onChange={(value) => update("moq", value)} placeholder="如 500kg/色" />
              <GlassInput label="常规交期" value={state.leadTime} onChange={(value) => update("leadTime", value)} placeholder="如 12-15天" />
              <GlassInput label="旺季交期" value={state.peakLeadTime} onChange={(value) => update("peakLeadTime", value)} placeholder="如 18-22天" />
              <div className="md:col-span-2 xl:col-span-3"><div className="mb-1 text-sm text-stone-600">是否支持打样</div><SegmentedControl<SamplingSupport> options={[{ value: "支持", label: "支持" }, { value: "不支持", label: "不支持" }]} value={state.samplingSupport} onChange={(value) => update("samplingSupport", value)} /></div>
            </FormPanel>

            <FormPanel icon={Contact} tone="cyan" title="联系信息" description="记录可以直接协调该生产单元排期与品质的负责人。">
              <GlassInput label="负责人" value={state.manager} onChange={(value) => update("manager", value)} placeholder="姓名或职务" />
              <GlassInput label="电话" value={state.phone} onChange={(value) => update("phone", value)} placeholder="手机或座机" />
              <GlassInput label="微信" value={state.wechat} onChange={(value) => update("wechat", value)} placeholder="微信或其他联系方式" />
            </FormPanel>

            <FormPanel icon={ShieldCheck} tone="amber" title="质量与风险" description="质量表现与风险分开记录，便于后续合作时快速判断。">
              <GlassTextarea label="质量特点" value={state.qualityFeatures} onChange={(value) => update("qualityFeatures", value)} placeholder="稳定性、擅长产品或质量表现" />
              <GlassTextarea label="风险提示" value={state.riskNote} onChange={(value) => update("riskNote", value)} placeholder="需要特别关注的质量或排期风险" />
              <GlassTextarea label="备注" value={state.remarks} onChange={(value) => update("remarks", value)} placeholder="其他合作说明" />
            </FormPanel>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-white/26 bg-white/28 px-6 py-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600">静态 UI 原型，本轮不会写入数据库</div>
          <div className="flex gap-2"><button className="h-10 rounded-2xl border border-white/30 bg-white/28 px-4 text-sm text-stone-700 transition hover:bg-white/44" onClick={() => setIsClosing(true)} type="button">取消</button><button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800" onClick={submitStaticDraft} type="button"><Save className="size-4" />保存静态草稿</button></div>
        </div>
      </aside>
    </div>
  );
}
