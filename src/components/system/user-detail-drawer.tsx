"use client";

import { KeyRound, Pencil, ShieldAlert, UserCog, X } from "lucide-react";
import { latestLoginEventOf, buildSecurityNotes, formatSystemDateTime, logActionLabels, userRoleLabels, userStatusLabels } from "./system-prototype-data";
import type { PrototypeUser } from "./system-prototype-data";
import { PrototypeBadge, RolePills, StatusPill } from "./system-page-parts";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/16 py-2 text-sm last:border-b-0">
      <span className="shrink-0 text-stone-600">{label}</span>
      <span className="text-right text-stone-950">{value || "—"}</span>
    </div>
  );
}

function DrawerSection({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-stone-950">{title}</h3>
        {hint ? <span className="text-xs text-stone-600">{hint}</span> : null}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export function UserDetailDrawer({
  user,
  onClose,
  onEdit,
  onToggleStatus,
  onResetPassword,
}: {
  user: PrototypeUser | null;
  onClose: () => void;
  onEdit: (user: PrototypeUser) => void;
  onToggleStatus: (user: PrototypeUser) => void;
  onResetPassword: (user: PrototypeUser) => void;
}) {
  if (!user) return null;

  const loginEvent = latestLoginEventOf(user.id);
  const securityNotes = buildSecurityNotes(user);
  const isOwner = user.roles.includes("owner");

  return (
    <div
      className="fixed inset-0 z-40 bg-stone-950/28 backdrop-blur-md"
      data-testid="system-user-detail-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside className="absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/44 shadow-[0_36px_120px_rgba(26,22,18,0.34),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl">
        <div className="flex shrink-0 items-start justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-300/36 bg-blue-500/12 text-blue-700 shadow-inner shadow-white/24">
              <UserCog className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold text-stone-950">{user.name}</h2>
                <StatusPill status={user.status} />
                {isOwner ? <PrototypeBadge>企业所有者</PrototypeBadge> : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-600">
                <span className="font-mono">{user.account}</span>
                <span>{user.email}</span>
                <span>更新于 {formatSystemDateTime(user.updatedAt)}</span>
              </div>
            </div>
          </div>
          <button aria-label="关闭用户详情" className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42" onClick={onClose} type="button">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <DrawerSection hint="只读展示" title="基础信息">
            <InfoRow label="姓名" value={user.name} />
            <InfoRow label="内部账号" value={user.account} />
            <InfoRow label="邮箱" value={user.email} />
            <InfoRow label="备注" value={user.note} />
          </DrawerSection>

          <div className="mt-4">
            <DrawerSection hint="英文 key + 中文标签" title="所属角色">
              <RolePills roles={user.roles} />
              <div className="mt-3 space-y-2">
                {user.roles.map((role) => (
                  <div className="rounded-xl border border-white/26 bg-white/22 px-3 py-2 text-xs text-stone-700" key={role}>
                    <span className="font-medium text-stone-950">{userRoleLabels[role]}</span>
                    <span className="ml-2 font-mono text-stone-500">{role}</span>
                  </div>
                ))}
              </div>
            </DrawerSection>
          </div>

          <div className="mt-4">
            <DrawerSection title="账号状态">
              <InfoRow label="状态" value={userStatusLabels[user.status]} />
              <InfoRow label="强制修改密码" value={user.forcePasswordChange ? "下次登录必须修改" : "不强制"} />
              <InfoRow label="最近登录时间" value={formatSystemDateTime(user.lastLoginAt)} />
              <InfoRow label="最近登录动作" value={loginEvent ? logActionLabels[loginEvent.action] : "暂无记录"} />
              <InfoRow label="最近登录 IP" value={loginEvent?.ipAddress ?? "—"} />
            </DrawerSection>
          </div>

          <div className="mt-4">
            <DrawerSection hint="数据均为演示样例" title="时间信息">
              <InfoRow label="创建时间" value={formatSystemDateTime(user.createdAt)} />
              <InfoRow label="更新时间" value={formatSystemDateTime(user.updatedAt)} />
            </DrawerSection>
          </div>

          <div className="mt-4">
            <DrawerSection title="安全提示">
              <ul className="space-y-2 text-sm text-stone-700">
                {securityNotes.map((note) => (
                  <li className="flex items-start gap-2" key={note}>
                    <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </DrawerSection>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-white/24 bg-white/24 px-6 py-4">
          <button className="flex h-10 items-center gap-2 rounded-xl border border-white/40 bg-white/34 px-4 text-sm font-medium text-stone-900 transition hover:bg-white/52" onClick={() => onEdit(user)} type="button">
            <Pencil className="size-4" />编辑
          </button>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-white/40 bg-white/34 px-4 text-sm font-medium text-stone-900 transition hover:bg-white/52" onClick={() => onToggleStatus(user)} type="button">
            {user.status === "active" ? "停用" : "启用"}
          </button>
          <button className="flex h-10 items-center gap-2 rounded-xl border border-white/40 bg-white/34 px-4 text-sm font-medium text-stone-900 transition hover:bg-white/52" onClick={() => onResetPassword(user)} type="button">
            <KeyRound className="size-4" />重置密码
          </button>
        </div>
      </aside>
    </div>
  );
}
