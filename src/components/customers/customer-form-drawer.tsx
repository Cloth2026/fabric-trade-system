"use client";

import { AlertCircle, Building2, LoaderCircle, MapPin, Save, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { FormPanel, GlassInput, GlassTextarea, PanelTitle, SegmentedControl } from "@/components/form/glass-form-controls";
import { getCustomerFieldErrors, type CustomerPayload } from "@/lib/api/customer-client";
import type { CustomerStatus } from "@/server/customers/constants";
import {
  createCustomerFormState,
  createEmptyCustomerFormState,
  customerFormToPayload,
  customerLevelOptions,
  customerStatusOptions,
  customerTypeOptions,
  validateCustomerForm,
  type CustomerFormState,
} from "./customer-prototype-data";
import type { CustomerDetailRecord, CustomerRecord } from "@/lib/api/customer-client";

type Errors = Partial<Record<keyof CustomerFormState, string>>;

export function CustomerFormDrawer({
  mode,
  customer,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  customer?: CustomerRecord | CustomerDetailRecord;
  onClose: () => void;
  onSave: (payload: CustomerPayload) => Promise<void>;
}) {
  const [state, setState] = useState<CustomerFormState>(() =>
    customer ? createCustomerFormState(customer) : createEmptyCustomerFormState(),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [topError, setTopError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFieldChange = (field: keyof CustomerFormState, value: string) => {
    setState((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const clientErrors = validateCustomerForm(state);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setTopError("请先完成标记为必填的字段");
      return;
    }

    setIsSubmitting(true);
    setTopError("");
    setErrors({});

    try {
      await onSave(customerFormToPayload(state));
    } catch (error) {
      const fieldErrors = getCustomerFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors as Errors);
        setTopError("请检查标记字段后重新保存");
      } else {
        setTopError(error instanceof Error ? error.message : "保存失败，请稍后重试");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-md fabric-create-backdrop-enter"
      data-testid="customer-form-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <aside
        aria-label={mode === "create" ? "新增客户" : "编辑客户"}
        className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/42 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl fabric-create-drawer-enter"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-300/36 bg-blue-500/12 text-blue-700 shadow-inner shadow-white/24">
              <Building2 className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-500"><Sparkles className="size-4 text-blue-600" />客户主档</div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">{mode === "create" ? "新增客户" : `编辑客户 · ${customer?.name ?? ""}`}</h2>
            </div>
          </div>
          <button
            aria-label="关闭客户表单"
            className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42 disabled:opacity-50"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {topError ? <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900"><AlertCircle className="size-4 shrink-0" />{topError}</div> : null}

          <FormPanel icon={Building2} tone="blue" title="客户主体" description="客户名称在租户内唯一，类型与等级用于后续寄样与报价分析。">
            <GlassInput label="客户名称" required value={state.name} onChange={(value) => onFieldChange("name", value)} placeholder="如 杭州云裳服饰有限公司" error={errors.name} />
            <GlassInput label="主要联系人" value={state.contactName} onChange={(value) => onFieldChange("contactName", value)} placeholder="对接人姓名" error={errors.contactName} />
            <GlassInput label="联系电话" value={state.phone} onChange={(value) => onFieldChange("phone", value)} placeholder="手机号或座机" error={errors.phone} />
            <GlassInput label="邮箱" type="text" value={state.email} onChange={(value) => onFieldChange("email", value)} placeholder="name@example.com" error={errors.email} />
            <GlassInput label="社交账号" value={state.socialContact} onChange={(value) => onFieldChange("socialContact", value)} placeholder="微信 / WhatsApp" />

            <div className="md:col-span-2 xl:col-span-3">
              <div className="text-sm text-stone-700">客户类型</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <SegmentedControl options={[{ value: "", label: "未分类" }, ...customerTypeOptions]} value={state.type} onChange={(value) => onFieldChange("type", value)} />
              </div>
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <div className="text-sm text-stone-700">客户等级</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <SegmentedControl options={[{ value: "", label: "未分级" }, ...customerLevelOptions]} value={state.level} onChange={(value) => onFieldChange("level", value)} />
              </div>
            </div>
          </FormPanel>

          <FormPanel icon={MapPin} tone="emerald" title="所在地与商务信息" description="用于寄样地址、结算币种与账期参考。">
            <GlassInput label="国家 / 地区" value={state.country} onChange={(value) => onFieldChange("country", value)} placeholder="中国" />
            <GlassInput label="城市" value={state.city} onChange={(value) => onFieldChange("city", value)} placeholder="杭州" />
            <GlassInput label="详细地址" value={state.address} onChange={(value) => onFieldChange("address", value)} placeholder="街道、门牌" />
            <GlassInput label="主营品类" value={state.mainProducts} onChange={(value) => onFieldChange("mainProducts", value)} placeholder="如 针织女装" />
            <GlassInput label="合作品牌" value={state.cooperationBrands} onChange={(value) => onFieldChange("cooperationBrands", value)} placeholder="服务品牌" />
            <GlassInput label="结算币种" value={state.defaultCurrency} onChange={(value) => onFieldChange("defaultCurrency", value)} placeholder="CNY" error={errors.defaultCurrency} maxLength={3} />
            <GlassTextarea label="账期与结算方式" value={state.paymentTerms} onChange={(value) => onFieldChange("paymentTerms", value)} placeholder="如 月结 30 天" />
            <GlassTextarea label="备注" value={state.remarks} onChange={(value) => onFieldChange("remarks", value)} placeholder="其他业务说明" />
          </FormPanel>

          <div className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <PanelTitle icon={Sparkles} tone="violet" title="合作状态" description="停用后不能再新增联系人，历史寄样记录保留。" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              <SegmentedControl<CustomerStatus> options={customerStatusOptions} value={state.status} onChange={(value) => onFieldChange("status", value)} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-white/24 bg-white/22 px-6 py-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600">客户主档保存后，可在详情中维护多个联系人。</div>
          <div className="flex gap-2">
            <button className="h-10 rounded-2xl border border-white/28 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/38 disabled:opacity-50" disabled={isSubmitting} onClick={onClose} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-55" disabled={isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSubmitting ? "正在保存" : "保存客户"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
