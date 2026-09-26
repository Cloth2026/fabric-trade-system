"use client";

import { Activity, Eye, Filter, Menu, ScrollText, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { OperationLogDetailDrawer } from "./operation-log-detail-drawer";
import { PrototypeBadge, PrototypeNotice, SearchBox, SystemDateInput, SystemFilterSelect } from "./system-page-parts";
import {
  formatSystemDate,
  formatSystemDateTime,
  logActionLabels,
  logActions,
  logCategoryOptions,
  logModuleLabels,
  logModules,
  logResultLabels,
  prototypeLogs,
} from "./system-prototype-data";
import type { LogActionKey, LogCategoryKey, LogModuleKey, LogResultKey, PrototypeLog } from "./system-prototype-data";

type CategoryFilterValue = "all" | LogCategoryKey;
type ModuleFilterValue = "all" | LogModuleKey;
type ActionFilterValue = "all" | LogActionKey;
type ResultFilterValue = "all" | LogResultKey;

export function OperationLogPage() {
  const [category, setCategory] = useState<CategoryFilterValue>("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState<ModuleFilterValue>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilterValue>("all");
  const [resultFilter, setResultFilter] = useState<ResultFilterValue>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const actorOptions = useMemo(() => {
    const unique = new Map<string, string>();
    prototypeLogs.forEach((log) => unique.set(log.actorId, log.actorName));
    return [{ value: "all", label: "全部用户" }, ...Array.from(unique).map(([value, label]) => ({ value, label }))];
  }, []);

  const moduleOptions: Array<{ value: ModuleFilterValue; label: string }> = [
    { value: "all", label: "全部模块" },
    ...logModules.map((value) => ({ value, label: logModuleLabels[value] })),
  ];
  const actionOptions: Array<{ value: ActionFilterValue; label: string }> = [
    { value: "all", label: "全部类型" },
    ...logActions.map((value) => ({ value, label: logActionLabels[value] })),
  ];
  const resultOptions: Array<{ value: ResultFilterValue; label: string }> = [
    { value: "all", label: "全部结果" },
    { value: "success", label: "成功" },
    { value: "failure", label: "失败" },
  ];

  const filtered = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    return prototypeLogs.filter((log) => {
      const day = formatSystemDate(log.occurredAt);
      const matchesCategory = category === "all" || log.category === category;
      const matchesActor = actorFilter === "all" || log.actorId === actorFilter;
      const matchesModule = moduleFilter === "all" || log.module === moduleFilter;
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      const matchesResult = resultFilter === "all" || log.result === resultFilter;
      const matchesFrom = !from || day >= from;
      const matchesTo = !to || day <= to;
      const matchesKeyword =
        text.length === 0 ||
        [log.actorName, log.actorEmail, log.target, log.requestId, log.ipAddress].some((value) => value.toLowerCase().includes(text));
      return matchesCategory && matchesActor && matchesModule && matchesAction && matchesResult && matchesFrom && matchesTo && matchesKeyword;
    });
  }, [actionFilter, actorFilter, category, from, keyword, moduleFilter, resultFilter, to]);

  const selected = filtered.find((log) => log.id === selectedId) ?? prototypeLogs.find((log) => log.id === selectedId) ?? null;

  const resetFilters = () => {
    setActorFilter("all");
    setModuleFilter("all");
    setActionFilter("all");
    setResultFilter("all");
    setFrom("");
    setTo("");
    setKeyword("");
  };

  const counts: Record<CategoryFilterValue, number> = {
    all: prototypeLogs.length,
    login_security: prototypeLogs.filter((log) => log.category === "login_security").length,
    user_permission: prototypeLogs.filter((log) => log.category === "user_permission").length,
    business: prototypeLogs.filter((log) => log.category === "business").length,
  };

  const openDetail = (log: PrototypeLog) => setSelectedId(log.id);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
        <div className="flex items-center gap-3">
          <button aria-label="打开导航" className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden" type="button"><Menu className="size-4" /></button>
          <div>
            <div className="text-sm font-semibold text-stone-950">操作日志</div>
            <div className="text-xs text-stone-700/72">登录、权限与业务操作记录（只读）</div>
          </div>
        </div>
        <PrototypeBadge>只读 · 静态演示</PrototypeBadge>
      </header>

      <section className="flex min-h-0 flex-1 flex-col border-t border-white/14 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700"><ScrollText className="size-4 text-blue-600" />日志流水</div>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950">谁在什么时候做了什么</h1>
            <p className="mt-1 text-sm text-stone-600">点击任意日志查看详情；日志不可编辑，也不提供删除入口。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/28 bg-white/20 p-1 text-sm shadow-inner shadow-white/12">
            {logCategoryOptions.map((option) => (
              <button
                className={`rounded-xl px-3 py-1.5 transition ${category === option.value ? "bg-white/72 text-stone-950 shadow-sm" : "text-stone-600 hover:bg-white/24 hover:text-stone-950"}`}
                key={option.value}
                onClick={() => setCategory(option.value)}
                type="button"
              >
                {option.label}
                <span className="ml-1.5 text-xs text-stone-500">{counts[option.value]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SearchBox ariaLabel="搜索日志" onChange={setKeyword} placeholder="关键词：用户、对象、requestId 或 IP" value={keyword} />
          <SystemFilterSelect label="操作用户" onChange={setActorFilter} options={actorOptions} value={actorFilter} />
          <SystemFilterSelect label="模块" onChange={setModuleFilter} options={moduleOptions} value={moduleFilter} />
          <SystemFilterSelect label="操作类型" onChange={setActionFilter} options={actionOptions} value={actionFilter} />
          <SystemFilterSelect label="结果" onChange={setResultFilter} options={resultOptions} value={resultFilter} />
          <SystemDateInput label="起始" onChange={setFrom} value={from} />
          <SystemDateInput label="截止" onChange={setTo} value={to} />
          <button className="flex h-9 items-center rounded-xl border border-white/30 bg-white/24 px-3 text-sm transition hover:bg-white/40" onClick={resetFilters} type="button">重置筛选</button>
        </div>

        <div className="mt-4">
          <PrototypeNotice>日志为静态演示数据，包含登录成功、登录失败、权限拒绝、账号停用等样例记录。</PrototypeNotice>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/44 pt-3 text-xs text-stone-600">
          <span>共 {prototypeLogs.length} 条演示日志，当前筛选出 {filtered.length} 条</span>
          <span className="flex items-center gap-1.5"><Filter className="size-3.5" />当前分类：{logCategoryOptions.find((option) => option.value === category)?.label}</span>
        </div>

        <div className="relative mt-3 min-h-0 flex-1 overflow-auto rounded-[18px] border border-white/26 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
          <table className="w-full min-w-[1120px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[12%]" />
              <col className="w-[10%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[18%]" />
              <col className="w-[8%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-white/60 text-xs text-stone-700 backdrop-blur-2xl">
              <tr>
                {["时间", "操作用户", "模块", "操作", "操作对象", "结果", "IP 地址", "详情"].map((header) => (
                  <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/24">
              {filtered.map((log) => (
                <tr
                  aria-label={`查看${log.actorName}的${logActionLabels[log.action]}详情`}
                  className={`cursor-pointer transition hover:bg-white/34 focus:bg-white/38 focus:outline-none ${selectedId === log.id ? "bg-white/30" : ""}`}
                  key={log.id}
                  onClick={() => openDetail(log)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openDetail(log);
                    }
                  }}
                  tabIndex={0}
                >
                  <td className="px-4 py-3 text-stone-700">{formatSystemDateTime(log.occurredAt)}</td>
                  <td className="px-4 py-3 font-medium text-stone-950">{log.actorName}</td>
                  <td className="px-4 py-3 text-stone-700">{logModuleLabels[log.module]}</td>
                  <td className="px-4 py-3 text-stone-800">{logActionLabels[log.action]}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-700">{log.target}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${log.result === "success" ? "bg-emerald-50/82 text-emerald-800" : "bg-rose-50/82 text-rose-800"}`}>
                      {log.result === "success" ? <Activity className="size-3" /> : <ShieldAlert className="size-3" />}
                      {logResultLabels[log.result]}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-700">{log.ipAddress}</td>
                  <td className="px-4 py-3">
                    <button
                      className="flex items-center gap-1 rounded-lg border border-white/40 bg-white/34 px-2 py-1 text-xs transition hover:bg-white/54"
                      onClick={(event) => {
                        event.stopPropagation();
                        openDetail(log);
                      }}
                      type="button"
                    >
                      <Eye className="size-3" />详情
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-stone-600" colSpan={8}>没有符合条件的演示日志</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <OperationLogDetailDrawer log={selected} onClose={() => setSelectedId(null)} />
    </section>
  );
}
