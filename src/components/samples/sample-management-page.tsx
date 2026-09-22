"use client";

import { CheckCircle2, ChevronDown, Filter, LoaderCircle, Menu, PackageSearch, Plus, RefreshCw, Search, Sparkles, Timer, Truck, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createSampleRequest,
  fetchSampleRequest,
  patchSampleItemFeedback,
  fetchSampleRequests,
  getSampleErrorMessage,
  patchSampleRequestStatus,
  type SampleRequestDetailRecord,
  type SampleRequestPayload,
  type SampleRequestRecord,
} from "@/lib/api/sample-client";
import type { SampleFeedbackResult, SampleRequestStatus } from "@/server/samples/constants";
import { sampleRequestStatusLabels, sampleRequestStatusOptions } from "@/server/samples/constants";
import { SampleDetailDrawer } from "./sample-detail-drawer";
import { SampleFormDrawer } from "./sample-form-drawer";
import { formatSampleDate, isSampleOverdue, sampleStatusLabel, sampleStatusTones } from "./sample-prototype-data";

type StatusFilter = SampleRequestStatus | "all";

function FilterSelect({ options, value, onChange }: { options: Array<{ value: StatusFilter; label: string }>; value: StatusFilter; onChange: (value: StatusFilter) => void }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;
  return (
    <div className="relative" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      <button aria-expanded={open} className={`flex h-9 min-w-32 items-center justify-between gap-3 rounded-xl border px-3 text-sm shadow-inner shadow-white/12 transition ${open ? "border-white/52 bg-white/40" : "border-white/30 bg-white/24 hover:bg-white/36"}`} onClick={() => setOpen((current) => !current)} type="button">
        <span className="text-stone-500">状态</span>
        <span className="flex items-center gap-1.5 font-medium text-stone-950"><span className="max-w-24 truncate">{selectedLabel}</span><ChevronDown className={`size-4 transition ${open ? "rotate-180" : ""}`} /></span>
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-30 max-h-72 w-40 overflow-auto rounded-2xl border border-white/40 bg-white/76 p-1.5 text-sm shadow-[0_24px_70px_rgba(22,18,14,0.24)] backdrop-blur-3xl">
          {options.map((option) => (
            <button className={`flex min-h-9 w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${option.value === value ? "bg-white/90 text-stone-950 shadow-sm" : "text-stone-700 hover:bg-white/52"}`} key={option.value} onClick={() => { onChange(option.value); setOpen(false); }} type="button">
              {option.label}{option.value === value ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: number; note: string; icon: LucideIcon; tone: "violet" | "blue" | "amber" | "emerald" }) {
  const tones = { violet: "border-violet-300/34 bg-violet-500/12 text-violet-700", blue: "border-blue-300/34 bg-blue-500/12 text-blue-700", amber: "border-amber-300/42 bg-amber-400/16 text-amber-800", emerald: "border-emerald-300/34 bg-emerald-500/12 text-emerald-700" };
  return <div className="rounded-[18px] border border-white/26 bg-white/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl transition hover:bg-white/28"><div className="flex items-center justify-between"><span className="text-xs text-stone-700">{label}</span><span className={`flex size-8 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon className="size-4" /></span></div><div className="mt-1 text-2xl font-semibold text-stone-950">{value}</div><div className="mt-1 truncate text-xs text-stone-600">{note}</div></div>;
}

export function SampleManagementPage() {
  const [requests, setRequests] = useState<SampleRequestRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [listRefresh, setListRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SampleRequestDetailRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);
  const detailRequestId = useRef(0);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2800);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setListLoading(true);
      setListError("");
      fetchSampleRequests({ q: query, status: statusFilter, limit: 50 }, controller.signal)
        .then(setRequests)
        .catch((error) => { if (!controller.signal.aborted) setListError(getSampleErrorMessage(error, "寄样单读取失败，请重试")); })
        .finally(() => { if (!controller.signal.aborted) setListLoading(false); });
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [listRefresh, query, statusFilter]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const requestId = ++detailRequestId.current;
    fetchSampleRequest(selectedId, controller.signal)
      .then((next) => { if (!controller.signal.aborted && requestId === detailRequestId.current) setDetail(next); })
      .catch((error) => { if (!controller.signal.aborted && requestId === detailRequestId.current) setDetailError(getSampleErrorMessage(error, "寄样详情读取失败")); })
      .finally(() => { if (!controller.signal.aborted && requestId === detailRequestId.current) setDetailLoading(false); });
    return () => controller.abort();
  }, [detailRefresh, selectedId]);

  const selectRequest = (request: SampleRequestRecord) => {
    detailRequestId.current += 1;
    setSelectedId(request.id);
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
  };

  const closeDetail = () => {
    detailRequestId.current += 1;
    setSelectedId(null);
    setDetail(null);
    setDetailError("");
  };

  const refreshDetail = () => setDetailRefresh((value) => value + 1);

  const saveSample = async (payload: SampleRequestPayload) => {
    const saved = await createSampleRequest(payload);
    setFormOpen(false);
    setSelectedId(saved.id);
    setDetail(saved);
    setListRefresh((value) => value + 1);
    showToast(`寄样单 ${saved.code} 已创建`);
  };

  const changeStatus = async (status: SampleRequestStatus) => {
    if (!detail) return;
    try {
      const saved = await patchSampleRequestStatus(detail.id, { status });
      setDetail(saved);
      setListRefresh((value) => value + 1);
      showToast(`${saved.code} 已标记为「${sampleRequestStatusLabels[saved.status]}」`);
    } catch (error) {
      showToast(getSampleErrorMessage(error, "状态更新失败，请重试"));
    }
  };

  const saveFeedback = async (
    requestId: string,
    itemId: string,
    payload: { feedback: string | null; feedbackResult: SampleFeedbackResult | null },
  ) => {
    try {
      await patchSampleItemFeedback(requestId, itemId, payload);
      refreshDetail();
      setListRefresh((value) => value + 1);
      showToast("客户反馈已保存");
    } catch (error) {
      showToast(getSampleErrorMessage(error, "反馈保存失败，请重试"));
    }
  };

  const inFlightCount = requests.filter((request) => request.status === "shipped" || request.status === "delivered").length;
  const overdueCount = requests.filter((request) => isSampleOverdue(request)).length;
  const feedbackCount = requests.reduce((total, request) => total + request._count.items, 0);

  const statusOptions = useMemo<Array<{ value: StatusFilter; label: string }>>(
    () => [{ value: "all", label: "全部状态" }, ...sampleRequestStatusOptions],
    [],
  );

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
        <div className="flex items-center gap-3">
          <button aria-label="打开导航" className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden" type="button"><Menu className="size-4" /></button>
          <div>
            <div className="text-sm font-semibold text-stone-950">寄样管理</div>
            <div className="text-xs text-stone-700/72">寄出、回收与客户反馈</div>
          </div>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800" onClick={() => setFormOpen(true)} type="button"><Plus className="size-4" />新增寄样单</button>
      </header>

      <section className="grid shrink-0 gap-2 px-4 py-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="当前结果" value={requests.length} note="最多显示 50 张" icon={PackageSearch} tone="violet" />
        <Metric label="在途寄样" value={inFlightCount} note="已寄出或客户已签收" icon={Truck} tone="blue" />
        <Metric label="超期未退" value={overdueCount} note="超过应退回日期" icon={Timer} tone="amber" />
        <Metric label="寄出支数" value={feedbackCount} note="含已退回的面料总数" icon={CheckCircle2} tone="emerald" />
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-white/14 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700"><Sparkles className="size-4 text-violet-600" />寄样台账<span className="rounded-full border border-emerald-200/60 bg-emerald-50/58 px-2 py-0.5 text-xs text-emerald-800">实时数据</span></div>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950">跟踪寄出、回收与客户反馈</h1>
            <p className="mt-1 text-sm text-stone-600">寄样单按面料逐支登记，单位在寄出时快照，后续主档调整不影响历史</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row">
            <label className="flex h-9 min-w-72 items-center gap-2 rounded-xl border border-white/30 bg-white/24 px-3 text-sm shadow-inner shadow-white/12">
              <Search className="size-4 text-stone-500" />
              <input className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70" onChange={(event) => setQuery(event.target.value)} placeholder="搜索单号、客户、快递单号" value={query} />
              {query ? <button aria-label="清空寄样搜索" className="rounded-lg p-1 text-stone-500 hover:bg-white/44" onClick={() => setQuery("")} type="button"><X className="size-3.5" /></button> : null}
            </label>
            <FilterSelect options={statusOptions} value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/44 pt-3 text-xs text-stone-600">
          <span>点击寄样单查看明细、推进状态并录入反馈</span>
          <span className="flex items-center gap-1.5"><Filter className="size-3.5" />{listLoading ? "正在读取" : `已读取 ${requests.length} 张`}</span>
        </div>

        {listError ? <div className="mt-3 flex items-center justify-between rounded-2xl border border-rose-200/60 bg-rose-50/66 px-4 py-3 text-sm text-rose-800"><span>{listError}</span><button className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white/60 px-3 py-2" onClick={() => setListRefresh((value) => value + 1)} type="button"><RefreshCw className="size-4" />重试</button></div> : null}

        <div className="relative mt-3 min-h-0 flex-1 overflow-auto rounded-[18px] border border-white/26 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
          {listLoading && requests.length > 0 ? <div className="absolute right-3 top-3 z-20 flex items-center gap-2 rounded-xl bg-white/72 px-3 py-2 text-xs text-stone-600 shadow-sm"><LoaderCircle className="size-3.5 animate-spin" />更新中</div> : null}
          <table className="w-full min-w-[1000px] table-fixed border-collapse text-left text-sm">
            <colgroup><col className="w-[15%]" /><col className="w-[18%]" /><col className="w-[9%]" /><col className="w-[8%]" /><col className="w-[13%]" /><col className="w-[11%]" /><col className="w-[10%]" /><col className="w-[8%]" /><col className="w-[8%]" /></colgroup>
            <thead className="sticky top-0 z-10 bg-white/60 text-xs text-stone-700 backdrop-blur-2xl">
              <tr>{["寄样单号", "客户", "状态", "支数", "寄样目的", "快递", "应退回", "寄出时间", "最近更新"].map((header) => <th className="px-4 py-3 font-medium" key={header}>{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-white/24">
              {requests.length === 0 && !listLoading ? <tr><td className="px-4 py-10 text-center text-stone-500" colSpan={9}>当前筛选条件下没有寄样单，点击右上角新增寄样单</td></tr> : null}
              {requests.map((request) => (
                <tr aria-label={`查看寄样单${request.code}详情`} className={`cursor-pointer transition hover:bg-white/34 focus:bg-white/38 focus:outline-none ${selectedId === request.id ? "bg-white/30" : ""}`} key={request.id} onClick={() => selectRequest(request)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectRequest(request); } }} tabIndex={0}>
                  <td className="px-4 py-3 font-mono text-stone-950">{request.code}</td>
                  <td className="px-4 py-3 text-stone-700"><span className="block truncate">{request.customer.name}</span><span className="block truncate text-xs text-stone-500">{request.customer.city ?? ""}</span></td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${sampleStatusTones[request.status]}`}>{sampleStatusLabel(request.status)}</span>
                    {isSampleOverdue(request) ? <span className="ml-1 rounded-full bg-rose-50/82 px-1.5 py-0.5 text-[11px] text-rose-800">超期</span> : null}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{request._count.items}</td>
                  <td className="px-4 py-3 text-stone-700"><span className="block truncate">{request.purpose ?? "—"}</span></td>
                  <td className="px-4 py-3 text-stone-700"><span className="block truncate">{request.carrier ?? "—"}</span><span className="block truncate text-xs text-stone-500">{request.trackingNo ?? ""}</span></td>
                  <td className="px-4 py-3 text-stone-600">{formatSampleDate(request.expectedReturnAt)}</td>
                  <td className="px-4 py-3 text-stone-600">{formatSampleDate(request.sentAt)}</td>
                  <td className="px-4 py-3 text-stone-600">{formatSampleDate(request.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {toast ? <div className="fixed right-5 top-20 z-[60] flex items-center gap-2 rounded-2xl border border-emerald-200/60 bg-emerald-50/82 px-4 py-3 text-sm text-emerald-900 shadow-xl backdrop-blur-2xl"><CheckCircle2 className="size-4" />{toast}</div> : null}

      <SampleDetailDrawer
        error={detailError}
        loading={detailLoading}
        onClose={closeDetail}
        onSaveFeedback={saveFeedback}
        onStatusChange={changeStatus}
        request={detail}
      />

      {formOpen ? <SampleFormDrawer onClose={() => setFormOpen(false)} onSave={saveSample} /> : null}
    </section>
  );
}
