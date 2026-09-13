"use client";

import {
  Archive,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Command,
  DollarSign,
  Factory,
  Filter,
  FlaskConical,
  Info,
  Layers3,
  Menu,
  NotebookTabs,
  Plus,
  Ribbon,
  Search,
  Sparkles,
  SwatchBook,
  Trees,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type ViewMode = "cards" | "table" | "batches";
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
                  item === "面料库"
                    ? "bg-white/72 text-stone-950 shadow-[0_12px_32px_rgba(255,255,255,0.18)]"
                    : "text-white/76 hover:bg-white/18 hover:text-white"
                }`}
                key={item}
              >
                {item}
                {item === "面料库" ? <ChevronRight className="size-4" /> : null}
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

        <FabricDrawer fabric={selected} onClose={() => setSelected(null)} />
        <CreateDrawer open={showCreate} onClose={() => setShowCreate(false)} />
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

function CreateDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createMode, setCreateMode] = useState<"light" | "full">("light");
  const [fabricType, setFabricType] = useState<"针织" | "梭织">("针织");
  const [greigeStatus, setGreigeStatus] = useState<"无" | "待确认" | "有">("待确认");
  const [dyeingStatus, setDyeingStatus] = useState<"无" | "待确认" | "有">("待确认");
  const [postProcessStatus, setPostProcessStatus] = useState<"无" | "待确认" | "有">("待确认");
  const [isClosing, setIsClosing] = useState(false);

  if (!open) {
    return null;
  }

  const requestClose = () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  };

  const pricingUnit = fabricType === "针织" ? "公斤" : "米";
  const fabricTypeMeta =
    fabricType === "针织"
      ? {
          categoryLabel: "针织细类",
          categoryOptions: ["汗布", "罗纹", "双面", "珠地", "网眼", "毛圈", "卫衣布", "经编"],
          structureOptions: ["单面", "双面", "罗纹", "提花", "网眼", "毛圈"],
        }
      : {
          categoryLabel: "梭织细类",
          categoryOptions: ["平纹", "斜纹", "缎纹", "牛仔", "府绸", "帆布", "提花"],
          structureOptions: ["平纹", "斜纹", "缎纹", "小提花", "大提花", "多臂"],
        };
  const completeness = createMode === "light" ? 38 : 68;
  const missingItems = [
    greigeStatus === "待确认" ? "坯布待确认" : null,
    dyeingStatus === "待确认" ? "染整待确认" : null,
    postProcessStatus === "待确认" ? "后工艺待确认" : null,
    createMode === "light" ? "质量未检测" : null,
  ].filter(Boolean);

  return (
    <div
      className={`fixed inset-0 z-50 bg-stone-950/30 backdrop-blur-md ${isClosing ? "fabric-create-backdrop-exit" : "fabric-create-backdrop-enter"}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
    >
      <aside className={`absolute inset-y-3 right-3 flex w-[calc(100%-1.5rem)] max-w-6xl flex-col overflow-hidden rounded-[22px] border border-white/34 bg-white/42 shadow-[0_36px_120px_rgba(26,22,18,0.36),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-3xl ${isClosing ? "fabric-create-drawer-exit" : "fabric-create-drawer-enter"}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/24 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-400/24 bg-blue-500/12 text-blue-700 shadow-inner shadow-white/24">
              <Plus className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-sm text-stone-500">
                <Sparkles className="size-4 text-blue-600" />
                面料档案创建
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-stone-950">新增面料</h2>
            </div>
          </div>
          <button className="rounded-xl border border-white/28 bg-white/22 p-2 transition hover:bg-white/42" onClick={requestClose} type="button">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[300px_1fr]">
          <aside className="border-b border-white/22 bg-stone-950/10 p-5 xl:border-b-0 xl:border-r">
            <div className="rounded-2xl border border-white/28 bg-white/18 p-2 shadow-inner shadow-white/12">
              <button
                className={`w-full rounded-xl px-3 py-3 text-left transition ${createMode === "light" ? "bg-white/72 shadow-sm" : "hover:bg-white/24"}`}
                onClick={() => setCreateMode("light")}
                type="button"
              >
                <div className="text-sm font-semibold text-stone-950">轻档案</div>
                <div className="mt-1 text-xs leading-5 text-stone-600">适合市场采购、客户来样、供应商推荐，先保存后补全。</div>
              </button>
              <button
                className={`mt-1 w-full rounded-xl px-3 py-3 text-left transition ${createMode === "full" ? "bg-white/72 shadow-sm" : "hover:bg-white/24"}`}
                onClick={() => setCreateMode("full")}
                type="button"
              >
                <div className="text-sm font-semibold text-stone-950">完整档案</div>
                <div className="mt-1 text-xs leading-5 text-stone-600">适合自主研发或资料完整的面料，直接录入工艺链。</div>
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-stone-950">资料完整度预览</span>
                <span className="text-stone-600">{completeness}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/38">
                <div className="h-2 rounded-full bg-stone-950/86 transition-all" style={{ width: `${completeness}%` }} />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {missingItems.map((item) => (
                  <span className="rounded-full border border-amber-200/50 bg-amber-50/62 px-2 py-1 text-xs text-amber-900" key={item}>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 text-xs leading-5 text-stone-600 shadow-inner shadow-white/12">
              <div className="font-medium text-stone-950">当前规则</div>
              <p className="mt-2">针织默认按公斤计价，梭织默认按米计价。坯布、染整、后工艺可以先标记为待确认。</p>
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto p-5">
            <section className="rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <PanelTitle icon={Info} title="基础信息" description="最少填写名称、类型、来源和后工艺状态即可保存静态草稿。" tone="blue" />
                <SegmentedControl
                  options={["针织", "梭织"]}
                  value={fabricType}
                  onChange={(value) => setFabricType(value as "针织" | "梭织")}
                />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <FormField label="面料英文名称" placeholder="如 Cotton Spandex Jersey" />
                <FormField label="面料名称" required placeholder="如 精梳棉氨纶汗布" />
                <FabricCodeField />
                <ReadonlyField label="计价单位" value={pricingUnit} />
                <GlassSelect label="开发来源" required options={["自主研发", "市场采购", "客户来样", "供应商提供", "展会采集"]} defaultValue={createMode === "light" ? "市场采购" : "自主研发"} />
                <GlassSelect label="面料状态" options={["待完善", "可销售", "停用", "淘汰"]} defaultValue={createMode === "light" ? "待完善" : "可销售"} />
                <FormField label="成分" required placeholder="如 95%棉 5%氨纶" />
                <FormField label="克重" required placeholder="如 180g" />
                <FormField label="门幅" required placeholder="如 165cm" />
                <FormField label="纱支" placeholder={fabricType === "针织" ? "如 32S" : "如 40S x 40S"} />
                {fabricType === "梭织" ? <FormField label="经纬密" placeholder="如 133x72" /> : null}
              </div>
            </section>

            <FormPanel icon={Layers3} tone="indigo" title="分类结构" description="用结构和参数描述面料，而不是只靠名称。">
              <GlassSelect key={`${fabricType}-category`} label={fabricTypeMeta.categoryLabel} options={fabricTypeMeta.categoryOptions} defaultValue={fabricTypeMeta.categoryOptions[0]} />
              <GlassSelect key={`${fabricType}-structure`} label="组织结构" options={fabricTypeMeta.structureOptions} defaultValue={fabricTypeMeta.structureOptions[0]} />
              {fabricType === "针织" ? (
                <>
                  <GlassSelect label="弹力等级" options={["未知", "无弹", "微弹", "中弹", "高弹"]} defaultValue="微弹" />
                </>
              ) : (
                <>
                  <GlassSelect label="是否弹力" options={["未知", "是", "否"]} defaultValue="未知" />
                </>
              )}
            </FormPanel>

            <FormPanel icon={DollarSign} tone="emerald" title="来源与价格" description="供应商和价格可以先粗略填写，后续业务模块再精细化。">
              <FormField label="供应商" placeholder="供应商或市场档口" />
              <FormField label="来源联系人" placeholder="联系人 / 业务员" />
              <FormField label="来源日期" placeholder="2026-09-12" />
              <FormField label="成品参考价" placeholder={`¥ / ${pricingUnit}`} />
              <FormField label="供应商报价" placeholder={`¥ / ${pricingUnit}`} />
              <FormField label="最小起订量" placeholder={`如 300${pricingUnit}`} />
              <GlassSelect label="是否可复购" options={["未知", "是", "否"]} defaultValue="未知" />
              {fabricType === "针织" ? <FormField label="纸管重量" placeholder="如 1.2kg/卷" /> : null}
              <FormField label="空差" placeholder={fabricType === "针织" ? "如 +/- 0.3kg" : "如 +/- 2m"} />
            </FormPanel>

            <ProcessPanel icon={Trees} tone="lime" title="坯布信息" status={greigeStatus} onStatusChange={setGreigeStatus}>
              <FormField label="坯布名称" placeholder="坯布名称" />
              <SearchableSupplierSelect label="胚布供应商" placeholder="搜索织厂 / 胚布供应商" />
              <FormField label="坯布成分" placeholder="可与成品不同" />
              <FormField label="坯布单价" placeholder={`¥ / ${pricingUnit}`} />
              <FormField label="坯布损耗率" placeholder="如 3%" />
              <FormField label="坯布备注" placeholder="坯布备注" />
            </ProcessPanel>

            <ProcessPanel icon={FlaskConical} tone="cyan" title="染整信息" status={dyeingStatus} onStatusChange={setDyeingStatus}>
              <GlassSelect label="染整类型" options={["染色", "印花", "定型", "柔软", "磨毛", "洗水"]} defaultValue="染色" />
              <SearchableSupplierSelect label="染整厂" placeholder="搜索染厂 / 印花厂" />
              <FormField label="色牢度" placeholder="如 3-4 级" />
              <FormField label="染整单价" placeholder={`¥ / ${pricingUnit}`} />
              <FormField label="注意事项" placeholder="色差、手感、交期等" />
            </ProcessPanel>

            <ProcessPanel icon={Factory} tone="violet" title="后工艺信息" status={postProcessStatus} onStatusChange={setPostProcessStatus}>
              <GlassSelect label="后工艺类型" options={["烫金", "植绒", "压皱", "压花", "复合", "涂层", "绣花"]} defaultValue="烫金" />
              <SearchableSupplierSelect label="后工艺厂" placeholder="搜索后工艺加工厂" />
              <FormField label="效果描述" placeholder="位置、效果、手感" />
              <FormField label="后工艺单价" placeholder={`¥ / ${pricingUnit}`} />
              <FormField label="损耗率" placeholder="如 5%" />
              <FormField label="风险说明" placeholder="牢度、色差、批次稳定性等" />
            </ProcessPanel>

            <FormPanel icon={NotebookTabs} tone="amber" title="质量与备注" description="第一版只保留轻量检测字段，后续可扩展检测报告。">
              <FormField label="色牢度" placeholder="如 3-4 级" />
              <FormField label="起毛起球" placeholder="等级或备注" />
              <GlassSelect label="检测结论" options={["未检测", "通过", "不通过", "待复检"]} defaultValue="未检测" />
              <FormField label="手感评价" placeholder="软、挺、糯、滑等" />
              <FormField label="备注" placeholder="其他业务说明" />
            </FormPanel>

            <UsageSeasonCertificationPanel />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-white/24 bg-white/22 px-6 py-4 backdrop-blur-2xl">
          <div className="text-sm text-stone-600">
            静态原型：用于确认页面布局和交互效果，暂不保存到后端。
          </div>
          <div className="flex gap-2">
            <button className="h-10 rounded-2xl border border-white/28 bg-white/24 px-4 text-sm text-stone-700 transition hover:bg-white/38" onClick={requestClose} type="button">
              取消
            </button>
            <button className="h-10 rounded-2xl bg-stone-950 px-5 text-sm font-medium text-white shadow-lg" onClick={requestClose} type="button">
              保存静态草稿
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

type PanelTone = "blue" | "indigo" | "emerald" | "lime" | "cyan" | "violet" | "amber" | "rose";

const panelToneClasses: Record<PanelTone, string> = {
  blue: "border-blue-300/36 bg-blue-500/12 text-blue-700",
  indigo: "border-indigo-300/36 bg-indigo-500/12 text-indigo-700",
  emerald: "border-emerald-300/36 bg-emerald-500/12 text-emerald-700",
  lime: "border-lime-300/38 bg-lime-500/14 text-lime-800",
  cyan: "border-cyan-300/36 bg-cyan-500/12 text-cyan-700",
  violet: "border-violet-300/36 bg-violet-500/12 text-violet-700",
  amber: "border-amber-300/42 bg-amber-400/16 text-amber-800",
  rose: "border-rose-300/36 bg-rose-500/12 text-rose-700",
};

function PanelTitle({ icon: Icon, title, description, tone = "blue" }: { icon: LucideIcon; title: string; description: string; tone?: PanelTone }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`flex size-9 shrink-0 items-center justify-center rounded-2xl border shadow-inner shadow-white/20 ${panelToneClasses[tone]}`}>
        <Icon className="size-4" />
      </div>
      <div>
        <h3 className="font-semibold text-stone-950">{title}</h3>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>
    </div>
  );
}

function FormPanel({ icon, tone, title, description, children }: { icon: LucideIcon; tone: PanelTone; title: string; description: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <PanelTitle icon={icon} tone={tone} title={title} description={description} />
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

function ProcessPanel({
  icon,
  tone,
  title,
  status,
  onStatusChange,
  children,
}: {
  icon: LucideIcon;
  tone: PanelTone;
  title: string;
  status: "无" | "待确认" | "有";
  onStatusChange: (status: "无" | "待确认" | "有") => void;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <PanelTitle icon={icon} tone={tone} title={title} description="选择“有”后展开详细字段；“无”不计入缺失，“待确认”会进入待补清单。" />
        <SegmentedControl options={["无", "待确认", "有"]} value={status} onChange={(value) => onStatusChange(value as "无" | "待确认" | "有")} />
      </div>
      {status === "有" ? <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div> : null}
      {status !== "有" ? (
        <div className="mt-4 rounded-2xl border border-white/24 bg-white/16 p-4 text-sm text-stone-600">
          当前状态：{status}。这里先保留轻档案，不要求填写详细工艺字段。
        </div>
      ) : null}
    </section>
  );
}

const usageOptions = [
  "T恤",
  "内衣",
  "家居服",
  "运动服",
  "鞋材",
  "箱包",
  "领口",
  "袖口",
  "下摆",
  "工装",
  "裤装",
  "外套",
  "衬衫",
  "校服",
  "制服",
  "户外服",
  "冲锋衣",
  "裙装",
  "里布",
  "睡衣",
  "毯子",
  "帽子",
  "装饰布",
  "牛仔裤",
  "童装",
];

const seasonOptions = ["春夏", "秋冬"];
const certificationOptions = ["OEKO-TEX", "GOTS", "BLUESIGN"];

function UsageSeasonCertificationPanel() {
  return (
    <section className="mt-4 rounded-2xl border border-white/28 bg-white/18 p-4 shadow-inner shadow-white/12">
      <div className="flex items-start gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-2xl border shadow-inner shadow-white/20 ${panelToneClasses.rose}`}>
          <Ribbon className="size-4" />
        </div>
        <div>
          <h3 className="font-semibold text-stone-950">用途 / 季节 / 认证</h3>
          <p className="mt-1 text-sm text-stone-600">辅助检索，可后续补全</p>
        </div>
      </div>
      <div className="mt-4 space-y-4">
        <ChipGroup label="用途（多选）" options={usageOptions} defaultSelected={["T恤", "内衣"]} />
        <ChipGroup label="适用季节（多选）" options={seasonOptions} defaultSelected={["春夏"]} />
        <ChipGroup label="认证标准（多选）" options={certificationOptions} defaultSelected={["OEKO-TEX"]} />
      </div>
    </section>
  );
}

