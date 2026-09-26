"use client";

import { Monitor, ShieldAlert, Target, Waypoints, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatSystemDateTime, logActionLabels, logCategoryLabels, logModuleLabels, logResultLabels, maskLogDetail } from "./system-prototype-data";
import type { PrototypeLog } from "./system-prototype-data";
import { PrototypeBadge } from "./system-page-parts";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/16 py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-stone-600">{label}</span>
      <span className="break-all text-right text-stone-950">{value || "—"}</span>
    </div>
  );
}

function DrawerSection({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <h3 className="flex items-center gap-2 font-semibold text-stone-950"><Icon className="size-4 text-blue-600" />{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function OperationLogDetailDrawer({ log, onClose }: { log: PrototypeLog | null; onClose: () => void }) {
  if (!log) return null;

  const masked = maskLogDetail(log.detail);
  const hasMasked = Object.keys(log.detail).some((key) => log.detail[key] !== masked[key]);

  return (
    <div
      className="fixed inset-0 z-40 bg-stone-950/28 backdrop-blur-md"
      data-testid="system-log-detail-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/44 shadow-[0_36px_120px_rgba(26,22,18,0.34),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl">
        <div className="flex shrink-0 items-start justify-between border-b border-white/24 px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-stone-950">{logActionLabels[log.action]}</h2>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${log.result === "success" ? "bg-emerald-50/82 text-emerald-800" : "bg-rose-50/82 text-rose-800"}`}>{logResultLabels[log.result]}</span>
              <PrototypeBadge>{logCategoryLabels[log.category]}</PrototypeBadge>
            </div>
            <div className="mt-1 text-xs text-stone-600">{formatSystemDateTime(log.occurredAt)} · {log.actorName}</div>
          </div>
          <button aria-label="关闭日志详情" className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42" onClick={onClose} type="button">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <DrawerSection icon={Target} title="目标对象">
            <InfoRow label="目标类型" value={log.target.split(":")[0]} />
            <InfoRow label="目标标识" value={log.target} />
            <InfoRow label="所属模块" value={logModuleLabels[log.module]} />
          </DrawerSection>

          <div className="mt-4">
            <DrawerSection icon={Waypoints} title="请求信息">
              <InfoRow label="requestId" value={log.requestId} />
              <InfoRow label="操作用户" value={`${log.actorName}（${log.actorEmail}）`} />
              <InfoRow label="IP 地址" value={log.ipAddress} />
              <InfoRow label="设备信息" value={log.device} />
            </DrawerSection>
          </div>

          <div className="mt-4">
            <DrawerSection icon={Monitor} title="明细（已脱敏）">
              {Object.entries(masked).map(([key, value]) => (
                <InfoRow key={key} label={key} value={value} />
              ))}
              {hasMasked ? (
                <p className="mt-3 flex items-start gap-2 text-xs text-stone-600">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
                  含敏感信息的字段（快递单号、密码、token 等）已按约定脱敏展示。
                </p>
              ) : (
                <p className="mt-3 text-xs text-stone-600">该条记录不含需要脱敏的字段。</p>
              )}
            </DrawerSection>
          </div>

          <p className="mt-4 rounded-2xl border border-white/34 bg-white/26 px-4 py-3 text-xs text-stone-700">
            日志为只读记录：本页面不提供删除或编辑入口。
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/24 bg-white/24 px-6 py-4">
          <button className="flex h-10 items-center gap-2 rounded-xl border border-white/40 bg-white/34 px-4 text-sm font-medium text-stone-900 transition hover:bg-white/52" onClick={onClose} type="button">关闭</button>
        </div>
      </aside>
    </div>
  );
}
