"use client";

import {
  Archive,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Command,
  Filter,
  Layers3,
  Menu,
  Plus,
  Search,
  Sparkles,
  SwatchBook,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CreateFabricDrawer } from "@/components/fabrics/create-fabric-drawer";
import { SupplierManagementPage } from "@/components/suppliers/supplier-management-page";

type ViewMode = "cards" | "table" | "batches";
type ActiveModule = "面料库" | "供应商";
type FabricType = "针织" | "梭织";
type FabricStatus = "待完善" | "可销售" | "停用";
type DevelopmentSource = "自主研发" | "市场采购" | "客户来样" | "供应商提供" | "展会采集";

type Fabric = {
  code: string;
  name: string;
  type: FabricType;
  unit: "公斤" | "米";
  category: string;
  structure: string;
  composition: string;
  weight: string;
  width: string;
  color: string;
  source: DevelopmentSource;
  supplier: string;
  price: string;
  inventory: string;
  status: FabricStatus;
  completeness: number;
  missing: string[];
  tags: string[];
  image: string;
  greige: string;
  dyeing: string;
  postProcess: string;
};

const fabrics: Fabric[] = [
  {
    code: "KN-2609-001",
    name: "精梳棉氨纶汗布",
    type: "针织",
    unit: "公斤",
    category: "针织",
    structure: "汗布",
    composition: "95%棉 5%氨纶",
    weight: "180g",
    width: "165cm",
    color: "本白",
    source: "自主研发",
    supplier: "绍兴柯桥纺纱厂",
    price: "¥28.00/kg",
    inventory: "3,200kg",
    status: "可销售",
    completeness: 92,
    missing: ["后工艺"],
    tags: ["女装", "弹力", "可复购"],
    image: "linear-gradient(135deg, #f7f4ea 0%, #ebe3d0 45%, #d7c9aa 100%)",
    greige: "32S 精梳棉氨纶坯布，坯布成本 ¥21.80/kg，损耗 3%",
    dyeing: "染色 + 定型，色牢度 4 级，缩率 5%",
    postProcess: "无",
  },
  {
    code: "WV-2609-014",
    name: "涤棉平纹衬衫布",
    type: "梭织",
    unit: "米",
    category: "梭织",
    structure: "平纹",
    composition: "65%涤纶 35%棉",
    weight: "118g",
    width: "150cm",
    color: "浅蓝",
    source: "市场采购",
    supplier: "广州中大市场 A12 档",
    price: "¥16.50/m",
    inventory: "860m",
    status: "待完善",
    completeness: 48,
    missing: ["坯布", "染整", "后工艺", "克重确认"],
    tags: ["轻档案", "衬衫", "市场成品"],
    image: "linear-gradient(135deg, #d8e9f7 0%, #aac7de 55%, #7ea7c6 100%)",
    greige: "待补充",
    dyeing: "待补充",
    postProcess: "待补充",
  },
  {
    code: "WV-2608-033",
    name: "烫金植绒斜纹布",
    type: "梭织",
    unit: "米",
    category: "梭织",
    structure: "斜纹",
    composition: "70%棉 27%锦纶 3%氨纶",
    weight: "230g",
    width: "145cm",
    color: "黑金",
    source: "客户来样",
    supplier: "东莞印花工艺厂",
    price: "¥45.00/m",
    inventory: "1,500m",
    status: "可销售",
    completeness: 86,
    missing: ["色牢度报告"],
    tags: ["烫金", "植绒", "高风险工艺"],
    image: "linear-gradient(135deg, #111111 0%, #3b3321 48%, #c79a35 100%)",
    greige: "锦棉弹力斜纹坯布，坯布成本 ¥31.00/m",
    dyeing: "染黑 + 定型，缩率 4%",
    postProcess: "烫金 + 植绒，后工艺成本 ¥8.60/m，需确认批次色差",
  },
  {
    code: "KN-2608-018",
    name: "涤纶网眼运动布",
    type: "针织",
    unit: "公斤",
    category: "针织",
    structure: "网眼",
    composition: "100%涤纶",
    weight: "120g",
    width: "150cm",
    color: "宝蓝",
    source: "供应商提供",
    supplier: "泉州涤纶纺织有限公司",
    price: "¥18.00/kg",
    inventory: "5,600kg",
    status: "可销售",
    completeness: 78,
    missing: ["后工艺"],
    tags: ["运动", "透气", "供应商推荐"],
    image: "linear-gradient(135deg, #174b8f 0%, #2f77c8 50%, #8cc7ff 100%)",
    greige: "涤纶网眼坯布，供应商提供",
    dyeing: "染色 + 柔软整理",
    postProcess: "无",
  },
];

