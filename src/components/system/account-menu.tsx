"use client";

import { ChevronDown, ChevronUp, KeyRound, LifeBuoy, LogOut, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DemoToast } from "./system-page-parts";
import { SYSTEM_WRITE_DEMO_MESSAGE, currentPrototypeUser, userRoleLabels } from "./system-prototype-data";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
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

  const primaryRole = userRoleLabels[currentPrototypeUser.roles[0]];

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-2xl border border-white/24 bg-black/16 px-3 py-2.5 text-left text-white/82 transition hover:bg-white/14"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/34 bg-stone-950/70 text-xs font-semibold text-white">周</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{currentPrototypeUser.name}</span>
          <span className="block truncate text-xs text-white/66">{primaryRole} · {currentPrototypeUser.tenantName}</span>
        </span>
        {open ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
      </button>

      {open ? (
        <div className="absolute bottom-[56px] left-0 right-0 z-40 rounded-2xl border border-white/30 bg-white/82 p-1.5 text-sm text-stone-900 shadow-[0_24px_70px_rgba(22,18,14,0.28),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-3xl">
          <div className="px-3 py-2 text-xs text-stone-600">静态演示账号，未接入真实登录</div>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/70"
            onClick={() => {
              setOpen(false);
              showToast(`${SYSTEM_WRITE_DEMO_MESSAGE}（个人资料）`);
            }}
            type="button"
          >
            <UserRound className="size-4 text-stone-600" />个人资料
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/70"
            onClick={() => {
              setOpen(false);
              showToast(`${SYSTEM_WRITE_DEMO_MESSAGE}（修改密码）`);
            }}
            type="button"
          >
            <KeyRound className="size-4 text-stone-600" />修改密码
          </button>
          <Link className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition hover:bg-white/70" href="/login" onClick={() => setOpen(false)}>
            <LifeBuoy className="size-4 text-stone-600" />查看登录页原型
          </Link>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-stone-700 transition hover:bg-white/70 hover:text-stone-950"
            onClick={() => {
              setOpen(false);
              showToast(`${SYSTEM_WRITE_DEMO_MESSAGE}（退出登录）`);
            }}
            type="button"
          >
            <LogOut className="size-4 text-stone-600" />退出登录
          </button>
        </div>
      ) : null}
      <DemoToast message={toast} />
    </div>
  );
}
