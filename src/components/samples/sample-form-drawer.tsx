"use client";

import { AlertCircle, LoaderCircle, PackagePlus, Plus, Send, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
import { FormPanel, GlassInput, GlassTextarea } from "@/components/form/glass-form-controls";
import type { SampleRequestPayload } from "@/lib/api/sample-client";
import { getSampleFieldErrors } from "@/lib/api/sample-client";
import {
  createEmptySampleFormState,
  createEmptySampleItem,
  sampleFormToPayload,
  validateSampleForm,
  type SampleFormErrors,
  type SampleFormState,
  type SampleItemDraft,
} from "./sample-prototype-data";
import { SampleContactPicker, SampleCustomerPicker, SampleFabricPicker } from "./sample-pickers";

export function SampleFormDrawer({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (payload: SampleRequestPayload) => Promise<void>;
}) {
  const [state, setState] = useState<SampleFormState>(() => createEmptySampleFormState());
  const [errors, setErrors] = useState<SampleFormErrors>({});
  const [topError, setTopError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patch = (changes: Partial<SampleFormState>) => setState((current) => ({ ...current, ...changes }));

  const patchItem = (key: string, changes: Partial<SampleItemDraft>) =>
    setState((current) => ({
      ...current,
      items: current.items.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    }));

  const addItem = () => setState((current) => ({ ...current, items: [...current.items, createEmptySampleItem()] }));

  const removeItem = (key: string) =>
    setState((current) => ({
      ...current,
      items: current.items.length <= 1 ? current.items : current.items.filter((item) => item.key !== key),
    }));

  const handleSubmit = async () => {
    if (isSubmitting) return;
    const clientErrors = validateSampleForm(state);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setTopError("请先完成标记为必填的字段");
      return;
    }

    setIsSubmitting(true);
    setTopError("");
    setErrors({});

    try {
      await onSave(sampleFormToPayload(state));
    } catch (error) {
      const fieldErrors = getSampleFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors as SampleFormErrors);
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
      data-testid="sample-form-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose();
      }}
    >
      <aside
        aria-label="新增寄样单"
        className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/42 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl fabric-create-drawer-enter"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-300/36 bg-violet-500/12 text-violet-700 shadow-inner shadow-white/24">
              <Send className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-500"><Sparkles className="size-4 text-violet-600" />寄样管理</div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">新增寄样单</h2>
            </div>
          </div>
          <button
            aria-label="关闭寄样表单"
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

          <FormPanel icon={Send} tone="violet" title="寄样对象" description="寄样单号由系统自动生成，客户必须是合作中状态。">
            <SampleCustomerPicker
              error={errors.customerId}
              onChange={(next) => patch({ customerId: next.id, customerName: next.label, contactId: "" })}
              value={{ id: state.customerId, label: state.customerName }}
            />
            <SampleContactPicker
              customerId={state.customerId}
              onChange={(next) => patch({ contactId: next.id, contactName: next.label })}
              value={{ id: state.contactId, label: state.contactName }}
            />
            <GlassInput label="寄样目的" value={state.purpose} onChange={(value) => patch({ purpose: value })} placeholder="如 春季新品打样" />
            <GlassInput label="应退回日期" type="date" value={state.expectedReturnAt} onChange={(value) => patch({ expectedReturnAt: value })} />
            <GlassInput label="快递公司" value={state.carrier} onChange={(value) => patch({ carrier: value })} placeholder="如 顺丰" />
            <GlassInput label="快递单号" value={state.trackingNo} onChange={(value) => patch({ trackingNo: value })} placeholder="寄出后补录也可" />
          </FormPanel>

          <FormPanel icon={PackagePlus} tone="cyan" title="寄出面料" description="数量单位按面料类型自动带出（针织 kg / 梭织 米），保存后不再随主档变化。">
            {state.items.map((item, index) => (
              <div className="rounded-2xl border border-white/26 bg-white/16 p-3 md:col-span-2 xl:col-span-3" key={item.key}>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SampleFabricPicker
                    error={errors.itemErrors?.[item.key]}
                    onChange={(next) =>
                      patchItem(item.key, {
                        fabricId: next.id,
                        fabricCode: next.fabric.code ?? "",
                        fabricName: next.fabric.name ?? "",
                      })
                    }
                    value={{ id: item.fabricId, label: item.fabricId ? `${item.fabricCode} · ${item.fabricName}` : "" }}
                  />
                  <GlassInput label="数量" type="number" value={item.quantity} onChange={(value) => patchItem(item.key, { quantity: value })} placeholder="如 2.5" />
                  <GlassInput label="颜色 / 备注" value={item.colorOrRemark} onChange={(value) => patchItem(item.key, { colorOrRemark: value })} placeholder="如 胚布样" />
                  <div className="flex items-end">
                    <button
                      aria-label={`删除第${index + 1}行面料`}
                      className="flex h-10 items-center gap-1.5 rounded-xl border border-white/30 bg-white/24 px-3 text-sm text-stone-700 transition hover:bg-white/40 disabled:opacity-45"
                      disabled={state.items.length <= 1}
                      onClick={() => removeItem(item.key)}
                      type="button"
                    >
                      <Trash2 className="size-4" />删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="md:col-span-2 xl:col-span-3">
              <button className="flex h-10 items-center gap-1.5 rounded-xl border border-white/30 bg-white/24 px-3 text-sm text-stone-800 transition hover:bg-white/40" onClick={addItem} type="button"><Plus className="size-4" />添加面料</button>
            </div>
            {errors.items ? <div className="text-xs text-red-700 md:col-span-2 xl:col-span-3">{errors.items}</div> : null}
          </FormPanel>

          <FormPanel icon={Sparkles} tone="blue" title="收件与备注" description="收件信息默认可留空，寄出时再补录也能追溯。">
            <GlassInput label="收件人" value={state.receiverName} onChange={(value) => patch({ receiverName: value })} />
            <GlassInput label="收件电话" value={state.receiverPhone} onChange={(value) => patch({ receiverPhone: value })} />
            <div className="md:col-span-2 xl:col-span-3">
              <GlassInput label="收件地址" value={state.receiverAddress} onChange={(value) => patch({ receiverAddress: value })} />
            </div>
            <div className="md:col-span-2 xl:col-span-3">
              <GlassTextarea label="备注" value={state.remark} onChange={(value) => patch({ remark: value })} placeholder="客户特殊要求、寄样背景等" />
            </div>
          </FormPanel>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/24 px-6 py-4">
          <span className="text-xs text-stone-600">保存后自动生成寄样单号，状态为「待寄出」</span>
          <div className="flex items-center gap-2">
            <button className="h-10 rounded-2xl border border-white/30 bg-white/24 px-4 text-sm text-stone-800 transition hover:bg-white/40 disabled:opacity-50" disabled={isSubmitting} onClick={onClose} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60" disabled={isSubmitting} onClick={handleSubmit} type="button">
              {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}创建寄样单
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
