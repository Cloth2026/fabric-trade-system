"use client";

import { CheckCircle2, CircleDashed, EyeOff, Info, Lock, Menu, ShieldCheck, Table2 } from "lucide-react";
import { PrototypeBadge, PrototypeNotice } from "./system-page-parts";
import {
  ownerRoleRules,
  permissionActionLabels,
  permissionLevelLabels,
  permissionModules,
  permissionRestrictionNotes,
  restrictionNoteOf,
  restrictionsOfModule,
  resolvePermissionLevel,
  userRoleLabels,
  userRoleSummaries,
  userRoles,
} from "./system-prototype-data";
import type { PermissionActionKey, PermissionLevel, PermissionModuleKey, UserRoleKey } from "./system-prototype-data";

const levelStyles: Record<PermissionLevel, string> = {
  allow: "border-emerald-200/60 bg-emerald-50/72 text-emerald-800",
  restricted: "border-amber-200/70 bg-amber-50/72 text-amber-800",
  deny: "border-stone-200/70 bg-white/30 text-stone-500",
};

function LevelMark({ level }: { level: PermissionLevel }) {
  if (level === "allow") return <CheckCircle2 className="size-4 text-emerald-700" />;
  if (level === "restricted") return <CircleDashed className="size-4 text-amber-700" />;
  return <Lock className="size-3.5 text-stone-400" />;
}

function MatrixCell({ role, moduleKey, action }: { role: UserRoleKey; moduleKey: PermissionModuleKey; action: PermissionActionKey }) {
  const level = resolvePermissionLevel(role, moduleKey, action);
  const note = restrictionNoteOf(role, moduleKey, action);
  return (
    <td className="px-1.5 py-1.5 text-center">
      <div
        className={`mx-auto flex h-8 w-full items-center justify-center gap-1 rounded-xl border ${levelStyles[level]}`}
        title={`${userRoleLabels[role]} · ${permissionActionLabels[action]}：${permissionLevelLabels[level]}${note ? `（${note}）` : ""}`}
      >
        <LevelMark level={level} />
        <span className="sr-only">{permissionLevelLabels[level]}</span>
      </div>
      {level === "restricted" && note ? <span className="sr-only">{note}</span> : null}
    </td>
  );
}

