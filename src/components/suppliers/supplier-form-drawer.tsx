"use client";

import { Building2, Contact, Handshake, Pencil, Plus, Save, ShieldAlert, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { FieldError, FormPanel, GlassInput, GlassTextarea, PanelTitle, SegmentedControl } from "@/components/form/glass-form-controls";
import { getSupplierFieldErrors, SupplierApiError } from "@/lib/api/supplier-client";
import { createEmptySupplierForm, supplierRoleLabels, supplierRoles, supplierToForm } from "./supplier-prototype-data";
import type { SupplierFormState, SupplierPrototype, SupplierRole, SupplierStatus } from "./supplier-prototype-data";

export function SupplierFormDrawer({
  mode,
  supplier,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  supplier?: SupplierPrototype;
  onClose: () => void;
  onSave: (state: SupplierFormState) => Promise<void>;
}) {
  const [state, setState] = useState<SupplierFormState>(() => (supplier ? supplierToForm(supplier) : createEmptySupplierForm()));
  const [errors, setErrors] = useState<{ name?: string; roles?: string; email?: string }>({});
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const filledCount = useMemo(
    () => [state.name, state.country, state.city, state.address, state.contactName, state.phone, state.specialties, state.defaultLeadTime, state.defaultMoq, state.paymentTerms].filter((value) => value.trim()).length,
    [state],
  );

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  const update = <K extends keyof SupplierFormState>(field: K, value: SupplierFormState[K]) => {
    setState((current) => ({ ...current, [field]: value }));
    if (field === "name" || field === "roles" || field === "email") setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError("");
  };

  const toggleRole = (role: SupplierRole) => {
    update("roles", state.roles.includes(role) ? state.roles.filter((item) => item !== role) : [...state.roles, role]);
  };

  const submit = async () => {
    const nextErrors = {
      name: state.name.trim() ? undefined : "请填写供应商名称",
      roles: state.roles.length > 0 ? undefined : "请至少选择一个供应商角色",
      email:
        !state.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())
          ? undefined
          : "请输入有效的邮箱地址",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.roles || nextErrors.email) return;

    setIsSaving(true);
    setSubmitError("");
    try {
      await onSave({ ...state, name: state.name.trim() });
    } catch (error) {
      const fieldErrors = getSupplierFieldErrors(error);
      setErrors((current) => ({
        ...current,
        name: fieldErrors.name ?? current.name,
        roles: fieldErrors.roles ?? current.roles,
        email: fieldErrors.email ? "请输入有效的邮箱地址" : current.email,
      }));
      setSubmitError(
        error instanceof SupplierApiError && error.status === 400
          ? "请检查标记字段后重新保存"
          : "保存失败，请稍后重试",
      );
      setIsSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-md ${isClosing ? "fabric-create-backdrop-exit" : "fabric-create-backdrop-enter"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsClosing(true);
      }}
    >
      <aside className={`absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-5xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/48 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl ${isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/26 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex size-11 items-center justify-center rounded-2xl border shadow-inner shadow-white/24 ${mode === "create" ? "border-emerald-300/38 bg-emerald-500/14 text-emerald-700" : "border-blue-300/38 bg-blue-500/14 text-blue-700"}`}>
              {mode === "create" ? <Plus className="size-5" /> : <Pencil className="size-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-500"><Sparkles className="size-4 text-blue-600" />供应商档案</div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">{mode === "create" ? "新增供应商" : "编辑供应商"}</h2>
            </div>
          </div>
          <button aria-label={`关闭${mode === "create" ? "新增" : "编辑"}供应商`} className="flex size-9 items-center justify-center rounded-xl border border-white/30 bg-white/24 transition hover:bg-white/44" onClick={() => setIsClosing(true)} type="button"><X className="size-4" /></button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[250px_1fr]">
          <aside className="border-b border-white/24 bg-stone-950/8 p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-2xl border border-blue-200/48 bg-blue-50/44 p-4 text-sm text-blue-950">
              <div className="font-semibold">真实供应商档案</div>
              <p className="mt-2 text-xs leading-5 text-blue-900/76">保存后将写入当前租户，供应商角色用于后续面料来源和加工协作。</p>
            </div>
            <div className="mt-4 rounded-2xl border border-white/30 bg-white/20 p-4">
              <div className="flex items-center justify-between text-sm"><span className="font-medium text-stone-900">资料填写预览</span><span className="text-stone-600">{filledCount}/10</span></div>
              <div className="mt-3 h-2 rounded-full bg-white/46"><div className="h-2 rounded-full bg-stone-950/84 transition-all" style={{ width: `${filledCount * 10}%` }} /></div>
              <p className="mt-3 text-xs leading-5 text-stone-500">这里只用于帮助评估表单布局，不代表未来正式完整度规则。</p>
            </div>
            <div className="mt-4 rounded-2xl border border-white/30 bg-white/20 p-4 text-xs leading-5 text-stone-600">
              <div className="font-medium text-stone-900">设计原则</div>
              <p className="mt-2">一个供应商可以承担多个角色。基础资料、联系人和合作信息分区维护。</p>
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5">
            {submitError ? <div className="mb-4 rounded-2xl border border-rose-300/50 bg-rose-50/72 px-4 py-3 text-sm text-rose-800">{submitError}</div> : null}
            <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
              <PanelTitle icon={Building2} tone="blue" title="基础资料" description="供应商名称与角色用于检索和业务关系识别。" />
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <GlassInput label="供应商名称" required value={state.name} onChange={(value) => update("name", value)} placeholder="请输入完整名称" error={errors.name} />
                <div className="md:col-span-2">
                  <div className="text-sm text-stone-600">供应商角色<span className="ml-1 text-red-600">*</span></div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {supplierRoles.map((role) => {
                      const selected = state.roles.includes(role);
                      return <button aria-pressed={selected} className={`h-8 rounded-xl border px-3 text-sm transition ${selected ? "border-blue-400/50 bg-blue-500/16 text-blue-800 shadow-inner shadow-white/20" : "border-white/32 bg-white/24 text-stone-700 hover:bg-white/42"}`} key={role} onClick={() => toggleRole(role)} type="button">{supplierRoleLabels[role]}</button>;
                    })}
                  </div>
                  <FieldError error={errors.roles} />
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <div className="mb-1 text-sm text-stone-600">合作状态</div>
                  <SegmentedControl<SupplierStatus> options={[{ value: "active", label: "启用" }, { value: "inactive", label: "停用" }]} value={state.status} onChange={(value) => update("status", value)} />
                </div>
                <GlassInput label="国家 / 地区" value={state.country} onChange={(value) => update("country", value)} placeholder="如 中国" />
                <GlassInput label="城市" value={state.city} onChange={(value) => update("city", value)} placeholder="省 / 市" />
                <GlassInput label="详细地址" value={state.address} onChange={(value) => update("address", value)} placeholder="园区、市场、档口或门牌号" />
              </div>
            </section>

            <FormPanel icon={Contact} tone="emerald" title="主要联系人" description="列表只展示一个主要联系人，其他联系人后续单独设计。">
              <GlassInput label="联系人姓名" value={state.contactName} onChange={(value) => update("contactName", value)} placeholder="主要业务联系人" />
              <GlassInput label="电话" value={state.phone} onChange={(value) => update("phone", value)} placeholder="手机或座机" />
              <GlassInput label="邮箱" value={state.email} onChange={(value) => update("email", value)} placeholder="name@example.com" error={errors.email} />
              <GlassInput label="微信 / WhatsApp" value={state.socialContact} onChange={(value) => update("socialContact", value)} placeholder="账号或说明" />
            </FormPanel>

            <FormPanel icon={Handshake} tone="violet" title="合作信息" description="记录与采购、生产和交付直接相关的合作条件。">
              <GlassInput label="主营产品或工艺" value={state.specialties} onChange={(value) => update("specialties", value)} placeholder="如 针织现货、染色定型、数码印花" />
              <GlassInput label="常规交期" value={state.defaultLeadTime} onChange={(value) => update("defaultLeadTime", value)} placeholder="如 7-10 天" />
              <GlassInput label="MOQ 说明" value={state.defaultMoq} onChange={(value) => update("defaultMoq", value)} placeholder="如 单色 300kg 起" />
              <GlassInput label="付款方式" value={state.paymentTerms} onChange={(value) => update("paymentTerms", value)} placeholder="如 30% 定金，出货前结清" />
              <GlassInput label="合作评价" value={state.cooperationComment} onChange={(value) => update("cooperationComment", value)} placeholder="交期、品质、沟通等客观记录" />
              <GlassInput label="风险提醒" value={state.riskNote} onChange={(value) => update("riskNote", value)} placeholder="需要关注的合作风险" />
              <GlassTextarea label="备注" value={state.remarks} onChange={(value) => update("remarks", value)} placeholder="其他合作说明" />
            </FormPanel>

            {state.riskNote ? (
              <div className="mt-4 flex gap-3 rounded-2xl border border-amber-300/48 bg-amber-50/60 p-4 text-sm text-amber-950"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><div><div className="font-medium">风险提醒预览</div><p className="mt-1 leading-6">{state.riskNote}</p></div></div>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-white/26 bg-white/24 px-6 py-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600">保存后立即更新供应商名录</div>
          <div className="flex gap-2">
            <button className="h-10 rounded-2xl border border-white/30 bg-white/28 px-4 text-sm text-stone-700 transition hover:bg-white/44" onClick={() => setIsClosing(true)} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-55" disabled={isSaving} onClick={submit} type="button"><Save className="size-4" />{isSaving ? "保存中..." : "保存供应商"}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
