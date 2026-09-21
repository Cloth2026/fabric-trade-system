"use client";

import { AlertCircle, Contact, LoaderCircle, Save, Star, X } from "lucide-react";
import { useState } from "react";
import { FormPanel, GlassInput, GlassTextarea, PanelTitle, SegmentedControl } from "@/components/form/glass-form-controls";
import { getCustomerFieldErrors, type CustomerContactPayload } from "@/lib/api/customer-client";
import type { CustomerContactStatus } from "@/server/customers/constants";
import { customerStatusLabels } from "./customer-prototype-data";

type ContactFormState = {
  name: string;
  title: string;
  department: string;
  phone: string;
  email: string;
  socialContact: string;
  isPrimary: boolean;
  status: CustomerContactStatus;
  remarks: string;
};

const contactStatusOptions = (["active", "inactive"] as CustomerContactStatus[]).map((value) => ({
  value,
  label: value === "active" ? "在职对接" : "已停用",
}));

function createContactFormState(contact?: {
  name: string;
  title: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  socialContact: string | null;
  isPrimary: boolean;
  status: CustomerContactStatus;
  remarks: string | null;
}): ContactFormState {
  return {
    name: contact?.name ?? "",
    title: contact?.title ?? "",
    department: contact?.department ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    socialContact: contact?.socialContact ?? "",
    isPrimary: contact?.isPrimary ?? false,
    status: contact?.status ?? "active",
    remarks: contact?.remarks ?? "",
  };
}

const optional = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

function validate(state: ContactFormState) {
  const errors: Partial<Record<keyof ContactFormState, string>> = {};
  if (state.name.trim().length === 0) errors.name = "请填写联系人姓名";
  if (state.email.trim().length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim())) {
    errors.email = "邮箱格式不正确";
  }
  return errors;
}

function toPayload(state: ContactFormState): CustomerContactPayload {
  return {
    name: state.name.trim(),
    title: optional(state.title),
    department: optional(state.department),
    phone: optional(state.phone),
    email: optional(state.email),
    socialContact: optional(state.socialContact),
    isPrimary: state.isPrimary,
    status: state.status,
    remarks: optional(state.remarks),
  };
}

export function CustomerContactDrawer({
  mode,
  customerName,
  contact,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  customerName: string;
  contact?: {
    name: string;
    title: string | null;
    department: string | null;
    phone: string | null;
    email: string | null;
    socialContact: string | null;
    isPrimary: boolean;
    status: CustomerContactStatus;
    remarks: string | null;
  };
  onClose: () => void;
  onSave: (payload: CustomerContactPayload) => Promise<void>;
}) {
  const [state, setState] = useState<ContactFormState>(() => createContactFormState(contact));
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
  const [topError, setTopError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onFieldChange = (field: keyof ContactFormState, value: string | boolean) => {
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
    const clientErrors = validate(state);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setTopError("请先完成标记为必填的字段");
      return;
    }

    setIsSubmitting(true);
    setTopError("");
    setErrors({});

    try {
      await onSave(toPayload(state));
    } catch (error) {
      const fieldErrors = getCustomerFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors as Partial<Record<keyof ContactFormState, string>>);
        setTopError("请检查标记字段后重新保存");
      } else {
        setTopError(error instanceof Error ? error.message : "保存失败，请稍后重试");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[55] bg-stone-950/30 backdrop-blur-md fabric-create-backdrop-enter"
      data-testid="customer-contact-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <aside
        aria-label={mode === "create" ? "新增联系人" : "编辑联系人"}
        className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/46 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl fabric-create-drawer-enter"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-300/36 bg-violet-500/12 text-violet-700 shadow-inner shadow-white/24">
              <Contact className="size-5" />
            </div>
            <div>
              <div className="text-sm text-stone-500">{customerName}</div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">{mode === "create" ? "新增联系人" : "编辑联系人"}</h2>
            </div>
          </div>
          <button aria-label="关闭联系人表单" className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42 disabled:opacity-50" disabled={isSubmitting} onClick={onClose} type="button"><X className="size-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {topError ? <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900"><AlertCircle className="size-4 shrink-0" />{topError}</div> : null}

          <FormPanel icon={Contact} tone="violet" title="联系人信息" description="同一客户下联系人不能重名；主联系人唯一。">
            <GlassInput label="姓名" required value={state.name} onChange={(value) => onFieldChange("name", value)} placeholder="如 李经理" error={errors.name} />
            <GlassInput label="职位" value={state.title} onChange={(value) => onFieldChange("title", value)} placeholder="如 采购主管" />
            <GlassInput label="部门" value={state.department} onChange={(value) => onFieldChange("department", value)} placeholder="如 供应链部" />
            <GlassInput label="电话" value={state.phone} onChange={(value) => onFieldChange("phone", value)} placeholder="手机号或座机" />
            <GlassInput label="邮箱" value={state.email} onChange={(value) => onFieldChange("email", value)} placeholder="name@example.com" error={errors.email} />
            <GlassInput label="社交账号" value={state.socialContact} onChange={(value) => onFieldChange("socialContact", value)} placeholder="微信 / WhatsApp" />
            <GlassTextarea label="备注" value={state.remarks} onChange={(value) => onFieldChange("remarks", value)} placeholder="沟通习惯、注意事项" />
          </FormPanel>

          <div className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <PanelTitle icon={Star} tone="amber" title="主要联系人" description="设为主要的联系人会在寄样与客户沟通中优先展示，同一客户仅保留一位。" />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <SegmentedControl options={[{ value: "no", label: "普通联系人" }, { value: "yes", label: "设为主要联系人" }]} value={state.isPrimary ? "yes" : "no"} onChange={(value) => onFieldChange("isPrimary", value === "yes")} />
              <SegmentedControl<CustomerContactStatus> options={contactStatusOptions} value={state.status} onChange={(value) => onFieldChange("status", value)} />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-white/24 bg-white/22 px-6 py-4 backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-stone-600">当前状态：{customerStatusLabels[state.status === "active" ? "active" : "inactive"]}</div>
          <div className="flex gap-2">
            <button className="h-10 rounded-2xl border border-white/28 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/38 disabled:opacity-50" disabled={isSubmitting} onClick={onClose} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-55" disabled={isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSubmitting ? "正在保存" : "保存联系人"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