function ChipGroup({ label, options, defaultSelected = [] }: { label: string; options: string[]; defaultSelected?: string[] }) {
  const [selected, setSelected] = useState(defaultSelected);

  return (
    <div>
      <div className="text-sm text-stone-700">{label}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);

          return (
            <button
              className={`h-8 rounded-xl border px-3 text-sm transition ${
                active
                  ? "border-blue-400/50 bg-blue-500/14 text-blue-800 shadow-inner shadow-white/20"
                  : "border-white/30 bg-white/24 text-stone-700 hover:border-white/48 hover:bg-white/38 hover:text-stone-950"
              }`}
              key={option}
              onClick={() =>
                setSelected((current) =>
                  current.includes(option) ? current.filter((item) => item !== option) : [...current, option],
                )
              }
              type="button"
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormField({ label, placeholder, required = false }: { label: string; placeholder: string; required?: boolean }) {
  return (
    <label className="text-sm">
      <span className="text-stone-500">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <input
        className="mt-1 h-10 w-full rounded-xl border border-white/28 bg-white/24 px-3 text-stone-950 outline-none transition placeholder:text-stone-500/62 focus:border-blue-400/70 focus:bg-white/34"
        placeholder={placeholder}
      />
    </label>
  );
}

function FabricCodeField() {
  return (
    <label className="text-sm">
      <span className="text-stone-500">
        面料编号
        <span className="ml-1 text-red-600">*</span>
      </span>
      <div className="mt-1 flex h-10 overflow-hidden rounded-xl border border-white/28 bg-white/24 text-stone-950 transition focus-within:border-blue-400/70 focus-within:bg-white/34">
        <span className="flex items-center border-r border-white/28 bg-stone-950/8 px-3 font-mono text-sm font-semibold text-stone-700">
          SDD-
        </span>
        <input className="min-w-0 flex-1 bg-transparent px-3 font-mono outline-none placeholder:text-stone-500/62" maxLength={60} placeholder="手动填写，整码最长 64 字符" />
      </div>
      <div className="mt-1 text-xs text-stone-500">校验规则：全表唯一，固定前缀不可修改。</div>
    </label>
  );
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-stone-500">{label}</span>
      <div className="mt-1 flex h-10 items-center rounded-xl border border-white/24 bg-stone-950/8 px-3 font-medium text-stone-950">
        {value}
      </div>
    </div>
  );
}

function GlassSelect({ label, options, defaultValue, required = false }: { label: string; options: string[]; defaultValue: string; required?: boolean }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative text-sm"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <span className="text-stone-500">
        {label}
        {required ? <span className="ml-1 text-red-600">*</span> : null}
      </span>
      <button
        aria-expanded={open}
        className={`mt-1 flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 text-left transition ${
          open ? "border-white/48 bg-white/36" : "border-white/28 bg-white/24 hover:bg-white/32"
        }`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="truncate font-medium text-stone-950">{value}</span>
        <span className="flex items-center gap-1">
          <span className="rounded-lg bg-white/28 px-1.5 py-0.5 text-[11px] text-stone-500">可配置</span>
          <ChevronDown className={`size-4 text-stone-600 transition ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 top-[66px] z-40 max-h-64 overflow-auto rounded-2xl border border-white/38 bg-white/56 p-1.5 text-stone-900 shadow-[0_24px_70px_rgba(22,18,14,0.24),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-3xl">
          {options.map((option) => (
            <button
              className={`flex h-9 w-full items-center justify-between rounded-xl px-3 text-left transition ${
                option === value ? "bg-white/76 text-stone-950 shadow-sm" : "text-stone-700 hover:bg-white/36 hover:text-stone-950"
              }`}
              key={option}
              onClick={() => {
                setValue(option);
                setOpen(false);
              }}
              type="button"
            >
              <span>{option}</span>
              {option === value ? <CheckCircle2 className="size-3.5 text-emerald-700" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SearchableSupplierSelect({ label, placeholder }: { label: string; placeholder: string }) {
  const suppliers = ["绍兴柯桥纺纱厂", "广州中大市场 A12 档", "东莞印花工艺厂", "泉州涤纶纺织有限公司", "海宁经编科技", "盛泽染整厂", "佛山后整理工艺厂"];
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const filteredSuppliers = suppliers.filter((supplier) => supplier.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      className="relative text-sm"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <span className="text-stone-500">{label}</span>
      <div className="mt-1 flex h-10 items-center gap-2 rounded-xl border border-white/28 bg-white/24 px-3 transition focus-within:border-blue-400/70 focus-within:bg-white/34">
        <Search className="size-4 text-stone-500" />
        <input
          className="min-w-0 flex-1 bg-transparent text-stone-950 outline-none placeholder:text-stone-500/62"
          onChange={(event) => {
            setQuery(event.target.value);
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          value={value || query}
        />
      </div>
      {open ? (
        <div className="absolute left-0 right-0 top-[66px] z-40 max-h-56 overflow-auto rounded-2xl border border-white/38 bg-white/56 p-1.5 text-stone-900 shadow-[0_24px_70px_rgba(22,18,14,0.24),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-3xl">
          {(filteredSuppliers.length > 0 ? filteredSuppliers : ["无匹配供应商"]).map((supplier) => (
            <button
              className="flex h-9 w-full items-center rounded-xl px-3 text-left text-stone-700 transition hover:bg-white/36 hover:text-stone-950"
              disabled={supplier === "无匹配供应商"}
              key={supplier}
              onClick={() => {
                setValue(supplier);
                setQuery(supplier);
                setOpen(false);
              }}
              type="button"
            >
              {supplier}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SegmentedControl({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex rounded-2xl border border-white/28 bg-white/18 p-1 text-sm shadow-inner shadow-white/12">
      {options.map((option) => (
        <button
          className={`rounded-xl px-3 py-1.5 transition ${value === option ? "bg-white/72 text-stone-950 shadow-sm" : "text-stone-600 hover:bg-white/24 hover:text-stone-950"}`}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
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
