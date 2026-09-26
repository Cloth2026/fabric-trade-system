"use client";

import { Eye, EyeOff, KeyRound, LayoutPanelLeft, Lock, Mail, ShieldAlert, Shirt } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PrototypeBadge } from "@/components/system/system-page-parts";
import { SYSTEM_WRITE_DEMO_MESSAGE } from "@/components/system/system-prototype-data";

type DemoState = "normal" | "login_failed" | "account_disabled" | "must_change_password";

const demoStateOptions: Array<{ value: DemoState; label: string }> = [
  { value: "normal", label: "正常" },
  { value: "login_failed", label: "登录失败" },
  { value: "account_disabled", label: "账号停用" },
  { value: "must_change_password", label: "首次登录改密" },
];

const demoStateCopy: Record<DemoState, { tone: string; title: string; detail: string }> = {
  normal: {
    tone: "border-white/40 bg-white/26 text-stone-800",
    title: "静态原型",
    detail: "登录按钮不会创建会话，也不会校验账号。",
  },
  login_failed: {
    tone: "border-rose-200/60 bg-rose-50/72 text-rose-800",
    title: "登录失败演示",
    detail: "邮箱或密码错误，还可重试 2 次；连续 5 次失败将锁定 15 分钟。",
  },
  account_disabled: {
    tone: "border-stone-300/60 bg-stone-200/72 text-stone-800",
    title: "账号已停用演示",
    detail: "该账号已停用，历史操作记录保留，请联系系统管理员重新启用。",
  },
  must_change_password: {
    tone: "border-amber-200/70 bg-amber-50/72 text-amber-900",
    title: "首次登录需要修改密码",
    detail: "登录入口通过后会先弹出修改密码对话框，修改完成才能继续使用系统。",
  },
};

export default function LoginPage() {
  const [email, setEmail] = useState("zhou.zhiyuan@cloth2026.com");
  const [password, setPassword] = useState("demo-password");
  const [showPassword, setShowPassword] = useState(false);
  const [demoState, setDemoState] = useState<DemoState>("normal");
  const [attemptMessage, setAttemptMessage] = useState("");

  const copy = demoStateCopy[demoState];

  const submit = () => {
    setAttemptMessage(`${SYSTEM_WRITE_DEMO_MESSAGE}（登录：${demoStateCopy[demoState].title}）`);
    window.setTimeout(() => setAttemptMessage(""), 3200);
  };

  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#d8d3c8] px-4 text-stone-950">
      <div className="absolute inset-0 bg-[url('/images/fabric-showroom-bg.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.24),transparent_36%),linear-gradient(90deg,rgba(18,17,15,0.66),rgba(120,112,96,0.3)_46%,rgba(22,19,16,0.62))]" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[26px] border border-white/24 bg-white/22 shadow-[inset_0_1px_0_rgba(255,255,255,0.26),0_40px_140px_rgba(22,18,14,0.36)] backdrop-blur-2xl">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="hidden flex-col justify-between border-r border-white/20 bg-stone-950/24 p-8 text-white md:flex">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-white/40 bg-stone-950/85 text-sm font-semibold text-white shadow-lg">FT</div>
              <div>
                <div className="text-base font-semibold drop-shadow">面料贸易系统</div>
                <div className="text-xs text-white/68">Spatial Fabric OS</div>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-white/82"><Shirt className="size-4" />面料库 · 供应商 · 客户 · 报价 · 订单</div>
              <h1 className="mt-4 text-2xl font-semibold leading-8">一个账号进入<br />整条面料业务链路</h1>
              <p className="mt-3 text-sm leading-6 text-white/72">本页只是登录视觉原型：不会创建会话，也不会改变主应用的访问方式。</p>
            </div>
            <div className="rounded-2xl border border-white/24 bg-black/16 px-4 py-3 text-xs leading-6 text-white/72">
              静态原型说明：<br />账号、密码与提示状态都是演示样例，用于确认文案与交互。
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-stone-950">登录面料贸易系统</h2>
                <p className="mt-1 text-xs text-stone-600">原型页面 · 不接入真实认证</p>
              </div>
              <PrototypeBadge>静态登录页</PrototypeBadge>
            </div>

            <div className="mt-5 space-y-3">
              <label className="block text-sm">
                <span className="text-stone-600">邮箱</span>
                <div className="mt-1 flex h-11 items-center gap-2 rounded-xl border border-white/28 bg-white/30 px-3 transition focus-within:border-blue-400/70 focus-within:bg-white/40">
                  <Mail className="size-4 text-stone-500" />
                  <input aria-label="登录邮箱" className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70" onChange={(event) => setEmail(event.target.value)} placeholder="name@cloth2026.com" type="email" value={email} />
                </div>
              </label>

              <label className="block text-sm">
                <span className="text-stone-600">密码</span>
                <div className="mt-1 flex h-11 items-center gap-2 rounded-xl border border-white/28 bg-white/30 px-3 transition focus-within:border-blue-400/70 focus-within:bg-white/40">
                  <Lock className="size-4 text-stone-500" />
                  <input aria-label="登录密码" className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70" onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" type={showPassword ? "text" : "password"} value={password} />
                  <button aria-label={showPassword ? "隐藏密码" : "显示密码"} className="rounded-lg p-1 text-stone-600 transition hover:bg-white/50" onClick={() => setShowPassword((current) => !current)} type="button">
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>

              <div className={`flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm ${copy.tone}`}>
                <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                <div>
                  <div className="font-medium">{copy.title}</div>
                  <div className="mt-0.5 text-xs opacity-90">{copy.detail}</div>
                </div>
              </div>

              <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-950/90 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:bg-stone-800" onClick={submit} type="button">
                登录（演示）
              </button>

              <div className="flex items-center justify-between text-xs text-stone-700">
                <span className="flex items-center gap-1.5"><KeyRound className="size-3.5" />忘记密码请联系系统管理员重置</span>
                <Link className="flex items-center gap-1.5 rounded-lg px-2 py-1 transition hover:bg-white/40" href="/"><LayoutPanelLeft className="size-3.5" />返回主应用</Link>
              </div>
            </div>

            <div className="mt-6 border-t border-white/30 pt-4">
              <div className="text-xs text-stone-600">演示状态切换</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {demoStateOptions.map((option) => (
                  <button
                    aria-pressed={demoState === option.value}
                    className={`h-8 rounded-xl border px-3 text-sm transition ${demoState === option.value ? "border-blue-400/50 bg-blue-500/16 text-blue-800 shadow-inner shadow-white/20" : "border-white/32 bg-white/24 text-stone-700 hover:bg-white/42"}`}
                    key={option.value}
                    onClick={() => setDemoState(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {attemptMessage ? (
        <div className="fixed right-5 top-5 z-[60] flex items-center gap-2 rounded-2xl border border-amber-200/60 bg-amber-50/86 px-4 py-3 text-sm text-amber-900 shadow-xl backdrop-blur-2xl">
          <ShieldAlert className="size-4" />
          {attemptMessage}
        </div>
      ) : null}
    </main>
  );
}
