"use client";

import { Save, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FieldError, FormPanel, GlassInput, GlassTextarea, PanelTitle, SegmentedControl } from "@/components/form/glass-form-controls";
import { SYSTEM_WRITE_DEMO_MESSAGE, userRoles, userRoleLabels, userStatusLabels } from "./system-prototype-data";
import type { PrototypeUser, UserRoleKey, UserStatusKey } from "./system-prototype-data";

type UserFormState = {
  name: string;
  account: string;
  email: string;
  roles: UserRoleKey[];
  status: UserStatusKey;
  forcePasswordChange: "yes" | "no";
  note: string;
};

function createEmptyForm(): UserFormState {
  return { name: "", account: "", email: "", roles: ["viewer"], status: "active", forcePasswordChange: "yes", note: "" };
}

function userToForm(user: PrototypeUser): UserFormState {
  return {
    name: user.name,
    account: user.account,
    email: user.email,
    roles: user.roles,
    status: user.status,
    forcePasswordChange: user.forcePasswordChange ? "yes" : "no",
    note: user.note,
  };
}

export function UserFormDrawer({
  mode,
  user,
  onClose,
  onDemoSave,
}: {
  mode: "create" | "edit";
  user?: PrototypeUser;
  onClose: () => void;
  onDemoSave: (message: string) => void;
}) {
  const [state, setState] = useState<UserFormState>(() => (user ? userToForm(user) : createEmptyForm()));
  const [errors, setErrors] = useState<{ name?: string; account?: string; email?: string; roles?: string }>({});
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [isClosing, onClose]);

  const update = <K extends keyof UserFormState>(field: K, value: UserFormState[K]) => {
    setState((current) => ({ ...current, [field]: value }));
    if (field === "name" || field === "account" || field === "email" || field === "roles") {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const toggleRole = (role: UserRoleKey) => {
    update("roles", state.roles.includes(role) ? state.roles.filter((item) => item !== role) : [...state.roles, role]);
  };

  const submit = () => {
    const nextErrors = {
      name: state.name.trim() ? undefined : "请填写姓名",
      account: /^[a-z0-9._-]{3,32}$/.test(state.account.trim()) ? undefined : "内部账号需 3-32 位小写字母、数字、点或下划线",
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim()) ? undefined : "请输入有效的邮箱地址",
      roles: state.roles.length > 0 ? undefined : "请至少选择一个角色",
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.account || nextErrors.email || nextErrors.roles) return;
    onDemoSave(`${SYSTEM_WRITE_DEMO_MESSAGE}（${mode === "create" ? "新增用户" : "编辑用户"}：${state.name}）`);
    setIsClosing(true);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-md ${isClosing ? "fabric-create-backdrop-exit" : "fabric-create-backdrop-enter"}`}
      data-testid="system-user-form-dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setIsClosing(true);
      }}
    >
      <aside className={`absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-3xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/48 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl ${isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`}>
        <div className="flex shrink-0 items-start justify-between border-b border-white/24 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-950">{mode === "create" ? "新增用户" : "编辑用户"}</h2>
            <p className="mt-1 text-xs text-stone-600">独立表单抽屉 · 保存按钮只做静态演示，不会写入数据库</p>
          </div>
          <button aria-label="关闭用户表单" className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42" onClick={() => setIsClosing(true)} type="button">
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <FormPanel icon={UserRound} tone="blue" title="账号资料" description="姓名、内部账号与邮箱用于登录与追溯操作人。">
            <GlassInput error={errors.name} label="姓名" onChange={(value) => update("name", value)} placeholder="请输入真实姓名" required value={state.name} />
            <GlassInput error={errors.account} label="内部账号" onChange={(value) => update("account", value)} placeholder="如 wang.siyuan" required value={state.account} />
            <GlassInput error={errors.email} label="邮箱" onChange={(value) => update("email", value)} placeholder="name@cloth2026.com" required value={state.email} />
            <GlassTextarea label="备注" onChange={(value) => update("note", value)} placeholder="岗位、负责区域或交接说明" value={state.note} />
          </FormPanel>

          <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
            <PanelTitle icon={UserRound} tone="violet" title="角色与安全" description="支持多角色叠加；V1 为固定系统角色，暂不开放自定义角色。" />
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-stone-600">所属角色<span className="ml-1 text-red-600">*</span></div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {userRoles.map((role) => {
                    const selected = state.roles.includes(role);
                    return (
                      <button
                        aria-pressed={selected}
                        className={`h-8 rounded-xl border px-3 text-sm transition ${selected ? "border-blue-400/50 bg-blue-500/16 text-blue-800 shadow-inner shadow-white/20" : "border-white/32 bg-white/24 text-stone-700 hover:bg-white/42"}`}
                        key={role}
                        onClick={() => toggleRole(role)}
                        type="button"
                      >
                        {userRoleLabels[role]}
                        <span className="ml-1.5 font-mono text-[11px] text-stone-500">{role}</span>
                      </button>
                    );
                  })}
                </div>
                <FieldError error={errors.roles} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-stone-600">账号状态</div>
                  <div className="mt-2">
                    <SegmentedControl
                      onChange={(value) => update("status", value)}
                      options={[
                        { value: "active", label: userStatusLabels.active },
                        { value: "inactive", label: userStatusLabels.inactive },
                      ]}
                      value={state.status}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-sm text-stone-600">首次登录强制修改密码</div>
                  <div className="mt-2">
                    <SegmentedControl
                      onChange={(value) => update("forcePasswordChange", value)}
                      options={[
                        { value: "yes", label: "是" },
                        { value: "no", label: "否" },
                      ]}
                      value={state.forcePasswordChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/24 bg-white/24 px-6 py-4">
          <span className="text-xs text-stone-600">静态原型：保存只会弹出演示提示</span>
          <div className="flex items-center gap-2">
            <button className="flex h-10 items-center gap-2 rounded-xl border border-white/40 bg-white/34 px-4 text-sm font-medium text-stone-900 transition hover:bg-white/52" onClick={() => setIsClosing(true)} type="button">取消</button>
            <button className="flex h-10 items-center gap-2 rounded-xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:bg-stone-800" onClick={submit} type="button">
              <Save className="size-4" />保存（演示）
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