function ModuleRestrictions({ moduleKey }: { moduleKey: PermissionModuleKey }) {
  const items = restrictionsOfModule(moduleKey);
  if (items.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5 rounded-xl border border-amber-200/60 bg-amber-50/58 px-3 py-2 text-xs text-amber-900">
      {items.map((item) => (
        <li className="flex items-start gap-1.5" key={`${item.role}-${item.action}`}>
          <Info className="mt-0.5 size-3 shrink-0" />
          <span>
            <span className="font-medium">{userRoleLabels[item.role]}</span>
            <span> · {permissionActionLabels[item.action]}：</span>
            <span>{item.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const keyRules = [
  "owner 是企业最高权限角色，允许有多个；必须始终保留至少一个启用状态的 owner。",
  "最后一个启用的 owner 不能被停用、移除 owner 角色或降级。",
  "系统管理员拥有除 owner 身份处置外的日常系统与业务权限。",
  "业务员默认不能查看真实采购价格。",
  "采购角色可以管理货源、供应商、生产单元与采购报价，并查看采购价格。",
  "跟单员负责寄样与订单跟进，不能创建销售订单，终态订单进度由 owner 或 admin 处理。",
  "只读用户只能查看业务资料，不能执行任何写操作。",
];

export function RolePermissionPage() {
  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
        <div className="flex items-center gap-3">
          <button aria-label="打开导航" className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden" type="button"><Menu className="size-4" /></button>
          <div>
            <div className="text-sm font-semibold text-stone-950">角色权限</div>
            <div className="text-xs text-stone-700/72">固定系统角色 · 只读权限矩阵</div>
          </div>
        </div>
        <PrototypeBadge>V1 固定角色</PrototypeBadge>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto border-t border-white/14 bg-white/22 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-stone-700"><ShieldCheck className="size-4 text-blue-600" />权限矩阵</div>
            <h1 className="mt-2 text-2xl font-semibold text-stone-950">固定角色拥有的模块权限</h1>
            <p className="mt-1 text-sm text-stone-600">V1 只使用固定系统角色，不提供新增、删除或自定义角色；矩阵为只读展示，操作为具体业务动作而非通用「管理」。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="flex items-center gap-1 rounded-full border border-emerald-200/60 bg-emerald-50/72 px-2 py-1 text-emerald-800"><CheckCircle2 className="size-3.5" />允许</span>
            <span className="flex items-center gap-1 rounded-full border border-amber-200/70 bg-amber-50/72 px-2 py-1 text-amber-800"><CircleDashed className="size-3.5" />受限允许（附限制说明）</span>
            <span className="flex items-center gap-1 rounded-full border border-stone-200/70 bg-white/40 px-2 py-1 text-stone-600"><Lock className="size-3.5" />不允许</span>
          </div>
        </div>

        <div className="mt-4">
          <PrototypeNotice>当前为固定角色原型，后续确认后再接入真实权限。</PrototypeNotice>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {userRoles.map((role) => (
            <div className="rounded-[18px] border border-white/26 bg-white/20 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-2xl" key={role}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-stone-950">{userRoleLabels[role]}</span>
                <span className="rounded-lg bg-white/40 px-2 py-0.5 font-mono text-xs text-stone-600">{role}</span>
              </div>
              <p className="mt-2 text-xs text-stone-600">{userRoleSummaries[role]}</p>
              <ul className="mt-2 space-y-1 text-xs text-stone-700">
                {permissionRestrictionNotes[role].map((note) => (
                  <li className="flex items-start gap-1.5" key={note}>
                    <Info className="mt-0.5 size-3 shrink-0 text-stone-500" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <h2 className="flex items-center gap-2 font-semibold text-stone-950"><ShieldCheck className="size-4 text-blue-600" />企业所有者规则</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
              {ownerRoleRules.map((rule) => (
                <li className="flex items-start gap-2 rounded-xl border border-white/26 bg-white/22 px-3 py-2" key={rule}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-stone-600">本轮只展示静态说明与演示状态，不做真实校验。</p>
          </div>

          <div className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <h2 className="flex items-center gap-2 font-semibold text-stone-950"><Table2 className="size-4 text-blue-600" />关键规则</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
              {keyRules.map((rule) => (
                <li className="flex items-start gap-2 rounded-xl border border-white/26 bg-white/22 px-3 py-2" key={rule}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid gap-3 2xl:grid-cols-2">
          {permissionModules.map((module) => (
            <div className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12" key={module.key}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-950">{module.label}</h3>
                  <p className="mt-0.5 text-xs text-stone-600">{module.description}</p>
                </div>
                <span className="rounded-lg bg-white/40 px-2 py-0.5 font-mono text-[11px] text-stone-600">{module.key}</span>
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead className="text-xs text-stone-600">
                    <tr>
                      <th className="px-1.5 py-2 font-medium">操作</th>
                      {userRoles.map((role) => (
                        <th className="px-1.5 py-2 text-center font-medium" key={role}>{userRoleLabels[role]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/24">
                    {module.actions.map((action) => (
                      <tr key={action}>
                        <td className="px-1.5 py-1.5">
                          <span className="font-medium text-stone-800">{permissionActionLabels[action]}</span>
                          <span className="ml-1.5 font-mono text-[11px] text-stone-500">{action}</span>
                        </td>
                        {userRoles.map((role) => (
                          <MatrixCell action={action} key={role} moduleKey={module.key} role={role} />
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ModuleRestrictions moduleKey={module.key} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-white/34 bg-white/26 px-4 py-3 text-sm text-stone-700 shadow-inner shadow-white/12">
          <EyeOff className="mt-0.5 size-4 shrink-0 text-amber-700" />
          <span>受限允许在真实实现中会落到具体规则：例如系统管理员不可停用企业所有者、跟单员不可推进订单终态。操作日志只提供查看，不提供删除、编辑或导出入口。</span>
        </div>
      </section>
    </section>
  );
}