const batches = [
  { code: "KN-2609-001", no: "IN-260912-001", fabric: "精梳棉氨纶汗布", qty: "1,200kg", unitPrice: "¥28.00", supplier: "绍兴柯桥纺纱厂", location: "A-03", complete: true },
  { code: "WV-2609-014", no: "IN-260912-002", fabric: "涤棉平纹衬衫布", qty: "860m", unitPrice: "¥16.50", supplier: "广州中大市场 A12 档", location: "B-11", complete: false },
  { code: "WV-2608-033", no: "IN-260830-009", fabric: "烫金植绒斜纹布", qty: "1,500m", unitPrice: "¥45.00", supplier: "东莞印花工艺厂", location: "C-02", complete: false },
];

const navItems = ["工作台", "面料库", "供应商", "客户", "报价", "订单"];

export default function Home() {
  const [activeModule, setActiveModule] = useState<ActiveModule>("面料库");
  const [view, setView] = useState<ViewMode>("cards");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"全部" | FabricType>("全部");
  const [sourceFilter, setSourceFilter] = useState<"全部" | DevelopmentSource>("全部");
  const [selected, setSelected] = useState<Fabric | null>(fabrics[0]);
  const [showCreate, setShowCreate] = useState(false);

  const filteredFabrics = useMemo(() => {
    return fabrics.filter((fabric) => {
      const keyword = query.trim().toLowerCase();
      const matchesKeyword =
        !keyword ||
        [fabric.name, fabric.code, fabric.supplier, fabric.composition, fabric.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
      const matchesType = typeFilter === "全部" || fabric.type === typeFilter;
      const matchesSource = sourceFilter === "全部" || fabric.source === sourceFilter;
      return matchesKeyword && matchesType && matchesSource;
    });
  }, [query, sourceFilter, typeFilter]);

  const incompleteCount = fabrics.filter((fabric) => fabric.status === "待完善").length;
  const totalInventory = "11,160";

  const openModule = (module: ActiveModule) => {
    setActiveModule(module);
    if (module === "供应商") {
      setSelected(null);
      setShowCreate(false);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#d8d3c8] text-stone-950">
      <div className="absolute inset-0 bg-[url('/images/fabric-showroom-bg.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_24%,rgba(255,255,255,0.22),transparent_34%),linear-gradient(90deg,rgba(18,17,15,0.62),rgba(120,112,96,0.28)_34%,rgba(22,19,16,0.58))]" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      <div className="relative flex h-screen w-screen overflow-hidden border border-white/20 bg-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_40px_140px_rgba(22,18,14,0.32)] backdrop-blur-2xl">
        <aside className="hidden w-[232px] shrink-0 border-r border-white/18 bg-stone-950/20 p-4 shadow-[inset_-1px_0_0_rgba(255,255,255,0.1)] backdrop-blur-3xl lg:block">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-stone-950/85 text-sm font-semibold text-white shadow-lg">
              FT
            </div>
            <div>
              <div className="text-sm font-semibold text-white drop-shadow">面料贸易系统</div>
              <div className="text-xs text-white/68">Spatial Fabric OS</div>
            </div>
          </div>

          <button className="mt-6 flex h-10 w-full items-center justify-between rounded-2xl border border-white/30 bg-white/24 px-3 text-sm text-white/78 shadow-inner shadow-white/15 backdrop-blur-xl transition hover:bg-white/32">
            <span className="flex items-center gap-2">
              <Command className="size-4" />
              快速搜索
            </span>
            <span className="rounded-lg bg-white/18 px-1.5 py-0.5 text-[11px]">Ctrl K</span>
          </button>

          <nav className="mt-6 space-y-1 text-sm">
            {navItems.map((item) => (
              <button
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition ${
                  item === activeModule
                    ? "bg-white/72 text-stone-950 shadow-[0_12px_32px_rgba(255,255,255,0.18)]"
                    : "text-white/76 hover:bg-white/18 hover:text-white"
                }`}
                key={item}
                onClick={() => {
                  if (item === "面料库" || item === "供应商") openModule(item);
                }}
                type="button"
              >
                {item}
                {item === activeModule ? <ChevronRight className="size-4" /> : null}
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-3xl border border-white/24 bg-black/12 p-4 text-white/72 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-xs font-medium text-white">
              <Layers3 className="size-4" />
              UI Style Locked
            </div>
            <p className="mt-3 text-xs leading-5">
              空间背景、玻璃浮层、面料样品卡、低对比专业表格，作为后续模块统一视觉基准。
            </p>
          </div>
        </aside>

        {activeModule === "供应商" ? <SupplierManagementPage /> : (
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden bg-white/10">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/18 bg-white/18 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)] backdrop-blur-3xl">
            <div className="flex items-center gap-3">
              <button className="flex size-10 items-center justify-center rounded-2xl border border-white/40 bg-white/32 text-stone-800 lg:hidden">
                <Menu className="size-4" />
              </button>
              <div>
                <div className="text-sm font-semibold text-stone-950">面料库</div>
                <div className="text-xs text-stone-700/72">档案、坯布、染整、后工艺、入库批次</div>
              </div>
            </div>
            <button
              className="flex h-10 items-center gap-2 rounded-2xl bg-stone-950/90 px-4 text-sm font-medium text-white shadow-[0_16px_36px_rgba(28,25,23,0.32)] transition hover:-translate-y-0.5 hover:bg-stone-800"
              onClick={() => setShowCreate(true)}
              type="button"
            >
              <Plus className="size-4" />
              新增面料
            </button>
          </header>

          <section className="grid shrink-0 gap-2 px-4 py-3 xl:grid-cols-4">
            <MetricCard label="面料档案" value={`${fabrics.length}`} note="当前 MVP 示例数据" icon={SwatchBook} />
            <MetricCard label="待完善" value={`${incompleteCount}`} note="轻档案需要后续补全" icon={Archive} />
            <MetricCard label="库存合计" value={totalInventory} note="kg / m 混合展示" icon={Boxes} />
            <MetricCard label="供应商" value="4" note="织厂、染厂、后工艺厂、市场档口" icon={Building2} />
          </section>

          <section className="flex min-h-0 flex-1 flex-col border-t border-white/12 bg-white/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-3xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium text-stone-700">
                  <Sparkles className="size-4 text-blue-600" />
                  Spatial Glass Fabric OS
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-normal text-stone-950">
                  从样品间开始管理每一块面料
                </h1>
              </div>

              <div className="flex flex-col gap-2 md:flex-row">
                <SearchBox value={query} onChange={setQuery} />
                <FilterSelect
                  label="类型"
                  options={["全部", "针织", "梭织"]}
                  value={typeFilter}
                  onChange={(value) => setTypeFilter(value as "全部" | FabricType)}
                />
                <FilterSelect
                  label="来源"
                  options={["全部", "自主研发", "市场采购", "客户来样", "供应商提供", "展会采集"]}
                  value={sourceFilter}
                  onChange={(value) => setSourceFilter(value as "全部" | DevelopmentSource)}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/45 pt-4">
              <div className="flex rounded-2xl border border-white/38 bg-white/30 p-1 text-sm shadow-inner shadow-white/20">
                {[
                  { id: "cards", label: "卡片视图" },
                  { id: "table", label: "专业表格" },
                  { id: "batches", label: "入库批次" },
                ].map((item) => (
                  <button
                    className={`rounded-xl px-3 py-1.5 transition ${
                      view === item.id ? "bg-white/82 text-stone-950 shadow-sm" : "text-stone-600 hover:text-stone-950"
                    }`}
                    key={item.id}
                    onClick={() => setView(item.id as ViewMode)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 text-xs text-stone-600">
                <Filter className="size-4" />
                已筛选 {filteredFabrics.length} / {fabrics.length} 款面料
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              {view === "cards" ? (
                <FabricCards fabrics={filteredFabrics} selectedCode={selected?.code} onSelect={setSelected} />
              ) : null}
              {view === "table" ? <FabricTable fabrics={filteredFabrics} onSelect={setSelected} /> : null}
              {view === "batches" ? (
                <BatchTable
                  key={filteredFabrics.map((fabric) => fabric.code).join("|")}
                  visibleCodes={filteredFabrics.map((fabric) => fabric.code)}
                />
              ) : null}
            </div>
          </section>
        </section>
        )}

        {activeModule === "面料库" ? (
          <>
            <FabricDrawer fabric={selected} onClose={() => setSelected(null)} />
            <CreateFabricDrawer open={showCreate} onClose={() => setShowCreate(false)} />
          </>
        ) : null}
      </div>
    </main>
  );
}

function MetricCard({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof SwatchBook }) {
  return (
    <div className="rounded-[18px] border border-white/24 bg-white/18 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl transition hover:bg-white/26">
      <div className="flex items-center justify-between">
        <div className="text-xs text-stone-800/72">{label}</div>
        <Icon className="size-4 text-stone-700/62" />
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-normal text-stone-950">{value}</div>
      <div className="mt-1 truncate text-xs text-stone-700/62">{note}</div>
    </div>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex h-9 min-w-72 items-center gap-2 rounded-xl border border-white/28 bg-white/22 px-3 text-sm shadow-inner shadow-white/12 backdrop-blur-2xl">
      <Search className="size-4 text-stone-500" />
      <input
        className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/70"
        onChange={(event) => onChange(event.target.value)}
        placeholder="搜索面料、编号、供应商、成分..."
        value={value}
      />
    </label>
  );
}

function FilterSelect({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        aria-expanded={open}
        className={`flex h-9 min-w-32 items-center justify-between gap-3 rounded-xl border px-3 text-sm shadow-inner shadow-white/12 backdrop-blur-2xl transition ${
          open ? "border-white/48 bg-white/34" : "border-white/28 bg-white/22 hover:bg-white/30"
        }`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="text-stone-500">{label}</span>
        <span className="flex min-w-0 items-center gap-2 font-medium text-stone-950">
          <span className="truncate">{value}</span>
          <ChevronDown className={`size-4 text-stone-700 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-2xl border border-white/38 bg-white/42 p-1.5 text-sm text-stone-900 shadow-[0_24px_70px_rgba(22,18,14,0.26),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-3xl">
          {options.map((option) => {
            const selected = option === value;

            return (
              <button
                className={`flex h-9 w-full items-center justify-between rounded-xl px-3 text-left transition ${
                  selected
                    ? "bg-white/72 text-stone-950 shadow-sm"
                    : "text-stone-700 hover:bg-white/34 hover:text-stone-950"
                }`}
                key={option}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                type="button"
              >
                <span>{option}</span>
                {selected ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function FabricCards({ fabrics, selectedCode, onSelect }: { fabrics: Fabric[]; selectedCode?: string; onSelect: (fabric: Fabric) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {fabrics.map((fabric) => (
        <button
          className={`group overflow-hidden rounded-[18px] border bg-white/18 text-left shadow-[0_18px_48px_rgba(18,16,13,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white/28 ${
            selectedCode === fabric.code ? "border-white/70 ring-1 ring-white/50" : "border-white/22"
          }`}
          key={fabric.code}
          onClick={() => onSelect(fabric)}
        >
          <div className="relative h-32" style={{ background: fabric.image }}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(255,255,255,0.5),transparent_32%)]" />
            <div className="absolute bottom-2 left-2 rounded-full border border-white/38 bg-white/36 px-2.5 py-1 text-xs font-medium text-stone-900 backdrop-blur-xl">
              {fabric.type} / {fabric.unit}
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-stone-500">{fabric.code}</div>
                <div className="mt-1 font-semibold text-stone-950">{fabric.name}</div>
              </div>
              <StatusBadge status={fabric.status} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-stone-500">
              <Field label="价格" value={fabric.price} />
              <Field label="库存" value={fabric.inventory} />
              <Field label="克重" value={fabric.weight} />
              <Field label="门幅" value={fabric.width} />
            </div>
            <ProgressBar value={fabric.completeness} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fabric.tags.map((tag) => (
                <span className="rounded-full border border-white/28 bg-white/20 px-2 py-1 text-xs text-stone-700" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function FabricTable({ fabrics, onSelect }: { fabrics: Fabric[]; onSelect: (fabric: Fabric) => void }) {
  return (
    <div className="overflow-x-auto rounded-[18px] border border-white/24 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
        <thead className="bg-white/20 text-xs text-stone-700">
          <tr>
            {["编号", "面料", "类型/单位", "成分", "价格", "库存", "来源", "完整度", "状态"].map((header) => (
              <th className="px-4 py-3 font-medium" key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/22">
          {fabrics.map((fabric) => (
            <tr className="cursor-pointer transition hover:bg-white/24" key={fabric.code} onClick={() => onSelect(fabric)}>
              <td className="px-4 py-4 font-mono text-xs text-stone-500">{fabric.code}</td>
              <td className="px-4 py-4 font-medium text-stone-950">{fabric.name}</td>
              <td className="px-4 py-4">{fabric.type} / {fabric.unit}</td>
              <td className="px-4 py-4 text-stone-600">{fabric.composition}</td>
              <td className="px-4 py-4">{fabric.price}</td>
              <td className="px-4 py-4">{fabric.inventory}</td>
              <td className="px-4 py-4">{fabric.source}</td>
              <td className="px-4 py-4">{fabric.completeness}%</td>
              <td className="px-4 py-4"><StatusBadge status={fabric.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BatchTable({ visibleCodes }: { visibleCodes: string[] }) {
  const visibleCodeSet = new Set(visibleCodes);
  const visibleBatches = batches.filter((batch) => visibleCodeSet.has(batch.code));

  return (
    <div className="overflow-x-auto rounded-[18px] border border-white/24 bg-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
      <table className="min-w-[860px] w-full border-collapse text-left text-sm">
        <thead className="bg-white/20 text-xs text-stone-700">
          <tr>
            {["批次号", "面料", "数量", "单价", "供应商", "库位", "资料状态"].map((header) => (
              <th className="px-4 py-3 font-medium" key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/22">
          {visibleBatches.map((batch) => (
            <tr className="transition hover:bg-white/24" key={batch.no}>
              <td className="px-4 py-4 font-mono text-xs text-stone-500">{batch.no}</td>
              <td className="px-4 py-4 font-medium text-stone-950">{batch.fabric}</td>
              <td className="px-4 py-4">{batch.qty}</td>
              <td className="px-4 py-4">{batch.unitPrice}</td>
              <td className="px-4 py-4">{batch.supplier}</td>
              <td className="px-4 py-4">{batch.location}</td>
              <td className="px-4 py-4">
                <span className={`rounded-full px-2 py-1 text-xs ${batch.complete ? "bg-emerald-50/80 text-emerald-800" : "bg-amber-50/80 text-amber-800"}`}>
                  {batch.complete ? "完整" : "待完善"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {visibleBatches.length === 0 ? (
        <div className="p-8 text-center text-sm text-stone-500">没有匹配的入库批次</div>
      ) : null}
    </div>
  );
}

function FabricDrawer({ fabric, onClose }: { fabric: Fabric | null; onClose: () => void }) {
  if (!fabric) {
    return null;
  }

  return (
    <aside className="fixed bottom-3 right-3 top-16 z-20 hidden w-[410px] overflow-hidden rounded-[22px] border border-white/28 bg-white/24 shadow-[0_28px_90px_rgba(18,16,13,0.26),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-3xl xl:block">
      <div className="h-36" style={{ background: fabric.image }} />
      <div className="flex items-start justify-between border-b border-white/24 p-5">
        <div>
          <div className="text-xs text-stone-500">{fabric.code}</div>
          <h2 className="mt-1 text-xl font-semibold text-stone-950">{fabric.name}</h2>
          <div className="mt-2 flex gap-2">
            <StatusBadge status={fabric.status} />
            <span className="rounded-full bg-white/44 px-2 py-1 text-xs text-stone-700">{fabric.type} / {fabric.unit}</span>
          </div>
        </div>
        <button className="rounded-xl border border-white/28 bg-white/20 p-2 transition hover:bg-white/36" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      <div className="h-[calc(100%-230px)] overflow-y-auto p-5">
        <ProgressBar value={fabric.completeness} />
        {fabric.missing.length > 0 ? (
          <div className="mt-4 rounded-3xl border border-amber-200/40 bg-amber-50/60 p-4 text-sm text-amber-900">
            缺失信息：{fabric.missing.join("、")}
          </div>
        ) : null}
        <DrawerSection title="基础档案">
          <Field label="成分" value={fabric.composition} />
          <Field label="克重" value={fabric.weight} />
          <Field label="门幅" value={fabric.width} />
          <Field label="颜色" value={fabric.color} />
          <Field label="来源" value={fabric.source} />
          <Field label="供应商" value={fabric.supplier} />
        </DrawerSection>
        <DrawerSection title="坯布信息">
          <p className="text-sm leading-6 text-stone-600">{fabric.greige}</p>
        </DrawerSection>
        <DrawerSection title="染整信息">
          <p className="text-sm leading-6 text-stone-600">{fabric.dyeing}</p>
        </DrawerSection>
        <DrawerSection title="后工艺信息">
          <p className="text-sm leading-6 text-stone-600">{fabric.postProcess}</p>
        </DrawerSection>
      </div>
    </aside>
  );
}

function DrawerSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-stone-800">{value}</div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between text-xs text-stone-500">
        <span>资料完整度</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-white/38">
        <div className="h-2 rounded-full bg-stone-950/86" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: FabricStatus }) {
  const isReady = status === "可销售";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${isReady ? "bg-emerald-50/82 text-emerald-800" : "bg-amber-50/82 text-amber-800"}`}>
      {isReady ? <CheckCircle2 className="size-3" /> : null}
      {status}
    </span>
  );
}
