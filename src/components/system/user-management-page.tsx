"use client";

import { Clock3, KeyRound, Menu, Pencil, Plus, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { UserDetailDrawer } from "./user-detail-drawer";
import { UserFormDrawer } from "./user-form-drawer";
import { DemoToast, PrototypeBadge, RolePills, SearchBox, StatusPill, SystemFilterSelect, SystemMetric } from "./system-page-parts";
import { countRecentlyLoggedIn, formatSystemDate, formatSystemDateTime, prototypeUsers, userRoleLabels, userRoles, SYSTEM_WRITE_DEMO_MESSAGE } from "./system-prototype-data";
import type { PrototypeUser, UserRoleKey, UserStatusKey } from "./system-prototype-data";

type RoleFilterValue = "all" | UserRoleKey;
type StatusFilterValue = "all" | UserStatusKey;
type FormMode = { kind: "create" } | { kind: "edit"; userId: string } | null;

export function UserManagementPage() {
  const [users] = useState<PrototypeUser[]>(prototypeUsers);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilterValue>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 3200);
  };

  const roleOptions = useMemo(
    () => [{ value: "all" as const, label: "全部角色" }, ...userRoles.map((value) => ({ value, label: userRoleLabels[value] }))],
    [],
  );
  const statusOptions: Array<{ value: StatusFilterValue; label: string }> = [
    { value: "all", label: "全部状态" },
    { value: "active", label: "启用" },
    { value: "inactive", label: "停用" },
  ];

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesKeyword =
        keyword.length === 0 ||
        [user.name, user.email, user.account].some((value) => value.toLowerCase().includes(keyword));
      const matchesRole = roleFilter === "all" || user.roles.includes(roleFilter);
      const matchesStatus = statusFilter === "all" || user.status === statusFilter;
      return matchesKeyword && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const totalCount = users.length;
  const activeCount = users.filter((user) => user.status === "active").length;
  const inactiveCount = users.filter((user) => user.status === "inactive").length;
  const recentCount = countRecentlyLoggedIn(users);
  const selected = filtered.find((user) => user.id === selectedId) ?? users.find((user) => user.id === selectedId) ?? null;
  const editingUser = formMode?.kind === "edit" ? selected ?? undefined : undefined;

  const openForm = (mode: FormMode) => {
    setFormMode(mode);
  };

  const demoAction = (action: string, user: PrototypeUser) => {
    showToast(`${SYSTEM_WRITE_DEMO_MESSAGE}（${action}：${user.name}）`);
  };

  const resetFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
        <div className="flex items-center gap-3">
          <button aria-label="打开导航" className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden" type="button"><Menu className="size-4" /></button>
          <div>
            <div className="text-sm font-semibold text-stone-950">用户管理</div>
            <div className="text-xs text-stone-700/72">账号、角色分配与启用状态</div>
          </div>
        </div>
        <button className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800" onClick={() => openForm({ kind: "create" })} type="button">
          <Plus className="size-4" />新增用户
        </button>
      </header>

      <section className="grid shrink-0 grid-cols-2 gap-2 px-4 pb-2 pt-2 md:grid-cols-4">
        <SystemMetric icon={Users} label="用户总数" note="全部演示账号" tone="blue" value={totalCount} />
        <SystemMetric icon={ShieldCheck} label="启用用户" note="可正常登录" tone="emerald" value={activeCount} />
        <SystemMetric icon={Clock3} label="停用用户" note="保留历史记录" tone="amber" value={inactiveCount} />
        <SystemMetric icon={Sparkles} label="最近登录人数" note="近 7 天有登录记录" tone="violet" value={recentCount} />
      </section>

      <section className="flex min-h-0 flex-1 flex-col border-t border-white/14 bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
        <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-stone-700">
            <Search className="size-4 text-blue-600" />账号名录
            <PrototypeBadge>静态演示数据</PrototypeBadge>
          </span>
          <SearchBox ariaLabel="搜索用户" onChange={setQuery} placeholder="搜索姓名、邮箱或内部账号" value={query} />
          <SystemFilterSelect label="角色" onChange={setRoleFilter} options={roleOptions} value={roleFilter} />
          <SystemFilterSelect label="状态" onChange={setStatusFilter} options={statusOptions} value={statusFilter} />
          <button className="flex h-9 items-center rounded-xl border border-white/30 bg-white/24 px-3 text-sm transition hover:bg-white/40" onClick={resetFilters} type="button">重置筛选</button>
          <span className="ml-auto text-xs text-stone-600">
            共 {totalCount} 个演示账号，当前筛选出 {filtered.length} 个 · 最近登录统计以演示基准时间 2026-09-26 09:41 计算
          </span>
        </div>

        <div className="relative mx-4 mb-4 min-h-0 flex-1 overflow-auto rounded-[18px] border border-white/26 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl">
          <table className="w-full min-w-[960px] table-fixed border-collapse text-left text-sm">
            <colgroup>
              <col className="w-[9%]" />
              <col className="w-[11%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
              <col className="w-[8%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[21%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-white/60 text-xs text-stone-700 backdrop-blur-2xl">
              <tr>
                {["姓名", "内部账号", "邮箱", "角色", "状态", "最近登录时间", "创建时间", "操作"].map((header) => (
                  <th className="px-4 py-2 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/24">
              {filtered.map((user) => (
                <tr
                  aria-label={`查看${user.name}详情`}
                  className={`cursor-pointer transition hover:bg-white/34 focus:bg-white/38 focus:outline-none ${selectedId === user.id ? "bg-white/30" : ""}`}
                  key={user.id}
                  onClick={() => setSelectedId(user.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(user.id);
                    }
                  }}
                  tabIndex={0}
                >
                  <td className="px-4 py-2 font-medium text-stone-950">{user.name}</td>
                  <td className="px-4 py-2 font-mono text-stone-800">{user.account}</td>
                  <td className="px-4 py-2 text-stone-700">{user.email}</td>
                  <td className="px-4 py-2"><RolePills roles={user.roles} /></td>
                  <td className="px-4 py-2"><StatusPill status={user.status} /></td>
                  <td className="px-4 py-2 text-stone-700">{formatSystemDateTime(user.lastLoginAt)}</td>
                  <td className="px-4 py-2 text-stone-700">{formatSystemDate(user.createdAt)}</td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        className="rounded-lg border border-white/40 bg-white/34 px-1.5 py-1 text-[11px] transition hover:bg-white/54"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(user.id);
                          openForm({ kind: "edit", userId: user.id });
                        }}
                        type="button"
                      >
                        <span className="flex items-center gap-0.5"><Pencil className="size-3" />编辑</span>
                      </button>
                      <button
                        className="rounded-lg border border-white/40 bg-white/34 px-1.5 py-1 text-[11px] transition hover:bg-white/54"
                        onClick={(event) => {
                          event.stopPropagation();
                          demoAction(user.status === "active" ? "停用账号" : "启用账号", user);
                        }}
                        type="button"
                      >
                        {user.status === "active" ? "停用" : "启用"}
                      </button>
                      <button
                        className="rounded-lg border border-white/40 bg-white/34 px-1.5 py-1 text-[11px] transition hover:bg-white/54"
                        onClick={(event) => {
                          event.stopPropagation();
                          demoAction("重置密码", user);
                        }}
                        type="button"
                      >
                        <span className="flex items-center gap-0.5"><KeyRound className="size-3" />重置密码</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-stone-600" colSpan={8}>没有符合筛选条件的演示账号</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <UserDetailDrawer
        user={selected}
        onClose={() => setSelectedId(null)}
        onEdit={(user) => openForm({ kind: "edit", userId: user.id })}
        onResetPassword={(user) => demoAction("重置密码", user)}
        onToggleStatus={(user) => demoAction(user.status === "active" ? "停用账号" : "启用账号", user)}
      />
      {formMode ? (
        <UserFormDrawer
          key={`${formMode.kind}-${editingUser?.id ?? "new"}`}
          mode={formMode.kind}
          onClose={() => setFormMode(null)}
          onDemoSave={showToast}
          user={editingUser}
        />
      ) : null}
      <DemoToast message={toast} />
    </section>
  );
}
