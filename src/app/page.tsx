"use client";

import { ChevronRight, Command, Layers3 } from "lucide-react";
import { useCallback, useState } from "react";
import { CreateFabricDrawer } from "@/components/fabrics/create-fabric-drawer";
import { FabricLibraryPrototype } from "@/components/fabrics/fabric-library-prototype";
import { SupplierManagementPage } from "@/components/suppliers/supplier-management-page";
import { CustomerManagementPage } from "@/components/customers/customer-management-page";
import { SampleManagementPage } from "@/components/samples/sample-management-page";
import { CustomerQuoteManagementPage } from "@/components/quotes/customer-quote-management-page";
import { SalesOrderManagementPage } from "@/components/orders/sales-order-management-page";
import { nextFabricRefreshToken } from "@/components/fabrics/fabric-library-prototype-data";
import { AccountMenu } from "@/components/system/account-menu";
import { OperationLogPage } from "@/components/system/operation-log-page";
import { RolePermissionPage } from "@/components/system/role-permission-page";
import { UserManagementPage } from "@/components/system/user-management-page";

type ActiveModule = "面料库" | "供应商" | "客户" | "寄样" | "报价" | "订单" | "用户管理" | "角色权限" | "操作日志";

const navGroups: Array<{ title?: string; items: ActiveModule[] }> = [
  { items: ["工作台", "面料库", "供应商", "客户", "寄样", "报价", "订单"] as ActiveModule[] },
  { title: "系统管理", items: ["用户管理", "角色权限", "操作日志"] },
];

const staticSystemModules: ActiveModule[] = ["用户管理", "角色权限", "操作日志"];

function isOpenableModule(item: string): item is ActiveModule {
  return ["面料库", "供应商", "客户", "寄样", "报价", "订单", ...staticSystemModules].includes(item as ActiveModule);
}

export default function Home() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("面料库");
  const [showCreate, setShowCreate] = useState(false);
  const [fabricRefreshToken, setFabricRefreshToken] = useState(0);

  const openModule = (module: ActiveModule) => {
    setActiveModule(module);
    if (module !== "面料库") setShowCreate(false);
  };
  const openCreateFabric = useCallback(() => setShowCreate(true), []);
  const closeCreateFabric = useCallback(() => setShowCreate(false), []);
  const refreshFabricLibrary = useCallback(() => {
    setFabricRefreshToken(nextFabricRefreshToken);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#d8d3c8] text-stone-950">
      <div className="absolute inset-0 bg-[url('/images/fabric-showroom-bg.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_24%,rgba(255,255,255,0.22),transparent_34%),linear-gradient(90deg,rgba(18,17,15,0.62),rgba(120,112,96,0.28)_34%,rgba(22,19,16,0.58))]" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      <div className="relative flex h-screen w-screen overflow-hidden border border-white/20 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_40px_140px_rgba(22,18,14,0.32)] backdrop-blur-2xl">
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-white/18 bg-stone-950/20 p-4 shadow-[inset_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-3xl lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-stone-950/85 text-sm font-semibold text-white shadow-lg">FT</div>
            <div><div className="text-sm font-semibold text-white drop-shadow">面料贸易系统</div><div className="text-xs text-white/68">Spatial Fabric OS</div></div>
          </div>

          <button className="mt-6 flex h-10 w-full items-center justify-between rounded-2xl border border-white/30 bg-white/24 px-3 text-sm text-white/78 shadow-inner shadow-white/15 backdrop-blur-xl transition hover:bg-white/32" type="button">
            <span className="flex items-center gap-2"><Command className="size-4" />快速搜索</span><span className="rounded-lg bg-white/18 px-1.5 py-0.5 text-[11px]">Ctrl K</span>
          </button>

          <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
            <nav className="space-y-4 text-sm">
              {navGroups.map((group) => (
                <div className="space-y-1" key={group.title ?? "main"}>
                  {group.title ? <div className="px-3 pb-1 text-[11px] uppercase tracking-wide text-white/52">{group.title}</div> : null}
                  {group.items.map((item) => (
                    <button className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition ${item === activeModule ? "bg-white/72 text-stone-950 shadow-[0_12px_32px_rgba(255,255,255,0.18)]" : "text-white/76 hover:bg-white/18 hover:text-white"}`} key={item} onClick={() => { if (isOpenableModule(item)) openModule(item); }} type="button">
                      {item}{item === activeModule ? <ChevronRight className="size-4" /> : null}
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <div className="mt-6 rounded-3xl border border-white/24 bg-black/12 p-4 text-white/72 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-medium text-white"><Layers3 className="size-4" />UI Style Locked</div>
              <p className="mt-3 text-xs leading-5">空间背景、玻璃浮层、面料样品卡、低对比专业表格，作为后续模块统一视觉基准。</p>
            </div>
          </div>

          <div className="shrink-0 pt-4">
            <AccountMenu />
          </div>
        </aside>

        {activeModule === "供应商" ? <SupplierManagementPage /> : null}
        {activeModule === "客户" ? <CustomerManagementPage /> : null}
        {activeModule === "寄样" ? <SampleManagementPage /> : null}
        {activeModule === "报价" ? (
          <CustomerQuoteManagementPage onConvertedToOrder={() => openModule("订单")} />
        ) : null}
        {activeModule === "订单" ? <SalesOrderManagementPage /> : null}
        {activeModule === "面料库" ? <FabricLibraryPrototype onCreateFabric={openCreateFabric} refreshToken={fabricRefreshToken} /> : null}
        {activeModule === "面料库" ? <CreateFabricDrawer open={showCreate} onClose={closeCreateFabric} onCreated={refreshFabricLibrary} /> : null}
        {activeModule === "用户管理" ? <UserManagementPage /> : null}
        {activeModule === "角色权限" ? <RolePermissionPage /> : null}
        {activeModule === "操作日志" ? <OperationLogPage /> : null}
      </div>
    </main>
  );
}
