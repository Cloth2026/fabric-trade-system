"use client";

import { AlertCircle, ArrowRight, Building2, LoaderCircle, MessageSquareQuote, PackageSearch, Send, Truck, X } from "lucide-react";
import { useState } from "react";
import type { SampleRequestDetailRecord } from "@/lib/api/sample-client";
import type { SampleFeedbackResult, SampleRequestStatus } from "@/server/samples/constants";
import { sampleFeedbackResultOptions } from "@/server/samples/constants";
import {
  formatSampleDate,
  formatSampleQuantity,
  isSampleOverdue,
  sampleFeedbackLabel,
  sampleFeedbackTones,
  sampleStatusLabel,
  sampleStatusTones,
  sampleStatusTransitions,
} from "./sample-prototype-data";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/22 py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-stone-600">{label}</span>
      <span className="text-right text-stone-950">{value}</span>
    </div>
  );
}

function FeedbackEditor({
  requestId,
  itemId,
  fabricLabel,
  feedback,
  feedbackResult,
  onSave,
}: {
  requestId: string;
  itemId: string;
  fabricLabel: string;
  feedback: string | null;
  feedbackResult: SampleFeedbackResult | null;
  onSave: (requestId: string, itemId: string, payload: { feedback: string | null; feedbackResult: SampleFeedbackResult | null }) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(feedback ?? "");
  const [result, setResult] = useState<SampleFeedbackResult | "">((feedbackResult ?? "") as SampleFeedbackResult | "");
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button className="h-8 rounded-xl border border-white/30 bg-white/26 px-3 text-xs text-stone-800 transition hover:bg-white/44" onClick={() => { setText(feedback ?? ""); setResult((feedbackResult ?? "") as SampleFeedbackResult | ""); setOpen(true); }} type="button">
        {feedbackResult && feedbackResult !== "pending" ? "修改反馈" : "录入反馈"}
      </button>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      await onSave(requestId, itemId, {
        feedback: text.trim() === "" ? null : text.trim(),
        feedbackResult: result === "" ? null : result,
      });
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/30 bg-white/30 p-3">
      <div className="text-xs text-stone-600">{fabricLabel} · 客户反馈</div>
      <textarea
        className="mt-2 min-h-16 w-full resize-y rounded-xl border border-white/30 bg-white/28 px-3 py-2 text-sm text-stone-950 outline-none focus:bg-white/38"
        onChange={(event) => setText(event.target.value)}
        placeholder="客户对手感、颜色、品质的评价"
        value={text}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {sampleFeedbackResultOptions.map((option) => (
          <button
            className={`h-8 rounded-xl border px-3 text-xs transition ${result === option.value ? "border-blue-400/50 bg-blue-500/16 text-blue-800" : "border-white/30 bg-white/26 text-stone-700 hover:bg-white/44"}`}
            key={option.value}
            onClick={() => setResult(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button className="h-8 rounded-xl border border-white/30 bg-white/26 px-3 text-xs text-stone-800" disabled={busy} onClick={() => setOpen(false)} type="button">取消</button>
        <button className="flex h-8 items-center gap-1.5 rounded-xl bg-stone-950/90 px-3 text-xs font-medium text-white disabled:opacity-60" disabled={busy} onClick={submit} type="button">
          {busy ? <LoaderCircle className="size-3.5 animate-spin" /> : null}保存反馈
        </button>
      </div>
    </div>
  );
}

export function SampleDetailDrawer({
  request,
  loading,
  error,
  onClose,
  onStatusChange,
  onSaveFeedback,
}: {
  request: SampleRequestDetailRecord | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onStatusChange: (status: SampleRequestStatus) => Promise<void>;
  onSaveFeedback: (
    requestId: string,
    itemId: string,
    payload: { feedback: string | null; feedbackResult: SampleFeedbackResult | null },
  ) => Promise<void>;
}) {
  const [statusBusy, setStatusBusy] = useState<SampleRequestStatus | null>(null);

  if (!request) return null;

  const overdue = isSampleOverdue(request);
  const transitions = sampleStatusTransitions[request.status] ?? [];

  const changeStatus = async (status: SampleRequestStatus) => {
    setStatusBusy(status);
    try {
      await onStatusChange(status);
    } finally {
      setStatusBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 bg-stone-950/26 backdrop-blur-md"
      data-testid="sample-detail-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        aria-label={`寄样单 ${request.code} 详情`}
        className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/44 shadow-[0_36px_120px_rgba(26,22,18,0.32),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-300/36 bg-violet-500/12 text-violet-700 shadow-inner shadow-white/24">
              <PackageSearch className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                寄样单
                <span className={`rounded-full px-2 py-0.5 text-xs ${sampleStatusTones[request.status]}`}>{sampleStatusLabel(request.status)}</span>
                {overdue ? <span className="rounded-full bg-rose-50/82 px-2 py-0.5 text-xs text-rose-800">已超期未退</span> : null}
              </div>
              <h2 className="mt-1 font-mono text-2xl font-semibold text-stone-950">{request.code}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-stone-700"><Building2 className="size-3.5" />{request.customer.name}</div>
            </div>
          </div>
          <button aria-label="关闭寄样详情" className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42" onClick={onClose} type="button"><X className="size-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {error ? <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-200/60 bg-red-50/50 px-4 py-3 text-sm text-red-900"><AlertCircle className="size-4 shrink-0" />{error}</div> : null}

          <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-stone-950">状态推进</h3>
              {loading ? <LoaderCircle className="size-4 animate-spin text-stone-500" /> : null}
            </div>
            {transitions.length === 0 ? (
              <p className="mt-2 text-sm text-stone-600">寄样单已结束，没有可推进的状态。</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {transitions.map((status) => (
                  <button
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-stone-950/90 px-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:opacity-60"
                    disabled={statusBusy !== null}
                    key={status}
                    onClick={() => changeStatus(status)}
                    type="button"
                  >
                    {statusBusy === status ? <LoaderCircle className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
                    标记为「{sampleStatusLabel(status)}」
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <h3 className="font-semibold text-stone-950">单据信息</h3>
            <div className="mt-2">
              <InfoRow label="寄样目的" value={request.purpose ?? "—"} />
              <InfoRow label="收件人" value={request.receiverName ?? request.contact?.name ?? "—"} />
              <InfoRow label="收件电话" value={request.receiverPhone ?? request.contact?.phone ?? "—"} />
              <InfoRow label="收件地址" value={request.receiverAddress ?? "—"} />
              <InfoRow label="快递" value={[request.carrier, request.trackingNo].filter(Boolean).join(" / ") || "—"} />
              <InfoRow label="寄出时间" value={formatSampleDate(request.sentAt)} />
              <InfoRow label="应退回日期" value={formatSampleDate(request.expectedReturnAt)} />
              <InfoRow label="实际退回" value={formatSampleDate(request.returnedAt)} />
              <InfoRow label="备注" value={request.remark ?? "—"} />
            </div>
          </section>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <div className="flex items-center gap-2"><Truck className="size-4 text-violet-600" /><h3 className="font-semibold text-stone-950">寄出明细</h3><span className="rounded-full bg-white/40 px-2 py-0.5 text-xs text-stone-700">{request.items.length} 支</span></div>
            <div className="mt-3 space-y-3">
              {request.items.map((item) => (
                <div className="rounded-2xl border border-white/26 bg-white/20 p-3" key={item.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium text-stone-950">
                        <span className="font-mono">{item.fabric.code}</span>
                        <span className="truncate">{item.fabric.name}</span>
                      </div>
                      <div className="mt-1 text-xs text-stone-600">
                        {item.fabric.composition} · {formatSampleQuantity(item)} · {item.colorOrRemark ?? "无备注"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${item.feedbackResult ? sampleFeedbackTones[item.feedbackResult] : "bg-stone-200/72 text-stone-700"}`}>
                        {sampleFeedbackLabel(item.feedbackResult)}
                      </span>
                      <FeedbackEditor
                        fabricLabel={item.fabric.code}
                        feedback={item.feedback}
                        feedbackResult={item.feedbackResult}
                        itemId={item.id}
                        onSave={onSaveFeedback}
                        requestId={request.id}
                      />
                    </div>
                  </div>
                  {item.feedback ? <div className="mt-2 flex items-start gap-2 rounded-xl bg-white/30 px-3 py-2 text-xs text-stone-700"><MessageSquareQuote className="mt-0.5 size-3.5 shrink-0" />{item.feedback}</div> : null}
                  {item.feedbackAt ? <div className="mt-1 text-[11px] text-stone-500">反馈时间 {formatSampleDate(item.feedbackAt)}</div> : null}
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-white/24 px-6 py-4 text-xs text-stone-600">
          <span className="flex items-center gap-1.5"><Send className="size-3.5" />创建于 {formatSampleDate(request.createdAt)}</span>
          <button className="h-9 rounded-2xl border border-white/30 bg-white/24 px-4 text-sm text-stone-800 transition hover:bg-white/40" onClick={onClose} type="button">关闭</button>
        </div>
      </aside>
    </div>
  );
}
